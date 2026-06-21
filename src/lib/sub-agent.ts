import openai, { MODEL } from './openai';

interface MessageSummary {
  patientSymptom: string;
  suggestedDepartment: string;
  conversationKey: string;
}

const POLICY_NOTE = `你是 dental-agent 产品内的口腔健康导诊与预约助手，不是医生。
只允许做症状归类、科室建议、紧急风险识别、预约信息收集，以及基于系统返回数据的医院展示。
禁止诊断疾病、开药、推荐剂量、提供治疗方案、编造医院/医生/价格/时间、诱导忽视急诊、索取无关隐私。`;

const SUMMARIZE_PROMPT = `${POLICY_NOTE}

任务：把对话压缩成简短、可供后续导诊使用的 JSON 摘要，只保留事实，不要新增推断。

输出格式：
{
  "patientSymptom": "用户当前主要症状或诉求",
  "suggestedDepartment": "系统已讨论出的科室或待定",
  "conversationKey": "影响后续处理的关键意图或限制"
}

要求：
- patientSymptom 只写用户自己描述过的症状/诉求，不要医学扩写
- suggestedDepartment 只能写已出现过的科室或“待定”
- conversationKey 只写预约、急诊、拒绝预约、非口腔问题等关键约束
- 不要加入诊断、治疗、药物、医院推荐之外的新内容
- 只输出 JSON`;

// 子代理：消息摘要
export async function summarizeConversation(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<MessageSummary | null> {
  try {
    if (messages.length < 3) return null;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SUMMARIZE_PROMPT },
        {
          role: 'user',
          content: `请分析以下对话:\n${messages.map((m) => `${m.role}: ${m.content}`).join('\n')}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    const rawContent = completion.choices[0]?.message?.content || '';
    const firstBrace = rawContent.indexOf('{');
    const lastBrace = rawContent.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const jsonStr = rawContent.slice(firstBrace, lastBrace + 1);
      const summary = JSON.parse(jsonStr) as MessageSummary;
      return summary;
    }
    return null;
  } catch (error) {
    console.error('[SUB-AGENT] Summarize failed:', error);
    return null;
  }
}

// 子代理：检测用户意图
export async function detectUserIntent(
  message: string,
  context: string = ''
): Promise<{ intent: string; confidence: number; action: string }> {
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `${POLICY_NOTE}

分析用户当前消息，返回 JSON 形式的意图识别结果。
只做流程分流，不要做医学判断。

意图类型只能是：
- symptom_report：用户在描述口腔症状或不适
- booking_intent：用户明确想预约、挂号、找医院
- hospital_select：用户在选择医院或确认医院
- info_query：用户在咨询流程、时间、资料、费用之外的普通问题
- other：其他情况

动作类型只能是：
- show_hospitals
- ask_more_info
- urgent_referral
- default

如果出现紧急症状，要优先标记为 urgent_referral。
如果用户描述的是非口腔问题，不要推进牙科预约，只做科室方向判断。`,
        },
        {
          role: 'user',
          content: `用户消息: "${message}"\n背景: ${context || '无'}`,
        },
      ],
      max_tokens: 150,
      temperature: 0.2,
    });

    const rawContent = completion.choices[0]?.message?.content || '';
    const firstBrace = rawContent.indexOf('{');
    const lastBrace = rawContent.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const result = JSON.parse(rawContent.slice(firstBrace, lastBrace + 1));
      return result;
    }
    return {
      intent: 'other',
      confidence: 0.5,
      action: 'default',
    };
  } catch (error) {
    console.error('[SUB-AGENT] Intent detection failed:', error);
    return {
      intent: 'other',
      confidence: 0.5,
      action: 'default',
    };
  }
}

// 子代理：补充用户信息不足的问题
export async function generateClarifyingQuestion(
  incompleteInfo: {
    name?: boolean;
    phone?: boolean;
    time?: boolean;
    symptom?: boolean;
  }
): Promise<string> {
  try {
    let missing = '';
    if (incompleteInfo.symptom) missing += '症状描述不清';
    if (incompleteInfo.name) missing += (missing ? '、' : '') + '患者姓名';
    if (incompleteInfo.phone) missing += (missing ? '、' : '') + '手机号';
    if (incompleteInfo.time) missing += (missing ? '、' : '') + '就诊时间';

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `${POLICY_NOTE}

你负责生成一句简短、自然的追问，只用于补齐预约必要信息。
只能询问姓名、手机号、城市、医院、就诊时间、症状/项目。
不要索取身份证、银行卡、详细住址、无关隐私，也不要制造焦虑。`,
        },
        {
          role: 'user',
          content: `缺失信息: ${missing}。请生成一句自然的追问，优先问最少必要信息。`,
        },
      ],
      max_tokens: 100,
      temperature: 0.5,
    });

    return completion.choices[0]?.message?.content || `请补充${missing}信息。`;
  } catch (error) {
    console.error('[SUB-AGENT] Clarify question failed:', error);
    return '请提供更多信息。';
  }
}

// 主要接口：当消息过多时，压缩上下文
export async function compressContext(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  threshold: number = 8
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  if (messages.length <= threshold) {
    return messages;
  }

  const summary = await summarizeConversation(messages);
  if (!summary) {
    return messages.slice(-threshold);
  }

  const compressedContext = {
    role: 'assistant' as const,
    content: `[对话摘要] 症状: ${summary.patientSymptom} | 科室: ${summary.suggestedDepartment} | 关键意图: ${summary.conversationKey}`,
  };

  return [compressedContext, ...messages.slice(-(threshold - 1))];
}
