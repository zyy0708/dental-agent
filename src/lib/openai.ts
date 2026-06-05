import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: process.env.OPENAI_BASE_URL || 'https://token-plan-cn.xiaomimimo.com/v1',
});

export const MODEL = process.env.OPENAI_MODEL || 'mimo-v2.5-pro';

export default client;
