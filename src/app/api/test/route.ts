import { NextRequest, NextResponse } from 'next/server';
import { MODEL } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY || 'MISSING';
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://token-plan-cn.xiaomimimo.com/v1';

    console.log('[TEST] model:', MODEL);
    console.log('[TEST] baseUrl:', baseUrl);
    console.log('[TEST] apiKey length:', apiKey.length);

    const resp = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 20,
        temperature: 0.3,
      }),
      cache: 'no-store',
    });

    const status = resp.status;
    const contentType = resp.headers.get('content-type') || '';
    const body = await resp.text();

    console.log('[TEST] response status:', status);
    console.log('[TEST] content-type:', contentType);
    console.log('[TEST] body length:', body.length);
    console.log('[TEST] body preview:', body.substring(0, 500));

    return NextResponse.json({
      status,
      contentType,
      bodyPreview: body.substring(0, 500),
      bodyLength: body.length,
      model,
      baseUrl,
      apiKeyPrefix: apiKey.substring(0, 8),
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : '';
    console.error('[TEST] Error:', errMsg);
    return NextResponse.json({ error: errMsg, stack: errStack }, { status: 500 });
  }
}
