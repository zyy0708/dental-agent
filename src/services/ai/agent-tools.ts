import openai, { MODEL } from '@/lib/openai';
import { query } from '@/lib/db';

export interface ToolCall {
  name: string;
  args: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  summary: string;
  rawContent: string;
  data?: any;
}

export interface AgentStep {
  tool: string;
  input?: any;
  result_summary: string;
  duration_ms: number;
}

export function parseToolCalls(content: string): ToolCall[] {
  const regex = /<tool_call>\s*({[^]*?})\s*<\/tool_call>/g;
  const calls: ToolCall[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.name && parsed.args !== undefined) {
        calls.push({ name: parsed.name, args: parsed.args });
      }
    } catch {
    }
  }
  return calls;
}

export function stripToolCalls(content: string): string {
  return content.replace(/<tool_call>\s*({[^]*?})\s*<\/tool_call>\s*/g, '').trim();
}

async function executeQueryHospitals(args: Record<string, any>): Promise<ToolResult> {
  try {
    const city = args.city || '';
    const specialty = args.specialty || '';
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (city) {
      params.push(city);
      conditions.push(`city = $${params.length}`);
    }
    if (specialty) {
      params.push(`%${specialty}%`);
      conditions.push(`specialties::text ILIKE $${params.length}`);
    }

    const sql = conditions.length > 0
      ? `SELECT * FROM hospitals WHERE ${conditions.join(' AND ')} ORDER BY rating DESC LIMIT 5`
      : `SELECT * FROM hospitals ORDER BY rating DESC LIMIT 5`;

    const result = await query(sql, params);
    const hospitals = result.rows;

    if (hospitals.length === 0) {
      if (!city) {
        return {
          success: true,
          summary: `需要先知道用户在哪个城市才能查询医院`,
          rawContent: `未提供城市信息，无法查询医院。请先询问用户所在城市。`,
          data: [],
        };
      }
      if (city) {
        const fallbackKeywords = ['口腔', '牙', '齿', '种植', '矫正', '修复', '治疗'];
        for (const fk of fallbackKeywords) {
          const fbResult = await query(
            `SELECT * FROM hospitals WHERE city = $1 AND specialties::text ILIKE $2 ORDER BY rating DESC LIMIT 3`,
            [city, `%${fk}%`]
          );
          if (fbResult.rows.length > 0) {
            return {
              success: true,
              summary: `在${city}找到${fbResult.rows.length}家口腔相关医院`,
              rawContent: `在${city}找到以下口腔医院:\n${fbResult.rows.map((h: any, i: number) =>
                `${i + 1}. ${h.name}\n   评分: ${h.rating} | 地址: ${h.address}\n   电话: ${h.phone} | 营业时间: ${h.hours}\n   简介: ${h.description || '暂无'}`
              ).join('\n\n')}`,
              data: fbResult.rows,
            };
          }
        }
      }
      return {
        success: true,
        summary: `在${city || '全国'}未找到匹配"${specialty}"的医院`,
        rawContent: `在${city || '全国'}未找到匹配"${specialty}"的医院。可尝试不同的城市或科室关键词。`,
        data: [],
      };
    }

    const summary = `在${city || '全国'}找到${hospitals.length}家${specialty}相关医院`;
    const rawContent = hospitals.map((h, i) =>
      `${i + 1}. ${h.name}\n   评分: ${h.rating} | 地址: ${h.address}\n   电话: ${h.phone} | 营业时间: ${h.hours}\n   简介: ${h.description || '暂无'}`
    ).join('\n\n');

    return { success: true, summary, rawContent, data: hospitals };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, summary: '查询医院失败', rawContent: `系统查询医院时出错: ${msg}` };
  }
}

async function executeGetUserProfile(userId?: number): Promise<ToolResult> {
  try {
    if (!userId) {
      return { success: false, summary: '无法获取用户信息', rawContent: '用户未登录，无法获取个人信息。请先登录。' };
    }
    const result = await query(
      'SELECT id, nickname, username, phone, region, age, gender, medical_history, allergies FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return { success: false, summary: '用户不存在', rawContent: '未找到该用户的信息。' };
    }
    const u = result.rows[0];
    const nickname = u.nickname || u.username || '用户';
    const summary = `用户: ${nickname}${u.region ? ', ' + u.region : ''}${u.phone ? ', 已绑定手机' : ''}`;
    const parts: string[] = [];
    if (nickname) parts.push(`昵称: ${nickname}`);
    if (u.region) parts.push(`所在城市: ${u.region}`);
    if (u.phone) parts.push(`手机号: ${u.phone}`);
    if (u.age) parts.push(`年龄: ${u.age}`);
    if (u.gender) parts.push(`性别: ${u.gender}`);
    if (u.medical_history) parts.push(`病史: ${u.medical_history}`);
    if (u.allergies) parts.push(`过敏史: ${u.allergies}`);
    parts.push(`需收集信息: 如姓名、手机号、就诊时间、选择医院 — 根据对话情况逐步询问，不要一次问完`);

    return { success: true, summary, rawContent: parts.join('\n'), data: u };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, summary: '获取用户信息失败', rawContent: `查询用户信息出错: ${msg}` };
  }
}

async function executeCreateAppointment(args: Record<string, any>, userId?: number): Promise<ToolResult> {
  try {
    const name = args.name || args.patient_name || args.patientName || '';
    const phone = args.phone || args.mobile || args.phone_number || '';
    const service_type = args.service_type || args.serviceType || args.department || args.specialty || '';
    const finalServiceType = service_type || '口腔检查';
    const appointment_time = args.appointment_time || args.appointmentTime || args.time || args.date || '';
    const hospital_name = args.hospital_name || args.hospitalName || args.hospital || '';
    const missing: string[] = [];
    if (!name) missing.push('姓名');
    if (!phone) missing.push('手机号');
    if (missing.length > 0) {
      return {
        success: false,
        summary: '预约信息不完整',
        rawContent: `缺少: ${missing.join('、')}。请先收集完整信息再调用。当前收到: ${JSON.stringify(args)}`,
      };
    }
    const phoneClean = String(phone).replace(/\D/g, '');
    if (!/^1\d{10}$/.test(phoneClean)) {
      return {
        success: false,
        summary: '手机号格式不正确',
        rawContent: `手机号 "${phone}" 格式不正确，请提供11位中国大陆手机号。`,
      };
    }
    const serviceTypeFull = hospital_name ? `${finalServiceType} @ ${hospital_name}` : finalServiceType;

    await query(
      'INSERT INTO appointments (name, phone, service_type, appointment_time, status) VALUES ($1, $2, $3, $4, $5)',
      [name, phoneClean, serviceTypeFull, appointment_time, 'pending']
    ).catch(e => {
      throw new Error(`DB INSERT failed: ${e.message}`);
    });

    return {
      success: true,
      summary: `预约创建成功: ${name} - ${finalServiceType} @ ${hospital_name || '待定'} - ${appointment_time}`,
      rawContent: `✅ 预约已成功创建！\n患者: ${name}\n电话: ${phoneClean}\n项目: ${finalServiceType}\n医院: ${hospital_name || '待定'}\n时间: ${appointment_time}\n状态: 待确认\n\n医院会尽快电话确认，请保持手机畅通。请给用户一个完整的确认回复。`,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[CREATE_APPOINTMENT ERROR]', msg, JSON.stringify(args));
    return { success: false, summary: '预约创建失败', rawContent: `创建预约时系统出错: ${msg}\n传入参数: ${JSON.stringify(args)}` };
  }
}

interface IntentResult {
  intent: string;
  confidence: number;
  action: string;
}

async function executeAnalyzeIntent(args: Record<string, any>): Promise<ToolResult> {
  try {
    const message = args.message || '';
    if (!message) {
      return { success: false, summary: '意图分析: 无消息', rawContent: '[意图分析] 未提供消息。' };
    }

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `分析用户消息的意图，只返回 JSON。
意图类型只能是：
- symptom_report：用户在描述口腔症状或不适
- booking_intent：用户明确想预约、挂号、找医院
- hospital_select：用户在选择医院或确认医院
- info_query：用户在咨询口腔健康知识或流程问题
- emergency：用户描述急症（大出血、呼吸困难、剧烈疼痛等）
- other：其他情况

动作类型只能是：
- show_hospitals：需要推荐医院
- ask_more_info：需要更多信息才能判断
- urgent_referral：需要立即去急诊
- default：常规回复

输出格式: {"intent":"...","confidence":0-1,"action":"..."}`,
        },
        { role: 'user', content: `消息: "${message}"` },
      ],
      max_tokens: 150,
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content || '';
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace <= firstBrace) {
      return { success: true, summary: '意图分析: 无法解析', rawContent: `[意图分析] 原始输出: ${raw}`, data: { intent: 'other', confidence: 0.5, action: 'default' } };
    }

    const result: IntentResult = JSON.parse(raw.slice(firstBrace, lastBrace + 1));
    const intentLabel = getIntentLabel(result.intent);
    const actionTip = result.action === 'ask_more_info'
      ? '但消息中已包含关键信息，请直接根据已有信息回复，不要要求用户重复描述。'
      : '请直接根据用户消息回复。';
    return {
      success: true,
      summary: `意图: ${intentLabel} (${Math.round(result.confidence * 100)}%)`,
      rawContent: `用户消息: "${message}"\n意图: ${result.intent} (${intentLabel})\n置信度: ${Math.round(result.confidence * 100)}%\n建议动作: ${result.action}\n${actionTip}`,
      data: result,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, summary: `意图分析出错`, rawContent: `[意图分析] 失败: ${msg}`, data: { intent: 'other', confidence: 0.5, action: 'default' } };
  }
}

async function executeAnswerMedicalQuestion(args: Record<string, any>): Promise<ToolResult> {
  const question = (args.question || '').trim();
  if (!question) {
    return { success: false, summary: '未提供问题', rawContent: '请提供用户的口腔健康问题。' };
  }
  return {
    success: true,
    summary: `已收到问题: ${question.slice(0, 30)}${question.length > 30 ? '...' : ''}`,
    rawContent: `用户咨询的口腔健康问题: "${question}"\n\n请根据口腔医学常识，用专业温和的语言回答。注意：不要做出疾病诊断、不开药、不提供治疗方案。如有必要，建议用户到正规口腔医院检查。`,
  };
}

function getIntentLabel(intent: string): string {
  const map: Record<string, string> = {
    symptom_report: '症状描述',
    booking_intent: '预约意向',
    hospital_select: '选择医院',
    info_query: '信息咨询',
    emergency: '急诊',
    other: '其他',
  };
  return map[intent] || intent;
}

export function getIntentTag(intent: string): string {
  const map: Record<string, string> = {
    symptom_report: 'Triage',
    booking_intent: 'Booking',
    hospital_select: 'Booking',
    info_query: 'Info',
    emergency: 'Emergency',
    other: '',
  };
  return map[intent] || '';
}

export async function executeToolCall(
  toolCall: ToolCall,
  userId?: number
): Promise<ToolResult> {
  switch (toolCall.name) {
    case 'query_hospitals':
      return executeQueryHospitals(toolCall.args);
    case 'get_user_profile':
      return executeGetUserProfile(userId);
    case 'create_appointment':
      return executeCreateAppointment(toolCall.args, userId);
    case 'analyze_intent':
      return executeAnalyzeIntent(toolCall.args);
    case 'answer_medical_question':
      return executeAnswerMedicalQuestion(toolCall.args);
    default:
      return {
        success: false,
        summary: `未知工具: ${toolCall.name}`,
        rawContent: `错误: 工具 "${toolCall.name}" 不存在。可用工具: query_hospitals, get_user_profile, create_appointment, analyze_intent, answer_medical_question`,
      };
  }
}

export function extractIntentFromSteps(steps: AgentStep[]): string {
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].tool === 'analyze_intent') {
      const summary = steps[i].result_summary;
      const chineseToEnglish: Record<string, string> = {
        '症状描述': 'symptom_report',
        '预约意向': 'booking_intent',
        '选择医院': 'hospital_select',
        '信息咨询': 'info_query',
        '急诊': 'emergency',
        '其他': 'other',
      };
      for (const [cn, en] of Object.entries(chineseToEnglish)) {
        if (summary.includes(cn)) return getIntentTag(en);
      }
      const match = summary.match(/意图:\s*(\S+)/);
      if (match) {
        const tag = getIntentTag(match[1]);
        if (tag) return tag;
      }
    }
  }
  return '';
}

export function extractIntentFromData(data: any): string {
  if (data?.intent) return getIntentTag(data.intent);
  return '';
}

export const TOOL_DESCRIPTIONS = `## 可用工具

当需要获取信息或执行操作时，输出 <tool_call>JSON</tool_call> 指令，每行一个。工具结果会作为"用户消息"返回给你，你可以参考结果继续推理。

### 1. query_hospitals
- 用途：根据城市和科室查询匹配医院
- 参数：{ "city": "城市名", "specialty": "科室或症状关键词" }
- 示例：<tool_call>{"name":"query_hospitals","args":{"city":"成都","specialty":"种植牙"}}</tool_call>

### 2. create_appointment
- 用途：为患者创建预约记录（存入系统数据库）
- 参数：{ "name": "患者姓名", "phone": "11位手机号", "service_type": "就诊类型", "appointment_time": "预约时间", "hospital_name": "医院名称" }
- 注意：必须确认已获得患者的姓名、手机号和选择的医院后才能调用。手机号必须是11位数字，以1开头。
- 示例：<tool_call>{"name":"create_appointment","args":{"name":"张三","phone":"13800138000","service_type":"种植牙","appointment_time":"明天下午2点","hospital_name":"成都口腔医院"}}</tool_call>

### 3. get_user_profile
- 用途：获取当前用户的个人信息（昵称、手机号、城市、病史等）
- 参数：{}
- 示例：<tool_call>{"name":"get_user_profile","args":{}}</tool_call>

### 4. analyze_intent
- 用途：分析用户消息的意图类别
- 参数：{ "message": "用户消息原文" }
- 示例：<tool_call>{"name":"analyze_intent","args":{"message":"牙痛两天了"}}</tool_call>

### 5. answer_medical_question
- 用途：回答口腔健康咨询类问题
- 参数：{ "question": "用户的问题" }
- 示例：<tool_call>{"name":"answer_medical_question","args":{"question":"洗牙会伤害牙齿吗"}}</tool_call>

## 工具调用规则
- 需要调用工具时：先输出文字解释（可选），然后输出 <tool_call>JSON</tool_call>
- 不需要工具时：直接输出你最终的回复，不要带 <tool_call>
- 可一次输出多个工具调用（会并行执行）
- 如果工具调用返回错误，请根据错误信息尝试其他方式或告知用户`;
