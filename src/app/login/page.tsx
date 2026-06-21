'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callback = searchParams.get('callback') || '/chat';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '登录失败'); return; }
      router.push(callback);
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans">
      {/* Video bg */}
      <video className="bg-video" autoPlay loop muted playsInline>
        <source src="/background.mp4" type="video/mp4" />
      </video>
      <div className="bg-overlay" />

      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[45%] relative z-10 flex-col justify-between p-10 xl:p-14">
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-10 h-10 bg-white/8 rounded-lg flex items-center justify-center border border-white/10">
              <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>dentistry</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">智齿管家</h1>
              <p className="text-[9px] font-semibold text-teal-400/80 uppercase tracking-[0.15em]">DENTAL AGENT</p>
            </div>
          </div>
          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
            智能牙科<br />健康管理平台
          </h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-sm">
            基于 AI 技术，为您提供专业的牙科咨询服务、预约管理和健康档案管理。
          </p>
        </div>
        <div className="relative z-10 space-y-3">
          {[
            { icon: 'smart_toy', text: 'AI 智能问诊，实时解答' },
            { icon: 'event_available', text: '在线预约，省时省心' },
            { icon: 'lock', text: '数据加密，隐私安全' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-white/40">
              <span className="material-symbols-outlined text-teal-400/70 text-lg">{item.icon}</span>
              <span className="text-xs">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-5 py-8 relative z-10">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-white/8 rounded-lg flex items-center justify-center border border-white/10">
              <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>dentistry</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">智齿管家</h1>
              <p className="text-[9px] font-semibold text-teal-400/80 uppercase tracking-[0.15em]">DENTAL AGENT</p>
            </div>
          </div>

          <div className="glass rounded-2xl p-7 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight">欢迎回来</h2>
              <p className="text-xs text-white/40 mt-1">登录您的账户以继续使用</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1.5">用户名</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500/40 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1.5">密码</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500/40 transition-all" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full btn-primary rounded-xl py-2.5 text-sm disabled:opacity-50">
                {loading ? '登录中...' : '登 录'}
              </button>
            </form>

            <p className="text-center text-xs text-white/30 mt-5">
              还没有账户？{' '}
              <Link href="/register" className="text-teal-400 hover:text-teal-300 font-semibold transition-colors">立即注册</Link>
            </p>

            <div className="mt-4 pt-4 border-t border-white/5">
              <Link href="/admin"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-semibold text-white/30 hover:text-white/60 hover:bg-white/5 transition-all">
                <span className="material-symbols-outlined text-base">admin_panel_settings</span>
                管理后台
              </Link>
            </div>
          </div>

          <p className="text-center text-[10px] text-white/20 mt-6">
            智齿管家 Dental Agent v1.0 · 隐私保护已开启
          </p>
        </div>
      </div>
    </div>
  );
}
