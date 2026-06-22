'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ========== 类型定义 ==========
interface AgentStep {
  tool: string;
  input?: any;
  result_summary: string;
  duration_ms: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  time?: string;
  agent_metadata?: {
    intent_label?: string;
    agent_steps?: AgentStep[];
  };
  rating?: number;
  rated?: boolean;
}

interface User {
  id: number;
  username: string;
  nickname?: string;
}

interface Appointment {
  id: string;
  name: string;
  phone: string;
  service_type: string;
  appointment_time: string;
  status: string;
  created_at: string;
}

// ========== 导航项定义 ==========
type NavKey = 'chat' | 'appointments' | 'profile' | 'data' | 'settings';

type Lang = 'zh' | 'en' | 'ja';

const i18n: Record<Lang, any> = {
  zh: {
    appName: '智齿管家',
    appTag: 'Dental Agent AI',
    nav: {
      chat: '新咨询',
      appointments: '我的预约',
      profile: '患者档案',
      data: '护齿数据',
      settings: '系统设置',
    },
    header: {
      chat: ['AI 智能导诊', '症状分析 · 科室推荐 · 医院匹配'],
      appointments: ['我的预约', '查看和管理您的预约记录'],
      profile: ['患者档案', '查看您的个人信息'],
      data: ['护齿数据', '查看您的护齿健康数据'],
      settings: ['系统设置', '管理您的账户设置'],
    },
    cta: { newChat: '新对话', book: '立即预约' },
    settings: {
      title: '系统设置',
      language: '语言',
      languageDesc: '选择界面显示语言',
      password: '修改密码',
      passwordDesc: '更新账户密码',
      logout: '退出登录',
      languageHint: '中 / 英 / 日',
    },
    languageNames: { zh: '中文', en: 'English', ja: '日本語' },
  },
  en: {
    appName: 'Dental Agent',
    appTag: 'AI Dental Care',
    nav: {
      chat: 'New Chat',
      appointments: 'Appointments',
      profile: 'Profile',
      data: 'Health Data',
      settings: 'Settings',
    },
    header: {
      chat: ['AI Dental Triage', 'Symptom analysis · Specialty matching · Hospital search'],
      appointments: ['Appointments', 'View and manage your bookings'],
      profile: ['Profile', 'Review your personal information'],
      data: ['Health Data', 'Check your oral health metrics'],
      settings: ['Settings', 'Manage your account preferences'],
    },
    cta: { newChat: 'New Chat', book: 'Book Now' },
    settings: {
      title: 'Settings',
      language: 'Language',
      languageDesc: 'Choose the interface language',
      password: 'Change Password',
      passwordDesc: 'Update your account password',
      logout: 'Log out',
      languageHint: 'ZH / EN / JA',
    },
    languageNames: { zh: 'Chinese', en: 'English', ja: 'Japanese' },
  },
  ja: {
    appName: 'デンタルエージェント',
    appTag: 'AI歯科ケア',
    nav: {
      chat: '新規相談',
      appointments: '予約一覧',
      profile: '患者情報',
      data: '口腔データ',
      settings: '設定',
    },
    header: {
      chat: ['AI歯科トリアージ', '症状分析・診療科案内・病院検索'],
      appointments: ['予約一覧', '予約内容の確認と管理'],
      profile: ['患者情報', '個人情報の確認'],
      data: ['口腔データ', '口腔健康の指標を確認'],
      settings: ['設定', 'アカウント設定を管理'],
    },
    cta: { newChat: '新規会話', book: '今すぐ予約' },
    settings: {
      title: '設定',
      language: '言語',
      languageDesc: '表示言語を選択',
      password: 'パスワード変更',
      passwordDesc: 'アカウントのパスワードを更新',
      logout: 'ログアウト',
      languageHint: '日本語 / English / 中文',
    },
    languageNames: { zh: '中国語', en: '英語', ja: '日本語' },
  },
};

function toolIcon(tool: string): string {
  const icons: Record<string, string> = {
    query_hospitals: '🏥',
    get_user_profile: '👤',
    create_appointment: '📅',
    analyze_intent: '🧠',
    answer_medical_question: '💡',
  };
  return icons[tool] || '🔧';
}

function toolName(tool: string): string {
  const names: Record<string, string> = {
    query_hospitals: '查询医院',
    get_user_profile: '获取用户信息',
    create_appointment: '创建预约',
    analyze_intent: '意图分析',
    answer_medical_question: '医疗问答',
  };
  return names[tool] || tool;
}

function intentBadgeClass(label: string): string {
  const classes: Record<string, string> = {
    Triage: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    Booking: 'bg-blue-50 text-blue-700 border-blue-200',
    Info: 'bg-slate-50 text-slate-600 border-slate-200',
    Emergency: 'bg-red-50 text-red-700 border-red-200',
  };
  return (classes[label] || 'bg-slate-50 text-slate-500 border-slate-200')
    + ' inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mb-1.5';
}

function intentBadgeText(label: string): string {
  const texts: Record<string, string> = {
    Triage: '🏥 Triage',
    Booking: '📋 Booking',
    Info: 'ℹ️ Info',
    Emergency: '⚠️ Emergency',
  };
  return texts[label] || label;
}

export default function Home() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeNav, setActiveNav] = useState<NavKey>('chat');
  const [lang, setLang] = useState<Lang>('zh');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 预约相关状态
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  // 提醒相关状态
  const [reminders, setReminders] = useState<any[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);

  // 统计相关状态
  const chatCount = messages.filter(m => m.role === 'user').length;
  
  // 新增：护齿数据统计状态
  const [healthStats, setHealthStats] = useState({
    totalChats: 0,
    totalAppointments: 0,
    healthScore: 0,
    activeDays: 0,
    lastLoginAt: null as string | null,
    firstLoginAt: null as string | null,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // 修改密码弹窗
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [sessionId, setSessionId] = useState(() => `sess_${crypto.randomUUID().slice(0, 8)}`);
  const [hospitals, setHospitals] = useState<any[] | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);

  // 档案编辑状态
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  const t = i18n[lang];

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? (localStorage.getItem('dental-lang') as Lang | null) : null;
    if (stored && i18n[stored]) setLang(stored);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('dental-lang', lang);
    document.documentElement.lang = lang === 'ja' ? 'ja' : lang === 'en' ? 'en' : 'zh-CN';
  }, [lang]);

  const navItems: { key: NavKey; icon: string; label: string }[] = [
    { key: 'chat', icon: 'chat', label: t.nav.chat },
    { key: 'appointments', icon: 'calendar_today', label: t.nav.appointments },
    { key: 'profile', icon: 'person', label: t.nav.profile },
    { key: 'data', icon: 'monitoring', label: t.nav.data },
    { key: 'settings', icon: 'settings', label: t.nav.settings },
  ];

  // ========== 认证 ==========
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('未登录');
      })
      .then(data => {
        setUser(data.user);
        setProfile(data.user);
      })
      .catch(() => router.push('/login?callback=/chat'))
      .finally(() => setAuthLoading(false));
  }, [router]);

  const fetchProfile = () => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) { setUser(data.user); setProfile(data.user); }
      })
      .catch(() => {});
  };

  // 加载护齿统计数据
  const fetchHealthStats = useCallback(async () => {
    if (!user) return;
    setStatsLoading(true);
    try {
      const res = await fetch('/api/user/stats');
      if (res.ok) {
        const data = await res.json();
        setHealthStats(data.stats);
      }
    } catch {
      // 失败时保持默认值
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileSuccess('');
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      if (res.ok) {
        setProfileSuccess('保存成功');
        setEditingProfile(false);
        fetchProfile();
      } else {
        const d = await res.json();
        setProfileSuccess('保存失败: ' + (d.error || ''));
      }
    } catch {
      setProfileSuccess('保存失败');
    } finally {
      setProfileSaving(false);
    }
  };

  const openProfileEdit = () => {
    setProfileForm({ ...profile });
    setEditingProfile(true);
    setProfileSuccess('');
  };

  // ========== 加载会话列表和活跃会话消息 ==========
  const loadSessions = useCallback(() => {
    if (!user) return;
    fetch('/api/chat?mode=sessions')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.sessions) setSessions(data.sessions);
      })
      .catch(() => {});
  }, [user]);

  const loadMessages = useCallback((sid: string) => {
    if (!user) return;
    fetch('/api/chat?sessionId=' + encodeURIComponent(sid))
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (data.messages) {
          setMessages(data.messages.map((m: any) => ({
            role: m.role,
            content: m.content,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            agent_metadata: m.agent_metadata || undefined,
          })));
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    loadSessions();
    loadMessages(sessionId);
    fetchReminders();
  }, [user]);

  useEffect(() => {
    if (activeNav === 'data') fetchHealthStats();
  }, [activeNav, fetchHealthStats]);

  // ========== 自动滚动 ==========
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ========== 导航切换 ==========
  const handleNavClick = (key: NavKey) => {
    setActiveNav(key);
    setIsSidebarOpen(false);
    if (key === 'appointments') fetchAppointments();
  };

  // ========== 新咨询 ==========
  const startNewChat = () => {
    const newId = `sess_${crypto.randomUUID().slice(0, 8)}`;
    setSessionId(newId);
    setMessages([]);
    setActiveNav('chat');
    setIsSidebarOpen(false);
    setHospitals(null);
    setTimeout(loadSessions, 100);
  };

  const switchSession = (sid: string) => {
    setSessionId(sid);
    setMessages([]);
    setHospitals(null);
    setActiveNav('chat');
    setIsSidebarOpen(false);
    setTimeout(() => loadMessages(sid), 0);
  };

  const deleteSession = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定删除此会话？')) return;
    try {
      const res = await fetch('/api/chat?sessionId=' + encodeURIComponent(sid), { method: 'DELETE' });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.session_id !== sid));
        if (sessionId === sid) startNewChat();
      }
    } catch {}
  };

  // ========== 获取预约 ==========
  const fetchAppointments = async () => {
    setAppointmentsLoading(true);
    try {
      const res = await fetch('/api/appointments/user');
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch {
      console.error('获取预约失败');
    } finally {
      setAppointmentsLoading(false);
    }
  };

  // ========== 获取提醒 ==========
  const fetchReminders = async () => {
    setRemindersLoading(true);
    try {
      const res = await fetch('/api/reminders');
      if (res.ok) {
        const data = await res.json();
        setReminders(data.reminders || []);
      }
    } catch {
      console.error('获取提醒失败');
    } finally {
      setRemindersLoading(false);
    }
  };

  const dismissReminder = async (reminderId: number) => {
    try {
      await fetch('/api/reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId, action: 'dismiss' }),
      });
      setReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch {
      console.error('关闭提醒失败');
    }
  };

  // ========== 发送消息 ==========
  const getCurrentTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userContent = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userContent, time: getCurrentTime() }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userContent, sessionId }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reply,
          time: getCurrentTime(),
          agent_metadata: {
            intent_label: data.intent_label,
            agent_steps: data.agent_steps,
          },
        }]);
      }
      if (data.hospitals) {
        setHospitals(data.hospitals);
      } else {
        setHospitals(null);
      }
      loadSessions();
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '网络连接超时，请重试。', time: getCurrentTime() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ========== 评分功能 ==========
  const rateMessage = async (messageIndex: number, rating: number) => {
    if (!user || !sessionId) return;

    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          rating,
          tags: rating >= 4 ? ['helpful'] : rating <= 2 ? ['needs_improvement'] : [],
        }),
      });

      if (res.ok) {
        setMessages(prev => prev.map((msg, i) => 
          i === messageIndex ? { ...msg, rating, rated: true } : msg
        ));
      }
    } catch {
      console.error('评分失败');
    }
  };

  // ========== 状态文本 ==========
  const getStatusText = (s: string) => {
    if (s === 'pending') return '待确认';
    if (s === 'confirmed') return '已确认';
    if (s === 'cancelled') return '已取消';
    return s;
  };

  const getStatusStyle = (s: string) => {
    if (s === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'confirmed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'cancelled') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  // ========== 加载中 ==========
  if (authLoading) {
    return (
      <div className="h-screen bg-[#f8f9ff] flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#1e293b] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ai-pulse">
            <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>dentistry</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">加载中...</p>
        </div>
      </div>
    );
  }

  // ========== 主内容渲染 ==========
  const renderMainContent = () => {
    switch (activeNav) {
      // ---- 新咨询（聊天） ----
      case 'chat':
        return (
          <>
            {/* 聊天消息区 */}
            <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.length === 0 && (
                  <div className="text-center pt-4 md:pt-8 pb-6">
                    <div className="inline-flex w-16 h-16 md:w-20 md:h-20 bg-[#1e293b] rounded-2xl md:rounded-3xl flex items-center justify-center mb-4 md:mb-6 shadow-lg">
                      <span className="material-symbols-outlined text-white text-4xl md:text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-slate-950 mb-2 tracking-tight">
                      您好，我是 <span className="text-teal-600">AI导诊助手</span>
                    </h3>
                    <p className="text-slate-500 text-xs md:text-sm mb-8 md:mb-12 max-w-md leading-relaxed mx-auto px-2">
                      智能牙科导诊系统，帮您分析口腔症状、推荐就诊科室、匹配附近优质医院并协助预约。
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 w-full max-w-2xl mx-auto">
                      {[
                        { icon: 'monitor_heart', title: '症状导诊', desc: '描述不适，判断就诊科室' },
                        { icon: 'local_hospital', title: '推荐医院', desc: '根据病情匹配优质口腔医院' },
                        { icon: 'event_available', title: '预约挂号', desc: '在线登记预约信息' },
                        { icon: 'emergency', title: '紧急识别', desc: '胸痛等急症立即提示' },
                        { icon: 'map', title: '科室导航', desc: '非口腔症状导诊到对应科室' },
                        { icon: 'help', title: '常见问题', desc: '导诊流程说明' },
                      ].map((item) => (
                        <button
                          key={item.title}
                          onClick={() => setInput(item.desc)}
                          className="bento-card text-left !p-4"
                        >
                          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined text-teal-600">{item.icon}</span>
                          </div>
                          <span className="text-xs md:text-sm font-bold text-slate-800 block tracking-tight">{item.title}</span>
                          <span className="text-[10px] md:text-xs text-slate-400 block mt-0.5">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 提醒区域 */}
                {reminders.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {reminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3 animate-fade-in"
                      >
                        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-amber-600 text-sm">
                            {reminder.reminder_type === 'appointment_1day' ? 'event' :
                             reminder.reminder_type === 'appointment_2hours' ? 'schedule' :
                             reminder.reminder_type === 'checkup' ? 'medical_services' :
                             reminder.reminder_type === 'abandoned_followup' ? 'pending' :
                             'notifications'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-amber-800">{reminder.title}</p>
                          <p className="text-[11px] text-amber-700 mt-0.5 whitespace-pre-wrap">{reminder.content}</p>
                        </div>
                        <button
                          onClick={() => dismissReminder(reminder.id)}
                          className="w-6 h-6 rounded-md hover:bg-amber-100 flex items-center justify-center text-amber-400 hover:text-amber-600 transition-colors flex-shrink-0"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2.5 md:gap-4 ${msg.role === 'user' ? 'justify-end' : ''} animate-fade-in`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 md:w-9 md:h-9 bg-[#1e293b] rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow">
                        <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
                      </div>
                    )}
                    <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[75%]`}>
                      {msg.role === 'assistant' && msg.agent_metadata?.agent_steps && msg.agent_metadata.agent_steps.length > 0 && (
                        <details className="group mb-2 w-full" open>
                          <summary className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400 font-semibold select-none hover:text-slate-600 transition-colors list-none">
                            <span className="material-symbols-outlined text-sm transition-transform group-open:rotate-0 -rotate-90 text-slate-300">expand_more</span>
                            <span>🤖 推理过程</span>
                            <span className="text-slate-300 font-normal">({msg.agent_metadata.agent_steps.length} 步)</span>
                            <span className="ml-auto text-[10px] text-slate-300 font-normal">
                              {msg.agent_metadata.agent_steps.reduce((t, s) => t + s.duration_ms, 0) < 1000
                                ? '<1s'
                                : (msg.agent_metadata.agent_steps.reduce((t, s) => t + s.duration_ms, 0) / 1000).toFixed(1) + 's'}
                            </span>
                          </summary>
                          <div className="mt-2 ml-2 border-l-2 border-slate-100 pl-3 space-y-2">
                            {msg.agent_metadata.agent_steps.map((step, si) => (
                              <div key={si} className="relative flex items-start gap-2 animate-fade-in" style={{ animationDelay: `${si * 80}ms` }}>
                                <div className="absolute -left-[14px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-300 flex-shrink-0" />
                                <div className="flex-1 min-w-0 bg-slate-50/60 rounded-lg px-2.5 py-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px]">{toolIcon(step.tool)}</span>
                                    <span className="text-[11px] font-semibold text-slate-700">{toolName(step.tool)}</span>
                                    <span className={`ml-auto text-[10px] shrink-0 ${step.result_summary.includes('失败') ? 'text-red-400' : step.result_summary.includes('成功') ? 'text-emerald-500' : 'text-slate-400'}`}>
                                      {step.duration_ms < 1000 ? '<1s' : (step.duration_ms / 1000).toFixed(1) + 's'}
                                    </span>
                                  </div>
                                  <p className={`text-[10px] mt-0.5 leading-relaxed ${step.result_summary.includes('失败') ? 'text-red-400' : 'text-slate-500'}`}>{step.result_summary}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                      <div className={`relative px-4 py-2.5 md:px-5 md:py-3.5 rounded-xl md:rounded-2xl ${msg.role === 'user' ? 'bg-gradient-to-br from-[#1e293b] to-[#334155] text-white rounded-tr-sm shadow-sm' : 'bg-white text-slate-800 rounded-tl-sm ring-1 ring-slate-100 shadow-sm'}`}>
                        {msg.role === 'assistant' && msg.agent_metadata?.intent_label && (
                          <span className={intentBadgeClass(msg.agent_metadata.intent_label)}>
                            {intentBadgeText(msg.agent_metadata.intent_label)}
                          </span>
                        )}
                        <p className="whitespace-pre-wrap font-sans text-xs md:text-sm leading-relaxed">{msg.content}</p>
                      </div>
                      {msg.time && <span className="text-[10px] text-slate-400 mt-1 font-medium tracking-tight px-1">{msg.time}</span>}
                      
                      {/* Rating buttons for assistant messages */}
                      {msg.role === 'assistant' && !msg.rated && (
                        <div className="flex items-center gap-1 mt-1.5 px-1">
                          <span className="text-[10px] text-slate-400 mr-1">有帮助？</span>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => rateMessage(i, star)}
                              className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-amber-400 transition-colors"
                              title={`${star}星`}
                            >
                              <span className="material-symbols-outlined text-sm">star</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {msg.role === 'assistant' && msg.rated && (
                        <div className="flex items-center gap-1 mt-1.5 px-1">
                          <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-sm">star</span>
                            已评分 ({msg.rating}星)
                          </span>
                        </div>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 md:w-9 md:h-9 bg-teal-50 rounded-lg md:rounded-xl border border-teal-200 flex items-center justify-center text-teal-700 text-xs font-bold flex-shrink-0 shadow-inner">
                        {(user?.nickname || user?.username || '您')[0]}
                      </div>
                    )}
                  </div>
                ))}

                {/* 医院推荐卡片 */}
                {hospitals && hospitals.length > 0 && (
                  <div className="space-y-3 max-w-3xl mx-auto">
                    <p className="text-xs font-semibold text-slate-500 px-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">local_hospital</span>
                      推荐医院：
                    </p>
                    {hospitals.map((h: any) => (
                      <div key={h.id} className="bento-card !p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{h.name}</h4>
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-amber-500">star</span>
                              {h.rating} · {h.address}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">schedule</span>
                              {h.hours}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">phone</span>
                              {h.phone}
                            </p>
                          </div>
                          {h.booking_url && (
                            <a
                              href={h.booking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-sm">local_hospital</span>
                              挂号
                            </a>
                          )}
                        </div>
                        {h.description && (
                          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-start gap-1">
                            <span className="material-symbols-outlined text-sm text-teal-500 flex-shrink-0">lightbulb</span>
                            {h.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {loading && (
                  <div className="flex gap-2.5 md:gap-4 animate-fade-in">
                    <div className="w-8 h-8 md:w-9 md:h-9 bg-[#1e293b] rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow">
                      <span className="material-symbols-outlined text-white text-sm ai-pulse">smart_toy</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="bg-white/80 backdrop-blur-sm ring-1 ring-white/60 shadow-sm rounded-xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium ml-1">正在分析您的消息...</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-300 bg-white/60 rounded-lg px-3 py-1.5 ml-1 animate-pulse">
                        <span>🧠</span>
                        <span>推理步骤</span>
                        <span className="flex gap-0.5 ml-1">
                          <span className="w-1 h-1 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-1 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-1 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </main>

            {/* 输入框 */}
            <footer className="glass border-t border-white/20 px-4 py-3 md:px-6 md:py-4 shrink-0">
              <div className="max-w-3xl mx-auto">
                <div className="relative flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-teal-200 focus-within:border-teal-300 transition-all shadow-sm">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="描述您的口腔症状（如：左后牙隐痛两天）..."
                    rows={1}
                    className="flex-1 max-h-24 bg-transparent text-slate-900 px-3 py-2 resize-none outline-none placeholder-slate-400 text-sm leading-relaxed"
                    disabled={loading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    className="btn-primary rounded-xl w-10 h-10 flex items-center justify-center shrink-0"
                  >
                    <span className="material-symbols-outlined text-lg">send</span>
                  </button>
                </div>
                <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">AI 建议仅供参考。医疗隐私安全已保护。</p>
              </div>
            </footer>
          </>
        );

      // ---- 我的预约 ----
      case 'appointments':
        return (
          <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">我的预约</h3>
                <button onClick={fetchAppointments} className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  刷新
                </button>
              </div>
              {appointmentsLoading ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse">
                    <span className="text-2xl">📋</span>
                  </div>
                  <p className="text-sm text-slate-400">加载中...</p>
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-16 bento-card">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl text-slate-400">event_busy</span>
                  </div>
                  <p className="text-slate-500 text-sm mb-4">暂无预约记录</p>
                  <button
                    onClick={() => { setActiveNav('chat'); setInput('预约登记'); }}
                    className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold"
                  >立即预约</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((apt) => (
                    <div key={apt.id} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-slate-800">{apt.service_type}</span>
                        <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${getStatusStyle(apt.status)}`}>{getStatusText(apt.status)}</span>
                      </div>
                      <div className="text-xs text-slate-500 space-y-1">
                        <p>🕐 {apt.appointment_time}</p>
                        <p>📱 {apt.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        );

      // ---- 患者档案 ----
      case 'profile':
        return (
          <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">患者档案</h3>
                <button onClick={editingProfile ? () => setEditingProfile(false) : openProfileEdit}
                  className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">{editingProfile ? 'close' : 'edit'}</span>
                  {editingProfile ? '取消' : '编辑'}
                </button>
              </div>

              <div className="bento-card overflow-hidden !p-0">
                <div className="bg-[#1e293b] px-6 py-8 text-center">
                  <div className="w-20 h-20 bg-teal-500/20 rounded-2xl flex items-center justify-center text-teal-400 text-3xl font-bold mx-auto mb-3 border-4 border-white/20 shadow-lg">
                    {(profile?.nickname || profile?.username || '?')[0]}
                  </div>
                  <h4 className="text-white text-lg font-bold">{profile?.nickname || profile?.username}</h4>
                  <p className="text-slate-400 text-xs mt-1">@{profile?.username}</p>
                </div>

                {editingProfile ? (
                  <div className="p-6 space-y-3">
                    {[
                      { key: 'nickname', label: '昵称', type: 'text' },
                      { key: 'phone', label: '手机号', type: 'text' },
                      { key: 'email', label: '邮箱', type: 'email' },
                      { key: 'age', label: '年龄', type: 'number' },
                      { key: 'gender', label: '性别', type: 'select', options: ['', '男', '女'] },
                      { key: 'height', label: '身高(cm)', type: 'number' },
                      { key: 'weight', label: '体重(kg)', type: 'number' },
                      { key: 'region', label: '地区', type: 'text' },
                      { key: 'address', label: '地址', type: 'text' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-[11px] font-semibold text-slate-500 mb-1 block">{f.label}</label>
                        {f.type === 'select' ? (
                          <select value={profileForm[f.key] || ''} onChange={e => setProfileForm({ ...profileForm, [f.key]: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-300 outline-none">
                            {f.options!.map(o => <option key={o} value={o}>{o || '未设置'}</option>)}
                          </select>
                        ) : (
                          <input type={f.type} value={profileForm[f.key] || ''} onChange={e => setProfileForm({ ...profileForm, [f.key]: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-300 outline-none" />
                        )}
                      </div>
                    ))}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 mb-1 block">病史</label>
                      <textarea value={profileForm.medical_history || ''} onChange={e => setProfileForm({ ...profileForm, medical_history: e.target.value })}
                        rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-300 outline-none resize-none" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 mb-1 block">过敏史</label>
                      <textarea value={profileForm.allergies || ''} onChange={e => setProfileForm({ ...profileForm, allergies: e.target.value })}
                        rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-300 outline-none resize-none" />
                    </div>
                    {profileSuccess && <p className={`text-xs font-medium ${profileSuccess.includes('成功') ? 'text-emerald-600' : 'text-red-500'}`}>{profileSuccess}</p>}
                    <button onClick={saveProfile} disabled={profileSaving}
                      className="btn-primary w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                      {profileSaving ? '保存中...' : '保存档案'}
                    </button>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      {[
                        { label: '用户名', value: profile?.username },
                        { label: '昵称', value: profile?.nickname },
                        { label: '手机号', value: profile?.phone },
                        { label: '邮箱', value: profile?.email },
                        { label: '年龄', value: profile?.age },
                        { label: '性别', value: profile?.gender || '-' },
                        { label: '身高', value: profile?.height ? profile.height + ' cm' : '-' },
                        { label: '体重', value: profile?.weight ? profile.weight + ' kg' : '-' },
                        { label: '地区', value: profile?.region },
                        { label: '地址', value: profile?.address },
                      ].map(item => (
                        <div key={item.label} className="py-2 border-b border-slate-50">
                          <span className="text-[10px] text-slate-400 font-medium block mb-0.5">{item.label}</span>
                          <span className="text-sm text-slate-800 font-semibold">{item.value || '-'}</span>
                        </div>
                      ))}
                    </div>
                    {(profile?.medical_history || profile?.allergies) && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                        {profile?.medical_history && (
                          <div>
                            <span className="text-[10px] text-slate-400 font-medium block mb-1">病史</span>
                            <p className="text-sm text-slate-700 bg-amber-50 rounded-lg px-3 py-2">{profile.medical_history}</p>
                          </div>
                        )}
                        {profile?.allergies && (
                          <div>
                            <span className="text-[10px] text-slate-400 font-medium block mb-1">过敏史</span>
                            <p className="text-sm text-slate-700 bg-red-50 rounded-lg px-3 py-2">{profile.allergies}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>
        );

      // ---- 护齿数据 ----
      case 'data':
        return (
          <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">护齿数据</h3>
                {statsLoading && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                    加载中
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { label: '咨询次数', value: statsLoading ? '...' : healthStats.totalChats, icon: 'chat', color: 'bg-teal-50 text-teal-600' },
                  { label: '预约数量', value: statsLoading ? '...' : healthStats.totalAppointments, icon: 'calendar_today', color: 'bg-blue-50 text-blue-600' },
                  { label: '健康评分', value: statsLoading ? '...' : healthStats.healthScore, icon: 'favorite', color: 'bg-rose-50 text-rose-600' },
                  { label: '活跃天数', value: statsLoading ? '...' : healthStats.activeDays, icon: 'today', color: 'bg-amber-50 text-amber-600' },
                ].map((item) => (
                  <div key={item.label} className="bento-card !p-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${item.color}`}>
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{item.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="bento-card">
                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-600">tips_and_updates</span>
                  护齿小贴士
                </h4>
                <div className="space-y-3">
                  {(healthStats.healthScore < 50
                    ? ['建议尽快进行口腔检查，及早发现问题', '每天使用含氟牙膏刷牙两次', '减少甜食和碳酸饮料的摄入', '刷牙后使用漱口水辅助清洁']
                    : healthStats.healthScore < 80
                    ? ['保持每天刷牙两次的好习惯', '使用牙线清洁牙缝，预防牙周病', '每半年进行一次专业洁牙检查', '减少含糖食物摄入，保护牙釉质']
                    : ['继续保持良好的口腔护理习惯', '定期使用牙线和水牙线深层清洁', '每年进行至少一次专业口腔检查', '均衡饮食，多摄入钙质和维生素']
                  ).map((tip, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-slate-600">
                      <span className="w-5 h-5 bg-teal-50 rounded-full flex items-center justify-center text-[10px] text-teal-600 font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        );

      // ---- 系统设置 ----
      case 'settings':
        return (
          <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-end justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{t.settings.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">{t.settings.languageDesc}</p>
                </div>
                <div className="flex items-center gap-1 bg-white/70 rounded-full p-1 border border-white/70 shadow-sm">
                  {(['zh', 'en', 'ja'] as Lang[]).map(item => (
                    <button
                      key={item}
                      onClick={() => setLang(item)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        lang === item ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {t.languageNames[item]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 修改密码弹窗 */}
              {showPasswordModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowPasswordModal(false); setPasswordError(''); setPasswordSuccess(''); }}>
                  <div className="bento-card w-full max-w-md !p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                    <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-teal-600">lock</span>
                      {t.settings.password}
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{lang === 'en' ? 'Current Password' : lang === 'ja' ? '現在のパスワード' : '原密码'}</label>
                        <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder={lang === 'en' ? 'Enter current password' : lang === 'ja' ? '現在のパスワードを入力' : '请输入原密码'} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{lang === 'en' ? 'New Password' : lang === 'ja' ? '新しいパスワード' : '新密码'}</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={lang === 'en' ? 'At least 6 characters' : lang === 'ja' ? '6文字以上' : '至少6个字符'} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{lang === 'en' ? 'Confirm Password' : lang === 'ja' ? 'パスワード確認' : '确认新密码'}</label>
                        <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder={lang === 'en' ? 'Re-enter new password' : lang === 'ja' ? '新しいパスワードを再入力' : '再次输入新密码'} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 transition-all" />
                      </div>
                      {passwordError && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-2.5 font-medium">{passwordError}</p>}
                      {passwordSuccess && <p className="text-teal-600 text-sm bg-teal-50 rounded-xl px-4 py-2.5 font-medium">{passwordSuccess}</p>}
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => { setShowPasswordModal(false); setPasswordError(''); setPasswordSuccess(''); }} className="flex-1 btn-secondary py-2.5 rounded-xl text-sm font-semibold">{lang === 'en' ? 'Cancel' : lang === 'ja' ? 'キャンセル' : '取消'}</button>
                        <button
                          onClick={async () => {
                            setPasswordError(''); setPasswordSuccess('');
                            if (!oldPassword || !newPassword) { setPasswordError(lang === 'en' ? 'Please fill in all fields' : lang === 'ja' ? 'すべての項目を入力してください' : '请填写所有字段'); return; }
                            if (newPassword.length < 6) { setPasswordError(lang === 'en' ? 'New password must be at least 6 characters' : lang === 'ja' ? '新しいパスワードは6文字以上です' : '新密码至少需要6个字符'); return; }
                            if (newPassword !== confirmNewPassword) { setPasswordError(lang === 'en' ? 'Passwords do not match' : lang === 'ja' ? 'パスワードが一致しません' : '两次输入的密码不一致'); return; }
                            setPasswordLoading(true);
                            try {
                              const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPassword, newPassword }) });
                              const data = await res.json();
                              if (!res.ok) { setPasswordError(data.error); return; }
                              setPasswordSuccess(lang === 'en' ? 'Password updated successfully!' : lang === 'ja' ? 'パスワードを更新しました！' : '密码修改成功！');
                              setOldPassword(''); setNewPassword(''); setConfirmNewPassword('');
                            } catch { setPasswordError(lang === 'en' ? 'Network error' : lang === 'ja' ? 'ネットワークエラー' : '网络错误'); } finally { setPasswordLoading(false); }
                          }}
                          disabled={passwordLoading}
                          className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                        >{passwordLoading ? (lang === 'en' ? 'Saving...' : lang === 'ja' ? '保存中...' : '修改中...') : (lang === 'en' ? 'Save Changes' : lang === 'ja' ? '変更を保存' : '确认修改')}</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bento-card overflow-hidden !p-0 divide-y divide-slate-100">
                {[
                  { icon: 'person', label: lang === 'en' ? 'Edit Profile' : lang === 'ja' ? 'プロフィール編集' : '编辑个人资料', desc: lang === 'en' ? 'Update your name and avatar' : lang === 'ja' ? '表示名と头像を更新' : '修改昵称和头像' },
                  { icon: 'notifications', label: lang === 'en' ? 'Notifications' : lang === 'ja' ? '通知' : '消息通知', desc: lang === 'en' ? 'Manage alerts and reminders' : lang === 'ja' ? '通知とリマインダーを管理' : '管理推送和提醒' },
                  { icon: 'lock', label: t.settings.password, desc: t.settings.passwordDesc, onClick: () => setShowPasswordModal(true) },
                  { icon: 'language', label: t.settings.language, desc: lang === 'en' ? 'Switch interface language' : lang === 'ja' ? '表示言語を切り替え' : '切换界面显示语言' },
                  { icon: 'description', label: lang === 'en' ? 'Privacy Policy' : lang === 'ja' ? 'プライバシーポリシー' : '隐私政策', desc: lang === 'en' ? 'View data protection details' : lang === 'ja' ? 'データ保護の詳細を確認' : '查看数据保护说明' },
                  { icon: 'help', label: lang === 'en' ? 'Help & Feedback' : lang === 'ja' ? 'ヘルプとフィードバック' : '帮助与反馈', desc: lang === 'en' ? 'Contact support' : lang === 'ja' ? 'サポートに連絡' : '联系客服支持' },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={item.onClick}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                  >
                    <span className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-slate-600">{item.icon}</span>
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <button
                  onClick={handleLogout}
                  className="w-full bg-red-50 text-red-600 border border-red-100 rounded-xl py-3 text-sm font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  {t.settings.logout}
                </button>
              </div>
            </div>
          </main>
        );
    }
  };

  // ========== 头部标题 ==========
  const getHeaderTitle = () => {
    return t.header[activeNav][0];
  };

  const getHeaderDesc = () => {
    return t.header[activeNav][1];
  };

  return (
    <div className="h-screen bg-slate-100 flex overflow-hidden font-sans selection:bg-sky-100 selection:text-sky-900">

      {/* 背景视频 */}
      <video className="bg-video" autoPlay loop muted playsInline>
        <source src="/background.mp4" type="video/mp4" />
      </video>
      <div className="bg-overlay" />

      {/* 遮罩层 */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* 侧边栏 */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 glass-dark flex flex-col p-4 shadow-2xl transition-transform duration-300 ease-in-out
        md:static md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between pb-5 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1e293b] rounded-xl flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>dentistry</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">{t.appName}</h1>
              <p className="text-[10px] font-semibold text-teal-400 uppercase tracking-widest">{t.appTag}</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white rounded-lg transition-colors">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => item.key === 'chat' ? startNewChat() : handleNavClick(item.key)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeNav === item.key
                  ? 'bg-teal-500/20 text-teal-400'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}

          {/* 历史会话列表 */}
          {sessions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3.5 mb-2">历史会话</p>
              <div className="space-y-0.5">
                {sessions.map((s: any) => (
                  <div key={s.session_id} className="flex items-center gap-0 group">
                    <button
                      onClick={() => switchSession(s.session_id)}
                      className={`flex-1 flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                        sessionId === s.session_id
                          ? 'bg-teal-500/20 text-teal-400'
                          : 'text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm flex-shrink-0">chat_bubble</span>
                      <span className="truncate">{s.first_msg || (lang === 'en' ? 'New chat' : lang === 'ja' ? '新しい会話' : '新对话')}</span>
                    </button>
                    <button onClick={e => deleteSession(s.session_id, e)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      title="删除会话">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
          <div className="bg-white/10 rounded-lg p-2.5 text-[11px] font-mono flex items-center justify-between text-slate-400">
            <span>Session:</span>
            <span className="text-white font-semibold">{sessionId}</span>
          </div>

          <div className="relative">
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/10 transition-colors">
              <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center text-teal-400 text-xs font-bold border border-teal-500/30">
                {(user?.nickname || user?.username || '?')[0]}
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold text-white truncate">{user?.nickname || user?.username}</p>
                <p className="text-[10px] text-slate-400 font-medium">{lang === 'en' ? 'Online' : lang === 'ja' ? 'オンライン' : '在线'}</p>
              </div>
              <span className={`material-symbols-outlined text-sm text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 glass-dark border border-white/10 rounded-xl shadow-lg py-1 z-50">
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="text-[10px] text-slate-400 font-medium">{lang === 'en' ? 'Signed in as' : lang === 'ja' ? 'ログイン中' : '登录为'}</p>
                  <p className="text-xs font-semibold text-white">{user?.username}</p>
                </div>
                <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">logout</span>
                  {t.settings.logout}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 px-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            <span className="text-xs font-bold text-slate-300">{lang === 'en' ? 'Service online' : lang === 'ja' ? 'サービス稼働中' : '服务在线'}</span>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white/55 backdrop-blur-sm">
        <header className="glass border-b border-white/30 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-white/60 transition-colors">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div>
              <h2 className="text-base md:text-xl font-bold text-slate-900 tracking-tight">{getHeaderTitle()}</h2>
              <p className="text-[11px] md:text-sm text-slate-400 md:text-slate-500 hidden sm:block">{getHeaderDesc()}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            {activeNav === 'chat' && (
              <button onClick={startNewChat} className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold hidden sm:flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">add</span>
                {t.cta.newChat}
              </button>
            )}
            <button onClick={() => { setActiveNav('chat'); setInput('预约登记'); }} className="btn-primary px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">event_available</span>
              {t.cta.book}
            </button>
          </div>
        </header>

        {renderMainContent()}
      </div>
    </div>
  );
}
