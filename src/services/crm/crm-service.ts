import { query } from '@/lib/db';
import openai, { MODEL } from '@/lib/openai';

export interface LeadScore {
  id: number;
  lead_id: string;
  score: number;
  score_breakdown: {
    lead_quality: number;
    engagement_level: number;
    conversion_probability: number;
    time_sensitivity: number;
    deal_amount: number;
  };
  ai_suggestion: string;
  anomaly_flags: string[];
  scored_at: Date;
}

export interface FollowupScript {
  id: number;
  lead_id: string;
  script_type: string;
  content: string;
  channel: string;
  created_by: string;
  used_at: Date | null;
  created_at: Date;
}

export interface AnomalyLog {
  id: number;
  lead_id: string | null;
  anomaly_type: string;
  description: string;
  severity: string;
  resolved: boolean;
  created_at: Date;
}

export async function calculateLeadScore(leadId: string): Promise<LeadScore | null> {
  try {
    const leadResult = await query(
      `SELECT a.*, ls.score as previous_score
       FROM appointments a
       LEFT JOIN lead_scores ls ON a.id = ls.lead_id
       WHERE a.id = $1`,
      [leadId]
    );

    if (leadResult.rows.length === 0) {
      console.log('[CRM] Lead not found:', leadId);
      return null;
    }

    const lead = leadResult.rows[0];

    const scoreBreakdown = {
      lead_quality: calculateLeadQuality(lead),
      engagement_level: calculateEngagementLevel(lead),
      conversion_probability: calculateConversionProbability(lead),
      time_sensitivity: calculateTimeSensitivity(lead),
      deal_amount: calculateDealAmount(lead),
    };

    const totalScore = Math.min(100, Math.round(
      scoreBreakdown.lead_quality * 0.25 +
      scoreBreakdown.engagement_level * 0.25 +
      scoreBreakdown.conversion_probability * 0.25 +
      scoreBreakdown.time_sensitivity * 0.15 +
      scoreBreakdown.deal_amount * 0.10
    ));

    const anomalyFlags = await detectAnomalies(lead);

    const aiSuggestion = await generateFollowupSuggestion(lead, totalScore, anomalyFlags);

    const existingScore = await query(
      'SELECT id FROM lead_scores WHERE lead_id = $1',
      [leadId]
    );

    let result;
    if (existingScore.rows.length > 0) {
      result = await query(
        `UPDATE lead_scores 
         SET score = $1, score_breakdown = $2, ai_suggestion = $3, anomaly_flags = $4, updated_at = NOW()
         WHERE lead_id = $5
         RETURNING *`,
        [totalScore, JSON.stringify(scoreBreakdown), aiSuggestion, anomalyFlags, leadId]
      );
    } else {
      result = await query(
        `INSERT INTO lead_scores (lead_id, score, score_breakdown, ai_suggestion, anomaly_flags)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [leadId, totalScore, JSON.stringify(scoreBreakdown), aiSuggestion, anomalyFlags]
      );
    }

    console.log('[CRM] Scored lead:', leadId, 'Score:', totalScore);
    return result.rows[0];
  } catch (error) {
    console.error('[CRM] Failed to calculate lead score:', error);
    return null;
  }
}

function calculateLeadQuality(lead: any): number {
  let score = 50;

  if (lead.phone && /^1\d{10}$/.test(lead.phone)) {
    score += 20;
  }

  if (lead.name && lead.name.length > 1) {
    score += 10;
  }

  if (lead.service_type) {
    const highValueServices = ['种植牙', '牙齿矫正', '根管治疗'];
    const mediumValueServices = ['洗牙', '补牙', '拔牙'];
    
    if (highValueServices.some(s => lead.service_type.includes(s))) {
      score += 15;
    } else if (mediumValueServices.some(s => lead.service_type.includes(s))) {
      score += 10;
    }
  }

  return Math.min(100, score);
}

function calculateEngagementLevel(lead: any): number {
  let score = 30;

  if (lead.appointment_time) {
    score += 30;
  }

  if (lead.follow_up_note) {
    score += 20;
  }

  if (lead.lead_source === 'chat') {
    score += 20;
  }

  return Math.min(100, score);
}

function calculateConversionProbability(lead: any): number {
  let score = 20;

  const statusScores: Record<string, number> = {
    'pending_contact': 20,
    'contacted': 40,
    'visited': 70,
    'converted': 100,
    'invalid': 0,
  };

  score = statusScores[lead.lead_status] || 20;

  if (lead.deal_amount && lead.deal_amount > 0) {
    score = 100;
  }

  return Math.min(100, score);
}

function calculateTimeSensitivity(lead: any): number {
  let score = 50;

  const created = new Date(lead.created_at);
  const now = new Date();
  const hoursSinceCreated = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

  if (hoursSinceCreated < 24) {
    score += 30;
  } else if (hoursSinceCreated < 72) {
    score += 20;
  } else if (hoursSinceCreated > 168) {
    score -= 20;
  }

  if (lead.next_follow_up_at) {
    const followUp = new Date(lead.next_follow_up_at);
    if (followUp > now && followUp < new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
      score += 20;
    }
  }

  return Math.min(100, Math.max(0, score));
}

function calculateDealAmount(lead: any): number {
  if (!lead.deal_amount || lead.deal_amount <= 0) {
    return 30;
  }

  if (lead.deal_amount >= 10000) return 100;
  if (lead.deal_amount >= 5000) return 80;
  if (lead.deal_amount >= 2000) return 60;
  if (lead.deal_amount >= 500) return 40;
  return 30;
}

async function detectAnomalies(lead: any): Promise<string[]> {
  const flags: string[] = [];

  const duplicateCheck = await query(
    'SELECT COUNT(*) as count FROM appointments WHERE phone = $1 AND id != $2',
    [lead.phone, lead.id]
  );
  if (parseInt(duplicateCheck.rows[0].count) > 0) {
    flags.push('duplicate_phone');
    await logAnomaly(lead.id, 'duplicate_phone', `Phone ${lead.phone} has multiple appointments`, 'medium');
  }

  if (lead.appointment_time) {
    const timeStr = lead.appointment_time.toLowerCase();
    if (timeStr.includes('凌晨') || timeStr.includes('半夜') || timeStr.includes('3点') || timeStr.includes('4点')) {
      flags.push('suspicious_time');
      await logAnomaly(lead.id, 'suspicious_time', `Unusual appointment time: ${lead.appointment_time}`, 'low');
    }
  }

  if (lead.service_type) {
    const highValueServices = ['种植牙', '牙齿矫正'];
    if (highValueServices.some(s => lead.service_type.includes(s))) {
      flags.push('high_value');
    }
  }

  const created = new Date(lead.created_at);
  const daysSinceCreated = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreated > 7 && lead.lead_status === 'pending_contact') {
    flags.push('inactive_lead');
    await logAnomaly(lead.id, 'inactive_lead', `Lead pending for ${Math.floor(daysSinceCreated)} days`, 'medium');
  }

  return flags;
}

async function logAnomaly(
  leadId: string,
  type: string,
  description: string,
  severity: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO anomaly_logs (lead_id, anomaly_type, description, severity)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [leadId, type, description, severity]
    );
  } catch (error) {
    console.error('[CRM] Failed to log anomaly:', error);
  }
}

async function generateFollowupSuggestion(
  lead: any,
  score: number,
  anomalyFlags: string[]
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `你是CRM专家，为牙科诊所生成个性化的跟进话术。

线索信息：
- 患者姓名: ${lead.name}
- 电话: ${lead.phone}
- 项目: ${lead.service_type}
- 医院: ${lead.service_type.split(' @ ')[1] || '待定'}
- 时间: ${lead.appointment_time}
- 状态: ${lead.lead_status}
- 评分: ${score}/100
- 异常标记: ${anomalyFlags.length > 0 ? anomalyFlags.join(', ') : '无'}

任务：根据线索评分和状态，生成一条简短、专业的跟进话术。

要求：
- 语气友好专业
- 针对患者具体情况
- 包含明确的行动号召
- 长度控制在50字以内

只输出话术文本，不要其他内容。`,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || '您好，我是您的口腔健康顾问，请问有什么可以帮您的？';
  } catch (error) {
    console.error('[CRM] Failed to generate suggestion:', error);
    return '您好，我是您的口腔健康顾问，请问有什么可以帮您的？';
  }
}

export async function generateFollowupScripts(
  leadId: string,
  scriptTypes: string[] = ['initial', 'reminder', 'reengagement']
): Promise<FollowupScript[]> {
  try {
    const leadResult = await query(
      'SELECT * FROM appointments WHERE id = $1',
      [leadId]
    );

    if (leadResult.rows.length === 0) {
      return [];
    }

    const lead = leadResult.rows[0];
    const scripts: FollowupScript[] = [];

    for (const scriptType of scriptTypes) {
      const content = await generateScriptByType(lead, scriptType);
      
      const result = await query(
        `INSERT INTO followup_scripts (lead_id, script_type, content, channel, created_by)
         VALUES ($1, $2, $3, $4, 'ai')
         RETURNING *`,
        [leadId, scriptType, content, 'sms']
      );

      scripts.push(result.rows[0]);
    }

    console.log('[CRM] Generated', scripts.length, 'follow-up scripts for lead:', leadId);
    return scripts;
  } catch (error) {
    console.error('[CRM] Failed to generate follow-up scripts:', error);
    return [];
  }
}

async function generateScriptByType(lead: any, scriptType: string): Promise<string> {
  const typePrompts: Record<string, string> = {
    initial: '生成一条初次联系的话术，介绍诊所并邀请预约',
    reminder: '生成一条预约提醒的话术，确认就诊时间',
    reengagement: '生成一条重新激活的话术，针对未完成预约的患者',
    closing: '生成一条成交跟进的话术，感谢信任并提供售后',
  };

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `你是牙科诊所的CRM助手。${typePrompts[scriptType] || '生成一条通用跟进话术'}。

患者信息：
- 姓名: ${lead.name}
- 项目: ${lead.service_type}
- 状态: ${lead.lead_status}

要求：
- 语气友好专业
- 简洁明了（50字以内）
- 包含行动号召

只输出话术文本。`,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || '您好，请问有什么可以帮您的？';
  } catch (error) {
    console.error('[CRM] Failed to generate script:', error);
    return '您好，请问有什么可以帮您的？';
  }
}

export async function scoreAllLeads(): Promise<{ scored: number; errors: number }> {
  try {
    const leads = await query(
      'SELECT id FROM appointments WHERE lead_status != $1',
      ['invalid']
    );

    let scored = 0;
    let errors = 0;

    for (const lead of leads.rows) {
      try {
        await calculateLeadScore(lead.id);
        scored++;
      } catch (error) {
        errors++;
        console.error('[CRM] Failed to score lead:', lead.id, error);
      }
    }

    console.log('[CRM] Batch scoring complete:', scored, 'scored,', errors, 'errors');
    return { scored, errors };
  } catch (error) {
    console.error('[CRM] Failed to batch score leads:', error);
    return { scored: 0, errors: 0 };
  }
}

export async function getLeadScore(leadId: string): Promise<LeadScore | null> {
  try {
    const result = await query(
      'SELECT * FROM lead_scores WHERE lead_id = $1',
      [leadId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('[CRM] Failed to get lead score:', error);
    return null;
  }
}

export async function getFollowupScripts(leadId: string): Promise<FollowupScript[]> {
  try {
    const result = await query(
      'SELECT * FROM followup_scripts WHERE lead_id = $1 ORDER BY created_at DESC',
      [leadId]
    );
    return result.rows;
  } catch (error) {
    console.error('[CRM] Failed to get follow-up scripts:', error);
    return [];
  }
}

export async function getAnomalies(resolved = false): Promise<AnomalyLog[]> {
  try {
    const result = await query(
      'SELECT * FROM anomaly_logs WHERE resolved = $1 ORDER BY created_at DESC LIMIT 50',
      [resolved]
    );
    return result.rows;
  } catch (error) {
    console.error('[CRM] Failed to get anomalies:', error);
    return [];
  }
}

export async function resolveAnomaly(anomalyId: number): Promise<boolean> {
  try {
    await query(
      'UPDATE anomaly_logs SET resolved = true WHERE id = $1',
      [anomalyId]
    );
    return true;
  } catch (error) {
    console.error('[CRM] Failed to resolve anomaly:', error);
    return false;
  }
}
