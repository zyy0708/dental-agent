import { NextRequest, NextResponse } from 'next/server';
import openai, { MODEL } from '@/lib/openai';
import { query } from '@/lib/db';

// 聊天状态
type ChatState = 'chatting' | 'collect_name' | 'collect_phone' | 'collect_service' | 'collect_time';

// 聊天会话内存存储
const sessions = new Map<string, {
  state: ChatState;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  appointment: {
    name?: string;
    phone?: string;
    service_type?: string;
    appointment_time?: string;
  };
  lastActive: number;
}>();

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [key, session] of sessions) {
    if (now - session.lastActive > 30 * 60 * 1000) {
      sessions.delete(key);
    }
  }
}

// 聊天阶段的 system prompt
const CHAT_PROMPT = `你是牙科诊所的在线客服，像真人一样在微信上聊天。

性格：温和、专业、耐心，像朋友一样。

规则：
1. 用户问什么，简短回答（1-2句），然后自然追问。
2. 回答要口语化，像微信聊天，不要用书面语。
3. 理解上下文！用户说“没有”、“不知道”、“不清楚”时，要根据之前的对话理解意思，给出有用回应或换个角度追问。
4. 用户说“好的”、“嗯”、“行”时，继续引导对话。
5. 不确定的问题，建议来诊所检查。

【绝对禁止】：
- 你不能帮用户预约！没有预约功能！
- 用户想预约时，必须说：“请点击下方【预约登记】按钮，或输入‘预约’~”
- 绝对不说“预约成功”、“已登记”。
- 绝对不收集姓名、电话。`;

// 预约收集阶段的 prompt
const BOOKING_PROMPT = `你是牙科诊所的预约登记助手。用户正在预约流程中。
简短友好地引导用户填写信息。像微信聊天一样。`;

// 手机号校验(宽松:1开头的11位数字)
function isValidPhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone);
}

// 检测用户是否想预约
function wantsBooking(message: string): boolean {
  const keywords = ['预约', '挂号', '面诊', '约个时间', '到店', '想约', '怎么收费', '多少钱', '什么时候有空', '预约登记'];
  return keywords.some(k => message.includes(k));
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
        state: 'chatting',
        messages: [],
        appointment: {},
        lastActive: Date.now(),
      });
    }
    const session = sessions.get(sessionId)!;
    session.lastActive = Date.now();
    session.messages.push({ role: 'user', content: message });

    let reply = '';
    let newState = session.state;

    console.log(`[CHAT] sid=${sessionId.slice(0,8)} state=${session.state} msg="${message}"`);

    switch (session.state) {

      // ========== 聊天阶段 ==========
      case 'chatting': {
        if (wantsBooking(message)) {
          reply = '好的,请问您怎么称呼?';
          newState = 'collect_name';
          break;
        }

        // 检测直接给手机号的情况(如"李文文 13800138000")
        const phoneMatch = message.match(/\b1\d{10}\b/);
        if (phoneMatch && message.replace(phoneMatch[0], '').trim().length > 0) {
          // 有名字有电话,直接进入预约流程
          session.appointment.name = message.replace(phoneMatch[0], '').trim();
          session.appointment.phone = phoneMatch[0];
          reply = `好的 ${session.appointment.name},电话 ${phoneMatch[0]}。请问要预约什么项目?\n1. 洗牙\n2. 牙齿矫正\n3. 种植牙\n4. 补牙\n5. 牙痛\n6. 其他`;
          newState = 'collect_service';
          break;
        }

        // 正常聊天 - AI 回答牙齿问题
        const completion = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: 'system', content: CHAT_PROMPT },
            ...session.messages.slice(-10),
          ],
          max_tokens: 500,
          temperature: 0.7,
        });
        reply = completion.choices[0]?.message?.content || '';
        // 如果 AI 返回空,给一个通用回复
        if (!reply.trim()) {
          reply = '不好意思,您能再说详细一点吗?';
        }
        break;
      }

      // ========== 收集姓名 ==========
      case 'collect_name': {
        // 同时给了姓名和电话
        const phoneInName = message.match(/\b1\d{10}\b/);
        if (phoneInName) {
          session.appointment.name = message.replace(phoneInName[0], '').trim() || '用户';
          session.appointment.phone = phoneInName[0];
          reply = `好的 ${session.appointment.name},电话 ${phoneInName[0]}。请问要预约什么项目?\n1. 洗牙\n2. 牙齿矫正\n3. 种植牙\n4. 补牙\n5. 牙痛\n6. 其他`;
          newState = 'collect_service';
        } else {
          session.appointment.name = message.trim();
          reply = `好的 ${message.trim()},请留下您的手机号:`;
          newState = 'collect_phone';
        }
        break;
      }

      // ========== 收集电话 ==========
      case 'collect_phone': {
        const phoneMatch = message.match(/\b1\d{10}\b/);
        if (phoneMatch) {
          session.appointment.phone = phoneMatch[0];
          reply = '收到!请问要预约什么项目?\n1. 洗牙\n2. 牙齿矫正\n3. 种植牙\n4. 补牙\n5. 牙痛\n6. 其他';
          newState = 'collect_service';
        } else {
          reply = '手机号格式不对哦,请输入11位手机号(1开头):';
        }
        break;
      }

      // ========== 收集项目 ==========
      case 'collect_service': {
        const serviceMap: Record<string, string> = {
          '1': '洗牙', '洗牙': '洗牙',
          '2': '牙齿矫正', '矫正': '牙齿矫正', '牙齿矫正': '牙齿矫正',
          '3': '种植牙', '种植': '种植牙', '种植牙': '种植牙',
          '4': '补牙', '补牙': '补牙',
          '5': '牙痛', '牙痛': '牙痛',
          '6': '其他', '其他': '其他',
        };
        const service = serviceMap[message.trim()] || message.trim();
        session.appointment.service_type = service;
        reply = `好的,预约${service}。希望什么时间到店?(例如:6月10日下午3点)`;
        newState = 'collect_time';
        break;
      }

      // ========== 收集时间 + 写入数据库 ==========
      case 'collect_time': {
        session.appointment.appointment_time = message.trim();
        console.log(`[DB] INSERT:`, JSON.stringify(session.appointment));

        try {
          await query(
            'INSERT INTO appointments (name, phone, service_type, appointment_time, status) VALUES ($1, $2, $3, $4, $5)',
            [
              session.appointment.name,
              session.appointment.phone,
              session.appointment.service_type,
              session.appointment.appointment_time,
              'pending',
            ]
          );
          console.log(`[DB] ✅ 写入成功`);
          reply = `✅ 预约登记成功!\n\n👤 ${session.appointment.name}\n📱 ${session.appointment.phone}\n🦷 ${session.appointment.service_type}\n🕐 ${session.appointment.appointment_time}\n\n我们会尽快电话确认,请保持手机畅通!`;
          newState = 'chatting';
        } catch (dbError: any) {
          console.error('[DB] ❌ 写入失败:', dbError.message);
          reply = '抱歉,系统出了点问题,预约没提交成功。请稍后再试或直接拨打诊所电话预约。';
          newState = 'chatting';
        }
        session.appointment = {};
        break;
      }
    }

    session.state = newState;
    session.messages.push({ role: 'assistant', content: reply });

    return NextResponse.json({ reply, state: newState });

  } catch (error: any) {
    console.error('[CHAT] Error:', error.message);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
