import React from 'react';
import { PRODUCT_IDENTITY } from '../../config/productIdentity';

export const ChapterPage: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <section className={`p-[14mm] min-h-[297mm] bg-white page-break-inside-avoid ${className}`}>
    {children}
    <div className="page-break" />
  </section>
);

export const ChapterHeader: React.FC<{ number: string; icon: string; title: string; subtitle: string; tone?: 'blue' | 'emerald' }> = ({ number, icon, title, subtitle, tone = 'blue' }) => {
  const classes = tone === 'emerald'
    ? 'from-emerald-600 to-teal-700 text-emerald-100'
    : 'from-blue-600 to-indigo-700 text-blue-100';
  return (
    <header className={`bg-gradient-to-r ${classes} text-white rounded-2xl p-6 mb-6 shadow-lg`}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center"><span className="material-icons text-3xl">{icon}</span></div>
        <div><div className="text-[10px] font-bold tracking-[0.25em] opacity-80">CHAPTER {number}</div><h2 className="text-2xl font-black mt-1">{title}</h2><p className="text-xs font-semibold mt-1 opacity-90">{subtitle}</p></div>
      </div>
    </header>
  );
};

export const SectionTitle: React.FC<{ icon: string; children: React.ReactNode }> = ({ icon, children }) => (
  <h3 className="text-lg font-black text-slate-900 mb-4 pb-3 border-b border-slate-100 flex items-center gap-2"><span className="material-icons text-blue-600">{icon}</span>{children}</h3>
);

export const MetricCard: React.FC<{ label: string; value: string; tone?: 'slate' | 'blue' | 'emerald' | 'violet' | 'amber' }> = ({ label, value, tone = 'slate' }) => {
  const tones = {
    slate: 'from-slate-50 to-slate-100 border-slate-200 text-slate-800',
    blue: 'from-blue-50 to-blue-100 border-blue-100 text-blue-700',
    emerald: 'from-emerald-50 to-green-100 border-emerald-100 text-emerald-700',
    violet: 'from-violet-50 to-purple-100 border-violet-100 text-violet-700',
    amber: 'from-amber-50 to-orange-100 border-amber-100 text-amber-700',
  }[tone];
  return <div className={`rounded-xl border bg-gradient-to-br p-4 ${tones}`}><div className="text-[10px] font-bold opacity-70 mb-1">{label}</div><div className="text-xl font-black whitespace-nowrap">{value}</div></div>;
};

export const ReportFooter: React.FC<{ label: string }> = ({ label }) => (
  <footer className="mt-7 pt-3 border-t border-slate-100 flex justify-between text-[9px] text-slate-400"><span>{label}</span><span>{PRODUCT_IDENTITY.shortName} · {PRODUCT_IDENTITY.version}</span></footer>
);
