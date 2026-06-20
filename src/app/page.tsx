'use client';

import { useRouter } from 'next/navigation';

const features = [
  { icon: 'monitor_heart', title: '智能分诊', desc: 'AI 识别症状，快速推荐科室与处理路径。', color: 'text-blue-600', bg: 'bg-blue-50' },
  { icon: 'event_available', title: '在线预约', desc: '支持一键挂号、预约时段管理与提醒。', color: 'text-sky-600', bg: 'bg-sky-50' },
  { icon: 'folder_shared', title: '病历管理', desc: '统一记录历史问诊、就诊与随访信息。', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { icon: 'local_hospital', title: '医院匹配', desc: '按症状、位置与服务能力智能匹配机构。', color: 'text-cyan-600', bg: 'bg-cyan-50' },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen relative overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      <video className="bg-video" autoPlay loop muted playsInline>
        <source src="/background.mp4" type="video/mp4" />
      </video>
      <div className="bg-overlay" />

      <div className="relative z-10 min-h-screen flex flex-col">
        <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-slate-200/70 shadow-[0_8px_28px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between max-w-7xl mx-auto px-4 md:px-8 py-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>dentistry</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-950 tracking-tight">DENTAL-AGENT</h1>
                <p className="text-[11px] text-slate-500">Your Trusted Dental Partner</p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-700">
              <button className="text-blue-700 border-b-2 border-blue-600 pb-1">Home</button>
              <button className="hover:text-slate-950 transition-colors">Products</button>
              <button className="hover:text-slate-950 transition-colors">Brands</button>
              <button className="hover:text-slate-950 transition-colors">Solutions</button>
              <button className="hover:text-slate-950 transition-colors">About Us</button>
              <button className="hover:text-slate-950 transition-colors">Contact</button>
            </div>

            <button
              onClick={() => router.push('/login?callback=/admin')}
              className="btn-primary px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">mail</span>
              Get in Touch
            </button>
          </div>
        </nav>

        <main className="relative">
          <section className="max-w-7xl mx-auto px-4 md:px-8 pt-14 md:pt-20 pb-10 md:pb-14">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr] items-center gap-10 lg:gap-8 min-h-[680px]">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm text-blue-700 px-4 py-2 rounded-full text-xs font-semibold mb-6 border border-white/70 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  Intelligent Dental Care
                </div>

                <h2 className="text-5xl md:text-7xl font-black text-slate-950 leading-[0.95] tracking-tight">
                  Your Trusted Partner
                  <span className="block text-blue-600 mt-2">in Dental Solutions</span>
                </h2>

                <p className="mt-6 text-lg md:text-xl text-slate-600 leading-relaxed max-w-xl">
                  AI 驱动的口腔健康平台，提供智能分诊、在线预约、病历管理与机构匹配。
                </p>

                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => router.push('/login?callback=/chat')}
                    className="btn-primary px-7 py-4 rounded-full text-base font-semibold flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">shopping_bag</span>
                    Explore Services
                  </button>
                  <button
                    onClick={() => router.push('/login?callback=/admin')}
                    className="btn-secondary px-7 py-4 rounded-full text-base font-semibold flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">chat</span>
                    Contact Us
                  </button>
                </div>

                <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                  {[
                    ['Trusted Quality', 'Certified & Reliable'],
                    ['Global Support', 'Delivering Worldwide'],
                    ['Professional Support', 'Here for Your Success'],
                  ].map(([title, desc]) => (
                    <div key={title} className="flex items-start gap-3 border-r border-slate-200 last:border-r-0 pr-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative lg:pl-6">
                <div className="relative rounded-[2rem] overflow-hidden shadow-[0_26px_70px_rgba(15,23,42,0.14)] border border-white/60 bg-white/35 backdrop-blur-sm">
                  <div className="aspect-[1.08/1] min-h-[520px] bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(230,240,255,0.30))]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.15),transparent_28%),radial-gradient(circle_at_80%_30%,rgba(14,165,233,0.10),transparent_25%),radial-gradient(circle_at_60%_80%,rgba(148,163,184,0.10),transparent_30%)]" />
                    <div className="absolute inset-0 bg-[url('/background.mp4')] opacity-0" />
                    <div className="absolute inset-0 flex items-end justify-end p-5">
                      <div className="grid grid-cols-2 gap-3 w-full max-w-[420px]">
                        <div className="glass rounded-2xl p-4 shadow-lg">
                          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined">monitor_heart</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-900">AI 分析</p>
                          <p className="text-xs text-slate-500 mt-1">快速判断症状</p>
                        </div>
                        <div className="glass rounded-2xl p-4 shadow-lg">
                          <div className="w-11 h-11 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined">event_available</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-900">预约</p>
                          <p className="text-xs text-slate-500 mt-1">在线登记信息</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <section className="px-4 md:px-8 pb-16 md:pb-20">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-center text-3xl md:text-4xl font-bold text-slate-950 mb-10 tracking-tight">What We Provide</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.map((item, index) => (
                <div
                  key={item.title}
                  className="bento-card group cursor-pointer animate-fade-in-up text-center"
                  style={{ animationDelay: `${index * 100}ms`, minHeight: '260px' }}
                >
                  <div className={`w-16 h-16 rounded-full ${item.bg} flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <span className={`material-symbols-outlined text-3xl ${item.color}`}>{item.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-950 mb-3">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-[240px] mx-auto">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="px-4 md:px-8 py-6 text-center border-t border-white/50 bg-white/25 backdrop-blur-sm">
          <p className="text-xs text-slate-500 font-medium">
            DENTAL-AGENT AI · 智能口腔健康平台 · AI 建议仅供参考
          </p>
        </footer>
      </div>
    </div>
  );
}
