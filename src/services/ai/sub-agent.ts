import openai, { MODEL } from '@/lib/openai';
import { query } from '@/lib/db';

interface MessageSummary {
  patientSymptom: string;
  suggestedDepartment: string;
  conversationKey: string;
}

interface UserMemory {
  id: number;
  user_id: number;
  memory_type: string;
  content: string;
  metadata: any;
  created_at: Date;
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
- suggestedDepartment 只能写已出现过的科室或"待定"
- conversationKey 只写预约、急诊、拒绝预约、非口腔问题等关键约束
- 不要加入诊断、治疗、药物、医院推荐之外的新内容
- 只输出 JSON`;

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

const MEMORY_PROMPT = `你是用户记忆提取器。从对话中提取关键信息，用于后续对话参考。

输出格式（JSON）：
{
  "symptoms": ["用户描述的症状列表"],
  "appointments": ["已创建的预约信息"],
  "preferences": ["用户偏好（如城市、医院类型等）"],
  "medical_history": ["对话中提到的病史/过敏史"]
}

要求：
- 只提取用户明确提到的信息，不要推断
- 症状用原文描述，不要医学术语改写
- 预约信息包括医院名、时间、服务类型
- 简洁明了，每个类别最多5条
- 只输出 JSON`;

export async function generateUserMemory(
  userId: number,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<void> {
  try {
    if (messages.length < 3) return;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: MEMORY_PROMPT },
        {
          role: 'user',
          content: `请从以下对话中提取用户关键信息:\n${messages.map((m) => `${m.role}: ${m.content}`).join('\n')}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const rawContent = completion.choices[0]?.message?.content || '';
    const firstBrace = rawContent.indexOf('{');
    const lastBrace = rawContent.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const jsonStr = rawContent.slice(firstBrace, lastBrace + 1);
      const memory = JSON.parse(jsonStr);

      await query(
        `INSERT INTO user_memory (user_id, memory_type, content, metadata) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, memory_type) 
         DO UPDATE SET content = $3, metadata = $4, updated_at = NOW()`,
        [userId, 'session_summary', JSON.stringify(memory), JSON.stringify({ generated_at: new Date().toISOString() })]
      );

      console.log(`[MEMORY] Generated memory for user ${userId}`);
    }
  } catch (error) {
    console.error('[MEMORY] Generation failed:', error);
  }
}

export async function getUserMemory(userId: number): Promise<string | null> {
  try {
    const result = await query(
      'SELECT content FROM user_memory WHERE user_id = $1 AND memory_type = $2 ORDER BY updated_at DESC LIMIT 1',
      [userId, 'session_summary']
    );

    if (result.rows.length > 0) {
      const memory = JSON.parse(result.rows[0].content);
      return formatMemoryForPrompt(memory);
    }
    return null;
  } catch (error) {
    console.error('[MEMORY] Get failed:', error);
    return null;
  }
}

function formatMemoryForPrompt(memory: any): string | null {
  const parts: string[] = [];

  if (memory.symptoms?.length > 0) {
    parts.push(`历史症状: ${memory.symptoms.join(', ')}`);
  }
  if (memory.appointments?.length > 0) {
    parts.push(`预约记录: ${memory.appointments.join(', ')}`);
  }
  if (memory.preferences?.length > 0) {
    parts.push(`用户偏好: ${memory.preferences.join(', ')}`);
  }
  if (memory.medical_history?.length > 0) {
    parts.push(`病史: ${memory.medical_history.join(', ')}`);
  }

  return parts.length > 0 ? parts.join('\n') : null;
}
