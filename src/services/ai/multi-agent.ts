import openai, { MODEL } from '@/lib/openai';
import { query } from '@/lib/db';
import {
  parseToolCalls,
  stripToolCalls,
  executeToolCall,
  ToolCall,
  AgentStep,
} from './agent-tools';

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AgentResult {
  agent: string;
  reply: string;
  steps: AgentStep[];
  data?: any;
}

export interface RouterResult {
  agent: string;
  confidence: number;
  reason: string;
}

const AGENTS = {
  triage: {
    name: 'TriageAgent',
    description: '症状分析和分诊',
    systemPrompt: `你是"智齿管家"的**症状分析专家** (TriageAgent)。

## 核心职责
分析用户口腔症状，给出具体分析和建议，推荐就诊科室。

## 症状分析要求
- 用户描述症状后，必须具体分析其描述的（部位、时间、诱因、性质），给出针对性的建议
- 示例：用户说"牙痛三天，左边后面大牙，吃东西疼" → 分析可能的牙髓炎/深龋，建议口腔内科，给出临时缓解建议
- 不要给出泛泛回复"根据您的描述，您可能正在经历一些口腔问题"——必须具体

## 紧急情况处理
- 如果用户描述急症（大出血、呼吸困难、持续剧烈疼痛、昏迷等），立即建议去急诊科
- 非口腔问题（如心慌、腹痛等），建议去综合医院相关科室

## 输出格式
1. 症状分析（具体描述可能的原因）
2. 建议就诊科室
3. 临时缓解建议（如有）
4. 是否需要进一步检查或预约

## 行为守则
- 禁止诊断疾病、开药、推荐剂量、提供治疗方案
- 如果需要查询医院，告诉用户可以使用医院推荐功能`,
  },

  hospital: {
    name: 'HospitalAgent',
    description: '医院查询和推荐',
    systemPrompt: `你是"智齿管家"的**医院推荐专家** (HospitalAgent)。

## 核心职责
根据用户需求查询和推荐合适的口腔医院。

## 工具使用
- 使用 query_hospitals 工具查询医院
- 参数：city（城市）, specialty（科室/症状关键词）
- 如果不知道用户城市，先询问

## 推荐原则
- 只推荐工具返回的结果，不编造医院信息
- 根据评分、距离、专长等因素给出推荐理由
- 提供医院的地址、电话、营业时间等关键信息

## 输出格式
1. 推荐医院列表（最多3-5家）
2. 每家医院的关键信息（评分、地址、电话、特色）
3. 推荐理由
4. 是否需要预约

## 行为守则
- 禁止编造医院、医生、评分、地址、电话、营业时间
- 医院推荐只能来自 query_hospitals 工具的返回结果`,
  },

  booking: {
    name: 'BookingAgent',
    description: '预约流程管理',
    systemPrompt: `你是"智齿管家"的**预约管理专家** (BookingAgent)。

## 核心职责
收集预约信息，创建预约记录。

## 预约信息收集顺序（重要）
当用户想要预约时，按以下顺序收集信息，每一步只问1-2个问题：
1. 如果不知道用户所在城市 → 先问城市
2. 用户选择医院后 → 询问姓名和手机号（分步问，先问姓名）
3. 获取姓名后 → 询问手机号
4. 获取手机号后 → 询问希望的就诊时间
5. 所有信息收集齐全后 → 调用 create_appointment 工具

## 工具使用
- 使用 create_appointment 工具创建预约
- 参数：name, phone, service_type, appointment_time, hospital_name
- 必须确认已获得姓名、手机号、就诊时间、医院后才能调用

## 输出格式
1. 确认收集到的信息
2. 创建预约结果
3. 后续注意事项

## 行为守则
- 在未获得完整信息之前，永远不要调用 create_appointment
- 手机号必须是11位数字，以1开头
- 就诊项目从用户描述的症状推断`,
  },

  followup: {
    name: 'FollowUpAgent',
    description: '跟进和提醒管理',
    systemPrompt: `你是"智齿管家"的**跟进提醒专家** (FollowUpAgent)。

## 核心职责
管理用户预约后的跟进和提醒。

## 功能
1. 预约提醒：就诊前1天/2小时提醒
2. 复查提醒：根据服务类型定期提醒
3. 放弃预约跟进：未完成预约流程的用户跟进

## 输出格式
1. 提醒内容
2. 建议的后续行动
3. 联系方式（如需要）

## 行为守则
- 保持友好和专业
- 不要过于频繁地打扰用户
- 尊重用户的选择`,
  },
};

const ROUTER_SYSTEM_PROMPT = `你是"智齿管家"的路由系统。分析用户消息，决定应该由哪个专业代理处理。

## 代理类型
- triage: 症状分析和分诊（用户描述症状、不适、疼痛）
- hospital: 医院查询和推荐（用户想找医院、查医院、比较医院）
- booking: 预约流程（用户想预约、挂号、取消预约、修改预约）
- followup: 跟进提醒（用户询问预约状态、提醒、复查）

## 路由规则
1. 如果用户在描述症状 → triage
2. 如果用户想找医院/查医院 → hospital
3. 如果用户想预约/挂号 → booking
4. 如果用户在选择医院 → hospital
5. 如果用户询问预约状态/提醒 → followup
6. 如果用户在咨询口腔健康知识 → triage
7. 如果用户描述急症 → triage（紧急）
8. 如果是新对话的第一条消息且意图不明确 → triage（先了解情况）

## 输出格式
{"agent":"代理名称","confidence":0-1,"reason":"原因"}

只输出JSON，不要输出其他内容。`;

export async function routeMessage(
  message: string,
  conversationHistory: AgentMessage[]
): Promise<RouterResult> {
  try {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('预约') || lowerMsg.includes('挂号') || lowerMsg.includes('取消预约') || lowerMsg.includes('修改预约')) {
      return { agent: 'booking', confidence: 0.9, reason: '用户提到预约相关关键词' };
    }
    
    if (lowerMsg.includes('医院') || lowerMsg.includes('诊所') || lowerMsg.includes('推荐医院') || lowerMsg.includes('哪家好')) {
      return { agent: 'hospital', confidence: 0.9, reason: '用户提到医院相关关键词' };
    }
    
    if (lowerMsg.includes('提醒') || lowerMsg.includes('跟进') || lowerMsg.includes('复查') || lowerMsg.includes('预约状态')) {
      return { agent: 'followup', confidence: 0.9, reason: '用户提到跟进提醒相关关键词' };
    }
    
    if (lowerMsg.includes('痛') || lowerMsg.includes('疼') || lowerMsg.includes('出血') || lowerMsg.includes('肿') || lowerMsg.includes('松动') || lowerMsg.includes('敏感')) {
      return { agent: 'triage', confidence: 0.9, reason: '用户描述症状' };
    }

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: ROUTER_SYSTEM_PROMPT },
        ...conversationHistory.slice(-5),
        { role: 'user', content: message },
      ],
      max_tokens: 100,
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content || '';
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const result = JSON.parse(raw.slice(firstBrace, lastBrace + 1));
      return {
        agent: result.agent || 'triage',
        confidence: result.confidence || 0.7,
        reason: result.reason || 'LLM路由分析',
      };
    }

    return { agent: 'triage', confidence: 0.5, reason: '默认路由到症状分析' };
  } catch (error) {
    console.error('[ROUTER] Error:', error);
    return { agent: 'triage', confidence: 0.5, reason: '路由错误，默认症状分析' };
  }
}

export async function executeAgent(
  agentType: string,
  message: string,
  conversationHistory: AgentMessage[],
  userId?: number
): Promise<AgentResult> {
  const agent = AGENTS[agentType as keyof typeof AGENTS];
  if (!agent) {
    return {
      agent: 'unknown',
      reply: `未知的代理类型: ${agentType}`,
      steps: [],
    };
  }

  const steps: AgentStep[] = [];
  let finalReply = '';
  let lastToolNames: string[] = [];

  for (let round = 0; round < 3; round++) {
    const messages: AgentMessage[] = [
      { role: 'system', content: agent.systemPrompt },
      ...conversationHistory.slice(-10),
      { role: 'user', content: message },
    ];

    let llmReply = '';
    let nativeToolCalls: any[] = [];

    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages,
        max_tokens: 600,
        temperature: 0.3,
      });

      const messageObj = completion.choices[0]?.message;
      llmReply = messageObj?.content || '';
      nativeToolCalls = (messageObj as any)?.tool_calls || [];
    } catch (apiError: unknown) {
      const errMsg = apiError instanceof Error ? apiError.message : String(apiError);
      console.error(`[${agent.name}] LLM call failed:`, errMsg);
      finalReply = '系统暂时无法处理，请稍后再试。';
      break;
    }

    let toolCalls: ToolCall[] = [];
    if (nativeToolCalls.length > 0) {
      for (const tc of nativeToolCalls) {
        if (tc.type === 'function' && tc.function?.name) {
          try {
            const args = JSON.parse(tc.function.arguments);
            toolCalls.push({ name: tc.function.name, args });
          } catch {
          }
        }
      }
    } else {
      toolCalls = parseToolCalls(llmReply);
    }

    if (toolCalls.length === 0) {
      finalReply = llmReply || '请稍等，正在为您处理...';
      break;
    }

    const cleanText = nativeToolCalls.length > 0 ? llmReply : stripToolCalls(llmReply);
    if (cleanText) {
      conversationHistory.push({ role: 'assistant', content: cleanText });
    }

    const currentToolNames = toolCalls.map(tc => tc.name);
    if (lastToolNames.length > 0 && currentToolNames.length === lastToolNames.length &&
        currentToolNames.every((name, i) => name === lastToolNames[i])) {
      finalReply = cleanText || '已为您处理，请问还有其他需要帮助的吗？';
      break;
    }
    lastToolNames = currentToolNames;

    for (const tc of toolCalls) {
      const startTime = Date.now();
      const result = await executeToolCall(tc, userId);
      const duration = Date.now() - startTime;

      steps.push({
        tool: tc.name,
        input: tc.args,
        result_summary: result.summary,
        duration_ms: duration,
      });

      conversationHistory.push({
        role: 'user',
        content: `[工具结果: ${tc.name}]\n${result.rawContent}`,
      });
    }
  }

  if (!finalReply) {
    const toolSummary = steps.map(s => s.result_summary).join('；');
    finalReply = toolSummary
      ? `${toolSummary}。请问您还有其他需要吗？`
      : '已为您处理，请问还有其他需要帮助的吗？';
  }

  return {
    agent: agent.name,
    reply: finalReply,
    steps,
  };
}

export async function orchestrate(
  message: string,
  conversationHistory: AgentMessage[],
  userId?: number
): Promise<AgentResult> {
  console.log('[ORCHESTRATOR] Routing message:', message.substring(0, 50));

  const route = await routeMessage(message, conversationHistory);
  console.log('[ORCHESTRATOR] Routed to:', route.agent, 'confidence:', route.confidence, 'reason:', route.reason);

  const result = await executeAgent(route.agent, message, [...conversationHistory], userId);
  
  result.data = {
    ...result.data,
    routing: {
      agent: route.agent,
      confidence: route.confidence,
      reason: route.reason,
    },
  };

  return result;
}

export function getAgentInfo(agentType: string) {
  return AGENTS[agentType as keyof typeof AGENTS] || null;
}

export function getAllAgents() {
  return Object.entries(AGENTS).map(([key, value]) => ({
    id: key,
    name: value.name,
    description: value.description,
  }));
}
