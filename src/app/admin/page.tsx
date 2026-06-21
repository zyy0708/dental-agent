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
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => {
        if (d.user?.role === 'admin') { setAuthenticated(true); setCurrentUser(d.user); fetchData(); }
        else { setError('需要管理员权限'); setLoading(false); }
      })
      .catch(() => { setError('请先登录管理员账户'); setLoading(false); });
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [a, u] = await Promise.all([fetch('/api/admin/appointments'), fetch('/api/admin/users')]);
      if (a.ok) { const d = await a.json(); setAppointments(d.appointments || []); }
      if (u.ok) { const d = await u.json(); setUsers(d.users || []); }
    } catch { setError('获取数据失败'); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const r = await fetch('/api/appointment/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
      if (r.ok) setAppointments(p => p.map(a => a.id === id ? { ...a, status } : a));
    } catch { setError('更新失败'); }
    finally { setUpdatingId(null); }
  };

  const statusBadge = (s: string) => {
    const m: Record<string, { cls: string; label: string }> = {
      pending: { cls: 'badge-pending', label: '待确认' },
      confirmed: { cls: 'badge-confirmed', label: '已确认' },
      cancelled: { cls: 'badge-cancelled', label: '已取消' },
    };
    const b = m[s] || { cls: 'bg-slate-50 text-slate-600 border border-slate-200', label: s };
    return <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${b.cls}`}>{b.label}</span>;
  };

  const parseService = (st: string) => { const p = st.split(' @ '); return { service: p[0], hospital: p[1] || '' }; };

  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  if (!authenticated && !loading) {
    return (
      <div className="min-h-screen page-light flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-navy rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
            <span className="material-symbols-outlined text-white text-2xl">lock</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1.5">需要管理员权限</h2>
          <p className="text-xs text-slate-500 mb-5">{error || '请使用管理员账户登录'}</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => router.push('/login?callback=/admin')} className="btn-primary px-5 py-2 rounded-xl text-xs">去登录</button>
            <button onClick={() => router.push('/')} className="btn-secondary px-5 py-2 rounded-xl text-xs">返回首页</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-light font-sans">
      {/* Header */}
      <header className="glass-light border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
              <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>dentistry</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">管理后台</h1>
              <p className="text-[10px] text-slate-400">欢迎, {currentUser?.nickname || currentUser?.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="btn-secondary px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">refresh</span> 刷新
            </button>
            <a href="/" className="btn-primary px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">home</span> 首页
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-5">
          {([['appointments', '预约管理', 'calendar_today'], ['users', '用户管理', 'people']] as [AdminTab, string, string][]).map(([k, label, icon]) => (
            <button key={k} onClick={() => setActiveTab(k)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <span className="material-symbols-outlined text-xs">{icon}</span> {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-100 rounded-xl p-3 mb-5 text-xs font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span> {error}
          </div>
        )}

        {/* ─── Appointments Tab ─── */}
        {activeTab === 'appointments' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: '全部', value: stats.total, icon: 'calendar_today', color: 'bg-slate-100 text-slate-600' },
                { label: '待确认', value: stats.pending, icon: 'schedule', color: 'bg-amber-50 text-amber-600' },
                { label: '已确认', value: stats.confirmed, icon: 'check_circle', color: 'bg-teal-50 text-teal-600' },
                { label: '已取消', value: stats.cancelled, icon: 'cancel', color: 'bg-red-50 text-red-500' },
              ].map(s => (
                <div key={s.label} className="bento-card !p-3.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                    <span className="material-symbols-outlined text-base">{s.icon}</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {loading ? (
              <div className="bento-card p-10 text-center">
                <div className="typing-indicator justify-center mb-2"><span /><span /><span /></div>
                <p className="text-slate-400 text-xs">加载中...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="bento-card p-10 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-300 mb-2">event_busy</span>
                <p className="text-slate-400 text-xs">暂无预约</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block bento-card !p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>患者</th><th>手机号</th><th>项目</th><th>医院</th><th>时间</th><th>状态</th><th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map(a => {
                          const { service, hospital } = parseService(a.service_type);
                          return (
                            <tr key={a.id}>
                              <td>
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 bg-teal-50 rounded-md flex items-center justify-center text-teal-700 text-[11px] font-bold">{a.name[0]}</div>
                                  <span className="font-semibold text-slate-800">{a.name}</span>
                                </div>
                              </td>
                              <td>{a.phone}</td>
                              <td><span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded-md font-medium">{service}</span></td>
                              <td className="text-xs">{hospital || '-'}</td>
                              <td>{a.appointment_time}</td>
                              <td>{statusBadge(a.status)}</td>
                              <td>
                                {a.status === 'pending' && (
                                  <div className="flex gap-1.5">
                                    <button onClick={() => updateStatus(a.id, 'confirmed')} disabled={updatingId === a.id}
                                      className="bg-teal-50 text-teal-700 hover:bg-teal-100 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-teal-200 disabled:opacity-50">确认</button>
                                    <button onClick={() => updateStatus(a.id, 'cancelled')} disabled={updatingId === a.id}
                                      className="bg-red-50 text-red-600 hover:bg-red-100 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-red-200 disabled:opacity-50">取消</button>
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

                {/* Mobile cards */}
                <div className="md:hidden space-y-2.5">
                  {appointments.map(a => {
                    const { service, hospital } = parseService(a.service_type);
                    return (
                      <div key={a.id} className="bento-card !p-3.5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center text-teal-700 text-xs font-bold">{a.name[0]}</div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{a.name}</p>
                              <p className="text-[10px] text-slate-400">{a.phone}</p>
                            </div>
                          </div>
                          {statusBadge(a.status)}
                        </div>
                        <div className="text-[11px] text-slate-500 space-y-1 mb-2">
                          <p className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">monitor_heart</span> {service}</p>
                          {hospital && <p className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">local_hospital</span> {hospital}</p>}
                          <p className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">schedule</span> {a.appointment_time}</p>
                        </div>
                        {a.status === 'pending' && (
                          <div className="flex gap-2 pt-2 border-t border-slate-100">
                            <button onClick={() => updateStatus(a.id, 'confirmed')} disabled={updatingId === a.id} className="flex-1 bg-teal-50 text-teal-700 py-1.5 rounded-md text-[11px] font-semibold border border-teal-200 disabled:opacity-50">确认</button>
                            <button onClick={() => updateStatus(a.id, 'cancelled')} disabled={updatingId === a.id} className="flex-1 bg-red-50 text-red-600 py-1.5 rounded-md text-[11px] font-semibold border border-red-200 disabled:opacity-50">取消</button>
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

        {/* ─── Users Tab ─── */}
        {activeTab === 'users' && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: '总用户', value: users.length, icon: 'people', color: 'bg-slate-100 text-slate-600' },
                { label: '管理员', value: users.filter(u => u.role === 'admin').length, icon: 'shield', color: 'bg-amber-50 text-amber-600' },
                { label: '普通用户', value: users.filter(u => u.role !== 'admin').length, icon: 'person', color: 'bg-teal-50 text-teal-600' },
              ].map(s => (
                <div key={s.label} className="bento-card !p-3.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                    <span className="material-symbols-outlined text-base">{s.icon}</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-[10px] text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>

            {loading ? (
              <div className="bento-card p-10 text-center text-slate-400 text-xs">加载中...</div>
            ) : (
              <div className="bento-card !p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr><th>ID</th><th>用户名</th><th>昵称</th><th>角色</th><th>注册时间</th><th>最后登录</th></tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td className="text-slate-400">{u.id}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-teal-50 rounded-md flex items-center justify-center text-teal-700 text-[11px] font-bold">{(u.nickname || u.username)[0]}</div>
                              <span className="font-semibold text-slate-800">{u.username}</span>
                            </div>
                          </td>
                          <td>{u.nickname || '-'}</td>
                          <td>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${u.role === 'admin' ? 'badge-pending' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                              <span className="material-symbols-outlined text-xs">{u.role === 'admin' ? 'shield' : 'person'}</span>
                              {u.role === 'admin' ? '管理员' : '用户'}
                            </span>
                          </td>
                          <td className="text-xs text-slate-400">{u.created_at ? new Date(u.created_at).toLocaleDateString('zh-CN') : '-'}</td>
                          <td className="text-xs text-slate-400">{u.last_login ? new Date(u.last_login).toLocaleDateString('zh-CN') : '从未'}</td>
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
