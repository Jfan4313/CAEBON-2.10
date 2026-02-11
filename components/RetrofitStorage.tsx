import React, { useState, useEffect } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useProject } from '../context/ProjectContext';

const baseMonthData = [
  { name: '1月', val: 5 }, 
  { name: '2月', val: 4.5 },
  { name: '3月', val: 6 },
  { name: '4月', val: 7 },
  { name: '5月', val: 8 },
  { name: '6月', val: 9.5 },
  { name: '7月', val: 10 },
  { name: '8月', val: 9.8 },
  { name: '9月', val: 8.5 },
  { name: '10月', val: 7 },
  { name: '11月', val: 6 },
  { name: '12月', val: 5.5 },
];

const RetrofitStorage: React.FC = () => {
  const { modules, updateModule, toggleModule } = useProject();
  const currentModule = modules['retrofit-storage'];

  const [strategy, setStrategy] = useState<'arbitrage' | 'demand'>(currentModule.strategy as 'arbitrage' | 'demand');
  const [buildings, setBuildings] = useState([
      { id: 1, name: '主配电室 (集中式)', active: true },
      { id: 2, name: '车间B (分布式柜)', active: false },
  ]);
  const [isChartExpanded, setIsChartExpanded] = useState(false);

  useEffect(() => {
      const activeUnits = buildings.filter(b => b.active).length;
      const baseInvestment = activeUnits * 150; // 150万 per unit base
      
      let investment = baseInvestment;
      let yearlySaving = 0;

      if (strategy === 'arbitrage') {
          investment = baseInvestment; 
          yearlySaving = activeUnits * 44.25; 
      } else {
          investment = baseInvestment * 1.15; 
          yearlySaving = activeUnits * 35.0; 
      }

      updateModule('retrofit-storage', {
          strategy,
          investment: parseFloat(investment.toFixed(1)),
          yearlySaving: parseFloat(yearlySaving.toFixed(1)),
          kpiPrimary: { label: '配置容量', value: `${activeUnits * 1000} kWh` },
          kpiSecondary: { label: '回收期', value: `${(investment/yearlySaving).toFixed(1)} 年` }
      });
  }, [strategy, buildings, updateModule]);

  const toggleBuilding = (id: number) => {
      setBuildings(buildings.map(b => b.id === id ? { ...b, active: !b.active } : b));
  };

  const chartData = baseMonthData.map(m => ({
      ...m,
      val: parseFloat((m.val * (currentModule.yearlySaving / 88.5)).toFixed(2)) 
  }));

  return (
    <div className="flex h-full bg-slate-50 relative">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shrink-0">
            <div className="flex items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">工商业储能配置</h2>
                    <p className="text-xs text-slate-500">削峰填谷与需量管理策略</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full ml-4">
                    <span className={`text-xs font-bold ${currentModule.isActive ? 'text-primary' : 'text-slate-400'}`}>
                        {currentModule.isActive ? '模块已启用' : '模块已停用'}
                    </span>
                    <button 
                        onClick={() => toggleModule('retrofit-storage')}
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
                
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center justify-between">
                        <span className="flex items-center"><span className="material-icons text-primary mr-2">tune</span> 改造策略选择</span>
                        <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                            {strategy === 'arbitrage' ? '侧重：电价差套利' : '侧重：降低需量电费'}
                        </span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className={`cursor-pointer group relative p-4 rounded-lg border-2 transition-all h-full shadow-sm flex flex-col ${strategy === 'arbitrage' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-200 hover:border-primary/50'}`}>
                            <input type="radio" name="strategy" className="sr-only" checked={strategy === 'arbitrage'} onChange={() => setStrategy('arbitrage')} />
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                                    <span className="material-icons">query_stats</span>
                                </div>
                                {strategy === 'arbitrage' && <span className="material-icons text-primary">check_circle</span>}
                            </div>
                            <h4 className="font-bold text-slate-900 mb-1">峰谷套利模式</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">利用低谷电价充电，高峰/尖峰放电，获取价差收益。</p>
                        </label>

                        <label className={`cursor-pointer group relative p-4 rounded-lg border-2 transition-all h-full shadow-sm flex flex-col ${strategy === 'demand' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-200 hover:border-primary/50'}`}>
                            <input type="radio" name="strategy" className="sr-only" checked={strategy === 'demand'} onChange={() => setStrategy('demand')} />
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
                                    <span className="material-icons">show_chart</span>
                                </div>
                                {strategy === 'demand' && <span className="material-icons text-primary">check_circle</span>}
                            </div>
                            <h4 className="font-bold text-slate-900 mb-1">需量管理模式</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">通过储能放电削减最大需量，降低基本电费支出，需额外软硬件投入。</p>
                        </label>
                    </div>
                </section>

                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-base font-bold text-slate-800 flex items-center">
                            <span className="material-icons text-primary mr-2">sliders</span> 详细参数设置 (自动计算)
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">储能配置容量</label>
                            <div className="relative">
                                <input type="number" disabled value={buildings.filter(b=>b.active).length * 1000} className="block w-full rounded-lg border-slate-200 bg-slate-50 text-slate-500 sm:text-sm pl-4 pr-16 py-2.5 border outline-none" />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">kWh</span></div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">系统总造价</label>
                            <div className="relative">
                                <input type="number" disabled value={currentModule.investment} className="block w-full rounded-lg border-slate-200 bg-slate-50 text-slate-500 sm:text-sm pl-4 pr-16 py-2.5 border outline-none" />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">万元</span></div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">DOD (放电深度)</label>
                            <div className="relative">
                                <input type="number" defaultValue={90} className="block w-full rounded-lg border-slate-300 bg-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm pl-4 pr-12 py-2.5 border outline-none" />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">%</span></div>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">设计寿命</label>
                            <div className="relative">
                                <input type="number" defaultValue={15} className="block w-full rounded-lg border-slate-300 bg-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm pl-4 pr-12 py-2.5 border outline-none" />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">年</span></div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center justify-between">
                        <span className="flex items-center"><span className="material-icons text-primary mr-2">domain</span> 点位配置详情</span>
                        <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">共 {buildings.length} 个点位</span>
                    </h3>
                    <div className="space-y-4">
                        {buildings.map((b, i) => (
                            <div key={b.id} className={`border rounded-lg p-4 transition-all ${b.active ? 'border-slate-200 bg-slate-50 hover:border-primary/30' : 'border-slate-100 bg-white opacity-60'}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1">
                                        <div className="pt-1">
                                            <input 
                                                type="checkbox" 
                                                checked={b.active} 
                                                onChange={() => toggleBuilding(b.id)}
                                                className="w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer accent-primary" 
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold text-slate-900">{b.name}</h4>
                                        </div>
                                    </div>
                                    {!b.active && <span className="text-xs font-medium text-slate-400 border border-slate-200 px-2 py-1 rounded">未启用</span>}
                                </div>
                                {b.active && (
                                    <div className="grid grid-cols-2 gap-4 mt-4 pl-8 border-t border-slate-200 pt-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">容量 (kWh)</label>
                                            <input type="number" defaultValue={1000} className="w-full bg-white text-sm border border-slate-300 rounded-md py-1.5 px-3 outline-none focus:border-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">功率 (kW)</label>
                                            <input type="number" defaultValue={500} className="w-full bg-white text-sm border border-slate-300 rounded-md py-1.5 px-3 outline-none focus:border-primary" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>

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

      <aside className={`w-[340px] bg-white border-l border-slate-200 flex flex-col shrink-0 z-20 h-screen overflow-y-auto shadow-xl mb-16 transition-all duration-300 ${currentModule.isActive ? '' : 'opacity-60 grayscale'}`}>
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-10">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-icons text-primary">analytics</span> 实时预估收益
              </h3>
              {!currentModule.isActive && <span className="text-xs font-bold text-red-500 border border-red-200 bg-red-50 px-2 py-0.5 rounded">未计入总表</span>}
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-red-100 rounded text-red-600"><span className="material-icons text-sm">savings</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">年套利收益</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">¥ {currentModule.yearlySaving}</span>
                      <span className="text-sm text-slate-500">万元</span>
                  </div>
              </div>

               <div className="bg-primary p-4 rounded-xl shadow-lg shadow-primary/20 text-white relative overflow-hidden">
                   <div className="flex items-center gap-2 mb-2 relative z-10">
                       <div className="p-1.5 bg-white/20 rounded text-white"><span className="material-icons text-sm">account_balance_wallet</span></div>
                       <span className="text-xs font-semibold text-blue-100 uppercase">总投资额</span>
                   </div>
                   <div className="flex items-baseline gap-2 relative z-10">
                       <span className="text-3xl font-bold tracking-tight">¥ {currentModule.investment}</span>
                       <span className="text-sm text-blue-100">万元</span>
                   </div>
               </div>

               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-purple-100 rounded text-purple-600"><span className="material-icons text-sm">timelapse</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">投资回收期</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">{currentModule.kpiSecondary.value}</span>
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
                          <span className="text-xs font-semibold text-slate-500 uppercase">月度收益预估</span>
                      </div>
                      <span className="material-icons text-slate-300 text-sm group-hover:text-primary transition-colors">open_in_full</span>
                  </div>
                  <div className="h-32 w-full pointer-events-none">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} barGap={2}>
                              <XAxis dataKey="name" tick={{fontSize: 9, fill: '#94a3b8'}} axisLine={false} tickLine={false} interval={1} />
                              <Bar dataKey="val" fill="#8b5cf6" radius={[2,2,0,0]} />
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
                            <span className="p-2 bg-purple-100 text-purple-600 rounded-lg"><span className="material-icons">bar_chart</span></span>
                            月度储能收益详细预测
                        </h2>
                        <p className="text-slate-500 mt-1 ml-12">基于充放电策略与电价差的模拟结果</p>
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
                        <BarChart data={chartData} margin={{top: 20, right: 30, left: 20, bottom: 5}} barSize={40}>
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
                                label={{ value: '收益 (万元)', angle: -90, position: 'insideLeft', style: {textAnchor: 'middle', fill: '#94a3b8', fontSize: 12} }} 
                            />
                            <Tooltip 
                                cursor={{fill: '#f8fafc'}} 
                                contentStyle={{
                                    borderRadius: '12px', 
                                    border: 'none', 
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                    padding: '12px 16px'
                                }}
                                formatter={(value: number) => [`${value} 万元`, '预估收益']}
                                labelStyle={{color: '#64748b', marginBottom: '4px', fontSize: '14px'}}
                                itemStyle={{color: '#1e293b', fontWeight: 600, fontSize: '16px'}}
                            />
                            <Bar 
                                dataKey="val" 
                                name="收益" 
                                fill="url(#colorStorage)" 
                                radius={[6,6,0,0]}
                                animationDuration={1500}
                            />
                            <defs>
                                <linearGradient id="colorStorage" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={1}/>
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                
                <div className="mt-6 flex justify-end gap-4">
                    <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <span className="material-icons text-base">download</span> 导出数据
                    </button>
                    <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm" onClick={() => setIsChartExpanded(false)}>
                        完成查看
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default RetrofitStorage;