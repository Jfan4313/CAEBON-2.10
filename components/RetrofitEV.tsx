import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area, ComposedChart, Line, ReferenceLine, PieChart, Pie, Cell } from 'recharts';
import { useProject } from '../context/ProjectContext';

// --- Constants ---
const CHARGER_Types = {
    ac7: { label: '7kW 交流慢充 (AC)', power: 7, cost: 0.35, defaultUtil: 4.0, defaultFee: 0.4 }, // cost in 万元
    dc60: { label: '60kW 直流快充 (DC)', power: 60, cost: 2.5, defaultUtil: 6.5, defaultFee: 0.6 },
    dc120: { label: '120kW 直流超充 (DC)', power: 120, cost: 4.5, defaultUtil: 8.0, defaultFee: 0.8 },
    v2g: { label: 'V2G 双向桩 (AC/DC)', power: 15, cost: 1.2, defaultUtil: 5.0, defaultFee: 0.5 }
};

// --- Interfaces ---
interface EVEquipment {
    id: number;
    name: string;
    type: keyof typeof CHARGER_Types;
    count: number;
    priceOverride?: number; // 万元
    utilization: number; // hours/day (Turnover)
    serviceFee: number; // Yuan/kWh
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

export default function RetrofitEV() {
  const { modules, toggleModule, updateModule, saveProject, transformers, bills } = useProject();
  const currentModule = modules['retrofit-ev'];
  const savedParams = currentModule.params || {};

  // --- State ---
  const [mode, setMode] = useState<'quick' | 'precise'>(savedParams.mode || 'quick');
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
  const [isChartExpanded, setIsChartExpanded] = useState(false);

  // Quick Mode State
  const [quickState, setQuickState] = useState(savedParams.quickState || {
      acCount: 20,
      dcCount: 5,
      turnover: 3.5, // Hours per day effective
      serviceFee: 0.6, // Yuan/kWh
      constructionCost: 10 // Extra construction cost (wan)
  });

  // Precise Mode State
  const [preciseState, setPreciseState] = useState(savedParams.preciseState || {
      equipment: [
          { id: 1, name: '地下车库 A 区', type: 'ac7', count: 30, utilization: 4.0, serviceFee: 0.4 },
          { id: 2, name: '地面访客区', type: 'dc60', count: 4, utilization: 7.0, serviceFee: 0.7 },
          { id: 3, name: '物流装卸区', type: 'dc120', count: 2, utilization: 9.0, serviceFee: 0.8 }
      ] as EVEquipment[],
      // Project Level Financial Params
      projectParams: {
          installationCost: 15, // 万元 (Installation & Construction)
          subsidyPerKw: 200,    // 元/kW (Construction Subsidy)
          electricitySpread: 0.3, // 元/kWh (Electricity Price Diff Revenue)
          maintenanceRate: 2.0,   // % of Investment per year
          lineLossRate: 3.0       // % Energy Loss
      },
      strategies: {
          demandLimit: true, // 需量保护
          greenPriority: false, // 绿电消纳
          touArbitrage: true // 峰谷价差引导
      }
  });

  // --- Calculations ---

  // 1. Capacity Analysis
  const capacityContext = useMemo(() => {
      const totalCap = transformers.reduce((acc, t) => acc + t.capacity, 0);
      
      // Estimate existing load peak from bills
      let maxExistingLoad = 0;
      if (bills.length > 0) {
          const maxMonthKwh = Math.max(...bills.map(b => b.kwh));
          // Heuristic: Monthly kWh / 720 hours * Peak Factor (approx 1.6 for industrial/commercial mix)
          maxExistingLoad = (maxMonthKwh / 720) * 1.6;
      } else {
          // If no bills, assume 50% loading of transformer as baseline
          maxExistingLoad = totalCap * 0.5;
      }
      
      const remaining = Math.max(0, totalCap - maxExistingLoad);
      
      return {
          total: totalCap,
          used: maxExistingLoad,
          remaining: remaining
      };
  }, [transformers, bills]);

  const financials = useMemo(() => {
      let investment = 0;
      let totalPower = 0;
      let annualRevenue = 0;
      let annualCost = 0; // O&M
      let totalKWh = 0;
      let chargerCount = 0;

      if (mode === 'quick') {
          // Quick Logic
          investment = (quickState.acCount * CHARGER_Types.ac7.cost) + 
                       (quickState.dcCount * CHARGER_Types.dc60.cost) + 
                       quickState.constructionCost;
          
          totalPower = (quickState.acCount * 7) + (quickState.dcCount * 60);
          const dailyKWh = totalPower * quickState.turnover * 0.6; // 0.6 simultaneous factor roughly
          totalKWh = dailyKWh * 365;
          
          // Revenue = Service Fee
          annualRevenue = (totalKWh * quickState.serviceFee) / 10000;
          annualCost = investment * 0.05; // 5% O&M default for quick
          chargerCount = quickState.acCount + quickState.dcCount;

      } else {
          // Precise Logic
          let equipmentCost = 0;
          let subsidyAmount = 0;
          let totalServiceRevenue = 0;
          let totalSpreadRevenue = 0;

          preciseState.equipment.forEach((item: EVEquipment) => {
              const spec = CHARGER_Types[item.type];
              const cost = item.priceOverride || spec.cost; // 万元
              
              // 1. Investment
              equipmentCost += cost * item.count;
              const itemTotalPower = spec.power * item.count;
              totalPower += itemTotalPower;
              chargerCount += item.count;

              // 2. Revenue Calculation (Per Item)
              // Annual kWh = Power * Count * Utilization * 365
              // Utilizing factor assumption: 'Utilization' input is equivalent to effective full load hours per day
              const itemAnnualKWh = itemTotalPower * item.utilization * 365;
              
              totalKWh += itemAnnualKWh;
              
              // Revenue components
              totalServiceRevenue += itemAnnualKWh * item.serviceFee;
              totalSpreadRevenue += itemAnnualKWh * preciseState.projectParams.electricitySpread;
          });

          // Investment = Equipment + Installation - Subsidy
          const installation = preciseState.projectParams.installationCost;
          subsidyAmount = (totalPower * preciseState.projectParams.subsidyPerKw) / 10000; // Convert 元 to 万元
          investment = equipmentCost + installation - subsidyAmount;

          // Revenue (Gross)
          const grossRevenue = (totalServiceRevenue + totalSpreadRevenue) / 10000;
          
          // Costs
          // Maintenance
          const maintenanceCost = (equipmentCost + installation) * (preciseState.projectParams.maintenanceRate / 100);
          // Line Loss Cost
          const lossCost = (totalKWh * (preciseState.projectParams.lineLossRate / 100) * 0.8) / 10000;

          annualRevenue = grossRevenue;
          annualCost = maintenanceCost + lossCost;
      }

      const netProfit = annualRevenue - annualCost;
      const payback = netProfit > 0 ? investment / netProfit : 0;
      
      // 10 Year Cash Flow
      const cashFlows = [-investment];
      for(let i=0; i<10; i++) cashFlows.push(netProfit);
      const irr = calculateIRR(cashFlows);

      return {
          investment: parseFloat(investment.toFixed(1)),
          revenue: parseFloat(annualRevenue.toFixed(1)),
          netProfit: parseFloat(netProfit.toFixed(1)),
          payback: parseFloat(payback.toFixed(1)),
          irr: (irr * 100).toFixed(1),
          totalPower: parseFloat(totalPower.toFixed(0)),
          count: chargerCount,
          totalKWh: parseFloat((totalKWh/10000).toFixed(1)),
          cashFlows
      };
  }, [mode, quickState, preciseState]);

  const isOverload = financials.totalPower > capacityContext.remaining;

  // Simulation Chart Data (Load Profile)
  const chartData = useMemo(() => {
      const data = [];
      const baseLoad = capacityContext.used > 0 ? capacityContext.used : 500; 
      
      for (let i = 0; i < 24; i++) {
          // Simulate Base Load Curve (Peak at 10-14, 14-16)
          let currentBase = baseLoad * (0.4 + 0.6 * Math.sin((i - 6)/24 * Math.PI * 2)); // Simple curve
          
          // Simulate EV Load
          let evLoad = 0;
          if (mode === 'quick') {
              // Simple bell curve around noon and evening
              if ((i >= 8 && i <= 14) || (i >= 17 && i <= 20)) {
                  evLoad = financials.totalPower * 0.6;
              } else {
                  evLoad = financials.totalPower * 0.1;
              }
          } else {
              // Precise Mode: Impact of Strategies
              if (preciseState.strategies.touArbitrage) {
                  // Shift to valley (0-8) and flat (12-14)
                  if (i < 8) evLoad += financials.totalPower * 0.4;
                  if (i >= 11 && i <= 13) evLoad += financials.totalPower * 0.5;
                  if (i >= 18 && i <= 21) evLoad += financials.totalPower * 0.15; // Peak avoidance
              } else {
                  // Unmanaged
                  if (i >= 8 && i <= 18) evLoad += financials.totalPower * 0.5;
              }

              // Demand Limit Cutoff
              if (preciseState.strategies.demandLimit) {
                  const maxLimit = capacityContext.total; 
                  if (currentBase + evLoad > maxLimit) {
                      evLoad = Math.max(0, maxLimit - currentBase);
                  }
              }
          }

          data.push({
              hour: `${i}:00`,
              base: Math.round(currentBase),
              ev: Math.round(evLoad),
              total: Math.round(currentBase + evLoad),
              limit: capacityContext.total
          });
      }
      return data;
  }, [financials.totalPower, mode, preciseState.strategies, capacityContext]);


  // --- Effects ---
  useEffect(() => {
      const newParams = { mode, quickState, preciseState };
      const currentStoredParams = JSON.stringify(currentModule.params);
      const newParamsString = JSON.stringify(newParams);

      if (currentStoredParams !== newParamsString) {
          updateModule('retrofit-ev', {
              strategy: mode === 'quick' ? 'standard_ops' : 'ai_managed',
              investment: financials.investment,
              yearlySaving: financials.netProfit,
              kpiPrimary: { label: '桩体数量', value: `${financials.count} 个` },
              kpiSecondary: { label: '年充电量', value: `${financials.totalKWh} 万kWh` },
              params: newParams
          });
      }
  }, [mode, quickState, preciseState, financials, updateModule, currentModule.params]);

  // --- Handlers ---
  const addEquipment = () => {
      const newId = preciseState.equipment.length > 0 ? Math.max(...preciseState.equipment.map(e=>e.id))+1 : 1;
      const type = 'ac7';
      const spec = CHARGER_Types[type];
      setPreciseState(prev => ({
          ...prev,
          equipment: [...prev.equipment, { 
              id: newId, 
              name: '新区域', 
              type: type, 
              count: 5,
              utilization: spec.defaultUtil,
              serviceFee: spec.defaultFee
          }]
      }));
  };

  const removeEquipment = (id: number) => {
      setPreciseState(prev => ({ ...prev, equipment: prev.equipment.filter(e => e.id !== id) }));
  };

  const updateEquipment = (id: number, field: keyof EVEquipment, val: any) => {
      setPreciseState(prev => ({
          ...prev,
          equipment: prev.equipment.map(e => {
              if (e.id !== id) return e;
              // If type changes, update defaults if they weren't manually overridden
              if (field === 'type') {
                  const spec = CHARGER_Types[val as keyof typeof CHARGER_Types];
                  return { ...e, type: val, utilization: spec.defaultUtil, serviceFee: spec.defaultFee, priceOverride: undefined };
              }
              return { ...e, [field]: val };
          })
      }));
  };

  if (!currentModule) return null;

  return (
    <div className="flex h-full bg-slate-50 relative">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shrink-0">
            <div className="flex items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">充电桩设施配置</h2>
                    <p className="text-xs text-slate-500">智能充电与 V2G 车网互动策略</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full ml-4">
                    <span className={`text-xs font-bold ${currentModule.isActive ? 'text-primary' : 'text-slate-400'}`}>
                        {currentModule.isActive ? '模块已启用' : '模块已停用'}
                    </span>
                    <button 
                        onClick={() => toggleModule('retrofit-ev')}
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
            <div className="max-w-6xl mx-auto space-y-8">
                
                {/* Mode Toggle */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-2">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">测算模式选择</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            {mode === 'quick' ? '快速测算：基于总数与翻台率估算投资回报' : '精确估值：基于用户画像、运营参数与项目财务因子'}
                        </p>
                    </div>
                    <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex">
                        <button 
                            onClick={() => setMode('quick')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mode === 'quick' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <span className="material-icons text-[16px]">speed</span> 快速测算
                        </button>
                        <button 
                            onClick={() => setMode('precise')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mode === 'precise' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <span className="material-icons text-[16px]">precision_manufacturing</span> 精确估值
                        </button>
                    </div>
                </div>

                {/* --- QUICK MODE --- */}
                {mode === 'quick' && (
                    <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 1. Scale */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col gap-4">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <span className="material-icons text-blue-500">ev_station</span> 建设规模预测
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">慢充桩 (7kW)</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" value={quickState.acCount} 
                                            onChange={(e) => setQuickState({...quickState, acCount: parseFloat(e.target.value)})}
                                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary font-bold"
                                        />
                                        <span className="text-xs text-slate-400">个</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">快充桩 (60kW)</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" value={quickState.dcCount} 
                                            onChange={(e) => setQuickState({...quickState, dcCount: parseFloat(e.target.value)})}
                                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary font-bold"
                                        />
                                        <span className="text-xs text-slate-400">个</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">额外施工预算</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" value={quickState.constructionCost} 
                                            onChange={(e) => setQuickState({...quickState, constructionCost: parseFloat(e.target.value)})}
                                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                                        />
                                        <span className="text-xs text-slate-400">万元</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Operations */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col gap-4">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <span className="material-icons text-green-500">payments</span> 运营核心指标
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">日均有效利用时长</label>
                                    <div className="relative">
                                        <input 
                                            type="number" step="0.1" value={quickState.turnover} 
                                            onChange={(e) => setQuickState({...quickState, turnover: parseFloat(e.target.value)})}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary font-bold"
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">小时/桩</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">平均充电服务费</label>
                                    <div className="relative">
                                        <input 
                                            type="number" step="0.1" value={quickState.serviceFee} 
                                            onChange={(e) => setQuickState({...quickState, serviceFee: parseFloat(e.target.value)})}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary font-bold"
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">元/kWh</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-auto bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <p className="text-xs text-slate-500">预估总功率</p>
                                <p className="text-xl font-bold text-slate-800">{financials.totalPower} kW</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PRECISE MODE --- */}
                {mode === 'precise' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* 1. Equipment List - Enhanced Table */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                        <span className="material-icons text-blue-500">list_alt</span> 详细设备清单
                                    </h3>
                                    {capacityContext.total > 0 ? (
                                        <div className="flex items-center gap-3 mt-1.5 text-xs">
                                            <span className="text-slate-500 flex items-center gap-1">
                                                <span className="material-icons text-[14px] text-slate-400">power</span>
                                                变压器容量: <span className="font-bold text-slate-700">{capacityContext.total} kVA</span>
                                            </span>
                                            <span className="text-slate-300">|</span>
                                            <span className="text-slate-500">
                                                剩余可用: <span className={`font-bold ${capacityContext.remaining < 200 ? 'text-orange-500' : 'text-green-600'}`}>{capacityContext.remaining.toFixed(0)} kW</span>
                                            </span>
                                            {isOverload && (
                                                <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 animate-pulse ml-2">
                                                    <span className="material-icons text-[14px]">warning</span>
                                                    <span>容量不足! 缺口 {(financials.totalPower - capacityContext.remaining).toFixed(0)} kW</span>
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-slate-400 mt-1">请先在项目录入中配置变压器以进行容量校验</p>
                                    )}
                                </div>
                                <button onClick={addEquipment} className="text-xs text-primary font-medium flex items-center hover:bg-primary/5 px-3 py-1.5 rounded border border-primary/20 transition-colors">
                                    <span className="material-icons text-sm mr-1">add</span> 添加设备
                                </button>
                            </div>
                            <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs font-semibold">
                                        <tr>
                                            <th className="px-4 py-3">区域/名称</th>
                                            <th className="px-4 py-3">桩体类型 (AC/DC)</th>
                                            <th className="px-4 py-3 w-20 text-center">数量</th>
                                            <th className="px-4 py-3 w-24 text-right">单价(万)</th>
                                            <th className="px-4 py-3 w-28 text-center">翻台率(h/日)</th>
                                            <th className="px-4 py-3 w-28 text-center">服务费(元)</th>
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {preciseState.equipment.map((item, idx) => (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2">
                                                    <input value={item.name} onChange={(e)=>updateEquipment(item.id, 'name', e.target.value)} className="w-full bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary text-slate-700"/>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <select value={item.type} onChange={(e)=>updateEquipment(item.id, 'type', e.target.value)} className="bg-white outline-none w-full text-xs border border-slate-200 rounded px-2 py-1 focus:border-primary cursor-pointer text-slate-600">
                                                        {Object.entries(CHARGER_Types).map(([k, v]) => (
                                                            <option key={k} value={k}>{v.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input type="number" value={item.count} onChange={(e)=>updateEquipment(item.id, 'count', parseFloat(e.target.value))} className="w-20 bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary text-center font-medium"/>
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                    <span className="text-slate-500 text-xs px-2">{item.priceOverride || CHARGER_Types[item.type].cost}</span>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center justify-center">
                                                        <input type="number" step="0.5" value={item.utilization} onChange={(e)=>updateEquipment(item.id, 'utilization', parseFloat(e.target.value))} className="w-16 bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary text-center font-bold text-slate-700"/>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center justify-center">
                                                        <input type="number" step="0.1" value={item.serviceFee} onChange={(e)=>updateEquipment(item.id, 'serviceFee', parseFloat(e.target.value))} className="w-16 bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary text-center text-green-600 font-bold"/>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <button onClick={() => removeEquipment(item.id)} className="text-slate-300 hover:text-red-500 transition-colors"><span className="material-icons text-sm">close</span></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* 2. Advanced Project Params (New Section) */}
                            <section className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
                                    <span className="material-icons text-orange-500">settings_input_component</span> 
                                    高级运营参数 (财务与工程)
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">配套施工费</label>
                                        <div className="flex items-center gap-2 border border-slate-200 rounded px-2 py-1.5 bg-white focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                                            <input type="number" value={preciseState.projectParams.installationCost} onChange={(e)=>setPreciseState(p=>({...p, projectParams: {...p.projectParams, installationCost: parseFloat(e.target.value)}}))} className="w-full bg-white outline-none text-sm font-bold text-slate-800" />
                                            <span className="text-xs text-slate-400 whitespace-nowrap">万元</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">建设补贴标准</label>
                                        <div className="flex items-center gap-2 border border-slate-200 rounded px-2 py-1.5 bg-white focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                                            <input type="number" value={preciseState.projectParams.subsidyPerKw} onChange={(e)=>setPreciseState(p=>({...p, projectParams: {...p.projectParams, subsidyPerKw: parseFloat(e.target.value)}}))} className="w-full bg-white outline-none text-sm font-bold text-green-600" />
                                            <span className="text-xs text-slate-400 whitespace-nowrap">元/kW</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">系统线损率</label>
                                        <div className="flex items-center gap-2 border border-slate-200 rounded px-2 py-1.5 bg-white focus-within:border-primary">
                                            <input type="number" step="0.1" value={preciseState.projectParams.lineLossRate} onChange={(e)=>setPreciseState(p=>({...p, projectParams: {...p.projectParams, lineLossRate: parseFloat(e.target.value)}}))} className="w-full bg-white outline-none text-sm text-slate-700" />
                                            <span className="text-xs text-slate-400 whitespace-nowrap">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">年维保费率</label>
                                        <div className="flex items-center gap-2 border border-slate-200 rounded px-2 py-1.5 bg-white focus-within:border-primary">
                                            <input type="number" step="0.1" value={preciseState.projectParams.maintenanceRate} onChange={(e)=>setPreciseState(p=>({...p, projectParams: {...p.projectParams, maintenanceRate: parseFloat(e.target.value)}}))} className="w-full bg-white outline-none text-sm text-slate-700" />
                                            <span className="text-xs text-slate-400 whitespace-nowrap">%</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-500">购销电价差 (元/kWh)</span>
                                        <span className="text-[10px] text-slate-400">电费利润部分，不含服务费</span>
                                    </div>
                                    <div className="w-1/2">
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="range" min="0" max="1" step="0.05" 
                                                value={preciseState.projectParams.electricitySpread} 
                                                onChange={(e) => setPreciseState(p => ({...p, projectParams: {...p.projectParams, electricitySpread: parseFloat(e.target.value)}}))}
                                                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                            />
                                            <span className="text-sm font-bold text-blue-600 w-12 text-right">{preciseState.projectParams.electricitySpread}</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* 3. Strategies & Chart Summary */}
                            <div className="flex flex-col gap-6">
                                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col gap-4">
                                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                        <span className="material-icons text-purple-500">psychology</span> AI 智慧能源管理
                                    </h3>
                                    <div className="space-y-3">
                                        <label className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${preciseState.strategies.demandLimit ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                            <input type="checkbox" className="accent-blue-600 w-4 h-4" checked={preciseState.strategies.demandLimit} onChange={() => setPreciseState(p => ({...p, strategies: {...p.strategies, demandLimit: !p.strategies.demandLimit}}))} />
                                            <div>
                                                <span className="text-xs font-bold text-slate-700 block">AI 需量限制保护</span>
                                                <span className="text-[10px] text-slate-500">动态调整功率，避免变压器超载</span>
                                            </div>
                                        </label>
                                        <label className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${preciseState.strategies.greenPriority ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                            <input type="checkbox" className="accent-green-600 w-4 h-4" checked={preciseState.strategies.greenPriority} onChange={() => setPreciseState(p => ({...p, strategies: {...p.strategies, greenPriority: !p.strategies.greenPriority}}))} />
                                            <div>
                                                <span className="text-xs font-bold text-slate-700 block">绿电优先消纳策略</span>
                                                <span className="text-[10px] text-slate-500">光伏大发时段优先引导充电</span>
                                            </div>
                                        </label>
                                        <label className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${preciseState.strategies.touArbitrage ? 'bg-orange-50 border-orange-200 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                            <input type="checkbox" className="accent-orange-600 w-4 h-4" checked={preciseState.strategies.touArbitrage} onChange={() => setPreciseState(p => ({...p, strategies: {...p.strategies, touArbitrage: !p.strategies.touArbitrage}}))} />
                                            <div>
                                                <span className="text-xs font-bold text-slate-700 block">分时电价套利</span>
                                                <span className="text-[10px] text-slate-500">利用峰谷价差优化充电成本</span>
                                            </div>
                                        </label>
                                    </div>
                                </section>
                                
                                <div className="flex-1 bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-center items-center cursor-pointer hover:shadow-md transition-all group" onClick={() => setIsChartExpanded(true)}>
                                    <div className="w-full h-32 relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={chartData}>
                                                <Area type="monotone" dataKey="total" stroke="#22c55e" fill="#dcfce7" />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors"></div>
                                    </div>
                                    <span className="text-xs text-slate-400 mt-2 flex items-center gap-1 group-hover:text-primary transition-colors">
                                        <span className="material-icons text-[14px]">zoom_in</span> 点击查看负荷叠加曲线
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Sticky Footer - FIXED: right-[340px] to avoid overlap with sidebar */}
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
              {/* KPIs */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-green-100 rounded text-green-600"><span className="material-icons text-sm">ev_station</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">桩体总数</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">{financials.count}</span>
                      <span className="text-sm text-slate-500">个</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">总功率: {financials.totalPower} kW</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-red-100 rounded text-red-600"><span className="material-icons text-sm">savings</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">年净利润</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">¥ {financials.netProfit}</span>
                      <span className="text-sm text-slate-500">万</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                      年营收: ¥ {financials.revenue} 万
                  </div>
              </div>

              {/* Total Investment Card */}
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
                   <div className="mt-2 text-xs text-blue-200 relative z-10 font-medium">
                       静态回收期: <span className="text-white font-bold">{financials.payback} 年</span>
                   </div>
               </div>

              {/* Revenue Composition Chart */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase">收益构成</span>
                  </div>
                  <div className="h-40 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                  data={[
                                      { name: '服务费', value: mode === 'quick' ? financials.revenue : financials.revenue * 0.65 }, // Mock split for visual
                                      { name: '电费差价', value: mode === 'quick' ? 0 : financials.revenue * 0.35 }
                                  ]}
                                  innerRadius={40}
                                  outerRadius={60}
                                  paddingAngle={5}
                                  dataKey="value"
                              >
                                  <Cell fill="#10b981" />
                                  <Cell fill="#3b82f6" />
                              </Pie>
                              <Tooltip contentStyle={{borderRadius: '8px', fontSize: '12px'}} />
                          </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                          <span className="text-xs text-slate-400">总营收</span>
                          <span className="text-sm font-bold text-slate-700">{financials.revenue}万</span>
                      </div>
                  </div>
                  <div className="flex justify-center gap-4 text-[10px] text-slate-500">
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>服务费</div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div>电费差价</div>
                  </div>
              </div>

              {/* Financial Detail Trigger - Fixed: Now visible due to footer change */}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6" onClick={() => setIsChartExpanded(false)}>
            <div className="bg-white rounded-2xl w-full max-w-5xl h-[600px] shadow-2xl p-8 flex flex-col" onClick={e=>e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">负荷冲击与容量分析</h2>
                    <button onClick={() => setIsChartExpanded(false)}><span className="material-icons">close</span></button>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="base" fill="#e2e8f0" stroke="#94a3b8" name="基础负荷" />
                        <Area type="monotone" dataKey="total" fill="#dcfce7" stroke="#22c55e" name="叠加充电负荷" />
                        <ReferenceLine y={capacityContext.total} label="变压器容量" stroke="red" strokeDasharray="3 3" />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
      )}

      {/* Financial Detail Modal */}
      {isFinancialModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6" onClick={() => setIsFinancialModalOpen(false)}>
              <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col" onClick={e=>e.stopPropagation()}>
                  <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                      <h2 className="text-2xl font-bold text-slate-800">充电桩运营收益模型 (10年)</h2>
                      <button onClick={() => setIsFinancialModalOpen(false)}><span className="material-icons">close</span></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                              <p className="text-xs font-bold text-slate-400 uppercase">总投资</p>
                              <div className="text-2xl font-bold text-slate-900">¥ {financials.investment} 万</div>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                              <p className="text-xs font-bold text-slate-400 uppercase">内部收益率 (IRR)</p>
                              <div className="text-2xl font-bold text-purple-600">{financials.irr}%</div>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                              <p className="text-xs font-bold text-slate-400 uppercase">静态回收期</p>
                              <div className="text-2xl font-bold text-orange-500">{financials.payback} 年</div>
                          </div>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 h-80">
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={financials.cashFlows.map((v, i) => ({ year: i, value: financials.cashFlows.slice(0, i+1).reduce((a,b)=>a+b,0) }))}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="year" />
                                  <YAxis />
                                  <Tooltip />
                                  <Area type="monotone" dataKey="value" stroke="#10b981" fill="#dcfce7" />
                                  <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" />
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