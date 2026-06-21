'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Lang = 'zh' | 'en' | 'ja';

const i18n: Record<Lang, any> = {
  zh: {
    title: '管理后台', welcome: '欢迎', loading: '加载中...', refresh: '刷新', home: '首页',
    loginRequired: '需要管理员权限', login: '去登录', backHome: '返回首页',
    noData: '暂无数据', save: '保存', cancel: '取消', saving: '保存中...', saveSuccess: '保存成功',
    tabs: {
      appointments: '预约管理', users: '用户管理', leads: '线索看板',
    },
    appointments: {
      total: '全部', pending: '待确认', confirmed: '已确认', cancelled: '已取消', none: '暂无预约',
      patient: '患者', phone: '手机号', service: '项目', hospital: '医院', time: '时间', status: '状态',
      confirm: '确认', cancel: '取消',
      statusLabels: { pending: '待确认', confirmed: '已确认', cancelled: '已取消' },
    },
    users: {
      total: '总用户', admins: '管理员', normals: '普通用户', none: '暂无用户',
      id: 'ID', username: '用户名', nickname: '昵称', role: '角色', created: '注册时间', lastLogin: '最后登录',
      admin: '管理员', user: '用户', never: '从未',
    },
      leads: {
        title: '线索看板', exportExcel: '导出 Excel',
        all: '全部', keyword: '搜索姓名/电话/项目',
      total: '总线索', pending: '待联系', contacted: '已联系', visited: '已到诊',
      converted: '已成交', invalid: '无效', conversionRate: '转化率', dealAmount: '成交金额',
      avgDeal: '平均成交额', visitRate: '到诊率',
      statusLabels: {
        pending_contact: '待联系', contacted: '已联系', visited: '已到诊',
        converted: '已成交', invalid: '无效',
      },
      card: {
        source: '来源', note: '备注', nextFollowUp: '下次跟进', noNote: '无备注',
        source_chat: 'AI导诊', source_manual: '手动', source_website: '网站',
      },
      modal: {
        title: '线索详情', status: '状态', note: '跟进备注', nextFollowUp: '下次跟进时间',
        dealAmount: '成交金额', invalidReason: '无效原因',
        invalidPlaceholder: '请填写无效原因...', notePlaceholder: '添加跟进备注...',
        saveError: '保存失败',
      },
    },
  },
  en: {
    title: 'Admin Panel', welcome: 'Welcome', loading: 'Loading...', refresh: 'Refresh', home: 'Home',
    loginRequired: 'Admin Access Required', login: 'Login', backHome: 'Back to Home',
    noData: 'No data', save: 'Save', cancel: 'Cancel', saving: 'Saving...', saveSuccess: 'Saved',
    tabs: {
      appointments: 'Appointments', users: 'Users', leads: 'Leads Board',
    },
    appointments: {
      total: 'Total', pending: 'Pending', confirmed: 'Confirmed', cancelled: 'Cancelled', none: 'No appointments',
      patient: 'Patient', phone: 'Phone', service: 'Service', hospital: 'Hospital', time: 'Time', status: 'Status',
      confirm: 'Confirm', cancel: 'Cancel',
      statusLabels: { pending: 'Pending', confirmed: 'Confirmed', cancelled: 'Cancelled' },
    },
    users: {
      total: 'Total', admins: 'Admins', normals: 'Users', none: 'No users',
      id: 'ID', username: 'Username', nickname: 'Nickname', role: 'Role', created: 'Created', lastLogin: 'Last Login',
      admin: 'Admin', user: 'User', never: 'Never',
    },
      leads: {
        title: 'Leads Board', exportExcel: 'Export Excel',
        all: 'All', keyword: 'Search name/phone/service',
      total: 'Total Leads', pending: 'Pending Contact', contacted: 'Contacted', visited: 'Visited',
      converted: 'Converted', invalid: 'Invalid', conversionRate: 'Conversion Rate', dealAmount: 'Deal Amount',
      avgDeal: 'Avg Deal', visitRate: 'Visit Rate',
      statusLabels: {
        pending_contact: 'Pending Contact', contacted: 'Contacted', visited: 'Visited',
        converted: 'Converted', invalid: 'Invalid',
      },
      card: {
        source: 'Source', note: 'Note', nextFollowUp: 'Next Follow-up', noNote: 'No notes',
        source_chat: 'AI Chat', source_manual: 'Manual', source_website: 'Website',
      },
      modal: {
        title: 'Lead Details', status: 'Status', note: 'Follow-up Note', nextFollowUp: 'Next Follow-up',
        dealAmount: 'Deal Amount', invalidReason: 'Invalid Reason',
        invalidPlaceholder: 'Enter reason for invalid...', notePlaceholder: 'Add follow-up note...',
        saveError: 'Failed to save',
      },
    },
  },
  ja: {
    title: '管理画面', welcome: 'ようこそ', loading: '読み込み中...', refresh: '更新', home: 'ホーム',
    loginRequired: '管理者権限が必要です', login: 'ログイン', backHome: 'トップに戻る',
    noData: 'データなし', save: '保存', cancel: 'キャンセル', saving: '保存中...', saveSuccess: '保存完了',
    tabs: {
      appointments: '予約管理', users: 'ユーザー管理', leads: 'リードボード',
    },
    appointments: {
      total: '全部', pending: '未確認', confirmed: '確認済', cancelled: 'キャンセル', none: '予約なし',
      patient: '患者', phone: '電話番号', service: '項目', hospital: '病院', time: '時間', status: '状態',
      confirm: '確認', cancel: 'キャンセル',
      statusLabels: { pending: '未確認', confirmed: '確認済', cancelled: 'キャンセル' },
    },
    users: {
      total: '総ユーザー', admins: '管理者', normals: '一般ユーザー', none: 'ユーザーなし',
      id: 'ID', username: 'ユーザー名', nickname: 'ニックネーム', role: '役割', created: '登録日', lastLogin: '最終ログイン',
      admin: '管理者', user: 'ユーザー', never: 'なし',
    },
      leads: {
        title: 'リードボード', exportExcel: 'Excel エクスポート',
        all: 'すべて', keyword: '名前/電話/項目を検索',
      total: '総リード', pending: '未対応', contacted: '対応済', visited: '来院済',
      converted: '成約', invalid: '無効', conversionRate: '成約率', dealAmount: '成約金額',
      avgDeal: '平均成約額', visitRate: '来院率',
      statusLabels: {
        pending_contact: '未対応', contacted: '対応済', visited: '来院済',
        converted: '成約', invalid: '無効',
      },
      card: {
        source: '来源', note: 'メモ', nextFollowUp: '次回フォロー', noNote: 'メモなし',
        source_chat: 'AI案内', source_manual: '手動', source_website: 'ウェブ',
      },
      modal: {
        title: 'リード詳細', status: 'ステータス', note: 'フォローメモ', nextFollowUp: '次回フォロー日時',
        dealAmount: '成約金額', invalidReason: '無効理由',
        invalidPlaceholder: '無効理由を入力...', notePlaceholder: 'フォローメモを追加...',
        saveError: '保存に失敗しました',
      },
    },
  },
};

const LEAD_STATUS_COLORS: Record<string, string> = {
  pending_contact: 'bg-amber-50 text-amber-700 border-amber-200',
  contacted: 'bg-blue-50 text-blue-700 border-blue-200',
  visited: 'bg-teal-50 text-teal-700 border-teal-200',
  converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  invalid: 'bg-red-50 text-red-600 border-red-200',
};

const LEAD_STATUS_BG: Record<string, string> = {
  pending_contact: 'bg-amber-500/10 text-amber-600 border-amber-200/60',
  contacted: 'bg-blue-500/10 text-blue-600 border-blue-200/60',
  visited: 'bg-teal-500/10 text-teal-600 border-teal-200/60',
  converted: 'bg-emerald-500/10 text-emerald-600 border-emerald-200/60',
  invalid: 'bg-slate-100 text-slate-500 border-slate-200/60',
};

const STATUS_ORDER = ['pending_contact', 'contacted', 'visited', 'converted', 'invalid'];

interface Lead {
  id: string; name: string; phone: string; service_type: string; appointment_time: string;
  status: string; created_at: string; lead_status: string; lead_source: string;
  follow_up_note: string | null; next_follow_up_at: string | null; deal_amount: number | null;
  updated_at: string;
}

interface Appointment {
  id: string; name: string; phone: string; service_type: string; appointment_time: string;
  status: string; created_at: string;
}

interface User {
  id: number; username: string; nickname: string; role: string; created_at: string; last_login: string;
}

interface Stats {
  total_leads: number; pending_contact_count: number; contacted_count: number; visited_count: number;
  converted_count: number; invalid_count: number; visit_rate: number; conversion_rate: number;
  total_deal_amount: number; average_deal_amount: number;
}

type AdminTab = 'appointments' | 'users' | 'leads';

export default function AdminPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('zh');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username: string; nickname?: string; role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('appointments');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [leadKeyword, setLeadKeyword] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('');

  const t = i18n[lang];

  useEffect(() => {
    const saved = localStorage.getItem('dental-lang');
    if (saved && ['zh', 'en', 'ja'].includes(saved)) setLang(saved as Lang);
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => {
        if (d.user?.role === 'admin') { setAuthenticated(true); setCurrentUser(d.user); fetchAll(); }
        else { setError(t.loginRequired); setLoading(false); }
      })
      .catch(() => { setError(t.loginRequired); setLoading(false); });
  }, []);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([fetch('/api/admin/appointments'), fetch('/api/admin/users'), fetch('/api/admin/leads'), fetch('/api/admin/leads/stats')])
      .then(async ([a, u, l, s]) => {
        if (a.ok) { const d = await a.json(); setAppointments(d.appointments || []); }
        if (u.ok) { const d = await u.json(); setUsers(d.users || []); }
        if (l.ok) { const d = await l.json(); setLeads(d.leads || []); }
        if (s.ok) { const d = await s.json(); setStats(d); }
      })
      .catch(() => setError(t.refresh))
      .finally(() => setLoading(false));
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const r = await fetch('/api/appointment/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
      if (r.ok) setAppointments(p => p.map(a => a.id === id ? { ...a, status } : a));
    } catch { setError(t.refresh); }
    finally { setUpdatingId(null); }
  };

  const statusBadge = (s: string) => {
    const m: Record<string, { cls: string; label: string }> = {
      pending: { cls: 'badge-pending', label: t.appointments.statusLabels.pending },
      confirmed: { cls: 'badge-confirmed', label: t.appointments.statusLabels.confirmed },
      cancelled: { cls: 'badge-cancelled', label: t.appointments.statusLabels.cancelled },
    };
    const b = m[s] || { cls: 'bg-slate-50 text-slate-600 border border-slate-200', label: s };
    return <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${b.cls}`}>{b.label}</span>;
  };

  const parseService = (st: string) => { const p = st.split(' @ '); return { service: p[0], hospital: p[1] || '' }; };

  const apptStats = {
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  // ─── CRM Stats ───
  const leadStatsCards = stats ? [
    { label: t.leads.total, value: stats.total_leads, icon: 'leaderboard', color: 'bg-slate-100 text-slate-600' },
    { label: t.leads.pending, value: stats.pending_contact_count, icon: 'schedule', color: 'bg-amber-50 text-amber-600' },
    { label: t.leads.contacted, value: stats.contacted_count, icon: 'call_made', color: 'bg-blue-50 text-blue-600' },
    { label: t.leads.visited, value: stats.visited_count, icon: 'meeting_room', color: 'bg-teal-50 text-teal-600' },
    { label: t.leads.converted, value: stats.converted_count, icon: 'check_circle', color: 'bg-emerald-50 text-emerald-600' },
    { label: t.leads.invalid, value: stats.invalid_count, icon: 'cancel', color: 'bg-red-50 text-red-500' },
    { label: t.leads.conversionRate, value: `${stats.conversion_rate}%`, icon: 'trending_up', color: 'bg-emerald-50 text-emerald-600' },
    { label: t.leads.dealAmount, value: formatCurrency(stats.total_deal_amount, lang), icon: 'payments', color: 'bg-emerald-50 text-emerald-600' },
  ] : [];

  // ─── Lead Detail Modal ───
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editFollowUp, setEditFollowUp] = useState('');
  const [editDeal, setEditDeal] = useState('');
  const [savingLead, setSavingLead] = useState(false);
  const [leadSaveError, setLeadSaveError] = useState('');

  const openLeadModal = (lead: Lead) => {
    setSelectedLead(lead);
    setEditStatus(lead.lead_status);
    setEditNote(lead.follow_up_note || '');
    setEditFollowUp(lead.next_follow_up_at ? lead.next_follow_up_at.slice(0, 16) : '');
    setEditDeal(lead.deal_amount !== null ? String(lead.deal_amount) : '');
    setLeadSaveError('');
  };

  const closeLeadModal = () => {
    setSelectedLead(null);
    setSavingLead(false);
    setLeadSaveError('');
  };

  const saveLead = async () => {
    if (!selectedLead) return;
    setSavingLead(true); setLeadSaveError('');
    const body: Record<string, any> = { lead_status: editStatus };
    if (editStatus === 'invalid') body.follow_up_note = editNote;
    else {
      if (editNote) body.follow_up_note = editNote;
      if (editFollowUp) body.next_follow_up_at = editFollowUp;
      if (editDeal) body.deal_amount = parseFloat(editDeal) || 0;
    }
    try {
      const r = await fetch(`/api/admin/leads/${selectedLead.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (r.ok) {
        const d = await r.json();
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, ...d.lead } : l));
        setSelectedLead(prev => prev ? { ...prev, ...d.lead } : null);
        fetchAll();
      } else { setLeadSaveError(t.leads.modal.saveError); }
    } catch { setLeadSaveError(t.leads.modal.saveError); }
    finally { setSavingLead(false); }
  };

  // ─── Filtered leads ───
  const filteredLeads = leads.filter(l => {
    if (leadStatusFilter && l.lead_status !== leadStatusFilter) return false;
    if (leadKeyword) {
      const kw = leadKeyword.toLowerCase();
      return l.name.toLowerCase().includes(kw) || l.phone.includes(kw) || l.service_type.toLowerCase().includes(kw);
    }
    return true;
  });

  const groupedLeads = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = filteredLeads.filter(l => l.lead_status === status);
    return acc;
  }, {} as Record<string, Lead[]>);

  const formatDateTime = (dt: string | null) => {
    if (!dt) return '-';
    try { return new Date(dt).toLocaleString(lang === 'en' ? 'en-US' : 'zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return dt; }
  };

  if (!authenticated && !loading) {
    return (
      <div className="min-h-screen page-light flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-navy rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
            <span className="material-symbols-outlined text-white text-2xl">lock</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1.5">{t.loginRequired}</h2>
          <p className="text-xs text-slate-500 mb-5">{error || t.loginRequired}</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button onClick={() => router.push('/login?callback=/admin')} className="btn-primary px-5 py-2 rounded-xl text-xs">{t.login}</button>
            <button onClick={() => router.push('/')} className="btn-secondary px-5 py-2 rounded-xl text-xs">{t.backHome}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-light font-sans">
      {/* Header */}
      <header className="glass-light border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
              <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>dentistry</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">{t.title}</h1>
              <p className="text-[10px] text-slate-400">{t.welcome}, {currentUser?.nickname || currentUser?.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 overflow-hidden">
              {(['zh', 'en', 'ja'] as Lang[]).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-2 py-1 text-[10px] font-bold transition-all ${lang === l ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{l === 'zh' ? '中' : l === 'en' ? 'EN' : '日'}</button>
              ))}
            </div>
            <button onClick={fetchAll} className="btn-secondary px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">refresh</span> {t.refresh}
            </button>
            <a href="/" className="btn-primary px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">home</span> {t.home}
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-5">
          {([['appointments', t.tabs.appointments, 'calendar_today'], ['leads', t.tabs.leads, 'leaderboard'], ['users', t.tabs.users, 'people']] as [AdminTab, string, string][]).map(([k, label, icon]) => (
            <button key={k} onClick={() => setActiveTab(k)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <span className="material-symbols-outlined text-xs">{icon}</span> {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-100 rounded-xl p-3 mb-5 text-xs font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span> {error}
          </div>
        )}

        {/* ─── Appointments Tab ─── */}
        {activeTab === 'appointments' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: t.appointments.total, value: apptStats.total, icon: 'calendar_today', color: 'bg-slate-100 text-slate-600' },
                { label: t.appointments.pending, value: apptStats.pending, icon: 'schedule', color: 'bg-amber-50 text-amber-600' },
                { label: t.appointments.confirmed, value: apptStats.confirmed, icon: 'check_circle', color: 'bg-teal-50 text-teal-600' },
                { label: t.appointments.cancelled, value: apptStats.cancelled, icon: 'cancel', color: 'bg-red-50 text-red-500' },
              ].map(s => (
                <div key={s.label} className="bento-card !p-3.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                    <span className="material-symbols-outlined text-base">{s.icon}</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {loading ? (
              <div className="bento-card p-10 text-center">
                <div className="typing-indicator justify-center mb-2"><span /><span /><span /></div>
                <p className="text-slate-400 text-xs">{t.loading}</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="bento-card p-10 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-300 mb-2">event_busy</span>
                <p className="text-slate-400 text-xs">{t.appointments.none}</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block bento-card !p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{t.appointments.patient}</th><th>{t.appointments.phone}</th><th>{t.appointments.service}</th>
                          <th>{t.appointments.hospital}</th><th>{t.appointments.time}</th><th>{t.appointments.status}</th><th>{t.appointments.confirm}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map(a => {
                          const { service, hospital } = parseService(a.service_type);
                          return (
                            <tr key={a.id}>
                              <td><div className="flex items-center gap-2"><div className="w-7 h-7 bg-teal-50 rounded-md flex items-center justify-center text-teal-700 text-[11px] font-bold">{a.name[0]}</div><span className="font-semibold text-slate-800">{a.name}</span></div></td>
                              <td>{a.phone}</td>
                              <td><span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded-md font-medium">{service}</span></td>
                              <td className="text-xs">{hospital || '-'}</td>
                              <td>{a.appointment_time}</td>
                              <td>{statusBadge(a.status)}</td>
                              <td>
                                {a.status === 'pending' && (
                                  <div className="flex gap-1.5">
                                    <button onClick={() => updateStatus(a.id, 'confirmed')} disabled={updatingId === a.id}
                                      className="bg-teal-50 text-teal-700 hover:bg-teal-100 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-teal-200 disabled:opacity-50">{t.appointments.confirm}</button>
                                    <button onClick={() => updateStatus(a.id, 'cancelled')} disabled={updatingId === a.id}
                                      className="bg-red-50 text-red-600 hover:bg-red-100 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-red-200 disabled:opacity-50">{t.appointments.cancel}</button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="md:hidden space-y-2.5">
                  {appointments.map(a => {
                    const { service, hospital } = parseService(a.service_type);
                    return (
                      <div key={a.id} className="bento-card !p-3.5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center text-teal-700 text-xs font-bold">{a.name[0]}</div>
                            <div><p className="text-sm font-bold text-slate-800">{a.name}</p><p className="text-[10px] text-slate-400">{a.phone}</p></div>
                          </div>
                          {statusBadge(a.status)}
                        </div>
                        <div className="text-[11px] text-slate-500 space-y-1 mb-2">
                          <p className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">monitor_heart</span> {service}</p>
                          {hospital && <p className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">local_hospital</span> {hospital}</p>}
                          <p className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">schedule</span> {a.appointment_time}</p>
                        </div>
                        {a.status === 'pending' && (
                          <div className="flex gap-2 pt-2 border-t border-slate-100">
                            <button onClick={() => updateStatus(a.id, 'confirmed')} disabled={updatingId === a.id}
                              className="flex-1 bg-teal-50 text-teal-700 py-1.5 rounded-md text-[11px] font-semibold border border-teal-200 disabled:opacity-50">{t.appointments.confirm}</button>
                            <button onClick={() => updateStatus(a.id, 'cancelled')} disabled={updatingId === a.id}
                              className="flex-1 bg-red-50 text-red-600 py-1.5 rounded-md text-[11px] font-semibold border border-red-200 disabled:opacity-50">{t.appointments.cancel}</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ─── Users Tab ─── */}
        {activeTab === 'users' && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: t.users.total, value: users.length, icon: 'people', color: 'bg-slate-100 text-slate-600' },
                { label: t.users.admins, value: users.filter(u => u.role === 'admin').length, icon: 'shield', color: 'bg-amber-50 text-amber-600' },
                { label: t.users.normals, value: users.filter(u => u.role !== 'admin').length, icon: 'person', color: 'bg-teal-50 text-teal-600' },
              ].map(s => (
                <div key={s.label} className="bento-card !p-3.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                    <span className="material-symbols-outlined text-base">{s.icon}</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-[10px] text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>
            {loading ? (
              <div className="bento-card p-10 text-center text-slate-400 text-xs">{t.loading}</div>
            ) : users.length === 0 ? (
              <div className="bento-card p-10 text-center text-slate-400 text-xs">{t.users.none}</div>
            ) : (
              <div className="bento-card !p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr><th>{t.users.id}</th><th>{t.users.username}</th><th>{t.users.nickname}</th><th>{t.users.role}</th><th>{t.users.created}</th><th>{t.users.lastLogin}</th></tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td className="text-slate-400">{u.id}</td>
                          <td><div className="flex items-center gap-2"><div className="w-7 h-7 bg-teal-50 rounded-md flex items-center justify-center text-teal-700 text-[11px] font-bold">{(u.nickname || u.username)[0]}</div><span className="font-semibold text-slate-800">{u.username}</span></div></td>
                          <td>{u.nickname || '-'}</td>
                          <td><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${u.role === 'admin' ? 'badge-pending' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}><span className="material-symbols-outlined text-xs">{u.role === 'admin' ? 'shield' : 'person'}</span>{u.role === 'admin' ? t.users.admin : t.users.user}</span></td>
                          <td className="text-xs text-slate-400">{u.created_at ? new Date(u.created_at).toLocaleDateString('zh-CN') : '-'}</td>
                          <td className="text-xs text-slate-400">{u.last_login ? new Date(u.last_login).toLocaleDateString('zh-CN') : t.users.never}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── Leads Tab ─── */}
        {activeTab === 'leads' && (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-5">
              {leadStatsCards.map(s => (
                <div key={s.label} className="bento-card !p-3 !pb-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 ${s.color}`}>
                    <span className="material-symbols-outlined text-sm">{s.icon}</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900">{s.value}</p>
                  <p className="text-[9px] text-slate-400 truncate">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="relative flex-1 max-w-xs">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">search</span>
                <input type="text" value={leadKeyword} onChange={e => setLeadKeyword(e.target.value)}
                  placeholder={t.leads.keyword}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" />
              </div>
              <select value={leadStatusFilter} onChange={e => setLeadStatusFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-200 bg-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400">
                <option value="">{t.leads.all}</option>
                {STATUS_ORDER.map(s => (
                  <option key={s} value={s}>{t.leads.statusLabels[s]}</option>
                ))}
              </select>
              <a href="/api/admin/leads/export"
                className="btn-secondary px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">file_download</span> {t.leads.exportExcel}
              </a>
            </div>

            {loading ? (
              <div className="bento-card p-10 text-center">
                <div className="typing-indicator justify-center mb-2"><span /><span /><span /></div>
                <p className="text-slate-400 text-xs">{t.loading}</p>
              </div>
            ) : leads.length === 0 ? (
              <div className="bento-card p-10 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-300 mb-2">leaderboard</span>
                <p className="text-slate-400 text-xs">{t.noData}</p>
              </div>
            ) : (
              <>
                {/* Desktop Kanban */}
                <div className="hidden lg:grid lg:grid-cols-5 gap-3" style={{ minHeight: '60vh' }}>
                  {STATUS_ORDER.map(status => (
                    <div key={status} className="bento-card !p-3 flex flex-col" style={{ maxHeight: 'calc(100vh - 270px)' }}>
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${status === 'pending_contact' ? 'bg-amber-400' : status === 'contacted' ? 'bg-blue-400' : status === 'visited' ? 'bg-teal-400' : status === 'converted' ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                          <span className="text-xs font-bold text-slate-700">{t.leads.statusLabels[status]}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">{groupedLeads[status]?.length || 0}</span>
                      </div>
                      <div className="space-y-2 overflow-y-auto flex-1 pr-0.5" style={{ scrollbarWidth: 'thin' }}>
                        {(groupedLeads[status] || []).map(lead => (
                          <LeadCard key={lead.id} lead={lead} t={t} lang={lang} onClick={() => openLeadModal(lead)}
                            parseService={parseService} formatDateTime={formatDateTime} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mobile lead list */}
                <div className="lg:hidden space-y-2">
                  {filteredLeads.map(lead => (
                    <div key={lead.id} onClick={() => openLeadModal(lead)} className="bento-card !p-3 cursor-pointer hover:border-teal-300 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-teal-50 rounded-md flex items-center justify-center text-teal-700 text-[11px] font-bold">{lead.name[0]}</div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{lead.name}</p>
                            <p className="text-[10px] text-slate-400">{lead.phone}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${LEAD_STATUS_BG[lead.lead_status] || LEAD_STATUS_BG.pending_contact}`}>{t.leads.statusLabels[lead.lead_status]}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <p className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">monitor_heart</span> {parseService(lead.service_type).service}</p>
                        {parseService(lead.service_type).hospital && <p className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">local_hospital</span> {parseService(lead.service_type).hospital}</p>}
                        <p className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">schedule</span> {lead.appointment_time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={closeLeadModal}>
          <div className="w-full max-w-lg bento-card !p-0 overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh' }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-teal-600">person</span>
                {t.leads.modal.title}
              </h3>
              <button onClick={closeLeadModal} className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 60px)' }}>
              {/* Info section */}
              <div className="space-y-2.5 mb-5 pb-4 border-b border-slate-100">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <InfoRow icon="person" label={t.appointments.patient} value={selectedLead.name} />
                  <InfoRow icon="phone" label={t.appointments.phone} value={selectedLead.phone} />
                  <InfoRow icon="monitor_heart" label={t.appointments.service} value={parseService(selectedLead.service_type).service} />
                  <InfoRow icon="local_hospital" label={t.appointments.hospital} value={parseService(selectedLead.service_type).hospital || '-'} />
                  <InfoRow icon="schedule" label={t.appointments.time} value={selectedLead.appointment_time} />
                  <InfoRow icon="share" label={t.leads.card.source} value={t.leads.card[`source_${selectedLead.lead_source}` as keyof typeof t.leads.card] || selectedLead.lead_source} />
                  <InfoRow icon="calendar_month" label="创建时间" value={formatDateTime(selectedLead.created_at)} />
                  <InfoRow icon="history" label={t.appointments.status} value={formatDateTime(selectedLead.updated_at)} />
                </div>
              </div>

              {/* Editable fields */}
              <div className="space-y-3.5">
                {/* Status */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{t.leads.modal.status}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_ORDER.map(s => (
                      <button key={s} onClick={() => setEditStatus(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${editStatus === s
                          ? LEAD_STATUS_COLORS[s] + ' ring-2 ring-offset-1 ring-slate-200'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                        {t.leads.statusLabels[s]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Follow-up note */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    {editStatus === 'invalid' ? t.leads.modal.invalidReason : t.leads.modal.note}
                  </label>
                  <textarea value={editNote} onChange={e => setEditNote(e.target.value)}
                    placeholder={editStatus === 'invalid' ? t.leads.modal.invalidPlaceholder : t.leads.modal.notePlaceholder}
                    rows={3}
                    className="w-full text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 resize-none" />
                </div>

                {/* Next follow-up */}
                {editStatus !== 'invalid' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{t.leads.modal.nextFollowUp}</label>
                    <input type="datetime-local" value={editFollowUp} onChange={e => setEditFollowUp(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" />
                  </div>
                )}

                {/* Deal amount */}
                {editStatus === 'converted' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{t.leads.modal.dealAmount}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{lang === 'en' ? '$' : '¥'}</span>
                      <input type="number" min="0" step="0.01" value={editDeal} onChange={e => setEditDeal(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" />
                    </div>
                  </div>
                )}

                {/* Save button */}
                {leadSaveError && (
                  <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-2.5 text-[11px] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">error</span> {leadSaveError}
                  </div>
                )}
                <button onClick={saveLead} disabled={savingLead}
                  className="w-full btn-primary py-2.5 rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {savingLead ? <><span className="material-symbols-outlined text-sm animate-spin">sync</span> {t.saving}</> : t.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───

function LeadCard({ lead, t, lang, onClick, parseService, formatDateTime }: {
  lead: Lead; t: any; lang: Lang; onClick: () => void; parseService: (st: string) => any; formatDateTime: (dt: string | null) => string;
}) {
  const { service } = parseService(lead.service_type);
  return (
    <div onClick={onClick} className="bg-white rounded-xl border border-slate-100 p-3 cursor-pointer hover:border-teal-200 hover:shadow-sm transition-all duration-150 group">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 bg-teal-50 rounded-md flex items-center justify-center text-teal-700 text-[9px] font-bold">{lead.name[0]}</div>
          <span className="text-xs font-bold text-slate-800">{lead.name}</span>
        </div>
        <span className="text-[10px] text-slate-400">{lead.phone}</span>
      </div>
      <div className="text-[10px] text-slate-500 space-y-0.5">
        <p className="truncate">{service}</p>
        {lead.appointment_time && <p className="flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">schedule</span> {lead.appointment_time}</p>}
        {lead.follow_up_note && <p className="truncate text-slate-400"><span className="material-symbols-outlined text-[10px] align-middle">notes</span> {lead.follow_up_note}</p>}
        {lead.next_follow_up_at && <p className="text-blue-500"><span className="material-symbols-outlined text-[10px] align-middle">notifications</span> {formatDateTime(lead.next_follow_up_at)}</p>}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="material-symbols-outlined text-xs text-slate-400">{icon}</span>
      <span className="text-slate-500 min-w-[3rem]">{label}:</span>
      <span className="text-slate-800 font-medium truncate">{value}</span>
    </div>
  );
}

function formatCurrency(amount: number, lang: Lang) {
  if (!amount && amount !== 0) return '0';
  const symbol = lang === 'en' ? '$' : '¥';
  return `${symbol}${amount.toLocaleString(lang === 'en' ? 'en-US' : 'zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
