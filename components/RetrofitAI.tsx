import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ComposedChart, Line, Area, Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine, Cell } from 'recharts';
import { useProject } from '../context/ProjectContext';
import MicrogridVisual from './microgrid/MicrogridVisual';

type Tab = 'simulation' | 'financial' | 'dynamic-visual' | 'microgrid-visual';

// 电价数据类型
interface PriceData {
    hour: number;
    price: number;
}

export default function RetrofitAI() {
    const { modules, updateModule, toggleModule } = useProject();
    const currentModule = modules['retrofit-ai'];
    const savedParams = currentModule.params || {};

    // --- State ---
    const [activeTab, setActiveTab] = useState<Tab>('simulation');
    
    // Simulation Params
    const [useSpotPrice, setUseSpotPrice] = useState<boolean>(savedParams.useSpotPrice || false);
    const [isImporting, setIsImporting] = useState(false);
    const [importedPriceData, setImportedPriceData] = useState<PriceData[]>([]);
    const [importFileName, setImportFileName] = useState('');
    const [showImportError, setShowImportError] = useState(false);
    const [importErrorMessage, setImportErrorMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [aiAggressiveness, setAiAggressiveness] = useState<number>(savedParams.aiAggressiveness || 50); // 0-100%
    const [hoverHour, setHoverHour] = useState<number>(12); // Default to noon for visualization

    // Financial Params
    const [investment, setInvestment] = useState<number>(savedParams.investment || 35.0); // 万元
    const [opex, setOpex] = useState<number>(savedParams.opex || 1.5); // 万元/年
    const [analysisPeriod, setAnalysisPeriod] = useState<number>(10); // Years

    // Dynamic Visual Params
    const [selectedScenario, setSelectedScenario] = useState<'normal' | 'peak-shaving' | 'extreme-price' | 'price-arbitrage'>('normal');
    const [dynamicAiEnabled, setDynamicAiEnabled] = useState(false);
    const [dynamicAiAggressiveness, setDynamicAiAggressiveness] = useState<number>(50);
    const [dynamicCurrentHour, setDynamicCurrentHour] = useState<number>(12);

    // Scenario definitions
    const SCENARIOS = [
        { id: 'normal', name: '正常运营', description: '标准8760小时运行模式' },
        { id: 'peak-shaving', name: '高峰避峰', description: 'AI在高峰电价时段减少用能，降低峰期电费' },
        { id: 'extreme-price', name: '极端电价', description: 'AI在高电价时段主动削减用能，降低成本' },
        { id: 'price-arbitrage', name: '价格套利', description: '储能谷充峰放，利用峰谷价差获取收益' }
    ];

    // --- Simulation Engine ---
    const simulation = useMemo(() => {
        const data = [];
        let totalCostBase = 0;
        let totalCostAi = 0;
        let totalLoadBase = 0;
        let totalLoadAi = 0;

        for (let i = 0; i < 24; i++) {
            // 1. Price Curve Generator
            let price = 0;
            if (useSpotPrice && importedPriceData.length > 0) {
                // Use imported price data
                const importedData = importedPriceData.find(d => d.hour === i);
                price = importedData ? importedData.price : 0.35; // Fallback to TOU price
            } else if (useSpotPrice) {
                // Volatile Spot Price Simulation (fallback)
                price = 0.4 + Math.random() * 0.4 + (i > 16 && i < 20 ? 0.8 : 0) - (i > 2 && i < 6 ? 0.2 : 0);
            } else {
                // Standard TOU
                if (i < 8) price = 0.35;
                else if ((i >= 8 && i < 11) || (i >= 17 && i < 22)) price = 1.1;
                else if (i >= 11 && i < 13) price = 0.7;
                else if (i >= 13 && i < 15) price = 1.1; // Peak
                else price = 0.7;
            }
            price = Math.max(0.2, parseFloat(price.toFixed(2)));

            // 2. Load Simulation
            // Baseline: Commercial building curve
            let baseLoad = 200 + Math.sin((i - 8) / 16 * Math.PI) * 300; 
            if (baseLoad < 100) baseLoad = 100;
            if (i > 22 || i < 6) baseLoad *= 0.6; // Night drop

            // AI Load: Price sensitive shifting based on aggressiveness
            const avgPrice = useSpotPrice ? 0.6 : 0.7;
            const priceFactor = price / avgPrice;
            const sensitivity = 0.1 + (aiAggressiveness / 100) * 0.4; // 0.1 to 0.5 impact factor
            
            let aiLoad = baseLoad;
            
            if (priceFactor > 1.2) {
                aiLoad = baseLoad * (1 - sensitivity); // Shed/Shift
            } else if (priceFactor < 0.8) {
                aiLoad = baseLoad * (1 + sensitivity * 0.8); // Absorb/Charge (slightly less efficient to absorb)
            } else {
                aiLoad = baseLoad * (1 - (aiAggressiveness/100) * 0.05); // General efficiency gain 0-5%
            }

            // Costs
            const costBase = baseLoad * price;
            const costAi = aiLoad * price;

            totalCostBase += costBase;
            totalCostAi += costAi;
            totalLoadBase += baseLoad;
            totalLoadAi += aiLoad;

            // Determine Energy Flow States for Visualization
            let flowState = 'idle';
            let aiAction = '监控中';
            if (priceFactor > 1.3) { flowState = 'discharge'; aiAction = '强力削峰'; }
            else if (priceFactor < 0.7) { flowState = 'charge'; aiAction = '低价蓄能'; }
            else if (priceFactor > 1.0) { flowState = 'optimize'; aiAction = '柔性调节'; }

            data.push({
                hour: i,
                hourLabel: `${i}:00`,
                price,
                baseLoad: Math.round(baseLoad),
                aiLoad: Math.round(aiLoad),
                costBase,
                costAi,
                flowState,
                aiAction
            });
        }

        // Annual Projections (300 effective days)
        const annualBillBase = (totalCostBase * 300) / 10000; // 万元
        const annualBillAi = (totalCostAi * 300) / 10000;
        const annualSaving = annualBillBase - annualBillAi;
        const netBenefit = annualSaving - opex;
        
        const roi = investment > 0 ? (netBenefit / investment) * 100 : 0;
        const payback = netBenefit > 0 ? investment / netBenefit : 0;

        // Long term Cash Flow
        const cashFlows = [];
        let cumulative = -investment;
        for (let year = 0; year <= analysisPeriod; year++) {
            if (year === 0) {
                cashFlows.push({ year, flow: -investment, cumulative });
            } else {
                cumulative += netBenefit;
                cashFlows.push({ year, flow: netBenefit, cumulative });
            }
        }

        // Breakdown Analysis (Mock Calculation of AI contribution)
        const sectorImpacts = [
            { name: '储能套利', base: annualSaving * 0.2, ai: annualSaving * 0.45, increase: '+125%' }, // AI dramatically improves arbitrage
            { name: '暖通优化', base: annualSaving * 0.3, ai: annualSaving * 0.40, increase: '+33%' },
            { name: '照明控制', base: annualSaving * 0.1, ai: annualSaving * 0.12, increase: '+20%' },
            { name: '需量管理', base: 0, ai: annualSaving * 0.15, increase: '新增' }, // Pure AI benefit
        ];

        return {
            data,
            dailyCostBase: totalCostBase,
            dailyCostAi: totalCostAi,
            annualBillBase,
            annualBillAi,
            annualSaving,
            netBenefit,
            roi,
            payback,
            cashFlows,
            sectorImpacts
        };
    }, [useSpotPrice, importedPriceData, investment, opex, aiAggressiveness, analysisPeriod]);

    // --- Dynamic Visual Simulation ---
    const dynamicSimulation = useMemo(() => {
        const states = [];
        const basePrice = 0.8;
        const pvCapacity = 450; // kW
        const storageCapacity = 2000; // kWh
        const batteryPower = 500; // kW
        const efficiency = 0.9;

        // Get price modifier based on scenario and AI level
        const getPriceModifier = (hour: number, scenario: string, aiLevel: number) => {
            let modifier = 1.0;

            if (scenario === 'extreme-price') {
                const isPeak = hour >= 17 && hour <= 21;
                if (isPeak) modifier = 0.2; // 削峰70%
                if (aiLevel > 70) modifier *= 0.8; // AI进一步削减
            } else if (scenario === 'peak-shaving') {
                const isPeak = hour >= 17 && hour <= 21;
                if (isPeak && aiLevel > 60) modifier = 0.5; // 削峰50%
                else if (aiLevel > 70) modifier *= 0.9; // AI更积极削峰
            }

            return Math.round(modifier * 100) / 100;
        };

        for (let i = 0; i < 24; i++) {
            const priceModifier = getPriceModifier(i, selectedScenario, dynamicAiEnabled ? dynamicAiAggressiveness : 50);
            const hourPrice = basePrice * priceModifier;

            // Generate system state
            let gridPower = 500;
            let pvPower = 0;
            let load = 100;
            let batteryState: 'idle' | 'discharging' | 'charging' = 'idle';

            // PV generation based on hour
            let sunHours = 0;
            if (i >= 8 && i <= 15) sunHours = 4;
            else if (i >= 16 && i <= 18) sunHours = 2;
            else if (i >= 19 || i <= 6) sunHours = 0;
            else sunHours = 1;

            const pvGen = pvCapacity * sunHours / 1000; // kW
            pvPower = pvGen > 0 ? pvGen : 0;

            // Storage charge/discharge decision
            if (i >= 8 && i <= 16) {
                batteryState = dynamicAiEnabled || selectedScenario === 'price-arbitrage' ? 'charging' : 'idle';
            } else if (i >= 18 && i <= 22) {
                if (selectedScenario === 'price-arbitrage' || dynamicAiEnabled) {
                    batteryState = 'discharging';
                }
            }

            // Load calculation
            const baseLoad = 100;
            if (batteryState === 'charging') {
                load = baseLoad + batteryPower * efficiency;
            } else if (batteryState === 'discharging') {
                load = baseLoad - batteryPower * efficiency;
                if (load < 50) load = 50; // Minimum load
            } else {
                load = baseLoad;
            }

            // Grid state
            let gridState: 'idle' | 'pv-charging' | 'discharging' | 'charging' = 'idle';
            if (pvPower > 0 && pvPower >= load) {
                gridState = 'pv-charging';
            } else if (batteryState === 'discharging') {
                gridState = 'discharging';
            } else if (batteryState === 'charging') {
                gridState = 'charging';
            }

            gridPower = load - (pvPower || 0);
            if (gridPower < 0) gridPower = 0;

            states.push({
                hour: i,
                period: i >= 6 && i < 12 ? 'morning' : i >= 12 && i < 18 ? 'afternoon' : i >= 18 && i < 22 ? 'evening' : 'night',
                price: hourPrice,
                gridState,
                battery: batteryState,
                load,
                gridPower,
                pvPower,
                batteryPower: batteryState === 'charging' || batteryState === 'discharging' ? batteryPower : 0
            });
        }

        // Calculate metrics
        let totalCost = 0;
        let totalRevenue = 0;
        let peakShaving = 0;
        let batteryArbitrage = 0;

        states.forEach(state => {
            const hourCost = state.price * state.load / 1000;
            totalCost += hourCost;

            // PV self-use revenue
            if (state.pvPower > 0) {
                const selfUseRevenue = Math.min(state.pvPower, state.load) * (state.price * 1.2);
                const pvRevenue = (state.price * 0.4) * Math.max(0, state.pvPower - state.load);
                totalRevenue += selfUseRevenue + pvRevenue;
            }

            // Storage arbitrage revenue
            if (state.battery === 'discharging') {
                const chargeCost = 0.52 * state.batteryPower * 0.9; // Valley price charging
                const dischargeRevenue = 1.62 * state.batteryPower * 0.9; // Peak price discharging
                batteryArbitrage = dischargeRevenue - chargeCost;
                totalRevenue += batteryArbitrage;
            }

            // Peak shaving savings
            if (state.gridState === 'pv-charging') {
                peakShaving += (state.price - 0.8) * state.pvPower;
            }
        });

        const roi = totalCost > 0 ? ((totalRevenue / 10 - totalCost) / totalCost * 100) : 0;
        const peakSavingRate = totalCost > 0 ? (peakShaving / totalCost * 100) : 0;

        return {
            states,
            metrics: {
                totalCost: totalCost.toFixed(2),
                totalRevenue: totalRevenue.toFixed(2),
                roi: roi.toFixed(1),
                peakSavingRate: peakSavingRate.toFixed(1),
                batteryArbitrage: batteryArbitrage.toFixed(2),
            }
        };
    }, [selectedScenario, dynamicAiEnabled, dynamicAiAggressiveness]);

    // --- Effects ---
    useEffect(() => {
        updateModule('retrofit-ai', {
            yearlySaving: parseFloat(simulation.netBenefit.toFixed(2)),
            investment: investment,
            kpiPrimary: { label: '综合节能率', value: `${((simulation.annualSaving / simulation.annualBillBase) * 100).toFixed(1)}%` },
            kpiSecondary: { label: 'ROI', value: `${simulation.roi.toFixed(1)}%` },
            params: { investment, opex, useSpotPrice, aiAggressiveness }
        });
    }, [simulation, investment, opex, useSpotPrice, aiAggressiveness, updateModule]);

    const handleImport = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setShowImportError(false);
        setImportFileName(file.name);

        try {
            const text = await file.text();
            let priceData: PriceData[] = [];

            if (file.name.endsWith('.csv')) {
                // Parse CSV
                const lines = text.split('\n').filter(line => line.trim());
                // Skip header row if exists
                const startIndex = lines[0].toLowerCase().includes('hour') ? 1 : 0;

                for (let i = startIndex; i < lines.length; i++) {
                    const parts = lines[i].split(',');
                    if (parts.length >= 2) {
                        const hour = parseInt(parts[0].trim());
                        const price = parseFloat(parts[1].trim());
                        if (!isNaN(hour) && !isNaN(price) && hour >= 0 && hour < 24) {
                            priceData.push({ hour, price });
                        }
                    }
                }
            } else if (file.name.endsWith('.json')) {
                // Parse JSON
                const data = JSON.parse(text);
                if (Array.isArray(data)) {
                    priceData = data.map((item: any) => ({
                        hour: item.hour ?? item.小 ?? item.Hour ?? 0,
                        price: item.price ?? item.电价 ?? item.Price ?? 0
                    })).filter((item: any) => !isNaN(item.hour) && !isNaN(item.price) && item.hour >= 0 && item.hour < 24);
                }
            } else {
                throw new Error('不支持的文件格式，请使用 .csv 或 .json 文件');
            }

            if (priceData.length === 0) {
                throw new Error('文件中没有找到有效的电价数据');
            }

            // Sort by hour
            priceData.sort((a, b) => a.hour - b.hour);

            setImportedPriceData(priceData);
            setUseSpotPrice(true);
        } catch (error) {
            setShowImportError(true);
            setImportErrorMessage(error instanceof Error ? error.message : '文件解析失败');
        } finally {
            setIsImporting(false);
        }
    };

    const clearImport = () => {
        setImportedPriceData([]);
        setImportFileName('');
        setUseSpotPrice(false);
        setShowImportError(false);
    };

    // Current State for Topology
    const currentHourData = simulation.data[hoverHour] || simulation.data[12];

    if (!currentModule) return null;

    return (
        <div className="flex h-full flex-col bg-slate-50 relative overflow-hidden">
            {/* Header */}
            <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <span className="material-icons text-indigo-600">psychology</span>
                            AI 智控管理平台
                        </h2>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full ml-4">
                        <span className={`text-xs font-bold ${currentModule.isActive ? 'text-primary' : 'text-slate-400'}`}>
                            {currentModule.isActive ? '模块已启用' : '模块已停用'}
                        </span>
                        <button 
                            onClick={() => toggleModule('retrofit-ai')}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${currentModule.isActive ? 'bg-primary' : 'bg-slate-300'}`}
                        >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${currentModule.isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Sub-Navigation */}
            <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-6">
                <button
                    onClick={() => setActiveTab('simulation')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'simulation' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <span className="material-icons text-lg">ssid_chart</span> 场景仿真模拟
                </button>
                <button
                    onClick={() => setActiveTab('financial')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'financial' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <span className="material-icons text-lg">savings</span> 投资收益对比
                </button>
                <button
                    onClick={() => setActiveTab('dynamic-visual')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'dynamic-visual' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <span className="material-icons text-lg">visibility</span> 动态分析
                </button>
                <button
                    onClick={() => setActiveTab('microgrid-visual')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'microgrid-visual' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <span className="material-icons text-lg">grid_view</span> 微电网可视化
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-7xl mx-auto">
                    
                    {/* --- TAB 1: SCENARIO SIMULATION --- */}
                    {activeTab === 'simulation' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                            {/* Controls */}
                            <div className="space-y-6">
                                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <span className="material-icons text-slate-400 text-lg">tune</span>
                                        仿真参数配置
                                    </h3>
                                    
                                    <div className="space-y-6">
                                        {/* Data Source */}
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">电价数据源</label>
                                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex flex-col gap-3">
                                                <div className="flex justify-between items-center cursor-pointer" onClick={() => setUseSpotPrice(!useSpotPrice)}>
                                                    <span className="text-xs text-slate-700">历史动态电价 (Spot Price)</span>
                                                    <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${useSpotPrice ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                                                        <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${useSpotPrice ? 'translate-x-4' : ''}`}></div>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-slate-400 leading-tight">
                                                    支持导入CSV或JSON格式的电价数据文件（24小时电价数据）。
                                                </p>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept=".csv,.json"
                                                    onChange={handleFileSelect}
                                                    className="hidden"
                                                />
                                                {useSpotPrice && importedPriceData.length > 0 && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                                                            <div className="flex items-center gap-2 text-xs text-emerald-700">
                                                                <span className="material-icons text-[14px]">check_circle</span>
                                                                <span>已导入: {importFileName}</span>
                                                            </div>
                                                            <span className="text-[10px] text-emerald-600">{importedPriceData.length} 条数据</span>
                                                        </div>
                                                        <button
                                                            onClick={clearImport}
                                                            className="w-full py-1.5 bg-white border border-red-200 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                                                        >
                                                            清除导入数据
                                                        </button>
                                                    </div>
                                                )}
                                                {useSpotPrice && importedPriceData.length === 0 && (
                                                    <button
                                                        onClick={handleImport}
                                                        disabled={isImporting}
                                                        className="w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        {isImporting ? '导入中...' : '导入历史数据'}
                                                    </button>
                                                )}
                                                {showImportError && (
                                                    <div className="p-2 bg-red-50 rounded-lg border border-red-200">
                                                        <div className="flex items-center gap-1 text-xs text-red-700">
                                                            <span className="material-icons text-[14px]">error</span>
                                                            <span>{importErrorMessage}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {!useSpotPrice && (
                                                    <button
                                                        onClick={handleImport}
                                                        disabled={isImporting}
                                                        className="w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        {isImporting ? '导入中...' : '导入历史数据'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Aggressiveness Slider */}
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase">AI 策略激进程度</label>
                                                <span className="text-xs font-bold text-indigo-600">{aiAggressiveness}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="100" 
                                                value={aiAggressiveness} 
                                                onChange={(e)=>setAiAggressiveness(parseInt(e.target.value))}
                                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                                <span>保守稳健</span>
                                                <span>激进套利</span>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* AI Topology Visualization */}
                                <section className="bg-slate-900 rounded-xl shadow-lg border border-slate-700 p-6 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                                    <h3 className="text-sm font-bold text-indigo-300 mb-6 flex items-center gap-2 relative z-10">
                                        <span className="material-icons text-lg">hub</span>
                                        AI 实时调度中枢
                                    </h3>
                                    
                                    <div className="relative z-10 flex flex-col items-center gap-6">
                                        {/* Top: Grid/PV */}
                                        <div className="flex justify-between w-full px-4">
                                            <div className={`flex flex-col items-center gap-1 transition-all ${currentHourData.flowState === 'charge' ? 'opacity-50' : 'opacity-100'}`}>
                                                <span className={`material-icons ${currentHourData.price > 0.8 ? 'text-red-400' : 'text-green-400'}`}>electric_bolt</span>
                                                <span className="text-[10px] text-slate-400">电网</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="material-icons text-yellow-400">wb_sunny</span>
                                                <span className="text-[10px] text-slate-400">光伏</span>
                                            </div>
                                        </div>

                                        {/* Center: AI Brain */}
                                        <div className="relative w-20 h-20 flex items-center justify-center">
                                            <div className="absolute inset-0 bg-indigo-500/30 rounded-full animate-ping"></div>
                                            <div className="relative w-16 h-16 bg-slate-800 border-2 border-indigo-500 rounded-full flex flex-col items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                                                <span className="material-icons text-indigo-400 text-2xl">psychology</span>
                                            </div>
                                            {/* Dynamic Connectors */}
                                            <div className={`absolute -top-6 left-2 w-0.5 h-8 bg-gradient-to-b from-transparent to-indigo-500 transition-all ${currentHourData.price > 0.8 ? 'opacity-100' : 'opacity-30'}`}></div>
                                            <div className="absolute -top-6 right-2 w-0.5 h-8 bg-gradient-to-b from-transparent to-yellow-500"></div>
                                            <div className={`absolute -bottom-6 w-0.5 h-8 bg-gradient-to-t from-transparent ${currentHourData.flowState === 'discharge' ? 'to-indigo-500' : 'to-slate-600'}`}></div>
                                        </div>

                                        {/* AI Action Label */}
                                        <div className="bg-slate-800/80 border border-slate-600 px-3 py-1 rounded-full text-xs font-mono text-indigo-300">
                                            {currentHourData.hourLabel} &gt; {currentHourData.aiAction}
                                        </div>

                                        {/* Bottom: Storage/Load */}
                                        <div className="flex justify-between w-full px-4 items-end">
                                            <div className={`flex flex-col items-center gap-1 transition-all ${currentHourData.flowState === 'charge' ? 'scale-110 text-green-400' : currentHourData.flowState === 'discharge' ? 'scale-110 text-red-400' : 'text-slate-400'}`}>
                                                <span className="material-icons">battery_charging_full</span>
                                                <span className="text-[10px]">储能</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`material-icons ${currentHourData.flowState === 'optimize' ? 'text-blue-400' : 'text-slate-400'}`}>apartment</span>
                                                <span className="text-[10px] text-slate-400">负载</span>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Chart Area */}
                            <div className="lg:col-span-2">
                                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                            <span className="material-icons text-blue-500">monitoring</span>
                                            24小时负荷优化曲线
                                        </h3>
                                        <div className="flex gap-4 text-xs">
                                            <div className="flex items-center gap-1"><span className="w-3 h-1 bg-slate-300"></span><span className="text-slate-500">基准负荷</span></div>
                                            <div className="flex items-center gap-1"><span className="w-3 h-1 bg-indigo-500"></span><span className="text-slate-800 font-bold">AI 优化负荷</span></div>
                                            <div className="flex items-center gap-1"><span className="w-3 h-1 border-t border-dashed border-red-400"></span><span className="text-red-500">电价曲线</span></div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 min-h-[400px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart 
                                                data={simulation.data} 
                                                margin={{top: 10, right: 10, left: 0, bottom: 0}}
                                                onMouseMove={(e) => {
                                                    if (e.activeTooltipIndex !== undefined) {
                                                        setHoverHour(e.activeTooltipIndex);
                                                    }
                                                }}
                                            >
                                                <defs>
                                                    <linearGradient id="gradAi" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="hourLabel" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} interval={2} />
                                                <YAxis yAxisId="load" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} label={{ value: '功率 (kW)', angle: -90, position: 'insideLeft', style: {fontSize: 10, fill: '#94a3b8'} }} />
                                                <YAxis yAxisId="price" orientation="right" tick={{fontSize: 10, fill: '#f87171'}} axisLine={false} tickLine={false} label={{ value: '电价 (元)', angle: 90, position: 'insideRight', style: {fontSize: 10, fill: '#f87171'} }} />
                                                <Tooltip 
                                                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)'}}
                                                    formatter={(val: number, name: string) => [val.toFixed(2), name === 'price' ? '电价' : name === 'baseLoad' ? '基准负荷' : 'AI负荷']}
                                                />
                                                <ReferenceLine yAxisId="load" x={currentHourData.hourLabel} stroke="#6366f1" strokeDasharray="3 3" />
                                                <Area yAxisId="load" type="monotone" dataKey="baseLoad" stroke="#cbd5e1" strokeWidth={2} fill="transparent" strokeDasharray="5 5" name="基准负荷" />
                                                <Area yAxisId="load" type="monotone" dataKey="aiLoad" stroke="#4f46e5" strokeWidth={3} fill="url(#gradAi)" name="AI优化负荷" animationDuration={1000} />
                                                <Line yAxisId="price" type="stepAfter" dataKey="price" stroke="#f87171" strokeWidth={2} dot={false} name="电价" />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}

                    {/* --- TAB 2: FINANCIAL ANALYSIS --- */}
                    {activeTab === 'financial' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                            {/* Inputs */}
                            <div className="space-y-6">
                                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <span className="material-icons text-slate-400 text-lg">account_balance_wallet</span>
                                        投资成本录入
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-medium text-slate-500 mb-1.5 block">AI 平台建设成本 (CAPEX)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={investment}
                                                    onChange={(e) => setInvestment(parseFloat(e.target.value))}
                                                    className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                                />
                                                <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">万元</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-500 mb-1.5 block">年运营维护成本 (OPEX)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={opex}
                                                    onChange={(e) => setOpex(parseFloat(e.target.value))}
                                                    className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                                />
                                                <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">万元/年</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">包含云服务费、模型订阅费及人工运维费</p>
                                        </div>
                                    </div>
                                </section>

                                {/* ROI Cards */}
                                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <span className="material-icons text-slate-400 text-lg">assessment</span>
                                        核心投资指标
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex flex-col justify-between h-24">
                                            <div className="text-xs text-purple-600">净收益 (Net Benefit)</div>
                                            <div className="text-2xl font-bold text-purple-700">¥ {simulation.netBenefit.toFixed(1)} <span className="text-sm">万/年</span></div>
                                        </div>
                                        <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 flex flex-col justify-between h-24">
                                            <div className="text-xs text-orange-600">投资回报率 (ROI)</div>
                                            <div className="text-2xl font-bold text-orange-700">{simulation.roi.toFixed(1)}%</div>
                                        </div>
                                        <div className="col-span-2 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                                            <div className="text-xs text-emerald-600">静态回收期 (Payback Period)</div>
                                            <div className="text-2xl font-bold text-emerald-700">{simulation.payback.toFixed(1)} <span className="text-sm font-normal text-emerald-600">年</span></div>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Charts */}
                            <div className="lg:col-span-2 space-y-6">

                                {/* 1. SECTOR IMPACT ANALYSIS (NEW) */}
                                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                                        <span className="material-icons text-indigo-500 text-lg">extension</span>
                                        AI 对各分项系统的增益分析 (Sector Impact)
                                    </h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={simulation.sectorImpacts} layout="vertical" margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                <XAxis type="number" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                                <YAxis dataKey="name" type="category" tick={{fontSize: 12, fill: '#64748b', fontWeight: 'bold'}} axisLine={false} tickLine={false} width={80} />
                                                <Tooltip
                                                    cursor={{fill: 'rgba(0,0,0,0.05)'}}
                                                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)'}}
                                                    formatter={(val: number) => `¥ ${val.toFixed(2)} 万`}
                                                />
                                                <Legend wrapperStyle={{fontSize: '12px'}} />
                                                <Bar dataKey="base" name="基础收益 (Manual)" stackId="a" fill="#cbd5e1" barSize={20} radius={[0,0,0,0]} />
                                                <Bar dataKey="ai" name="AI 增强收益" stackId="a" fill="#6366f1" barSize={20} radius={[0,4,4,0]}>
                                                    {simulation.sectorImpacts.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={['#8b5cf6', '#3b82f6', '#f59e0b', '#10b981'][index % 4]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-100">
                                        {simulation.sectorImpacts.map((item, idx) => (
                                            <div key={idx} className="text-center">
                                                <div className="text-[10px] text-slate-500">{item.name}</div>
                                                <div className="text-xs font-bold text-indigo-600">{item.increase}</div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* 2. CASH FLOW CHART */}
                                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[300px]">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                            <span className="material-icons text-blue-500 text-lg">waterfall_chart</span>
                                            {analysisPeriod}年累计现金流预测
                                        </h3>
                                    </div>
                                    <div className="flex-1 w-full min-h-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={simulation.cashFlows} margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="year" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                                <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} label={{ value: '累计收益 (万元)', angle: -90, position: 'insideLeft', style: {fontSize: 10, fill: '#94a3b8'} }}/>
                                                <Tooltip
                                                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)'}}
                                                    formatter={(val: number) => `¥ ${val.toFixed(1)} 万`}
                                                    labelFormatter={(label) => `第 ${label} 年`}
                                                />
                                                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                                                <Bar dataKey="flow" name="年度净现金流" fill="#34d399" barSize={12} radius={[4,4,0,0]}>
                                                    {simulation.cashFlows.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.flow >= 0 ? '#34d399' : '#f87171'} />
                                                    ))}
                                                </Bar>
                                                <Line type="monotone" dataKey="cumulative" name="累计现金流" stroke="#2563eb" strokeWidth={3} dot={true} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}

                    {/* --- TAB 3: DYNAMIC VISUALIZATION --- */}
                    {activeTab === 'dynamic-visual' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                            {/* Controls */}
                            <div className="space-y-6">
                                {/* Scenario Selector */}
                                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <span className="material-icons text-slate-400 text-lg">tune</span>
                                        运行情景选择
                                    </h3>
                                    <div className="space-y-3">
                                        {SCENARIOS.map((scenario) => (
                                            <div
                                                key={scenario.id}
                                                onClick={() => setSelectedScenario(scenario.id as any)}
                                                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                                    selectedScenario === scenario.id
                                                        ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500'
                                                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className={`text-sm font-bold ${selectedScenario === scenario.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                                                            {scenario.name}
                                                        </div>
                                                        <div className={`text-[10px] mt-1 ${selectedScenario === scenario.id ? 'text-indigo-500' : 'text-slate-400'}`}>
                                                            {scenario.description}
                                                        </div>
                                                    </div>
                                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                                        selectedScenario === scenario.id ? 'border-indigo-500' : 'border-slate-300'
                                                    }`}>
                                                        {selectedScenario === scenario.id && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* AI Control */}
                                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <span className="material-icons text-slate-400 text-lg">psychology</span>
                                        AI 智控参数
                                    </h3>
                                    <div className="space-y-4">
                                        {/* AI Toggle */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-bold text-slate-700">启用AI管控</div>
                                                <div className="text-[10px] text-slate-400">智能优化能源调度策略</div>
                                            </div>
                                            <button
                                                onClick={() => setDynamicAiEnabled(!dynamicAiEnabled)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${dynamicAiEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${dynamicAiEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>

                                        {/* AI Aggressiveness Slider */}
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <label className="text-xs font-bold text-slate-500">AI 激进程度</label>
                                                <span className="text-xs font-bold text-indigo-600">{dynamicAiAggressiveness}%</span>
                                            </div>
                                            <input
                                                type="range" min="0" max="100"
                                                value={dynamicAiAggressiveness}
                                                onChange={(e) => setDynamicAiAggressiveness(parseInt(e.target.value))}
                                                disabled={!dynamicAiEnabled}
                                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
                                            />
                                            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                                <span>保守稳健</span>
                                                <span>激进套利</span>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Metrics Cards */}
                                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <span className="material-icons text-slate-400 text-lg">assessment</span>
                                        关键指标
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                            <span className="text-xs text-slate-600">总成本</span>
                                            <span className="text-sm font-bold text-slate-800">¥{dynamicSimulation.metrics.totalCost}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                                            <span className="text-xs text-emerald-600">总收益</span>
                                            <span className="text-sm font-bold text-emerald-700">¥{dynamicSimulation.metrics.totalRevenue}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                                            <span className="text-xs text-purple-600">投资回报率</span>
                                            <span className="text-sm font-bold text-purple-700">{dynamicSimulation.metrics.roi}%</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                            <span className="text-xs text-blue-600">峰谷节省率</span>
                                            <span className="text-sm font-bold text-blue-700">{dynamicSimulation.metrics.peakSavingRate}%</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                                            <span className="text-xs text-orange-600">储能套利</span>
                                            <span className="text-sm font-bold text-orange-700">¥{dynamicSimulation.metrics.batteryArbitrage}</span>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Visualization Area */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* System Topology */}
                                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                            <span className="material-icons text-blue-500">hub</span>
                                            微电网系统拓扑
                                        </h3>
                                        <div className="text-xs text-slate-500">
                                            当前时刻: <span className="font-bold text-indigo-600">{dynamicCurrentHour}:00</span>
                                        </div>
                                    </div>

                                    {/* Dynamic SVG System Diagram */}
                                    <div className="flex justify-center">
                                        <svg width="400" height="300" viewBox="0 0 400 300">
                                            <defs>
                                                <linearGradient id="gridGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#e0e7f2" />
                                                    <stop offset="100%" stopColor="#1e2921" />
                                                </linearGradient>
                                                <filter id="glow">
                                                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                                    <feMerge>
                                                        <feMergeNode in="coloredBlur"/>
                                                        <feMergeNode in="SourceGraphic"/>
                                                    </feMerge>
                                                </filter>
                                            </defs>

                                            {/* Connection Lines */}
                                            <line x1="200" y1="80" x2="200" y2="120" stroke={dynamicSimulation.states[dynamicCurrentHour].gridState === 'pv-charging' ? '#fbbf24' : '#94a3b8'} strokeWidth={dynamicSimulation.states[dynamicCurrentHour].gridState === 'pv-charging' ? 3 : 2} />
                                            <line x1="200" y1="160" x2="200" y2="200" stroke={dynamicSimulation.states[dynamicCurrentHour].gridState === 'charging' ? '#3b82f6' : dynamicSimulation.states[dynamicCurrentHour].gridState === 'discharging' ? '#f97316' : '#94a3b8'} strokeWidth={dynamicSimulation.states[dynamicCurrentHour].battery === 'idle' ? 2 : 3} />
                                            <line x1="200" y1="240" x2="200" y2="270" stroke="#94a3b8" strokeWidth={2} />

                                            {/* Grid Node */}
                                            <circle cx="200" cy="50" r="25" fill="url(#gridGrad)" stroke="#64748b" strokeWidth={2} />
                                            <text x="200" y="55" textAnchor="middle" fontSize="12" fill="#1e293b" fontWeight="bold">电网</text>
                                            <text x="200" y="35" textAnchor="middle" fontSize="8" fill="#64748b">¥{dynamicSimulation.states[dynamicCurrentHour].price.toFixed(2)}/kWh</text>

                                            {/* PV Node */}
                                            <circle cx="100" cy="150" r="25" fill="#fef3c7" stroke="#f59e0b" strokeWidth={dynamicSimulation.states[dynamicCurrentHour].pvPower > 0 ? 3 : 1} />
                                            <text x="100" y="155" textAnchor="middle" fontSize="12" fill="#1e293b" fontWeight="bold">光伏</text>
                                            <text x="100" y="135" textAnchor="middle" fontSize="8" fill="#64748b">{Math.round(dynamicSimulation.states[dynamicCurrentHour].pvPower)}kW</text>

                                            {/* AI Brain Node */}
                                            <circle cx="200" cy="140" r="30" fill={dynamicAiEnabled ? '#4f46e5' : '#6366f1'} stroke="#3730a3" strokeWidth={2} filter={dynamicAiEnabled ? "url(#glow)" : ""} />
                                            <text x="200" y="145" textAnchor="middle" fontSize="14" fill="white" fontWeight="bold">AI</text>

                                            {/* Storage Node */}
                                            <circle cx="300" cy="150" r="25" fill={
                                                dynamicSimulation.states[dynamicCurrentHour].battery === 'charging' ? '#dbeafe' :
                                                dynamicSimulation.states[dynamicCurrentHour].battery === 'discharging' ? '#fed7aa' :
                                                '#f1f5f9'
                                            } stroke={
                                                dynamicSimulation.states[dynamicCurrentHour].battery === 'charging' ? '#3b82f6' :
                                                dynamicSimulation.states[dynamicCurrentHour].battery === 'discharging' ? '#f97316' :
                                                '#94a3b8'
                                            } strokeWidth={dynamicSimulation.states[dynamicCurrentHour].battery === 'idle' ? 1 : 3} />
                                            <text x="300" y="155" textAnchor="middle" fontSize="12" fill="#1e293b" fontWeight="bold">储能</text>
                                            <text x="300" y="175" textAnchor="middle" fontSize="8" fill="#64748b">
                                                {dynamicSimulation.states[dynamicCurrentHour].battery === 'charging' ? '充电' :
                                                 dynamicSimulation.states[dynamicCurrentHour].battery === 'discharging' ? '放电' : '待机'}
                                            </text>

                                            {/* Load Node */}
                                            <rect x="175" y="250" width="50" height="35" rx="5" fill="#f1f5f9" stroke="#94a3b8" strokeWidth={2} />
                                            <text x="200" y="272" textAnchor="middle" fontSize="12" fill="#1e293b" fontWeight="bold">负载</text>
                                            <text x="200" y="245" textAnchor="middle" fontSize="8" fill="#64748b">{Math.round(dynamicSimulation.states[dynamicCurrentHour].load)}kW</text>

                                            {/* Energy Flow Indicators */}
                                            {dynamicSimulation.states[dynamicCurrentHour].pvPower > 0 && (
                                                <circle cx="150" cy="140" r="8" fill="#fbbf24">
                                                    <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                                                </circle>
                                            )}
                                            {dynamicSimulation.states[dynamicCurrentHour].battery !== 'idle' && (
                                                <circle cx="250" cy="140" r="8" fill={
                                                    dynamicSimulation.states[dynamicCurrentHour].battery === 'charging' ? '#3b82f6' :
                                                    dynamicSimulation.states[dynamicCurrentHour].battery === 'discharging' ? '#f97316' : '#94a3b8'
                                                }>
                                                    <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
                                                </circle>
                                            )}
                                        </svg>
                                    </div>
                                </section>

                                {/* 24-hour Operation Curve */}
                                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                            <span className="material-icons text-blue-500">show_chart</span>
                                            24小时运行曲线
                                        </h3>
                                        <div className="flex gap-4 text-xs">
                                            <div className="flex items-center gap-1"><span className="w-3 h-1 bg-yellow-400"></span><span className="text-slate-500">光伏</span></div>
                                            <div className="flex items-center gap-1"><span className="w-3 h-1 bg-blue-500"></span><span className="text-slate-500">储能</span></div>
                                            <div className="flex items-center gap-1"><span className="w-3 h-1 bg-slate-400"></span><span className="text-slate-500">负载</span></div>
                                        </div>
                                    </div>

                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart
                                                data={dynamicSimulation.states.map((s, i) => ({ hour: i, ...s }))}
                                                margin={{top: 10, right: 10, left: 0, bottom: 0}}
                                                onMouseMove={(e) => {
                                                    if (e.activeTooltipIndex !== undefined) {
                                                        setDynamicCurrentHour(e.activeTooltipIndex);
                                                    }
                                                }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="hour" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} interval={2} tickFormatter={(v) => `${v}:00`} />
                                                <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} label={{ value: '功率 (kW)', angle: -90, position: 'insideLeft', style: {fontSize: 10, fill: '#94a3b8'} }} />
                                                <Tooltip
                                                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)'}}
                                                    formatter={(val: number, name: string) => [`${Math.round(val)} kW`, name]}
                                                    labelFormatter={(label) => `${label}:00`}
                                                />
                                                <ReferenceLine x={dynamicCurrentHour} stroke="#6366f1" strokeDasharray="3 3" />
                                                <Area type="monotone" dataKey="pvPower" stroke="#fbbf24" strokeWidth={2} fill="#fef3c7" fillOpacity={0.3} name="光伏发电" />
                                                <Area type="monotone" dataKey="batteryPower" stroke="#3b82f6" strokeWidth={2} fill="#dbeafe" fillOpacity={0.3} name="储能功率" />
                                                <Line type="monotone" dataKey="load" stroke="#64748b" strokeWidth={2} dot={false} name="负载需求" />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}

                    {/* --- TAB 4: MICROGRID VISUALIZATION --- */}
                    {activeTab === 'microgrid-visual' && (
                        <div className="animate-fade-in">
                            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="mb-6">
                                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                        <span className="material-icons text-blue-500">grid_view</span>
                                        微电网实时可视化
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        基于15个组件图片的微电网动态展示，支持设备状态控制、能源流动可视化和昼夜场景切换
                                    </p>
                                </div>
                                <MicrogridVisual />
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}