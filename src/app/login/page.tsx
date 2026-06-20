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

      if (!res.ok) {
        setError(data.error || '登录失败');
        return;
      }

      router.push(callback);
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex font-sans selection:bg-teal-100 selection:text-teal-900 relative">
      {/* Background Video */}
      <video className="bg-video" autoPlay loop muted playsInline>
        <source src="/background.mp4" type="video/mp4" />
      </video>
      <div className="bg-overlay" />

      {/* Left Brand Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950/75 flex-col justify-between p-12 relative overflow-hidden backdrop-blur-sm">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 bg-teal-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-400 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/20">
              <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>dentistry</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">智齿管家</h1>
              <p className="text-xs font-semibold text-teal-400 uppercase tracking-widest">Dental Agent AI</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white leading-tight mb-6">
            智能牙科<br />健康管理平台
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            基于 AI 技术，为您提供专业的牙科咨询服务、预约管理和健康档案管理。
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { icon: 'smart_toy', text: 'AI 智能问诊，实时解答牙齿问题' },
            { icon: 'event_available', text: '在线预约管理，省时省心' },
            { icon: 'lock', text: '数据加密存储，隐私安全有保障' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-slate-300">
              <span className="material-symbols-outlined text-teal-400">{item.icon}</span>
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 md:p-10">
        <div className="w-full max-w-md glass rounded-[1.5rem] px-6 py-8 md:px-8 md:py-10 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 bg-[#1e293b] rounded-xl flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>dentistry</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">智齿管家</h1>
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest">Dental Agent AI</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-950 tracking-tight">欢迎回来</h2>
            <p className="text-sm text-slate-500 mt-1">登录您的账户以继续使用</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">error</span>
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary font-semibold rounded-xl px-4 py-3 text-sm disabled:opacity-50 shadow-sm"
            >
              {loading ? '登录中...' : '登 录'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            还没有账户？{' '}
            <Link href="/register" className="text-teal-600 hover:text-teal-700 font-semibold transition-colors">
              立即注册
            </Link>
          </p>

          <div className="mt-4">
            <Link
              href="/admin"
              className="flex items-center justify-center gap-2 w-full btn-secondary rounded-xl py-2.5 text-sm font-semibold"
            >
              <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
              管理后台
            </Link>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100">
            <p className="text-center text-[11px] text-slate-400 font-medium tracking-tight">
              智齿管家 Dental Agent v1.0 · 隐私保护已开启
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
