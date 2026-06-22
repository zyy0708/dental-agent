import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/services/auth/auth-service';
import {
  calculateLeadScore,
  getLeadScore,
  getFollowupScripts,
  generateFollowupScripts,
  getAnomalies,
  resolveAnomaly,
  scoreAllLeads,
} from '@/services/crm/crm-service';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'score';

    if (mode === 'score') {
      // Get score for a specific lead
      const leadId = url.searchParams.get('leadId');
      if (!leadId) {
        return NextResponse.json({ error: '缺少 leadId' }, { status: 400 });
      }
      const score = await getLeadScore(leadId);
      return NextResponse.json({ score });
    }

    if (mode === 'scripts') {
      // Get follow-up scripts for a lead
      const leadId = url.searchParams.get('leadId');
      if (!leadId) {
        return NextResponse.json({ error: '缺少 leadId' }, { status: 400 });
      }
      const scripts = await getFollowupScripts(leadId);
      return NextResponse.json({ scripts });
    }

    if (mode === 'anomalies') {
      // Get anomaly logs
      const resolved = url.searchParams.get('resolved') === 'true';
      const anomalies = await getAnomalies(resolved);
      return NextResponse.json({ anomalies });
    }

    return NextResponse.json({ error: '无效的 mode' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    const body = await request.json();
    const { action, leadId } = body;

    if (action === 'score') {
      // Score a specific lead
      if (!leadId) {
        return NextResponse.json({ error: '缺少 leadId' }, { status: 400 });
      }
      const score = await calculateLeadScore(leadId);
      return NextResponse.json({ score });
    }

    if (action === 'scoreAll') {
      // Score all leads
      const result = await scoreAllLeads();
      return NextResponse.json(result);
    }

    if (action === 'generateScripts') {
      // Generate follow-up scripts for a lead
      if (!leadId) {
        return NextResponse.json({ error: '缺少 leadId' }, { status: 400 });
      }
      const scripts = await generateFollowupScripts(leadId);
      return NextResponse.json({ scripts });
    }

    if (action === 'resolveAnomaly') {
      // Resolve an anomaly
      const anomalyId = body.anomalyId;
      if (!anomalyId) {
        return NextResponse.json({ error: '缺少 anomalyId' }, { status: 400 });
      }
      await resolveAnomaly(anomalyId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: '无效的 action' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
