import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area, ReferenceLine, ComposedChart, Line } from 'recharts';
import { useProject } from '../context/ProjectContext';

// --- Constants ---
const STRATEGIES = {
    heatpump: {
        id: 'heatpump',
        name: '空气源热泵 (ASHP)',
        desc: '利用空气热能，COP可达 3.0-4.5',
        icon: 'heat_pump',
        color: 'text-cyan-600',
        bg: 'bg-cyan-50',
        border: 'border-cyan-200'
    },
    solar: {
        id: 'solar',
        name: '太阳能集热 + 电辅',
        desc: '晴天零能耗，阴雨天电加热辅助',
        icon: 'wb_sunny',
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200'
    },
    recovery: {
        id: 'recovery',
        name: '工业余热回收',
        desc: '回收空压机/冷水机废热，极低成本',
        icon: 'recycling',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200'
    }
};

// Physics Constants
const SPECIFIC_HEAT_WATER = 1.163; // kWh/m3·°C (approx)
const BASELINE_BOILER_EFF = 0.95; // Electric Boiler Efficiency

export default function RetrofitWater() {
    const { modules, toggleModule, updateModule, saveProject, priceConfig } = useProject();
    const currentModule = modules['retrofit-water'];
    const savedParams = currentModule.params || {};

    // --- State ---
    const [mode, setMode] = useState<'quick' | 'precise'>(savedParams.mode || 'quick');
    const [isChartExpanded, setIsChartExpanded] = useState(false);
    const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);

    // Parameters
    const [params, setParams] = useState(savedParams.params || {
        dailyVolume: 120, // tons (m3)
        tempIn: 15, // °C
        tempOut: 55, // °C
        electricityPrice: 0.85, // Yuan/kWh
        // Strategy Specifics
        cop: 3.8, // Heat Pump COP
        solarFraction: 0.6, // Solar coverage %
        recoveryRate: 0.8, // Waste heat utilization %
        // Investment Factors (Yuan/ton capacity)
        unitCostHP: 6000,
        unitCostSolar: 5000,
        unitCostRecovery: 4000
    });

    const [strategy, setStrategy] = useState<keyof typeof STRATEGIES>(savedParams.strategy || 'heatpump');

    // Investment config for EMC/EPC
    const [investmentConfig, setInvestmentConfig] = useState(savedParams.investmentConfig || {
        mode: 'self', // 'self' | 'epc' | 'emc'
        emcOwnerShareRate: 15
    });

    // Sync electricity price from priceConfig
    useEffect(() => {
        let newElectricityPrice = 0.85;

        if (priceConfig.mode === 'fixed') {
            newElectricityPrice = priceConfig.fixedPrice;
        } else if (priceConfig.mode === 'tou') {
            const totalDuration = priceConfig.touSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
            const weightedSum = priceConfig.touSegments.reduce((sum, seg) => sum + seg.price * (seg.end - seg.start), 0);
            newElectricityPrice = totalDuration > 0 ? weightedSum / totalDuration : 0.85;
        } else if (priceConfig.mode === 'spot') {
            const avgSpotPrice = priceConfig.spotPrices.reduce((sum, p) => sum + p, 0) / priceConfig.spotPrices.length;
            newElectricityPrice = avgSpotPrice || 0.85;
        }

        if (params.electricityPrice !== newElectricityPrice) {
            setParams({ ...params, electricityPrice: parseFloat(newElectricityPrice.toFixed(3)) });
        }
    }, [priceConfig.mode, priceConfig.fixedPrice, priceConfig.touSegments, priceConfig.spotPrices]);

    // --- Calculations ---

    const simulation = useMemo(() => {
        // 1. Thermal Load Calculation
        const deltaT = params.tempOut - params.tempIn;
        const dailyThermalLoad = params.dailyVolume * deltaT * SPECIFIC_HEAT_WATER; // kWh
        const annualThermalLoad = dailyThermalLoad * 365;

        // 2. Baseline Consumption (Electric Boiler)
        const annualBaselineKWh = annualThermalLoad / BASELINE_BOILER_EFF;
        const annualBaselineCost = (annualBaselineKWh * params.electricityPrice) / 10000; // 万元

        // 3. Retrofit Consumption & Investment
        let annualRetrofitKWh = 0;
        let investment = 0; // 万元

        if (strategy === 'heatpump') {
            // Heat Pump: Energy = Load / COP
            annualRetrofitKWh = annualThermalLoad / params.cop;
            investment = (params.dailyVolume * params.unitCostHP) / 10000;
        } else if (strategy === 'solar') {
            // Solar: Energy = Load * (1 - Fraction) / AuxEff
            annualRetrofitKWh = (annualThermalLoad * (1 - params.solarFraction)) / BASELINE_BOILER_EFF;
            investment = (params.dailyVolume * params.unitCostSolar) / 10000;
        } else if (strategy === 'recovery') {
            // Recovery: Energy = Load * (1 - Rate) / AuxEff
            annualRetrofitKWh = (annualThermalLoad * (1 - params.recoveryRate)) / BASELINE_BOILER_EFF;
            investment = (params.dailyVolume * params.unitCostRecovery) / 10000;
        }

        const annualRetrofitCost = (annualRetrofitKWh * params.electricityPrice) / 10000; // 万元
        const totalYearlySaving = annualBaselineCost - annualRetrofitCost;
        const savingRate = annualBaselineCost > 0 ? (totalYearlySaving / annualBaselineCost) : 0;

        const isEmc = investmentConfig.mode === 'emc';
        const ownerShareRate = isEmc ? (investmentConfig.emcOwnerShareRate / 100) : 0;

        const ownerBenefit = isEmc ? totalYearlySaving * ownerShareRate : totalYearlySaving;
        const investorRevenue = isEmc ? totalYearlySaving * (1 - ownerShareRate) : totalYearlySaving;

        const payback = investorRevenue > 0 ? investment / investorRevenue : 0;

        // 4. Monthly Simulation Data
        const monthlyData = Array.from({ length: 12 }, (_, i) => {
            // Seasonality Factors
            // Winter: Water is colder (higher load), HP COP lower, Solar lower
            // Summer: Water is warmer (lower load), HP COP higher, Solar higher

            const monthIndex = i; // 0 = Jan
            const isWinter = monthIndex < 2 || monthIndex > 10;
            const isSummer = monthIndex > 4 && monthIndex < 8;

            let loadFactor = 1.0;
            if (isWinter) loadFactor = 1.2; // Colder inlet water
            if (isSummer) loadFactor = 0.8; // Warmer inlet water

            const monthBaseKWh = (annualBaselineKWh / 12) * loadFactor;
            let monthRetrofitKWh = 0;

            if (strategy === 'heatpump') {
                // COP drops in winter
                const copFactor = isWinter ? 0.85 : (isSummer ? 1.15 : 1.0);
                monthRetrofitKWh = (monthBaseKWh * BASELINE_BOILER_EFF) / (params.cop * copFactor);
            } else if (strategy === 'solar') {
                // Solar yield drops in winter
                const solarFactor = isWinter ? 0.5 : (isSummer ? 1.4 : 1.0);
                const effectiveSolar = Math.min(0.95, params.solarFraction * solarFactor);
                monthRetrofitKWh = (monthBaseKWh * BASELINE_BOILER_EFF * (1 - effectiveSolar)) / BASELINE_BOILER_EFF;
            } else {
                // Recovery fairly constant if production is constant
                monthRetrofitKWh = (monthBaseKWh * BASELINE_BOILER_EFF * (1 - params.recoveryRate)) / BASELINE_BOILER_EFF;
            }

            return {
                name: `${i + 1}月`,
                base: parseFloat(monthBaseKWh.toFixed(0)),
                retrofit: parseFloat(monthRetrofitKWh.toFixed(0)),
                saving: parseFloat((monthBaseKWh - monthRetrofitKWh).toFixed(0))
            };
        });

        // Cash Flows (10 Years)
        const cashFlows = [-investment];
        for (let i = 0; i < 10; i++) cashFlows.push(investorRevenue);

        return {
            investment: parseFloat(investment.toFixed(3)),
            yearlySaving: parseFloat(investorRevenue.toFixed(3)),
            totalSaving: parseFloat(totalYearlySaving.toFixed(3)),
            ownerBenefit: parseFloat(ownerBenefit.toFixed(3)),
            savingRate: (savingRate * 100).toFixed(2),
            payback: parseFloat(payback.toFixed(3)),
            monthlyData,
            cashFlows
        };
    }, [params, strategy, investmentConfig]);

    // --- Effects ---
    useEffect(() => {
        const newParams = { mode, params, strategy, investmentConfig };
        const currentStoredParams = JSON.stringify(currentModule.params);
        const newParamsString = JSON.stringify(newParams);

        if (
            currentStoredParams !== newParamsString
        ) {
            updateModule('retrofit-water', {
                strategy,
                investment: simulation.investment,
                yearlySaving: simulation.yearlySaving,
                ownerBenefit: simulation.ownerBenefit,
                kpiPrimary: { label: '日供水', value: `${params.dailyVolume} 吨` },
                kpiSecondary: { label: '节能率', value: `${simulation.savingRate}%` },
                params: newParams
            });
        }
    }, [simulation, params, strategy, mode, investmentConfig, updateModule, currentModule.params]);

    if (!currentModule) return null;

    return (
        <div className="flex h-full bg-slate-50 relative">
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">热水系统改造配置</h2>
                            <p className="text-xs text-slate-500">高效热泵与余热回收节能策略</p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full ml-4">
                            <span className={`text-xs font-bold ${currentModule.isActive ? 'text-primary' : 'text-slate-400'}`}>
                                {currentModule.isActive ? '模块已启用' : '模块已停用'}
                            </span>
                            <button
                                onClick={() => toggleModule('retrofit-water')}
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
                                <h3 className="text-lg font-bold text-slate-800">系统参数配置</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    {mode === 'quick' ? '快速测算：基于日用水量与典型技术指标' : '精确估值：支持进出水温、季节因子与详细成本微调'}
                                </p>
                            </div>
                            <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex">
                                <button
                                    onClick={() => setMode('quick')}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mode === 'quick' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <span className="material-icons text-[16px]">speed</span> 快速测算
                                </button>
                                <button
                                    onClick={() => setMode('precise')}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mode === 'precise' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <span className="material-icons text-[16px]">tune</span> 精确估值
                                </button>
                            </div>
                        </div>

                        {/* Strategy Cards */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
                            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="material-icons text-cyan-500">architecture</span> 技术路线选择
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {Object.values(STRATEGIES).map((s) => (
                                    <div
                                        key={s.id}
                                        onClick={() => setStrategy(s.id as any)}
                                        className={`cursor-pointer group relative p-4 rounded-xl border-2 transition-all flex flex-col justify-between hover:shadow-md ${strategy === s.id ? `${s.border} ${s.bg} ring-1 ring-offset-1 ring-${s.color.split('-')[1]}-200` : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${strategy === s.id ? 'bg-white' : 'bg-slate-50'}`}>
                                                <span className={`material-icons ${strategy === s.id ? s.color : 'text-slate-400'}`}>{s.icon}</span>
                                            </div>
                                            {strategy === s.id && <span className={`material-icons ${s.color}`}>check_circle</span>}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold ${strategy === s.id ? s.color : 'text-slate-700'}`}>{s.name}</h4>
                                            <p className="text-xs text-slate-500 mt-1">{s.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Parameters Form */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
                            <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <span className="material-icons text-blue-500">water_drop</span>
                                {mode === 'quick' ? '基础用水需求' : '详细热力计算参数'}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Common: Daily Volume */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-500">日供水量 (吨)</label>
                                    <div className="relative">
                                        <input
                                            type="number" value={params.dailyVolume}
                                            onChange={(e) => setParams({ ...params, dailyVolume: parseFloat(e.target.value) })}
                                            className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-primary"
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">m³</span>
                                    </div>
                                </div>

                                {/* Strategy Specific Efficiency */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-500">
                                        {strategy === 'heatpump' ? '机组综合 COP' : (strategy === 'solar' ? '太阳能保证率' : '余热回收率')}
                                    </label>
                                    <div className="relative">
                                        {strategy === 'heatpump' && (
                                            <input
                                                type="number" step="0.1" value={params.cop}
                                                onChange={(e) => setParams({ ...params, cop: parseFloat(e.target.value) })}
                                                className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-cyan-600 outline-none focus:border-primary"
                                            />
                                        )}
                                        {strategy === 'solar' && (
                                            <input
                                                type="number" step="0.05" max="1" value={params.solarFraction}
                                                onChange={(e) => setParams({ ...params, solarFraction: parseFloat(e.target.value) })}
                                                className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-orange-500 outline-none focus:border-primary"
                                            />
                                        )}
                                        {strategy === 'recovery' && (
                                            <input
                                                type="number" step="0.05" max="1" value={params.recoveryRate}
                                                onChange={(e) => setParams({ ...params, recoveryRate: parseFloat(e.target.value) })}
                                                className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-emerald-600 outline-none focus:border-primary"
                                            />
                                        )}
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">{strategy === 'heatpump' ? '' : '%'}</span>
                                    </div>
                                </div>

                                {/* Precise Mode Extras */}
                                {mode === 'precise' && (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-500">进出水温差 (°C)</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number" value={params.tempIn}
                                                    onChange={(e) => setParams({ ...params, tempIn: parseFloat(e.target.value) })}
                                                    className="w-full px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center outline-none focus:bg-white focus:border-primary"
                                                    placeholder="进"
                                                />
                                                <span className="text-slate-400">→</span>
                                                <input
                                                    type="number" value={params.tempOut}
                                                    onChange={(e) => setParams({ ...params, tempOut: parseFloat(e.target.value) })}
                                                    className="w-full px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center outline-none focus:bg-white focus:border-primary"
                                                    placeholder="出"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-500">单位建设成本 (元/吨)</label>
                                            <input
                                                type="number" step="100"
                                                value={strategy === 'heatpump' ? params.unitCostHP : (strategy === 'solar' ? params.unitCostSolar : params.unitCostRecovery)}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    if (strategy === 'heatpump') setParams({ ...params, unitCostHP: val });
                                                    else if (strategy === 'solar') setParams({ ...params, unitCostSolar: val });
                                                    else setParams({ ...params, unitCostRecovery: val });
                                                }}
                                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Quick Mode Placeholder for Alignment */}
                                {mode === 'quick' && (
                                    <div className="col-span-2 bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
                                        更多温差与成本参数请切换至“精确估值”
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Investment Mode Section (New for EMC/EPC) */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
                            <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <span className="material-icons text-red-500">paid</span> 投资与商业模式
                            </h3>

                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    {[
                                        { id: 'self', label: '业主自投 (含EPC)', icon: 'account_balance' },
                                        { id: 'emc', label: 'EMC 节能分成', icon: 'handshake' },
                                    ].map((invMode) => (
                                        <button
                                            key={invMode.id}
                                            onClick={() => setInvestmentConfig({ ...investmentConfig, mode: invMode.id })}
                                            className={`flex-1 flex flex-col items-center p-4 rounded-xl border-2 transition-all gap-2 ${investmentConfig.mode === invMode.id
                                                ? 'border-red-500 bg-red-50 text-red-700'
                                                : 'border-slate-100 bg-white hover:border-slate-200 text-slate-500 hover:bg-slate-50'
                                                }`}
                                        >
                                            <span className={`material-icons text-3xl ${investmentConfig.mode === invMode.id ? 'text-red-500' : 'text-slate-400'}`}>
                                                {invMode.icon}
                                            </span>
                                            <span className="text-sm font-bold">{invMode.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* EMC Specific Parameters */}
                                {investmentConfig.mode === 'emc' && (
                                    <div className="p-5 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                                        <h4 className="text-xs font-bold text-orange-800 uppercase mb-4 flex items-center gap-1">
                                            <span className="material-icons text-[14px]">handshake</span> EMC 节能分成配置
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs text-orange-700 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                    业主分成比例 (%)
                                                </label>
                                                <input
                                                    type="number" step="1"
                                                    value={investmentConfig.emcOwnerShareRate}
                                                    onChange={(e) => setInvestmentConfig({ ...investmentConfig, emcOwnerShareRate: parseFloat(e.target.value) })}
                                                    className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm outline-none focus:border-orange-400 font-bold"
                                                />
                                                <p className="text-[10px] text-orange-400">业主获得节能收益的 {investmentConfig.emcOwnerShareRate}%</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Simulation Chart */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in relative">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                        <span className="material-icons text-purple-500">analytics</span>
                                        全年能耗模拟 (kWh)
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">考虑季节性水温变化与设备效率波动</p>
                                </div>
                                <button
                                    onClick={() => setIsChartExpanded(true)}
                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary transition-colors"
                                >
                                    <span className="material-icons">fullscreen</span>
                                </button>
                            </div>

                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={simulation.monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)', padding: '8px', fontSize: '12px' }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                        <Area type="monotone" dataKey="base" name="基准能耗 (电锅炉)" fill="#cbd5e1" stroke="none" fillOpacity={0.5} />
                                        <Bar dataKey="retrofit" name="改造后能耗" fill={STRATEGIES[strategy].color.replace('text-', '#').replace('600', '500')} barSize={12} radius={[2, 2, 0, 0]} />
                                        <Line type="monotone" dataKey="saving" name="节省电量" stroke="#10b981" strokeWidth={2} dot={false} />
                                    </ComposedChart>
                                </ResponsiveContainer>
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
                    {/* KPIs */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-cyan-100 rounded text-cyan-600"><span className="material-icons text-sm">water_drop</span></div>
                            <span className="text-xs font-semibold text-slate-500 uppercase">年热负荷</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-slate-900 tracking-tight">{(simulation.monthlyData.reduce((a, b) => a + b.base, 0) / 10000).toFixed(1)}</span>
                            <span className="text-sm text-slate-500">万kWh</span>
                        </div>
                        <div className="mt-2 text-xs font-medium text-slate-400">
                            日供水: <span className="text-slate-800 font-bold">{params.dailyVolume} 吨</span>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-red-100 rounded text-red-600"><span className="material-icons text-sm">savings</span></div>
                                <span className="text-xs font-semibold text-slate-500 uppercase">当前视角年收益</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-xl font-bold text-slate-800">¥ {simulation.yearlySaving.toFixed(1)} <span className="text-xs font-normal text-slate-400">万</span></span>
                                {investmentConfig.mode === 'emc' && (
                                    <span className="text-[10px] text-blue-500 font-medium">业主分账: {simulation.ownerBenefit.toFixed(1)} 万 (加入汇总)</span>
                                )}
                            </div>
                        </div>
                        <div className="mt-2 text-xs font-medium text-green-600 flex items-center">
                            <span className="material-icons text-sm mr-0.5">trending_down</span> {simulation.savingRate}% 成本下降
                        </div>
                    </div>

                    <div className="bg-primary p-4 rounded-xl shadow-lg shadow-primary/20 text-white relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-white/20 transition-all"></div>
                        <div className="flex items-center gap-2 mb-2 relative z-10">
                            <div className="p-1.5 bg-white/20 rounded text-white"><span className="material-icons text-sm">account_balance_wallet</span></div>
                            <span className="text-xs font-semibold text-blue-100 uppercase">总投资额</span>
                        </div>
                        <div className="flex items-baseline gap-2 relative z-10">
                            <span className="text-3xl font-bold tracking-tight">¥ {simulation.investment.toFixed(1)}</span>
                            <span className="text-sm text-blue-100">万元</span>
                        </div>
                        <div className="mt-3 text-xs text-blue-100 opacity-80 font-medium">
                            静态回收期: <span className="text-white font-bold">{simulation.payback} 年</span>
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
                                <p className="text-[10px] text-slate-300 mt-1">查看 10 年现金流预测</p>
                            </div>
                            <span className="material-icons text-white/50 group-hover:text-white transition-colors">chevron_right</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Expanded Chart Modal */}
            {isChartExpanded && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6" onClick={() => setIsChartExpanded(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-5xl h-[600px] shadow-2xl p-8 flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">月度能耗详细模拟</h2>
                            <button onClick={() => setIsChartExpanded(false)}><span className="material-icons text-2xl text-slate-400 hover:text-slate-800">close</span></button>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={simulation.monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis label={{ value: '能耗 (kWh)', angle: -90, position: 'insideLeft' }} />
                                <Tooltip />
                                <Legend />
                                <Area type="monotone" dataKey="base" name="基准能耗" fill="#cbd5e1" stroke="#94a3b8" />
                                <Bar dataKey="retrofit" name="改造后能耗" fill="#0ea5e9" barSize={30} />
                                <Line type="monotone" dataKey="saving" name="节省电量" stroke="#10b981" strokeWidth={3} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Financial Modal */}
            {isFinancialModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6" onClick={() => setIsFinancialModalOpen(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-2xl font-bold text-slate-800">热水改造收益模型 (10年)</h2>
                            <button onClick={() => setIsFinancialModalOpen(false)}><span className="material-icons">close</span></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={simulation.cashFlows.map((v, i) => {
                                        const cumulative = simulation.cashFlows.slice(0, i + 1).reduce((a, b) => a + b, 0);
                                        return { year: i, value: parseFloat(cumulative.toFixed(1)) };
                                    })} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="year" label={{ value: '年份', position: 'bottom', offset: 0 }} />
                                        <YAxis label={{ value: '累计收益 (万元)', angle: -90, position: 'insideLeft' }} />
                                        <Tooltip />
                                        <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" label="回本线" />
                                        <Area type="monotone" dataKey="value" stroke="#10b981" fill="#dcfce7" />
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