'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const loadCaptcha = async () => {
    try {
      const res = await fetch('/api/captcha');
      if (res.ok) {
        const data = await res.json();
        setCaptchaSvg(data.svg);
        setCaptcha('');
        setFieldErrors(f => ({ ...f, captcha: '' }));
      }
    } catch {}
  };

  useEffect(() => { loadCaptcha(); }, []);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9]{4,16}$/.test(username)) {
      errors.username = '用户名需为4-16位字母、数字或中文';
    }
    if (password.length < 8) {
      errors.password = '密码至少需要8个字符';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = '密码需要包含大写字母';
    } else if (!/[a-z]/.test(password)) {
      errors.password = '密码需要包含小写字母';
    } else if (!/[0-9]/.test(password)) {
      errors.password = '密码需要包含数字';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致';
    }
    if (!captcha) {
      errors.captcha = '请输入验证码';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, nickname: nickname || username, captcha }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '注册失败');
        loadCaptcha();
        return;
      }

      router.push('/chat');
    } catch {
      setError('网络错误，请稍后重试');
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Left Brand Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1e293b] flex-col justify-between p-12 relative overflow-hidden">
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
            加入我们<br />开启智能护齿之旅
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            注册账户后即可享受完整的 AI 牙科咨询服务，管理您的预约和健康档案。
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { icon: 'smart_toy', text: '专业的 AI 牙科问诊服务' },
            { icon: 'event_available', text: '便捷的在线预约管理系统' },
            { icon: 'monitoring', text: '完整的个人牙齿健康档案' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-slate-300">
              <span className="material-symbols-outlined text-teal-400">{item.icon}</span>
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Register Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
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
            <h2 className="text-2xl font-bold text-slate-950 tracking-tight">创建账户</h2>
            <p className="text-sm text-slate-500 mt-1">注册后即可使用智齿管家全部功能</p>
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
                onChange={(e) => { setUsername(e.target.value); setFieldErrors(f => ({ ...f, username: '' })); }}
                placeholder="4-16位字母、数字或中文"
                className={`w-full bg-white border ${fieldErrors.username ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-teal-200 focus:border-teal-300'} rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 transition-all`}
                required
              />
              {fieldErrors.username && <p className="text-xs text-red-500 mt-1.5 ml-1">{fieldErrors.username}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">昵称 <span className="text-slate-400 font-normal">(选填)</span></label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="您希望我们怎么称呼您"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors(f => ({ ...f, password: '' })); }}
                placeholder="至少8位，包含大小写字母和数字"
                className={`w-full bg-white border ${fieldErrors.password ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-teal-200 focus:border-teal-300'} rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 transition-all`}
                required
              />
              {fieldErrors.password && <p className="text-xs text-red-500 mt-1.5 ml-1">{fieldErrors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(f => ({ ...f, confirmPassword: '' })); }}
                placeholder="再次输入密码"
                className={`w-full bg-white border ${fieldErrors.confirmPassword ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-teal-200 focus:border-teal-300'} rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 transition-all`}
                required
              />
              {fieldErrors.confirmPassword && <p className="text-xs text-red-500 mt-1.5 ml-1">{fieldErrors.confirmPassword}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">验证码</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={captcha}
                  onChange={(e) => { setCaptcha(e.target.value); setFieldErrors(f => ({ ...f, captcha: '' })); }}
                  placeholder="输入图片中的数字"
                  maxLength={4}
                  className={`w-36 bg-white border ${fieldErrors.captcha ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-teal-200 focus:border-teal-300'} rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 transition-all`}
                  required
                />
                {captchaSvg ? (
                  <button
                    type="button"
                    onClick={loadCaptcha}
                    className="flex-1 flex items-center justify-center bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-teal-300 transition-colors cursor-pointer"
                    title="点击刷新验证码"
                    dangerouslySetInnerHTML={{ __html: captchaSvg }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={loadCaptcha}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-400 hover:border-teal-300 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">refresh</span>
                    加载验证码
                  </button>
                )}
              </div>
              {fieldErrors.captcha && <p className="text-xs text-red-500 mt-1.5 ml-1">{fieldErrors.captcha}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary font-semibold rounded-xl px-4 py-3 text-sm disabled:opacity-50"
            >
              {loading ? '注册中...' : '注 册'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            已有账户？{' '}
            <Link href="/login" className="text-teal-600 hover:text-teal-700 font-semibold transition-colors">
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
