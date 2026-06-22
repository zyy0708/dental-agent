const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  });
}

async function test() {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-900cfec1e680f3464b67eadbe3b339ed',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.baichuan-ai.com/v1',
  });
  const MODEL = process.env.OPENAI_MODEL || 'Baichuan3-Turbo-128k';

  const SYSTEM = `你是牙科助手。当需要分析用户意图时，输出：
<tool_call>{"name":"analyze_intent","args":{"message":"用户消息"}}</tool_call>

示例1 - 用户说"牙痛"：
分析症状后
<tool_call>{"name":"analyze_intent","args":{"message":"牙痛"}}</tool_call>

示例2 - 用户说"你好"：
你好！我是牙科助手，有什么可以帮助您的吗？

规则：如果不需要工具，直接回复用户。`;

  console.log('Calling model:', MODEL);
  console.log('Base URL:', process.env.OPENAI_BASE_URL);
  
  let result;
  try {
    result = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: '牙痛两天了，吃东西就疼' }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });
  } catch (e) {
    console.log('API ERROR:', e.message);
    console.log('Status:', e.status);
    console.log('Full error:', JSON.stringify(e));
    return;
  }

  const content = result.choices[0]?.message?.content || '(empty)';
  const finishReason = result.choices[0]?.finish_reason || '(unknown)';
  console.log('Finish reason:', finishReason);
  console.log('=== LLM RESPONSE ===');
  console.log(content);
  console.log('=== END ===');
  
  // Check for tool calls
  const hasToolCall = content.includes('<tool_call>');
  console.log('Has tool call:', hasToolCall);
  
  // Check if also has natural language before tool call
  const toolCallIndex = content.indexOf('<tool_call>');
  if (hasToolCall && toolCallIndex > 0) {
    const beforeToolCall = content.substring(0, toolCallIndex).trim();
    console.log('Text before tool call:', beforeToolCall.substring(0, 100));
  }
}

test().catch(e => console.error('ERROR:', e.message));
