'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

const navItems = [
  { icon: '➕', label: '新咨询', active: true },
  { icon: '📋', label: '我的预约', active: false },
  { icon: '👥', label: '患者档案', active: false },
  { icon: '📊', label: '护齿数据', active: false },
  { icon: '⚙️', label: '系统设置', active: false },
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [sessionId] = useState(() => `sess_${crypto.randomUUID().slice(0, 8)}`);

  // 检查登录状态
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('未登录');
      })
      .then(data => setUser(data.user))
      .catch(() => router.push('/login'))
      .finally(() => setAuthLoading(false));
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userContent = input.trim();
    setInput('');
    const userMessage: Message = { role: 'user', content: userContent, time: getCurrentTime() };
    setMessages(prev => [...prev, userMessage]);
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

  // 加载中
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

  return (
    <div className="h-screen bg-slate-100 flex overflow-hidden font-sans selection:bg-sky-100 selection:text-sky-900">

      {/* 1. 移动端侧边栏背景遮罩 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 2. 响应式侧边栏 */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col p-4 shadow-2xl transition-transform duration-300 ease-in-out
        md:static md:translate-x-0 md:shadow-[10px_0_15px_-5px_rgba(0,0,0,0.02)]
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* 侧边栏头部 */}
        <div className="flex items-center justify-between pb-5 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white text-lg shadow-md">🦷</div>
            <div>
              <h1 className="text-base font-extrabold text-slate-950 tracking-tight">Dental <span className="text-sky-600">Agent</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">牙小助 AI 平台</p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors"
          >✕</button>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setIsSidebarOpen(false)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                item.active
                  ? 'bg-sky-50 text-sky-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <span className="text-base w-5 h-5 flex items-center justify-center">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* 侧边栏底部 */}
        <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[11px] font-mono flex items-center justify-between text-slate-500">
            <span>Session:</span>
            <span className="text-slate-700 font-semibold">{sessionId}</span>
          </div>

          {/* 用户信息 + 退出 */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 transition-colors"
            >
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
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors font-medium flex items-center gap-2"
                >
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

      {/* 3. 主内容区 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50">

        {/* 顶部导航栏 */}
        <header className="bg-white border-b border-slate-100 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between shadow-[0_4px_12px_-5px_rgba(0,0,0,0.02)] z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div>
              <h2 className="text-base md:text-xl font-bold text-slate-900 tracking-tight">护齿咨询工作台</h2>
              <p className="text-[11px] md:text-sm text-slate-400 md:text-slate-500 hidden sm:block">由牙小助 AI 提供实时牙科健康支持</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <button className="bg-sky-600 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs font-bold hover:bg-sky-700 shadow-sm transition-colors active:scale-95">
              立即预约
            </button>
          </div>
        </header>

        {/* 4. 聊天消息区 */}
        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* 欢迎页 */}
            {messages.length === 0 && (
              <div className="text-center pt-4 md:pt-8 pb-6">
                <div className="inline-flex w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl md:rounded-3xl flex items-center justify-center text-4xl md:text-5xl mb-4 md:mb-6 shadow-md ring-1 ring-slate-100">🦷</div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-950 mb-2 tracking-tight">
                  欢迎使用 <span className="text-sky-600">牙小助 AI</span>
                </h3>
                <p className="text-slate-500 text-xs md:text-sm mb-8 md:mb-12 max-w-md leading-relaxed mx-auto px-2">
                  您可以向我咨询牙痛紧急处理、牙齿矫正方案、洗牙或种植牙相关的专业医学建议。
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 w-full max-w-2xl mx-auto">
                  {[
                    { icon: '🪥', title: '洗牙咨询' },
                    { icon: '😁', title: '牙齿矫正' },
                    { icon: '🦷', title: '种植牙修复' },
                    { icon: '💊', title: '牙痛急救' },
                    { icon: '✨', title: '牙齿美白' },
                    { icon: '📅', title: '预约检查' },
                  ].map((item) => (
                    <button
                      key={item.title}
                      onClick={() => setInput(item.title)}
                      className="bg-white border border-slate-100 hover:border-sky-200 rounded-xl md:rounded-2xl p-3.5 md:p-4 text-left transition-all hover:shadow-md active:scale-[0.98]"
                    >
                      <span className="text-2xl block mb-2">{item.icon}</span>
                      <span className="text-xs md:text-sm font-bold text-slate-800 block tracking-tight">{item.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 消息列表 */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 md:gap-4 ${msg.role === 'user' ? 'justify-end' : ''} animate-fade-in`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 md:w-9 md:h-9 bg-slate-900 rounded-lg md:rounded-xl flex items-center justify-center text-white text-sm flex-shrink-0 mt-0.5 shadow">🦷</div>
                )}
                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[75%]`}>
                  <div
                    className={`px-4 py-2.5 md:px-5 md:py-3.5 rounded-xl md:rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-sky-600 text-white rounded-tr-sm shadow-sm'
                        : 'bg-white text-slate-800 rounded-tl-sm ring-1 ring-slate-100 shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap font-sans text-xs md:text-sm leading-relaxed">{msg.content}</p>
                  </div>
                  {msg.time && (
                    <span className="text-[10px] text-slate-400 mt-1 font-medium tracking-tight px-1">{msg.time}</span>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 md:w-9 md:h-9 bg-sky-100 rounded-lg md:rounded-xl border border-sky-200 flex items-center justify-center text-sky-700 text-xs font-bold flex-shrink-0 shadow-inner">
                    {(user?.nickname || user?.username || '您')[0]}
                  </div>
                )}
              </div>
            ))}

            {/* 加载动画 */}
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

        {/* 5. 底部输入框 */}
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
      </div>
    </div>
  );
}
