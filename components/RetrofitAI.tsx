import React, { useState } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const data = [
  { name: '1月', val: 5 },
  { name: '2月', val: 4 },
  { name: '3月', val: 6 },
  { name: '4月', val: 7 },
  { name: '5月', val: 9 },
  { name: '6月', val: 12 },
  { name: '7月', val: 15 },
  { name: '8月', val: 14 },
  { name: '9月', val: 10 },
  { name: '10月', val: 8 },
  { name: '11月', val: 6 },
  { name: '12月', val: 5 },
];

const RetrofitAI: React.FC = () => {
  const [strategy, setStrategy] = useState<'rule' | 'ai'>('ai');
  const [isChartExpanded, setIsChartExpanded] = useState(false);

  return (
    <div className="flex h-full bg-slate-50 relative">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shrink-0">
            <div>
                <h2 className="text-xl font-bold text-slate-900">AI 智控平台配置</h2>
                <p className="text-xs text-slate-500">能耗预测与设备运行优化策略</p>
            </div>
            <button className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
                <span className="material-icons text-base">history</span> 加载历史方案
            </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 pb-32">
            <div className="max-w-4xl mx-auto space-y-6">
                
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center">
                        <span className="material-icons text-primary mr-2">tune</span> 改造策略选择
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className={`cursor-pointer group relative p-4 rounded-lg border-2 transition-all h-full shadow-sm flex flex-col ${strategy === 'rule' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-200 hover:border-primary/50'}`}>
                            <input type="radio" name="strategy" className="sr-only" checked={strategy === 'rule'} onChange={() => setStrategy('rule')} />
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                                    <span className="material-icons">settings_applications</span>
                                </div>
                                {strategy === 'rule' && <span className="material-icons text-primary">check_circle</span>}
                            </div>
                            <h4 className="font-bold text-slate-900 mb-1">数字化监控 (EMS)</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">实现能耗数据的实时采集与可视化，基于预设规则进行简单的自动控制与报警。</p>
                        </label>

                        <label className={`cursor-pointer group relative p-4 rounded-lg border-2 transition-all h-full shadow-sm flex flex-col ${strategy === 'ai' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-200 hover:border-primary/50'}`}>
                            <input type="radio" name="strategy" className="sr-only" checked={strategy === 'ai'} onChange={() => setStrategy('ai')} />
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                                    <span className="material-icons">psychology</span>
                                </div>
                                {strategy === 'ai' && <span className="material-icons text-primary">check_circle</span>}
                            </div>
                            <h4 className="font-bold text-slate-900 mb-1">AI 深度优化 (AI-IoT)</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">基于深度学习算法进行负荷预测，动态优化暖通、照明等设备运行参数，实现极致节能。</p>
                        </label>
                    </div>
                </section>

                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-base font-bold text-slate-800 flex items-center">
                            <span className="material-icons text-primary mr-2">sliders</span> 详细参数设置
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">接入点位数 (Tag)</label>
                            <div className="relative">
                                <input type="number" defaultValue={2000} className="block w-full rounded-lg border-slate-300 bg-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm pl-4 pr-16 py-2.5 border outline-none" />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">个</span></div>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">AI 软件订阅年费</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">¥</span></div>
                                <input type="number" defaultValue={15} className="block w-full rounded-lg border-slate-300 bg-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm pl-8 pr-16 py-2.5 border outline-none" />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">万元/年</span></div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">边缘网关/服务器成本</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">¥</span></div>
                                <input type="number" defaultValue={20} className="block w-full rounded-lg border-slate-300 bg-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm pl-8 pr-16 py-2.5 border outline-none" />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">万元</span></div>
                            </div>
                        </div>
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
                    <span className="text-xs font-bold text-slate-700">上次保存</span>
                    <span className="text-[10px] text-slate-400 font-medium">无</span>
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

      <aside className="w-[340px] bg-white border-l border-slate-200 flex flex-col shrink-0 z-20 h-screen overflow-y-auto shadow-xl mb-16">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-10">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-icons text-primary">analytics</span> 实时预估收益
              </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-green-100 rounded text-green-600"><span className="material-icons text-sm">energy_savings_leaf</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">额外节能潜力</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">8.5%</span>
                  </div>
              </div>

               <div className="bg-primary p-4 rounded-xl shadow-lg shadow-primary/20 text-white relative overflow-hidden">
                   <div className="flex items-center gap-2 mb-2 relative z-10">
                       <div className="p-1.5 bg-white/20 rounded text-white"><span className="material-icons text-sm">account_balance_wallet</span></div>
                       <span className="text-xs font-semibold text-blue-100 uppercase">首年投入成本</span>
                   </div>
                   <div className="flex items-baseline gap-2 relative z-10">
                       <span className="text-3xl font-bold tracking-tight">¥ 35.0</span>
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
                          <span className="text-xs font-semibold text-slate-500 uppercase">月度节能量预估</span>
                      </div>
                      <span className="material-icons text-slate-300 text-sm group-hover:text-primary transition-colors">open_in_full</span>
                  </div>
                  <div className="h-32 w-full pointer-events-none">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data} barGap={2}>
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
                            <span className="p-2 bg-blue-100 text-blue-600 rounded-lg"><span className="material-icons">bar_chart</span></span>
                            月度节能量详细预测
                        </h2>
                        <p className="text-slate-500 mt-1 ml-12">基于AI算法优化的设备运行策略模拟结果</p>
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
                        <BarChart data={data} margin={{top: 20, right: 30, left: 20, bottom: 5}} barSize={40}>
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
                                label={{ value: '节能量 (万kWh)', angle: -90, position: 'insideLeft', style: {textAnchor: 'middle', fill: '#94a3b8', fontSize: 12} }} 
                            />
                            <Tooltip 
                                cursor={{fill: '#f8fafc'}} 
                                contentStyle={{
                                    borderRadius: '12px', 
                                    border: 'none', 
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                    padding: '12px 16px'
                                }}
                                formatter={(value: number) => [`${value} 万kWh`, '预估节能量']}
                                labelStyle={{color: '#64748b', marginBottom: '4px', fontSize: '14px'}}
                                itemStyle={{color: '#1e293b', fontWeight: 600, fontSize: '16px'}}
                            />
                            <Bar 
                                dataKey="val" 
                                name="节能量" 
                                fill="url(#colorAI)" 
                                radius={[6,6,0,0]}
                                animationDuration={1500}
                            />
                            <defs>
                                <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={1}/>
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

export default RetrofitAI;