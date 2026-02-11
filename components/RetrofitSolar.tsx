import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useProject, Bill } from '../context/ProjectContext';

const baseMonthData = [
  { name: '1月', base: 10, weight: 0.06 }, { name: '2月', base: 12, weight: 0.07 }, { name: '3月', base: 15, weight: 0.09 },
  { name: '4月', base: 18, weight: 0.10 }, { name: '5月', base: 22, weight: 0.11 }, { name: '6月', base: 25, weight: 0.12 },
  { name: '7月', base: 28, weight: 0.12 }, { name: '8月', base: 26, weight: 0.11 }, { name: '9月', base: 20, weight: 0.09 },
  { name: '10月', base: 18, weight: 0.08 }, { name: '11月', base: 12, weight: 0.06 }, { name: '12月', base: 10, weight: 0.05 }, // Weights sum approx 1.0
];

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

        if (Math.abs(x1 - x0) <= tol) {
            return x1;
        }

        x0 = x1;
    }
    return x0;
};

// Interface for detailed yearly data
interface YearlyFinancialDetail {
    year: number;
    generation: number; // 万kWh
    revenue: number;    // 万元 (Savings + Feed-in)
    opex: number;       // 万元 (O&M + Insurance)
    tax: number;        // 万元
    netIncome: number;  // 万元
}

const RetrofitSolar: React.FC = () => {
  const { modules, updateModule, toggleModule, transformers, bills, priceConfig } = useProject();
  const currentModule = modules['retrofit-solar'];

  // --- State Management ---
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);

  // 1. Simple Parameters
  const [simpleParams, setSimpleParams] = useState({
      connectionPoint: transformers[0]?.id || 0,
      area: 5000,
      installType: 'concrete',
      capacity: 600, // kWp
      epcPrice: 3.2, // Yuan/Wp
      fundingSource: 'self'
  });

  // 2. Advanced Parameters
  // Engineering & Financials
  const [advParams, setAdvParams] = useState({
      // Generation Formula Factors
      dailySunHours: 3.8, // 日照时长 (h/day)
      prValue: 80, // 系统综合发电效率 (%, default 80)
      azimuthEfficiency: 95, // 非正南角度系数 (%, default 95)
      generationDays: 365, // 发电天数 (days)
      
      // Degradation
      degradationFirstYear: 2.0, // %
      degradationLinear: 0.55, // %/year
      
      // Financials
      feedInTariff: 0.45, // Yuan/kWh
      omCost: 0.05, // Yuan/W/year
      insuranceRate: 0.2, // % of Capex
      electricityPrice: 0.85, // Avg buying price
      taxRate: 13.0, // % (New: Income Tax / VAT proxy)
  });

  // Building Details
  const [buildings, setBuildings] = useState([
      { id: 1, name: '1号生产车间', area: 3500, active: true, manualCapacity: 450, transformerId: transformers[0]?.id || 0 },
      { id: 2, name: '研发中心大楼', area: 1200, active: true, manualCapacity: 120, transformerId: transformers[0]?.id || 0 },
      { id: 3, name: '3号仓库', area: 2000, active: false, manualCapacity: 200, transformerId: transformers[0]?.id || 0 },
  ]);

  // Derived: Self Consumption Rate Calculation
  const [selfUseMode, setSelfUseMode] = useState<'manual' | 'auto'>('manual');
  const [calculatedSelfConsumption, setCalculatedSelfConsumption] = useState(85); // %

  // Local state for long-term metrics
  const [longTermMetrics, setLongTermMetrics] = useState({
      genYear1: 0,   // 万kWh
      gen25Year: 0,  // 万kWh
      rev25Year: 0,   // 万元
      paybackPeriod: 0, // Years
      irr: 0, // %
      cashFlows: [] as number[],
      yearlyDetails: [] as YearlyFinancialDetail[]
  });

  // --- Logic & Effects ---

  // Auto-Calculate Comprehensive Electricity Price
  useEffect(() => {
      const startHour = 8;
      const endHour = 17;
      let total = 0;
      let count = 0;

      if (priceConfig.mode === 'fixed') {
          setAdvParams(prev => ({ ...prev, electricityPrice: priceConfig.fixedPrice }));
      } else if (priceConfig.mode === 'tou') {
          for (let h = startHour; h < endHour; h++) {
              const seg = priceConfig.touSegments.find(s => h >= s.start && h < s.end);
              if (seg) {
                  total += seg.price;
                  count++;
              }
          }
          if (count > 0) {
              const avg = parseFloat((total / count).toFixed(3));
              setAdvParams(prev => ({ ...prev, electricityPrice: avg }));
          }
      }
  }, [priceConfig]);

  // Auto-calculate Simple Capacity
  useEffect(() => {
      if (mode === 'simple') {
          const factors: Record<string, number> = { 'concrete': 0.12, 'steeltile': 0.11, 'waterproof': 0.13, 'bipv': 0.15 };
          const factor = factors[simpleParams.installType] || 0.12;
          setSimpleParams(prev => ({ ...prev, capacity: Math.floor(prev.area * factor) }));
      }
  }, [simpleParams.area, simpleParams.installType, mode]);

  // Advanced: Calculate Self-Consumption
  useEffect(() => {
      if (mode === 'advanced') {
          const totalActiveCapacity = buildings.filter(b => b.active).reduce((acc, b) => acc + b.manualCapacity, 0);
          // Rough estimate for self-consumption calculation logic (using annual average)
          const estimatedGenYear = totalActiveCapacity * advParams.dailySunHours * 365 * (advParams.prValue / 100);
          
          if (selfUseMode === 'auto') {
              if (bills.length === 0) {
                  setCalculatedSelfConsumption(100); 
              } else {
                  let totalSelfConsumed = 0;
                  const monthGenData = baseMonthData.map(m => estimatedGenYear * m.weight);
                  for(let i=0; i<12; i++) {
                      const gen = monthGenData[i];
                      const bill = bills[i] ? bills[i].kwh : 0; 
                      const daytimeLoadFactor = 0.5; 
                      const potentialConsumption = bill * daytimeLoadFactor;
                      totalSelfConsumed += Math.min(gen, potentialConsumption);
                  }
                  const rate = estimatedGenYear > 0 ? (totalSelfConsumed / estimatedGenYear) * 100 : 0;
                  setCalculatedSelfConsumption(parseFloat(Math.min(100, rate).toFixed(1)));
              }
          }
      }
  }, [buildings, advParams.dailySunHours, advParams.prValue, bills, mode, selfUseMode]);

  // Main Global Update Effect & 25-Year Simulation
  useEffect(() => {
      let finalCapacity = 0;
      let finalInvestment = 0;
      let firstYearGen = 0;
      let finalYearlySaving = 0;
      let cashFlows: number[] = [];
      let yearlyDetails: YearlyFinancialDetail[] = [];

      // 1. Calculate Capacity & Investment & Year 1 Gen
      if (mode === 'simple') {
          // --- Simple Mode Logic (Approximation) ---
          finalCapacity = simpleParams.capacity;
          finalInvestment = (finalCapacity * 1000 * simpleParams.epcPrice) / 10000;
          firstYearGen = finalCapacity * 1100 * 0.82; 
          
          // Simple estimation: assume tax is already roughly considered in the factor or ignore for simple mode
          // To be consistent, let's apply the simple math:
          const rawRevenue = (firstYearGen * 0.85) / 10000; 
          // Deduct 13% tax simply
          finalYearlySaving = rawRevenue * (1 - advParams.taxRate/100);
          
          cashFlows = [-finalInvestment];
          for(let i=0; i<25; i++) cashFlows.push(finalYearlySaving);

          setLongTermMetrics({
              genYear1: parseFloat((firstYearGen/10000).toFixed(2)),
              gen25Year: parseFloat((firstYearGen * 20 / 10000).toFixed(1)), 
              rev25Year: parseFloat((finalYearlySaving * 20).toFixed(1)),
              paybackPeriod: parseFloat((finalInvestment / finalYearlySaving).toFixed(1)),
              irr: parseFloat((calculateIRR(cashFlows) * 100).toFixed(1)),
              cashFlows,
              yearlyDetails: [] // Not generated in simple mode for brevity, or could gen mock
          });

      } else {
          // --- Advanced Mode Logic (Detailed) ---
          finalCapacity = buildings.filter(b => b.active).reduce((acc, b) => acc + b.manualCapacity, 0);
          finalInvestment = (finalCapacity * 1000 * simpleParams.epcPrice) / 10000;
          
          const theoreticalBaseGen = finalCapacity * advParams.dailySunHours * advParams.generationDays * (advParams.prValue / 100) * (advParams.azimuthEfficiency / 100);
          
          let totalGen25 = 0;
          let totalRev25 = 0;
          
          cashFlows = [-finalInvestment]; // Year 0

          for (let i = 1; i <= 25; i++) {
              // 1. Generation Calculation
              let degradationRate = 0;
              if (i === 1) {
                  degradationRate = advParams.degradationFirstYear;
              } else {
                  degradationRate = advParams.degradationFirstYear + (i - 1) * advParams.degradationLinear;
              }
              const efficiencyAfterDegradation = 1 - (degradationRate / 100);
              const currentGen = theoreticalBaseGen * efficiencyAfterDegradation; // kWh
              
              totalGen25 += currentGen;
              if (i === 1) firstYearGen = currentGen;

              // 2. Revenue Calculation (Savings + Feed-in)
              const selfUsedKwh = currentGen * (calculatedSelfConsumption / 100);
              const exportKwh = currentGen - selfUsedKwh;
              // Revenue in Yuan
              const revenueYuan = (selfUsedKwh * advParams.electricityPrice) + (exportKwh * advParams.feedInTariff);
              
              // 3. OpEx Calculation (O&M + Insurance)
              // O&M: Yuan/W/year -> Total Yuan
              const omCostYuan = (finalCapacity * 1000 * advParams.omCost);
              // Insurance: % of Capex -> Total Yuan
              const insCostYuan = (finalInvestment * 10000 * (advParams.insuranceRate/100));
              const totalOpExYuan = omCostYuan + insCostYuan;
              
              // 4. Pre-Tax Profit
              const ebit = revenueYuan - totalOpExYuan;

              // 5. Tax Calculation (13% of Profit, or as defined)
              // Assuming Income Tax is on profit. If < 0, no tax.
              const taxYuan = ebit > 0 ? ebit * (advParams.taxRate / 100) : 0;

              // 6. Net Income
              const netIncomeYuan = ebit - taxYuan;
              const netIncomeWan = netIncomeYuan / 10000;

              totalRev25 += netIncomeWan;
              cashFlows.push(netIncomeWan);

              // Set Year 1 Saving for global context
              if (i === 1) finalYearlySaving = netIncomeWan;

              // Record Detail
              yearlyDetails.push({
                  year: i,
                  generation: currentGen / 10000, // 万kWh
                  revenue: revenueYuan / 10000,   // 万元
                  opex: totalOpExYuan / 10000,    // 万元
                  tax: taxYuan / 10000,           // 万元
                  netIncome: netIncomeWan         // 万元
              });
          }

          const calculatedIRR = calculateIRR(cashFlows);
          
          // Calculate dynamic payback period
          let cumulativeCashFlow = -finalInvestment;
          let paybackYear = 0;
          for(let i=1; i<=25; i++) {
              cumulativeCashFlow += cashFlows[i];
              if(cumulativeCashFlow >= 0) {
                  const prevBalance = cumulativeCashFlow - cashFlows[i];
                  paybackYear = (i - 1) + (Math.abs(prevBalance) / cashFlows[i]);
                  break;
              }
          }
          if (cumulativeCashFlow < 0) paybackYear = 25; 

          setLongTermMetrics({
              genYear1: parseFloat((firstYearGen/10000).toFixed(2)),
              gen25Year: parseFloat((totalGen25/10000).toFixed(1)),
              rev25Year: parseFloat(totalRev25.toFixed(1)),
              paybackPeriod: parseFloat(paybackYear.toFixed(1)),
              irr: parseFloat((calculatedIRR * 100).toFixed(2)),
              cashFlows,
              yearlyDetails
          });
      }

      updateModule('retrofit-solar', {
          strategy: mode === 'simple' ? simpleParams.installType : 'advanced_mixed',
          investment: parseFloat(finalInvestment.toFixed(1)),
          yearlySaving: parseFloat(finalYearlySaving.toFixed(1)),
          kpiPrimary: { label: '装机容量', value: `${finalCapacity} kWp` },
          kpiSecondary: { label: '首年发电', value: `${(firstYearGen/10000).toFixed(1)} 万度` }
      });

  }, [mode, simpleParams, advParams, buildings, calculatedSelfConsumption, updateModule]);

  // Chart Data
  const currentCapacity = mode === 'simple' ? simpleParams.capacity : buildings.filter(b => b.active).reduce((acc, b) => acc + b.manualCapacity, 0);
  const chartData = useMemo(() => {
      return baseMonthData.map(m => ({
          ...m,
          retrofit: parseFloat((m.base * (currentCapacity / 600)).toFixed(1)) 
      }));
  }, [currentCapacity]);

  const toggleBuilding = (id: number) => {
      setBuildings(buildings.map(b => b.id === id ? { ...b, active: !b.active } : b));
  };

  const updateBuildingCapacity = (id: number, val: number) => {
      setBuildings(buildings.map(b => b.id === id ? { ...b, manualCapacity: val } : b));
  };

  const updateBuildingTransformer = (id: number, val: number) => {
      setBuildings(buildings.map(b => b.id === id ? { ...b, transformerId: val } : b));
  };

  return (
    <div className="flex h-full bg-slate-50 relative">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shrink-0">
            <div className="flex items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">分布式光伏配置</h2>
                    <p className="text-xs text-slate-500">屋顶光伏与BIPV一体化发电策略</p>
                </div>
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
            <div className="max-w-5xl mx-auto space-y-6">
                
                {/* Mode Toggle */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-2">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">参数配置</h3>
                        <p className="text-xs text-slate-500 mt-1">请选择估值模式并录入关键参数</p>
                    </div>
                    <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex">
                        <button 
                            onClick={() => setMode('simple')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mode === 'simple' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <span className="material-icons text-[16px]">speed</span> 快速估值
                        </button>
                        <button 
                            onClick={() => setMode('advanced')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mode === 'advanced' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <span className="material-icons text-[16px]">tune</span> 精确测算
                        </button>
                    </div>
                </div>

                {/* --- SIMPLE MODE UI --- */}
                {mode === 'simple' && (
                    <>
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
                            <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <span className="material-icons text-orange-500">design_services</span> 设计参数
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500">关联接入点</label>
                                    <select 
                                        value={simpleParams.connectionPoint}
                                        onChange={(e) => setSimpleParams({...simpleParams, connectionPoint: Number(e.target.value)})}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-primary"
                                    >
                                        {transformers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        {transformers.length === 0 && <option value={0}>默认接入点</option>}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500">安装面积 (㎡)</label>
                                    <input 
                                        type="number"
                                        value={simpleParams.area}
                                        onChange={(e) => setSimpleParams({...simpleParams, area: parseFloat(e.target.value)})}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-primary"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500">拟装机容量 (kWp)</label>
                                    <input 
                                        type="number"
                                        value={simpleParams.capacity}
                                        onChange={(e) => setSimpleParams({...simpleParams, capacity: parseFloat(e.target.value)})}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-primary"
                                    />
                                </div>
                            </div>
                        </section>
                    </>
                )}

                {/* --- ADVANCED MODE UI --- */}
                {mode === 'advanced' && (
                    <>
                        {/* 1. Connection & Self-Consumption Analysis */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
                            <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <span className="material-icons text-blue-500">analytics</span> 接入与消纳分析
                            </h3>
                            <div className="flex flex-col lg:flex-row gap-8 items-start">
                                {/* Left: Info Cards */}
                                <div className="flex-1 w-full space-y-4">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-bold text-slate-700">综合电价 (光伏时段加权)</span>
                                            <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">自动计算</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-bold text-primary">{advParams.electricityPrice}</span>
                                            <span className="text-sm text-slate-500">元/kWh</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">基于 8:00 - 17:00 的电网平均电价</p>
                                    </div>
                                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700 flex justify-between items-center">
                                        <span>历史年总用电量 (Bill Data)</span>
                                        <span className="font-bold">{bills.length > 0 ? bills.reduce((acc,b)=>acc+b.kwh, 0).toLocaleString() : '暂无数据'} kWh</span>
                                    </div>
                                </div>

                                {/* Right: Self Consumption Config */}
                                <div className="flex-1 w-full bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="text-sm font-bold text-slate-800 block">预估光伏消纳率</span>
                                            <span className="text-xs text-slate-400">决定了电费收益与上网收益的比例</span>
                                        </div>
                                        <div className="flex bg-white p-0.5 rounded-lg border border-slate-200">
                                            <button 
                                                onClick={() => setSelfUseMode('auto')}
                                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${selfUseMode === 'auto' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                            >
                                                自动测算
                                            </button>
                                            <button 
                                                onClick={() => setSelfUseMode('manual')}
                                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${selfUseMode === 'manual' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                            >
                                                手动设置
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                                <path className="text-slate-200" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                                                <path className="text-primary transition-all duration-1000" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${calculatedSelfConsumption}, 100`} strokeWidth="3"></path>
                                            </svg>
                                            <div className="absolute flex flex-col items-center">
                                                <span className="text-xl font-bold text-slate-800">{calculatedSelfConsumption}%</span>
                                                <span className="text-[9px] text-slate-400">自用比例</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 space-y-2">
                                            {selfUseMode === 'auto' ? (
                                                <div className="text-xs text-slate-500 space-y-1">
                                                    <p>基于<span className="font-bold text-slate-700">月度用电量</span>与<span className="font-bold text-slate-700">模拟发电量</span>匹配计算。</p>
                                                    <p className="flex items-center gap-1"><span className="material-icons text-[12px] text-blue-500">info</span> {bills.length > 0 ? '已关联 12 个月电费单数据' : '未检测到电费单，默认100%'}</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3 pt-2">
                                                    <input 
                                                        type="range" min="0" max="100" 
                                                        value={calculatedSelfConsumption} 
                                                        onChange={(e) => setCalculatedSelfConsumption(Number(e.target.value))}
                                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary" 
                                                    />
                                                    <div className="flex justify-between text-xs text-slate-400">
                                                        <span>全额上网 (0%)</span>
                                                        <span>全额自用 (100%)</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 2. Building Details */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
                            <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center justify-between border-b border-slate-100 pb-3">
                                <span className="flex items-center gap-2"><span className="material-icons text-purple-500">domain</span> 楼栋铺设详情</span>
                                <span className="text-xs font-normal text-slate-500 bg-slate-50 px-2 py-1 rounded">合计容量: {buildings.filter(b=>b.active).reduce((a,b)=>a+b.manualCapacity,0)} kWp</span>
                            </h3>
                            <div className="space-y-3">
                                {buildings.map((b) => (
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
                                                <div className="text-xs text-slate-500">可用面积: {b.area} ㎡</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 w-full md:w-auto">
                                            <div className="flex items-center gap-2 flex-1 md:flex-initial">
                                                <label className="text-xs text-slate-400 whitespace-nowrap">拟装容量:</label>
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        value={b.manualCapacity} 
                                                        onChange={(e) => updateBuildingCapacity(b.id, parseFloat(e.target.value))}
                                                        disabled={!b.active}
                                                        className="w-24 px-2 py-1.5 text-sm text-right bg-white border border-slate-200 rounded-md focus:border-primary outline-none"
                                                    />
                                                </div>
                                                <span className="text-xs font-medium text-slate-600">kWp</span>
                                            </div>

                                            <div className="flex items-center gap-2 flex-1 md:flex-initial">
                                                <label className="text-xs text-slate-400 whitespace-nowrap">接入变压器:</label>
                                                <div className="relative">
                                                    <select 
                                                        value={b.transformerId}
                                                        onChange={(e) => updateBuildingTransformer(b.id, Number(e.target.value))}
                                                        disabled={!b.active}
                                                        className="w-32 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:border-primary outline-none appearance-none cursor-pointer text-slate-700"
                                                    >
                                                        {transformers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                        <option value={0}>默认接入点</option>
                                                    </select>
                                                    <span className="material-icons absolute right-1 top-1.5 text-slate-400 pointer-events-none text-[14px]">expand_more</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 3. Detailed Parameters (Groups) */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
                            <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <span className="material-icons text-emerald-500">tune</span> 深度财务与工程参数
                            </h3>
                            <div className="space-y-6">
                                {/* Group 1: Engineering & Design */}
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">系统设计参数</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">日照时长 (h/day)</label>
                                            <input type="number" step="0.1" value={advParams.dailySunHours} onChange={(e) => setAdvParams({...advParams, dailySunHours: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">系统综合效率 (%)</label>
                                            <input type="number" value={advParams.prValue} onChange={(e) => setAdvParams({...advParams, prValue: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">非正南角度效率 (%)</label>
                                            <input type="number" value={advParams.azimuthEfficiency} onChange={(e) => setAdvParams({...advParams, azimuthEfficiency: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">年发电天数 (天)</label>
                                            <input type="number" value={advParams.generationDays} onChange={(e) => setAdvParams({...advParams, generationDays: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                                        </div>
                                    </div>
                                </div>

                                {/* Group 2: Degradation */}
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">组件衰减配置</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">首年衰减率 (%)</label>
                                            <input type="number" step="0.1" value={advParams.degradationFirstYear} onChange={(e) => setAdvParams({...advParams, degradationFirstYear: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">次年起逐年衰减 (%)</label>
                                            <input type="number" step="0.05" value={advParams.degradationLinear} onChange={(e) => setAdvParams({...advParams, degradationLinear: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                                        </div>
                                    </div>
                                </div>

                                {/* Group 3: Financials */}
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">财务模型参数</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">上网电价 (元/kWh)</label>
                                            <input type="number" value={advParams.feedInTariff} step="0.01" onChange={(e) => setAdvParams({...advParams, feedInTariff: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">综合电价 (元/kWh)</label>
                                            <input type="number" value={advParams.electricityPrice} step="0.01" onChange={(e) => setAdvParams({...advParams, electricityPrice: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">运维费 (元/W/年)</label>
                                            <input type="number" value={advParams.omCost} step="0.01" onChange={(e) => setAdvParams({...advParams, omCost: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">保险费率 (%总投资)</label>
                                            <input type="number" value={advParams.insuranceRate} step="0.1" onChange={(e) => setAdvParams({...advParams, insuranceRate: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">综合税率 (所得税等 %)</label>
                                            <input type="number" value={advParams.taxRate} step="0.1" onChange={(e) => setAdvParams({...advParams, taxRate: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary font-bold text-slate-700" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </>
                )}

                {/* Common Investment Section */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
                    <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <span className="material-icons text-red-500">paid</span> 投资概算 (Investment)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 flex justify-between">
                                EPC 总承包单价 <span className="text-[10px] text-slate-400 font-normal">参考: 2.0-3.5</span>
                            </label>
                            <div className="relative">
                                <input 
                                    type="number"
                                    step="0.1"
                                    value={simpleParams.epcPrice}
                                    onChange={(e) => setSimpleParams({...simpleParams, epcPrice: parseFloat(e.target.value)})}
                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-primary"
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">元/Wp</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">资金来源</label>
                            <div className="flex gap-2 h-[42px]">
                                <label className={`flex-1 flex items-center justify-center rounded-lg border cursor-pointer transition-all ${simpleParams.fundingSource === 'self' ? 'bg-primary/5 border-primary text-primary font-bold' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                    <input type="radio" name="funding" className="sr-only" checked={simpleParams.fundingSource === 'self'} onChange={() => setSimpleParams({...simpleParams, fundingSource: 'self'})} />
                                    <span className="text-xs">100% 自筹</span>
                                </label>
                                <label className={`flex-1 flex items-center justify-center rounded-lg border cursor-pointer transition-all ${simpleParams.fundingSource === 'loan' ? 'bg-primary/5 border-primary text-primary font-bold' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                    <input type="radio" name="funding" className="sr-only" checked={simpleParams.fundingSource === 'loan'} onChange={() => setSimpleParams({...simpleParams, fundingSource: 'loan'})} />
                                    <span className="text-xs">银行贷款</span>
                                </label>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">预估总投资额</label>
                            <div className="relative">
                                <input 
                                    type="text"
                                    disabled
                                    value={currentModule.investment}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none"
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-medium">万元</span>
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
                      <span className="text-xs font-semibold text-slate-500 uppercase">装机容量</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">{currentModule.kpiPrimary.value}</span>
                  </div>
              </div>

               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-green-100 rounded text-green-600"><span className="material-icons text-sm">energy_savings_leaf</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">首年发电量</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">{longTermMetrics.genYear1}</span>
                      <span className="text-sm text-slate-500">万度</span>
                  </div>
              </div>

               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-red-100 rounded text-red-600"><span className="material-icons text-sm">savings</span></div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">首年净收益 (税后)</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">¥ {currentModule.yearlySaving}</span>
                      <span className="text-sm text-slate-500">万元</span>
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
                          <span className="text-xs font-semibold text-slate-500 uppercase">首年月度发电</span>
                      </div>
                      <span className="material-icons text-slate-300 text-sm group-hover:text-primary transition-colors">open_in_full</span>
                  </div>
                  <div className="h-24 w-full pointer-events-none">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} barGap={2}>
                              <XAxis dataKey="name" tick={false} axisLine={false} tickLine={false} interval={1} />
                              <Bar dataKey="retrofit" fill="#fbbf24" radius={[2,2,0,0]} />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors rounded-xl"></div>
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
                          <p className="text-[10px] text-slate-300 mt-1">查看 25 年现金流、IRR、回收期</p>
                      </div>
                      <span className="material-icons text-white/50 group-hover:text-white transition-colors">chevron_right</span>
                  </div>
              </div>
          </div>
      </aside>

      {/* Expanded Chart Modal (Generation) */}
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
                                formatter={(value: number) => [`${value} 万度`, '预估发电']}
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
                  className="bg-white rounded-2xl w-full max-w-7xl max-h-[95vh] shadow-2xl overflow-hidden flex flex-col animate-[zoomIn_0.2s_ease-out]"
                  onClick={(e) => e.stopPropagation()}
              >
                  {/* Header */}
                  <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                      <div>
                          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                              <span className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center shadow-sm">
                                <span className="material-icons">monetization_on</span>
                              </span>
                              全生命周期财务收益模型 (税后)
                          </h2>
                          <p className="text-slate-500 mt-1 ml-14">
                              基于 25 年运营期的现金流折现分析 | 
                              <span className="ml-2 text-slate-400">
                                  扣除运维({advParams.omCost}元/W)、保险({advParams.insuranceRate}%)及税金({advParams.taxRate}%)
                              </span>
                          </p>
                      </div>
                      <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end mr-4">
                              <label className="text-[10px] text-slate-400 uppercase font-bold mb-1">调整综合税率</label>
                              <div className="flex items-center gap-2 bg-white rounded border border-slate-200 px-2 py-1">
                                  <input 
                                      type="number" 
                                      step="0.1" 
                                      className="w-12 text-right outline-none text-sm font-bold text-slate-700"
                                      value={advParams.taxRate}
                                      onChange={(e) => setAdvParams({...advParams, taxRate: parseFloat(e.target.value)})}
                                  />
                                  <span className="text-xs text-slate-400">%</span>
                              </div>
                          </div>
                          <button 
                              onClick={() => setIsFinancialModalOpen(false)}
                              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors text-slate-500"
                          >
                              <span className="material-icons">close</span>
                          </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                      {/* Top Metrics Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-full -mr-6 -mt-6"></div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">项目总投资 (CapEx)</p>
                              <div className="text-2xl font-bold text-slate-900">¥ {currentModule.investment} <span className="text-sm font-normal text-slate-500">万</span></div>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-20 h-20 bg-green-50 rounded-bl-full -mr-6 -mt-6"></div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">25年总净收益 (税后)</p>
                              <div className="text-2xl font-bold text-emerald-600">¥ {longTermMetrics.rev25Year} <span className="text-sm font-normal text-slate-500">万</span></div>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-50 rounded-bl-full -mr-6 -mt-6"></div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">内部收益率 (IRR)</p>
                              <div className="text-2xl font-bold text-purple-600">{longTermMetrics.irr}%</div>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-50 rounded-bl-full -mr-6 -mt-6"></div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">静态回收期</p>
                              <div className="text-2xl font-bold text-orange-500">{longTermMetrics.paybackPeriod} <span className="text-sm font-normal text-slate-500">年</span></div>
                          </div>
                      </div>

                      {/* Cash Flow Chart */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
                          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                              <span className="material-icons text-primary text-base">timeline</span> 25年累计现金流趋势
                          </h3>
                          <div className="h-80 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={longTermMetrics.cashFlows.map((v, i) => {
                                      // Calculate cumulative for chart
                                      const cumulative = longTermMetrics.cashFlows.slice(0, i + 1).reduce((a, b) => a + b, 0);
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
                                      {/* Zero Line */}
                                      <line x1="0" y1={230} x2="100%" y2={230} stroke="#ef4444" strokeDasharray="5 5" />
                                  </AreaChart>
                              </ResponsiveContainer>
                          </div>
                      </div>

                      {/* Cash Flow Table (Detailed) */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                          <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left whitespace-nowrap">
                                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                      <tr>
                                          <th className="px-6 py-4 sticky left-0 bg-slate-50">年份</th>
                                          <th className="px-6 py-4">发电量 (万kWh)</th>
                                          <th className="px-6 py-4 text-right">总营收 (万元)</th>
                                          <th className="px-6 py-4 text-right">运维与保险 (万元)</th>
                                          <th className="px-6 py-4 text-right">税金 ({advParams.taxRate}%)</th>
                                          <th className="px-6 py-4 text-right bg-slate-50/50 font-bold text-slate-700">净现金流 (万元)</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {/* Initial Investment Year 0 */}
                                      <tr className="hover:bg-slate-50 bg-slate-50/30">
                                          <td className="px-6 py-3 font-bold text-slate-700 sticky left-0 bg-slate-50/30">第 0 年 (建设期)</td>
                                          <td className="px-6 py-3 text-slate-400">-</td>
                                          <td className="px-6 py-3 text-right text-slate-400">-</td>
                                          <td className="px-6 py-3 text-right text-slate-400">-</td>
                                          <td className="px-6 py-3 text-right text-slate-400">-</td>
                                          <td className="px-6 py-3 text-right font-bold text-red-500">
                                              - {currentModule.investment.toFixed(2)}
                                          </td>
                                      </tr>
                                      {/* Operating Years */}
                                      {longTermMetrics.yearlyDetails.map((row, i) => (
                                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                                              <td className="px-6 py-3 font-medium text-slate-700 sticky left-0 bg-white">第 {row.year} 年</td>
                                              <td className="px-6 py-3 text-slate-600">{row.generation.toFixed(2)}</td>
                                              <td className="px-6 py-3 text-right text-blue-600 font-medium">{row.revenue.toFixed(2)}</td>
                                              <td className="px-6 py-3 text-right text-orange-500">-{row.opex.toFixed(2)}</td>
                                              <td className="px-6 py-3 text-right text-slate-500">-{row.tax.toFixed(2)}</td>
                                              <td className={`px-6 py-3 text-right font-bold bg-slate-50/30 ${row.netIncome >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                  {row.netIncome.toFixed(2)}
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default RetrofitSolar;