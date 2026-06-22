import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/services/auth/auth-service';
import { addRating, getUserRatings, getOverallStats, FEEDBACK_TAGS } from '@/services/rating/rating-service';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'my';

    if (mode === 'stats') {
      // Get overall rating statistics
      const stats = await getOverallStats();
      return NextResponse.json({ stats, tags: FEEDBACK_TAGS });
    }

    // Get user's ratings
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const ratings = await getUserRatings(user.id, limit);
    return NextResponse.json({ ratings });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, messageId, rating, feedback, tags } = body;

    if (!sessionId || !rating) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: '评分范围为 1-5' }, { status: 400 });
    }

    const result = await addRating(
      user.id,
      sessionId,
      messageId || null,
      rating,
      feedback,
      tags
    );

    return NextResponse.json({ rating: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
