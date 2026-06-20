'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Appointment {
  id: string;
  name: string;
  phone: string;
  service_type: string;
  appointment_time: string;
  status: string;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  nickname: string;
  role: string;
  created_at: string;
  last_login: string;
}

type AdminTab = 'appointments' | 'users';

export default function AdminPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username: string; nickname?: string; role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('appointments');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) throw new Error('未登录');
        return res.json();
      })
      .then(data => {
        if (data.user?.role === 'admin') {
          setAuthenticated(true);
          setCurrentUser(data.user);
          fetchData();
        } else {
          setError('需要管理员权限');
          setLoading(false);
        }
      })
      .catch(() => {
        setError('请先登录管理员账户');
        setLoading(false);
      });
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [aptRes, userRes] = await Promise.all([
        fetch('/api/admin/appointments'),
        fetch('/api/admin/users'),
      ]);
      if (aptRes.ok) {
        const d = await aptRes.json();
        setAppointments(d.appointments || []);
      }
      if (userRes.ok) {
        const d = await userRes.json();
        setUsers(d.users || []);
      }
    } catch {
      setError('获取数据失败');
    } finally {
      setLoading(false);
    }
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
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      }
    } catch {
      setError('更新失败');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusStyle = (s: string) => {
    if (s === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'confirmed') return 'bg-teal-50 text-teal-700 border-teal-200';
    if (s === 'cancelled') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const getStatusText = (s: string) => {
    if (s === 'pending') return '待确认';
    if (s === 'confirmed') return '已确认';
    if (s === 'cancelled') return '已取消';
    return s;
  };

  const parseServiceType = (st: string) => {
    const parts = st.split(' @ ');
    return { service: parts[0], hospital: parts[1] || '' };
  };

  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  if (!authenticated && !loading) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-[#1e293b] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="material-symbols-outlined text-white text-3xl">lock</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">需要管理员权限</h2>
          <p className="text-sm text-slate-500 mb-6">{error || '请使用管理员账户登录'}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push('/login?callback=/admin')} className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold">去登录</button>
            <button onClick={() => router.push('/')} className="btn-secondary px-6 py-2.5 rounded-xl text-sm font-semibold">返回首页</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] font-sans">
      <header className="glass border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1e293b] rounded-xl flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>dentistry</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">管理后台</h1>
              <p className="text-xs text-slate-400">欢迎, {currentUser?.nickname || currentUser?.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">refresh</span>
              刷新
            </button>
            <a href="/" className="btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">home</span>
              返回前台
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="flex gap-1 mb-6 bg-slate-200/60 p-1 rounded-xl w-fit">
          {([
            { key: 'appointments' as AdminTab, label: '预约管理', icon: 'calendar_today' },
            { key: 'users' as AdminTab, label: '用户管理', icon: 'people' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-100 rounded-xl p-4 mb-6 text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </div>
        )}

        {activeTab === 'appointments' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-6">
              {([
                { label: '全部预约', value: stats.total, icon: 'calendar_today', color: 'bg-slate-100 text-slate-700' },
                { label: '待确认', value: stats.pending, icon: 'schedule', color: 'bg-amber-50 text-amber-700' },
                { label: '已确认', value: stats.confirmed, icon: 'check_circle', color: 'bg-teal-50 text-teal-700' },
                { label: '已取消', value: stats.cancelled, icon: 'cancel', color: 'bg-red-50 text-red-700' },
              ]).map(item => (
                <div key={item.label} className="bento-card !p-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${item.color}`}>
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{item.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>

            {loading ? (
              <div className="bento-card p-12 text-center">
                <div className="typing-indicator justify-center mb-3">
                  <span></span><span></span><span></span>
                </div>
                <p className="text-slate-400 text-sm">加载中...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="bento-card p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-3xl text-slate-400">event_busy</span>
                </div>
                <p className="text-slate-500 text-sm">暂无预约记录</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block bento-card !p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">患者</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">手机号</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">症状/项目</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">医院</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">预约时间</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">状态</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {appointments.map(apt => {
                          const { service, hospital } = parseServiceType(apt.service_type);
                          return (
                            <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center text-teal-700 text-xs font-bold">{apt.name.charAt(0)}</div>
                                  <span className="text-sm font-semibold text-slate-800">{apt.name}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-sm text-slate-600">{apt.phone}</td>
                              <td className="px-5 py-3.5"><span className="text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg font-medium">{service}</span></td>
                              <td className="px-5 py-3.5 text-xs text-slate-600">{hospital || '-'}</td>
                              <td className="px-5 py-3.5 text-sm text-slate-600">{apt.appointment_time}</td>
                              <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${getStatusStyle(apt.status)}`}>{getStatusText(apt.status)}</span></td>
                              <td className="px-5 py-3.5">
                                {apt.status === 'pending' && (
                                  <div className="flex items-center gap-1.5">
                                    <button onClick={() => updateStatus(apt.id, 'confirmed')} disabled={updatingId === apt.id} className="bg-teal-50 text-teal-700 hover:bg-teal-100 px-2.5 py-1 rounded-lg text-xs font-semibold border border-teal-200 disabled:opacity-50">确认</button>
                                    <button onClick={() => updateStatus(apt.id, 'cancelled')} disabled={updatingId === apt.id} className="bg-red-50 text-red-600 hover:bg-red-100 px-2.5 py-1 rounded-lg text-xs font-semibold border border-red-200 disabled:opacity-50">取消</button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="md:hidden space-y-3">
                  {appointments.map(apt => {
                    const { service, hospital } = parseServiceType(apt.service_type);
                    return (
                      <div key={apt.id} className="bento-card !p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center text-teal-700 text-sm font-bold">{apt.name.charAt(0)}</div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{apt.name}</p>
                              <p className="text-xs text-slate-400">{apt.phone}</p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${getStatusStyle(apt.status)}`}>{getStatusText(apt.status)}</span>
                        </div>
                        <div className="text-xs text-slate-500 space-y-1 mb-3">
                          <p className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">monitor_heart</span> {service}</p>
                          {hospital && <p className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">local_hospital</span> {hospital}</p>}
                          <p className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span> {apt.appointment_time}</p>
                        </div>
                        {apt.status === 'pending' && (
                          <div className="flex gap-2 pt-2 border-t border-slate-100">
                            <button onClick={() => updateStatus(apt.id, 'confirmed')} disabled={updatingId === apt.id} className="flex-1 bg-teal-50 text-teal-700 py-2 rounded-lg text-xs font-semibold border border-teal-200 disabled:opacity-50">确认预约</button>
                            <button onClick={() => updateStatus(apt.id, 'cancelled')} disabled={updatingId === apt.id} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg text-xs font-semibold border border-red-200 disabled:opacity-50">取消预约</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'users' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
              {([
                { label: '总用户', value: users.length, icon: 'people', color: 'bg-slate-100 text-slate-700' },
                { label: '管理员', value: users.filter(u => u.role === 'admin').length, icon: 'shield', color: 'bg-amber-50 text-amber-700' },
                { label: '普通用户', value: users.filter(u => u.role !== 'admin').length, icon: 'person', color: 'bg-teal-50 text-teal-700' },
              ]).map(item => (
                <div key={item.label} className="bento-card !p-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${item.color}`}>
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{item.value}</p>
                  <p className="text-xs text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>

            {loading ? (
              <div className="bento-card p-12 text-center text-slate-400 text-sm">加载中...</div>
            ) : (
              <div className="bento-card !p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">ID</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">用户名</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">昵称</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">角色</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">注册时间</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">最后登录</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5 text-sm text-slate-500">{u.id}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center text-teal-700 text-xs font-bold">{(u.nickname || u.username)[0]}</div>
                              <span className="text-sm font-semibold text-slate-800">{u.username}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-slate-600">{u.nickname || '-'}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1 w-fit ${u.role === 'admin' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                              <span className="material-symbols-outlined text-sm">{u.role === 'admin' ? 'shield' : 'person'}</span>
                              {u.role === 'admin' ? '管理员' : '用户'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-400">{u.created_at ? new Date(u.created_at).toLocaleString('zh-CN') : '-'}</td>
                          <td className="px-5 py-3.5 text-xs text-slate-400">{u.last_login ? new Date(u.last_login).toLocaleString('zh-CN') : '从未'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
