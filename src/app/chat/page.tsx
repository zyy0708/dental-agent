'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ========== 类型定义 ==========
interface Message {
  role: 'user' | 'assistant';
  content: string;
  time?: string;
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

const navItems: { key: NavKey; icon: string; label: string }[] = [
  { key: 'chat', icon: '➕', label: '新咨询' },
  { key: 'appointments', icon: '📋', label: '我的预约' },
  { key: 'profile', icon: '👥', label: '患者档案' },
  { key: 'data', icon: '📊', label: '护齿数据' },
  { key: 'settings', icon: '⚙️', label: '系统设置' },
];

export default function Home() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeNav, setActiveNav] = useState<NavKey>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 预约相关状态
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  // 统计相关状态
  const chatCount = messages.filter(m => m.role === 'user').length;

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

  // ========== 认证 ==========
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('未登录');
      })
      .then(data => setUser(data.user))
      .catch(() => router.push('/login?callback=/chat'))
      .finally(() => setAuthLoading(false));
  }, [router]);

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
          })));
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    loadSessions();
    loadMessages(sessionId);
  }, [user]);

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
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply, time: getCurrentTime() }]);
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
      <div className="h-screen bg-slate-100 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg animate-pulse">🦷</div>
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
                    <div className="inline-flex w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl md:rounded-3xl flex items-center justify-center text-4xl md:text-5xl mb-4 md:mb-6 shadow-md ring-1 ring-slate-100">🦷</div>
                    <h3 className="text-xl md:text-2xl font-bold text-slate-950 mb-2 tracking-tight">
                      您好，我是 <span className="text-sky-600">AI导诊助手</span>
                    </h3>
                    <p className="text-slate-500 text-xs md:text-sm mb-8 md:mb-12 max-w-md leading-relaxed mx-auto px-2">
                      智能牙科导诊系统，帮您分析口腔症状、推荐就诊科室、匹配附近优质医院并协助预约。
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 w-full max-w-2xl mx-auto">
                      {[
                        { icon: '🦷', title: '症状导诊', desc: '描述不适，判断就诊科室' },
                        { icon: '🏥', title: '推荐医院', desc: '根据病情匹配优质口腔医院' },
                        { icon: '📋', title: '预约挂号', desc: '在线登记预约信息' },
                        { icon: '⚠️', title: '紧急识别', desc: '胸痛等急症立即提示' },
                        { icon: '🧑‍⚕️', title: '科室导航', desc: '非口腔症状导诊到对应科室' },
                        { icon: '❓', title: '常见问题', desc: '导诊流程说明' },
                      ].map((item) => (
                        <button
                          key={item.title}
                          onClick={() => setInput(item.desc)}
                          className="bg-white border border-slate-100 hover:border-sky-200 rounded-xl md:rounded-2xl p-3.5 md:p-4 text-left transition-all hover:shadow-md active:scale-[0.98]"
                        >
                          <span className="text-2xl block mb-2">{item.icon}</span>
                          <span className="text-xs md:text-sm font-bold text-slate-800 block tracking-tight">{item.title}</span>
                          <span className="text-[10px] md:text-xs text-slate-400 block mt-0.5">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2.5 md:gap-4 ${msg.role === 'user' ? 'justify-end' : ''} animate-fade-in`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 md:w-9 md:h-9 bg-slate-900 rounded-lg md:rounded-xl flex items-center justify-center text-white text-sm flex-shrink-0 mt-0.5 shadow">🦷</div>
                    )}
                    <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[75%]`}>
                      <div className={`px-4 py-2.5 md:px-5 md:py-3.5 rounded-xl md:rounded-2xl ${msg.role === 'user' ? 'bg-sky-600 text-white rounded-tr-sm shadow-sm' : 'bg-white text-slate-800 rounded-tl-sm ring-1 ring-slate-100 shadow-sm'}`}>
                        <p className="whitespace-pre-wrap font-sans text-xs md:text-sm leading-relaxed">{msg.content}</p>
                      </div>
                      {msg.time && <span className="text-[10px] text-slate-400 mt-1 font-medium tracking-tight px-1">{msg.time}</span>}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 md:w-9 md:h-9 bg-sky-100 rounded-lg md:rounded-xl border border-sky-200 flex items-center justify-center text-sky-700 text-xs font-bold flex-shrink-0 shadow-inner">
                        {(user?.nickname || user?.username || '您')[0]}
                      </div>
                    )}
                  </div>
                ))}

                {/* 医院推荐卡片 */}
                {hospitals && hospitals.length > 0 && (
                  <div className="space-y-3 max-w-3xl mx-auto">
                    <p className="text-xs font-semibold text-slate-500 px-1">推荐医院：</p>
                    {hospitals.map((h: any) => (
                      <div key={h.id} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{h.name}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">⭐ {h.rating} · {h.address}</p>
                            <p className="text-xs text-slate-400 mt-0.5">??? {h.hours}</p>
                            <p className="text-xs text-slate-400 mt-0.5">📞 {h.phone}</p>
                          </div>
                          {h.booking_url && (
                            <a
                              href={h.booking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-sky-700 transition-colors shadow-sm flex items-center gap-1.5"
                            >
                              🏥 挂号
                            </a>
                          )}
                        </div>
                        {h.description && (
                          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-50">
                            💡 {h.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {loading && (
                  <div className="flex gap-2.5 md:gap-4 animate-fade-in">
                    <div className="w-8 h-8 md:w-9 md:h-9 bg-slate-900 rounded-lg md:rounded-xl flex items-center justify-center text-white text-sm flex-shrink-0 mt-0.5 shadow">🦷</div>
                    <div className="bg-white ring-1 ring-slate-100 shadow-sm rounded-xl rounded-tl-sm px-4 py-3 flex items-center">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </main>

            {/* 输入框 */}
            <footer className="bg-white border-t border-slate-100 px-4 py-3 md:px-6 md:py-4 shrink-0">
              <div className="max-w-3xl mx-auto">
                <div className="relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-sky-200 focus-within:bg-white transition-all">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="在此输入您的症状或问题..."
                    rows={1}
                    className="flex-1 max-h-24 bg-transparent text-slate-900 px-2 py-1.5 md:py-2 resize-none outline-none placeholder-slate-400 text-xs md:text-sm leading-relaxed"
                    disabled={loading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-lg w-9 h-9 md:w-10 md:h-10 flex items-center justify-center transition-all active:scale-95 shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
                    </svg>
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
                <button onClick={fetchAppointments} className="text-xs text-sky-600 hover:text-sky-700 font-semibold">刷新</button>
              </div>
              {appointmentsLoading ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse">
                    <span className="text-2xl">📋</span>
                  </div>
                  <p className="text-sm text-slate-400">加载中...</p>
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-slate-500 text-sm mb-4">暂无预约记录</p>
                  <button
                    onClick={() => { setActiveNav('chat'); setInput('预约登记'); }}
                    className="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-sky-700 transition-colors"
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
              <h3 className="text-lg font-bold text-slate-900 mb-6">患者档案</h3>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="bg-slate-900 px-6 py-8 text-center">
                  <div className="w-20 h-20 bg-sky-100 rounded-2xl flex items-center justify-center text-sky-700 text-3xl font-bold mx-auto mb-3 border-4 border-white shadow-lg">
                    {(user?.nickname || user?.username || '?')[0]}
                  </div>
                  <h4 className="text-white text-lg font-bold">{user?.nickname || user?.username}</h4>
                  <p className="text-slate-400 text-xs mt-1">@{user?.username}</p>
                </div>
                <div className="p-6 space-y-4">
                  {[
                    { label: '用户名', value: user?.username || '-' },
                    { label: '昵称', value: user?.nickname || '-' },
                    { label: '会话ID', value: sessionId },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-50">
                      <span className="text-xs text-slate-500 font-medium">{item.label}</span>
                      <span className="text-sm text-slate-800 font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 bg-sky-50 border border-sky-100 rounded-xl p-4 text-center">
                <p className="text-xs text-sky-700 font-medium">💡 完善个人信息有助于我们提供更精准的牙科建议</p>
              </div>
            </div>
          </main>
        );

      // ---- 护齿数据 ----
      case 'data':
        return (
          <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-lg font-bold text-slate-900 mb-6">护齿数据</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { label: '咨询次数', value: chatCount, icon: '💬', color: 'bg-sky-50 text-sky-700' },
                  { label: '预约数量', value: appointments.length, icon: '📋', color: 'bg-emerald-50 text-emerald-700' },
                  { label: '健康评分', value: '85', icon: '❤️', color: 'bg-rose-50 text-rose-700' },
                  { label: '活跃天数', value: '1', icon: '📅', color: 'bg-amber-50 text-amber-700' },
                ].map((item) => (
                  <div key={item.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${item.color}`}>{item.icon}</span>
                    </div>
                    <p className="text-2xl font-extrabold text-slate-900">{item.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
                <h4 className="text-sm font-bold text-slate-800 mb-4">🦷 护齿小贴士</h4>
                <div className="space-y-3">
                  {[
                    '每天刷牙至少两次，每次不少于2分钟',
                    '使用牙线清洁牙缝，预防牙周病',
                    '每半年进行一次专业洁牙检查',
                    '减少含糖食物摄入，保护牙釉质',
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-slate-600">
                      <span className="w-5 h-5 bg-sky-50 rounded-full flex items-center justify-center text-[10px] text-sky-600 font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
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
              <h3 className="text-lg font-bold text-slate-900 mb-6">系统设置</h3>

              {/* 修改密码弹窗 */}
              {showPasswordModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowPasswordModal(false); setPasswordError(''); setPasswordSuccess(''); }}>
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                    <h4 className="text-lg font-bold text-slate-900 mb-4">修改密码</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">原密码</label>
                        <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="请输入原密码" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">新密码</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="至少6个字符" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">确认新密码</label>
                        <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="再次输入新密码" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all" />
                      </div>
                      {passwordError && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-2.5 font-medium">{passwordError}</p>}
                      {passwordSuccess && <p className="text-emerald-600 text-sm bg-emerald-50 rounded-xl px-4 py-2.5 font-medium">{passwordSuccess}</p>}
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => { setShowPasswordModal(false); setPasswordError(''); setPasswordSuccess(''); }} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors">取消</button>
                        <button
                          onClick={async () => {
                            setPasswordError(''); setPasswordSuccess('');
                            if (!oldPassword || !newPassword) { setPasswordError('请填写所有字段'); return; }
                            if (newPassword.length < 6) { setPasswordError('新密码至少需要6个字符'); return; }
                            if (newPassword !== confirmNewPassword) { setPasswordError('两次输入的密码不一致'); return; }
                            setPasswordLoading(true);
                            try {
                              const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPassword, newPassword }) });
                              const data = await res.json();
                              if (!res.ok) { setPasswordError(data.error); return; }
                              setPasswordSuccess('密码修改成功！');
                              setOldPassword(''); setNewPassword(''); setConfirmNewPassword('');
                            } catch { setPasswordError('网络错误'); } finally { setPasswordLoading(false); }
                          }}
                          disabled={passwordLoading}
                          className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >{passwordLoading ? '修改中...' : '确认修改'}</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
                {[
                  { icon: '👤', label: '编辑个人资料', desc: '修改昵称和头像' },
                  { icon: '🔔', label: '消息通知', desc: '管理推送和提醒' },
                  { icon: '🔒', label: '修改密码', desc: '更新账户密码', onClick: () => setShowPasswordModal(true) },
                  { icon: '🌙', label: '深色模式', desc: '即将推出' },
                  { icon: '📄', label: '隐私政策', desc: '查看数据保护说明' },
                  { icon: '❓', label: '帮助与反馈', desc: '联系客服支持' },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={item.onClick}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                  >
                    <span className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-lg">{item.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                    <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <button
                  onClick={handleLogout}
                  className="w-full bg-red-50 text-red-600 border border-red-100 rounded-xl py-3 text-sm font-semibold hover:bg-red-100 transition-colors"
                >退出登录</button>
              </div>
            </div>
          </main>
        );
    }
  };

  // ========== 头部标题 ==========
  const getHeaderTitle = () => {
    switch (activeNav) {
      case 'chat': return 'AI导诊';
      case 'appointments': return '我的预约';
      case 'profile': return '患者档案';
      case 'data': return '护齿数据';
      case 'settings': return '系统设置';
    }
  };

  const getHeaderDesc = () => {
    switch (activeNav) {
      case 'chat': return '症状分析 · 科室推荐 · 医院匹配';
      case 'appointments': return '查看和管理您的预约记录';
      case 'profile': return '查看您的个人信息';
      case 'data': return '查看您的护齿健康数据';
      case 'settings': return '管理您的账户设置';
    }
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
        fixed inset-y-0 left-0 z-50 w-64 bg-white/80 backdrop-blur-md border-r border-white/40 flex flex-col p-4 shadow-2xl transition-transform duration-300 ease-in-out
        md:static md:translate-x-0 md:shadow-[10px_0_15px_-5px_rgba(0,0,0,0.02)]
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between pb-5 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white text-lg shadow-md">🦷</div>
            <div>
              <h1 className="text-base font-extrabold text-slate-950 tracking-tight">Dental <span className="text-sky-600">Agent</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">牙小助 AI 平台</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">✕</button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => item.key === 'chat' ? startNewChat() : handleNavClick(item.key)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeNav === item.key
                  ? 'bg-sky-50 text-sky-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <span className="text-base w-5 h-5 flex items-center justify-center">{item.icon}</span>
              {item.label}
            </button>
          ))}

          {/* 历史会话列表 */}
          {sessions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3.5 mb-2">历史会话</p>
              <div className="space-y-0.5">
                {sessions.map((s: any) => (
                  <button
                    key={s.session_id}
                    onClick={() => switchSession(s.session_id)}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                      sessionId === s.session_id
                        ? 'bg-sky-50 text-sky-700'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    <span className="text-base flex-shrink-0">💬</span>
                    <span className="truncate">{s.first_msg || '新对话'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[11px] font-mono flex items-center justify-between text-slate-500">
            <span>Session:</span>
            <span className="text-slate-700 font-semibold">{sessionId}</span>
          </div>

          <div className="relative">
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center text-sky-700 text-xs font-bold border border-sky-200">
                {(user?.nickname || user?.username || '?')[0]}
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold text-slate-800 truncate">{user?.nickname || user?.username}</p>
                <p className="text-[10px] text-slate-400 font-medium">在线</p>
              </div>
              <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-[10px] text-slate-400 font-medium">登录为</p>
                  <p className="text-xs font-semibold text-slate-800">{user?.username}</p>
                </div>
                <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors font-medium flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  退出登录
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 px-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-slate-600">服务在线</span>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white/60 backdrop-blur-sm">
        <header className="bg-white/80 backdrop-blur-md border-b border-white/40 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between shadow-[0_4px_12px_-5px_rgba(0,0,0,0.02)] z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div>
              <h2 className="text-base md:text-xl font-bold text-slate-900 tracking-tight">{getHeaderTitle()}</h2>
              <p className="text-[11px] md:text-sm text-slate-400 md:text-slate-500 hidden sm:block">{getHeaderDesc()}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            {activeNav === 'chat' && (
              <button onClick={startNewChat} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors hidden sm:block">新对话</button>
            )}
            <button onClick={() => { setActiveNav('chat'); setInput('预约登记'); }} className="bg-sky-600 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs font-bold hover:bg-sky-700 shadow-sm transition-colors active:scale-95">立即预约</button>
          </div>
        </header>

        {renderMainContent()}
      </div>
    </div>
  );
}
