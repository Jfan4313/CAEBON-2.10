import React, { useState } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, CartesianGrid, Legend } from 'recharts';

const monthData = [
  { name: '1月', base: 40, retrofit: 30 },
  { name: '2月', base: 35, retrofit: 25 },
  { name: '3月', base: 45, retrofit: 35 },
  { name: '4月', base: 55, retrofit: 40 },
  { name: '5月', base: 70, retrofit: 50 },
  { name: '6月', base: 90, retrofit: 65 },
  { name: '7月', base: 100, retrofit: 70 },
  { name: '8月', base: 95, retrofit: 68 },
  { name: '9月', base: 80, retrofit: 55 },
  { name: '10月', base: 60, retrofit: 45 },
  { name: '11月', base: 45, retrofit: 35 },
  { name: '12月', base: 40, retrofit: 30 },
];

const RetrofitHVAC: React.FC = () => {
  const [strategy, setStrategy] = useState<'replace' | 'vfd'>('replace');
  const [isChartExpanded, setIsChartExpanded] = useState(false);

  return (
    <div className="flex h-full bg-slate-50 relative">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shrink-0">
            <div>
                <h2 className="text-xl font-bold text-slate-900">空调系统改造配置</h2>
                <p className="text-xs text-slate-500">含成本估算与能效对比分析</p>
            </div>
            <button className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
                <span className="material-icons text-base">history</span> 加载历史方案
            </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 pb-32">
            <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Strategy Selection */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center">
                        <span className="material-icons text-primary mr-2">tune</span> 改造策略选择
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className={`cursor-pointer group relative p-4 rounded-lg border-2 transition-all h-full shadow-sm flex flex-col ${strategy === 'replace' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-200 hover:border-primary/50'}`}>
                            <input type="radio" name="strategy" className="sr-only" checked={strategy === 'replace'} onChange={() => setStrategy('replace')} />
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                    <span className="material-icons">settings_backup_restore</span>
                                </div>
                                {strategy === 'replace' && <span className="material-icons text-primary">check_circle</span>}
                            </div>
                            <h4 className="font-bold text-slate-900 mb-1">设备整体更换</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">更换为一级能效磁悬浮或离心机组，适用于老旧设备，能效提升显著。</p>
                        </label>

                        <label className={`cursor-pointer group relative p-4 rounded-lg border-2 transition-all h-full shadow-sm flex flex-col ${strategy === 'vfd' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-200 hover:border-primary/50'}`}>
                            <input type="radio" name="strategy" className="sr-only" checked={strategy === 'vfd'} onChange={() => setStrategy('vfd')} />
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
                                    <span className="material-icons">speed</span>
                                </div>
                                {strategy === 'vfd' && <span className="material-icons text-primary">check_circle</span>}
                            </div>
                            <h4 className="font-bold text-slate-900 mb-1">变频改造</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">针对水泵风机加装变频器，优化部分负荷性能，投资回报快。</p>
                        </label>
                    </div>
                </section>

                {/* Detailed Parameters */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-base font-bold text-slate-800 flex items-center">
                            <span className="material-icons text-primary mr-2">sliders</span> 详细参数设置
                        </h3>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">基于 AI 推荐值</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">预计综合节能率</label>
                            <div className="relative">
                                <input type="number" defaultValue={18.5} className="block w-full rounded-lg border-slate-300 bg-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm pl-4 pr-12 py-2.5 border outline-none" />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">%</span></div>
                            </div>
                            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{width: '40%'}}></div>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">行业平均值: 15% - 25%</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">设备投资单价</label>
                            <div className="relative">
                                <input type="number" defaultValue={450} className="block w-full rounded-lg border-slate-300 bg-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm pl-4 pr-16 py-2.5 border outline-none" />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">¥ / kW</span></div>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">含安装调试费用</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">总投资额</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">¥</span></div>
                                <input type="number" defaultValue={325} className="block w-full rounded-lg border-slate-300 bg-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm pl-8 pr-16 py-2.5 border outline-none" />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">万元</span></div>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">基于设备单价与范围预估</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">系统使用寿命预估</label>
                            <div className="relative">
                                <input type="number" defaultValue={15} className="block w-full rounded-lg border-slate-300 bg-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm pl-4 pr-12 py-2.5 border outline-none" />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">年</span></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Building Details */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center justify-between">
                        <span className="flex items-center"><span className="material-icons text-primary mr-2">domain</span> 楼栋改造详情</span>
                        <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">共 3 个建筑单元</span>
                    </h3>
                    <div className="space-y-4">
                        {[
                            { name: '办公楼A (1号行政楼)', load: '1,200', run: '10', target: '20.0', cost: '120', active: true },
                            { name: '生产车间B (2号研发中心)', load: '2,800', run: '24', target: '15.5', cost: '205', active: true },
                            { name: '办公楼C (3号后勤楼)', load: '800', run: '8', target: '12.0', cost: '80', active: false },
                        ].map((b, i) => (
                            <div key={i} className={`border rounded-lg p-4 transition-all ${b.active ? 'border-slate-200 bg-slate-50 hover:border-primary/30' : 'border-slate-100 bg-white opacity-60'}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1">
                                        <div className="pt-1">
                                            <input type="checkbox" defaultChecked={b.active} className="w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer accent-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold text-slate-900">{b.name}</h4>
                                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                                <span className="flex items-center"><span className="material-icons text-[14px] mr-1">ac_unit</span>现有制冷量: {b.load} kW</span>
                                                <span className="flex items-center"><span className="material-icons text-[14px] mr-1">schedule</span>运行: {b.run}h/天</span>
                                            </div>
                                        </div>
                                    </div>
                                    {!b.active && <span className="text-xs font-medium text-slate-400 border border-slate-200 px-2 py-1 rounded">未启用</span>}
                                </div>
                                {b.active && (
                                    <div className="grid grid-cols-2 gap-4 mt-4 pl-8 border-t border-slate-200 pt-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">目标节能率 (%)</label>
                                            <input type="number" defaultValue={b.target} className="w-full text-sm border border-slate-300 rounded-md py-1.5 px-3 outline-none focus:border-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">单栋投资 (万元)</label>
                                            <input type="number" defaultValue={b.cost} className="w-full text-sm border border-slate-300 rounded-md py-1.5 px-3 outline-none focus:border-primary" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
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
                    <span className="text-xs font-bold text-slate-700">上次保存</span>
                    <span className="text-[10px] text-slate-400 font-medium">昨天 18:00</span>
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
      <aside className="w-[340px] bg-white border-l border-slate-200 flex flex-col shrink-0 z-20 h-screen overflow-y-auto shadow-xl mb-16">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-10">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-icons text-primary">analytics</span> 实时预估收益
              </h3>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
              {/* KPI 1 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-yellow-100 rounded text-yellow-600"><span className="material-icons text-sm">bolt</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">年节电量</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">342,580</span>
                      <span className="text-sm text-slate-500">kWh</span>
                  </div>
                  <div className="mt-2 text-xs font-medium text-green-600 flex items-center">
                      <span className="material-icons text-sm mr-0.5">trending_down</span> 18.5% 同比下降
                  </div>
              </div>

               {/* KPI 2 */}
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-red-100 rounded text-red-600"><span className="material-icons text-sm">savings</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">年运行成本降低</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">¥ 28.5</span>
                      <span className="text-sm text-slate-500">万元</span>
                  </div>
                  <div className="mt-2 text-xs font-medium text-green-600 flex items-center">
                      <span className="material-icons text-sm mr-0.5">south</span> 21.2% 成本优化
                  </div>
              </div>

               {/* KPI 3 - CapEx */}
               <div className="bg-primary p-4 rounded-xl shadow-lg shadow-primary/20 text-white relative overflow-hidden group">
                   <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-white/20 transition-all"></div>
                   <div className="flex items-center gap-2 mb-2 relative z-10">
                       <div className="p-1.5 bg-white/20 rounded text-white"><span className="material-icons text-sm">account_balance_wallet</span></div>
                       <span className="text-xs font-semibold text-blue-100 uppercase">总投资额</span>
                   </div>
                   <div className="flex items-baseline gap-2 relative z-10">
                       <span className="text-3xl font-bold tracking-tight">¥ 325.0</span>
                       <span className="text-sm text-blue-100">万元</span>
                   </div>
                   <div className="mt-3 relative z-10 h-1 bg-black/20 rounded-full w-full overflow-hidden">
                       <div className="bg-white h-full rounded-full" style={{width: '100%'}}></div>
                   </div>
               </div>

                {/* KPI 4 - PBP */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-purple-100 rounded text-purple-600"><span className="material-icons text-sm">timelapse</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">投资回收期 (PBP)</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">3.2</span>
                      <span className="text-sm text-slate-500">年</span>
                  </div>
                  <div className="mt-3 w-full bg-slate-200 rounded-full h-1.5">
                      <div className="bg-purple-500 h-1.5 rounded-full relative" style={{width: '45%'}}></div>
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
                  <div className="flex items-center gap-2 text-[10px] mb-2 px-2">
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-slate-300"></div><span className="text-slate-500">现状</span></div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-primary"></div><span className="text-slate-500">改造后</span></div>
                  </div>
                  <div className="h-32 w-full pointer-events-none">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthData} barGap={2} barCategoryGap={2}>
                              <XAxis dataKey="name" tick={{fontSize: 9, fill: '#94a3b8'}} axisLine={false} tickLine={false} interval={1} />
                              <Bar dataKey="base" fill="#cbd5e1" radius={[2,2,0,0]} />
                              <Bar dataKey="retrofit" fill="#4f46e5" radius={[2,2,0,0]} />
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
                            空调系统能耗对比分析
                        </h2>
                        <p className="text-slate-500 mt-1 ml-12">基于改造前后的月度能耗模拟数据</p>
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
                                fill="#4f46e5" 
                                radius={[4,4,0,0]}
                                animationDuration={1500}
                            />
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

export default RetrofitHVAC;