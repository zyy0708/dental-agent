import { query } from '@/lib/db';
import openai, { MODEL } from '@/lib/openai';

export interface Rating {
  id: number;
  user_id: number;
  session_id: string;
  message_id: number | null;
  rating: number;
  feedback: string | null;
  tags: string[];
  created_at: Date;
}

export interface RatingAnalytics {
  date: Date;
  total_ratings: number;
  avg_rating: number;
  positive_count: number;
  negative_count: number;
}

export interface PromptOptimization {
  id: number;
  old_prompt_hash: string | null;
  new_prompt: string;
  reason: string | null;
  improvement_score: number | null;
  applied_at: Date | null;
  created_at: Date;
}

export async function addRating(
  userId: number,
  sessionId: string,
  messageId: number | null,
  rating: number,
  feedback?: string,
  tags?: string[]
): Promise<Rating> {
  try {
    const result = await query(
      `INSERT INTO message_ratings (user_id, session_id, message_id, rating, feedback, tags)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, sessionId, messageId, rating, feedback || null, tags || []]
    );
    console.log(`[RATING] Added rating: ${rating}/5 for session ${sessionId}`);
    return result.rows[0];
  } catch (error) {
    console.error('[RATING] Failed to add rating:', error);
    throw error;
  }
}

export async function getUserRatings(userId: number, limit = 50): Promise<Rating[]> {
  try {
    const result = await query(
      `SELECT * FROM message_ratings
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  } catch (error) {
    console.error('[RATING] Failed to get user ratings:', error);
    return [];
  }
}

export async function getSessionRatings(sessionId: string): Promise<Rating[]> {
  try {
    const result = await query(
      `SELECT * FROM message_ratings
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );
    return result.rows;
  } catch (error) {
    console.error('[RATING] Failed to get session ratings:', error);
    return [];
  }
}

export async function getRatingAnalytics(days = 30): Promise<RatingAnalytics[]> {
  try {
    const result = await query(
      `SELECT * FROM rating_analytics
       WHERE date >= NOW() - INTERVAL '${days} days'
       ORDER BY date DESC`
    );
    return result.rows;
  } catch (error) {
    console.error('[RATING] Failed to get analytics:', error);
    return [];
  }
}

export async function getOverallStats(): Promise<{
  total_ratings: number;
  avg_rating: number;
  positive_rate: number;
  negative_rate: number;
  top_positive_tags: string[];
  top_negative_tags: string[];
}> {
  try {
    const result = await query(
      `SELECT
        COUNT(*) as total_ratings,
        AVG(rating) as avg_rating,
        COUNT(*) FILTER (WHERE rating >= 4)::float / NULLIF(COUNT(*), 0) as positive_rate,
        COUNT(*) FILTER (WHERE rating <= 2)::float / NULLIF(COUNT(*), 0) as negative_rate
       FROM message_ratings`
    );

    const stats = result.rows[0];

    const positiveTags = await query(
      `SELECT unnest(tags) as tag, COUNT(*) as count
       FROM message_ratings
       WHERE rating >= 4
       GROUP BY tag
       ORDER BY count DESC
       LIMIT 5`
    );

    const negativeTags = await query(
      `SELECT unnest(tags) as tag, COUNT(*) as count
       FROM message_ratings
       WHERE rating <= 2
       GROUP BY tag
       ORDER BY count DESC
       LIMIT 5`
    );

    return {
      total_ratings: parseInt(stats.total_ratings) || 0,
      avg_rating: parseFloat(stats.avg_rating) || 0,
      positive_rate: parseFloat(stats.positive_rate) || 0,
      negative_rate: parseFloat(stats.negative_rate) || 0,
      top_positive_tags: positiveTags.rows.map(r => r.tag),
      top_negative_tags: negativeTags.rows.map(r => r.tag),
    };
  } catch (error) {
    console.error('[RATING] Failed to get overall stats:', error);
    return {
      total_ratings: 0,
      avg_rating: 0,
      positive_rate: 0,
      negative_rate: 0,
      top_positive_tags: [],
      top_negative_tags: [],
    };
  }
}

export async function analyzeAndOptimizePrompt(
  currentPrompt: string,
  recentRatings: Rating[]
): Promise<PromptOptimization | null> {
  try {
    if (recentRatings.length < 10) {
      console.log('[OPTIMIZE] Not enough ratings for optimization (need 10+, got', recentRatings.length, ')');
      return null;
    }

    const avgRating = recentRatings.reduce((sum, r) => sum + r.rating, 0) / recentRatings.length;
    
    if (avgRating >= 4.5) {
      console.log('[OPTIMIZE] Ratings already high (', avgRating.toFixed(1), '), skipping optimization');
      return null;
    }

    const negativeRatings = recentRatings.filter(r => r.rating <= 2);
    const feedbackSummary = negativeRatings.map(r => ({
      rating: r.rating,
      feedback: r.feedback,
      tags: r.tags,
    }));

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `你是Prompt优化专家。分析用户反馈，改进AI助手的system prompt。

当前prompt的平均评分为 ${avgRating.toFixed(1)}/5，需要改进。

用户差评反馈：
${JSON.stringify(feedbackSummary, null, 2)}

任务：
1. 分析差评的主要原因
2. 找出prompt中的问题
3. 生成改进后的prompt

要求：
- 保持prompt的核心功能不变
- 针对差评问题进行具体改进
- 输出格式：{"reason":"改进原因","new_prompt":"改进后的完整prompt"}

只输出JSON。`,
        },
        {
          role: 'user',
          content: `当前prompt:\n${currentPrompt}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content || '';
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const result = JSON.parse(raw.slice(firstBrace, lastBrace + 1));
      
      const optimization = await query(
        `INSERT INTO prompt_optimizations (old_prompt_hash, new_prompt, reason, improvement_score)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          hashPrompt(currentPrompt),
          result.new_prompt,
          result.reason,
          avgRating,
        ]
      );

      console.log('[OPTIMIZE] New prompt optimization created:', optimization.rows[0].id);
      return optimization.rows[0];
    }

    return null;
  } catch (error) {
    console.error('[OPTIMIZE] Failed to analyze and optimize:', error);
    return null;
  }
}

export async function applyOptimization(optimizationId: number): Promise<boolean> {
  try {
    await query(
      `UPDATE prompt_optimizations SET applied_at = NOW() WHERE id = $1`,
      [optimizationId]
    );
    console.log('[OPTIMIZE] Applied optimization:', optimizationId);
    return true;
  } catch (error) {
    console.error('[OPTIMIZE] Failed to apply optimization:', error);
    return false;
  }
}

export async function getLatestOptimization(): Promise<PromptOptimization | null> {
  try {
    const result = await query(
      `SELECT * FROM prompt_optimizations
       WHERE applied_at IS NOT NULL
       ORDER BY applied_at DESC
       LIMIT 1`
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('[OPTIMIZE] Failed to get latest optimization:', error);
    return null;
  }
}

export async function getPendingOptimizations(): Promise<PromptOptimization[]> {
  try {
    const result = await query(
      `SELECT * FROM prompt_optimizations
       WHERE applied_at IS NULL
       ORDER BY created_at DESC
       LIMIT 5`
    );
    return result.rows;
  } catch (error) {
    console.error('[OPTIMIZE] Failed to get pending optimizations:', error);
    return [];
  }
}

function hashPrompt(prompt: string): string {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export const FEEDBACK_TAGS = {
  positive: [
    { value: 'helpful', label: '有帮助' },
    { value: 'accurate', label: '准确' },
    { value: 'fast', label: '快速' },
    { value: 'professional', label: '专业' },
    { value: 'friendly', label: '友好' },
  ],
  negative: [
    { value: 'wrong', label: '回答错误' },
    { value: 'slow', label: '响应慢' },
    { value: 'rude', label: '态度不好' },
    { value: 'unclear', label: '不清楚' },
    { value: 'irrelevant', label: '不相关' },
  ],
};
