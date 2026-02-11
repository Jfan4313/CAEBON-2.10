import React, { useState } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useProject } from '../context/ProjectContext';

const data = [
  { name: '1月', val: 45 }, { name: '2月', val: 42 }, { name: '3月', val: 48 },
  { name: '4月', val: 50 }, { name: '5月', val: 52 }, { name: '6月', val: 55 },
  { name: '7月', val: 60 }, { name: '8月', val: 58 }, { name: '9月', val: 53 },
  { name: '10月', val: 49 }, { name: '11月', val: 46 }, { name: '12月', val: 44 },
];

export default function RetrofitCarbon() {
  const { modules, toggleModule } = useProject();
  const currentModule = modules['retrofit-carbon'];
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  
  if (!currentModule) return null;

  return (
    <div className="flex h-full bg-slate-50 relative">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shrink-0">
            <div className="flex items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">碳资产管理配置</h2>
                    <p className="text-xs text-slate-500">碳排放核算与CCER交易管理</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full ml-4">
                    <span className={`text-xs font-bold ${currentModule.isActive ? 'text-primary' : 'text-slate-400'}`}>
                        {currentModule.isActive ? '模块已启用' : '模块已停用'}
                    </span>
                    <button 
                        onClick={() => toggleModule('retrofit-carbon')}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${currentModule.isActive ? 'bg-primary' : 'bg-slate-300'}`}
                    >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${currentModule.isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>
            <button className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
                <span className="material-icons text-base">history</span> 加载历史方案
            </button>
        </header>

        <div className={`flex-1 overflow-y-auto p-8 pb-32 transition-opacity duration-300 ${currentModule.isActive ? 'opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>
            <div className="max-w-5xl mx-auto space-y-6">
                
                {/* Features */}
                <section className="bg-gradient-to-br from-emerald-50 to-white rounded-xl shadow-sm border border-emerald-100 p-6">
                    <h3 className="text-base font-bold text-emerald-800 mb-4 flex items-center gap-2">
                        <span className="material-icons">forest</span> 核心功能介绍
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {title: '碳排放核算', desc: '依据ISO 14064标准，自动核算企业温室气体排放清单。'},
                            {title: 'CCER开发', desc: '协助开发光伏、节能改造等减排项目的CCER资产，创造额外收益。'},
                            {title: '内部碳定价', desc: '构建内部模拟碳市场，将碳成本纳入各部门考核体系，推动主动减排。'}
                        ].map((f, i) => (
                            <div key={i} className="flex gap-3">
                                <div className="w-1 h-full bg-emerald-200 rounded-full"></div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm">{f.title}</h4>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Parameters */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-base font-bold text-slate-800 flex items-center">
                            <span className="material-icons text-primary mr-2">sliders</span> 详细参数设置
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">预估碳价</label>
                            <div className="relative">
                                <input type="number" defaultValue={85} className="block w-full rounded-lg border-slate-300 bg-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm pl-4 pr-16 py-2.5 border outline-none" />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">元/吨</span></div>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">电力排放因子</label>
                            <div className="relative">
                                <input type="number" defaultValue={0.5703} className="block w-full rounded-lg border-slate-300 bg-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm pl-4 pr-16 py-2.5 border outline-none" />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">kg/kWh</span></div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>

        {/* Sticky Footer */}
        <div className="fixed bottom-0 left-64 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 px-8 z-40 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400">
                    <span className="material-icons text-[18px]">history</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">自动同步</span>
                    <span className="text-[10px] text-slate-400 font-medium">数据实时计算中...</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button className="px-6 py-2.5 text-sm font-semibold rounded-xl text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all">重置</button>
                <button className="px-8 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all flex items-center gap-2">
                    保存配置 <span className="material-icons text-[18px]">save</span>
                </button>
            </div>
        </div>
      </div>
        
      {/* Right Sidebar - Analytics */}
      <aside className={`w-[340px] bg-white border-l border-slate-200 flex flex-col shrink-0 z-20 h-screen overflow-y-auto shadow-xl mb-16 transition-all duration-300 ${currentModule.isActive ? '' : 'opacity-60 grayscale'}`}>
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-10">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-icons text-primary">analytics</span> 实时预估收益
              </h3>
              {!currentModule.isActive && <span className="text-xs font-bold text-red-500 border border-red-200 bg-red-50 px-2 py-0.5 rounded">未计入</span>}
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-green-100 rounded text-green-600"><span className="material-icons text-sm">forest</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">年碳减排量</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">580</span>
                      <span className="text-sm text-slate-500">tCO₂</span>
                  </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-yellow-100 rounded text-yellow-600"><span className="material-icons text-sm">monetization_on</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">年碳交易潜在收益</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">¥ 4.9</span>
                      <span className="text-sm text-slate-500">万元</span>
                  </div>
              </div>

                {/* Clickable Chart */}
                <div 
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer group relative transition-all hover:border-primary/50 hover:shadow-md"
                  onClick={() => setIsChartExpanded(true)}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-100 rounded text-emerald-600"><span className="material-icons text-sm">bar_chart</span></div>
                            <span className="text-xs font-semibold text-slate-500 uppercase">月度减排量</span>
                        </div>
                        <span className="material-icons text-slate-300 text-sm group-hover:text-primary transition-colors">open_in_full</span>
                    </div>
                    <div className="h-32 w-full pointer-events-none">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} barGap={2}>
                                <XAxis dataKey="name" tick={{fontSize: 9, fill: '#94a3b8'}} axisLine={false} tickLine={false} interval={1} />
                                <Bar dataKey="val" fill="#10b981" radius={[2,2,0,0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
          </div>
      </aside>

      {/* Expanded Chart Modal */}
      {isChartExpanded && (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6"
            onClick={() => setIsChartExpanded(false)}
        >
            <div 
                className="bg-white rounded-2xl w-full max-w-5xl h-[600px] shadow-2xl p-8 flex flex-col relative animate-[zoomIn_0.2s_ease-out]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <span className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><span className="material-icons">bar_chart</span></span>
                            碳减排详细分析
                        </h2>
                        <p className="text-slate-500 mt-1 ml-12">基于能耗降低量的月度碳减排估算</p>
                    </div>
                    <button onClick={() => setIsChartExpanded(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800">
                        <span className="material-icons text-2xl">close</span>
                    </button>
                </div>
                <div className="flex-1 w-full min-h-0 bg-slate-50 rounded-xl border border-slate-100 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{top: 20, right: 30, left: 20, bottom: 5}} barSize={40}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{fontSize: 14, fill: '#64748b'}} axisLine={{stroke: '#e2e8f0'}} tickLine={false} dy={10} />
                            <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} label={{ value: '减排量 (tCO₂)', angle: -90, position: 'insideLeft', style: {textAnchor: 'middle', fill: '#94a3b8', fontSize: 12} }} />
                            <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                            <Bar dataKey="val" name="减排量" fill="#10b981" radius={[4,4,0,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}