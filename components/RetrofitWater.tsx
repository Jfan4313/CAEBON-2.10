import React, { useState, useEffect } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useProject } from '../context/ProjectContext';

const monthData = [
  { name: '1月', base: 50, retrofit: 20 },
  { name: '2月', base: 45, retrofit: 18 },
  { name: '3月', base: 40, retrofit: 15 },
  { name: '4月', base: 30, retrofit: 10 },
  { name: '5月', base: 20, retrofit: 5 },
  { name: '6月', base: 15, retrofit: 4 },
  { name: '7月', base: 15, retrofit: 4 },
  { name: '8月', base: 15, retrofit: 4 },
  { name: '9月', base: 20, retrofit: 6 },
  { name: '10月', base: 30, retrofit: 10 },
  { name: '11月', base: 40, retrofit: 15 },
  { name: '12月', base: 50, retrofit: 20 },
];

export default function RetrofitWater() {
  const { modules, toggleModule, updateModule, saveProject } = useProject();
  const currentModule = modules['retrofit-water'];
  const savedParams = currentModule.params || {};

  const [strategy, setStrategy] = useState<'heatpump' | 'solar' | 'recovery'>(savedParams.strategy || 'heatpump');
  const [params, setParams] = useState(savedParams.params || {
      savingRate: 65,
      dailyVolume: 120,
      investment: 85
  });
  const [isChartExpanded, setIsChartExpanded] = useState(false);

  // Sync to context on change
  useEffect(() => {
      updateModule('retrofit-water', {
          strategy,
          investment: params.investment,
          yearlySaving: 18.8, // Mock recalc
          kpiPrimary: { label: '日供水', value: `${params.dailyVolume} 吨` },
          kpiSecondary: { label: '节能率', value: `${params.savingRate}%` },
          params: { strategy, params }
      });
  }, [strategy, params, updateModule]);

  if (!currentModule) return null;

  return (
    <div className="flex h-full bg-slate-50 relative">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shrink-0">
            <div className="flex items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">热水系统改造配置</h2>
                    <p className="text-xs text-slate-500">空气源热泵与余热回收策略</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full ml-4">
                    <span className={`text-xs font-bold ${currentModule.isActive ? 'text-primary' : 'text-slate-400'}`}>
                        {currentModule.isActive ? '模块已启用' : '模块已停用'}
                    </span>
                    <button 
                        onClick={() => toggleModule('retrofit-water')}
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
                        <label className={`cursor-pointer group relative p-4 rounded-lg border-2 transition-all h-full shadow-sm flex flex-col ${strategy === 'heatpump' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-200 hover:border-primary/50'}`}>
                            <input type="radio" name="strategy" className="sr-only" checked={strategy === 'heatpump'} onChange={() => setStrategy('heatpump')} />
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center">
                                    <span className="material-icons">water_drop</span>
                                </div>
                                {strategy === 'heatpump' && <span className="material-icons text-primary">check_circle</span>}
                            </div>
                            <h4 className="font-bold text-slate-900 mb-1">空气源热泵替代</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">使用高效空气源热泵机组替代原有燃气/电锅炉，大幅提升制热COP。</p>
                        </label>

                        <label className={`cursor-pointer group relative p-4 rounded-lg border-2 transition-all h-full shadow-sm flex flex-col ${strategy === 'solar' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-200 hover:border-primary/50'}`}>
                            <input type="radio" name="strategy" className="sr-only" checked={strategy === 'solar'} onChange={() => setStrategy('solar')} />
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                                    <span className="material-icons">wb_sunny</span>
                                </div>
                                {strategy === 'solar' && <span className="material-icons text-primary">check_circle</span>}
                            </div>
                            <h4 className="font-bold text-slate-900 mb-1">太阳能集热</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">利用屋顶安装太阳能集热板制取热水，配合电辅助加热，实现低碳运行。</p>
                        </label>

                        <label className={`cursor-pointer group relative p-4 rounded-lg border-2 transition-all h-full shadow-sm flex flex-col ${strategy === 'recovery' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-200 hover:border-primary/50'}`}>
                            <input type="radio" name="strategy" className="sr-only" checked={strategy === 'recovery'} onChange={() => setStrategy('recovery')} />
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                    <span className="material-icons">recycling</span>
                                </div>
                                {strategy === 'recovery' && <span className="material-icons text-primary">check_circle</span>}
                            </div>
                            <h4 className="font-bold text-slate-900 mb-1">工业余热回收</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">回收空压机、冷水机组等设备运行产生的废热，用于生活或工艺热水。</p>
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
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">预计综合节能率</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={params.savingRate} 
                                    onChange={(e) => setParams({...params, savingRate: parseFloat(e.target.value)})}
                                    className="block w-full rounded-lg border-slate-300 bg-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm pl-4 pr-12 py-2.5 border outline-none" 
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">%</span></div>
                            </div>
                             <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{width: `${params.savingRate}%`}}></div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">日供水量</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={params.dailyVolume}
                                    onChange={(e) => setParams({...params, dailyVolume: parseFloat(e.target.value)})}
                                    className="block w-full rounded-lg border-slate-300 bg-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm pl-4 pr-12 py-2.5 border outline-none" 
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">吨</span></div>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">总投资额</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">¥</span></div>
                                <input 
                                    type="number" 
                                    value={params.investment}
                                    onChange={(e) => setParams({...params, investment: parseFloat(e.target.value)})}
                                    className="block w-full rounded-lg border-slate-300 bg-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm pl-8 pr-16 py-2.5 border outline-none" 
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">万元</span></div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>

        {/* Sticky Footer */}
        <div className="fixed bottom-0 left-64 right-[340px] bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 px-8 z-40 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
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
                <button 
                    onClick={saveProject}
                    className="px-8 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all flex items-center gap-2">
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
                      <div className="p-1.5 bg-yellow-100 rounded text-yellow-600"><span className="material-icons text-sm">local_fire_department</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">{currentModule.kpiPrimary.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">{currentModule.kpiPrimary.value}</span>
                  </div>
                  <div className="mt-2 text-xs font-medium text-green-600 flex items-center">
                      <span className="material-icons text-sm mr-0.5">trending_down</span> 65% 能耗下降
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
              {/* ... Chart code similar to previous ... */}
          </div>
      </aside>
      
      {/* ... Modals ... */}
    </div>
  );
}