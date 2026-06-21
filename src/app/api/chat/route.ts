import { NextRequest, NextResponse } from 'next/server';
import openai, { MODEL } from '@/lib/openai';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { compressContext, detectUserIntent, generateClarifyingQuestion } from '@/lib/sub-agent';

// 导诊状态
type ChatState = 'triage' | 'post_triage' | 'collect_city' | 'recommend_hospital' | 'collect_name' | 'collect_phone' | 'collect_time' | 'confirm_booking';

interface Hospital {
  id: number;
  name: string;
  address: string;
  phone: string;
  specialties: string[];
  rating: number;
  hours: string;
  description: string;
  city?: string;
  booking_url?: string;
}

interface TriageResult {
  department: string;
  confidence: number;
  reason: string;
  emergency: boolean;
}

interface SessionData {
  state: ChatState;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  triageResult: TriageResult | null;
  condition: string;
  userCity: string;
  recommendedHospitals: Hospital[];
  selectedHospital: Hospital | null;
  userProfile: {
    nickname?: string;
    phone?: string;
    region?: string;
    name?: string;
  };
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

// AI 导诊助手 系统提示词
const TRIAGE_PROMPT = `你是 Dental Agent 的"口腔健康导诊助手"。你不是医生，不能诊断疾病、不能开药、不能提供治疗方案，也不能承诺疗效。

你的核心任务是：先帮用户分析症状、给出建议，再在合适的时候引导预约。

流程：
1. 用户描述症状后，先分析可能的原因，给出实用建议（比如注意事项、缓解方法）。
2. 告诉用户可能需要看哪个科室，以及为什么。
3. 不要一上来就问要不要预约，先让用户觉得你真的在帮他分析。
4. 用户追问或表达想看诊的意愿时，再自然地引导预约。

硬性规则：
- 不要编造医院、医生、评分、地址、电话、营业时间。
- 医院推荐只能来自系统数据库返回的数据。
- 不要推荐具体医院或医生名字。
- 不要索取与预约无关的敏感信息，如身份证、银行卡、精确住址。
- 用户拒绝预约时，立刻停止推进预约流程。
- 用户只是在咨询知识时，不要强行索要手机号。
- 用户出现高风险症状时，不继续收集预约信息。

紧急症状：胸痛、呼吸困难、大出血、昏迷、抽搐、严重过敏、持续高热、严重外伤。
如果命中紧急症状，直接提醒去急诊，不能继续牙科预约。

回复格式：
先用自然语言分析症状、给建议（1-3句话）。
然后在最后一行加上科室标签，格式为 [DEPARTMENT:科室名]。
如果信息不足，标签写 [DEPARTMENT:全科医学科]。

示例：
用户：我牙疼了两天了，吃东西就疼
你：牙疼持续两天而且吃东西加重，可能是龋齿或者牙髓发炎了。这两天先吃软一点的食物，避免过冷过热的刺激，尽早去检查一下比较好，拖久了容易加重。[DEPARTMENT:口腔科]

用户：我牙龈出血
你：牙龈出血常见原因是牙龈炎或者牙周问题，也可能跟刷牙太用力有关。可以先用软毛牙刷，饭后漱口。如果经常出血，建议去口腔科看看，洗牙和牙周检查可以帮助找到原因。[DEPARTMENT:口腔科]

紧急情况：[DEPARTMENT:急诊科]`;

/** 症状关键词 → 口腔专科映射 */
function mapConditionToSpecialties(condition: string): string[] {
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

  let matched: string[] = [];
  for (const [keyword, specialties] of Object.entries(specialtyMap)) {
    if (condition.includes(keyword)) matched.push(...specialties);
  }
  return matched.length > 0 ? [...new Set(matched)] : ['种植牙', '牙齿矫正', '补牙', '洗牙'];
}

// 根据症状和城市匹配医院
async function recommendHospitals(condition: string, city: string): Promise<Hospital[]> {
  try {
    const matchedSpecialties = mapConditionToSpecialties(condition);

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (city) {
      params.push(city);
      conditions.push(`city = $${params.length}`);
    }

    const specialtyConds = matchedSpecialties.map((s) => {
      params.push(`%${s}%`);
      return `specialties::text ILIKE $${params.length}`;
    });
    conditions.push(`(${specialtyConds.join(' OR ')})`);

    const sql = `SELECT * FROM hospitals WHERE ${conditions.join(' AND ')} ORDER BY rating DESC LIMIT 3`;
    const result = await query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('[HOSPITAL] Query error:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    let message: string, sessionId: string;
    try {
      const body = await request.json();
      message = body.message;
      sessionId = body.sessionId;
    } catch (parseErr: unknown) {
      return NextResponse.json({
        error: '请求体解析失败',
        detail: parseErr instanceof Error ? parseErr.message : String(parseErr),
      }, { status: 400 });
    }

    if (!message || !sessionId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    cleanExpiredSessions();

    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        state: 'triage',
        messages: [],
        triageResult: null,
        condition: '',
        userCity: '',
        recommendedHospitals: [],
        selectedHospital: null,
        userProfile: {},
        appointment: {},
        lastActive: Date.now(),
      });
    }
    const session = sessions.get(sessionId)!;
    session.lastActive = Date.now();
    session.messages.push({ role: 'user', content: message });

    // 加载用户档案（首次进入时）
    if (Object.keys(session.userProfile).length === 0) {
      try {
        const user = await getCurrentUser();
        if (user) {
          const result = await query(
            'SELECT nickname, phone, region, username FROM users WHERE id = $1',
            [user.id]
          );
          if (result.rows.length > 0) {
            const row = result.rows[0];
            session.userProfile = {
              nickname: row.nickname || row.username,
              phone: row.phone || '',
              region: row.region || '',
              name: row.nickname || row.username || '',
            };
          }
        }
      } catch {}
    }

    let reply = '';
    let newState = session.state;
    let hospitals: Hospital[] = [];

    console.log(`[TRIAGE] sid=${sessionId.slice(0, 8)} state=${session.state} msg="${message}"`);

    switch (session.state) {

      // ================================================================
      // 导诊阶段 — AI 分析症状，自然语言回复 + 科室标签
      // ================================================================
      case 'triage': {
        // 检测是否有预约/看诊意向
        const bookingKeywords = [
          '预约', '挂号', '看诊', '面诊', '去医院', '想去看',
          '推荐医院', '哪家医院', '哪个医院', '去哪看', '怎么预约',
          '有医院', '找医院', '附近', '帮我约', '帮我挂',
        ];
        const wantsBooking = bookingKeywords.some((k) => message.includes(k));

        // 如果已有导诊结果且是口腔科，用户确认 → 直接进预约流程
        if (session.triageResult && session.triageResult.department === '口腔科' && !session.triageResult.emergency) {
          const denied = ['不', '没', '别', '不用', '不要', '不需要', '不了', '算了', '再说'];
          const isDenied = denied.some((k) => message.includes(k));
          if (isDenied) break;

          const positiveKeywords = ['好', '嗯', '要', '可以', '行', '是的', '对', 'ok', '好的', '推荐', '看看', '去吧', '约'];
          const isPositive = positiveKeywords.some((k) => message.includes(k)) || wantsBooking;
          if (isPositive) {
            // 自动用档案中的地区
            if (session.userProfile.region) {
              session.userCity = session.userProfile.region;
              hospitals = await recommendHospitals(session.condition, session.userCity);
              session.recommendedHospitals = hospitals;
              if (hospitals.length > 0) {
                reply = `为您找到了${session.userCity}的以下优质医院：\n\n`;
                hospitals.forEach((h, i) => {
                  reply += `${i + 1}. ${h.name}\n   ⭐ ${h.rating}分 · ${h.address}\n   🕐 ${h.hours}\n   📞 ${h.phone}\n   💡 ${h.description}\n\n`;
                });
                reply += '请问您想选择哪家医院？回复序号（1/2/3）即可。';
                newState = 'recommend_hospital';
              } else {
                reply = `抱歉，暂时没有找到${session.userCity}的匹配医院数据。您可以换个城市试试。`;
              }
            } else {
              reply = '请问您在哪个城市？我为您推荐附近的口腔医院。';
              newState = 'collect_city';
            }
            break;
          }
        }

        // 调用 AI 导诊
        let rawContent = '';
        try {
          const compressedMessages = await compressContext(session.messages, 8);
          const completion = await openai.chat.completions.create({
            model: MODEL,
            messages: [
              { role: 'system', content: TRIAGE_PROMPT },
              ...compressedMessages,
            ],
            max_tokens: 400,
            temperature: 0.3,
          });
          rawContent = completion.choices[0]?.message?.content || '';
        } catch (apiError: unknown) {
          const errMsg = apiError instanceof Error ? apiError.message : String(apiError);
          console.error('[TRIAGE] API call failed:', errMsg);
          reply = '系统暂时无法处理，请稍后再试。';
          break;
        }

        // 提取 [DEPARTMENT:xxx] 标签
        const deptMatch = rawContent.match(/\[DEPARTMENT:(.+?)\]/);
        const department = deptMatch ? deptMatch[1].trim() : '全科医学科';
        const isEmergency = department === '急诊科';
        const reason = rawContent.replace(/\[DEPARTMENT:.+?\]/, '').trim();

        session.triageResult = { department, confidence: 0.85, reason, emergency: isEmergency };

        // 🚨 紧急情况
        if (isEmergency) {
          reply = reason || `⚠️ 您的情况可能比较紧急，建议尽快前往急诊科就诊。`;
          break;
        }

        // 非紧急情况 — 回复分析内容，进入 post_triage 等待用户后续意图
        if (department === '口腔科') {
          session.condition = session.messages
            .filter((m) => m.role === 'user')
            .map((m) => m.content)
            .join(' ');

          if (wantsBooking) {
            // 自动用档案中的地区
            if (session.userProfile.region) {
              session.userCity = session.userProfile.region;
              hospitals = await recommendHospitals(session.condition, session.userCity);
              session.recommendedHospitals = hospitals;
              if (hospitals.length > 0) {
                reply = `${reason}\n\n为您找到了${session.userCity}的以下优质医院：\n\n`;
                hospitals.forEach((h, i) => {
                  reply += `${i + 1}. ${h.name}\n   ⭐ ${h.rating}分 · ${h.address}\n   🕐 ${h.hours}\n   📞 ${h.phone}\n   💡 ${h.description}\n\n`;
                });
                reply += '请问您想选择哪家医院？回复序号（1/2/3）即可。';
                newState = 'recommend_hospital';
              } else {
                reply = `${reason}\n\n抱歉，暂时没有找到${session.userCity}的匹配医院数据。`;
                newState = 'post_triage';
              }
            } else {
              reply = `${reason}\n\n请问您在哪个城市？我为您推荐附近的口腔医院。`;
              newState = 'collect_city';
            }
          } else {
            reply = reason;
            newState = 'post_triage';
          }
        } else if (department === '全科医学科') {
          reply = reason || '症状信息还不够充分，建议您补充更多细节，或者先去附近的全科门诊咨询一下。';
          newState = 'post_triage';
        } else {
          reply = `${reason}\n\n由于本系统专注于口腔诊疗服务，建议您前往附近综合医院的相关科室就诊。如需口腔相关帮助，请随时告诉我。`;
          newState = 'post_triage';
        }
        break;
      }

      // ================================================================
      // 导诊后讨论阶段 — 用户可以追问或表达预约意向
      // ================================================================
      case 'post_triage': {
        const denied = ['不', '没', '别', '不用', '不要', '不需要', '不了', '算了', '再说'];
        const isDenied = denied.some((k) => message.includes(k));

        const bookingKeywords = [
          '预约', '挂号', '看诊', '面诊', '去医院', '想去看',
          '推荐医院', '哪家医院', '哪个医院', '去哪看', '怎么预约',
          '有医院', '找医院', '附近', '帮我约', '帮我挂', '约',
          '好', '行', '可以', '去吧', '看看', '推荐',
        ];
        const wantsBooking = bookingKeywords.some((k) => message.includes(k));

        if (wantsBooking && !isDenied) {
          // 自动用档案中的地区，跳过询问
          if (session.userProfile.region) {
            session.userCity = session.userProfile.region;
            hospitals = await recommendHospitals(session.condition, session.userCity);
            session.recommendedHospitals = hospitals;
            if (hospitals.length > 0) {
              reply = `为您找到了${session.userCity}的以下优质医院：\n\n`;
              hospitals.forEach((h, i) => {
                reply += `${i + 1}. ${h.name}\n   ⭐ ${h.rating}分 · ${h.address}\n   🕐 ${h.hours}\n   📞 ${h.phone}\n   💡 ${h.description}\n\n`;
              });
              reply += '请问您想选择哪家医院？回复序号（1/2/3）即可。';
              newState = 'recommend_hospital';
            } else {
              reply = `抱歉，暂时没有找到${session.userCity}的匹配医院数据。您可以换个城市试试。`;
              newState = 'triage';
            }
          } else {
            reply = '请问您在哪个城市？我为您推荐附近的口腔医院。';
            newState = 'collect_city';
          }
        } else if (isDenied) {
          reply = '好的，有需要随时找我。祝您早日康复！';
          newState = 'triage';
        } else {
          // 用户追问其他问题，继续用 AI 回复
          try {
            const compressedMessages = await compressContext(session.messages, 6);
            const followUpPrompt = `你是口腔健康导诊助手。用户在之前的对话中已经得到了科室分析，现在在追问。请用自然、友善的语气回答，给出实用建议。不要重复之前的分析。如果用户的问题超出你的能力范围，建议他咨询医生。不要强行推销预约。`;
            const completion = await openai.chat.completions.create({
              model: MODEL,
              messages: [
                { role: 'system', content: followUpPrompt },
                ...compressedMessages,
              ],
              max_tokens: 300,
              temperature: 0.4,
            });
            reply = completion.choices[0]?.message?.content || '您可以继续问我关于口腔健康的问题。';
          } catch {
            reply = '您可以继续问我关于口腔健康的问题。';
          }
        }
        break;
      }

      // ================================================================
      // 医院选择
      // ================================================================
      case 'recommend_hospital': {
        const numMatch = message.match(/^[1-3]$/);
        if (numMatch && session.recommendedHospitals.length > 0) {
          const idx = parseInt(numMatch[0]) - 1;
          if (idx < session.recommendedHospitals.length) {
            session.selectedHospital = session.recommendedHospitals[idx];
            session.appointment.hospital_name = session.selectedHospital.name;

            // 自动用档案信息，跳过收集步骤
            const pName = session.userProfile.nickname || session.userProfile.name || '';
            const pPhone = session.userProfile.phone || '';

            if (pName && pPhone) {
              session.appointment.name = pName;
              session.appointment.phone = pPhone;
              session.appointment.service_type = session.condition || '综合检查';
              reply = `好的，已为您选择${session.selectedHospital.name}。\n\n为您确认预约信息：\n🏥 ${session.selectedHospital.name}\n👤 ${pName}\n📞 ${pPhone}\n🦷 ${session.appointment.service_type}\n\n请问您希望什么时间就诊？（例如：6月10日下午3点）`;
              newState = 'collect_time';
            } else {
              reply = `好的，您选择了${session.selectedHospital.name}。\n请问您怎么称呼？`;
              newState = 'collect_name';
            }
          } else {
            reply = '请输入有效的序号（1/2/3）。';
          }
        } else {
          reply = '请回复医院序号（1/2/3）来选择，或者告诉我您的偏好，我重新推荐。';
        }
        break;
      }

      // ================================================================
      // 收集城市 — 自动从档案获取
      // ================================================================
      case 'collect_city': {
        // 自动用档案中的地区
        const profileCity = session.userProfile.region || '';
        if (profileCity && !session.userCity) {
          session.userCity = profileCity;
        } else {
          session.userCity = message.trim();
        }

        hospitals = await recommendHospitals(session.condition, session.userCity);
        session.recommendedHospitals = hospitals;

        if (hospitals.length > 0) {
          reply = `为您找到了${session.userCity}的以下优质医院：\n\n`;
          hospitals.forEach((h, i) => {
            reply += `${i + 1}. ${h.name}\n   ⭐ ${h.rating}分 · ${h.address}\n   🕐 ${h.hours}\n   📞 ${h.phone}\n   💡 ${h.description}\n\n`;
          });
          reply += '请问您想选择哪家医院？回复序号（1/2/3）即可。';
          newState = 'recommend_hospital';
        } else {
          reply = `抱歉，暂时没有找到${session.userCity}的匹配医院数据。您可以换个城市试试，或者就近选择正规口腔医院就诊。`;
          newState = 'triage';
        }
        break;
      }

      // ================================================================
      // 收集姓名 — 自动从档案获取，已有则跳到确认
      // ================================================================
      case 'collect_name': {
        const profileName = session.userProfile.nickname || session.userProfile.name || '';
        const profilePhone = session.userProfile.phone || '';

        if (profileName && profilePhone) {
          // 档案信息齐全，直接进确认
          session.appointment.name = profileName;
          session.appointment.phone = profilePhone;
          session.appointment.service_type = session.condition || '综合检查';
          reply = `好的，为您确认预约信息：\n\n🏥 ${session.appointment.hospital_name || '待定'}\n👤 ${session.appointment.name}\n📞 ${session.appointment.phone}\n🦷 ${session.appointment.service_type}\n\n请问您希望什么时间就诊？（例如：6月10日下午3点）`;
          newState = 'collect_time';
        } else if (profileName) {
          session.appointment.name = profileName;
          reply = `好的${profileName}，请留下您的手机号，方便医院联系您：`;
          newState = 'collect_phone';
        } else {
          session.appointment.name = message.trim();
          reply = `好的${message.trim()}，请留下您的手机号，方便医院联系您：`;
          newState = 'collect_phone';
        }
        break;
      }

      // ================================================================
      // 收集电话 — 自动从档案获取
      // ================================================================
      case 'collect_phone': {
        const pPhone = session.userProfile.phone || '';
        if (pPhone) {
          session.appointment.phone = pPhone;
        } else {
          const phoneMatch = message.match(/\b1\d{10}\b/);
          if (phoneMatch) {
            session.appointment.phone = phoneMatch[0];
          } else {
            reply = await generateClarifyingQuestion({ phone: true });
            break;
          }
        }
        reply = '收到！请问您希望什么时间就诊？（例如：6月10日下午3点）';
        newState = 'collect_time';
        break;
      }

      // ================================================================
      // 收集时间 → 写入数据库
      // ================================================================
      case 'collect_time': {
        const timeInput = message.trim();
        const timePattern = /\d{1,2}[月日号时分下午上午早晚]+|\d{1,2}[:：]\d{2}/;
        if (!timePattern.test(timeInput) && timeInput.length < 3) {
          reply = await generateClarifyingQuestion({ time: true });
          break;
        }
        session.appointment.appointment_time = timeInput;
        session.appointment.service_type = session.condition || '综合检查';

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
          reply = `✅ 预约登记成功！\n\n🏥 ${session.appointment.hospital_name || '待定'}\n👤 ${session.appointment.name}\n📞 ${session.appointment.phone}\n🦷 ${session.appointment.service_type}\n🕐 ${session.appointment.appointment_time}\n\n医院会尽快电话确认，请保持手机畅通。祝您早日康复！`;
          newState = 'triage';
        } catch (dbError: unknown) {
          const errMsg = dbError instanceof Error ? dbError.message : String(dbError);
          console.error('[DB] ❌ 写入失败:', errMsg);
          reply = '抱歉，系统出了点问题，预约没提交成功。请稍后再试。';
          newState = 'triage';
        }
        session.appointment = {};
        session.selectedHospital = null;
        session.recommendedHospitals = [];
        session.triageResult = null;
        break;
      }
    }

    session.state = newState;
    session.messages.push({ role: 'assistant', content: reply });

    // 持久化聊天记录（异步，不阻塞响应）
    getCurrentUser().then(user => {
      if (user) {
        query('INSERT INTO chat_history (user_id, session_id, role, content) VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)', [
          user.id, sessionId, 'user', message.slice(0, 2000),
          user.id, sessionId, 'assistant', reply.slice(0, 2000),
        ]).catch(e => console.error('[DB] chat history save error:', e.message));
      }
    }).catch(() => {});

    return NextResponse.json({
      reply,
      state: newState,
      hospitals: hospitals.length > 0 ? hospitals : undefined,
      triageResult: session.triageResult,
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[TRIAGE] Error:', errMsg);
    return NextResponse.json({ error: '服务器错误', detail: errMsg }, { status: 500 });
  }
}

// 获取聊天历史（按 session）
async function getChatHistory(userId: number, sessionId?: string, limit = 50) {
  if (sessionId) {
    const result = await query(
      'SELECT role, content, created_at FROM chat_history WHERE user_id = $1 AND session_id = $2 ORDER BY created_at ASC LIMIT $3',
      [userId, sessionId, limit]
    );
    return result.rows;
  }
  const result = await query(
    'SELECT role, content, created_at FROM chat_history WHERE user_id = $1 ORDER BY created_at ASC LIMIT $2',
    [userId, limit]
  );
  return result.rows;
}

// 获取会话列表
async function getChatSessions(userId: number) {
  const result = await query(
    `SELECT session_id, MIN(created_at) as created_at,
     (SELECT content FROM chat_history c2 WHERE c2.session_id = c1.session_id AND c2.role = 'user' ORDER BY c2.created_at ASC LIMIT 1) as first_msg
     FROM chat_history c1
     WHERE user_id = $1 AND session_id IS NOT NULL
     GROUP BY session_id
     ORDER BY MIN(created_at) DESC
     LIMIT 50`,
    [userId]
  );
  return result.rows;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'messages';
    
    if (mode === 'sessions') {
      const sessions = await getChatSessions(user.id);
      return NextResponse.json({ sessions });
    }
    
    const sessionId = url.searchParams.get('sessionId') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const messages = await getChatHistory(user.id, sessionId, Math.min(limit, 200));
    return NextResponse.json({ messages });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: '缺少 sessionId' }, { status: 400 });
    }
    await query('DELETE FROM chat_history WHERE user_id = $1 AND session_id = $2', [user.id, sessionId]);
    sessions.delete(sessionId);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
