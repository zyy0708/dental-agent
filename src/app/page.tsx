'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId }),
      });

      const data = await res.json();

      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (error) {
      console.error('发送失败:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: '网络错误，请稍后再试。' }]);
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* 顶部导航 (更具通透感的毛玻璃) */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-white/50 sticky top-0 z-50 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-teal-500/20">
            🦷
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 tracking-tight">牙小助 AI</h1>
            <p className="text-[11px] font-medium text-teal-600/80 uppercase tracking-wider">智能护齿专家</p>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-emerald-700">在线</span>
          </div>
        </div>
      </header>

      {/* 聊天区域 */}
      <main className="flex-1 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {/* 欢迎消息 */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-8 pb-10 animate-fade-in-up">
              <div className="w-24 h-24 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-[2rem] flex items-center justify-center text-5xl mb-6 shadow-2xl shadow-teal-500/20 ring-4 ring-white">
                🦷
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3">您好，欢迎咨询</h2>
              <p className="text-slate-500 text-sm mb-10 text-center max-w-md leading-relaxed">
                我是您的专属智能牙科助手。<br/>您可以向我提问关于牙齿健康、治疗方案的任何问题。
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-2xl px-2">
                {[
                  { icon: '🪥', text: '洗牙咨询', desc: '定期洁牙建议' },
                  { icon: '😁', text: '牙齿矫正', desc: '了解矫正方案' },
                  { icon: '💺', text: '种植牙', desc: '缺牙修复方案' },
                  { icon: '💊', text: '牙痛急救', desc: '缓解疼痛建议' },
                  { icon: '✨', text: '牙齿美白', desc: '美白方案咨询' },
                  { icon: '🗓️', text: '预约登记', desc: '预约到店检查' },
                ].map((item) => (
                  <button
                    key={item.text}
                    onClick={() => setInput(item.text)}
                    className="group bg-white/80 backdrop-blur-sm border border-slate-100 hover:border-teal-200 rounded-3xl p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/5 hover:-translate-y-1"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 group-hover:bg-teal-50 flex items-center justify-center text-xl mb-3 transition-colors">
                      {item.icon}
                    </div>
                    <span className="text-sm font-semibold text-slate-700 block mb-1">{item.text}</span>
                    <span className="text-xs text-slate-400 block">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 消息列表 */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              {msg.role === 'assistant' && (
                <div className="w-9 h-9 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-xl flex items-center justify-center text-white text-sm mr-3 mt-1 flex-shrink-0 shadow-md shadow-teal-200">
                  🦷
                </div>
              )}
              <div
                className={`max-w-[80%] md:max-w-[70%] px-5 py-3.5 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-3xl rounded-tr-sm shadow-md shadow-teal-500/20'
                    : 'bg-white text-slate-700 rounded-3xl rounded-tl-sm shadow-sm ring-1 ring-slate-100/50'
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed">
                  {msg.content}
                </pre>
              </div>
            </div>
          ))}

          {/* 加载动画 (呼吸感三个点) */}
          {loading && (
            <div className="flex justify-start">
              <div className="w-9 h-9 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-xl flex items-center justify-center text-white text-sm mr-3 mt-1 flex-shrink-0 shadow-md shadow-teal-200">
                🦷
              </div>
              <div className="bg-white ring-1 ring-slate-100/50 rounded-3xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-teal-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>
      </main>

      {/* 底部输入区域 (现代化胶囊设计) */}
      <footer className="sticky bottom-0 bg-white/60 backdrop-blur-2xl border-t border-slate-100/50 pb-safe">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="relative flex items-end gap-2 bg-white rounded-[2rem] p-1.5 shadow-sm ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-teal-400 focus-within:shadow-md transition-all duration-300">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="描述您的牙齿症状或想咨询的问题..."
              rows={1}
              className="flex-1 max-h-32 bg-transparent text-slate-800 px-4 py-3 resize-none outline-none placeholder-slate-400 text-[15px] leading-relaxed"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-12 h-12 shrink-0 bg-gradient-to-tr from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:from-slate-200 disabled:to-slate-200 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-md disabled:shadow-none active:scale-95"
            >
              {/* 发送图标 SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 -ml-0.5 mt-0.5">
                <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
              </svg>
            </button>
          </div>
          <p className="text-center text-[11px] text-slate-400 mt-3 font-medium">
            内容由 AI 生成，不能替代专业医生的诊断建议。
          </p>
        </div>
      </footer>
    </div>
  );
}
