import { NextRequest, NextResponse } from 'next/server';
import openai, { MODEL } from '@/lib/openai';
import { query } from '@/lib/db';

// 聊天状态
type ChatState = 'normal' | 'collect_name' | 'collect_phone' | 'collect_service' | 'collect_time' | 'completed';

// 聊天会话内存存储（MVP 阶段，生产环境应存数据库）
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

// 清理过期会话（5 分钟超时）
function cleanExpiredSessions() {
  const now = Date.now();
  for (const [key, session] of sessions) {
    if (now - session.lastActive > 5 * 60 * 1000) {
      sessions.delete(key);
    }
  }
}

// System Prompt
const SYSTEM_PROMPT = `你是牙科诊所的在线客服，像真人一样聊天。

性格：温和、专业、耐心，像朋友一样。

你的目标：在自然对话中引导用户预约面诊。

行为规则：
1. 用户问什么，先认真回答（1-2句话），让用户觉得你懂。
2. 回答后，自然地追问一句，了解用户具体情况。
3. 聊了2-3轮后，用轻松的语气建议面诊，不要生硬推销。
4. 如果用户主动问价格/怎么预约/什么时候有空，立即进入预约流程。

引导面诊的话术要自然，比如：
- "您这种情况，建议来店里让医生看看，比网上聊更准确"
- "方便的话可以约个时间，医生帮您检查一下"
- "要不我帮您看看哪天有空？"

禁止：
- 一上来就问要不要预约
- 每句话都提预约
- 长篇大论科普
- 诊断疾病或开药
- 说"您这个问题很严重"之类的恐吓话

回答要简短，像微信聊天一样。`;

// 手机号校验
function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json();

    if (!message || !sessionId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    cleanExpiredSessions();

    // 获取或创建会话
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        state: 'normal',
        messages: [],
        appointment: {},
        lastActive: Date.now(),
      });
    }
    const session = sessions.get(sessionId)!;
    session.lastActive = Date.now();

    // 添加用户消息
    session.messages.push({ role: 'user', content: message });

    let reply = '';
    let newState = session.state;

    // 状态机处理
    switch (session.state) {
      case 'normal': {
        // 检测用户是否表达预约意愿
        const bookingKeywords = ['预约', '约个时间', '挂号', '面诊', '到店', '什么时候有空', '怎么收费', '多少钱', '想约', '想要预约'];
        const userWantsBooking = bookingKeywords.some(k => message.includes(k));

        if (userWantsBooking) {
          // 用户表达了预约意愿，直接进入收集姓名状态
          reply = '好的，请问您怎么称呼？';
          newState = 'collect_name';
          break;
        }

        // 调用 AI
        const completion = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...session.messages.slice(-10),
          ],
          max_tokens: 300,
          temperature: 0.7,
        });
        reply = completion.choices[0]?.message?.content || '抱歉，我没能理解您的意思。';
        break;
      }

      case 'collect_name': {
        // 检查是否同时包含姓名和电话（如“张伟 13800138000”）
        const phoneMatch = message.match(/1[3-9]\d{9}/);
        if (phoneMatch) {
          const name = message.replace(phoneMatch[0], '').trim();
          session.appointment.name = name || '用户';
          session.appointment.phone = phoneMatch[0];
          reply = `好的，${session.appointment.name}，电话 ${phoneMatch[0]}。希望预约什么项目？\n1. 洗牙\n2. 牙齿矫正\n3. 种植牙\n4. 补牙\n5. 牙痛\n6. 其他`;
          newState = 'collect_service';
        } else {
          session.appointment.name = message.trim();
          reply = `好的，${message.trim()}。请输入您的联系电话：`;
          newState = 'collect_phone';
        }
        break;
      }

      case 'collect_phone': {
        if (!isValidPhone(message.trim())) {
          reply = '手机号格式不对哦，请输入11位手机号：';
        } else {
          session.appointment.phone = message.trim();
          reply = '收到。希望预约什么项目？\n1. 洗牙\n2. 牙齿矫正\n3. 种植牙\n4. 补牙\n5. 牙痛\n6. 其他';
          newState = 'collect_service';
        }
        break;
      }

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
        reply = `好的，预约${service}。希望哪天到店？（例如：6月10日下午3点）`;
        newState = 'collect_time';
        break;
      }

      case 'collect_time': {
        session.appointment.appointment_time = message.trim();

        // 写入数据库
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

          reply = `预约成功！\n\n📋 预约信息：\n👤 姓名：${session.appointment.name}\n📱 手机：${session.appointment.phone}\n🦷 项目：${session.appointment.service_type}\n🕐 时间：${session.appointment.appointment_time}\n\n我们会尽快确认，届时电话联系您。祝您牙齿健康！😊`;
          newState = 'completed';
        } catch (dbError) {
          console.error('Database error:', dbError);
          reply = '抱歉，预约提交失败，请稍后再试。';
          newState = 'normal';
        }

        // 重置预约信息
        session.appointment = {};
        break;
      }

      case 'completed': {
        // 检测是否想重新预约
        const bookingKeywords = ['预约', '约个时间', '挂号', '面诊', '再约', '重新预约'];
        const wantsNewBooking = bookingKeywords.some(k => message.includes(k));
        if (wantsNewBooking) {
          reply = '好的，请问您怎么称呼？';
          newState = 'collect_name';
          break;
        }
        // 继续咨询
        const completion = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: 'system', content: '用户已经完成预约。简单回答用户的问题，保持简洁友好。如果用户想再次预约，引导他们重新预约。' },
            ...session.messages.slice(-6),
          ],
          max_tokens: 200,
          temperature: 0.7,
        });
        reply = completion.choices[0]?.message?.content || '还有其他问题吗？';
        newState = 'completed';
        break;
      }
    }

    // 更新状态和消息
    session.state = newState;
    session.messages.push({ role: 'assistant', content: reply });

    return NextResponse.json({
      reply,
      state: newState,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
