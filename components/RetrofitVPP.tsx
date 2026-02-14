import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine, Cell, PieChart, Pie, Brush } from 'recharts';
import { useProject } from '../context/ProjectContext';

// --- Constants & Config ---
const REGIONS = {
    shanghai: { label: '上海 (补: 3元/kWh)', subsidyCap: 60, subsidyEnergy: 3.0, value: 'shanghai' }, 
    guangdong: { label: '广东 (补: 4.5元/kWh)', subsidyCap: 50, subsidyEnergy: 4.5, value: 'guangdong' },
    jiangsu: { label: '江苏 (补: 2.5元/kWh)', subsidyCap: 40, subsidyEnergy: 2.5, value: 'jiangsu' },
    zhejiang: { label: '浙江 (补: 3.5元/kWh)', subsidyCap: 55, subsidyEnergy: 3.5, value: 'zhejiang' },
    other: { label: '其他地区', subsidyCap: 30, subsidyEnergy: 2.0, value: 'other' }
};

const RESOURCE_FACTORS = {
    storage: { label: '工商业储能', factor: 0.9, icon: 'battery_charging_full', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
    ev: { label: '充电桩群', factor: 0.3, icon: 'ev_station', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
    hvac: { label: '中央空调', factor: 0.15, icon: 'ac_unit', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    lighting: { label: '智能照明', factor: 0.1, icon: 'lightbulb', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' }
};

// --- Mock Simulation Generator ---
const generateResponseData = (baselineLoad: number, responseCap: number, startHour: number, duration: number) => {
    return Array.from({ length: 24 }, (_, i) => {
        // Create a nice bell curve for base load peaking around 14:00
        const base = baselineLoad * (0.4 + 0.6 * Math.exp(-Math.pow(i - 14, 2) / (2 * 16))) + (Math.random() * 20);
        
        let isResponse = i >= startHour && i < startHour + duration;
        let actualLoad = base;
        let responseAmount = 0;
        
        if (isResponse) {
            responseAmount = Math.min(responseCap, base * 0.8); // Can't reduce below 20% base
            actualLoad = base - responseAmount;
        }

        return {
            hour: `${i}:00`,
            base: Math.round(base),
            actual: Math.round(actualLoad),
            response: Math.round(responseAmount),
            isResponse
        };
    });
};

export default function RetrofitVPP() {
  const { modules, toggleModule, updateModule, saveProject, transformers } = useProject();
  const currentModule = modules['retrofit-vpp'];
  const savedParams = currentModule.params || {};

  // --- External Module Data ---
  const storageModule = modules['retrofit-storage'];
  const evModule = modules['retrofit-ev'];
  const hvacModule = modules['retrofit-hvac'];
  const lightingModule = modules['retrofit-lighting'];

  // --- State ---
  const [mode, setMode] = useState<'quick' | 'precise'>(savedParams.mode || 'quick');
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({ base: true, actual: true, response: true });
  
  // Quick Mode State
  const [quickState, setQuickState] = useState(savedParams.quickState || {
      region: 'shanghai',
      responseLevel: 'basic', 
      selectedResources: { storage: true, ev: true, hvac: true, lighting: false }
  });

  // Precise Mode State
  const [preciseState, setPreciseState] = useState(savedParams.preciseState || {
      duration: 2, // hours
      reliability: 0.9, // 0-1
      annualFrequency: 20, // times per year
      considerOpportunityCost: true, // deduct arbitrage loss
      spotPriceSpread: 0.8 
  });

  // --- Calculations ---

  // 1. Resource Aggregation
  const aggregation = useMemo(() => {
      // Helper to safely extract capacity
      const getVal = (mod: any, path: string[]) => {
          if (!mod || !mod.isActive) return 0;
          let current = mod.params;
          for (let p of path) {
              if (current && current[p] !== undefined) current = current[p];
              else return 0;
          }
          return typeof current === 'number' ? current : 0;
      };

      // Extract raw capacities with safe fallbacks
      const raw = {
          storage: getVal(storageModule, ['basicParams', 'power']) || 100,
          ev: evModule?.isActive ? 200 : 0, // Simplified for demo
          hvac: hvacModule?.isActive ? 1200 : 0, 
          lighting: lightingModule?.isActive ? 200 : 0
      };

      // Calculate Adjustables
      const adjustables = {
          storage: raw.storage * RESOURCE_FACTORS.storage.factor,
          ev: raw.ev * RESOURCE_FACTORS.ev.factor,
          hvac: raw.hvac * RESOURCE_FACTORS.hvac.factor,
          lighting: raw.lighting * RESOURCE_FACTORS.lighting.factor
      };

      // Total based on selection
      let totalAdjustable = 0;
      if (quickState.selectedResources.storage) totalAdjustable += adjustables.storage;
      if (quickState.selectedResources.ev) totalAdjustable += adjustables.ev;
      if (quickState.selectedResources.hvac) totalAdjustable += adjustables.hvac;
      if (quickState.selectedResources.lighting) totalAdjustable += adjustables.lighting;

      return { raw, adjustables, totalAdjustable };
  }, [quickState.selectedResources, storageModule, evModule, hvacModule, lightingModule]);

  // 2. Financials
  const financials = useMemo(() => {
      const regionData = REGIONS[quickState.region as keyof typeof REGIONS];
      const capacity = aggregation.totalAdjustable;
      
      let annualRevenue = 0;
      let opportunityCost = 0;
      let investment = 26.5; // Base gateway + integration cost (wan) - Mock fixed for UI match

      // Logic for revenue
      const freq = preciseState.annualFrequency;
      const duration = preciseState.duration;
      
      // A. Capacity Subsidy
      const capRevenue = capacity * regionData.subsidyCap;
      // B. Energy/Response Subsidy
      const energyRevenue = capacity * duration * freq * regionData.subsidyEnergy;
      
      // Opportunity Cost (Lost Arbitrage for Storage)
      if (preciseState.considerOpportunityCost && quickState.selectedResources.storage) {
          opportunityCost = (aggregation.adjustables.storage * duration * freq * 0.6) / 10000;
      }

      annualRevenue = (capRevenue + energyRevenue) / 10000 - opportunityCost;

      // Cash Flow
      const netProfit = annualRevenue - (investment * 0.02); // 2% O&M
      const payback = netProfit > 0 ? investment / netProfit : 0;

      return {
          investment: parseFloat(investment.toFixed(1)),
          grossRevenue: parseFloat((annualRevenue + opportunityCost).toFixed(1)),
          netRevenue: parseFloat(annualRevenue.toFixed(1)),
          opportunityCost: parseFloat(opportunityCost.toFixed(2)),
          payback: parseFloat(payback.toFixed(1)),
          capacity: parseFloat(capacity.toFixed(0))
      };
  }, [quickState, preciseState, aggregation]);

  // 3. Simulation Data
  const simData = useMemo(() => {
      const baseLoad = transformers.reduce((a, t) => a + t.capacity, 0) * 0.8 || 1200;
      return generateResponseData(baseLoad, aggregation.totalAdjustable, 14, preciseState.duration);
  }, [aggregation.totalAdjustable, preciseState.duration, transformers]);

  // --- Effects ---
  useEffect(() => {
      const newParams = { mode, quickState, preciseState };
      // Deep check to prevent infinite loop
      const hasChanged = 
          currentModule.investment !== financials.investment ||
          currentModule.yearlySaving !== financials.netRevenue ||
          JSON.stringify(currentModule.params?.quickState) !== JSON.stringify(quickState) ||
          JSON.stringify(currentModule.params?.preciseState) !== JSON.stringify(preciseState);

      if (hasChanged) {
          updateModule('retrofit-vpp', {
              strategy: mode,
              investment: financials.investment,
              yearlySaving: financials.netRevenue,
              kpiPrimary: { label: '调节容量', value: `${financials.capacity} kW` },
              kpiSecondary: { label: '综合收益', value: `¥${financials.netRevenue}万` },
              params: newParams
          });
      }
  }, [mode, quickState, preciseState, financials, updateModule, currentModule]);
  
  if (!currentModule) return null;

  return (
    <div className="flex h-full bg-slate-50 relative">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shrink-0">
            <div className="flex items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">虚拟电厂 (VPP) 配置</h2>
                    <p className="text-xs text-slate-500">源网荷储聚合响应与辅助服务交易</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full ml-4">
                    <span className={`text-xs font-bold ${currentModule.isActive ? 'text-primary' : 'text-slate-400'}`}>
                        {currentModule.isActive ? '模块已启用' : '模块已停用'}
                    </span>
                    <button 
                        onClick={() => toggleModule('retrofit-vpp')}
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

        <div className={`flex-1 overflow-y-auto p-6 pb-32 transition-opacity duration-300 ${currentModule.isActive ? 'opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>
            <div className="max-w-7xl mx-auto space-y-4">
                
                {/* TOP ROW: Configuration - Compact */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    
                    {/* 1. Aggregated Resource Pool - Compact 2x2 Grid */}
                    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <span className="material-icons text-blue-500 text-lg">hub</span> 聚合资源池
                            </h3>
                            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">总可调: {aggregation.totalAdjustable.toFixed(0)} kW</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 flex-1">
                            {Object.entries(RESOURCE_FACTORS).map(([key, config]) => {
                                const rawVal = aggregation.raw[key as keyof typeof aggregation.raw];
                                const adjVal = aggregation.adjustables[key as keyof typeof aggregation.adjustables];
                                const isSelected = quickState.selectedResources[key as keyof typeof quickState.selectedResources];

                                return (
                                    <div key={key} 
                                        className={`relative p-2.5 rounded-lg border transition-all cursor-pointer group flex flex-col justify-between ${isSelected ? `bg-slate-50 border-slate-200` : 'bg-white border-slate-100 hover:border-slate-200 opacity-60'}`}
                                        onClick={() => setQuickState(p => ({...p, selectedResources: {...p.selectedResources, [key]: !isSelected}}))}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-md ${config.bg} ${config.color}`}>
                                                    <span className="material-icons text-sm">{config.icon}</span>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-slate-800">{config.label}</div>
                                                    <div className="text-[10px] text-slate-400">装机 {rawVal.toFixed(0)}</div>
                                                </div>
                                            </div>
                                            {isSelected ? (
                                                <span className="material-icons text-primary text-sm">check_circle</span>
                                            ) : (
                                                <span className="material-icons text-slate-200 text-sm group-hover:text-slate-300">radio_button_unchecked</span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center border-t border-slate-200/50 pt-1.5 mt-1">
                                            <span className="bg-white border border-slate-100 px-1 py-0.5 rounded text-[10px] text-slate-500 font-medium">x{(config.factor * 100).toFixed(0)}%</span>
                                            <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-slate-300'}`}>{adjVal.toFixed(0)} kW</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* 2. Response Parameters - Compact */}
                    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-full flex flex-col">
                        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <span className="material-icons text-orange-500 text-lg">gavel</span> 
                            交易响应参数
                        </h3>
                        
                        <div className="space-y-4 flex-1 flex flex-col justify-center">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 mb-1.5 block uppercase">所在区域政策</label>
                                <div className="relative">
                                    <select 
                                        value={quickState.region}
                                        onChange={(e) => setQuickState({...quickState, region: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-xs font-bold text-slate-700 outline-none focus:border-primary appearance-none cursor-pointer hover:bg-white hover:border-slate-300 transition-colors"
                                    >
                                        {Object.entries(REGIONS).map(([k, v]) => (
                                            <option key={k} value={k}>{v.label}</option>
                                        ))}
                                    </select>
                                    <span className="material-icons absolute right-2 top-2 text-slate-400 pointer-events-none text-base">expand_more</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 mb-1.5 block uppercase">单次响应时长</label>
                                    <div className="relative group">
                                        <input 
                                            type="number" 
                                            value={preciseState.duration} 
                                            onChange={(e)=>setPreciseState({...preciseState, duration: parseFloat(e.target.value)})} 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-primary focus:bg-white transition-colors" 
                                        />
                                        <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-medium">小时</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 mb-1.5 block uppercase">年响应频次</label>
                                    <div className="relative group">
                                        <input 
                                            type="number" 
                                            value={preciseState.annualFrequency} 
                                            onChange={(e)=>setPreciseState({...preciseState, annualFrequency: parseFloat(e.target.value)})} 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-primary focus:bg-white transition-colors" 
                                        />
                                        <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-medium">次</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between mb-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">可靠性系数 (冗余度)</label>
                                    <span className="text-[10px] font-bold text-indigo-600">{(preciseState.reliability * 100).toFixed(0)}%</span>
                                </div>
                                <input type="range" min="0.5" max="1.0" step="0.05" value={preciseState.reliability} onChange={(e)=>setPreciseState({...preciseState, reliability: parseFloat(e.target.value)})} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                            </div>
                        </div>
                    </section>
                </div>

                {/* BOTTOM ROW: Chart & Metrics */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    
                    {/* Simulation Chart - Reduced Height */}
                    <section className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-4 relative overflow-hidden h-[340px] flex flex-col">
                        <div className="flex justify-between items-center mb-2 shrink-0">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <span className="material-icons text-green-500 text-lg">stacked_line_chart</span> 
                                    负荷聚合与响应模拟
                                </h3>
                            </div>
                        </div>

                        <div className="flex-1 w-full min-h-0 relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={simData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="hour" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)', padding: '8px', fontSize: '12px'}}
                                        labelStyle={{color: '#64748b', marginBottom: '4px', fontWeight: 'bold'}}
                                    />
                                    <Legend onClick={(e) => setVisibleSeries(p => ({...p, [String(e.dataKey)]: !p[String(e.dataKey)]}))} wrapperStyle={{cursor: 'pointer'}} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="base" 
                                        name="基线负荷" 
                                        fill="#cbd5e1" 
                                        stroke="#94a3b8" 
                                        fillOpacity={0.2} 
                                        strokeWidth={2} 
                                        hide={!visibleSeries.base}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="actual" 
                                        name="响应后负荷" 
                                        fill="url(#colorVpp)" 
                                        stroke="#4f46e5" 
                                        strokeWidth={3} 
                                        hide={!visibleSeries.actual}
                                    />
                                    <Bar 
                                        dataKey="response" 
                                        name="下调电量" 
                                        fill="#4ade80" 
                                        barSize={24} 
                                        opacity={0.8} 
                                        radius={[2, 2, 0, 0]} 
                                        hide={!visibleSeries.response}
                                    />
                                    <Brush dataKey="hour" height={20} stroke="#cbd5e1" travellerWidth={10} tickFormatter={() => ''} />
                                    <defs>
                                        <linearGradient id="colorVpp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    {/* Metric Cards - Stacked Vertically to match chart height */}
                    <div className="lg:col-span-1 flex flex-col gap-4 h-[340px]">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center flex-1 group hover:border-yellow-200 hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-3">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">单次响应最大获利</p>
                                <div className="w-8 h-8 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <span className="material-icons text-lg">paid</span>
                                </div>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-slate-800">¥ {(financials.netRevenue / preciseState.annualFrequency * 10000).toFixed(0)}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">基于 {preciseState.duration} 小时响应时长</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center flex-1 group hover:border-blue-200 hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-3">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">资产增值溢价</p>
                                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <span className="material-icons text-lg">trending_up</span>
                                </div>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-slate-800">+{(financials.netRevenue / 20 * 100).toFixed(1)}%</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">VPP Ready 资产认证</p>
                        </div>
                    </div>
                </div>
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
               
               {/* 1. Net Revenue Card */}
               <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-green-100 rounded text-green-600"><span className="material-icons text-sm">payments</span></div>
                      <span className="text-xs font-bold text-slate-500 uppercase">年度 VPP 净收益</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold text-slate-900 tracking-tight">¥ {financials.netRevenue.toFixed(1)}</span>
                      <span className="text-base text-slate-500 font-medium">万</span>
                  </div>
                  {financials.opportunityCost > 0 && (
                      <div className="text-xs text-red-400 flex items-center gap-1 bg-red-50 px-2 py-1 rounded w-fit">
                          <span className="material-icons text-[12px]">remove_circle_outline</span>
                          已扣除机会成本: ¥ {financials.opportunityCost.toFixed(2)} 万
                      </div>
                  )}
              </div>

              {/* 2. Detailed Breakdown Chart (Stacked Area) */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-72">
                  <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-slate-500 uppercase">收益构成分析</span>
                  </div>
                  <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[
                            { name: 'Y1', cap: 10, energy: 5, spot: 0 },
                            { name: 'Y2', cap: 12, energy: 8, spot: 2 },
                            { name: 'Y3', cap: 15, energy: 12, spot: 5 },
                            { name: 'Y4', cap: 15, energy: 15, spot: 8 },
                            { name: 'Y5', cap: 15, energy: 18, spot: 12 },
                        ]} margin={{top: 5, right: 0, left: -20, bottom: 0}}>
                            <defs>
                                <linearGradient id="colorCap" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorSpot" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{borderRadius: '8px', fontSize: '12px'}} />
                            <Area type="monotone" dataKey="spot" stackId="1" stroke="#fbbf24" fill="url(#colorSpot)" name="现货差价" />
                            <Area type="monotone" dataKey="energy" stackId="1" stroke="#34d399" fill="url(#colorEnergy)" name="电量补贴" />
                            <Area type="monotone" dataKey="cap" stackId="1" stroke="#818cf8" fill="url(#colorCap)" name="容量补贴" />
                        </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-3 mt-3 text-[10px] text-slate-500 font-medium">
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-400"></div>容量</div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400"></div>电量</div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"></div>现货</div>
                  </div>
              </div>

               {/* 3. Investment */}
               <div className="bg-primary p-5 rounded-xl shadow-lg shadow-primary/30 text-white relative overflow-hidden group">
                   <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-white/20 transition-all"></div>
                   <div className="flex items-center gap-2 mb-2 relative z-10">
                       <div className="p-1.5 bg-white/20 rounded text-white"><span className="material-icons text-sm">account_balance_wallet</span></div>
                       <span className="text-xs font-semibold text-blue-100 uppercase">网关/接入投资</span>
                   </div>
                   <div className="flex items-baseline gap-2 relative z-10">
                       <span className="text-3xl font-bold tracking-tight">¥ {financials.investment}</span>
                       <span className="text-sm text-blue-100">万元</span>
                   </div>
                   <div className="mt-3 text-xs text-blue-100 opacity-80 font-medium">
                       静态回收期: <span className="text-white font-bold">{financials.payback} 年</span>
                   </div>
               </div>
          </div>
      </aside>
    </div>
  );
}