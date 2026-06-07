'use client';

import { useState, useEffect } from 'react';

interface Appointment {
  id: string;
  name: string;
  phone: string;
  service_type: string;
  appointment_time: string;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const storedPassword = localStorage.getItem('admin_password');
      const res = await fetch('/api/appointments', {
        headers: { authorization: `Bearer ${storedPassword}` },
      });

      if (res.status === 401) {
        setAuthenticated(false);
        localStorage.removeItem('admin_password');
        setError('密码错误，请重试');
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.appointments) {
        setAppointments(data.appointments);
        setAuthenticated(true);
      }
    } catch {
      setError('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }
    localStorage.setItem('admin_password', password);
    await fetchAppointments();
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/appointment/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setAppointments(prev =>
          prev.map(a => a.id === id ? { ...a, status } : a)
        );
      }
    } catch {
      setError('更新失败');
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    const storedPassword = localStorage.getItem('admin_password');
    if (storedPassword) {
      fetchAppointments();
    } else {
      setLoading(false);
    }
  }, []);

  const getStatusStyle = (status: string) => {
    if (status === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (status === 'confirmed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'cancelled') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const getStatusText = (status: string) => {
    if (status === 'pending') return '待确认';
    if (status === 'confirmed') return '已确认';
    if (status === 'cancelled') return '已取消';
    return status;
  };

  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  // 登录页
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center text-white text-xl shadow-md">🦷</div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-950 tracking-tight">Dental <span className="text-sky-600">Agent</span></h1>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">管理后台</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-1">管理员登录</h2>
            <p className="text-sm text-slate-500 mb-6">请输入管理员密码以访问后台</p>
            <div className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="输入管理密码"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all"
              />
              {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-2.5 font-medium">{error}</p>}
              <button
                onClick={handleLogin}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-3 text-sm font-semibold transition-all active:scale-[0.98]"
              >登 录</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 主界面
  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-[0_4px_12px_-5px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white text-lg shadow-md">🦷</div>
            <div>
              <h1 className="text-base font-bold text-slate-900">预约管理后台</h1>
              <p className="text-xs text-slate-400">管理所有预约记录</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAppointments} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors">🔄 刷新</button>
            <a href="/" className="bg-sky-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-sky-700 transition-colors">返回前台</a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-6">
          {[
            { label: '全部预约', value: stats.total, icon: '📋', color: 'bg-slate-100 text-slate-700' },
            { label: '待确认', value: stats.pending, icon: '⏳', color: 'bg-amber-50 text-amber-700' },
            { label: '已确认', value: stats.confirmed, icon: '✅', color: 'bg-emerald-50 text-emerald-700' },
            { label: '已取消', value: stats.cancelled, icon: '❌', color: 'bg-red-50 text-red-700' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${item.color}`}>{item.icon}</span>
              </div>
              <p className="text-2xl font-extrabold text-slate-900">{item.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-100 rounded-xl p-4 mb-6 text-sm font-medium">{error}</div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
            <div className="flex justify-center gap-1.5 mb-3">
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
            </div>
            <p className="text-slate-400 text-sm">加载中...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-slate-500 text-sm">暂无预约记录</p>
          </div>
        ) : (
          <>
            {/* 桌面端表格 */}
            <div className="hidden md:block bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">姓名</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">手机号</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">项目</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">预约时间</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">状态</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center text-sky-700 text-xs font-bold">{apt.name.charAt(0)}</div>
                            <span className="text-sm font-semibold text-slate-800">{apt.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-600">{apt.phone}</td>
                        <td className="px-5 py-3.5"><span className="text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg font-medium">{apt.service_type}</span></td>
                        <td className="px-5 py-3.5 text-sm text-slate-600">{apt.appointment_time}</td>
                        <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${getStatusStyle(apt.status)}`}>{getStatusText(apt.status)}</span></td>
                        <td className="px-5 py-3.5">
                          {apt.status === 'pending' && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => updateStatus(apt.id, 'confirmed')}
                                disabled={updatingId === apt.id}
                                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border border-emerald-200 disabled:opacity-50"
                              >确认</button>
                              <button
                                onClick={() => updateStatus(apt.id, 'cancelled')}
                                disabled={updatingId === apt.id}
                                className="bg-red-50 text-red-600 hover:bg-red-100 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border border-red-200 disabled:opacity-50"
                              >取消</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 移动端卡片列表 */}
            <div className="md:hidden space-y-3">
              {appointments.map((apt) => (
                <div key={apt.id} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-sky-100 rounded-lg flex items-center justify-center text-sky-700 text-sm font-bold">{apt.name.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{apt.name}</p>
                        <p className="text-xs text-slate-400">{apt.phone}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${getStatusStyle(apt.status)}`}>{getStatusText(apt.status)}</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1 mb-3">
                    <p>🦷 {apt.service_type}</p>
                    <p>🕐 {apt.appointment_time}</p>
                  </div>
                  {apt.status === 'pending' && (
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => updateStatus(apt.id, 'confirmed')}
                        disabled={updatingId === apt.id}
                        className="flex-1 bg-emerald-50 text-emerald-700 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors border border-emerald-200 disabled:opacity-50"
                      >确认预约</button>
                      <button
                        onClick={() => updateStatus(apt.id, 'cancelled')}
                        disabled={updatingId === apt.id}
                        className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-50"
                      >取消预约</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
