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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-white/80 backdrop-blur-md border-b border-blue-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-sky-400 rounded-xl flex items-center justify-center text-white text-lg shadow-sm">
            🦷
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-800">牙小助AI</h1>
            <p className="text-xs text-slate-400">在线咨询 · 快速预约</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            <span className="text-xs text-slate-400">在线</span>
          </div>
        </div>
      </header>

      {/* 聊天区域 */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {/* 欢迎消息 */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-12 pb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-sky-400 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-lg shadow-blue-200">
                🦷
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">您好，欢迎咨询</h2>
              <p className="text-slate-500 text-sm mb-8 text-center max-w-md leading-relaxed">
                我是牙小助AI，可以为您解答牙齿问题、了解治疗方案、预约到店检查。
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg">
                {[
                  { icon: '🪥', text: '洗牙咨询', desc: '定期洁牙建议' },
                  { icon: '😁', text: '牙齿矫正', desc: '了解矫正方案' },
                  { icon: '🦷', text: '种植牙', desc: '缺牙修复方案' },
                  { icon: '💊', text: '牙痛怎么办', desc: '缓解疼痛建议' },
                  { icon: '✨', text: '牙齿美白', desc: '美白方案咨询' },
                  { icon: '📋', text: '预约登记', desc: '预约到店检查' },
                ].map((item) => (
                  <button
                    key={item.text}
                    onClick={() => setInput(item.text)}
                    className="bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-2xl p-4 text-left transition-all duration-200 hover:shadow-md group"
                  >
                    <span className="text-2xl block mb-2">{item.icon}</span>
                    <span className="text-sm font-medium text-slate-700 block">{item.text}</span>
                    <span className="text-xs text-slate-400 mt-0.5 block">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 消息列表 */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-sky-400 rounded-lg flex items-center justify-center text-white text-xs mr-2 mt-1 flex-shrink-0 shadow-sm">
                  🦷
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-md shadow-blue-200 shadow-md'
                    : 'bg-white text-slate-700 rounded-tl-md border border-slate-200 shadow-sm'
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {msg.content}
                </pre>
              </div>
            </div>
          ))}

          {/* 加载动画 */}
          {loading && (
            <div className="flex justify-start">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-sky-400 rounded-lg flex items-center justify-center text-white text-xs mr-2 mt-1 flex-shrink-0 shadow-sm">
                🦷
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-5 py-3 shadow-sm">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* 输入区域 */}
      <footer className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入您的问题..."
              rows={1}
              className="flex-1 bg-slate-100 text-slate-800 rounded-2xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white placeholder-slate-400 text-sm border border-transparent focus:border-blue-300 transition-all"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white rounded-2xl px-5 py-3 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md active:scale-95"
            >
              发送
            </button>
          </div>
          <p className="text-center text-xs text-slate-300 mt-2">AI 助手仅供参考，具体方案以医生诊断为准</p>
        </div>
      </footer>
    </div>
  );
}
