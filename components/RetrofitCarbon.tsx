import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { useProject, ModuleData } from '../context/ProjectContext';

// --- Constants ---
const EMISSION_FACTORS = {
    national: { label: '全国电网平均 (2023)', value: 0.5703 },
    east: { label: '华东区域电网', value: 0.7035 },
    south: { label: '南方区域电网', value: 0.5271 },
    eu: { label: '欧盟基准 (CBAM参考)', value: 0.3 } // For export oriented simulation
};

const ASSET_DEFAULTS = {
    ccerPrice: 85, // 元/吨
    gecPrice: 30,  // 元/张 (1000kWh)
};

// --- Sub-Components ---

const StatCard = ({ title, value, unit, icon, color, subValue }: any) => (
    <div className={`bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all`}>
        <div className={`absolute right-0 top-0 w-24 h-24 rounded-full -mr-8 -mt-8 blur-xl opacity-20 group-hover:opacity-30 transition-opacity ${color}`}></div>
        <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color.replace('bg-', 'bg-opacity-20 text-')}`}>
                <span className="material-icons text-lg">{icon}</span>
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
        </div>
        <div className="relative z-10">
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-800 tracking-tight">{value}</span>
                <span className="text-xs text-slate-500 font-medium">{unit}</span>
            </div>
            {subValue && <div className="mt-1 text-xs text-slate-400">{subValue}</div>}
        </div>
    </div>
);

export default function RetrofitCarbon() {
    const { modules, toggleModule, updateModule, saveProject, priceConfig } = useProject();
    const currentModule = modules['retrofit-carbon'];

    // --- Unified State ---
    // Combine all params into one structure. Migrating from old Quick/Precise logic if exists.
    const savedParams = currentModule.params || {};

    const [activeTab, setActiveTab] = useState<'impact' | 'accounting' | 'trading'>('impact');

    const [carbonState, setCarbonState] = useState({
        // Accounting (Scope 2 & Factor)
        emissionRegion: savedParams.carbonState?.emissionRegion || 'national',
        emissionFactor: savedParams.carbonState?.emissionFactor || 0.5703,

        // Scope 1 (Direct)
        baselineGas: savedParams.carbonState?.baselineGas || 20000, // m3
        scope1ReductionRate: savedParams.carbonState?.scope1ReductionRate || 15, // %

        // Scope 3 (Other)
        scope3Offset: savedParams.carbonState?.scope3Offset || 50, // tCO2

        // Assets
        ccerPrice: savedParams.carbonState?.ccerPrice || ASSET_DEFAULTS.ccerPrice,
        gecPrice: savedParams.carbonState?.gecPrice || ASSET_DEFAULTS.gecPrice,
    });

    // --- External Context Data (Automatic Aggregation) ---
    const aggregatedData = useMemo(() => {
        // Calculate avg electricity price based on priceConfig mode
        let avgPrice = 0.85;
        if (priceConfig.mode === 'fixed') {
            avgPrice = priceConfig.fixedPrice;
        } else if (priceConfig.mode === 'tou') {
            const totalDuration = priceConfig.touSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
            const weightedSum = priceConfig.touSegments.reduce((sum, seg) => sum + seg.price * (seg.end - seg.start), 0);
            avgPrice = totalDuration > 0 ? weightedSum / totalDuration : 0.85;
        } else if (priceConfig.mode === 'spot') {
            avgPrice = priceConfig.spotPrices.length > 0 ? priceConfig.spotPrices.reduce((sum, p) => sum + p, 0) / priceConfig.spotPrices.length : 0.85;
        }

        // Aggregate by source type
        let savingKWh_HVAC = 0;
        let savingKWh_Lighting = 0;
        let savingKWh_Other = 0;
        let solarKWh = 0;

        (Object.values(modules) as ModuleData[]).forEach(m => {
            if (!m.isActive || m.id === 'retrofit-carbon') return;

            if (m.id === 'retrofit-solar') {
                const capMatch = m.kpiPrimary.value.match(/(\d+(\.\d+)?)/);
                const capacity = capMatch ? parseFloat(capMatch[0]) : 0;
                solarKWh = capacity * 1100; // rough estimation kWh
            } else if (m.id === 'retrofit-hvac') {
                savingKWh_HVAC += (m.yearlySaving * 10000) / avgPrice;
            } else if (m.id === 'retrofit-lighting') {
                savingKWh_Lighting += (m.yearlySaving * 10000) / avgPrice;
            } else {
                savingKWh_Other += (m.yearlySaving * 10000) / avgPrice;
            }
        });

        const totalSavingKWh = savingKWh_HVAC + savingKWh_Lighting + savingKWh_Other;

        return {
            savingKWh_HVAC,
            savingKWh_Lighting,
            savingKWh_Other,
            savingKWh: totalSavingKWh, // Total Energy Efficiency
            solarKWh,  // Total Green Energy Replacement
            totalElecOptimized: totalSavingKWh + solarKWh,
            avgPrice
        };
    }, [modules, priceConfig]);

    // --- Calculations ---

    // 1. Carbon Physics Calculation
    const carbonPhysics = useMemo(() => {
        const factor = carbonState.emissionFactor;

        // A. Reduction from Energy Saving (Scope 2)
        const reductionFromSaving = (aggregatedData.savingKWh * factor) / 1000; // tCO2

        // B. Reduction from Solar Replacement (Scope 2)
        const reductionFromSolar = (aggregatedData.solarKWh * factor) / 1000; // tCO2

        // C. Scope 1 (Direct)
        // Gas factor approx 2.16 kgCO2/m3
        const baselineScope1 = (carbonState.baselineGas * 2.16) / 1000;
        const reductionScope1 = baselineScope1 * (carbonState.scope1ReductionRate / 100);

        // D. Scope 3 (Manual Offset)
        const reductionScope3 = carbonState.scope3Offset;

        const totalReduction = reductionFromSaving + reductionFromSolar + reductionScope1 + reductionScope3;

        return {
            reductionFromSaving,
            reductionFromSolar,
            reductionScope1,
            reductionScope3,
            totalReduction,
            baselineScope1
        };
    }, [carbonState, aggregatedData]);

    // 2. Financial Asset Valuation
    const assetValue = useMemo(() => {
        // A. CCER Revenue (Based on Total Reduction)
        // Assume 80% eligibility factor for conservative estimate
        const eligibleCCER = carbonPhysics.totalReduction * 0.8;
        const ccerRevenue = (eligibleCCER * carbonState.ccerPrice) / 10000; // 万元

        // B. Green Certs (GEC) Revenue (Based on Solar Generation)
        // 1 GEC = 1 MWh Renewable Energy
        const gecCount = Math.floor(aggregatedData.solarKWh / 1000);
        const gecRevenue = (gecCount * carbonState.gecPrice) / 10000; // 万元

        const totalMonetizable = ccerRevenue + gecRevenue;

        return {
            eligibleCCER,
            ccerRevenue,
            gecCount,
            gecRevenue,
            totalMonetizable
        };
    }, [carbonPhysics, aggregatedData, carbonState.ccerPrice, carbonState.gecPrice]);

    // 3. Roadmap Chart Data
    const roadmapData = useMemo(() => {
        const years = 10;
        const data = [];
        const baseEmission = (carbonPhysics.totalReduction * 4.5); // Mock baseline

        for (let i = 0; i <= years; i++) {
            const year = 2024 + i;
            // Baseline grows slightly (Business as Usual)
            const bau = baseEmission * Math.pow(1.015, i);

            // Grid clean factor improvement
            const gridCleanFactor = Math.pow(0.98, i);

            const solarWedge = carbonPhysics.reductionFromSolar * gridCleanFactor;
            const efficiencyWedge = carbonPhysics.reductionFromSaving * gridCleanFactor;
            const otherWedge = (carbonPhysics.reductionScope1 + carbonPhysics.reductionScope3);

            const netEmission = Math.max(0, bau - solarWedge - efficiencyWedge - otherWedge);

            data.push({
                year: year,
                bau: Math.round(bau),
                net: Math.round(netEmission),
                solar: Math.round(solarWedge),
                efficiency: Math.round(efficiencyWedge),
                other: Math.round(otherWedge)
            });
        }
        return data;
    }, [carbonPhysics]);

    // --- Effects ---
    useEffect(() => {
        // Sync to module context
        // Avoid loop by checking stringified values if complex
        if (
            currentModule.yearlySaving !== assetValue.totalMonetizable ||
            currentModule.kpiPrimary.value !== `${carbonPhysics.totalReduction.toFixed(0)} t`
        ) {
            updateModule('retrofit-carbon', {
                strategy: 'integrated_mgmt',
                investment: 0, // Asset management is OpEx usually
                yearlySaving: assetValue.totalMonetizable,
                kpiPrimary: { label: '年减排量', value: `${carbonPhysics.totalReduction.toFixed(0)} t` },
                kpiSecondary: { label: '资产价值', value: `¥${assetValue.totalMonetizable.toFixed(1)}万` },
                params: { carbonState }
            });
        }
    }, [carbonState, carbonPhysics, assetValue, updateModule, currentModule]);


    if (!currentModule) return null;

    return (
        <div className="flex h-full bg-slate-50 relative">
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">碳资产管理驾驶舱</h2>
                            <p className="text-xs text-slate-500">全生命周期碳足迹核算与环境资产交易</p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full ml-4">
                            <span className={`text-xs font-bold ${currentModule.isActive ? 'text-primary' : 'text-slate-400'}`}>
                                {currentModule.isActive ? '模块已启用' : '模块已停用'}
                            </span>
                            <button
                                onClick={() => toggleModule('retrofit-carbon')}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${currentModule.isActive ? 'bg-primary' : 'bg-slate-300'}`}
                            >
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${currentModule.isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                    <button className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
                        <span className="material-icons text-base">file_download</span> 导出核查报告
                    </button>
                </header>

                <div className={`flex-1 overflow-y-auto p-8 pb-32 transition-opacity duration-300 ${currentModule.isActive ? 'opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>
                    <div className="max-w-6xl mx-auto space-y-6">

                        {/* Tab Navigation */}
                        <div className="flex justify-center mb-4">
                            <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex space-x-1">
                                {[
                                    { id: 'impact', label: '概览与影响力', icon: 'public' },
                                    { id: 'accounting', label: '碳盘查核算', icon: 'fact_check' },
                                    { id: 'trading', label: '资产交易模拟', icon: 'currency_exchange' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === tab.id
                                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                            }`}
                                    >
                                        <span className="material-icons text-[18px]">{tab.icon}</span>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* --- TAB 1: IMPACT OVERVIEW --- */}
                        {activeTab === 'impact' && (
                            <div className="space-y-6 animate-fade-in">
                                {/* KPI Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <StatCard
                                        title="年度总减排量"
                                        value={carbonPhysics.totalReduction.toFixed(1)}
                                        unit="tCO₂e"
                                        icon="cloud_off"
                                        color="bg-emerald-500 text-emerald-600"
                                        subValue="相当于 250 个家庭年排放"
                                    />
                                    <StatCard
                                        title="等效植树造林"
                                        value={(carbonPhysics.totalReduction * 55).toFixed(0)}
                                        unit="棵"
                                        icon="park"
                                        color="bg-green-500 text-green-600"
                                        subValue="约合 5 公顷森林"
                                    />
                                    <StatCard
                                        title="减少燃油车出行"
                                        value={(carbonPhysics.totalReduction / 4.6).toFixed(0)}
                                        unit="辆/年"
                                        icon="directions_car"
                                        color="bg-blue-500 text-blue-600"
                                        subValue="假设年行驶 2万公里"
                                    />
                                    <StatCard
                                        title="潜在资产价值"
                                        value={`¥${assetValue.totalMonetizable.toFixed(1)}`}
                                        unit="万"
                                        icon="monetization_on"
                                        color="bg-yellow-500 text-yellow-600"
                                        subValue="CCER + 绿证收益"
                                    />
                                </div>

                                {/* Roadmap Chart */}
                                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                            <span className="material-icons text-blue-500">timeline</span>
                                            十年碳中和路径规划 (Decarbonization Roadmap)
                                        </h3>
                                        <div className="flex gap-4 text-[10px]">
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300"></div>BAU基准</div>
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div>光伏替代</div>
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>能效提升</div>
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-600"></div>净排放</div>
                                        </div>
                                    </div>
                                    <div className="h-80 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={roadmapData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: 'tCO₂e', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } }} />
                                                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />

                                                <Area type="monotone" dataKey="bau" stroke="#94a3b8" fill="transparent" strokeDasharray="5 5" name="BAU基准" />
                                                <Area type="monotone" dataKey="net" stroke="#4f46e5" fill="url(#colorNet)" strokeWidth={2} name="净排放预测" />
                                                {/* Hidden areas for tooltip data */}
                                                <Area type="monotone" dataKey="solar" stroke="none" fill="none" name="光伏贡献" />
                                                <Area type="monotone" dataKey="efficiency" stroke="none" fill="none" name="节能贡献" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* --- TAB 2: ACCOUNTING (SCOPES) --- */}
                        {activeTab === 'accounting' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                                    {/* Left: Input Form */}
                                    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:col-span-2">
                                        <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                                            <span className="material-icons text-purple-500">list_alt</span>
                                            温室气体排放核算 (GHG Protocol)
                                        </h3>

                                        <div className="space-y-6">
                                            {/* Factor Selection */}
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                <label className="text-xs font-bold text-slate-500 mb-3 block uppercase">核算基准：电网排放因子</label>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {Object.entries(EMISSION_FACTORS).map(([k, v]) => (
                                                        <div
                                                            key={k}
                                                            onClick={() => setCarbonState({ ...carbonState, emissionFactor: v.value, emissionRegion: k })}
                                                            className={`cursor-pointer p-3 rounded-lg border text-left transition-all ${carbonState.emissionRegion === k ? 'bg-white border-emerald-500 ring-1 ring-emerald-200 shadow-sm' : 'bg-white/50 border-slate-200 hover:border-slate-300'}`}
                                                        >
                                                            <div className={`text-xs font-bold ${carbonState.emissionRegion === k ? 'text-emerald-700' : 'text-slate-700'}`}>{v.label}</div>
                                                            <div className="text-[10px] text-slate-400 mt-1">{v.value} tCO₂/MWh</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Scope 1 */}
                                            <div className="flex gap-4 items-start">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0">S1</div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-slate-800">Scope 1: 直接排放</h4>
                                                    <p className="text-xs text-slate-500 mb-2">固定燃烧（天然气、锅炉）与移动燃烧（自有车辆）</p>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-[10px] text-slate-400 block mb-1">基准天然气用量 (m³)</label>
                                                            <input type="number" value={carbonState.baselineGas} onChange={(e) => setCarbonState({ ...carbonState, baselineGas: parseFloat(e.target.value) })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-slate-400 block mb-1">电气化替代率 (%)</label>
                                                            <input type="number" value={carbonState.scope1ReductionRate} onChange={(e) => setCarbonState({ ...carbonState, scope1ReductionRate: parseFloat(e.target.value) })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-emerald-500 text-green-600 font-bold" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="w-full h-px bg-slate-100"></div>

                                            {/* Scope 2 */}
                                            <div className="flex gap-4 items-start">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0">S2</div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-slate-800">Scope 2: 能源间接排放</h4>
                                                    <p className="text-xs text-slate-500 mb-3">外购电力产生的隐含碳排放 (自动关联各系统改造模块数据)</p>
                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-1 mb-1">
                                                                <span className="material-icons text-[14px] text-blue-500">ac_unit</span>
                                                                <span className="text-[10px] text-slate-500 font-bold">暖通减排</span>
                                                            </div>
                                                            <div className="text-sm font-bold text-slate-800">{((aggregatedData.savingKWh_HVAC * carbonState.emissionFactor) / 1000).toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">t</span></div>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1 mb-1">
                                                                <span className="material-icons text-[14px] text-amber-500">lightbulb</span>
                                                                <span className="text-[10px] text-slate-500 font-bold">照明减排</span>
                                                            </div>
                                                            <div className="text-sm font-bold text-slate-800">{((aggregatedData.savingKWh_Lighting * carbonState.emissionFactor) / 1000).toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">t</span></div>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1 mb-1">
                                                                <span className="material-icons text-[14px] text-emerald-500">memory</span>
                                                                <span className="text-[10px] text-slate-500 font-bold">其他系统减排</span>
                                                            </div>
                                                            <div className="text-sm font-bold text-slate-800">{((aggregatedData.savingKWh_Other * carbonState.emissionFactor) / 1000).toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">t</span></div>
                                                        </div>
                                                        <div className="pl-4 border-l border-slate-200">
                                                            <div className="flex items-center gap-1 mb-1">
                                                                <span className="material-icons text-[14px] text-yellow-500">solar_power</span>
                                                                <span className="text-[10px] text-slate-500 font-bold">光伏绿电</span>
                                                            </div>
                                                            <div className="text-sm font-bold text-emerald-600">{carbonPhysics.reductionFromSolar.toFixed(1)} <span className="text-[10px] text-emerald-400 font-normal">t</span></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="w-full h-px bg-slate-100"></div>

                                            {/* Scope 3 */}
                                            <div className="flex gap-4 items-start">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0">S3</div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-slate-800">Scope 3: 价值链排放 (可选)</h4>
                                                    <p className="text-xs text-slate-500 mb-2">上下游运输、员工通勤、废弃物处理等</p>
                                                    <div className="flex items-center gap-2">
                                                        <input type="number" value={carbonState.scope3Offset} onChange={(e) => setCarbonState({ ...carbonState, scope3Offset: parseFloat(e.target.value) })} className="flex-1 bg-white border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                                                        <span className="text-xs text-slate-400">手动填报减排量 (t)</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Right: Pie Chart Analysis */}
                                    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
                                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <span className="material-icons text-blue-500">donut_large</span>
                                            减排贡献分布
                                        </h3>
                                        <div className="flex-1 min-h-[200px] relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={[
                                                            { name: '节能改造 (S2)', value: carbonPhysics.reductionFromSaving },
                                                            { name: '光伏替代 (S2)', value: carbonPhysics.reductionFromSolar },
                                                            { name: '直接排放 (S1)', value: carbonPhysics.reductionScope1 },
                                                            { name: '价值链 (S3)', value: carbonPhysics.reductionScope3 }
                                                        ]}
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        <Cell fill="#10b981" />
                                                        <Cell fill="#fbbf24" />
                                                        <Cell fill="#6366f1" />
                                                        <Cell fill="#94a3b8" />
                                                    </Pie>
                                                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-xs text-slate-400">总减排</span>
                                                <span className="text-xl font-bold text-slate-800">{carbonPhysics.totalReduction.toFixed(0)}</span>
                                                <span className="text-[10px] text-slate-400">tCO₂e</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2 mt-4">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>节能改造</span>
                                                <span className="font-bold">{carbonPhysics.reductionFromSaving.toFixed(0)} t</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"></div>光伏替代</span>
                                                <span className="font-bold">{carbonPhysics.reductionFromSolar.toFixed(0)} t</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500"></div>Scope 1</span>
                                                <span className="font-bold">{carbonPhysics.reductionScope1.toFixed(0)} t</span>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        )}

                        {/* --- TAB 3: ASSET TRADING --- */}
                        {activeTab === 'trading' && (
                            <div className="space-y-6 animate-fade-in">
                                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                            <span className="material-icons text-yellow-600">monetization_on</span>
                                            碳资产价值模拟 (Value Simulation)
                                        </h3>
                                        <div className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                                            基于当前市场行情与项目减排量测算
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {/* Price Config */}
                                        <div className="space-y-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <div>
                                                <div className="flex justify-between text-xs text-slate-500 mb-2">
                                                    <span>CCER 预估成交价</span>
                                                    <span className="font-bold text-slate-800">¥ {carbonState.ccerPrice}/吨</span>
                                                </div>
                                                <input type="range" min="30" max="150" value={carbonState.ccerPrice} onChange={(e) => setCarbonState({ ...carbonState, ccerPrice: parseFloat(e.target.value) })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                                                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                                    <span>¥30 (保守)</span>
                                                    <span>¥150 (乐观)</span>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs text-slate-500 mb-2">
                                                    <span>绿证 (GEC) 价格</span>
                                                    <span className="font-bold text-slate-800">¥ {carbonState.gecPrice}/张</span>
                                                </div>
                                                <input type="range" min="10" max="100" value={carbonState.gecPrice} onChange={(e) => setCarbonState({ ...carbonState, gecPrice: parseFloat(e.target.value) })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
                                                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                                    <span>¥10 (平价)</span>
                                                    <span>¥100 (溢价)</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Asset Cards */}
                                        <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
                                                <div className="absolute right-0 top-0 w-24 h-24 bg-white/40 rounded-full -mr-6 -mt-6 transition-transform group-hover:scale-125"></div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="material-icons text-emerald-600 text-xl">forest</span>
                                                        <span className="text-sm font-bold text-emerald-800">CCER 开发价值</span>
                                                    </div>
                                                    <div className="text-xs text-emerald-600 opacity-80">可核证量: {assetValue.eligibleCCER.toFixed(0)} tCO₂e</div>
                                                    <div className="text-[10px] text-emerald-600 opacity-60 mt-1">按 80% 开发成功率估算</div>
                                                </div>
                                                <div className="text-3xl font-bold text-emerald-700 mt-4">¥ {assetValue.ccerRevenue.toFixed(1)} <span className="text-sm font-normal">万/年</span></div>
                                            </div>

                                            <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
                                                <div className="absolute right-0 top-0 w-24 h-24 bg-white/40 rounded-full -mr-6 -mt-6 transition-transform group-hover:scale-125"></div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="material-icons text-yellow-600 text-xl">description</span>
                                                        <span className="text-sm font-bold text-yellow-800">绿证 (GEC) 收益</span>
                                                    </div>
                                                    <div className="text-xs text-yellow-600 opacity-80">持有量: {assetValue.gecCount} 张</div>
                                                    <div className="text-[10px] text-yellow-600 opacity-60 mt-1">1 张 = 1000 kWh 绿色电力</div>
                                                </div>
                                                <div className="text-3xl font-bold text-yellow-700 mt-4">¥ {assetValue.gecRevenue.toFixed(1)} <span className="text-sm font-normal">万/年</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* 新增：碳价10年走势预测图 */}
                                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                            <span className="material-icons text-blue-500">trending_up</span>
                                            碳价10年走势预测与情景分析
                                        </h3>
                                        <div className="flex gap-3 text-[10px]">
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div>保守情景</div>
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div>基准情景</div>
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>乐观情景</div>
                                        </div>
                                    </div>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart
                                                data={Array.from({ length: 11 }, (_, i) => ({
                                                    year: `${2025 + i}`,
                                                    conservative: parseFloat((carbonState.ccerPrice * Math.pow(1.03, i)).toFixed(1)),
                                                    base: parseFloat((carbonState.ccerPrice * Math.pow(1.08, i)).toFixed(1)),
                                                    optimistic: parseFloat((carbonState.ccerPrice * Math.pow(1.15, i)).toFixed(1)),
                                                    // Revenue in 万元 (scaled for visibility)
                                                    conservativeRev: parseFloat(((carbonState.ccerPrice * Math.pow(1.03, i)) * assetValue.eligibleCCER / 10000).toFixed(2)),
                                                    baseRev: parseFloat(((carbonState.ccerPrice * Math.pow(1.08, i)) * assetValue.eligibleCCER / 10000).toFixed(2)),
                                                    optimisticRev: parseFloat(((carbonState.ccerPrice * Math.pow(1.15, i)) * assetValue.eligibleCCER / 10000).toFixed(2)),
                                                }))}
                                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                            >
                                                <defs>
                                                    <linearGradient id="colorOptimistic" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} unit="万" />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '10px', fontSize: '11px', borderColor: '#E2E8F0' }}
                                                    formatter={(value: number, name: string) => [`¥${value}万`, name]}
                                                />
                                                <Area type="monotone" dataKey="optimisticRev" name="乐观收益" stroke="#10B981" fill="url(#colorOptimistic)" strokeWidth={2} strokeDasharray="4 2" />
                                                <Area type="monotone" dataKey="baseRev" name="基准收益" stroke="#3B82F6" fill="transparent" strokeWidth={2.5} />
                                                <Area type="monotone" dataKey="conservativeRev" name="保守收益" stroke="#EF4444" fill="transparent" strokeWidth={1.5} strokeDasharray="3 3" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                                        {[
                                            { label: '第10年碳价 (保守)', color: 'text-red-600', val: (carbonState.ccerPrice * Math.pow(1.03, 10)).toFixed(0), unit: '元/吨', subVal: ((carbonState.ccerPrice * Math.pow(1.03, 10)) * assetValue.eligibleCCER / 10000).toFixed(1) },
                                            { label: '第10年碳价 (基准)', color: 'text-blue-600', val: (carbonState.ccerPrice * Math.pow(1.08, 10)).toFixed(0), unit: '元/吨', subVal: ((carbonState.ccerPrice * Math.pow(1.08, 10)) * assetValue.eligibleCCER / 10000).toFixed(1) },
                                            { label: '第10年碳价 (乐观)', color: 'text-emerald-600', val: (carbonState.ccerPrice * Math.pow(1.15, 10)).toFixed(0), unit: '元/吨', subVal: ((carbonState.ccerPrice * Math.pow(1.15, 10)) * assetValue.eligibleCCER / 10000).toFixed(1) },
                                        ].map((s, i) => (
                                            <div key={i} className="bg-slate-50 rounded-lg p-3">
                                                <div className="text-[10px] text-slate-500 mb-1">{s.label}</div>
                                                <div className={`text-lg font-bold ${s.color}`}>¥{s.val} <span className="text-xs font-normal text-slate-400">{s.unit}</span></div>
                                                <div className="text-[10px] text-slate-400 mt-1">当年收益≈ <span className="font-bold text-slate-600">{s.subVal}万</span></div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}
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
                        <span className="material-icons text-primary">analytics</span> 碳资产看板
                    </h3>
                    {!currentModule.isActive && <span className="text-xs font-bold text-red-500 border border-red-200 bg-red-50 px-2 py-0.5 rounded">未计入</span>}
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
                    {/* 1. Total Reduction */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-green-100 rounded text-green-600"><span className="material-icons text-sm">cloud_off</span></div>
                            <span className="text-xs font-semibold text-slate-500 uppercase">年碳减排总量</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-slate-900 tracking-tight">{carbonPhysics.totalReduction.toFixed(0)}</span>
                            <span className="text-sm text-slate-500">tCO₂e</span>
                        </div>
                        <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-green-500 h-full rounded-full" style={{ width: '100%' }}></div>
                        </div>
                    </div>

                    {/* 2. Asset Value Summary */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-yellow-100 rounded text-yellow-600"><span className="material-icons text-sm">currency_exchange</span></div>
                            <span className="text-xs font-semibold text-slate-500 uppercase">碳资产变现潜力</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-slate-900 tracking-tight">¥ {assetValue.totalMonetizable.toFixed(1)}</span>
                            <span className="text-sm text-slate-500">万/年</span>
                        </div>
                        <div className="mt-2 text-xs text-slate-400">
                            CCER + 绿证综合收益
                        </div>
                    </div>

                    {/* 3. Small Pie Chart */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col h-64">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase">减排来源构成</span>
                        </div>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: '节能改造', value: carbonPhysics.reductionFromSaving },
                                            { name: '光伏替代', value: carbonPhysics.reductionFromSolar },
                                            { name: '其他', value: carbonPhysics.reductionScope1 + carbonPhysics.reductionScope3 }
                                        ]}
                                        innerRadius={40}
                                        outerRadius={60}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        <Cell fill="#10b981" />
                                        <Cell fill="#fbbf24" />
                                        <Cell fill="#6366f1" />
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap justify-center gap-3 text-[10px] text-slate-500">
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>节能</div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"></div>光伏</div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500"></div>其他</div>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
}