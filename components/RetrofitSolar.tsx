import React, { useState, useEffect } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useProject } from '../context/ProjectContext';

const baseMonthData = [
  { name: '1月', base: 10 },
  { name: '2月', base: 12 },
  { name: '3月', base: 15 },
  { name: '4月', base: 18 },
  { name: '5月', base: 22 },
  { name: '6月', base: 25 },
  { name: '7月', base: 28 },
  { name: '8月', base: 26 },
  { name: '9月', base: 20 },
  { name: '10月', base: 18 },
  { name: '11月', base: 12 },
  { name: '12月', base: 10 },
];

const RetrofitSolar: React.FC = () => {
  const { modules, updateModule, toggleModule } = useProject();
  const currentModule = modules['retrofit-solar'];

  // Local state for UI interaction
  const [strategy, setStrategy] = useState<'rooftop' | 'bipv'>(currentModule.strategy as 'rooftop' | 'bipv');
  const [buildings, setBuildings] = useState([
      { id: 1, name: '办公楼A (1号行政楼)', area: 1200, active: true },
      { id: 2, name: '生产车间B (2号研发中心)', area: 3500, active: true },
      { id: 3, name: '办公楼C (3号后勤楼)', area: 800, active: false },
  ]);
  const [isChartExpanded, setIsChartExpanded] = useState(false);

  // Sync strategy change with data calculation and Context
  useEffect(() => {
      // Logic: Strategy Impacts
      // Rooftop: Standard cost (3.5/W), Standard efficiency (1.0)
      // BIPV: Higher cost (6.5/W), Slightly lower efficiency (0.85) but saves building materials (not calc here)
      
      const totalArea = buildings.filter(b => b.active).reduce((acc, curr) => acc + curr.area, 0);
      
      // Constants
      const density = 0.15; // kW/m2
      const capacity = Math.floor(totalArea * density); // kW
      
      const pricePerWatt = strategy === 'rooftop' ? 3.5 : 6.5;
      const efficiencyFactor = strategy === 'rooftop' ? 1.0 : 0.85;
      const annualSunHours = 1100; // Shanghai avg
      const electricityPrice = 0.8; // RMB/kWh

      // Calculations
      const investment = (capacity * 1000 * pricePerWatt) / 10000; // 万
      const yearlyGen = capacity * annualSunHours * efficiencyFactor; // kWh
      const yearlySaving = (yearlyGen * electricityPrice) / 10000; // 万

      // Update Context
      updateModule('retrofit-solar', {
          strategy,
          investment: parseFloat(investment.toFixed(1)),
          yearlySaving: parseFloat(yearlySaving.toFixed(1)),
          kpiPrimary: { label: '装机容量', value: `${capacity} kW` },
          kpiSecondary: { label: '年发电量', value: `${(yearlyGen/10000).toFixed(1)} 万kWh` }
      });

  }, [strategy, buildings, updateModule]); // Remove 'activeModules' dependency loop

  const toggleBuilding = (id: number) => {
      setBuildings(buildings.map(b => b.id === id ? { ...b, active: !b.active } : b));
  };

  // Generate chart data based on calculation
  const chartData = baseMonthData.map(m => ({
      ...m,
      retrofit: parseFloat((m.base * (strategy === 'rooftop' ? 1 : 0.85) * (currentModule.investment / 165)).toFixed(1)) // Mock dynamic scaling
  }));

  return (
    <div className="flex h-full bg-slate-50 relative">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shrink-0">
            <div className="flex items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">分布式光伏配置</h2>
                    <p className="text-xs text-slate-500">屋顶光伏与BIPV一体化发电策略</p>
                </div>
                {/* Global Module Toggle */}
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full ml-4">
                    <span className={`text-xs font-bold ${currentModule.isActive ? 'text-primary' : 'text-slate-400'}`}>
                        {currentModule.isActive ? '模块已启用' : '模块已停用'}
                    </span>
                    <button 
                        onClick={() => toggleModule('retrofit-solar')}
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
            <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Strategy Selection */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center justify-between">
                        <span className="flex items-center"><span className="material-icons text-primary mr-2">tune</span> 改造策略选择</span>
                        <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                            当前选择会对投资额产生 <span className="font-bold text-orange-600">{strategy === 'rooftop' ? '基准' : '+85%'}</span> 影响
                        </span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className={`cursor-pointer group relative p-4 rounded-lg border-2 transition-all h-full shadow-sm flex flex-col ${strategy === 'rooftop' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-200 hover:border-primary/50'}`}>
                            <input type="radio" name="strategy" className="sr-only" checked={strategy === 'rooftop'} onChange={() => setStrategy('rooftop')} />
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                                    <span className="material-icons">solar_power</span>
                                </div>
                                {strategy === 'rooftop' && <span className="material-icons text-primary">check_circle</span>}
                            </div>
                            <h4 className="font-bold text-slate-900 mb-1">常规屋顶光伏</h4>
                            <p className="text-xs text-slate-500 leading-relaxed mb-2">利用闲置屋顶安装组件，成本低，施工快，技术成熟。</p>
                            <div className="mt-auto flex items-center gap-2 text-xs font-medium text-slate-600 bg-white/50 p-1 rounded">
                                <span className="text-orange-600">3.5 元/W</span> | 效率 100%
                            </div>
                        </label>

                        <label className={`cursor-pointer group relative p-4 rounded-lg border-2 transition-all h-full shadow-sm flex flex-col ${strategy === 'bipv' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-200 hover:border-primary/50'}`}>
                            <input type="radio" name="strategy" className="sr-only" checked={strategy === 'bipv'} onChange={() => setStrategy('bipv')} />
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                    <span className="material-icons">window</span>
                                </div>
                                {strategy === 'bipv' && <span className="material-icons text-primary">check_circle</span>}
                            </div>
                            <h4 className="font-bold text-slate-900 mb-1">BIPV 光伏建筑一体化</h4>
                            <p className="text-xs text-slate-500 leading-relaxed mb-2">将光伏组件作为建筑建材，美观且节省建材成本，但投资较高。</p>
                            <div className="mt-auto flex items-center gap-2 text-xs font-medium text-slate-600 bg-white/50 p-1 rounded">
                                <span className="text-orange-600">6.5 元/W</span> | 效率 85%
                            </div>
                        </label>
                    </div>
                </section>

                {/* Detailed Parameters - Read Only for demo, reactive to strategy */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-base font-bold text-slate-800 flex items-center">
                            <span className="material-icons text-primary mr-2">sliders</span> 详细参数设置 (自动计算)
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">组件类型</label>
                            <input disabled value={strategy === 'rooftop' ? "单晶硅 (550W)" : "BIPV 定制组件"} className="block w-full rounded-lg border-slate-200 bg-slate-50 text-slate-500 sm:text-sm py-2.5 px-3 border outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">安装单价 (自动)</label>
                            <div className="relative">
                                <input type="number" disabled value={strategy === 'rooftop' ? 3.5 : 6.5} className="block w-full rounded-lg border-slate-200 bg-slate-50 text-slate-500 sm:text-sm pl-4 pr-16 py-2.5 border outline-none" />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">¥ / W</span></div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">自发自用比例</label>
                            <div className="relative">
                                <input type="number" defaultValue={85} className="block w-full rounded-lg border-slate-300 bg-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm pl-4 pr-12 py-2.5 border outline-none" />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">%</span></div>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">年衰减率</label>
                            <div className="relative">
                                <input type="number" defaultValue={0.5} className="block w-full rounded-lg border-slate-300 bg-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm pl-4 pr-12 py-2.5 border outline-none" />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><span className="text-slate-500 sm:text-sm font-medium">%</span></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Building Details */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center justify-between">
                        <span className="flex items-center"><span className="material-icons text-primary mr-2">domain</span> 楼栋铺设详情</span>
                        <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">共 {buildings.length} 个建筑单元</span>
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
                                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                                <span className="flex items-center"><span className="material-icons text-[14px] mr-1">square_foot</span>可用面积: {b.area} ㎡</span>
                                            </div>
                                        </div>
                                    </div>
                                    {!b.active && <span className="text-xs font-medium text-slate-400 border border-slate-200 px-2 py-1 rounded">未启用</span>}
                                </div>
                                {b.active && (
                                    <div className="grid grid-cols-2 gap-4 mt-4 pl-8 border-t border-slate-200 pt-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">装机容量 (kW)</label>
                                            <input type="number" disabled value={Math.floor(b.area * 0.15)} className="w-full text-sm border border-slate-200 bg-slate-50 text-slate-500 rounded-md py-1.5 px-3 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">预估造价 (万元)</label>
                                            <input type="number" disabled value={(Math.floor(b.area * 0.15) * (strategy === 'rooftop' ? 3.5 : 6.5) / 10).toFixed(1)} className="w-full text-sm border border-slate-200 bg-slate-50 text-slate-500 rounded-md py-1.5 px-3 outline-none" />
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

      {/* Right Sidebar */}
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
                      <div className="p-1.5 bg-yellow-100 rounded text-yellow-600"><span className="material-icons text-sm">bolt</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">{currentModule.kpiSecondary.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">{currentModule.kpiSecondary.value}</span>
                  </div>
              </div>

               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-red-100 rounded text-red-600"><span className="material-icons text-sm">savings</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">年电费收益</span>
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

              {/* Chart Container - Clickable */}
              <div 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer group relative transition-all hover:border-primary/50 hover:shadow-md"
                onClick={() => setIsChartExpanded(true)}
              >
                  <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 rounded text-blue-600"><span className="material-icons text-sm">bar_chart</span></div>
                          <span className="text-xs font-semibold text-slate-500 uppercase">月度发电预测</span>
                      </div>
                      <span className="material-icons text-slate-300 text-sm group-hover:text-primary transition-colors">open_in_full</span>
                  </div>
                  <div className="h-32 w-full pointer-events-none">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} barGap={2}>
                              <XAxis dataKey="name" tick={{fontSize: 9, fill: '#94a3b8'}} axisLine={false} tickLine={false} interval={1} />
                              <Bar dataKey="retrofit" fill="#fbbf24" radius={[2,2,0,0]} />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors rounded-xl"></div>
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
                            月度发电量详细预测
                        </h2>
                        <p className="text-slate-500 mt-1 ml-12">基于当地气象数据与系统配置的模拟结果</p>
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
                                label={{ value: '发电量 (万kWh)', angle: -90, position: 'insideLeft', style: {textAnchor: 'middle', fill: '#94a3b8', fontSize: 12} }} 
                            />
                            <Tooltip 
                                cursor={{fill: '#f8fafc'}} 
                                contentStyle={{
                                    borderRadius: '12px', 
                                    border: 'none', 
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                    padding: '12px 16px'
                                }}
                                formatter={(value: number) => [`${value} 万kWh`, '预估发电量']}
                                labelStyle={{color: '#64748b', marginBottom: '4px', fontSize: '14px'}}
                                itemStyle={{color: '#1e293b', fontWeight: 600, fontSize: '16px'}}
                            />
                            <Bar 
                                dataKey="retrofit" 
                                name="发电量" 
                                fill="url(#colorPv)" 
                                radius={[6,6,0,0]}
                                animationDuration={1500}
                            />
                            <defs>
                                <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={1}/>
                                    <stop offset="100%" stopColor="#d97706" stopOpacity={1}/>
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

export default RetrofitSolar;