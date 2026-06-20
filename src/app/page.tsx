'use client';

import { useRouter } from 'next/navigation';

const features = [
  { icon: '🤖', title: 'AI 智能导诊', desc: '基于大语言模型，实时分析口腔症状，精准推荐就诊科室' },
  { icon: '🏥', title: '医院匹配', desc: '根据您的症状和所在城市，智能推荐附近优质口腔医院' },
  { icon: '📋', title: '在线预约', desc: '一键登记预约信息，医院电话确认，省时省心' },
  { icon: '⚠️', title: '紧急识别', desc: '自动识别紧急医疗情况，第一时间提示急诊就医' },
  { icon: '🔒', title: '隐私安全', desc: '数据加密存储，聊天记录安全保护，隐私无忧' },
  { icon: '💬', title: '多轮对话', desc: '支持上下文记忆的多轮会话，像真人微信聊天一样自然' },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen relative overflow-hidden font-sans selection:bg-sky-100 selection:text-sky-900">
      {/* 背景视频 — 全屏最前层 */}
      <video className="bg-video" autoPlay loop muted playsInline>
        <source src="/background.mp4" type="video/mp4" />
      </video>
      <div className="bg-overlay" />

      {/* 内容层 */}
      <div className="relative z-10 min-h-screen flex flex-col">

        {/* 导航栏 */}
        <nav className="flex items-center justify-between px-6 md:px-12 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center text-xl shadow-md border border-white/50">🦷</div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">Dental <span className="text-sky-600">Agent</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">牙小助 AI 平台</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/login')}
              className="bg-white/80 backdrop-blur-sm text-slate-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-white transition-all border border-white/50 shadow-sm"
            >
              登录
            </button>
            <button
              onClick={() => router.push('/register')}
              className="bg-slate-900/90 backdrop-blur-sm text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-sm"
            >
              注册
            </button>
          </div>
        </nav>

        {/* Hero 区域 */}
        <main className="flex-1 flex items-center justify-center px-6 md:px-12 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-sky-50/80 backdrop-blur-sm text-sky-700 px-4 py-2 rounded-full text-xs font-semibold mb-8 border border-sky-100/80">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
              </span>
              AI 驱动 · 智能导诊 · 全程守护
            </div>

            <h2 className="text-4xl md:text-6xl font-extrabold text-slate-950 leading-tight mb-6 tracking-tight">
              智能牙科<br />
              <span className="text-sky-600">健康管理平台</span>
            </h2>

            <p className="text-slate-600 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              基于 AI 大模型技术，为您提供专业的口腔症状分析、科室推荐、医院匹配和在线预约服务。像真人微信聊天一样，3 轮完成预约。
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => router.push('/login?callback=/chat')}
                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl text-base font-bold transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center gap-2"
              >
                开始咨询
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M12.97 3.97a.75.75 0 011.06 0l7.5 7.5a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 11-1.06-1.06l6.22-6.22H3a.75.75 0 010-1.5h16.19l-6.22-6.22a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => router.push('/login?callback=/admin')}
                className="bg-white/80 backdrop-blur-sm text-slate-700 px-8 py-4 rounded-2xl text-base font-semibold hover:bg-white transition-all border border-slate-200/80 shadow-sm flex items-center gap-2"
              >
                管理后台
              </button>
            </div>
          </div>
        </main>

        {/* 功能介绍 */}
        <section className="px-6 md:px-12 pb-16">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {features.map((item) => (
                <div key={item.title} className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/60 shadow-sm hover:shadow-md transition-all">
                  <span className="text-3xl block mb-3">{item.icon}</span>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 底部 */}
        <footer className="px-6 md:px-12 py-6 text-center">
          <p className="text-[11px] text-slate-400 font-medium">牙小助 AI 平台 v1.0 · 隐私保护已开启 · AI 建议仅供参考</p>
        </footer>
      </div>
    </div>
  );
}
