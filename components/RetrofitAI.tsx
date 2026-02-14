import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useProject } from '../context/ProjectContext';

// --- Types ---

type PriceLevel = 'valley' | 'flat' | 'peak';
type LoadLevel = 'low' | 'normal' | 'high';
type PvLevel = 'night' | 'cloudy' | 'sunny';

interface NodeState {
    status: 'idle' | 'charging' | 'discharging' | 'generating' | 'consuming' | 'optimized' | 'off';
    label: string; 
    val: string; 
    flow: 'in' | 'out' | 'none'; 
}

// --- Illustration Assets (Clean Isometric Style) ---

const IllustrationColors = {
    bg: '#ffffff', // Pure White
    buildingFace: '#f1f5f9', // Slate 100
    buildingSide: '#e2e8f0', // Slate 200
    buildingRoof: '#f8fafc', // Slate 50
    window: '#e0f2fe', // Sky 100
    windowBorder: '#bae6fd', // Sky 200
    
    solar: '#3b82f6', // Blue 500
    solarBorder: '#eff6ff', 
    
    storageFace: '#f8fafc',
    storageSide: '#cbd5e1',
    
    grid: '#64748b', // Slate 500
    
    flowGreen: '#22c55e',
    flowOrange: '#f97316',
    flowBlue: '#3b82f6',
};

// Isometric Cube Helper
const IsoCube = ({ x, y, w, h, d, faceColor, sideColor, topColor, opacity=1 }: any) => (
    <g transform={`translate(${x}, ${y})`} opacity={opacity}>
        {/* Top */}
        <path d={`M0 0 L${w} -${w/2} L${w+d} -${w/2 - d/2} L${d} ${d/2} Z`} fill={topColor} stroke="white" strokeWidth="0.5"/>
        {/* Right (Side) */}
        <path d={`M${w+d} -${w/2 - d/2} L${w+d} ${h - w/2 - d/2} L${d} ${h + d/2} L${d} ${d/2} Z`} fill={sideColor} stroke="white" strokeWidth="0.5"/>
        {/* Left (Face) */}
        <path d={`M0 0 L${d} ${d/2} L${d} ${h + d/2} L0 ${h} Z`} fill={faceColor} stroke="white" strokeWidth="0.5"/>
    </g>
);

const MainBuilding = () => (
    <g transform="translate(450, 280)">
        {/* Main Structure - L Shape */}
        <IsoCube x={0} y={0} w={120} h={100} d={80} 
            faceColor={IllustrationColors.buildingFace} 
            sideColor={IllustrationColors.buildingSide} 
            topColor={IllustrationColors.buildingRoof} 
        />
        <IsoCube x={60} y={-30} w={80} h={120} d={60} 
            faceColor={IllustrationColors.buildingFace} 
            sideColor={IllustrationColors.buildingSide} 
            topColor={IllustrationColors.buildingRoof} 
        />
        
        {/* Windows */}
        <g transform="translate(10, 20)">
            <path d="M10 5 L70 35 L70 80 L10 50 Z" fill={IllustrationColors.window} stroke={IllustrationColors.windowBorder} strokeWidth="1" />
            <line x1="40" y1="20" x2="40" y2="65" stroke={IllustrationColors.windowBorder} />
            <line x1="10" y1="27" x2="70" y2="57" stroke={IllustrationColors.windowBorder} />
        </g>
        <g transform="translate(90, -10)">
             <path d="M0 60 L60 30 L60 -20 L0 10 Z" fill={IllustrationColors.window} stroke={IllustrationColors.windowBorder} strokeWidth="1" />
        </g>

        {/* Entrance */}
        <g transform="translate(20, 85)">
            <path d="M0 0 L30 15 L30 55 L0 40 Z" fill="#e2e8f0" opacity="0.5" />
            <path d="M5 2 L25 12 L25 48 L5 38 Z" fill="#475569" />
        </g>
    </g>
);

const SolarArray = ({ active }: { active: boolean }) => (
    <g transform="translate(150, 350)">
        {[0, 1, 2].map(i => (
            <g key={i} transform={`translate(${i*50}, ${-i*25})`}>
                <path d="M0 0 L60 -30 L90 -15 L30 15 Z" fill={IllustrationColors.solar} stroke={IllustrationColors.solarBorder} strokeWidth="1" />
                <path d="M30 15 L30 30" stroke="#94a3b8" strokeWidth="2" />
                <path d="M0 0 L0 15" stroke="#94a3b8" strokeWidth="2" />
                {active && <path d="M0 0 L60 -30 L90 -15 L30 15 Z" fill="white" opacity="0.2" className="animate-pulse" />}
            </g>
        ))}
    </g>
);

const StorageContainer = ({ active, status }: { active: boolean, status: string }) => (
    <g transform="translate(300, 480)">
        <IsoCube x={0} y={0} w={90} h={50} d={50} 
            faceColor="#f8fafc" sideColor="#cbd5e1" topColor="#fff" 
        />
        <path d="M10 5 L30 15 L30 55 L10 45 Z" fill="none" stroke="#94a3b8" />
        <path d="M40 20 L60 30 L60 70 L40 60 Z" fill="none" stroke="#94a3b8" />
        <circle cx="75" cy="50" r="3" fill={active ? (status === 'charging' ? '#22c55e' : '#f97316') : '#cbd5e1'} className={active ? 'animate-ping' : ''} />
        <text x="30" y="60" fontSize="8" fill="#64748b" transform="rotate(-26) skewX(26)" fontWeight="bold">ESS</text>
    </g>
);

const GridPylon = ({ active }: { active: boolean }) => (
    <g transform="translate(850, 150)">
        <path d="M0 0 L-20 120 L20 120 Z" fill="none" stroke={IllustrationColors.grid} strokeWidth="2" />
        <line x1="-30" y1="30" x2="30" y2="30" stroke={IllustrationColors.grid} strokeWidth="2" />
        <line x1="-40" y1="60" x2="40" y2="60" stroke={IllustrationColors.grid} strokeWidth="2" />
        <path d="M-30 30 Q -200 80, -350 180" fill="none" stroke="#cbd5e1" strokeWidth="1" />
        {active && <path d="M-30 30 Q -200 80, -350 180" fill="none" stroke={IllustrationColors.flowBlue} strokeWidth="2" strokeDasharray="5 5" className="animate-flow" />}
    </g>
);

const HvacSystem = ({ active }: { active: boolean }) => (
    <g transform="translate(620, 230)">
        <IsoCube x={0} y={0} w={30} h={20} d={30} faceColor="#e2e8f0" sideColor="#cbd5e1" topColor="#f1f5f9" />
        <IsoCube x={40} y={20} w={30} h={20} d={30} faceColor="#e2e8f0" sideColor="#cbd5e1" topColor="#f1f5f9" />
        {active && (
            <g transform="translate(15, -7)">
                <line x1="-6" y1="0" x2="6" y2="0" stroke="#64748b" strokeWidth="2" className="animate-spin origin-center" />
                <line x1="0" y1="-6" x2="0" y2="6" stroke="#64748b" strokeWidth="2" className="animate-spin origin-center" />
            </g>
        )}
    </g>
);

const FlowPath = ({ d, color, active, reverse }: any) => {
    if (!active) return null;
    return (
        <g pointerEvents="none">
            <path d={d} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.2" />
            <path d={d} fill="none" stroke={color} strokeWidth="2" strokeDasharray="6 6" className={reverse ? 'animate-flow-reverse' : 'animate-flow'} />
            <style>{`
                @keyframes flow { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
                @keyframes flow-reverse { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 24; } }
                .animate-flow { animation: flow 1s linear infinite; }
                .animate-flow-reverse { animation: flow-reverse 1s linear infinite; }
            `}</style>
        </g>
    );
};

const StatHUD = ({ x, y, label, value, color }: any) => (
    <div className="absolute transform -translate-x-1/2 -translate-y-full pointer-events-none transition-all duration-500" style={{ left: x, top: y - 20 }}>
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-slate-100 border-l-4 flex flex-col min-w-[80px]" style={{ borderLeftColor: color }}>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
            <span className="text-sm font-bold text-slate-800">{value}</span>
        </div>
        <div className="w-0.5 h-6 bg-slate-200 mx-auto opacity-60"></div>
        <div className="w-2 h-2 rounded-full bg-slate-300 mx-auto -mt-1 ring-2 ring-white"></div>
    </div>
);

// --- Logic Helpers ---

const getPriceInfo = (level: PriceLevel) => {
    switch(level) {
        case 'valley': return { price: 0.32, label: '谷电' };
        case 'flat': return { price: 0.68, label: '平段' };
        case 'peak': return { price: 1.65, label: '尖峰' };
    }
};

const getLoadInfo = (level: LoadLevel) => {
    switch(level) {
        case 'low': return { kw: 150 };
        case 'normal': return { kw: 450 };
        case 'high': return { kw: 850 };
    }
};

const getPvInfo = (level: PvLevel) => {
    switch(level) {
        case 'night': return { kw: 0 };
        case 'cloudy': return { kw: 120 };
        case 'sunny': return { kw: 600 };
    }
};

const generateChartData = (price: PriceLevel) => {
    return Array.from({ length: 24 }, (_, i) => {
        let base = 200 + Math.random() * 50;
        if (i > 8 && i < 18) base += 200; 
        let aiLoad = base;
        if (price === 'peak' && (i >= 10 && i <= 14)) aiLoad -= 80; 
        return { hour: `${i}:00`, base: Math.round(base), ai: Math.round(aiLoad) };
    });
};

const aiBenefits = [
    { 
        id: 'storage',
        name: '储能策略优化', 
        value: 8.5, 
        uplift: '12%',
        color: '#8b5cf6', 
        icon: 'battery_charging_full',
        desc: '基于电价预测的智能充放电策略，捕捉最大化峰谷套利空间。'
    },
    { 
        id: 'hvac',
        name: '暖通全局寻优', 
        value: 4.8, 
        uplift: '15%',
        color: '#3b82f6', 
        icon: 'ac_unit',
        desc: '动态调节机组参数，基于负荷预测实现系统级能效(COP)最大化。'
    },
    { 
        id: 'solar',
        name: '光伏消纳提升', 
        value: 3.2, 
        uplift: '5%',
        color: '#f59e0b', 
        icon: 'solar_power',
        desc: '平滑光伏出力波动，优化源荷匹配，提高清洁能源自用比例。'
    },
    { 
        id: 'ev',
        name: '有序充电调度', 
        value: 2.1, 
        uplift: '8%',
        color: '#10b981', 
        icon: 'ev_station',
        desc: '利用负荷低谷时段引导充电，削减尖峰负荷，延缓扩容投资。'
    },
    {
        id: 'lighting',
        name: '智能照明控制',
        value: 1.5,
        uplift: '10%',
        color: '#eab308',
        icon: 'lightbulb',
        desc: '融合环境光与人员感应，实现恒照度控制与分区管理。'
    }
];

export default function RetrofitAI() {
    const { modules } = useProject();
    const currentModule = modules['retrofit-ai'];
    
    // --- State ---
    const [priceLevel, setPriceLevel] = useState<PriceLevel>('flat');
    const [loadLevel, setLoadLevel] = useState<LoadLevel>('normal');
    const [pvLevel, setPvLevel] = useState<PvLevel>('cloudy');

    // --- Dynamic Decision Engine ---
    const systemState = useMemo(() => {
        const price = getPriceInfo(priceLevel);
        const load = getLoadInfo(loadLevel);
        const pv = getPvInfo(pvLevel);

        const nodes: Record<string, NodeState> = {
            solar: { status: 'off', label: 'PV Generation', val: '0 kW', flow: 'none' },
            storage: { status: 'idle', label: 'Energy Storage', val: 'SOC 50%', flow: 'none' },
            hvac: { status: 'consuming', label: 'HVAC Load', val: 'RUN', flow: 'in' },
            ev: { status: 'consuming', label: 'EV Charging', val: 'IDLE', flow: 'in' },
            lighting: { status: 'consuming', label: 'Lighting', val: 'ON', flow: 'in' },
            grid: { status: 'idle', label: 'Grid', val: 'CONN', flow: 'in' }
        };

        if (pvLevel !== 'night') {
            nodes.solar = { status: 'generating', label: 'PV Gen', val: `${pv.kw} kW`, flow: 'out' };
        }

        const netLoad = load.kw - pv.kw;
        
        if (priceLevel === 'valley') {
            nodes.storage = { status: 'charging', label: 'Storage', val: 'Charge +200', flow: 'in' };
        } else if (priceLevel === 'peak') {
            nodes.storage = { status: 'discharging', label: 'Storage', val: 'Discharge -180', flow: 'out' };
        } else {
            if (pv.kw > load.kw) {
                nodes.storage = { status: 'charging', label: 'Storage', val: 'PV Absorbed', flow: 'in' };
            }
        }

        if (loadLevel === 'high') {
            nodes.hvac = { status: 'optimized', label: 'HVAC', val: 'Eco Mode', flow: 'in' };
            nodes.ev = { status: 'optimized', label: 'EV Charger', val: 'Queueing', flow: 'in' };
        } else {
            nodes.hvac = { status: 'consuming', label: 'HVAC', val: 'Cooling', flow: 'in' };
            nodes.ev = { status: 'consuming', label: 'EV Charger', val: 'Fast Chg', flow: 'in' };
        }

        if (netLoad > 0 && nodes.storage.status !== 'discharging') {
             nodes.grid = { status: 'consuming', label: 'Grid', val: `${Math.max(0, netLoad).toFixed(0)} kW`, flow: 'out' }; 
        }

        let strategyLabel = 'Balanced';
        if (priceLevel === 'peak') strategyLabel = 'Peak Shaving';
        else if (priceLevel === 'valley') strategyLabel = 'Valley Filling';

        return { nodes, strategyLabel };
    }, [priceLevel, loadLevel, pvLevel]);

    const chartData = useMemo(() => generateChartData(priceLevel), [priceLevel]);
    const totalAiSaving = aiBenefits.reduce((a,b) => a + b.value, 0);

    if (!currentModule) return null;

    return (
        <div className="flex h-full flex-col bg-slate-50 relative overflow-hidden">
            {/* Header */}
            <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <span className="material-icons text-indigo-600">psychology</span>
                            AI 智控数字孪生 <span className="text-slate-400 font-normal">| Digital Twin</span>
                        </h2>
                    </div>
                    <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                        <div className={`w-2 h-2 rounded-full ${currentModule.isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
                        <span className="text-xs font-bold text-indigo-700">
                            System Online: {systemState.strategyLabel}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Content Body */}
            <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col lg:flex-row">
                
                {/* 1. LEFT: Illustration Canvas (White Background) */}
                <div className="flex-1 relative bg-white overflow-hidden border-r border-slate-200">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet">
                        <defs>
                            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#f8fafc" strokeWidth="1"/>
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                        
                        <FlowPath d="M200 320 Q 300 300 450 330" color={IllustrationColors.flowGreen} active={systemState.nodes.solar.flow === 'out'} />
                        <FlowPath d="M850 180 Q 700 200 570 330" color={IllustrationColors.flowBlue} active={systemState.nodes.grid.status === 'consuming'} />
                        <FlowPath d="M340 480 Q 400 450 450 380" color={IllustrationColors.flowGreen} active={systemState.nodes.storage.status === 'discharging'} />
                        <FlowPath d="M450 380 Q 400 450 340 480" color={IllustrationColors.flowOrange} active={systemState.nodes.storage.status === 'charging'} />
                        <FlowPath d="M500 380 Q 520 450 550 520" color={IllustrationColors.flowOrange} active={systemState.nodes.ev.flow === 'in'} />
                        <FlowPath d="M550 330 Q 580 280 620 250" color={IllustrationColors.flowOrange} active={systemState.nodes.hvac.flow === 'in'} />
                        <FlowPath d="M550 380 Q 650 400 750 420" color={IllustrationColors.flowOrange} active={systemState.nodes.lighting.flow === 'in'} />

                        <MainBuilding />
                        <SolarArray active={systemState.nodes.solar.status === 'generating'} />
                        <GridPylon active={systemState.nodes.grid.status === 'consuming'} />
                        <StorageContainer active={systemState.nodes.storage.status !== 'idle'} status={systemState.nodes.storage.status} />
                        <HvacSystem active={systemState.nodes.hvac.status !== 'off'} />
                    </svg>

                    <div className="absolute inset-0 pointer-events-none">
                        <StatHUD x={200} y={320} label="光伏发电" value={systemState.nodes.solar.val} color={IllustrationColors.flowGreen} />
                        <StatHUD x={850} y={150} label="电网取电" value={systemState.nodes.grid.val} color={IllustrationColors.flowBlue} />
                        <StatHUD x={340} y={480} label="储能系统" value={systemState.nodes.storage.val} color={systemState.nodes.storage.status==='charging' ? IllustrationColors.flowOrange : IllustrationColors.flowGreen} />
                        <StatHUD x={550} y={520} label="充电桩" value={systemState.nodes.ev.val} color={IllustrationColors.flowOrange} />
                        <StatHUD x={640} y={230} label="暖通空调" value={systemState.nodes.hvac.val} color={IllustrationColors.flowOrange} />
                        <StatHUD x={750} y={420} label="智能照明" value={systemState.nodes.lighting.val} color={IllustrationColors.flowOrange} />
                    </div>
                </div>

                {/* 2. RIGHT: Dashboard Panel - Structured & Modern */}
                <div className="w-full lg:w-[400px] bg-white flex flex-col z-20 h-full shadow-2xl relative">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        
                        {/* A. Brain Neuron Configuration */}
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><span className="material-icons text-sm">settings_input_component</span></span>
                                大脑神经元配置
                            </h3>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-medium text-slate-500">
                                        <span>电价信号 (Price)</span>
                                        <span className="text-indigo-600">{priceLevel.toUpperCase()}</span>
                                    </div>
                                    <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                                        {(['valley', 'flat', 'peak'] as const).map(p => (
                                            <button 
                                                key={p} 
                                                onClick={() => setPriceLevel(p)}
                                                className={`flex-1 py-1.5 text-xs rounded-md transition-all ${priceLevel === p ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                {{valley:'谷', flat:'平', peak:'峰'}[p]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-medium text-slate-500">
                                        <span>建筑负荷 (Load)</span>
                                        <span className="text-blue-600">{loadLevel.toUpperCase()}</span>
                                    </div>
                                    <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                                        {(['low', 'normal', 'high'] as const).map(l => (
                                            <button 
                                                key={l} 
                                                onClick={() => setLoadLevel(l)}
                                                className={`flex-1 py-1.5 text-xs rounded-md transition-all ${loadLevel === l ? 'bg-blue-50 text-blue-700 font-bold shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                {{low:'低', normal:'中', high:'高'}[l]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-medium text-slate-500">
                                        <span>光伏出力 (PV)</span>
                                        <span className="text-orange-600">{pvLevel.toUpperCase()}</span>
                                    </div>
                                    <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                                        {(['night', 'cloudy', 'sunny'] as const).map(p => (
                                            <button 
                                                key={p} 
                                                onClick={() => setPvLevel(p)}
                                                className={`flex-1 py-1.5 text-xs rounded-md transition-all ${pvLevel === p ? 'bg-orange-50 text-orange-700 font-bold shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                {{night:'无', cloudy:'阴', sunny:'晴'}[p]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* B. AI Revenue Premium Analysis - List View */}
                        <div>
                            <div className="flex justify-between items-center mb-3 px-1">
                                <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <span className="material-icons text-emerald-500 text-lg">monetization_on</span>
                                    AI 收益溢价分析
                                </div>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                    +¥{totalAiSaving.toFixed(1)}万/年
                                </span>
                            </div>
                            <div className="space-y-3">
                                {aiBenefits.map((item) => (
                                    <div key={item.id} className="group bg-white rounded-xl border border-slate-100 p-3 hover:border-slate-300 hover:shadow-md transition-all relative overflow-hidden">
                                        {/* Background Decor */}
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-slate-50 to-transparent rounded-bl-full -mr-6 -mt-6 opacity-60 group-hover:from-slate-100 transition-all"></div>
                                        
                                        <div className="flex gap-3 relative z-10">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm" style={{backgroundColor: `${item.color}15`, color: item.color}}>
                                                <span className="material-icons text-xl">{item.icon}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-slate-800">{item.name}</span>
                                                    <span className="text-xs font-bold text-slate-900">¥{item.value}万</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 leading-relaxed mb-2 opacity-90 line-clamp-2">{item.desc}</p>
                                                
                                                {/* Uplift Bar */}
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex-1">
                                                        <div 
                                                            className="h-full rounded-full transition-all duration-1000 ease-out" 
                                                            style={{width: '70%', backgroundColor: item.color}}
                                                        ></div>
                                                    </div>
                                                    <span className="text-[9px] font-bold" style={{color: item.color}}>+{item.uplift}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* C. Real-time Dashboard */}
                        <div className="flex flex-col h-[220px]">
                            <div className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                                <span className="material-icons text-blue-500 text-lg">monitoring</span>
                                算法溢价实时看板
                            </div>
                            <div className="flex-1 w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col relative overflow-hidden">
                                <div className="absolute top-4 right-4 flex items-center gap-3 text-[10px] z-10">
                                    <span className="flex items-center gap-1.5 text-slate-400"><div className="w-2 h-0.5 bg-slate-300"></div>基线</span>
                                    <span className="flex items-center gap-1.5 text-blue-600 font-bold"><div className="w-2 h-0.5 bg-blue-600"></div>优化后</span>
                                </div>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{top: 25, right: 5, left: -25, bottom: 0}}>
                                        <defs>
                                            <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="hour" tick={{fontSize: 9, fill: '#94a3b8'}} axisLine={false} tickLine={false} interval={3} />
                                        <YAxis tick={{fontSize: 9, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            contentStyle={{backgroundColor: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '10px'}}
                                        />
                                        <Area type="monotone" dataKey="ai" stroke="#3b82f6" fill="url(#grad1)" strokeWidth={2} name="优化后" animationDuration={1000} />
                                        <Area type="monotone" dataKey="base" stroke="#cbd5e1" fill="transparent" strokeDasharray="3 3" name="基线" animationDuration={1000} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                    
                    {/* Fixed Footer Action */}
                    <div className="p-4 border-t border-slate-100 bg-white">
                        <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transform active:scale-[0.98]">
                            <span className="material-icons text-sm">auto_awesome</span> 生成优化报告
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};