import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ComposedChart, Line, Area, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine, PieChart, Pie, Cell } from 'recharts';
import { useProject } from '../context/ProjectContext';

// --- Constants ---
const PACKAGES = {
    monitor: { id: 'monitor', name: '基础监控型', desc: '数据采集与可视化，不含反向控制', costBase: 15, hardware: '轻量级网关' },
    smart: { id: 'smart', name: '智能平衡型', desc: '源网荷储协同优化，削峰填谷', costBase: 35, hardware: '标准MGCC' },
    island: { id: 'island', name: '全能保障型', desc: '支持无缝离网切换与黑启动', costBase: 65, hardware: '工业级控制器 + STS' }
};

const DEFAULTS = {
    mode: 'quick',
    quickState: {
        scope: { solar: true, storage: true, ev: false, load: true },
        voltage: '0.4kV',
        packageId: 'smart'
    },
    preciseState: {
        hardware: {
            mgccType: 'Industrial IPC',
            mgccCount: 1,
            meterCount: 15,
            gatewayCount: 4,
            switchgear: 25 // 万元 (Switchgear retrofit cost)
        },
        performance: {
            switchTime: '20ms',
            blackStart: true
        },
        loads: {
            l1: 30, // Critical % (Must keep)
            l2: 40, // Important %
            l3: 30  // Adjustable % (Can shed)
        },
        economics: {
            demandPrice: 40, // 元/kW/月 (Demand Charge Price)
            vppPrice: 3.5, // 元/kW (VPP Compensation)
            outageLoss: 500, // 元/kW (Estimated loss per kW during outage)
            vppRatio: 10 // % participation
        }
    }
};

// --- Mock Data Generator for Simulation ---
const generateSimData = (isIsland: boolean, loadSheddingRatio: number, demandLimit: number) => {
    const data = [];
    for (let i = 0; i < 24; i++) {
        // Base curve simulation
        const baseLoad = 100 + Math.sin((i-6)/24 * Math.PI*2) * 80 + Math.random() * 10; 
        const solar = (i > 6 && i < 18) ? Math.sin((i-6)/12 * Math.PI) * 120 : 0;
        
        let grid = 0;
        let storage = 0;
        let load = baseLoad;
        let shedded = 0;

        // Simulate outage between 11:00 - 14:00 if isIsland is true
        const isOutagePeriod = isIsland && i >= 11 && i <= 14;

        if (isOutagePeriod) {
            grid = 0; // Grid lost
            
            // Load Shedding Logic
            const essentialLoad = baseLoad * loadSheddingRatio; 
            shedded = baseLoad - essentialLoad;
            load = essentialLoad;
            
            // Battery picks up the slack (Load - Solar)
            storage = Math.max(0, load - solar); 
        } else {
            // Normal Grid Connected Mode with Demand Limiting
            const netLoad = baseLoad - solar;
            
            // If Net Load > Demand Limit, Storage discharges to flatten peak
            if (netLoad > demandLimit) {
                storage = netLoad - demandLimit; // Discharge (Positive)
                grid = demandLimit;
            } else {
                grid = netLoad;
                // Simple charging logic when load is low (e.g., night)
                if (grid < 50 && i < 6) {
                    const charge = 20;
                    grid += charge;
                    storage = -charge; // Negative means charging
                }
            }
        }

        data.push({
            hour: `${i}:00`,
            load: Math.round(load),
            shedded: Math.round(shedded),
            solar: Math.round(solar),
            grid: Math.round(grid),
            storage: Math.round(storage), // Positive = Discharge, Negative = Charge
            demandLimit: demandLimit,
            isOutage: isOutagePeriod
        });
    }
    return data;
};

export default function RetrofitMicrogrid() {
  const { modules, toggleModule, updateModule, saveProject, transformers } = useProject();
  const currentModule = modules['retrofit-microgrid'];
  const solarModule = modules['retrofit-solar'];
  const aiModule = modules['retrofit-ai'];
  
  // Use params from context or defaults
  const params = {
      mode: currentModule.params?.mode || DEFAULTS.mode,
      quickState: { ...DEFAULTS.quickState, ...currentModule.params?.quickState },
      preciseState: {
          ...DEFAULTS.preciseState,
          ...currentModule.params?.preciseState,
          // Ensure nested objects are merged correctly
          hardware: { ...DEFAULTS.preciseState.hardware, ...currentModule.params?.preciseState?.hardware },
          performance: { ...DEFAULTS.preciseState.performance, ...currentModule.params?.preciseState?.performance },
          loads: { ...DEFAULTS.preciseState.loads, ...currentModule.params?.preciseState?.loads },
          economics: { ...DEFAULTS.preciseState.economics, ...currentModule.params?.preciseState?.economics }
      }
  };

  // Check if AI Platform is active and bundling Microgrid
  const isAiBundled = useMemo(() => {
      return aiModule?.isActive && 
             aiModule.params?.pricingMode === 'bundle' && 
             aiModule.params?.bundleScope?.microgrid;
  }, [aiModule]);

  // --- State ---
  const [isIslandSimulating, setIsIslandSimulating] = useState(false);

  // --- Context Data for Calculation ---
  const solarCapacity = useMemo(() => {
      const match = solarModule?.kpiPrimary?.value?.match(/(\d+(\.\d+)?)/);
      return match ? parseFloat(match[0]) : 200; // Default 200kW if no solar module
  }, [solarModule]);

  const totalCapacity = useMemo(() => {
      return transformers.reduce((acc, t) => acc + t.capacity, 0) || 1000;
  }, [transformers]);

  // --- Financial Calculations ---
  const financials = useMemo(() => {
      let investment = 0;
      let deduction = 0; // Cost removed due to AI bundle
      
      // Revenue Buckets
      let synergyRevenue = 0; // 硬件协同 (自用率提升 + 能效管理)
      let demandRevenue = 0;  // 需量优化
      let vppRevenue = 0;     // 辅助服务
      let safetyRevenue = 0;  // 可靠性溢价

      if (params.mode === 'quick') {
          const pkg = PACKAGES[params.quickState.packageId as keyof typeof PACKAGES];
          let scopeCount = 0;
          if (params.quickState.scope.solar) scopeCount++;
          if (params.quickState.scope.storage) scopeCount++;
          if (params.quickState.scope.ev) scopeCount++;
          if (params.quickState.scope.load) scopeCount++;

          // Investment: Base + Scope Adder + Voltage Adder
          investment = pkg.costBase + (scopeCount * 5) + (params.quickState.voltage === '10kV' ? 15 : 0);
          
          // Deduct software portion if bundled
          if (isAiBundled) {
              // Assume ~30-40% of package base cost is software license
              deduction = pkg.costBase * 0.4;
              investment -= deduction;
          }
          
          // 1. Synergy Revenue: Increased Solar Self-Consumption
          const efficiencyLift = params.quickState.packageId === 'monitor' ? 0.02 : (params.quickState.packageId === 'smart' ? 0.12 : 0.15);
          const priceSpread = 0.5; // User Price - Feed-in Price (approx)
          const addedSelfUse = solarCapacity * 1100 * efficiencyLift * priceSpread / 10000; // 万元
          
          // 2. Management Efficiency (1% of total bill)
          const estimatedBill = totalCapacity * 0.4 * 2000 * 0.8 / 10000; // Mock bill
          const mgmtSavings = estimatedBill * 0.015;

          synergyRevenue = addedSelfUse + mgmtSavings;
          
          if (params.quickState.packageId !== 'monitor') {
              demandRevenue = synergyRevenue * 0.5; // Heuristic
          }

      } else {
          // Precise Investment
          // MGCC Unit Cost logic: 15万 standard. If bundled, assume 10万 is SW, 5万 is HW (IPC).
          const mgccUnitCost = isAiBundled ? 5 : 15; 
          
          // Calculate reduction for display
          if (isAiBundled) {
              deduction = (15 - mgccUnitCost) * params.preciseState.hardware.mgccCount;
          }

          investment = (params.preciseState.hardware.mgccCount * mgccUnitCost) + 
                       (params.preciseState.hardware.meterCount * 0.2) + 
                       (params.preciseState.hardware.gatewayCount * 0.5) + 
                       params.preciseState.hardware.switchgear;
          
          // 1. Demand Savings
          const peakShavingKW = totalCapacity * 0.15; 
          demandRevenue = (peakShavingKW * params.preciseState.economics.demandPrice * 12) / 10000;

          // 2. VPP Revenue
          const vppKW = totalCapacity * (params.preciseState.economics.vppRatio / 100);
          vppRevenue = (vppKW * params.preciseState.economics.vppPrice * 50) / 10000;

          // 3. Reliability Premium
          const criticalKW = totalCapacity * 0.6 * ((params.preciseState.loads.l1 + params.preciseState.loads.l2)/100);
          safetyRevenue = (criticalKW * 4 * params.preciseState.economics.outageLoss) / 10000;

          // 4. Synergy
          synergyRevenue = (investment * 0.1);
      }

      const totalDirectRevenue = synergyRevenue + demandRevenue + vppRevenue; // Cash flow
      const totalValue = totalDirectRevenue + safetyRevenue; // Value including safety

      const payback = totalDirectRevenue > 0 ? investment / totalDirectRevenue : 0;
      const paybackWithSafety = totalValue > 0 ? investment / totalValue : 0;

      // Cash Flows for Chart (10 Years)
      const cashFlowsHardwareOnly = [-investment];
      const cashFlowsSmart = [-investment];
      for(let i=0; i<10; i++) {
          cashFlowsHardwareOnly.push(totalDirectRevenue * 0.6); // Hypothetical low efficiency without smart control
          cashFlowsSmart.push(totalDirectRevenue);
      }

      return {
          investment: parseFloat(investment.toFixed(1)),
          deduction: parseFloat(deduction.toFixed(1)),
          synergy: parseFloat(synergyRevenue.toFixed(1)),
          demand: parseFloat(demandRevenue.toFixed(1)),
          vpp: parseFloat(vppRevenue.toFixed(1)),
          safety: parseFloat(safetyRevenue.toFixed(1)),
          totalDirect: parseFloat(totalDirectRevenue.toFixed(1)),
          totalValue: parseFloat(totalValue.toFixed(1)),
          payback: parseFloat(payback.toFixed(1)),
          paybackWithSafety: parseFloat(paybackWithSafety.toFixed(1)),
          cashFlowsHardwareOnly,
          cashFlowsSmart
      };
  }, [params.mode, params.quickState, params.preciseState, solarCapacity, totalCapacity, isAiBundled]);

  // Simulation Data
  const keepRatio = params.mode === 'precise' 
      ? (params.preciseState.loads.l1 + params.preciseState.loads.l2) / 100 
      : 0.6;
  const demandLimitVal = totalCapacity * 0.7; // Mock demand limit line

  const simData = useMemo(() => generateSimData(isIslandSimulating, keepRatio, demandLimitVal), [isIslandSimulating, keepRatio, demandLimitVal]);

  // Handle Updates
  const handleUpdate = useCallback((newParamsPart: any) => {
      const newParams = { ...params, ...newParamsPart };
      updateModule('retrofit-microgrid', {
          params: newParams
      });
  }, [params, updateModule]);

  // Sync Financials to Context (Guarded)
  useEffect(() => {
      if (
          currentModule.investment !== financials.investment ||
          currentModule.yearlySaving !== financials.totalDirect
      ) {
          updateModule('retrofit-microgrid', {
              strategy: params.mode === 'quick' ? params.quickState.packageId : 'custom_topology',
              investment: financials.investment,
              yearlySaving: financials.totalDirect,
              kpiPrimary: { label: '综合回报期', value: `${financials.payback} 年` },
              kpiSecondary: { label: '需量收益', value: `¥${financials.demand}万/年` },
          });
      }
  }, [financials, currentModule.investment, currentModule.yearlySaving, params.mode, params.quickState.packageId, updateModule]);


  // --- Handlers ---
  const handleLoadChange = useCallback((type: 'l1'|'l2'|'l3', val: number) => {
      handleUpdate({
          preciseState: {
              ...params.preciseState,
              loads: { ...params.preciseState.loads, [type]: val }
          }
      });
  }, [handleUpdate, params.preciseState]);

  const handlePreciseUpdate = useCallback((section: keyof typeof params.preciseState, field: string, value: any) => {
      handleUpdate({
          preciseState: {
              ...params.preciseState,
              [section]: {
                  ...params.preciseState[section as keyof typeof params.preciseState],
                  [field]: value
              }
          }
      });
  }, [handleUpdate, params.preciseState]);

  if (!currentModule) return null;

  return (
    <div className="flex h-full bg-slate-50 relative">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shrink-0">
            <div className="flex items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">微电网系统配置</h2>
                    <p className="text-xs text-slate-500">源网荷储协同控制与离网保障体系</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full ml-4">
                    <span className={`text-xs font-bold ${currentModule.isActive ? 'text-primary' : 'text-slate-400'}`}>
                        {currentModule.isActive ? '模块已启用' : '模块已停用'}
                    </span>
                    <button 
                        onClick={() => toggleModule('retrofit-microgrid')}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${currentModule.isActive ? 'bg-primary' : 'bg-slate-300'}`}
                    >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${currentModule.isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>
            {isAiBundled && (
                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg animate-fade-in">
                    <span className="material-icons text-indigo-600 text-sm">inventory_2</span>
                    <span className="text-xs font-bold text-indigo-700">已纳入 AI 平台打包报价</span>
                </div>
            )}
        </header>

        <div className={`flex-1 overflow-y-auto p-8 pb-32 transition-opacity duration-300 ${currentModule.isActive ? 'opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>
            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* Bundle Notice */}
                {isAiBundled && (
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-3">
                        <span className="material-icons text-indigo-500 mt-0.5">info</span>
                        <div>
                            <h4 className="text-sm font-bold text-indigo-900">软件成本已减免</h4>
                            <p className="text-xs text-indigo-700 mt-1">
                                由于 AI 管理平台已开启“一体化打包报价”并包含微电网 EMS 功能，本模块的投资概算已自动扣除 
                                <span className="font-bold underline ml-1">¥ {financials.deduction} 万元</span> 的软件授权费用，仅保留控制器等硬件成本。
                            </p>
                        </div>
                    </div>
                )}

                {/* Mode Toggle */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-2">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">系统架构设计</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            {params.mode === 'quick' ? '快速测算：基于覆盖范围与功能包估算协同效益' : '精确估值：基于物理拓扑计算需量、VPP与可靠性价值'}
                        </p>
                    </div>
                    <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex">
                        <button 
                            onClick={() => handleUpdate({ mode: 'quick' })}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${params.mode === 'quick' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <span className="material-icons text-[16px]">speed</span> 快速测算
                        </button>
                        <button 
                            onClick={() => handleUpdate({ mode: 'precise' })}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${params.mode === 'precise' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <span className="material-icons text-[16px]">hub</span> 精确估值
                        </button>
                    </div>
                </div>

                {/* --- QUICK MODE --- */}
                {params.mode === 'quick' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="material-icons text-blue-500">settings_input_component</span> 系统边界配置
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-2 block">控制范围 (关联设备)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            {id: 'solar', label: '分布式光伏', icon: 'solar_power'},
                                            {id: 'storage', label: '储能系统', icon: 'battery_charging_full'},
                                            {id: 'ev', label: '充电桩', icon: 'ev_station'},
                                            {id: 'load', label: '建筑负荷', icon: 'apartment'}
                                        ].map(item => (
                                            <div 
                                                key={item.id}
                                                onClick={() => handleUpdate({ quickState: { ...params.quickState, scope: { ...params.quickState.scope, [item.id]: !params.quickState.scope[item.id as keyof typeof params.quickState.scope] } } })}
                                                className={`cursor-pointer border rounded-lg p-2 flex items-center gap-2 transition-all ${params.quickState.scope[item.id as keyof typeof params.quickState.scope] ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'}`}
                                            >
                                                <span className="material-icons text-sm">{item.icon}</span>
                                                <span className="text-xs font-medium">{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-2 block">并网电压等级</label>
                                    <div className="flex gap-2">
                                        <button onClick={()=>handleUpdate({ quickState: { ...params.quickState, voltage: '0.4kV' } })} className={`flex-1 py-1.5 text-xs rounded border ${params.quickState.voltage==='0.4kV' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'border-slate-200 text-slate-500'}`}>低压 0.4kV</button>
                                        <button onClick={()=>handleUpdate({ quickState: { ...params.quickState, voltage: '10kV' } })} className={`flex-1 py-1.5 text-xs rounded border ${params.quickState.voltage==='10kV' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'border-slate-200 text-slate-500'}`}>中压 10kV</button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="material-icons text-purple-500">inventory_2</span> 功能包选择
                            </h3>
                            <div className="space-y-3">
                                {Object.values(PACKAGES).map(pkg => (
                                    <div 
                                        key={pkg.id}
                                        onClick={() => handleUpdate({ quickState: { ...params.quickState, packageId: pkg.id as any } })}
                                        className={`cursor-pointer p-3 rounded-xl border-2 transition-all flex justify-between items-center ${params.quickState.packageId === pkg.id ? 'border-purple-500 bg-purple-50' : 'border-slate-100 hover:border-slate-200'}`}
                                    >
                                        <div>
                                            <h4 className={`text-sm font-bold ${params.quickState.packageId === pkg.id ? 'text-purple-700' : 'text-slate-700'}`}>{pkg.name}</h4>
                                            <p className="text-[10px] text-slate-500 mt-0.5">{pkg.desc}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-slate-700">
                                                {isAiBundled ? (
                                                    <span className="line-through text-slate-400 mr-1">¥{pkg.costBase}万</span>
                                                ) : (
                                                    <span>¥{pkg.costBase}万</span>
                                                )}
                                            </div>
                                            {isAiBundled && <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1 rounded">打包减免</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {/* --- PRECISE MODE --- */}
                {params.mode === 'precise' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                        {/* 1. Topology & Hardware */}
                        <div className="lg:col-span-1 space-y-6">
                            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <span className="material-icons text-blue-500">hub</span> 硬件拓扑配置
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-500">中央控制器 (MGCC)</span>
                                            {isAiBundled && <span className="text-[9px] text-indigo-500">免软件费</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={()=>handlePreciseUpdate('hardware', 'mgccCount', Math.max(0, params.preciseState.hardware.mgccCount-1))} className="w-6 h-6 bg-slate-100 rounded text-slate-600 flex items-center justify-center hover:bg-slate-200">-</button>
                                            <span className="text-sm font-bold w-4 text-center">{params.preciseState.hardware.mgccCount}</span>
                                            <button onClick={()=>handlePreciseUpdate('hardware', 'mgccCount', params.preciseState.hardware.mgccCount+1)} className="w-6 h-6 bg-slate-100 rounded text-slate-600 flex items-center justify-center hover:bg-slate-200">+</button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500">智能电表 (Meter)</span>
                                        <input type="number" value={params.preciseState.hardware.meterCount} onChange={(e)=>handlePreciseUpdate('hardware', 'meterCount', parseFloat(e.target.value))} className="w-16 text-right border-b border-slate-200 focus:border-primary outline-none text-sm font-bold bg-white text-slate-900"/>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500">通讯网关 (Gateway)</span>
                                        <input type="number" value={params.preciseState.hardware.gatewayCount} onChange={(e)=>handlePreciseUpdate('hardware', 'gatewayCount', parseFloat(e.target.value))} className="w-16 text-right border-b border-slate-200 focus:border-primary outline-none text-sm font-bold bg-white text-slate-900"/>
                                    </div>
                                    <div className="pt-2 border-t border-slate-100">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-700">并网柜/STS 改造费</span>
                                            <div className="relative">
                                                <input type="number" value={params.preciseState.hardware.switchgear} onChange={(e)=>handlePreciseUpdate('hardware', 'switchgear', parseFloat(e.target.value))} className="w-20 text-right border-b border-slate-200 focus:border-primary outline-none text-sm font-bold pr-4 bg-white text-slate-900"/>
                                                <span className="absolute right-0 top-0 text-xs text-slate-400">万</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <span className="material-icons text-green-500">toggle_on</span> 关键性能指标
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500">离网切换时间</span>
                                        <select 
                                            value={params.preciseState.performance.switchTime}
                                            onChange={(e) => handlePreciseUpdate('performance', 'switchTime', e.target.value)}
                                            className="text-xs border border-slate-200 rounded px-2 py-1 bg-white outline-none focus:border-primary text-slate-900"
                                        >
                                            <option value="<10ms">{'< 10ms (UPS级)'}</option>
                                            <option value="20ms">20ms (常规)</option>
                                            <option value="s">秒级切换</option>
                                        </select>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500">黑启动能力 (Black Start)</span>
                                        <div className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${params.preciseState.performance.blackStart ? 'bg-green-500' : 'bg-slate-300'}`} onClick={()=>handlePreciseUpdate('performance', 'blackStart', !params.preciseState.performance.blackStart)}>
                                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${params.preciseState.performance.blackStart ? 'translate-x-5' : ''}`}></div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* 2. Load Management & VPP */}
                        <div className="lg:col-span-2 space-y-6">
                            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <span className="material-icons text-orange-500">pie_chart</span> 负荷分级管理 (Load Shedding)
                                    </h3>
                                    <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded">用于离网策略与可靠性估值</span>
                                </div>
                                <div className="flex gap-1 h-8 w-full rounded-lg overflow-hidden mb-4">
                                    <div className="bg-red-500 transition-all flex items-center justify-center text-[10px] text-white font-bold" style={{width: `${params.preciseState.loads.l1}%`}}>L1 {params.preciseState.loads.l1}%</div>
                                    <div className="bg-orange-400 transition-all flex items-center justify-center text-[10px] text-white font-bold" style={{width: `${params.preciseState.loads.l2}%`}}>L2 {params.preciseState.loads.l2}%</div>
                                    <div className="bg-blue-400 transition-all flex items-center justify-center text-[10px] text-white font-bold" style={{width: `${params.preciseState.loads.l3}%`}}>L3 {params.preciseState.loads.l3}%</div>
                                </div>
                                <div className="grid grid-cols-3 gap-6 text-xs">
                                    <div className="space-y-2">
                                        <label className="font-bold text-red-600">一级负荷 (Critical)</label>
                                        <input type="range" min="0" max="100" value={params.preciseState.loads.l1} onChange={(e)=>handleLoadChange('l1', parseInt(e.target.value))} className="w-full accent-red-500 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"/>
                                        <p className="text-slate-400 scale-90 origin-left">数据中心、安防、应急照明 (不可断电)</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="font-bold text-orange-500">二级负荷 (Important)</label>
                                        <input type="range" min="0" max="100" value={params.preciseState.loads.l2} onChange={(e)=>handleLoadChange('l2', parseInt(e.target.value))} className="w-full accent-orange-400 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"/>
                                        <p className="text-slate-400 scale-90 origin-left">生产产线、核心办公区 (短时断电)</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="font-bold text-blue-500">三级负荷 (Adjustable)</label>
                                        <input type="range" min="0" max="100" value={params.preciseState.loads.l3} onChange={(e)=>handleLoadChange('l3', parseInt(e.target.value))} className="w-full accent-blue-400 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"/>
                                        <p className="text-slate-400 scale-90 origin-left">普通空调、景观照明 (可切除)</p>
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                                    <span className="material-icons text-purple-500">monetization_on</span> 精确经济参数
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500">需量电价</label>
                                        <div className="relative">
                                            <input type="number" value={params.preciseState.economics.demandPrice} onChange={(e)=>handlePreciseUpdate('economics', 'demandPrice', parseFloat(e.target.value))} className="w-full text-sm border-b border-slate-200 focus:border-primary outline-none py-1 bg-white text-slate-900"/>
                                            <span className="absolute right-0 bottom-1 text-[10px] text-slate-400">元/kW/月</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500">VPP 补贴</label>
                                        <div className="relative">
                                            <input type="number" value={params.preciseState.economics.vppPrice} onChange={(e)=>handlePreciseUpdate('economics', 'vppPrice', parseFloat(e.target.value))} className="w-full text-sm border-b border-slate-200 focus:border-primary outline-none py-1 bg-white text-slate-900"/>
                                            <span className="absolute right-0 bottom-1 text-[10px] text-slate-400">元/kW</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500">停电损失估值</label>
                                        <div className="relative">
                                            <input type="number" value={params.preciseState.economics.outageLoss} onChange={(e)=>handlePreciseUpdate('economics', 'outageLoss', parseFloat(e.target.value))} className="w-full text-sm border-b border-slate-200 focus:border-primary outline-none py-1 bg-white text-slate-900"/>
                                            <span className="absolute right-0 bottom-1 text-[10px] text-slate-400">元/kW</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500">VPP 参与容量</label>
                                        <div className="relative">
                                            <input type="number" value={params.preciseState.economics.vppRatio} onChange={(e)=>handlePreciseUpdate('economics', 'vppRatio', parseFloat(e.target.value))} className="w-full text-sm border-b border-slate-200 focus:border-primary outline-none py-1 bg-white text-slate-900"/>
                                            <span className="absolute right-0 bottom-1 text-[10px] text-slate-400">%</span>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                )}

            </div>
        </div>

        {/* Sticky Footer */}
        <div className="fixed bottom-0 left-64 right-[400px] bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 px-8 z-40 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
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
      <aside className={`w-[400px] bg-white border-l border-slate-200 flex flex-col shrink-0 z-20 h-screen overflow-y-auto shadow-xl mb-16 transition-all duration-300 ${currentModule.isActive ? '' : 'opacity-60 grayscale'}`}>
          {/* Running Control Panel */}
          <div className="p-5 border-b border-slate-200 bg-white sticky top-0 z-10">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="material-icons text-teal-500">settings_suggest</span> 运行控制
                  </h3>
                  {!currentModule.isActive && <span className="text-xs font-bold text-red-500 border border-red-200 bg-red-50 px-2 py-0.5 rounded">未启用</span>}
              </div>
              <button
                  onClick={() => setIsIslandSimulating(!isIslandSimulating)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-md ${isIslandSimulating ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                  <span className="material-icons">{isIslandSimulating ? 'power_off' : 'power'}</span>
                  {isIslandSimulating ? '恢复并网模式' : '切换至离网模式'}
              </button>
              <p className={`text-xs mt-3 text-center ${isIslandSimulating ? 'text-red-600' : 'text-slate-500'}`}>
                  {isIslandSimulating ? '离网模式中：电网断开，储能支撑负荷' : '并网模式中：实时需量管理与削峰填谷'}
              </p>
          </div>

          {/* 24-Hour Chart */}
          <div className="p-5 border-b border-slate-200 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="material-icons text-teal-500">show_chart</span> 24小时运行曲线
              </h3>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3" style={{ height: '280px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={simData} margin={{top: 10, right: 10, bottom: 30, left: -10}}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="hour" tick={{fontSize: 9, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                          <YAxis tick={{fontSize: 9, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                          <Tooltip
                              contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '8px'}}
                              labelStyle={{color: '#64748b', marginBottom: '3px', fontWeight: 'bold', fontSize: '10px'}}
                              itemStyle={{fontSize: '10px'}}
                          />
                          <Legend wrapperStyle={{fontSize: '10px', paddingTop: '5px'}}/>

                          {/* Area layers */}
                          <Area type="monotone" dataKey="load" name="实际负荷" fill="#e2e8f0" stroke="none" fillOpacity={0.5} />
                          {isIslandSimulating && <Area type="monotone" dataKey="shedded" name="切除负荷" fill="#fca5a5" stroke="none" fillOpacity={0.6} />}

                          {/* Line and Bar layers */}
                          <Line type="basis" dataKey="solar" name="光伏" stroke="#facc15" strokeWidth={1.5} dot={false} />
                          <Bar dataKey="grid" name="电网" fill={isIslandSimulating ? '#cbd5e1' : '#3b82f6'} barSize={6} radius={[2,2,0,0]} />
                          <Bar dataKey="storage" name="储能" fill="#8b5cf6" barSize={6} radius={[2,2,0,0]} stackId="a" />

                          {!isIslandSimulating && (
                              <ReferenceLine y={simData[0]?.demandLimit} stroke="red" strokeDasharray="3 3" label={{value: "需量红线", fill: "red", fontSize: 9, position: 'insideTopLeft'}} />
                          )}
                      </ComposedChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Financial Analysis */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2">
                  <span className="material-icons text-primary">analytics</span>
                  <span className="font-bold text-slate-800">实时预估收益</span>
              </div>
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-yellow-100 rounded text-yellow-600"><span className="material-icons text-sm">monetization_on</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">年度总价值构成</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">¥ {financials.totalValue.toFixed(1)}</span>
                      <span className="text-sm text-slate-500">万</span>
                  </div>
                  <div className="mt-2 space-y-2">
                       {/* Synergy */}
                       <div>
                           <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                               <span>硬件协同 (能效提升+PV自用)</span>
                               <span>{financials.synergy} 万</span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-yellow-500 h-1.5 rounded-full" style={{width: `${financials.synergy/financials.totalValue*100}%`}}></div></div>
                       </div>
                       {/* Demand */}
                       <div>
                           <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                               <span>需量电费优化</span>
                               <span>{financials.demand} 万</span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full" style={{width: `${financials.demand/financials.totalValue*100}%`}}></div></div>
                       </div>
                       {/* VPP */}
                       <div>
                           <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                               <span>市场辅助服务 (VPP)</span>
                               <span>{financials.vpp} 万</span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-purple-500 h-1.5 rounded-full" style={{width: `${financials.vpp/financials.totalValue*100}%`}}></div></div>
                       </div>
                       {/* Safety */}
                       <div>
                           <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                               <span>安全溢价 (停电规避)</span>
                               <span>{financials.safety} 万</span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-green-500 h-1.5 rounded-full" style={{width: `${financials.safety/financials.totalValue*100}%`}}></div></div>
                       </div>
                   </div>
              </div>

               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-indigo-100 rounded text-indigo-600"><span className="material-icons text-sm">payments</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">直接现金流回报</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">¥ {financials.totalDirect.toFixed(1)}</span>
                      <span className="text-sm text-slate-500">万/年</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                      静态回收期: <span className="font-bold text-slate-700">{financials.payback} 年</span>
                  </div>
              </div>

               <div className="bg-primary p-4 rounded-xl shadow-lg shadow-primary/20 text-white relative overflow-hidden group">
                   <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-white/20 transition-all"></div>
                   <div className="flex items-center gap-2 mb-2 relative z-10">
                       <div className="p-1.5 bg-white/20 rounded text-white"><span className="material-icons text-sm">account_balance_wallet</span></div>
                       <span className="text-xs font-semibold text-blue-100 uppercase">总投资额</span>
                   </div>
                   <div className="flex items-baseline gap-2 relative z-10">
                       <span className="text-3xl font-bold tracking-tight">¥ {financials.investment}</span>
                       <span className="text-sm text-blue-100">万元</span>
                   </div>
                   {isAiBundled && (
                       <div className="mt-2 text-xs text-blue-200 bg-white/10 w-fit px-2 py-0.5 rounded border border-white/20 relative z-10">
                           已减免 ¥{financials.deduction}万 软件费
                       </div>
                   )}
               </div>
          </div>
      </aside>
    </div>
  );
}