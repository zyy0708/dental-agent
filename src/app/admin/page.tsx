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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'confirmed': return 'bg-green-500/20 text-green-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
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

  // 登录页面
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-2xl w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">🔒 管理后台</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="输入管理密码"
            className="w-full bg-gray-700 text-white rounded-xl px-4 py-3 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 transition-colors"
          >
            登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">📋 预约管理</h1>
          <button
            onClick={fetchAppointments}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
          >
            🔄 刷新
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 text-red-400 p-4 rounded-xl mb-6">{error}</div>
        )}

        {loading ? (
          <div className="text-center text-gray-400 py-12">加载中...</div>
        ) : appointments.length === 0 ? (
          <div className="text-center text-gray-400 py-12">暂无预约记录</div>
        ) : (
          <div className="bg-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-sm">
                  <th className="text-left p-4">姓名</th>
                  <th className="text-left p-4">手机号</th>
                  <th className="text-left p-4">项目</th>
                  <th className="text-left p-4">预约时间</th>
                  <th className="text-left p-4">状态</th>
                  <th className="text-left p-4">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => (
                  <tr key={apt.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                    <td className="p-4">{apt.name}</td>
                    <td className="p-4">{apt.phone}</td>
                    <td className="p-4">{apt.service_type}</td>
                    <td className="p-4">{apt.appointment_time}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                        {getStatusText(apt.status)}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 text-sm">
                      {new Date(apt.created_at).toLocaleString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
