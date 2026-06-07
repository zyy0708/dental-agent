'use client';

import { useState, useRef, useEffect } from 'react';

// 定义消息类型
interface Message {
  role: 'user' | 'assistant';
  content: string;
  time?: string;
}

// 模拟侧边栏导航项
const navItems = [
  { icon: '➕', label: '新咨询', active: true },
  { icon: '📋', label: '我的预约', active: false },
  { icon: '👥', label: '患者档案', active: false },
  { icon: '📊', label: '护齿数据', active: false },
  { icon: '⚙️', label: '系统设置', active: false },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 模拟发送时间和生成 SessionId
  const [sessionId] = useState(() => `sess_${crypto.randomUUID().slice(0, 8)}`);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userContent = input.trim();
    setInput('');
    const userMessage: Message = { role: 'user', content: userContent, time: getCurrentTime() };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      // 此处保留您的原API调用逻辑
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userContent, sessionId }),
      });

      const data = await res.json();

      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply, time: getCurrentTime() }]);
      }
    } catch (error) {
      console.error('发送失败:', error);
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

  return (
    // 使用深石板灰色作为背景，让内容区域更突出
    <div className="min-h-screen bg-slate-100 flex font-sans selection:bg-sky-100 selection:text-sky-900">

      {/* 1. 全新侧边栏 (Sidebar Navigation) - 提升平台专业感 */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-4 shadow-[10px_0_15px_-5px_rgba(0,0,0,0.02)]">
        {/* Logo 区域 */}
        <div className="flex items-center gap-3 pb-6 mb-4 border-b border-slate-100">
          <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center text-white text-xl shadow-md">
            🦷
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-950 tracking-tight">Dental <span className="text-sky-600">Agent</span></h1>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">牙小助 AI 平台</p>
          </div>
        </div>

        {/* 导航项列表 */}
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

        {/* 底部：Session ID 展示和用户状态 */}
        <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-500 font-mono flex items-center justify-between">
            <span>Session:</span>
            <span className="text-slate-800">{sessionId}</span>
          </div>
          <div className="flex items-center gap-3 bg-white px-1">
            <div className="relative h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
            </div>
            <span className="text-xs font-bold text-slate-700">系统服务在线</span>
          </div>
        </div>
      </aside>

      {/* 2. 主内容区域 (Main Content Area) - 包含头部和聊天窗口 */}
      <div className="flex-1 flex flex-col">

        {/* 顶部面板头部 (Clean Header) */}
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

        {/* 3. 聊天显示区域 (Chat Display Area) - 更严谨、清晰的信息层级 */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

            {/* 欢迎消息：功能建议块 (Refined Cards) */}
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

                {/* 建议项 - 更多克制、更严谨的形状 */}
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

            {/* 消息列表：现代扁平化样式 (Structured Messages) */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''} animate-fade-in`}>

                {/* AI 头像 - 移到消息内容旁边 */}
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
                    {/* 使用 normal font-sans 弃用 pre */}
                    <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                  {/* 发送时间戳 */}
                  {msg.time && (
                    <span className="text-[10px] text-slate-400 mt-1.5 font-medium tracking-tight">
                      {msg.role === 'user' ? '您' : '牙小助'} 于 {msg.time}
                    </span>
                  )}
                </div>

                {/* 模拟用户头像 (User Avatar) */}
                {msg.role === 'user' && (
                  <div className="w-10 h-10 bg-sky-100 rounded-xl border-2 border-sky-200 flex items-center justify-center text-sky-700 text-sm flex-shrink-0 font-bold shadow-inner">
                    您
                  </div>
                )}
              </div>
            ))}

            {/* 加载动画 (Clean Dots) */}
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

        {/* 4. 底部输入区域 (Input Section) - 结构稳定、克制设计 */}
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
              {/* 发送图标 SVG */}
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
