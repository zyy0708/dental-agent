import { NextRequest, NextResponse } from 'next/server';
import openai, { MODEL } from '@/lib/openai';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/services/auth/auth-service';
import { compressContext, generateUserMemory, getUserMemory } from '@/services/ai/sub-agent';
import {
  parseToolCalls,
  stripToolCalls,
  executeToolCall,
  extractIntentFromSteps,
  extractIntentFromData,
  TOOL_DESCRIPTIONS,
  ToolCall,
  AgentStep,
} from '@/services/ai/agent-tools';
import { trackBookingProgress, createAppointmentReminders, createCheckupReminder } from '@/services/ai/proactive-agent';
import { startScheduler } from '@/services/scheduler/scheduler';
import { orchestrate, AgentMessage } from '@/services/ai/multi-agent';

// Start the scheduler when the module loads
const globalWithScheduler = globalThis as typeof globalThis & { __schedulerStarted?: boolean };
if (!globalWithScheduler.__schedulerStarted) {
  globalWithScheduler.__schedulerStarted = true;
  startScheduler();
}

interface SessionData {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  lastActive: number;
}

const sessions = new Map<string, SessionData>();

const MAX_AGENT_ROUNDS = 5;

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [key, session] of sessions) {
    if (now - session.lastActive > 60 * 60 * 1000) {
      sessions.delete(key);
    }
  }
}

const SYSTEM_PROMPT_BASE = `你是"智齿管家"Dental Agent，一个口腔健康 AI 智能代理。

## 核心职责
1. 分析用户口腔症状，给出具体分析和建议，推荐就诊科室
2. 查询并推荐合适的医院
3. 收集预约信息，创建预约
4. 回答口腔健康咨询
5. 识别急症情况并提示

## 症状分析要求
- 用户描述症状后，必须具体分析其描述的（部位、时间、诱因、性质），给出针对性的建议
- 示例：用户说"牙痛三天，左边后面大牙，吃东西疼" → 分析可能的牙髓炎/深龋，建议口腔内科，给出临时缓解建议
- 不要给出泛泛回复"根据您的描述，您可能正在经历一些口腔问题"——必须具体
- 注意：症状分析由你直接在回复中完成，不需要调用 analyze_intent 工具来"分析症状"

## 工具使用准则
- analyze_intent 工具：只在你收到用户第一条消息时调用一次，用于分类意图。调用之后直接根据结果回复用户，不要再重复调用
- query_hospitals 工具：不知道用户城市时先问清楚再查；推荐时只列工具返回的数据，不编造
- create_appointment 工具：姓名、手机号、就诊时间、医院四项齐全后才能调用；缺任何一项就先继续收集

## 预约信息收集顺序（重要）
当用户想要预约时，按以下顺序收集信息，每一步只问1-2个问题：
1. 如果不知道用户所在城市 → 先问城市
2. 用户选择医院后 → 询问姓名和手机号（分步问，先问姓名）
3. 获取姓名后 → 询问手机号
4. 获取手机号后 → 询问希望的就诊时间
5. 所有信息收集齐全后 → 调用 create_appointment 工具

注意：
- 就诊项目（service_type）从用户描述的症状推断，不需要额外询问（如"牙痛"→"口腔检查/治疗"，"洗牙"→"洗牙"）
- 在未获得完整信息（姓名、手机号、就诊时间）之前，永远不要调用 create_appointment

## 行为守则
- 禁止编造医院、医生、评分、地址、电话、营业时间
- 医院推荐只能来自 query_hospitals 工具的返回结果
- 提示：医院数据库中专科技能为中文治疗名称（如"种植牙""根管治疗""牙齿矫正""洗牙""补牙""拔牙""儿童牙科"等），query_hospitals 的 specialty 参数请使用这些关键词
- 禁止诊断疾病、开药、推荐剂量、提供治疗方案
- 不要索取与预约无关的敏感信息，如身份证、银行卡
- 用户拒绝预约时，停止推进预约流程
- 如果用户描述急症（大出血、呼吸困难、持续剧烈疼痛、昏迷等），立即建议去急诊科
- 非口腔问题（如心慌、腹痛等），建议去综合医院相关科室

${TOOL_DESCRIPTIONS}`;

function getSystemPrompt(userMemory: string | null): string {
  if (userMemory) {
    return `${SYSTEM_PROMPT_BASE}\n\n## 用户历史信息（根据之前对话记录）\n${userMemory}\n\n请参考以上历史信息，但不要主动提及除非用户询问。`;
  }
  return SYSTEM_PROMPT_BASE;
}

export async function POST(request: NextRequest) {
  try {
    let message: string, sessionId: string, mode: string;
    try {
      const body = await request.json();
      message = body.message;
      sessionId = body.sessionId;
      mode = body.mode || 'single'; // 'single' or 'multi'
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

    const user = await getCurrentUser();
    const userId = user?.id;

    if (!sessions.has(sessionId)) {
      // Load session history from DB if not in memory
      if (user) {
        const result = await query(
          'SELECT role, content FROM chat_history WHERE user_id = $1 AND session_id = $2 ORDER BY created_at ASC LIMIT 50',
          [user.id, sessionId]
        );
        const loadedMessages = result.rows.map((row: any) => ({
          role: row.role as 'user' | 'assistant',
          content: row.content,
        }));
        sessions.set(sessionId, {
          messages: loadedMessages,
          lastActive: Date.now(),
        });
      } else {
        sessions.set(sessionId, {
          messages: [],
          lastActive: Date.now(),
        });
      }
    }
    const session = sessions.get(sessionId)!;
    session.lastActive = Date.now();
    session.messages.push({ role: 'user', content: message });

    // ====== Multi-Agent Mode ======
    if (mode === 'multi') {
      console.log('[CHAT] Using multi-agent mode');
      
      // Convert session messages to AgentMessage format
      const conversationHistory: AgentMessage[] = session.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // Execute multi-agent orchestration
      const result = await orchestrate(message, conversationHistory, userId);
      
      // Add reply to session
      session.messages.push({ role: 'assistant', content: result.reply });

      // Track booking progress if needed
      if (userId && result.steps.some(s => s.tool === 'create_appointment')) {
        trackBookingProgress(userId, sessionId, 'completed', {}).catch(console.error);
      }

      // Persist chat history
      if (user) {
        const metadata = result.steps.length > 0
          ? JSON.stringify({ 
              agent: result.agent, 
              agent_steps: result.steps,
              routing: result.data?.routing,
            })
          : null;

        query(
          'INSERT INTO chat_history (user_id, session_id, role, content, agent_metadata) VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10)',
          [
            user.id, sessionId, 'user', message.slice(0, 2000), null,
            user.id, sessionId, 'assistant', result.reply.slice(0, 2000), metadata,
          ]
        ).catch(e => console.error('[DB] chat history save error:', e.message));

        // Generate user memory periodically
        const sessionMsgCount = session.messages.filter(m => m.role === 'user').length;
        if (sessionMsgCount % 5 === 0 && sessionMsgCount > 0) {
          generateUserMemory(user.id, session.messages).catch(e => 
            console.error('[MEMORY] Generation error:', e.message)
          );
        }
      }

      return NextResponse.json({
        reply: result.reply,
        agent: result.agent,
        agent_steps: result.steps.length > 0 ? result.steps : undefined,
        routing: result.data?.routing,
      });
    }

    // ====== Single-Agent Mode (original logic) ======
    console.log('[CHAT] Using single-agent mode');
    const agentSteps: AgentStep[] = [];
    let finalReply = '';
    let lastHospitalData: any[] = [];
    let detectedIntent = '';
    let lastToolNames: string[] = [];

    // Get user memory for cross-session context
    const userMemory = userId ? await getUserMemory(userId) : null;
    const systemPrompt = getSystemPrompt(userMemory);

    // ====== Agent Loop (supports native tool_calls + ReAct <tool_call> tags) ======
    for (let round = 0; round < MAX_AGENT_ROUNDS; round++) {
      const compressed = await compressContext(session.messages, 20);

      let llmReply = '';
      let nativeToolCalls: any[] = [];
      try {
        const completion = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            ...compressed,
          ],
          max_tokens: 600,
          temperature: 0.3,
        });
        const messageObj = completion.choices[0]?.message;
        llmReply = messageObj?.content || '';
        nativeToolCalls = messageObj?.tool_calls || [];
      } catch (apiError: unknown) {
        const errMsg = apiError instanceof Error ? apiError.message : String(apiError);
        console.error('[AGENT] LLM call failed:', errMsg);
        finalReply = '系统暂时无法处理，请稍后再试。';
        break;
      }

      let toolCalls: ToolCall[] = [];

      if (nativeToolCalls.length > 0) {
        // Native tool_calls from model's built-in function calling
        for (const tc of nativeToolCalls) {
          if (tc.type === 'function' && tc.function?.name) {
            try {
              const args = JSON.parse(tc.function.arguments);
              toolCalls.push({ name: tc.function.name, args });
            } catch {
              // skip malformed arguments
            }
          }
        }
      } else {
        // Fallback: ReAct-style <tool_call> tags in content
        toolCalls = parseToolCalls(llmReply);
      }

      if (toolCalls.length === 0) {
        finalReply = llmReply || '请稍等，正在为您处理...';
        session.messages.push({ role: 'assistant', content: finalReply });
        break;
      }

      const cleanText = nativeToolCalls.length > 0 ? llmReply : stripToolCalls(llmReply);
      if (cleanText) {
        session.messages.push({ role: 'assistant', content: cleanText });
      }

      // Deduplication: if same tool called again with same name, break loop
      const currentToolNames = toolCalls.map(tc => tc.name);
      if (lastToolNames.length > 0 && currentToolNames.length === lastToolNames.length &&
          currentToolNames.every((name, i) => name === lastToolNames[i])) {
        finalReply = cleanText || '已为您处理，请问还有其他需要帮助的吗？';
        session.messages.push({ role: 'assistant', content: finalReply });
        break;
      }
      lastToolNames = currentToolNames;

      // Execute all tool calls in this round
      for (const tc of toolCalls) {
        const startTime = Date.now();
        const result = await executeToolCall(tc, userId);
        const duration = Date.now() - startTime;

        agentSteps.push({
          tool: tc.name,
          input: tc.args,
          result_summary: result.summary,
          duration_ms: duration,
        });

        if (tc.name === 'query_hospitals' && result.data) {
          lastHospitalData = result.data;
          // Track booking progress: hospital selected
          if (userId) {
            trackBookingProgress(userId, sessionId, 'hospital_selected', {
              city: tc.args.city,
              hospitals: result.data.map((h: any) => h.name),
            }).catch(console.error);
          }
        }
        if (tc.name === 'analyze_intent' && result.data) {
          const tag = extractIntentFromData(result.data);
          if (tag) detectedIntent = tag;
        }
        if (tc.name === 'create_appointment' && result.data) {
          // Track booking progress: completed
          if (userId) {
            trackBookingProgress(userId, sessionId, 'completed', {
              appointment_id: result.data.id,
            }).catch(console.error);
          }
        }

        // Track booking progress based on user message content
        if (userId && message) {
          const lowerMsg = message.toLowerCase();
          if (lowerMsg.includes('预约') || lowerMsg.includes('挂号') || lowerMsg.includes('看牙')) {
            trackBookingProgress(userId, sessionId, 'booking_started', { message }).catch(console.error);
          }
        }

        session.messages.push({
          role: 'user',
          content: `[工具结果: ${tc.name}]\n${result.rawContent}`,
        });
      }
    }

    // If loop ended without a final reply (hit max rounds)
    if (!finalReply) {
      const toolSummary = agentSteps.filter(s => s.tool !== 'analyze_intent').map(s => s.result_summary).join('；');
      finalReply = toolSummary
        ? `${toolSummary}。请问您还有其他需要吗？`
        : '已为您记录，请问还有其他需要帮助的吗？';
      session.messages.push({ role: 'assistant', content: finalReply });
    }

    const intent_label = detectedIntent || extractIntentFromSteps(agentSteps);

    // Persist chat history asynchronously
    if (user) {
      const metadata = agentSteps.length > 0 || intent_label
        ? JSON.stringify({ intent_label, agent_steps: agentSteps })
        : null;

      query(
        'INSERT INTO chat_history (user_id, session_id, role, content, agent_metadata) VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10)',
        [
          user.id, sessionId, 'user', message.slice(0, 2000), null,
          user.id, sessionId, 'assistant', finalReply.slice(0, 2000), metadata,
        ]
      ).catch(e => console.error('[DB] chat history save error:', e.message));

      // Generate user memory periodically (every 5 messages in session)
      const sessionMsgCount = session.messages.filter(m => m.role === 'user').length;
      if (sessionMsgCount % 5 === 0 && sessionMsgCount > 0) {
        generateUserMemory(user.id, session.messages).catch(e => 
          console.error('[MEMORY] Generation error:', e.message)
        );
      }

      // Create appointment reminders if appointment was created
      const appointmentStep = agentSteps.find(s => s.tool === 'create_appointment');
      if (appointmentStep && appointmentStep.result_summary.includes('成功')) {
        // Extract appointment details from the step input
        const aptData = appointmentStep.input;
        if (aptData && user) {
          createAppointmentReminders(
            user.id,
            'current',
            aptData.appointment_time || '明天上午',
            aptData.name || '患者',
            aptData.hospital_name || '医院'
          ).catch(e => console.error('[REMINDER] Failed to create appointment reminders:', e.message));
        }
      }

      // Create checkup reminder if appointment was completed
      if (appointmentStep && appointmentStep.result_summary.includes('成功')) {
        const aptData = appointmentStep.input;
        if (aptData && user) {
          createCheckupReminder(
            user.id,
            aptData.service_type || '口腔检查',
            new Date()
          ).catch(e => console.error('[REMINDER] Failed to create checkup reminder:', e.message));
        }
      }
    }

    return NextResponse.json({
      reply: finalReply,
      intent_label: intent_label || undefined,
      agent_steps: agentSteps.length > 0 ? agentSteps : undefined,
      hospitals: lastHospitalData.length > 0 ? lastHospitalData : undefined,
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[AGENT] Error:', errMsg);
    return NextResponse.json({ error: '服务器错误', detail: errMsg }, { status: 500 });
  }
}

async function getChatHistory(userId: number, sessionId?: string, limit = 50) {
  if (sessionId) {
    const result = await query(
      'SELECT role, content, created_at, agent_metadata FROM chat_history WHERE user_id = $1 AND session_id = $2 ORDER BY created_at ASC LIMIT $3',
      [userId, sessionId, limit]
    );
    return result.rows;
  }
  const result = await query(
    'SELECT role, content, created_at, agent_metadata FROM chat_history WHERE user_id = $1 ORDER BY created_at ASC LIMIT $2',
    [userId, limit]
  );
  return result.rows;
}

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
      const sessionList = await getChatSessions(user.id);
      return NextResponse.json({ sessions: sessionList });
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
