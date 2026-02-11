import React, { useState, useMemo } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { useProject } from '../context/ProjectContext';

// Generate 24h simulated data
const generate24hData = () => {
  const data = [];
  for (let i = 0; i <= 24; i++) {
    // Simulate a load curve: lower at night, higher during day
    const baseLoad = 200 + Math.sin((i - 6) / 24 * Math.PI * 2) * 150 + Math.random() * 30;
    // AI optimization is better during non-peak or stable periods, just a simulation
    const optimizationRate = (i > 8 && i < 18) ? 0.92 : 0.85; 
    
    data.push({
      name: `${i}h`,
      hour: i,
      actual: Math.max(50, Math.round(baseLoad)),
      ai: Math.max(40, Math.round(baseLoad * optimizationRate)),
      confidence: Math.round(88 + Math.random() * 10)
    });
  }
  return data;
};

const fullData = generate24hData();

// Summary data for sidebar
const sidebarData = [
  { name: '0h', actual: 120, ai: 110 },
  { name: '4h', actual: 100, ai: 90 },
  { name: '8h', actual: 300, ai: 280 },
  { name: '12h', actual: 450, ai: 400 },
  { name: '16h', actual: 400, ai: 360 },
  { name: '20h', actual: 200, ai: 190 },
];

export default function RetrofitAI() {
  const { modules, toggleModule } = useProject();
  const currentModule = modules['retrofit-ai'];
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  
  // Interactive States
  const [predictionHorizon, setPredictionHorizon] = useState<number>(12); // Slider: 4-24 hours
  const [selectedPoint, setSelectedPoint] = useState<any>(fullData[8]); // Default selection

  // Filter chart data based on slider
  const mainChartData = useMemo(() => {
      return fullData.slice(0, predictionHorizon + 1);
  }, [predictionHorizon]);
  
  if (!currentModule) return null;

  return (
    <div className="flex h-full bg-slate-50 relative">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shrink-0">
            <div className="flex items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">AI 智控平台配置</h2>
                    <p className="text-xs text-slate-500">能耗预测与设备运行优化策略</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full ml-4">
                    <span className={`text-xs font-bold ${currentModule.isActive ? 'text-primary' : 'text-slate-400'}`}>
                        {currentModule.isActive ? '模块已启用' : '模块已停用'}
                    </span>
                    <button 
                        onClick={() => toggleModule('retrofit-ai')}
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
                <section className="bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-sm border border-blue-100 p-6">
                    <h3 className="text-base font-bold text-blue-800 mb-4 flex items-center gap-2">
                        <span className="material-icons">psychology</span> 核心功能介绍
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {title: 'AI 负荷预测', desc: '基于历史数据与天气预报，精准预测未来能耗，指导能源调度。'},
                            {title: '设备故障诊断', desc: '实时监控设备运行参数，利用异常检测算法提前预警潜在故障。'},
                            {title: '全局能效优化', desc: '动态调整暖通、照明等子系统运行参数，在保障舒适度前提下实现极致节能。'}
                        ].map((f, i) => (
                            <div key={i} className="flex gap-3">
                                <div className="w-1 h-full bg-blue-200 rounded-full"></div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm">{f.title}</h4>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Interactive Prediction Chart */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-800 flex items-center">
                                <span className="material-icons text-primary mr-2">timeline</span> AI 负荷预测模型
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">拖动滑块调整预测时长，点击柱状图查看详细数据</p>
                        </div>
                        
                        {/* Slider Control */}
                        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 w-full md:w-auto shadow-sm">
                            <span className="text-xs font-medium text-slate-600 whitespace-nowrap flex items-center gap-1">
                                <span className="material-icons text-[14px]">schedule</span>
                                预测范围: <span className="text-primary font-bold">{predictionHorizon}</span> 小时
                            </span>
                            <input 
                                type="range" 
                                min="6" 
                                max="24" 
                                step="1" 
                                value={predictionHorizon}
                                onChange={(e) => setPredictionHorizon(Number(e.target.value))}
                                className="w-full md:w-32 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 h-[320px]">
                        {/* Chart Area */}
                        <div className="flex-1 relative bg-slate-50/50 rounded-xl p-2 border border-slate-100">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart 
                                    data={mainChartData} 
                                    margin={{top: 20, right: 10, left: -20, bottom: 0}}
                                    onClick={(e: any) => { if(e && e.activePayload) setSelectedPoint(e.activePayload[0].payload); }}
                                    className="cursor-pointer"
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        cursor={{fill: 'rgba(59, 130, 246, 0.05)'}}
                                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}
                                        labelStyle={{fontSize: '12px', color: '#64748b', marginBottom: '4px'}}
                                    />
                                    <Bar dataKey="actual" name="基准负荷" fill="#cbd5e1" radius={[2,2,0,0]} />
                                    <Bar dataKey="ai" name="AI预测" fill="#3b82f6" radius={[2,2,0,0]}>
                                        {mainChartData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={selectedPoint && selectedPoint.hour === entry.hour ? '#2563eb' : '#3b82f6'} 
                                                cursor="pointer"
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="absolute top-2 right-4 flex gap-3 text-[10px]">
                                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-300 rounded"></div><span className="text-slate-500">实际负荷</span></div>
                                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded"></div><span className="text-slate-500">AI优化</span></div>
                            </div>
                        </div>

                        {/* Selected Point Detail Panel */}
                        <div className="w-full md:w-56 shrink-0 bg-white border border-blue-100 rounded-xl p-5 flex flex-col justify-center shadow-[0_4px_20px_-4px_rgba(59,130,246,0.1)] relative overflow-hidden transition-all duration-300">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full -mr-6 -mt-6"></div>
                            
                            {selectedPoint ? (
                                <>
                                    <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 relative z-10">
                                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                                            <span className="material-icons text-sm">access_time_filled</span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800">{selectedPoint.name} 时刻</h4>
                                            <p className="text-[10px] text-slate-400">实时数据快照</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4 relative z-10">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-500">原始负荷</span>
                                            <span className="text-sm font-bold text-slate-600">{selectedPoint.actual} <span className="text-[10px] font-normal">kW</span></span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-500">AI 优化值</span>
                                            <span className="text-lg font-bold text-primary">{selectedPoint.ai} <span className="text-xs font-normal">kW</span></span>
                                        </div>
                                        <div className="bg-emerald-50 rounded-lg p-2 flex items-center justify-between border border-emerald-100">
                                            <span className="text-xs text-emerald-700 font-medium">节能潜力</span>
                                            <div className="flex items-center text-emerald-600 font-bold text-sm">
                                                <span className="material-icons text-[14px]">arrow_downward</span>
                                                {((1 - selectedPoint.ai / selectedPoint.actual) * 100).toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            <div className="flex justify-between text-[10px] mb-1">
                                                <span className="text-slate-400">模型置信度</span>
                                                <span className="font-bold text-blue-600">{selectedPoint.confidence}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{width: `${selectedPoint.confidence}%`}}></div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-slate-400 py-8">
                                    <span className="material-icons text-3xl mb-2 opacity-50">touch_app</span>
                                    <p className="text-xs">点击左侧图表<br/>查看详细数据</p>
                                </div>
                            )}
                        </div>
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
                      <div className="p-1.5 bg-green-100 rounded text-green-600"><span className="material-icons text-sm">energy_savings_leaf</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">额外节能潜力</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">8.5%</span>
                  </div>
              </div>
               <div className="bg-primary p-4 rounded-xl shadow-lg shadow-primary/20 text-white relative overflow-hidden group">
                   <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-white/20 transition-all"></div>
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
                            <span className="text-xs font-semibold text-slate-500 uppercase">能耗对比 (实时/AI)</span>
                        </div>
                        <span className="material-icons text-slate-300 text-sm group-hover:text-primary transition-colors">open_in_full</span>
                    </div>
                    <div className="h-32 w-full pointer-events-none">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sidebarData} barGap={2}>
                                <XAxis dataKey="name" tick={{fontSize: 9, fill: '#94a3b8'}} axisLine={false} tickLine={false} interval={1} />
                                <Bar dataKey="actual" fill="#cbd5e1" radius={[2,2,0,0]} />
                                <Bar dataKey="ai" fill="#3b82f6" radius={[2,2,0,0]} />
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
                            AI 优化效果对比
                        </h2>
                        <p className="text-slate-500 mt-1 ml-12">实际能耗 vs AI优化后能耗</p>
                    </div>
                    <button onClick={() => setIsChartExpanded(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800">
                        <span className="material-icons text-2xl">close</span>
                    </button>
                </div>
                <div className="flex-1 w-full min-h-0 bg-slate-50 rounded-xl border border-slate-100 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sidebarData} margin={{top: 20, right: 30, left: 20, bottom: 5}} barGap={8}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{fontSize: 14, fill: '#64748b'}} axisLine={{stroke: '#e2e8f0'}} tickLine={false} dy={10} />
                            <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                            <Bar dataKey="actual" name="实际能耗" fill="#cbd5e1" radius={[4,4,0,0]} />
                            <Bar dataKey="ai" name="AI优化后" fill="#3b82f6" radius={[4,4,0,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}