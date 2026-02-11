import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useProject } from '../context/ProjectContext';

// Mock weather/load impact curve
const baseCurve = [0.4, 0.35, 0.45, 0.6, 0.8, 0.95, 1.0, 0.98, 0.85, 0.65, 0.45, 0.4]; 
const baseMonthData = [
  { name: '1月' }, { name: '2月' }, { name: '3月' }, { name: '4月' },
  { name: '5月' }, { name: '6月' }, { name: '7月' }, { name: '8月' },
  { name: '9月' }, { name: '10月' }, { name: '11月' }, { name: '12月' },
];

export default function RetrofitHVAC() {
  const { modules, toggleModule, updateModule } = useProject();
  const currentModule = modules['retrofit-hvac'];

  // --- State ---
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [isChartExpanded, setIsChartExpanded] = useState(false);

  // Building State (Simulating data from Project Entry)
  const [hvacBuildings, setHvacBuildings] = useState([
      { id: 1, name: '1号生产车间', load: 2800, active: true, desc: '离心机组 (10年+)' },
      { id: 2, name: '研发中心大楼', load: 1200, active: true, desc: '多联机 (5年)' },
      { id: 3, name: '行政办公楼', load: 800, active: false, desc: '风冷模块 (8年)' },
  ]);

  // Parameters
  const [packageType, setPackageType] = useState<'basic' | 'intermediate' | 'advanced'>('intermediate');
  const [budgetMode, setBudgetMode] = useState<'auto' | 'manual'>('auto');
  
  // Advanced & Calculation Params
  const [params, setParams] = useState({
      // Technical
      currentCOP: 3.5,
      targetCOP: 5.2, // Derived from package
      distOptimization: 15, // % Distribution system savings
      salvageValue: 5, // 万元
      
      // Operation
      enableAI: true,
      tempElasticity: 26, // Target Temp
      offHoursControl: true,

      // Financial
      capexInput: 325, // Manual input or Auto calculated
      opexSaving: 12, // Maintenance savings
      emcRatio: 100, // Self-owned = 100%, EMC < 100%
  });

  // --- Logic ---

  // 1. Update Params based on Package Selection (Simple Mode)
  useEffect(() => {
      if (mode === 'simple') {
          let newCOP = 4.2;
          let newDist = 5;
          let newAI = false;
          let unitCost = 0; // Yuan/kW load

          switch (packageType) {
              case 'basic':
                  newCOP = 4.5;
                  newDist = 5;
                  newAI = false;
                  unitCost = 400;
                  break;
              case 'intermediate':
                  newCOP = 5.2;
                  newDist = 15;
                  newAI = false;
                  unitCost = 650;
                  break;
              case 'advanced':
                  newCOP = 6.2; // Mag-lev
                  newDist = 25;
                  newAI = true;
                  unitCost = 950;
                  break;
          }

          const totalLoad = hvacBuildings.filter(b => b.active).reduce((a, b) => a + b.load, 0);
          const autoCapex = (totalLoad * unitCost) / 10000; // 万

          setParams(prev => ({
              ...prev,
              targetCOP: newCOP,
              distOptimization: newDist,
              enableAI: newAI,
              capexInput: parseFloat(autoCapex.toFixed(1))
          }));
      }
  }, [packageType, mode, hvacBuildings]);

  // 2. Main Calculation Effect
  useEffect(() => {
      const activeLoad = hvacBuildings.filter(b => b.active).reduce((a, b) => a + b.load, 0);
      
      // Calculate Efficiency Gains
      const powerOld = activeLoad / params.currentCOP;
      const powerNew = activeLoad / params.targetCOP;
      let powerSavedKw = powerOld - powerNew;

      // Distribution Gain
      const distPowerBase = activeLoad * 0.2; 
      const distSavedKw = distPowerBase * (params.distOptimization / 100);

      // Strategy Gain
      let strategyFactor = 1.0;
      if (params.enableAI) strategyFactor += 0.12; 
      if (params.offHoursControl) strategyFactor += 0.05; 
      if (params.tempElasticity > 25) strategyFactor += 0.06;

      const totalPowerSavedKw = (powerSavedKw + distSavedKw) * strategyFactor;
      
      // Financials
      const annualRunHours = 2000;
      const electricityPrice = 0.85; 
      
      const energySavedKwh = totalPowerSavedKw * annualRunHours;
      const energySavingMoney = (energySavedKwh * electricityPrice) / 10000; // 万
      
      const totalYearlySaving = (energySavingMoney + params.opexSaving) * (params.emcRatio / 100);
      const investment = params.capexInput;

      // KPI
      const baselineEnergy = (activeLoad / params.currentCOP + distPowerBase) * annualRunHours;
      const savingRate = baselineEnergy > 0 ? (energySavedKwh / baselineEnergy) * 100 : 0;

      updateModule('retrofit-hvac', {
          strategy: packageType,
          investment: parseFloat(investment.toFixed(1)),
          yearlySaving: parseFloat(totalYearlySaving.toFixed(1)),
          kpiPrimary: { label: '年节电量', value: `${(energySavedKwh/10000).toFixed(1)} 万kWh` },
          kpiSecondary: { label: '综合节能率', value: `${savingRate.toFixed(1)}%` }
      });

  }, [params, hvacBuildings, budgetMode, packageType, updateModule]);

  // Chart Data Construction
  const monthData = useMemo(() => {
      const activeLoad = hvacBuildings.filter(b => b.active).reduce((a, b) => a + b.load, 0);
      const maxMonthlyConsumption = activeLoad * 300; 
      
      return baseMonthData.map((m, i) => {
          const factor = baseCurve[i];
          const base = (maxMonthlyConsumption * factor) / 10000;
          const savingRate = parseFloat(currentModule.kpiSecondary.value) / 100;
          return {
              name: m.name,
              base: parseFloat(base.toFixed(1)),
              retrofit: parseFloat((base * (1 - savingRate)).toFixed(1))
          };
      });
  }, [hvacBuildings, currentModule.kpiSecondary.value]);

  const toggleBuilding = (id: number) => {
      setHvacBuildings(prev => prev.map(b => b.id === id ? { ...b, active: !b.active } : b));
  };

  if (!currentModule) return null;

  return (
    <div className="flex h-full bg-slate-50 relative">
      {/* Left Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shrink-0">
            <div className="flex items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">暖通空调改造配置</h2>
                    <p className="text-xs text-slate-500">能效提升与AI智控策略方案</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full ml-4">
                    <span className={`text-xs font-bold ${currentModule.isActive ? 'text-primary' : 'text-slate-400'}`}>
                        {currentModule.isActive ? '模块已启用' : '模块已停用'}
                    </span>
                    <button 
                        onClick={() => toggleModule('retrofit-hvac')}
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
                
                {/* Mode Toggle */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-2">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">方案配置器</h3>
                        <p className="text-xs text-slate-500 mt-1">选择改造范围与技术策略</p>
                    </div>
                    <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex">
                        <button 
                            onClick={() => setMode('simple')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mode === 'simple' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <span className="material-icons text-[16px]">view_agenda</span> 方案选择
                        </button>
                        <button 
                            onClick={() => setMode('advanced')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mode === 'advanced' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <span className="material-icons text-[16px]">tune</span> 深度参数
                        </button>
                    </div>
                </div>

                {/* Scope Selection */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
                    <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="flex items-center gap-2"><span className="material-icons text-blue-500">domain</span> 改造建筑范围</span>
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">合计负荷: {hvacBuildings.filter(b=>b.active).reduce((a,b)=>a+b.load,0)} kW</span>
                    </h3>
                    <div className="space-y-3">
                        {hvacBuildings.map((b) => (
                            <div key={b.id} className={`flex flex-col md:flex-row md:items-center gap-4 p-3 rounded-lg border transition-all ${b.active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                <div className="flex items-center gap-3 flex-1">
                                    <input 
                                        type="checkbox" 
                                        checked={b.active} 
                                        onChange={() => toggleBuilding(b.id)}
                                        className="w-5 h-5 accent-primary cursor-pointer shrink-0" 
                                    />
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-slate-800">{b.name}</div>
                                        <div className="text-xs text-slate-500">{b.desc}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <span className="text-xs text-slate-400 whitespace-nowrap">冷负荷:</span>
                                    <span className="text-sm font-bold text-slate-700 w-16 text-right">{b.load} kW</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* SIMPLE MODE UI */}
                {mode === 'simple' && (
                    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
                        <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                            <span className="material-icons text-orange-500">inventory_2</span> 改造方案包
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Package 1 */}
                            <div 
                                onClick={() => setPackageType('basic')}
                                className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${packageType === 'basic' ? 'border-blue-500 bg-blue-50/20' : 'border-slate-100 hover:border-blue-200'}`}
                            >
                                {packageType === 'basic' && <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold">已选择</div>}
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                                    <span className="material-icons">settings_backup_restore</span>
                                </div>
                                <h4 className="font-bold text-slate-800">基础性能提升</h4>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">更换为一级能效常规冷水机组，保留原有管网与末端。</p>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-xs font-medium text-slate-400">预估COP</span>
                                    <span className="text-sm font-bold text-slate-700">4.5</span>
                                </div>
                            </div>

                            {/* Package 2 */}
                            <div 
                                onClick={() => setPackageType('intermediate')}
                                className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${packageType === 'intermediate' ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-100 hover:border-emerald-200'}`}
                            >
                                {packageType === 'intermediate' && <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold">已选择</div>}
                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                                    <span className="material-icons">speed</span>
                                </div>
                                <h4 className="font-bold text-slate-800">中级系统优化</h4>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">高效机组 + 水泵/风机变频 (VFD) + 基础自控系统升级。</p>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-xs font-medium text-slate-400">预估COP</span>
                                    <span className="text-sm font-bold text-slate-700">5.2</span>
                                </div>
                            </div>

                            {/* Package 3 */}
                            <div 
                                onClick={() => setPackageType('advanced')}
                                className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${packageType === 'advanced' ? 'border-purple-500 bg-purple-50/20' : 'border-slate-100 hover:border-purple-200'}`}
                            >
                                {packageType === 'advanced' && <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold">已选择</div>}
                                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                                    <span className="material-icons">psychology</span>
                                </div>
                                <h4 className="font-bold text-slate-800">深度零碳改造</h4>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">磁悬浮/气悬浮机组 + 全系统 AI 智控 + 输配侧深度优化。</p>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-xs font-medium text-slate-400">预估COP</span>
                                    <span className="text-sm font-bold text-slate-700">6.0+</span>
                                </div>
                            </div>
                        </div>

                        {/* Budget Input */}
                        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-6">
                            <label className="text-sm font-bold text-slate-700">投资预算预估</label>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button onClick={()=>setBudgetMode('auto')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${budgetMode==='auto'?'bg-white shadow-sm text-slate-800':'text-slate-500'}`}>系统估算</button>
                                <button onClick={()=>setBudgetMode('manual')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${budgetMode==='manual'?'bg-white shadow-sm text-slate-800':'text-slate-500'}`}>手动输入</button>
                            </div>
                            <div className="relative flex-1 max-w-[200px]">
                                <input 
                                    type="number" 
                                    value={params.capexInput}
                                    onChange={(e) => {
                                        setBudgetMode('manual');
                                        setParams({...params, capexInput: parseFloat(e.target.value)});
                                    }}
                                    className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-3 pr-8 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                                />
                                <span className="absolute right-3 top-2 text-xs text-slate-500 font-medium pt-0.5">万元</span>
                            </div>
                        </div>
                    </section>
                )}

                {/* ADVANCED MODE UI */}
                {mode === 'advanced' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Group A: Technical */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <span className="material-icons text-teal-500">tune</span> 技术参数目标
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500">目标综合能效 (COP)</label>
                                    <div className="relative">
                                        <input type="number" step="0.1" value={params.targetCOP} onChange={(e)=>setParams({...params, targetCOP: parseFloat(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-4 text-sm font-bold text-slate-800 focus:border-primary outline-none" />
                                        <span className="absolute right-3 top-2 text-[10px] text-green-600 bg-green-50 px-1.5 rounded">↑ 提升</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400">参考: 磁悬浮>6.0, 螺杆机~5.0</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500">输配系统优化率 (%)</label>
                                    <input type="number" value={params.distOptimization} onChange={(e)=>setParams({...params, distOptimization: parseFloat(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm focus:border-primary outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500">旧设备残值抵扣 (万元)</label>
                                    <input type="number" value={params.salvageValue} onChange={(e)=>setParams({...params, salvageValue: parseFloat(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm focus:border-primary outline-none" />
                                </div>
                            </div>
                        </section>

                        {/* Group B: Operation */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <span className="material-icons text-indigo-500">settings_suggest</span> 运行策略配置
                            </h3>
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center justify-between p-3 rounded-lg border border-indigo-100 bg-indigo-50/50">
                                        <div>
                                            <span className="text-sm font-bold text-slate-700 block">AI 智控策略</span>
                                            <span className="text-xs text-slate-500">开启 AI 负荷预测与寻优 (+12% 节能量)</span>
                                        </div>
                                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                            <input type="checkbox" checked={params.enableAI} onChange={()=>setParams({...params, enableAI: !params.enableAI})} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 right-5" style={{right: params.enableAI ? '0' : 'auto', left: params.enableAI ? 'auto' : '0'}}/>
                                            <div className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${params.enableAI ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                                        <span className="text-sm text-slate-700">非工作时段低功耗控制</span>
                                        <input type="checkbox" checked={params.offHoursControl} onChange={()=>setParams({...params, offHoursControl: !params.offHoursControl})} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                                    </div>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <label className="text-xs font-semibold text-slate-500">夏季温控弹性设置 (°C)</label>
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="range" min="24" max="28" step="0.5" 
                                            value={params.tempElasticity} 
                                            onChange={(e)=>setParams({...params, tempElasticity: parseFloat(e.target.value)})}
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                        <span className="text-lg font-bold text-slate-700 w-12">{params.tempElasticity}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400">每上调 1°C，约节能 6%</p>
                                </div>
                            </div>
                        </section>

                        {/* Group C: Financial */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <span className="material-icons text-emerald-500">paid</span> 财务与商务模型
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500">改造总投资 (CAPEX)</label>
                                    <div className="relative">
                                        <input type="number" value={params.capexInput} onChange={(e)=>setParams({...params, capexInput: parseFloat(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-sm font-bold text-slate-800 focus:border-primary outline-none" />
                                        <span className="absolute right-3 top-2 text-xs text-slate-500 pt-0.5">万元</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500">年运维节省 (OPEX)</label>
                                    <div className="relative">
                                        <input type="number" value={params.opexSaving} onChange={(e)=>setParams({...params, opexSaving: parseFloat(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-sm font-medium text-green-600 focus:border-primary outline-none" />
                                        <span className="absolute right-3 top-2 text-xs text-slate-500 pt-0.5">万元</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500">业主收益占比 (EMC)</label>
                                    <div className="flex items-center gap-2">
                                        <input type="range" min="0" max="100" value={params.emcRatio} onChange={(e)=>setParams({...params, emcRatio: parseFloat(e.target.value)})} className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                        <span className="text-sm font-bold w-10 text-right">{params.emcRatio}%</span>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
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
                  <div className="mt-2 text-xs font-medium text-slate-400">
                      目标 COP: <span className="text-slate-800 font-bold">{params.targetCOP}</span>
                  </div>
              </div>

               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-red-100 rounded text-red-600"><span className="material-icons text-sm">savings</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">年净收益</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">¥ {currentModule.yearlySaving}</span>
                      <span className="text-sm text-slate-500">万元</span>
                  </div>
                  <div className="mt-2 text-xs font-medium text-green-600 flex items-center">
                      <span className="material-icons text-sm mr-0.5">south</span> {currentModule.kpiSecondary.value} 能耗下降
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
                                label={{ value: '能耗 (万kWh)', angle: -90, position: 'insideLeft', style: {textAnchor: 'middle', fill: '#94a3b8', fontSize: 12} }} 
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
            </div>
        </div>
      )}
    </div>
  );
}