import React, { useState } from 'react';
import { ComposedChart, Line, Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell, Legend } from 'recharts';
import { useProject } from '../context/ProjectContext';
import { useSimulationData, PriceData, FinancialParams } from './hooks/useSimulationHooks';

export default function FinancialAnalysisView() {
    const { modules, updateModule } = useProject();
    const currentModule = modules['retrofit-ai'];
    const savedParams = currentModule.params || {};

    // 仿真参数状态
    const [useSpotPrice, setUseSpotPrice] = useState<boolean>(savedParams.useSpotPrice || false);
    const [isImporting, setIsImporting] = useState(false);
    const [importedPriceData, setImportedPriceData] = useState<PriceData[]>([]);
    const [importFileName, setImportFileName] = useState('');
    const [showImportError, setShowImportError] = useState(false);
    const [importErrorMessage, setImportErrorMessage] = useState('');
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [aiAggressiveness, setAiAggressiveness] = useState<number>(savedParams.aiAggressiveness || 50);

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

    // 保存参数到模块
    React.useEffect(() => {
        updateModule('retrofit-ai', {
            yearlySaving: parseFloat(simulation.netBenefit.toFixed(3)),
            investment: investment,
            kpiPrimary: { label: '综合节能率', value: `${((simulation.annualSaving / simulation.annualBillBase) * 100).toFixed(2)}%` },
            kpiSecondary: { label: 'ROI', value: `${simulation.roi.toFixed(2)}%` },
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
                        hour: item.hour ?? item.小时 ?? item.Hour ?? 0,
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

    if (!currentModule) return null;

    return (
        <div className="flex h-full flex-col bg-slate-50 relative overflow-hidden">
            {/* 顶部控制栏 */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="material-icons text-indigo-600 text-xl">savings</span>
                    <h2 className="text-lg font-bold text-slate-900">投资收益对比</h2>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 左侧：输入参数 */}
                    <div className="space-y-6">
                        {/* 仿真参数 */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
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
                                        onChange={(e) => setAiAggressiveness(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                        <span>保守稳健</span>
                                        <span>激进套利</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 投资成本录入 */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
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
                        </div>

                        {/* ROI Cards */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="material-icons text-slate-400 text-lg">assessment</span>
                                核心投资指标
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex flex-col justify-between h-24">
                                    <div className="text-xs text-purple-600">净收益 (Net Benefit)</div>
                                    <div className="text-2xl font-bold text-purple-700">¥ {simulation.netBenefit.toFixed(3)} <span className="text-sm">万/年</span></div>
                                </div>
                                <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 flex flex-col justify-between h-24">
                                    <div className="text-xs text-orange-600">投资回报率 (ROI)</div>
                                    <div className="text-2xl font-bold text-orange-700">{simulation.roi.toFixed(2)}%</div>
                                </div>
                                <div className="col-span-2 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                                    <div className="text-xs text-emerald-600">静态回收期 (Payback Period)</div>
                                    <div className="text-2xl font-bold text-emerald-700">{simulation.payback.toFixed(2)} <span className="text-sm font-normal text-emerald-600">年</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 右侧：图表 */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* 分项增益分析 */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <span className="material-icons text-indigo-500 text-lg">extension</span>
                                AI 对各分项系统的增益分析 (Sector Impact)
                            </h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={simulation.sectorImpacts} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} width={80} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)' }}
                                            formatter={(val: number) => `¥ ${val.toFixed(3)} 万`}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                        <Bar dataKey="base" name="基础收益 (Manual)" stackId="a" fill="#cbd5e1" barSize={20} radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="ai" name="AI 增强收益" stackId="a" fill="#6366f1" barSize={20} radius={[0, 4, 4, 0]}>
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
                        </div>

                        {/* 现金流图表 */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[350px]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <span className="material-icons text-blue-500 text-lg">waterfall_chart</span>
                                    {analysisPeriod}年累计现金流预测
                                </h3>
                            </div>
                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={simulation.cashFlows} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} label={{ value: '累计收益 (万元)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)' }}
                                            formatter={(val: number) => `¥ ${val.toFixed(3)} 万`}
                                            labelFormatter={(label) => `第 ${label} 年`}
                                        />
                                        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                                        <Bar dataKey="flow" name="年度净现金流" fill="#34d399" barSize={12} radius={[4, 4, 0, 0]}>
                                            {simulation.cashFlows.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.flow >= 0 ? '#34d399' : '#f87171'} />
                                            ))}
                                        </Bar>
                                        <Line type="monotone" dataKey="cumulative" name="累计现金流" stroke="#2563eb" strokeWidth={3} dot={true} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
