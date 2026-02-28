import React, { useState } from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useProject } from '../context/ProjectContext';
import MicrogridVisual from './microgrid/MicrogridVisual';
import { useSimulationData, useDynamicSimulation, PriceData, FinancialParams } from './hooks/useSimulationHooks';

type ScenarioType = 'normal' | 'peak-shaving' | 'extreme-price' | 'price-arbitrage';

const SCENARIOS = [
    { id: 'normal', name: '正常运营', description: '标准8760小时运行模式' },
    { id: 'peak-shaving', name: '高峰避峰', description: 'AI在高峰电价时段减少用能，降低峰期电费' },
    { id: 'extreme-price', name: '极端电价', description: 'AI在高电价时段主动削减用能，降低成本' },
    { id: 'price-arbitrage', name: '价格套利', description: '储能谷充峰放，利用峰谷价差获取收益' }
];

export default function MicrogridDashboard() {
    const { modules, toggleModule } = useProject();
    const currentModule = modules['retrofit-ai'];
    const savedParams = currentModule.params || {};

    // 统一参数状态
    const [useSpotPrice, setUseSpotPrice] = useState<boolean>(savedParams.useSpotPrice || false);
    const [importedPriceData, setImportedPriceData] = useState<PriceData[]>([]);
    const [importFileName, setImportFileName] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [showImportError, setShowImportError] = useState(false);
    const [importErrorMessage, setImportErrorMessage] = useState('');
    const [aiEnabled, setAiEnabled] = useState(false);
    const [aiAggressiveness, setAiAggressiveness] = useState<number>(savedParams.aiAggressiveness || 50);
    const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('normal');
    const [currentHour, setCurrentHour] = useState<number>(12);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // 金融参数状态
    const [investment, setInvestment] = useState<number>(savedParams.investment || 35.0);
    const [opex, setOpex] = useState<number>(savedParams.opex || 1.5);
    const [analysisPeriod, setAnalysisPeriod] = useState<number>(10);

    // 获取仿真数据
    const simulation = useSimulationData(
        useSpotPrice,
        importedPriceData,
        { investment, opex, analysisPeriod }
    );
    const dynamicSimulation = useDynamicSimulation(selectedScenario, aiEnabled, aiAggressiveness);

    const currentHourData = simulation.data[currentHour] || simulation.data[12];

    if (!currentModule) return null;

    return (
        <div className="flex h-full flex-col bg-slate-50 relative overflow-hidden">
            {/* 顶部控制栏 */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="material-icons text-indigo-600 text-xl">dashboard</span>
                    <h2 className="text-lg font-bold text-slate-900">微电网综合仪表盘</h2>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
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

            <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

                    {/* 左侧：微电网可视化 */}
                    <div className="xl:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-icons text-blue-500">grid_view</span>
                            <h3 className="text-base font-bold text-slate-800">微电网可视化</h3>
                        </div>
                        <div className="rounded-lg overflow-hidden border border-slate-100 flex-1 min-h-0">
                            <MicrogridVisual />
                        </div>
                    </div>

                    {/* 右侧：控制面板 */}
                    <div className="xl:col-span-1 space-y-4">
                        {/* 统一控制面板 */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="material-icons text-indigo-500">tune</span>
                                <h3 className="text-sm font-bold text-slate-800">控制面板</h3>
                            </div>

                            <div className="space-y-3">
                                {/* 运行情景 */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">运行情景</label>
                                    <div className="space-y-1">
                                        {SCENARIOS.map((scenario) => (
                                            <div
                                                key={scenario.id}
                                                onClick={() => setSelectedScenario(scenario.id as any)}
                                                className={`p-1.5 rounded border cursor-pointer transition-all text-xs ${
                                                    selectedScenario === scenario.id
                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-700'
                                                }`}
                                            >
                                                {scenario.name}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* AI 控制 */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-2 block">AI 智控</label>
                                    <div className="space-y-2.5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-700">启用 AI</span>
                                            <button
                                                onClick={() => setAiEnabled(!aiEnabled)}
                                                className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${aiEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}
                                            >
                                                <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${aiEnabled ? 'translate-x-4' : ''}`}></span>
                                            </button>
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-xs text-slate-700">激进程度</span>
                                                <span className="text-xs font-bold text-indigo-600">{aiAggressiveness}%</span>
                                            </div>
                                            <input
                                                type="range" min="0" max="100"
                                                value={aiAggressiveness}
                                                onChange={(e) => setAiAggressiveness(parseInt(e.target.value))}
                                                disabled={!aiEnabled}
                                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 电价数据源 */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-2 block">电价数据源</label>
                                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                        <div className="flex justify-between items-center cursor-pointer" onClick={() => setUseSpotPrice(!useSpotPrice)}>
                                            <span className="text-xs text-slate-700">动态电价</span>
                                            <div className={`w-7 h-3.5 rounded-full p-0.5 transition-colors ${useSpotPrice ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                                                <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${useSpotPrice ? 'translate-x-3.5' : ''}`}></div>
                                            </div>
                                        </div>
                                        {useSpotPrice && importedPriceData.length === 0 && (
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isImporting}
                                                className="w-full mt-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-indigo-600 hover:bg-indigo-50"
                                            >
                                                {isImporting ? '导入中...' : '导入数据'}
                                            </button>
                                        )}
                                        {useSpotPrice && importedPriceData.length > 0 && (
                                            <div className="mt-1.5 text-[10px] text-emerald-600 flex items-center gap-0.5 truncate">
                                                <span className="material-icons text-[10px] shrink-0">check_circle</span>
                                                <span className="truncate">{importFileName}</span>
                                            </div>
                                        )}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".csv,.json"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                setIsImporting(true);
                                                setShowImportError(false);
                                                setImportFileName(file.name);
                                                try {
                                                    const text = await file.text();
                                                    let priceData: PriceData[] = [];
                                                    if (file.name.endsWith('.csv')) {
                                                        const lines = text.split('\n').filter(line => line.trim());
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
                                                        const data = JSON.parse(text);
                                                        if (Array.isArray(data)) {
                                                            priceData = data.map((item: any) => ({
                                                                hour: item.hour ?? item.小时 ?? item.Hour ?? 0,
                                                                price: item.price ?? item.电价 ?? item.Price ?? 0
                                                            })).filter((item: any) => !isNaN(item.hour) && !isNaN(item.price) && item.hour >= 0 && item.hour < 24);
                                                        }
                                                    }
                                                    priceData.sort((a, b) => a.hour - b.hour);
                                                    setImportedPriceData(priceData);
                                                    setUseSpotPrice(true);
                                                } catch (error) {
                                                    setShowImportError(true);
                                                    setImportErrorMessage(error instanceof Error ? error.message : '文件解析失败');
                                                } finally {
                                                    setIsImporting(false);
                                                }
                                            }}
                                            className="hidden"
                                        />
                                        {showImportError && (
                                            <div className="mt-1.5 p-1 bg-red-50 rounded text-[10px] text-red-700">{importErrorMessage}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 统一图表区域 */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <span className="material-icons text-blue-500">show_chart</span>
                                    24小时运行曲线
                                </h3>
                                <div className="text-xs text-slate-500">
                                    当前: <span className="font-bold text-indigo-600">{currentHour}:00</span>
                                </div>
                            </div>

                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart
                                        data={dynamicSimulation.states.map((s, i) => ({
                                            hour: i,
                                            hourLabel: `${i}:00`,
                                            baseLoad: simulation.data[i]?.baseLoad || 0,
                                            aiLoad: simulation.data[i]?.aiLoad || 0,
                                            price: simulation.data[i]?.price || 0,
                                            pvPower: s.pvPower,
                                            batteryPower: s.batteryPower,
                                            load: s.load
                                        }))}
                                        margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
                                        onMouseMove={(e) => {
                                            if (e.activeTooltipIndex !== undefined) {
                                                setCurrentHour(e.activeTooltipIndex);
                                            }
                                        }}
                                    >
                                        <defs>
                                            <linearGradient id="gradPv" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gradBattery" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="hourLabel" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={3} />
                                        <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)' }}
                                            formatter={(val: number, name: string) => {
                                                const names: Record<string, string> = {
                                                    baseLoad: '基准负荷',
                                                    aiLoad: 'AI负荷',
                                                    price: '电价',
                                                    pvPower: '光伏',
                                                    batteryPower: '储能',
                                                    load: '负载'
                                                };
                                                return [Math.round(val), names[name] || name];
                                            }}
                                        />
                                        <ReferenceLine x={currentHour} stroke="#6366f1" strokeDasharray="3 3" />
                                        <Area type="monotone" dataKey="pvPower" stroke="#fbbf24" strokeWidth={1.5} fill="url(#gradPv)" name="光伏" />
                                        <Area type="monotone" dataKey="batteryPower" stroke="#3b82f6" strokeWidth={1.5} fill="url(#gradBattery)" name="储能" />
                                        <Line type="monotone" dataKey="baseLoad" stroke="#cbd5e1" strokeWidth={1} strokeDasharray="5 5" dot={false} name="基准负荷" />
                                        <Line type="monotone" dataKey="aiLoad" stroke="#4f46e5" strokeWidth={2} dot={false} name="AI负荷" />
                                        <Line type="stepAfter" dataKey="price" stroke="#f87171" strokeWidth={1.5} dot={false} yAxisId="price" name="电价" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 关键指标 */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2">
                                <div className="text-[10px] text-slate-500">年度节费</div>
                                <div className="text-base font-bold text-emerald-600">¥{simulation.annualSaving.toFixed(1)}</div>
                                <div className="text-[9px] text-slate-400">万元</div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2">
                                <div className="text-[10px] text-slate-500">投资回报</div>
                                <div className="text-base font-bold text-purple-600">{simulation.roi.toFixed(1)}%</div>
                                <div className="text-[9px] text-slate-400">ROI</div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2">
                                <div className="text-[10px] text-slate-500">回收期</div>
                                <div className="text-base font-bold text-blue-600">{simulation.payback.toFixed(1)}</div>
                                <div className="text-[9px] text-slate-400">年</div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2">
                                <div className="text-[10px] text-slate-500">峰谷节省</div>
                                <div className="text-base font-bold text-orange-600">{dynamicSimulation.metrics.peakSavingRate}%</div>
                                <div className="text-[9px] text-slate-400">比例</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
