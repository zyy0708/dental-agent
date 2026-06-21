'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Lang = 'zh' | 'en' | 'ja';

const i18n: Record<Lang, any> = {
  zh: {
    appName: '智齿管家', tag: 'DENTAL AGENT',
    badge: 'AI 驱动 · 智能导诊 · 全程守护',
    hero1: '智能牙科', hero2: '健康管理平台',
    desc: '基于 AI 大模型技术，为您提供专业的口腔症状分析、科室推荐、医院匹配和在线预约服务。',
    start: '开始咨询', admin: '管理后台', login: '登录',
    features: [
      { icon: 'monitor_heart', title: 'AI 智能分诊', desc: '深度学习实时分析口腔症状，精准推荐就诊科室' },
      { icon: 'event_available', title: '在线预约', desc: '一键预约名医专家，享受便捷数字化医疗' },
      { icon: 'folder_shared', title: '病历管理', desc: '安全存储就诊记录，随时查看历史病历' },
      { icon: 'local_hospital', title: '医院匹配', desc: '根据症状与位置智能推荐口腔医疗机构' },
      { icon: 'e911_emergency', title: '急诊识别', desc: '自动识别急性状况，优先紧急处理' },
      { icon: 'lock', title: '隐私安全', desc: '数据加密存储，聊天记录安全保护' },
    ],
    more: '了解更多', footer: '智齿管家 Dental Agent v1.0 · 隐私保护已开启 · AI 建议仅供参考',
  },
  en: {
    appName: 'DENTAL AGENT', tag: 'AI DENTAL CARE',
    badge: 'AI Powered · Smart Triage · Full Protection',
    hero1: 'Smart Dental', hero2: 'Health Platform',
    desc: 'Powered by AI large language models, providing professional oral symptom analysis, specialty matching, and online appointment booking.',
    start: 'Start Consultation', admin: 'Admin Panel', login: 'Login',
    features: [
      { icon: 'monitor_heart', title: 'AI Triage', desc: 'Deep learning-powered real-time oral symptom analysis' },
      { icon: 'event_available', title: 'Online Booking', desc: 'One-click expert appointment booking' },
      { icon: 'folder_shared', title: 'Health Records', desc: 'Securely store and access your visit history' },
      { icon: 'local_hospital', title: 'Hospital Match', desc: 'AI-powered hospital recommendation' },
      { icon: 'e911_emergency', title: 'Emergency Detect', desc: 'Auto-detect acute conditions for priority handling' },
      { icon: 'lock', title: 'Privacy', desc: 'Encrypted data with full privacy protection' },
    ],
    more: 'Learn More', footer: 'Dental Agent v1.0 · Privacy Protected · AI Suggestions Only',
  },
  ja: {
    appName: 'デンタルエージェント', tag: 'AI DENTAL CARE',
    badge: 'AI搭載 · スマート分診 · 完全保護',
    hero1: 'スマート歯科', hero2: '健康プラットフォーム',
    desc: 'AI大規模言語モデルを活用し、専門的な口腔症状分析、診療科マッチング、オンライン予約を提供。',
    start: '相談を開始', admin: '管理画面', login: 'ログイン',
    features: [
      { icon: 'monitor_heart', title: 'AIトリアージ', desc: '深層学習によるリアルタイム口腔症状分析' },
      { icon: 'event_available', title: 'オンライン予約', desc: 'ワンクリックで専門医への予約' },
      { icon: 'folder_shared', title: '診療記録', desc: '受診記録を安全に保存・アクセス可能' },
      { icon: 'local_hospital', title: '病院マッチ', desc: 'AI病院推奨システム' },
      { icon: 'e911_emergency', title: '緊急検知', desc: '急性症状を自動検出、優先処理' },
      { icon: 'lock', title: 'プライバシー', desc: 'データ暗号化、完全なプライバシー保護' },
    ],
    more: '詳しく見る', footer: 'デンタルエージェント v1.0 · プライバシー保護済み',
  },
};

const langMap: Record<Lang, string> = { zh: '中', en: 'EN', ja: '日' };

export default function HomePage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('zh');

  useEffect(() => {
    const s = localStorage.getItem('dental-lang') as Lang;
    if (s && i18n[s]) setLang(s);
  }, []);

  const switchLang = (l: Lang) => { setLang(l); localStorage.setItem('dental-lang', l); };
  const t = i18n[lang];

  return (
    <div className="min-h-screen font-sans">
      {/* ─── Hero (dark, video bg) ─── */}
      <div className="relative min-h-[85vh] flex flex-col">
        <video className="bg-video" autoPlay loop muted playsInline>
          <source src="/background.mp4" type="video/mp4" />
        </video>
        <div className="bg-overlay" />

        {/* Nav */}
        <nav className="relative z-10 px-5 md:px-8 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center border border-white/10">
                <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>dentistry</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight">{t.appName}</h1>
                <p className="text-[9px] font-semibold text-teal-400/80 uppercase tracking-[0.15em]">{t.tag}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                {(['zh', 'en', 'ja'] as Lang[]).map(l => (
                  <button key={l} onClick={() => switchLang(l)}
                    className={`px-2.5 py-1 text-[11px] font-bold transition-all ${lang === l ? 'bg-teal-500/20 text-teal-300' : 'text-white/40 hover:text-white/70'}`}>
                    {langMap[l]}
                  </button>
                ))}
              </div>
              <button onClick={() => router.push('/login?callback=/admin')}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-all">
                {t.admin}
              </button>
              <button onClick={() => router.push('/login')}
                className="btn-primary px-5 py-2 rounded-lg text-xs">
                {t.login}
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-5 md:px-8 pb-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-teal-500/10 text-teal-300 px-4 py-1.5 rounded-full text-[11px] font-semibold mb-6 border border-teal-500/15">
              <span className="material-symbols-outlined text-xs ai-pulse">auto_awesome</span>
              {t.badge}
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-white leading-[1.1] mb-5 tracking-tight">
              {t.hero1}<br />
              <span className="text-teal-400">{t.hero2}</span>
            </h2>
            <p className="text-white/50 text-sm md:text-base max-w-xl mx-auto mb-8 leading-relaxed">
              {t.desc}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={() => router.push('/login?callback=/chat')}
                className="btn-primary px-7 py-3 rounded-xl text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-base">chat</span>
                {t.start}
              </button>
              <button onClick={() => router.push('/login?callback=/admin')}
                className="px-7 py-3 rounded-xl text-sm font-semibold text-white/50 border border-white/10 hover:bg-white/5 hover:text-white/80 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-base">admin_panel_settings</span>
                {t.admin}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#f8fafc] to-transparent z-10" />
      </div>

      {/* ─── Features (light bg) ─── */}
      <section className="relative z-20 px-5 md:px-8 pb-16 md:pb-20 -mt-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {t.features.map((f: any, i: number) => (
              <div key={f.title} className="bento-card group cursor-pointer animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200">
                  <span className="material-symbols-outlined text-xl text-teal-600">{f.icon}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1.5">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                <span className="mt-3 text-teal-600 font-semibold text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {t.more}
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 md:px-8 py-5 text-center border-t border-slate-100">
        <p className="text-[11px] text-slate-400 font-medium">{t.footer}</p>
      </footer>
    </div>
  );
}
