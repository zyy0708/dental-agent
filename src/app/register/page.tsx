'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, nickname: nickname || username }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '注册失败');
        return;
      }

      router.push('/chat');
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
            加入我们<br />开启智能护齿之旅
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            注册账户后即可享受完整的 AI 牙科咨询服务，管理您的预约和健康档案。
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { icon: '🦷', text: '专业的 AI 牙科问诊服务' },
            { icon: '📅', text: '便捷的在线预约管理系统' },
            { icon: '📊', text: '完整的个人牙齿健康档案' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-slate-300">
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧注册表单 */}
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
            <h2 className="text-2xl font-bold text-slate-950 tracking-tight">创建账户</h2>
            <p className="text-sm text-slate-500 mt-1">注册后即可使用牙小助 AI 全部功能</p>
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
                placeholder="3-20个字符"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all"
                required
                minLength={3}
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">昵称 <span className="text-slate-400 font-normal">(选填)</span></label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="您希望我们怎么称呼您"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少6个字符"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 text-sm transition-all active:scale-[0.98] shadow-sm"
            >
              {loading ? '注册中...' : '注 册'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            已有账户？{' '}
            <Link href="/login" className="text-sky-600 hover:text-sky-700 font-semibold transition-colors">
              立即登录
            </Link>
          </p>

          <div className="mt-10 pt-6 border-t border-slate-100">
            <p className="text-center text-[11px] text-slate-400 font-medium tracking-tight">
              注册即表示您同意我们的服务条款和隐私政策
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
