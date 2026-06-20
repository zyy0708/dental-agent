import openai, { MODEL } from './openai';

interface MessageSummary {
  patientSymptom: string;
  suggestedDepartment: string;
  conversationKey: string;
}

const SUMMARIZE_PROMPT = `你是一个医疗对话摘要专家。请分析以下对话历史，并以JSON格式输出关键信息：

输出格式：
{
  "patientSymptom": "患者主要症状描述",
  "suggestedDepartment": "推荐科室",
  "conversationKey": "对话的关键决定或信息点"
}

注意：
- patientSymptom: 患者描述的所有症状，用一句话总结
- suggestedDepartment: 之前分析出的科室或"待定"
- conversationKey: 重要的用户意向或选择（如"想要预约"）`;

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
          content: `请分析以下对话：\n${messages.map((m) => `${m.role}: ${m.content}`).join('\n')}`,
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
          content: `分析用户消息，返回JSON格式的意图识别结果。
意图类型: "symptom_report" | "booking_intent" | "hospital_select" | "info_query" | "other"
示例: {"intent":"booking_intent","confidence":0.9,"action":"show_hospitals"}`,
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
    if (incompleteInfo.name) missing += (missing ? '、' : '') + '患者名字';
    if (incompleteInfo.phone) missing += (missing ? '、' : '') + '手机号';
    if (incompleteInfo.time) missing += (missing ? '、' : '') + '就诊时间';

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一个友好的医疗导诊助手。根据缺失信息生成一句自然的询问句。',
        },
        {
          role: 'user',
          content: `缺失信息: ${missing}。请生成一句自然的问话。`,
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

// 主要接口：当消息超过阈值时，压缩上下文
export async function compressContext(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  threshold: number = 8
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  // 如果消息数在阈值以下，直接返回
  if (messages.length <= threshold) {
    return messages;
  }

  const summary = await summarizeConversation(messages);
  if (!summary) {
    // 摘要失败，返回最后10条消息
    return messages.slice(-threshold);
  }

  // 构造一条压缩的"背景信息"消息
  const compressedContext = {
    role: 'assistant' as const,
    content: `[对话摘要] 患者症状: ${summary.patientSymptom} | 推荐科室: ${summary.suggestedDepartment} | 关键信息: ${summary.conversationKey}`,
  };

  // 返回摘要 + 最后4条消息
  return [compressedContext, ...messages.slice(-(threshold - 1))];
}
