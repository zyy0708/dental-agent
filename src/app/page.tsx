'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 定义消息类型
interface Message {
  role: 'user' | 'assistant';
  content: string;
  time?: string;
}

// 定义用户类型
interface User {
  id: number;
  username: string;
  nickname?: string;
}

// 侧边栏导航项
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

  // 加载中状态
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg animate-pulse">
            🦷
          </div>
          <p className="text-sm text-slate-500 font-medium">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans selection:bg-sky-100 selection:text-sky-900">

      {/* 1. 侧边栏 */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-4 shadow-[10px_0_15px_-5px_rgba(0,0,0,0.02)]">
        {/* Logo */}
        <div className="flex items-center gap-3 pb-6 mb-4 border-b border-slate-100">
          <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center text-white text-xl shadow-md">
            🦷
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-950 tracking-tight">Dental <span className="text-sky-600">Agent</span></h1>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">牙小助 AI 平台</p>
          </div>
        </div>

        {/* 导航项 */}
        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                item.active
                  ? 'bg-sky-50 text-sky-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <span className="text-lg w-5 h-5 flex items-center justify-center">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* 底部：Session + 用户信息 */}
        <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-500 font-mono flex items-center justify-between">
            <span>Session:</span>
            <span className="text-slate-800">{sessionId}</span>
          </div>

          {/* 用户信息 + 下拉菜单 */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="w-9 h-9 bg-sky-100 rounded-xl flex items-center justify-center text-sky-700 text-sm font-bold border border-sky-200">
                {(user?.nickname || user?.username || '?')[0]}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.nickname || user?.username}</p>
                <p className="text-[10px] text-slate-400 font-medium">在线</p>
              </div>
              <svg className={`w-4 h-4 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 下拉菜单 */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs text-slate-400 font-medium">登录为</p>
                  <p className="text-sm font-semibold text-slate-800">{user?.username}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 2. 主内容区 */}
      <div className="flex-1 flex flex-col">

        {/* 顶部头部 */}
        <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-[0_5px_15px_-5px_rgba(0,0,0,0.02)] sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">护齿咨询工作台</h2>
            <p className="text-sm text-slate-500">向您的智能助手提问，了解专业的牙科建议</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors">
              历史记录
            </button>
            <button className="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-sky-700 shadow-sm transition-colors active:scale-95">
              立即预约
            </button>
          </div>
        </header>

        {/* 3. 聊天区域 */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

            {/* 欢迎页 */}
            {messages.length === 0 && (
              <div className="text-center pt-8 pb-10">
                <div className="inline-flex w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-5xl mb-6 shadow-xl ring-1 ring-slate-100">
                  🦷
                </div>
                <h3 className="text-2xl font-bold text-slate-950 mb-3 tracking-tight">
                  欢迎来到 <span className="text-sky-600">牙小助 AI</span> 咨询平台
                </h3>
                <p className="text-slate-600 text-sm mb-12 text-center max-w-lg leading-relaxed mx-auto">
                  无论您对牙齿健康、治疗方案或预约流程有何疑问，我都在此为您提供实时的智能咨询服务。
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-5 w-full max-w-3xl mx-auto px-4">
                  {[
                    { icon: '🪥', title: '洗牙咨询', desc: '定期洁牙建议' },
                    { icon: '😁', title: '牙齿矫正', desc: '了解矫正方案' },
                    { icon: '🦷', title: '种植牙', desc: '缺牙修复方案' },
                    { icon: '💊', title: '牙痛急救', desc: '缓解疼痛建议' },
                    { icon: '✨', title: '牙齿美白', desc: '美白方案咨询' },
                    { icon: '✍️', title: '预约登记', desc: '预约到店检查' },
                  ].map((item) => (
                    <button
                      key={item.title}
                      onClick={() => setInput(item.title)}
                      className="group bg-white border border-slate-100 hover:border-sky-100 rounded-2xl p-5 text-left transition-all duration-200 hover:shadow-lg hover:shadow-sky-500/5 hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                      <span className="text-3xl block mb-4 w-12 h-12 flex items-center justify-center rounded-xl bg-slate-50 group-hover:bg-sky-50 transition-colors">{item.icon}</span>
                      <span className="text-sm font-bold text-slate-800 block mb-1 tracking-tight">{item.title}</span>
                      <span className="text-xs text-slate-500 block">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 消息列表 */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''} animate-fade-in`}>
                {msg.role === 'assistant' && (
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0 mt-0.5 shadow">
                    🦷
                  </div>
                )}

                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[75%]`}>
                  <div
                    className={`px-5 py-3.5 rounded-xl ${
                      msg.role === 'user'
                        ? 'bg-sky-600 text-white rounded-tr-sm shadow-md shadow-sky-500/10'
                        : 'bg-white text-slate-800 rounded-tl-sm ring-1 ring-slate-100 shadow'
                    }`}
                  >
                    <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                  {msg.time && (
                    <span className="text-[10px] text-slate-400 mt-1.5 font-medium tracking-tight">
                      {msg.role === 'user' ? '您' : '牙小助'} 于 {msg.time}
                    </span>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-10 h-10 bg-sky-100 rounded-xl border-2 border-sky-200 flex items-center justify-center text-sky-700 text-sm flex-shrink-0 font-bold shadow-inner">
                    {(user?.nickname || user?.username || '您')[0]}
                  </div>
                )}
              </div>
            ))}

            {/* 加载动画 */}
            {loading && (
              <div className="flex gap-4 animate-fade-in">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0 mt-0.5 shadow">
                  🦷
                </div>
                <div className="flex flex-col items-start max-w-[75%]">
                  <div className="bg-white ring-1 ring-slate-100 shadow rounded-xl rounded-tl-sm px-5 py-4 flex items-center">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-slate-200 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </main>

        {/* 4. 输入区域 */}
        <footer className="bg-white border-t border-slate-100 sticky bottom-0 px-6 py-4 mt-auto">
          <div className="relative flex items-end gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5 shadow-inner focus-within:ring-2 focus-within:ring-sky-200 focus-within:bg-white transition-all duration-150">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="请详细描述您的症状，例如：左下后牙疼痛..."
              rows={1}
              className="flex-1 max-h-40 bg-transparent text-slate-900 px-2 py-2 resize-none outline-none placeholder-slate-400 text-sm leading-relaxed"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-lg px-4.5 py-2.5 transition-all active:scale-95 flex items-center justify-center h-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-between mt-3 text-slate-400 text-[11px] font-medium tracking-tight">
            <span>AI 代理建议仅供参考，不构成医疗诊断。</span>
            <span>隐私保护已开启 · 牙小助 v1.0</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
