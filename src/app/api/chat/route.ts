import { NextRequest, NextResponse } from 'next/server';
import openai, { MODEL } from '@/lib/openai';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { compressContext, detectUserIntent, generateClarifyingQuestion } from '@/lib/sub-agent';

// 导诊状态
type ChatState = 'triage' | 'collect_city' | 'recommend_hospital' | 'collect_name' | 'collect_phone' | 'collect_time';

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
const TRIAGE_PROMPT = `你是 Dental Agent 的“口腔健康导诊与预约助手”。你不是医生，不能诊断疾病、不能开药、不能提供治疗方案，也不能承诺疗效。

你的任务只有三件事：
1. 帮用户判断应该看哪个科室。
2. 在安全的前提下推进预约。
3. 发现紧急风险时立即停止预约并提醒急诊。

硬性规则：
- 不要编造医院、医生、评分、地址、电话、营业时间。
- 医院推荐只能来自系统数据库返回的数据。
- 不要推荐具体医院或医生名字，医院推荐由系统自动完成。
- 不要索取与预约无关的敏感信息，如身份证、银行卡、精确住址。
- 用户拒绝预约时，立刻停止推进预约流程。
- 用户只是在咨询知识时，不要强行索要手机号。
- 用户出现高风险症状时，不继续收集预约信息。

紧急症状：
- 胸痛
- 呼吸困难
- 大出血
- 昏迷
- 抽搐
- 严重过敏
- 持续高热
- 严重外伤

如果命中紧急症状，必须直接提醒用户去急诊或拨打当地急救电话，不能继续牙科预约。

普通口腔问题可以导向以下范围：
- 牙痛、牙龈出血、牙齿松动、龋齿、洗牙、补牙、拔牙、种植、正畸、牙周问题、口腔溃疡、贴面、美白。

非口腔问题只给出科室方向，不要强行推进牙科预约。

回复要求：
- 导诊阶段必须输出严格 JSON，不要夹带任何额外文字。
- 语气自然、简洁、克制。
- 默认使用当前界面语言；若无法判断，使用中文。

JSON 结构：
{"department":"科室名","confidence":0.85,"reason":"简短理由","emergency":false}

紧急情况：
{"department":"急诊科","confidence":0.99,"reason":"简短说明紧急原因","emergency":true}

信息不足时：
{"department":"全科医学科","confidence":0.5,"reason":"症状信息不够，建议补充描述或就近咨询全科医生","emergency":false}`;

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

    console.log(`[TRIAGE] sid=${sessionId.slice(0, 8)} state=${session.state} msg="${message}"`);

    switch (session.state) {

      // ================================================================
      // 导诊阶段 — AI 分析症状 → JSON 输出科室推荐
      // ================================================================
      case 'triage': {
        // 检测是否有预约/看诊意向
        const bookingKeywords = [
          '预约', '挂号', '看诊', '面诊', '去医院', '想去看',
          '推荐医院', '哪家医院', '哪个医院', '去哪看', '怎么预约',
          '有医院', '找医院', '附近',
        ];
        const wantsBooking = bookingKeywords.some((k) => message.includes(k));

        // 如果已有导诊结果且是口腔科，用户确认 → 直接进预约流程
        if (session.triageResult && session.triageResult.department === '口腔科' && !session.triageResult.emergency) {
          const denied = ['不', '没', '别', '不用', '不要', '不需要', '不了', '算了', '再说'];
          const isDenied = denied.some((k) => message.includes(k));
          if (isDenied) break;

          const positiveKeywords = ['好', '嗯', '要', '可以', '行', '是的', '对', 'ok', '好的', '推荐', '看看', '去吧'];
          const isPositive = positiveKeywords.some((k) => message.includes(k)) || wantsBooking;
          if (isPositive) {
            reply = '请问您在哪个城市？我为您推荐附近的口腔医院。';
            newState = 'collect_city';
            break;
          }
        }

        // 调用 AI 导诊（OpenAI SDK）
        let rawContent = '';
        try {
          // 使用子代理压缩上下文（当消息过多时）
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

        // 从响应中提取 JSON（AI 可能在 JSON 前后添加文字）
        const firstBrace = rawContent.indexOf('{');
        const lastBrace = rawContent.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          rawContent = rawContent.slice(firstBrace, lastBrace + 1);
        }

        let triage: TriageResult;
        try {
          triage = JSON.parse(rawContent);
        } catch {
          reply = '您能再详细描述一下症状吗？比如哪里不舒服、持续多久了？';
          break;
        }

        // 验证返回结构
        if (!triage.department || typeof triage.emergency !== 'boolean') {
          reply = '您能再详细描述一下症状吗？比如哪里不舒服、持续多久了？';
          break;
        }

        session.triageResult = triage;

        // 🚨 紧急情况
        if (triage.emergency) {
          reply = `⚠️ ${triage.reason}`;
          break;
        }

        // 非紧急情况 — 根据科室路由
        if (triage.department === '口腔科') {
          session.condition = session.messages
            .filter((m) => m.role === 'user')
            .map((m) => m.content)
            .join(' ');

          if (wantsBooking) {
            reply = `${triage.reason}\n\n请问您在哪个城市？我为您推荐附近的口腔医院。`;
            newState = 'collect_city';
          } else {
            const intent = await detectUserIntent(message, session.condition);
            if (intent.intent === 'booking_intent' && intent.confidence > 0.6) {
              reply = `${triage.reason}\n\n请问您在哪个城市？我为您推荐附近的口腔医院。`;
              newState = 'collect_city';
            } else {
              reply = `${triage.reason}\n\n需要我为您推荐附近的口腔医院进行预约吗？`;
            }
          }
        } else if (triage.department === '全科医学科' && triage.confidence < 0.6) {
          const intent = await detectUserIntent(message, session.messages.map(m => m.content).join(' '));
          if (intent.intent === 'symptom_report' && intent.confidence > 0.6) {
            reply = triage.reason;
          } else {
            reply = `${triage.reason}\n\n由于本系统专注于口腔诊疗服务，建议您前往附近综合医院的相关科室就诊。如需口腔相关帮助，请随时告诉我。`;
          }
        } else {
          reply = `${triage.reason}\n\n由于本系统专注于口腔诊疗服务，建议您前往附近综合医院的相关科室就诊。如需口腔相关帮助，请随时告诉我。`;
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
            reply = `好的，您选择了${session.selectedHospital.name}。\n请问您怎么称呼？`;
            newState = 'collect_name';
          } else {
            reply = '请输入有效的序号（1/2/3）。';
          }
        } else {
          reply = '请回复医院序号（1/2/3）来选择，或者告诉我您的偏好，我重新推荐。';
        }
        break;
      }

      // ================================================================
      // 收集城市
      // ================================================================
      case 'collect_city': {
        session.userCity = message.trim();
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
      // 收集姓名
      // ================================================================
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

      // ================================================================
      // 收集电话
      // ================================================================
      case 'collect_phone': {
        const phoneMatch = message.match(/\b1\d{10}\b/);
        if (phoneMatch) {
          session.appointment.phone = phoneMatch[0];
          reply = '收到！请问您希望什么时间就诊？（例如：6月10日下午3点）';
          newState = 'collect_time';
        } else {
          reply = await generateClarifyingQuestion({ phone: true });
        }
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
