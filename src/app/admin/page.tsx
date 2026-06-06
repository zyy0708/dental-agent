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
    } catch (err) {
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

  useEffect(() => {
    const storedPassword = localStorage.getItem('admin_password');
    if (storedPassword) {
      fetchAppointments();
    } else {
      setLoading(false);
    }
  }, []);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'confirmed':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待确认';
      case 'confirmed': return '已确认';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  // 统计数据
  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  // 登录页面
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl shadow-blue-100/50 p-8 w-full max-w-md border border-slate-200">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-sky-400 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-blue-200">
              🔒
            </div>
            <h1 className="text-2xl font-bold text-slate-800">管理后台</h1>
            <p className="text-sm text-slate-400 mt-1">请输入管理员密码</p>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="输入管理密码"
              className="w-full bg-slate-50 text-slate-800 rounded-xl px-4 py-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all placeholder-slate-400"
            />
            {error && (
              <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl py-3 transition-all duration-200 font-medium shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      {/* 顶部导航 */}
      <header className="bg-white/80 backdrop-blur-md border-b border-blue-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-sky-400 rounded-xl flex items-center justify-center text-white text-lg shadow-sm">
              🦷
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">预约管理</h1>
              <p className="text-xs text-slate-400">查看和管理所有预约记录</p>
            </div>
          </div>
          <button
            onClick={fetchAppointments}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl transition-colors text-sm font-medium"
          >
            <span>🔄</span> 刷新
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: '全部预约', value: stats.total, icon: '📋', color: 'from-blue-500 to-sky-400' },
            { label: '待确认', value: stats.pending, icon: '⏳', color: 'from-amber-400 to-orange-400' },
            { label: '已确认', value: stats.confirmed, icon: '✅', color: 'from-emerald-400 to-green-400' },
            { label: '已取消', value: stats.cancelled, icon: '❌', color: 'from-red-400 to-pink-400' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{item.icon}</span>
                <div className={`w-8 h-8 bg-gradient-to-br ${item.color} rounded-lg flex items-center justify-center text-white text-xs shadow-sm`}>
                  {item.value}
                </div>
              </div>
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{item.value}</p>
            </div>
          ))}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 rounded-2xl p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* 预约列表 */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="flex justify-center gap-1.5 mb-3">
              <div className="w-2.5 h-2.5 bg-blue-300 rounded-full animate-bounce"></div>
              <div className="w-2.5 h-2.5 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
              <div className="w-2.5 h-2.5 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
            </div>
            <p className="text-slate-400 text-sm">加载中...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-slate-500">暂无预约记录</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">姓名</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">手机号</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">项目</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">预约时间</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">状态</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">创建时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-sky-400 rounded-xl flex items-center justify-center text-white text-sm font-medium shadow-sm">
                            {apt.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{apt.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{apt.phone}</td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">{apt.service_type}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{apt.appointment_time}</td>
                      <td className="px-5 py-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusStyle(apt.status)}`}>
                          {getStatusText(apt.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-400">
                        {new Date(apt.created_at).toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
