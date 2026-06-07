'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
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

      router.push('/');
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans selection:bg-sky-100 selection:text-sky-900">
      {/* 左侧品牌区 */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-96 h-96 bg-sky-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-indigo-400 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-lg">
              🦷
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">Dental <span className="text-sky-400">Agent</span></h1>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">牙小助 AI 平台</p>
            </div>
          </div>

          <h2 className="text-4xl font-extrabold text-white leading-tight mb-6">
            智能牙科<br />健康管理平台
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            基于 AI 技术，为您提供专业的牙科咨询服务、预约管理和健康档案管理。
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { icon: '🤖', text: 'AI 智能问诊，实时解答牙齿问题' },
            { icon: '📋', text: '在线预约管理，省时省心' },
            { icon: '🔒', text: '数据加密存储，隐私安全有保障' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-slate-300">
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* 移动端 Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center text-white text-xl shadow-md">
              🦷
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-950 tracking-tight">Dental <span className="text-sky-600">Agent</span></h1>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">牙小助 AI 平台</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-950 tracking-tight">欢迎回来</h2>
            <p className="text-sm text-slate-500 mt-1">登录您的账户以继续使用</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
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
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all"
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
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 text-sm transition-all active:scale-[0.98] shadow-sm"
            >
              {loading ? '登录中...' : '登 录'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            还没有账户？{' '}
            <Link href="/register" className="text-sky-600 hover:text-sky-700 font-semibold transition-colors">
              立即注册
            </Link>
          </p>

          <div className="mt-4">
            <Link
              href="/admin"
              className="flex items-center justify-center gap-2 w-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              管理后台
            </Link>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100">
            <p className="text-center text-[11px] text-slate-400 font-medium tracking-tight">
              牙小助 AI 平台 v1.0 · 隐私保护已开启
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
