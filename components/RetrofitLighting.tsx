import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area, ReferenceLine } from 'recharts';
import { useProject } from '../context/ProjectContext';

// --- Constants & Config ---

const DENSITIES = {
    low: { label: '低 (仓库/车库)', basePower: 5, costPerM2: 30 }, // W/m2, 元/m2
    medium: { label: '中 (标准办公)', basePower: 11, costPerM2: 55 },
    high: { label: '高 (精密加工/商超)', basePower: 22, costPerM2: 90 }
};

const OP_MODES = {
    always: { label: '24小时常亮', hours: 8760 },
    standard: { label: '标准办公 (10h)', hours: 2500 }, // 250 days * 10h
    shift: { label: '工业两班倒 (16h)', hours: 4800 }  // 300 days * 16h
};

// Mock Month Distribution for Chart
const BASE_MONTH_FACTORS = [0.9, 0.8, 0.9, 0.95, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85, 0.9];

// --- Interfaces ---

interface BOQItem {
    id: number;
    buildingId: number; // Added: Link to building
    name: string;
    oldType: string;
    oldPower: number; // W
    count: number;
    newSpec: string;
    newPower: number; // W
    runHours: number; // Added: Specific run hours per item
    unitPrice: number; // Yuan
}

interface QuickBuildingConfig {
    id: number;
    name: string;
    area: number;
    active: boolean;
    density: keyof typeof DENSITIES;
    opMode: keyof typeof OP_MODES;
}

// --- Helper: IRR Calculation ---
const calculateIRR = (cashFlows: number[], guess = 0.1) => {
    const maxIter = 100;
    const tol = 0.00001;
    let x0 = guess;
    for (let i = 0; i < maxIter; i++) {
        let fValue = 0;
        let fDerivative = 0;
        for (let j = 0; j < cashFlows.length; j++) {
            fValue += cashFlows[j] / Math.pow(1 + x0, j);
            fDerivative += -j * cashFlows[j] / Math.pow(1 + x0, j + 1);
        }
        const x1 = x0 - fValue / fDerivative;
        if (Math.abs(x1 - x0) <= tol) return x1;
        x0 = x1;
    }
    return x0;
};

export default function RetrofitLighting() {
  const { modules, toggleModule, updateModule, saveProject, priceConfig, projectBaseInfo } = useProject();
  const currentModule = modules['retrofit-lighting'];
  const savedParams = currentModule.params || {};

  // --- State ---
  const [mode, setMode] = useState<'quick' | 'precise'>(savedParams.mode || 'quick');
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);

  // Quick Mode State: List of buildings with individual settings
  const [quickBuildings, setQuickBuildings] = useState<QuickBuildingConfig[]>(() => {
      if (savedParams.quickBuildings) return savedParams.quickBuildings;
      
      // Initialize from projectBaseInfo
      return (projectBaseInfo.buildings || []).map((b: any) => ({
          id: b.id,
          name: b.name,
          area: b.area,
          active: true,
          density: 'medium',
          opMode: 'standard'
      }));
  });

  // Precise Mode State
  // 1. We need a selected building for the UI
  const [activePreciseBuildingId, setActivePreciseBuildingId] = useState<number>(
      projectBaseInfo.buildings && projectBaseInfo.buildings.length > 0 ? projectBaseInfo.buildings[0].id : 0
  );

  const [preciseState, setPreciseState] = useState(savedParams.preciseState || {
      items: [
          // Mock data attached to first building if available
          { id: 1, buildingId: projectBaseInfo.buildings?.[0]?.id || 1, name: '办公室格栅灯', oldType: 'T5荧光灯', oldPower: 84, count: 500, newSpec: 'LED面板灯', newPower: 36, runHours: 2500, unitPrice: 120 },
          { id: 2, buildingId: projectBaseInfo.buildings?.[0]?.id || 1, name: '走廊筒灯', oldType: '紧凑型荧光灯', oldPower: 18, count: 200, newSpec: 'LED筒灯', newPower: 8, runHours: 3000, unitPrice: 45 },
          { id: 3, buildingId: projectBaseInfo.buildings?.[0]?.id || 1, name: '车库支架灯', oldType: 'T8荧光灯', oldPower: 36, count: 300, newSpec: '雷达感应LED', newPower: 18, runHours: 8760, unitPrice: 35 }
      ] as BOQItem[],
      strategies: {
          sensing: false, // 智能感应
          schedule: true, // 时段控制
          daylight: false // 恒照度
      }
  });

  // Sync buildings logic
  useEffect(() => {
      if (projectBaseInfo.buildings.length !== quickBuildings.length) {
          const merged = projectBaseInfo.buildings.map((b: any) => {
              const existing = quickBuildings.find(qb => qb.id === b.id);
              return existing ? { ...existing, area: b.area, name: b.name } : {
                  id: b.id,
                  name: b.name,
                  area: b.area,
                  active: true,
                  density: 'medium' as const,
                  opMode: 'standard' as const
              };
          });
          setQuickBuildings(merged);
      }
      // Ensure precise mode active building is valid
      if (!projectBaseInfo.buildings.find((b:any) => b.id === activePreciseBuildingId) && projectBaseInfo.buildings.length > 0) {
          setActivePreciseBuildingId(projectBaseInfo.buildings[0].id);
      }
  }, [projectBaseInfo.buildings]);


  // --- Calculations ---

  // 1. Calculate Financials
  const financials = useMemo(() => {
      let investment = 0; // 万元
      let annualSavingMoney = 0; // 万元
      let annualSavingEnergy = 0; // kWh
      let electricityPrice = priceConfig.mode === 'fixed' ? priceConfig.fixedPrice : 0.85; // Simple estimation
      let totalCount = 0;

      if (mode === 'quick') {
          quickBuildings.forEach(b => {
              if (!b.active) return;
              const d = DENSITIES[b.density];
              const op = OP_MODES[b.opMode];

              // Investment
              investment += (b.area * d.costPerM2) / 10000;

              // Energy
              const baseLoadKW = (b.area * d.basePower) / 1000;
              const retrofitLoadKW = baseLoadKW * 0.45; // Assume LED is ~45% of traditional power
              const savingKWh = (baseLoadKW - retrofitLoadKW) * op.hours;
              
              annualSavingEnergy += savingKWh;
              totalCount += Math.round(b.area / 10);
          });
          
          annualSavingMoney = (annualSavingEnergy * electricityPrice) / 10000;

      } else {
          // Precise Mode
          let totalCost = 0;
          let totalOldKWh = 0;
          let totalNewKWh = 0;

          // Sum up all items from all buildings
          preciseState.items.forEach((item: BOQItem) => {
              totalCost += item.unitPrice * item.count;
              totalCount += item.count;
              
              // Per item saving calculation based on its specific runHours
              const itemOldKWh = (item.oldPower * item.count * item.runHours) / 1000;
              const itemNewKWh = (item.newPower * item.count * item.runHours) / 1000;
              
              totalOldKWh += itemOldKWh;
              totalNewKWh += itemNewKWh;
          });

          investment = totalCost / 10000;

          // Strategy Factors (Composite) apply to the NEW consumption
          let strategySavingRate = 0;
          if (preciseState.strategies.sensing) strategySavingRate += 0.3;
          if (preciseState.strategies.schedule) strategySavingRate += 0.15;
          if (preciseState.strategies.daylight) strategySavingRate += 0.10;
          strategySavingRate = Math.min(strategySavingRate, 0.6);

          const baseEnergySaved = totalOldKWh - totalNewKWh;
          const strategyEnergySaved = totalNewKWh * strategySavingRate;
          
          annualSavingEnergy = baseEnergySaved + strategyEnergySaved;
          annualSavingMoney = (annualSavingEnergy * electricityPrice) / 10000;
      }

      // Cash Flows for 5 Years (Lighting usually shorter cycle calc)
      const cashFlows = [-investment];
      for(let i=0; i<5; i++) cashFlows.push(annualSavingMoney);
      const irr = calculateIRR(cashFlows);
      
      const payback = annualSavingMoney > 0 ? investment / annualSavingMoney : 0;

      return {
          investment: parseFloat(investment.toFixed(1)),
          yearlySaving: parseFloat(annualSavingMoney.toFixed(1)),
          energySaving: parseFloat(annualSavingEnergy.toFixed(0)),
          payback: parseFloat(payback.toFixed(1)),
          irr: (irr * 100).toFixed(1),
          count: totalCount,
          cashFlows
      };
  }, [mode, quickBuildings, preciseState, priceConfig]);

  // 2. Chart Data
  const chartData = useMemo(() => {
      const yearlyTotal = financials.energySaving; // Savings
      const estimatedBaseTotal = yearlyTotal * 1.8; // Reverse engineer
      
      return BASE_MONTH_FACTORS.map((factor, i) => {
          const monthBase = (estimatedBaseTotal / 12) * factor;
          const monthSave = (yearlyTotal / 12) * factor;
          return {
              name: `${i+1}月`,
              base: parseFloat(monthBase.toFixed(0)),
              retrofit: parseFloat((monthBase - monthSave).toFixed(0))
          };
      });
  }, [financials.energySaving]);


  // --- Effects ---

  // Sync to Context
  useEffect(() => {
      const newParams = { mode, quickBuildings, preciseState };
      const currentStoredParams = JSON.stringify(currentModule.params);
      const newParamsString = JSON.stringify(newParams);

      if (currentStoredParams !== newParamsString) {
          updateModule('retrofit-lighting', {
              strategy: mode === 'quick' ? 'multi_building_est' : 'precise_boq',
              investment: financials.investment,
              yearlySaving: financials.yearlySaving,
              kpiPrimary: { label: '灯具数量', value: `${financials.count} 盏` },
              kpiSecondary: { label: '节电率', value: `${((financials.yearlySaving / (financials.investment * 2 + financials.yearlySaving))*100).toFixed(0)}%` },
              params: newParams
          });
      }
  }, [mode, quickBuildings, preciseState, financials, updateModule, currentModule.params]);


  // --- Handlers ---

  const handleQuickBuildingUpdate = (id: number, field: keyof QuickBuildingConfig, value: any) => {
      setQuickBuildings(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const handleBoqChange = (id: number, field: keyof BOQItem, val: any) => {
      setPreciseState(prev => ({
          ...prev,
          items: prev.items.map(item => item.id === id ? { ...item, [field]: val } : item)
      }));
  };

  const addBoqRow = () => {
      if (activePreciseBuildingId === 0) return;
      const newId = preciseState.items.length > 0 ? Math.max(...preciseState.items.map(i=>i.id)) + 1 : 1;
      setPreciseState(prev => ({
          ...prev,
          items: [...prev.items, { 
              id: newId, 
              buildingId: activePreciseBuildingId,
              name: '新增灯具', 
              oldType: '荧光灯', 
              oldPower: 40, 
              count: 100, 
              newSpec: 'LED', 
              newPower: 18, 
              runHours: 2500, // Default
              unitPrice: 50 
          }]
      }));
  };

  const deleteBoqRow = (id: number) => {
      setPreciseState(prev => ({
          ...prev,
          items: prev.items.filter(i => i.id !== id)
      }));
  };

  if (!currentModule) return null;

  return (
    <div className="flex h-full bg-slate-50 relative">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shrink-0">
            <div className="flex items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">智能照明改造配置</h2>
                    <p className="text-xs text-slate-500">LED 高效替换与 IoT 智能调控策略</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full ml-4">
                    <span className={`text-xs font-bold ${currentModule.isActive ? 'text-primary' : 'text-slate-400'}`}>
                        {currentModule.isActive ? '模块已启用' : '模块已停用'}
                    </span>
                    <button 
                        onClick={() => toggleModule('retrofit-lighting')}
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
                
                {/* Mode Toggle */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-2">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">测算模式选择</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            {mode === 'quick' ? '快速测算：基于多楼栋指标快速批量估算' : '精确估值：基于楼栋详细清单(BOQ)与具体运行时长'}
                        </p>
                    </div>
                    <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex">
                        <button 
                            onClick={() => setMode('quick')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mode === 'quick' ? 'bg-yellow-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <span className="material-icons text-[16px]">domain_add</span> 多楼栋估算
                        </button>
                        <button 
                            onClick={() => setMode('precise')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mode === 'precise' ? 'bg-yellow-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <span className="material-icons text-[16px]">list_alt</span> 清单式估值
                        </button>
                    </div>
                </div>

                {/* --- QUICK MODE: MULTI-BUILDING LIST --- */}
                {mode === 'quick' && (
                    <div className="animate-fade-in space-y-6">
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center justify-between border-b border-slate-100 pb-3">
                                <span className="flex items-center gap-2"><span className="material-icons text-yellow-500">apartment</span> 建筑楼栋配置策略</span>
                                <span className="text-xs font-normal text-slate-500 bg-slate-50 px-2 py-1 rounded">已选楼栋: {quickBuildings.filter(b=>b.active).length} / {quickBuildings.length}</span>
                            </h3>
                            
                            <div className="space-y-3">
                                {quickBuildings.map((b) => (
                                    <div key={b.id} className={`flex flex-col md:flex-row items-center gap-4 p-4 rounded-xl border transition-all ${b.active ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                        {/* ... Quick Mode Building Row ... */}
                                        <div className="flex items-center gap-3 w-full md:w-1/4">
                                            <input 
                                                type="checkbox" 
                                                checked={b.active} 
                                                onChange={() => handleQuickBuildingUpdate(b.id, 'active', !b.active)}
                                                className="w-5 h-5 accent-primary cursor-pointer"
                                            />
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm">{b.name}</div>
                                                <div className="text-xs text-slate-500">{b.area.toLocaleString()} ㎡</div>
                                            </div>
                                        </div>

                                        <div className="flex flex-1 gap-4 w-full md:w-auto">
                                            <div className="flex-1">
                                                <label className="text-[10px] text-slate-400 block mb-1">照度/密度标准</label>
                                                <select 
                                                    value={b.density}
                                                    onChange={(e) => handleQuickBuildingUpdate(b.id, 'density', e.target.value)}
                                                    disabled={!b.active}
                                                    className="w-full text-xs py-2 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-primary appearance-none cursor-pointer"
                                                >
                                                    {Object.entries(DENSITIES).map(([k, v]) => (
                                                        <option key={k} value={k}>{v.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] text-slate-400 block mb-1">运行模式</label>
                                                <select 
                                                    value={b.opMode}
                                                    onChange={(e) => handleQuickBuildingUpdate(b.id, 'opMode', e.target.value)}
                                                    disabled={!b.active}
                                                    className="w-full text-xs py-2 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-primary appearance-none cursor-pointer"
                                                >
                                                    {Object.entries(OP_MODES).map(([k, v]) => (
                                                        <option key={k} value={k}>{v.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {/* --- PRECISE MODE --- */}
                {mode === 'precise' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* BOQ Table */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                        <span className="material-icons text-blue-500">list_alt</span> 设备清单 (BOQ)
                                    </h3>
                                    {/* Building Selector for Precise Mode */}
                                    <div className="relative">
                                        <select
                                            value={activePreciseBuildingId}
                                            onChange={(e) => setActivePreciseBuildingId(Number(e.target.value))}
                                            className="pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-primary appearance-none cursor-pointer"
                                        >
                                            {projectBaseInfo.buildings && projectBaseInfo.buildings.length > 0 ? (
                                                projectBaseInfo.buildings.map((b:any) => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))
                                            ) : <option value={0}>默认建筑</option>}
                                        </select>
                                        <span className="material-icons absolute right-2 top-2 text-slate-400 pointer-events-none text-[16px]">expand_more</span>
                                    </div>
                                </div>
                                <button onClick={addBoqRow} className="text-xs font-medium text-primary hover:bg-blue-50 px-3 py-1.5 rounded transition-colors flex items-center gap-1">
                                    <span className="material-icons text-sm">add</span> 添加设备
                                </button>
                            </div>
                            
                            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 min-w-[120px]">区域/名称</th>
                                            <th className="px-4 py-3">原灯具类型</th>
                                            <th className="px-4 py-3 w-20">原功率(W)</th>
                                            <th className="px-4 py-3 w-20">数量</th>
                                            <th className="px-4 py-3">建议LED规格</th>
                                            <th className="px-4 py-3 w-20">新功率(W)</th>
                                            <th className="px-4 py-3 w-24">运行(h/年)</th>
                                            <th className="px-4 py-3 w-24">单价(元)</th>
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {preciseState.items
                                            .filter(item => item.buildingId === activePreciseBuildingId)
                                            .map((item) => (
                                            <tr key={item.id} className="group hover:bg-slate-50">
                                                <td className="px-4 py-2">
                                                    <input value={item.name} onChange={(e) => handleBoqChange(item.id, 'name', e.target.value)} className="w-full bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary" />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input value={item.oldType} onChange={(e) => handleBoqChange(item.id, 'oldType', e.target.value)} className="w-full bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary" />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input type="number" value={item.oldPower} onChange={(e) => handleBoqChange(item.id, 'oldPower', parseFloat(e.target.value))} className="w-full bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary" />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input type="number" value={item.count} onChange={(e) => handleBoqChange(item.id, 'count', parseFloat(e.target.value))} className="w-full bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary font-medium" />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input value={item.newSpec} onChange={(e) => handleBoqChange(item.id, 'newSpec', e.target.value)} className="w-full bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary text-blue-600" />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input type="number" value={item.newPower} onChange={(e) => handleBoqChange(item.id, 'newPower', parseFloat(e.target.value))} className="w-full bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary text-green-600 font-bold" />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input type="number" value={item.runHours} onChange={(e) => handleBoqChange(item.id, 'runHours', parseFloat(e.target.value))} className="w-full bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary" />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input type="number" value={item.unitPrice} onChange={(e) => handleBoqChange(item.id, 'unitPrice', parseFloat(e.target.value))} className="w-full bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary" />
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <button onClick={() => deleteBoqRow(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="material-icons text-sm">close</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {preciseState.items.filter(item => item.buildingId === activePreciseBuildingId).length === 0 && (
                                            <tr>
                                                <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-xs">当前楼栋暂无灯具清单，请添加</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Strategies */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <span className="material-icons text-purple-500">psychology</span> 智能策略配置
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <label className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${preciseState.strategies.sensing ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="material-icons text-indigo-500">sensors</span>
                                        <input 
                                            type="checkbox" 
                                            className="accent-primary w-5 h-5"
                                            checked={preciseState.strategies.sensing} 
                                            onChange={() => setPreciseState(p => ({...p, strategies: {...p.strategies, sensing: !p.strategies.sensing}}))}
                                        />
                                    </div>
                                    <span className="font-bold text-slate-800 mb-1">智能感应 (Motion)</span>
                                    <span className="text-xs text-slate-500">适用于车库、走廊。无人时降功率运行。</span>
                                    <span className="mt-2 text-xs font-bold text-green-600 bg-green-50 w-fit px-2 py-0.5 rounded">预计节能 30%</span>
                                </label>

                                <label className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${preciseState.strategies.schedule ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="material-icons text-blue-500">schedule</span>
                                        <input 
                                            type="checkbox" 
                                            className="accent-primary w-5 h-5"
                                            checked={preciseState.strategies.schedule} 
                                            onChange={() => setPreciseState(p => ({...p, strategies: {...p.strategies, schedule: !p.strategies.schedule}}))}
                                        />
                                    </div>
                                    <span className="font-bold text-slate-800 mb-1">时段控制 (Time)</span>
                                    <span className="text-xs text-slate-500">根据工作/非工作时段自动调节亮度。</span>
                                    <span className="mt-2 text-xs font-bold text-green-600 bg-green-50 w-fit px-2 py-0.5 rounded">预计节能 15%</span>
                                </label>

                                <label className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${preciseState.strategies.daylight ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="material-icons text-orange-500">wb_sunny</span>
                                        <input 
                                            type="checkbox" 
                                            className="accent-primary w-5 h-5"
                                            checked={preciseState.strategies.daylight} 
                                            onChange={() => setPreciseState(p => ({...p, strategies: {...p.strategies, daylight: !p.strategies.daylight}}))}
                                        />
                                    </div>
                                    <span className="font-bold text-slate-800 mb-1">恒照度 (Daylight)</span>
                                    <span className="text-xs text-slate-500">根据自然光自动补光，保持桌面照度恒定。</span>
                                    <span className="mt-2 text-xs font-bold text-green-600 bg-green-50 w-fit px-2 py-0.5 rounded">预计节能 10%</span>
                                </label>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>

        {/* Sticky Footer - FIXED */}
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
                      <div className="p-1.5 bg-yellow-100 rounded text-yellow-600"><span className="material-icons text-sm">lightbulb</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">{currentModule.kpiPrimary.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">{currentModule.kpiPrimary.value}</span>
                  </div>
                  <div className="mt-2 text-xs font-medium text-slate-400">
                      综合节能: <span className="text-emerald-600 font-bold">{currentModule.kpiSecondary.value}</span>
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
                  <div className="h-24 w-full pointer-events-none">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} barGap={2} barCategoryGap={2}>
                              <XAxis dataKey="name" tick={{fontSize: 9, fill: '#94a3b8'}} axisLine={false} tickLine={false} interval={1} />
                              <Bar dataKey="base" fill="#cbd5e1" radius={[2,2,0,0]} />
                              <Bar dataKey="retrofit" fill="#eab308" radius={[2,2,0,0]} />
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
                            <span className="p-2 bg-yellow-100 text-yellow-600 rounded-lg"><span className="material-icons">bar_chart</span></span>
                            照明系统能耗对比分析
                        </h2>
                        <p className="text-slate-500 mt-1 ml-12">LED 替换与智能控制的节电模拟结果</p>
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
                                fill="#d97706" 
                                radius={[4,4,0,0]}
                                animationDuration={1500}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}

      {/* Financial Detail Modal */}
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
                              照明改造收益模型
                          </h2>
                          <p className="text-slate-500 mt-1 ml-14">
                              5年期现金流折现分析 | 静态回收期: {financials.payback} 年
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
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">初始总投资</p>
                              <div className="text-2xl font-bold text-slate-900">¥ {financials.investment} <span className="text-sm font-normal text-slate-500">万</span></div>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">年均净收益</p>
                              <div className="text-2xl font-bold text-emerald-600">¥ {financials.yearlySaving} <span className="text-sm font-normal text-slate-500">万</span></div>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">内部收益率 (IRR)</p>
                              <div className="text-2xl font-bold text-purple-600">{financials.irr}%</div>
                          </div>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8 h-80">
                          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                              <span className="material-icons text-primary text-base">timeline</span> 5年累计现金流趋势
                          </h3>
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={financials.cashFlows.map((v, i) => {
                                  const cumulative = financials.cashFlows.slice(0, i + 1).reduce((a, b) => a + b, 0);
                                  return { year: i, value: parseFloat(cumulative.toFixed(1)) };
                              })} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                  <defs>
                                      <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#d97706" stopOpacity={0.1}/>
                                          <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
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
                                  <Area type="monotone" dataKey="value" stroke="#d97706" strokeWidth={3} fillOpacity={1} fill="url(#colorCash)" />
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