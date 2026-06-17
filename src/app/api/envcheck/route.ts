import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    model: process.env.OPENAI_MODEL,
    baseUrl: process.env.OPENAI_BASE_URL,
    keyPrefix: (process.env.OPENAI_API_KEY || '').substring(0, 8),
    keyLength: (process.env.OPENAI_API_KEY || '').length,
  });
}
