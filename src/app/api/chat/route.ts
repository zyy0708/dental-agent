import { NextRequest, NextResponse } from 'next/server';
import openai, { MODEL } from '@/lib/openai';
import { query } from '@/lib/db';

// 聊天状态
type ChatState = 'diagnosing' | 'recommend_hospital' | 'collect_name' | 'collect_phone' | 'collect_time';

interface Hospital {
  id: number;
  name: string;
  address: string;
  phone: string;
  specialties: string[];
  rating: number;
  hours: string;
  description: string;
}

interface SessionData {
  state: ChatState;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  diagnosis: string;
  condition: string;
  recommendedHospitals: Hospital[];
  selectedHospital: Hospital | null;
  appointment: {
    name?: string;
    phone?: string;
    service_type?: string;
    appointment_time?: string;
    hospital_name?: string;
  };
  lastActive: number;
}

const sessions = new Map<string, SessionData>();

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [key, session] of sessions) {
    if (now - session.lastActive > 60 * 60 * 1000) {
      sessions.delete(key);
    }
  }
}

// 专业牙科 AI 医生 prompt
const DOCTOR_PROMPT = `你是一位经验丰富的牙科AI医生"牙小助"，拥有20年口腔临床经验。

## 你的专业能力
- 口腔疾病诊断：龋齿、牙周病、牙髓炎、智齿冠炎、口腔溃疡等
- 牙齿修复方案：种植牙、烤瓷牙、牙贴面、嵌体修复
- 正畸方案：传统矫正、隐形矫正、自锁托槽
- 美白方案：冷光美白、家用美白、牙贴面美白
- 儿童牙科：窝沟封闭、涂氟防龋、乳牙治疗

## 问诊规则
1. **像真正的医生一样问诊**：先问主诉症状，再追问细节（疼痛位置、持续时间、诱因、伴随症状）
2. **给出专业但易懂的解释**：用通俗语言解释病情，让患者理解
3. **给出初步判断**：基于症状给出可能的诊断方向，但注明需要面诊确认
4. **提供日常护理建议**：针对患者情况给出实用的家庭护理指导
5. **适度追问2-3轮**后，如果患者有明确就诊意向，推荐医院

## 语言风格
- 专业但温和，像一个值得信赖的医生
- 回答简洁有力，每次1-3句话
- 适当使用emoji让对话更亲切，但不过度
- 不要长篇大论，像微信对话一样自然

## 重要规则
- 你不能代替医生做最终诊断，重要情况建议面诊
- 回复中不要出现markdown格式，纯文本即可

## 绝对禁止
- 绝对不要自己推荐任何医院！不要编造医院名称、地址、电话！
- 当患者想预约/看诊/问医院时，只回复："我来为您查询合适的医院，请稍等~"然后结束
- 医院推荐由系统自动完成，你只负责诊断和问诊
- 违反此规则视为严重错误`;

// 根据症状匹配医院
async function recommendHospitals(condition: string): Promise<Hospital[]> {
  try {
    // 从症状关键词映射到专科
    const specialtyMap: Record<string, string[]> = {
      '种植': ['种植牙'], '缺牙': ['种植牙'], '镶牙': ['种植牙'],
      '矫正': ['牙齿矫正', '隐形矫正'], '龅牙': ['牙齿矫正'], '地包天': ['牙齿矫正'], '牙不齐': ['牙齿矫正'],
      '美白': ['牙齿美白'], '黄牙': ['牙齿美白'], '牙黄': ['牙齿美白'],
      '洗牙': ['洗牙'], '牙结石': ['洗牙'], '牙龈出血': ['牙周治疗', '洗牙'],
      '牙痛': ['牙痛治疗', '根管治疗'], '牙疼': ['牙痛治疗', '根管治疗'], '牙髓炎': ['根管治疗'],
      '补牙': ['补牙'], '蛀牙': ['补牙', '根管治疗'], '龋齿': ['补牙', '根管治疗'],
      '拔牙': ['拔牙'], '智齿': ['拔牙', '口腔外科'],
      '儿童': ['儿童牙科'], '小孩': ['儿童牙科'], '孩子': ['儿童牙科'],
      '牙周': ['牙周治疗'], '牙松': ['牙周治疗'],
      '贴面': ['牙贴面'], '美学': ['牙贴面', '牙齿美白'],
    };

    // 找匹配的专科
    let matchedSpecialties: string[] = [];
    for (const [keyword, specialties] of Object.entries(specialtyMap)) {
      if (condition.includes(keyword)) {
        matchedSpecialties.push(...specialties);
      }
    }

    // 如果没有匹配，默认推荐综合口腔
    if (matchedSpecialties.length === 0) {
      matchedSpecialties = ['种植牙', '牙齿矫正', '补牙', '洗牙'];
    }

    // 去重
    matchedSpecialties = [...new Set(matchedSpecialties)];

    // 查询匹配的医院
    const placeholders = matchedSpecialties.map((_, i) => `$${i + 1}`).join(',');
    const result = await query(
      `SELECT * FROM hospitals WHERE specialties::text ILIKE ANY(ARRAY[${placeholders}]) ORDER BY rating DESC LIMIT 3`,
      matchedSpecialties.map(s => `%${s}%`)
    );

    return result.rows;
  } catch (error) {
    console.error('[HOSPITAL] Query error:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json();

    if (!message || !sessionId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    cleanExpiredSessions();

    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        state: 'diagnosing',
        messages: [],
        diagnosis: '',
        condition: '',
        recommendedHospitals: [],
        selectedHospital: null,
        appointment: {},
        lastActive: Date.now(),
      });
    }
    const session = sessions.get(sessionId)!;
    session.lastActive = Date.now();
    session.messages.push({ role: 'user', content: message });

    let reply = '';
    let newState = session.state;
    let hospitals: Hospital[] = [];

    console.log(`[DOC] sid=${sessionId.slice(0,8)} state=${session.state} msg="${message}"`);

    switch (session.state) {

      // ========== 诊断阶段 ==========
      case 'diagnosing': {
        // 检测是否有预约/看诊意向
        const bookingKeywords = ['预约', '挂号', '看诊', '面诊', '去医院', '想去看', '推荐医院', '哪家医院', '哪个医院', '去哪看', '怎么预约', '有医院', '找医院', '附近'];
        const wantsBooking = bookingKeywords.some(k => message.includes(k));

        if (wantsBooking) {
          // 提取症状关键词
          const conditionKeywords = session.messages
            .filter(m => m.role === 'user')
            .map(m => m.content)
            .join(' ');

          session.condition = conditionKeywords;
          hospitals = await recommendHospitals(conditionKeywords);
          session.recommendedHospitals = hospitals;

          if (hospitals.length > 0) {
            reply = '根据您的情况，我为您匹配了以下优质医院：\n\n';
            hospitals.forEach((h, i) => {
              reply += `${i + 1}. ${h.name}\n   ⭐ ${h.rating}分 · ${h.address}\n   🕐 ${h.hours}\n   📞 ${h.phone}\n   💡 ${h.description}\n\n`;
            });
            reply += '请问您想选择哪家医院？回复序号（1/2/3）即可。';
            newState = 'recommend_hospital';
          } else {
            reply = '抱歉暂时没有匹配的医院数据，建议您就近选择正规口腔医院就诊。';
          }
          break;
        }

        // 正常诊断对话
        const completion = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: 'system', content: DOCTOR_PROMPT },
            ...session.messages.slice(-12),
          ],
          max_tokens: 300,
          temperature: 0.6,
        });
        reply = completion.choices[0]?.message?.content || '';
        if (!reply.trim()) {
          reply = '您能再详细描述一下症状吗？比如疼痛位置、持续时间、是否有肿胀等。';
        }

        // 安全检查：如果AI回复中包含医院名称但不在数据库中，替换为通用回复
        const hospitalNames = ['医院', '诊所', '口腔中心', '齿科'];
        const hasHospitalMention = hospitalNames.some(k => reply.includes(k));
        if (hasHospitalMention && !reply.includes('系统') && !reply.includes('为您匹配')) {
          reply = '根据您的描述，建议您尽快到专业口腔机构面诊确认。需要我为您推荐合适的医院吗？';
        }
        break;
      }

      // ========== 医院选择阶段 ==========
      case 'recommend_hospital': {
        const numMatch = message.match(/^[1-3]$/);
        if (numMatch && session.recommendedHospitals.length > 0) {
          const idx = parseInt(numMatch[0]) - 1;
          if (idx < session.recommendedHospitals.length) {
            session.selectedHospital = session.recommendedHospitals[idx];
            session.appointment.hospital_name = session.selectedHospital.name;
            reply = `好的，您选择了${session.selectedHospital.name}。\n请问您怎么称呼？`;
            newState = 'collect_name';
          } else {
            reply = '请输入有效的序号（1/2/3）。';
          }
        } else {
          // 用户可能用文字描述偏好
          reply = '请回复医院序号（1/2/3）来选择，或者告诉我您的偏好，我重新推荐。';
        }
        break;
      }

      // ========== 收集姓名 ==========
      case 'collect_name': {
        const phoneInName = message.match(/\b1\d{10}\b/);
        if (phoneInName) {
          session.appointment.name = message.replace(phoneInName[0], '').trim() || '患者';
          session.appointment.phone = phoneInName[0];
          reply = `好的${session.appointment.name}，电话${phoneInName[0]}。\n请问您希望什么时间就诊？（例如：6月10日下午3点）`;
          newState = 'collect_time';
        } else {
          session.appointment.name = message.trim();
          reply = `好的${message.trim()}，请留下您的手机号，方便医院联系您：`;
          newState = 'collect_phone';
        }
        break;
      }

      // ========== 收集电话 ==========
      case 'collect_phone': {
        const phoneMatch = message.match(/\b1\d{10}\b/);
        if (phoneMatch) {
          session.appointment.phone = phoneMatch[0];
          reply = '收到！请问您希望什么时间就诊？（例如：6月10日下午3点）';
          newState = 'collect_time';
        } else {
          reply = '手机号格式不对哦，请输入11位手机号（1开头）：';
        }
        break;
      }

      // ========== 收集时间 + 写入数据库 ==========
      case 'collect_time': {
        session.appointment.appointment_time = message.trim();
        session.appointment.service_type = session.condition || '综合检查';

        console.log(`[DB] INSERT:`, JSON.stringify(session.appointment));

        try {
          await query(
            'INSERT INTO appointments (name, phone, service_type, appointment_time, status) VALUES ($1, $2, $3, $4, $5)',
            [
              session.appointment.name,
              session.appointment.phone,
              `${session.appointment.service_type} @ ${session.appointment.hospital_name || '待定'}`,
              session.appointment.appointment_time,
              'pending',
            ]
          );
          console.log(`[DB] ✅ 写入成功`);
          reply = `✅ 预约登记成功！\n\n🏥 ${session.appointment.hospital_name || '待定'}\n👤 ${session.appointment.name}\n📱 ${session.appointment.phone}\n🦷 ${session.appointment.service_type}\n🕐 ${session.appointment.appointment_time}\n\n医院会尽快电话确认，请保持手机畅通。祝您早日康复！`;
          newState = 'diagnosing';
        } catch (dbError: unknown) {
          const errMsg = dbError instanceof Error ? dbError.message : String(dbError);
          console.error('[DB] ❌ 写入失败:', errMsg);
          reply = '抱歉，系统出了点问题，预约没提交成功。请稍后再试。';
          newState = 'diagnosing';
        }
        session.appointment = {};
        session.selectedHospital = null;
        session.recommendedHospitals = [];
        break;
      }
    }

    session.state = newState;
    session.messages.push({ role: 'assistant', content: reply });

    return NextResponse.json({
      reply,
      state: newState,
      hospitals: hospitals.length > 0 ? hospitals : undefined,
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[DOC] Error:', errMsg);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
