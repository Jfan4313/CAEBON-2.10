import React, { useState } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useProject } from '../context/ProjectContext';

const monthData = [
  { name: '1月', base: 20, retrofit: 8 },
  { name: '2月', base: 18, retrofit: 7 },
  { name: '3月', base: 22, retrofit: 9 },
  { name: '4月', base: 21, retrofit: 8 },
  { name: '5月', base: 23, retrofit: 9 },
  { name: '6月', base: 25, retrofit: 10 },
  { name: '7月', base: 25, retrofit: 10 },
  { name: '8月', base: 24, retrofit: 9.5 },
  { name: '9月', base: 22, retrofit: 9 },
  { name: '10月', base: 20, retrofit: 8 },
  { name: '11月', base: 21, retrofit: 8.5 },
  { name: '12月', base: 23, retrofit: 9 },
];

export default function RetrofitLighting() {
  const { modules, toggleModule } = useProject();
  const currentModule = modules['retrofit-lighting'];
  const [strategy, setStrategy] = useState<'led' | 'smart' | 'system'>('smart');
  const [isChartExpanded, setIsChartExpanded] = useState(false);

  if (!currentModule) return null;

  return (
    <div className="flex h-full bg-slate-50 relative">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shrink-0">
            <div className="flex items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">智能照明改造配置</h2>
                    <p className="text-xs text-slate-500">LED替换与智能感应控制策略</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full ml-4">
                    <span className={`text-xs font-bold ${currentModule.isActive ? 'text-primary' : 'text-slate-400'}`}>
                        {currentModule.isActive ? '模块已启用' : '模块已停用'}
                    </span>
                    <button 
                        onClick={() => toggleModule('retrofit-lighting')}
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
                
                {/* Strategy Selection (3-Column Layout) */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center">
                        <span className="material-icons text-primary mr-2">tune</span> 改造策略选择
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className={`cursor-pointer group relative p-4 rounded-lg border-2 transition-all h-full shadow-sm flex flex-col ${strategy === 'led' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-200 hover:border-primary/50'}`}>
                            <input type="radio" name="strategy" className="sr-only" checked={strategy === 'led'} onChange={() => setStrategy('led')} />
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                                    <span className="material-icons">lightbulb</span>
                                </div>
                                {strategy === 'led' && <span className="material-icons text-primary">check_circle</span>}
                            </div>
                            <h4 className="font-bold text-slate-900 mb-1">高效 LED 替换</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">将传统荧光灯、金卤灯替换为高光效 LED 灯具，降低功率密度。</p>
                        </label>

                        <label className={`cursor-pointer group relative p-4 rounded-lg border-2 transition-all h-full shadow-sm flex flex-col ${strategy === 'smart' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-200 hover:border-primary/50'}`}>
                            <input type="radio" name="strategy" className="sr-only" checked={strategy === 'smart'} onChange={() => setStrategy('smart')} />
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                    <span className="material-icons">sensors</span>
                                </div>
                                {strategy === 'smart' && <span className="material-icons text-primary">check_circle</span>}
                            </div>
                            <h4 className="font-bold text-slate-900 mb-1">单灯感应控制</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">加装人体感应、照度感应与时间控制，实现人来灯亮、人走灯灭。</p>
                        </label>

                        <label className={`cursor-pointer group relative p-4 rounded-lg border-2 transition-all h-full shadow-sm flex flex-col ${strategy === 'system' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-200 hover:border-primary/50'}`}>
                            <input type="radio" name="strategy" className="sr-only" checked={strategy === 'system'} onChange={() => setStrategy('system')} />
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                    <span className="material-icons">hub</span>
                                </div>
                                {strategy === 'system' && <span className="material-icons text-primary">check_circle</span>}
                            </div>
                            <h4 className="font-bold text-slate-900 mb-1">IoT 系统集控</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">通过 DALI/Zigbee 组网，实现远程集中管理、场景模式与能耗监测。</p>
                        </label>
                    </div>
                </section>

                {/* Detailed Parameters */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-base font-bold text-slate-800 flex items-center">
                            <span className="material-icons text-primary mr-2">sliders</span> 详细参数设置
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">预计节电率</label>
                            <div className="relative">
                                <input type="number" defaultValue={60} className="block w-full rounded-lg border-slate-300 bg-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm pl-4 pr-12 py-2.5 border outline-none" />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">%</span></div>
                            </div>
                             <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{width: '60%'}}></div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">灯具改造数量</label>
                            <div className="relative">
                                <input type="number" defaultValue={2500} className="block w-full rounded-lg border-slate-300 bg-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm pl-4 pr-12 py-2.5 border outline-none" />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">盏</span></div>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">总投资额</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">¥</span></div>
                                <input type="number" defaultValue={45} className="block w-full rounded-lg border-slate-300 bg-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm pl-8 pr-16 py-2.5 border outline-none" />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">万元</span></div>
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
                      <div className="p-1.5 bg-yellow-100 rounded text-yellow-600"><span className="material-icons text-sm">bolt</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">{currentModule.kpiPrimary.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">{currentModule.kpiPrimary.value}</span>
                  </div>
              </div>

               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-red-100 rounded text-red-600"><span className="material-icons text-sm">savings</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">年运行成本降低</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">¥ {currentModule.yearlySaving}</span>
                      <span className="text-sm text-slate-500">万元</span>
                  </div>
                  <div className="mt-2 text-xs font-medium text-green-600 flex items-center">
                      <span className="material-icons text-sm mr-0.5">south</span> {currentModule.kpiSecondary.value}
                  </div>
              </div>

               <div className="bg-primary p-4 rounded-xl shadow-lg shadow-primary/20 text-white relative overflow-hidden group">
                   <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-white/20 transition-all"></div>
                   <div className="flex items-center gap-2 mb-2 relative z-10">
                       <div className="p-1.5 bg-white/20 rounded text-white"><span className="material-icons text-sm">account_balance_wallet</span></div>
                       <span className="text-xs font-semibold text-blue-100 uppercase">总投资额</span>
                   </div>
                   <div className="flex items-baseline gap-2 relative z-10">
                       <span className="text-3xl font-bold tracking-tight">¥ {currentModule.investment}</span>
                       <span className="text-sm text-blue-100">万元</span>
                   </div>
               </div>

              {/* Clickable Chart */}
              <div 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer group relative transition-all hover:border-primary/50 hover:shadow-md"
                onClick={() => setIsChartExpanded(true)}
              >
                  <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 rounded text-blue-600"><span className="material-icons text-sm">bar_chart</span></div>
                          <span className="text-xs font-semibold text-slate-500 uppercase">月度能耗对比</span>
                      </div>
                      <span className="material-icons text-slate-300 text-sm group-hover:text-primary transition-colors">open_in_full</span>
                  </div>
                  <div className="h-32 w-full pointer-events-none">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthData} barGap={2} barCategoryGap={2}>
                              <XAxis dataKey="name" tick={{fontSize: 9, fill: '#94a3b8'}} axisLine={false} tickLine={false} interval={1} />
                              <Bar dataKey="base" fill="#cbd5e1" radius={[2,2,0,0]} />
                              <Bar dataKey="retrofit" fill="#eab308" radius={[2,2,0,0]} />
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
                            <span className="p-2 bg-yellow-100 text-yellow-600 rounded-lg"><span className="material-icons">bar_chart</span></span>
                            照明系统能耗对比分析
                        </h2>
                        <p className="text-slate-500 mt-1 ml-12">LED 替换与智能控制的节电模拟结果</p>
                    </div>
                    <button 
                        onClick={() => setIsChartExpanded(false)}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800"
                    >
                        <span className="material-icons text-2xl">close</span>
                    </button>
                </div>
                
                <div className="flex-1 w-full min-h-0 bg-slate-50 rounded-xl border border-slate-100 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthData} margin={{top: 20, right: 30, left: 20, bottom: 5}} barGap={8}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="name" 
                                tick={{fontSize: 14, fill: '#64748b', fontWeight: 500}} 
                                axisLine={{stroke: '#e2e8f0'}} 
                                tickLine={false} 
                                dy={10}
                            />
                            <YAxis 
                                tick={{fontSize: 12, fill: '#94a3b8'}} 
                                axisLine={false} 
                                tickLine={false} 
                                label={{ value: '能耗 (kWh)', angle: -90, position: 'insideLeft', style: {textAnchor: 'middle', fill: '#94a3b8', fontSize: 12} }} 
                            />
                            <Tooltip 
                                cursor={{fill: '#f8fafc'}} 
                                contentStyle={{
                                    borderRadius: '12px', 
                                    border: 'none', 
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                    padding: '12px 16px'
                                }}
                                itemStyle={{fontWeight: 600, fontSize: '16px'}}
                                labelStyle={{color: '#64748b', marginBottom: '8px', fontSize: '14px'}}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" />
                            <Bar 
                                dataKey="base" 
                                name="改造前能耗" 
                                fill="#cbd5e1" 
                                radius={[4,4,0,0]}
                                animationDuration={1500}
                            />
                            <Bar 
                                dataKey="retrofit" 
                                name="改造后能耗" 
                                fill="#d97706" 
                                radius={[4,4,0,0]}
                                animationDuration={1500}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}