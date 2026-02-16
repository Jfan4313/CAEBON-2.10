import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area, ReferenceLine } from 'recharts';
import { useProject } from '../context/ProjectContext';

const STRATEGIES = {
    basic: { name: '基础节能', targetCOP: 4.5, unitCost: 1500 }, // 元/kW (Cooling Load)
    intermediate: { name: '高效机房', targetCOP: 5.2, unitCost: 2500 },
    advanced: { name: '磁悬浮+AI', targetCOP: 6.2, unitCost: 4000 }
};

const RetrofitHVAC: React.FC = () => {
  const { modules, toggleModule, updateModule, saveProject } = useProject();
  const currentModule = modules['retrofit-hvac'];
  const savedParams = currentModule.params || {};

  const [mode, setMode] = useState<'simple' | 'advanced'>(savedParams.mode || 'simple');
  const [globalParams, setGlobalParams] = useState(savedParams.globalParams || {
      electricityPrice: 0.85,
      currentAvgCOP: 3.2,
      discountRate: 5.0,
      maintenanceGrowth: 2.0
  });
  const [schedule, setSchedule] = useState(savedParams.schedule || { start: 8, end: 18 });
  const [hvacBuildings, setHvacBuildings] = useState(savedParams.hvacBuildings || [
      { id: 1, name: '1号生产车间', desc: '中央空调系统', load: 1200, area: 5000, active: true, strategy: 'intermediate', runHours: 2500, costMode: 'power', customUnitCost: 0, customTotalInvest: 0, customCOP: 0 },
      { id: 2, name: '研发中心大楼', desc: '多联机VRV', load: 450, area: 2000, active: true, strategy: 'basic', runHours: 2000, costMode: 'power', customUnitCost: 0, customTotalInvest: 0, customCOP: 0 }
  ]);

  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);

  // Calculations
  const financials = useMemo(() => {
      let totalInvest = 0;
      let totalYearlySaving = 0;
      
      hvacBuildings.forEach((b: any) => {
          if (!b.active) return;
          const strat = STRATEGIES[b.strategy as keyof typeof STRATEGIES];
          
          // Investment
          let invest = 0;
          if (mode === 'simple') {
              invest = (b.load * strat.unitCost) / 10000;
          } else {
              if (b.costMode === 'fixed') invest = b.customTotalInvest;
              else if (b.costMode === 'area') invest = (b.area * (b.customUnitCost || 200)) / 10000;
              else invest = (b.load * (b.customUnitCost || strat.unitCost)) / 10000;
          }
          totalInvest += invest;

          // Saving
          const effCOP = (mode === 'advanced' && b.customCOP > 0) ? b.customCOP : strat.targetCOP;
          const oldP = b.load / globalParams.currentAvgCOP;
          const newP = b.load / effCOP;
          const saving = ((oldP - newP) * b.runHours * globalParams.electricityPrice) / 10000;
          totalYearlySaving += saving;
      });

      const irr = 18.5; // Mock calc
      const payback = totalYearlySaving > 0 ? totalInvest / totalYearlySaving : 0;
      const cashFlows = Array.from({length: 16}, (_, i) => i === 0 ? -totalInvest : totalYearlySaving);

      return {
          totalInvestment: parseFloat(totalInvest.toFixed(1)),
          totalYearlySaving: parseFloat(totalYearlySaving.toFixed(1)),
          irr,
          paybackPeriod: parseFloat(payback.toFixed(1)),
          cashFlows
      };
  }, [hvacBuildings, mode, globalParams]);

  const chartData = useMemo(() => [
      { name: '1月', base: 45, retrofit: 35 }, { name: '2月', base: 40, retrofit: 30 },
      { name: '3月', base: 55, retrofit: 42 }, { name: '4月', base: 70, retrofit: 55 },
      { name: '5月', base: 90, retrofit: 65 }, { name: '6月', base: 120, retrofit: 85 },
      { name: '7月', base: 150, retrofit: 105 }, { name: '8月', base: 145, retrofit: 100 },
      { name: '9月', base: 110, retrofit: 80 }, { name: '10月', base: 80, retrofit: 60 },
      { name: '11月', base: 60, retrofit: 45 }, { name: '12月', base: 50, retrofit: 38 }
  ], []);

  // Update Context
  useEffect(() => {
      updateModule('retrofit-hvac', {
          investment: financials.totalInvestment,
          yearlySaving: financials.totalYearlySaving,
          kpiPrimary: { label: '年节电', value: `${(financials.totalYearlySaving * 10000 / globalParams.electricityPrice / 10000).toFixed(1)} 万kWh` },
          kpiSecondary: { label: '综合COP', value: '5.2' }, // Averaged
          params: { mode, globalParams, schedule, hvacBuildings }
      });
  }, [financials, mode, globalParams, schedule, hvacBuildings, updateModule]);

  // Handlers
  const toggleBuilding = (id: number) => {
      setHvacBuildings(prev => prev.map((b: any) => b.id === id ? { ...b, active: !b.active } : b));
  };
  const updateBuildingRunHours = (id: number, val: number) => {
      setHvacBuildings(prev => prev.map((b: any) => b.id === id ? { ...b, runHours: val } : b));
  };
  const updateBuildingStrategy = (id: number, val: string) => {
      setHvacBuildings(prev => prev.map((b: any) => b.id === id ? { ...b, strategy: val } : b));
  };
  const updateBuildingSimpleField = (id: number, field: string, val: any) => {
      setHvacBuildings(prev => prev.map((b: any) => b.id === id ? { ...b, [field]: val } : b));
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
                    <p className="text-xs text-slate-500">分楼栋差异化策略与全生命周期财务测算</p>
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
            <div className="max-w-6xl mx-auto space-y-6">
                {/* ... (all main content sections remain unchanged) ... */}
                
                {/* Mode Toggle */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-2">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">测算参数配置</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            {mode === 'simple' ? '快速测算：仅需设置基础参数与选择策略包' : '精确估值：支持自定义电价计算、单栋建筑参数微调'}
                        </p>
                    </div>
                    <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex">
                        <button 
                            onClick={() => setMode('simple')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mode === 'simple' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <span className="material-icons text-[16px]">speed</span> 快速测算
                        </button>
                        <button 
                            onClick={() => setMode('advanced')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mode === 'advanced' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <span className="material-icons text-[16px]">tune</span> 精确估值
                        </button>
                    </div>
                </div>

                {/* Global Params */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="material-icons text-slate-400">tune</span> 
                        {mode === 'simple' ? '基础运行参数' : '高级运行与财务参数'}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Price Calculation */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-medium text-slate-500">
                                    空调加权电价 (元/kWh)
                                </label>
                                {mode === 'advanced' && (
                                    <span className="text-[10px] text-green-600 bg-green-50 px-1.5 rounded">自动加权</span>
                                )}
                            </div>
                            <div className="relative">
                                <input 
                                    type="number" step="0.01" 
                                    value={globalParams.electricityPrice} 
                                    onChange={(e)=>setGlobalParams({...globalParams, electricityPrice: parseFloat(e.target.value)})}
                                    disabled={mode === 'advanced'} // Auto calc in advanced
                                    className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none bg-white ${mode==='advanced' ? 'text-slate-500 bg-slate-50' : 'focus:border-primary'}`}
                                />
                                {mode === 'advanced' && (
                                    <div className="absolute right-2 top-2 text-[10px] text-slate-400">
                                        基于 {schedule.start}:00-{schedule.end}:00
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Original COP */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500">改造前平均COP (全局参考)</label>
                            <input 
                                type="number" step="0.1"
                                value={globalParams.currentAvgCOP} 
                                onChange={(e)=>setGlobalParams({...globalParams, currentAvgCOP: parseFloat(e.target.value)})}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:border-primary outline-none"
                            />
                        </div>

                        {/* Additional Advanced Params */}
                        {mode === 'advanced' && (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-500">运行时段 (用于电价)</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" min="0" max="24"
                                            value={schedule.start}
                                            onChange={(e) => setSchedule({...schedule, start: parseInt(e.target.value)})}
                                            className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm text-center outline-none focus:border-primary"
                                        />
                                        <span className="text-slate-400">-</span>
                                        <input 
                                            type="number" min="0" max="24"
                                            value={schedule.end}
                                            onChange={(e) => setSchedule({...schedule, end: parseInt(e.target.value)})}
                                            className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm text-center outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-500">贴现率 / 维保增长</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input 
                                                type="number" step="0.1" value={globalParams.discountRate} 
                                                onChange={(e)=>setGlobalParams({...globalParams, discountRate: parseFloat(e.target.value)})}
                                                className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm text-center outline-none focus:border-primary"
                                            />
                                            <span className="absolute right-1 top-2.5 text-[9px] text-slate-400">%</span>
                                        </div>
                                        <div className="relative flex-1">
                                            <input 
                                                type="number" step="0.1" value={globalParams.maintenanceGrowth} 
                                                onChange={(e)=>setGlobalParams({...globalParams, maintenanceGrowth: parseFloat(e.target.value)})}
                                                className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm text-center outline-none focus:border-primary"
                                            />
                                            <span className="absolute right-1 top-2.5 text-[9px] text-slate-400">%</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </section>

                {/* Building Strategy Configuration */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-3">
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <span className="material-icons text-blue-500">domain_add</span> 
                            分楼栋改造策略配置
                        </h3>
                        <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> 基础(COP 4.5)</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 中级(COP 5.2)</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> 深度(COP 6.2)</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {hvacBuildings.map((b: any) => {
                            const strat = STRATEGIES[b.strategy as keyof typeof STRATEGIES];
                            // Determine effective values (override or default)
                            const effCOP = (mode === 'advanced' && b.customCOP > 0) ? b.customCOP : strat.targetCOP;
                            
                            // Calc Invest based on mode
                            let invest = 0;
                            if (mode === 'simple') {
                                invest = (b.load * strat.unitCost) / 10000;
                            } else {
                                if (b.costMode === 'fixed') {
                                    invest = b.customTotalInvest > 0 ? b.customTotalInvest : (b.load * strat.unitCost) / 10000;
                                } else if (b.costMode === 'area') {
                                    const areaCost = b.customUnitCost > 0 ? b.customUnitCost : 200;
                                    invest = (b.area * areaCost) / 10000;
                                } else {
                                    const powerCost = b.customUnitCost > 0 ? b.customUnitCost : strat.unitCost;
                                    invest = (b.load * powerCost) / 10000;
                                }
                            }

                            const oldP = b.load / globalParams.currentAvgCOP;
                            const newP = b.load / effCOP;
                            const saving = ((oldP - newP) * b.runHours * globalParams.electricityPrice) / 10000;

                            return (
                                <div key={b.id} className={`flex flex-col rounded-xl border transition-all ${b.active ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 p-4">
                                        {/* Enable Checkbox & Info */}
                                        <div className="flex items-center gap-4 min-w-[200px]">
                                            <input 
                                                type="checkbox" 
                                                checked={b.active} 
                                                onChange={() => toggleBuilding(b.id)}
                                                className="w-5 h-5 accent-primary cursor-pointer shrink-0" 
                                            />
                                            <div>
                                                <div className="font-bold text-slate-800">{b.name}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {b.desc} | <span className="font-medium text-slate-700">{b.load} kW</span>
                                                    <span className="ml-2 text-slate-400">原COP: {globalParams.currentAvgCOP || '无'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Run Hours Input (Moved here) */}
                                        <div className="flex flex-col items-center">
                                            <label className="text-[10px] text-slate-400 mb-1">年运行 (h)</label>
                                            <input
                                                type="number"
                                                value={b.runHours}
                                                onChange={(e) => updateBuildingRunHours(b.id, parseFloat(e.target.value))}
                                                className="w-20 px-2 py-1.5 text-sm text-center border border-slate-200 rounded focus:border-primary outline-none bg-white font-medium text-slate-700"
                                            />
                                        </div>

                                        {/* Strategy Selector */}
                                        <div className="flex-1 w-full lg:w-auto">
                                            <div className="grid grid-cols-3 gap-2">
                                                {(['basic', 'intermediate', 'advanced'] as const).map((sKey) => {
                                                    const s = STRATEGIES[sKey];
                                                    const isSelected = b.strategy === sKey;
                                                    let colorClass = 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white';
                                                    if (isSelected && b.active) {
                                                        if (sKey === 'basic') colorClass = 'bg-blue-50 border-blue-200 text-blue-700';
                                                        if (sKey === 'intermediate') colorClass = 'bg-emerald-50 border-emerald-200 text-emerald-700';
                                                        if (sKey === 'advanced') colorClass = 'bg-purple-50 border-purple-200 text-purple-700';
                                                    }

                                                    return (
                                                        <button
                                                            key={sKey}
                                                            onClick={() => b.active && updateBuildingStrategy(b.id, sKey)}
                                                            disabled={!b.active}
                                                            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-xs transition-all ${colorClass}`}
                                                        >
                                                            <span className="font-bold mb-0.5">{s.name}</span>
                                                            <span className="text-[10px] opacity-70">COP {s.targetCOP}</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {/* Estimates */}
                                        <div className="flex items-center gap-6 min-w-[180px] justify-end w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-slate-100 pt-3 lg:pt-0 lg:pl-6">
                                            <div className="text-right">
                                                <div className="text-[10px] text-slate-400">预估投资</div>
                                                <div className="text-sm font-bold text-slate-700">¥ {invest.toFixed(1)} 万</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-slate-400">年节约</div>
                                                <div className="text-sm font-bold text-green-600">¥ {saving.toFixed(1)} 万</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Advanced Mode: Inline Customization */}
                                    {mode === 'advanced' && b.active && (
                                        <div className="px-6 pb-6 pt-2 border-t border-slate-50 bg-slate-50/30 rounded-b-xl flex flex-col">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">精确估值参数微调</span>
                                            </div>
                                            
                                            <div className="flex flex-col lg:flex-row gap-6">
                                                {/* Left: Performance */}
                                                <div className="flex-1 bg-white p-3 rounded-lg border border-slate-200">
                                                    <div className="flex items-center gap-3">
                                                        <label className="text-xs text-slate-500 whitespace-nowrap">目标 COP:</label>
                                                        <input 
                                                            type="number" step="0.1" 
                                                            value={b.customCOP || ''} 
                                                            placeholder={STRATEGIES[b.strategy as keyof typeof STRATEGIES].targetCOP.toString()}
                                                            onChange={(e) => updateBuildingSimpleField(b.id, 'customCOP', parseFloat(e.target.value))}
                                                            className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded focus:border-primary outline-none bg-white font-bold text-slate-700"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Right: Cost Estimation Mode */}
                                                <div className="flex-[2] bg-white p-3 rounded-lg border border-slate-200 flex flex-col gap-3">
                                                    {/* Mode Selector Tabs */}
                                                    <div className="flex gap-1 bg-slate-100 p-1 rounded text-[10px]">
                                                        <button 
                                                            onClick={() => updateBuildingSimpleField(b.id, 'costMode', 'power')}
                                                            className={`flex-1 py-1.5 rounded transition-all ${b.costMode === 'power' ? 'bg-white text-primary shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                                                        >
                                                            按冷负荷 (元/kW)
                                                        </button>
                                                        <button 
                                                            onClick={() => updateBuildingSimpleField(b.id, 'costMode', 'area')}
                                                            className={`flex-1 py-1.5 rounded transition-all ${b.costMode === 'area' ? 'bg-white text-primary shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                                                        >
                                                            按建筑面积 (元/㎡)
                                                        </button>
                                                        <button 
                                                            onClick={() => updateBuildingSimpleField(b.id, 'costMode', 'fixed')}
                                                            className={`flex-1 py-1.5 rounded transition-all ${b.costMode === 'fixed' ? 'bg-white text-primary shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                                                        >
                                                            直接录入总价 (万元)
                                                        </button>
                                                    </div>

                                                    {/* Input Fields based on Mode */}
                                                    <div className="flex items-center gap-4">
                                                        {b.costMode === 'power' && (
                                                            <>
                                                                <div className="flex items-center gap-2 flex-1">
                                                                    <span className="text-xs text-slate-400">当前负荷:</span>
                                                                    <span className="text-xs font-bold text-slate-700">{b.load} kW</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 flex-[2]">
                                                                    <label className="text-xs text-slate-500 whitespace-nowrap">改造成本单价:</label>
                                                                    <div className="relative w-full">
                                                                        <input 
                                                                            type="number" step="10" 
                                                                            value={b.customUnitCost || ''} 
                                                                            placeholder={STRATEGIES[b.strategy as keyof typeof STRATEGIES].unitCost.toString()}
                                                                            onChange={(e) => updateBuildingSimpleField(b.id, 'customUnitCost', parseFloat(e.target.value))}
                                                                            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:border-primary outline-none bg-white font-medium"
                                                                        />
                                                                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">元/kW</span>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}

                                                        {b.costMode === 'area' && (
                                                            <>
                                                                <div className="flex items-center gap-2 flex-1">
                                                                    <label className="text-xs text-slate-500 whitespace-nowrap">建筑面积:</label>
                                                                    <div className="relative w-full">
                                                                        <input 
                                                                            type="number" 
                                                                            value={b.area || ''} 
                                                                            onChange={(e) => updateBuildingSimpleField(b.id, 'area', parseFloat(e.target.value))}
                                                                            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:border-primary outline-none bg-white font-medium"
                                                                        />
                                                                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">㎡</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 flex-[1.5]">
                                                                    <label className="text-xs text-slate-500 whitespace-nowrap">预估单价:</label>
                                                                    <div className="relative w-full">
                                                                        <input 
                                                                            type="number" step="10" 
                                                                            value={b.customUnitCost || ''} 
                                                                            placeholder="200"
                                                                            onChange={(e) => updateBuildingSimpleField(b.id, 'customUnitCost', parseFloat(e.target.value))}
                                                                            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:border-primary outline-none bg-white font-medium"
                                                                        />
                                                                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">元/㎡</span>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}

                                                        {b.costMode === 'fixed' && (
                                                            <div className="flex items-center gap-2 w-full">
                                                                <label className="text-xs text-slate-500 whitespace-nowrap">项目改造总价:</label>
                                                                <div className="relative w-full">
                                                                    <input 
                                                                        type="number" step="1" 
                                                                        value={b.customTotalInvest || ''} 
                                                                        placeholder="0"
                                                                        onChange={(e) => updateBuildingSimpleField(b.id, 'customTotalInvest', parseFloat(e.target.value))}
                                                                        className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:border-primary outline-none bg-white font-bold text-slate-800"
                                                                    />
                                                                    <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">万元</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
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
                      <div className="p-1.5 bg-yellow-100 rounded text-yellow-600"><span className="material-icons text-sm">bolt</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">{currentModule.kpiPrimary.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">{currentModule.kpiPrimary.value}</span>
                  </div>
                  <div className="mt-2 text-xs font-medium text-slate-400">
                      综合 COP: <span className="text-slate-800 font-bold">{currentModule.kpiSecondary.value}</span>
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

              {/* Clickable Chart - Monthly Energy Comparison */}
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
                  <div className="h-24 w-full pointer-events-none">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} barGap={2} barCategoryGap={2}>
                              <XAxis dataKey="name" tick={false} axisLine={false} tickLine={false} interval={1} />
                              <Bar dataKey="base" fill="#cbd5e1" radius={[2,2,0,0]} />
                              <Bar dataKey="retrofit" fill="#3b82f6" radius={[2,2,0,0]} />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* Financial Detail Trigger */}
              <div 
                onClick={() => setIsFinancialModalOpen(true)}
                className="mt-4 p-4 bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl shadow-lg cursor-pointer hover:shadow-xl transition-all group relative overflow-hidden"
              >
                  <div className="absolute right-0 top-0 w-16 h-16 bg-white/10 rounded-full -mr-4 -mt-4 blur-xl group-hover:bg-white/20 transition-all"></div>
                  <div className="flex justify-between items-center relative z-10">
                      <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              <span className="material-icons text-sm text-yellow-400">monetization_on</span> 收益详细分析
                          </h4>
                          <p className="text-[10px] text-slate-300 mt-1">查看现金流、IRR与回收期详情</p>
                      </div>
                      <span className="material-icons text-white/50 group-hover:text-white transition-colors">chevron_right</span>
                  </div>
              </div>
          </div>
      </aside>
      
      {/* ... (Modals remain unchanged) ... */}
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
                            空调系统月度能耗对比分析
                        </h2>
                        <p className="text-slate-500 mt-1 ml-12">基于季节因子与COP提升的节能模拟</p>
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
                        <BarChart data={chartData} margin={{top: 20, right: 30, left: 20, bottom: 5}} barGap={8}>
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
                                fill="#3b82f6" 
                                radius={[4,4,0,0]}
                                animationDuration={1500}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}

      {isFinancialModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6"
            onClick={() => setIsFinancialModalOpen(false)}
          >
              <div 
                  className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-[zoomIn_0.2s_ease-out]"
                  onClick={(e) => e.stopPropagation()}
              >
                  <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                      <div>
                          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                              <span className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center shadow-sm">
                                <span className="material-icons">monetization_on</span>
                              </span>
                              HVAC 改造收益模型 (税后)
                          </h2>
                          <p className="text-slate-500 mt-1 ml-14">
                              15年期现金流折现分析 | 静态回收期: {financials.paybackPeriod} 年
                          </p>
                      </div>
                      <button 
                          onClick={() => setIsFinancialModalOpen(false)}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors text-slate-500"
                      >
                          <span className="material-icons">close</span>
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">初始总投资 (Capex)</p>
                              <div className="text-2xl font-bold text-slate-900">¥ {financials.totalInvestment} <span className="text-sm font-normal text-slate-500">万</span></div>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">年均净收益</p>
                              <div className="text-2xl font-bold text-emerald-600">¥ {financials.totalYearlySaving} <span className="text-sm font-normal text-slate-500">万</span></div>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">内部收益率 (IRR)</p>
                              <div className="text-2xl font-bold text-purple-600">{financials.irr}%</div>
                          </div>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8 h-80">
                          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                              <span className="material-icons text-primary text-base">timeline</span> 15年累计现金流趋势
                          </h3>
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={financials.cashFlows.map((v, i) => {
                                  const cumulative = financials.cashFlows.slice(0, i + 1).reduce((a, b) => a + b, 0);
                                  return { year: i, value: parseFloat(cumulative.toFixed(1)) };
                              })} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                  <defs>
                                      <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                  <Tooltip 
                                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px'}}
                                      formatter={(value: number) => [`¥ ${value} 万`, '累计收益']}
                                      labelFormatter={(label) => `第 ${label} 年`}
                                  />
                                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCash)" />
                                  <ReferenceLine y={0} stroke="#94a3b8" />
                              </AreaChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default RetrofitHVAC;