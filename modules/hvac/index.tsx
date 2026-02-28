import React from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area, ReferenceLine } from 'recharts';
import { useHvacLogic } from './hooks';
import { HvacBuildingCard } from './components/HvacBuildingCard';

const RetrofitHVAC: React.FC = () => {
    const {
        mode, setMode,
        globalParams, setGlobalParams,
        schedule, setSchedule,
        hvacBuildings,
        isChartExpanded, setIsChartExpanded,
        isFinancialModalOpen, setIsFinancialModalOpen,
        financials,
        chartData,
        currentModule,
        toggleModule,
        saveProject,
        toggleBuilding,
        updateBuildingRunHours,
        updateBuildingStrategy,
        updateBuildingSimpleField
    } = useHvacLogic();

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
                                            onChange={(e) => setGlobalParams({ ...globalParams, electricityPrice: parseFloat(e.target.value) })}
                                            disabled={mode === 'advanced'}
                                            className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none bg-white ${mode === 'advanced' ? 'text-slate-500 bg-slate-50' : 'focus:border-primary'}`}
                                        />
                                        {mode === 'advanced' && (
                                            <div className="absolute right-2 top-2 text-[10px] text-slate-400">
                                                基于 {schedule.start}:00-{schedule.end}:00
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Gas Price calculation for CCHP */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-500">天然气单价 (元/m³) - 三联供选项用</label>
                                    <input
                                        type="number" step="0.1"
                                        value={globalParams.gasPrice}
                                        onChange={(e) => setGlobalParams({ ...globalParams, gasPrice: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:border-orange-400 outline-none"
                                    />
                                </div>

                                {/* Original COP */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-500">改造前平均COP (全局参考)</label>
                                    <input
                                        type="number" step="0.1"
                                        value={globalParams.currentAvgCOP}
                                        onChange={(e) => setGlobalParams({ ...globalParams, currentAvgCOP: parseFloat(e.target.value) })}
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
                                                    onChange={(e) => setSchedule({ ...schedule, start: parseInt(e.target.value) })}
                                                    className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm text-center outline-none focus:border-primary"
                                                />
                                                <span className="text-slate-400">-</span>
                                                <input
                                                    type="number" min="0" max="24"
                                                    value={schedule.end}
                                                    onChange={(e) => setSchedule({ ...schedule, end: parseInt(e.target.value) })}
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
                                                        onChange={(e) => setGlobalParams({ ...globalParams, discountRate: parseFloat(e.target.value) })}
                                                        className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm text-center outline-none focus:border-primary"
                                                    />
                                                    <span className="absolute right-1 top-2.5 text-[9px] text-slate-400">%</span>
                                                </div>
                                                <div className="relative flex-1">
                                                    <input
                                                        type="number" step="0.1" value={globalParams.maintenanceGrowth}
                                                        onChange={(e) => setGlobalParams({ ...globalParams, maintenanceGrowth: parseFloat(e.target.value) })}
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
                                            onClick={() => setGlobalParams({ ...globalParams, investmentMode: invMode.id as any })}
                                            className={`flex-1 flex flex-col items-center p-4 rounded-xl border-2 transition-all gap-2 ${globalParams.investmentMode === invMode.id
                                                ? 'border-red-500 bg-red-50 text-red-700'
                                                : 'border-slate-100 bg-white hover:border-slate-200 text-slate-500 hover:bg-slate-50'
                                                }`}
                                        >
                                            <span className={`material-icons text-3xl ${globalParams.investmentMode === invMode.id ? 'text-red-500' : 'text-slate-400'}`}>
                                                {invMode.icon}
                                            </span>
                                            <span className="text-sm font-bold">{invMode.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* EMC Specific Parameters */}
                                {globalParams.investmentMode === 'emc' && (
                                    <div className="p-5 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                                        <h4 className="text-xs font-bold text-orange-800 uppercase mb-4 flex items-center gap-1">
                                            <span className="material-icons text-[14px]">handshake</span> EMC 节能分成模式配置
                                        </h4>

                                        {/* 角色说明 */}
                                        <div className="flex gap-3 mb-4">
                                            <div className="flex-1 p-2.5 bg-white rounded-lg border border-orange-100">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                    <span className="text-[10px] font-bold text-slate-600">业主方</span>
                                                </div>
                                                <p className="text-[10px] text-slate-400">零投资，享受节能降费的分成收益</p>
                                            </div>
                                            <div className="flex-1 p-2.5 bg-white rounded-lg border border-orange-100">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                                    <span className="text-[10px] font-bold text-slate-600">投资方 (EMC公司)</span>
                                                </div>
                                                <p className="text-[10px] text-slate-400">负责投资建设冷站/设备，获取主要节能收益分成</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs text-orange-700 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                    业主节能分成比例 (%)
                                                </label>
                                                <input
                                                    type="number" step="1"
                                                    value={globalParams.emcOwnerShareRate}
                                                    onChange={(e) => setGlobalParams({ ...globalParams, emcOwnerShareRate: parseFloat(e.target.value) })}
                                                    className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm outline-none focus:border-orange-400 font-bold"
                                                />
                                                <p className="text-[10px] text-orange-400">业主获得节能效益的 {globalParams.emcOwnerShareRate}%</p>
                                            </div>
                                        </div>
                                    </div>
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
                                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> 三联供(CCHP)</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {hvacBuildings.map((b) => (
                                    <HvacBuildingCard
                                        key={b.id}
                                        building={b}
                                        mode={mode}
                                        globalParams={globalParams}
                                        toggleBuilding={toggleBuilding}
                                        updateBuildingRunHours={updateBuildingRunHours}
                                        updateBuildingStrategy={updateBuildingStrategy}
                                        updateBuildingSimpleField={updateBuildingSimpleField}
                                    />
                                ))}
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
                            <span className="text-xs font-semibold text-slate-500 uppercase">当前视角年净收益</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-slate-900 tracking-tight">¥ {currentModule.yearlySaving}</span>
                            <span className="text-sm text-slate-500">万元</span>
                        </div>
                        {globalParams.investmentMode === 'emc' && (
                            <div className="mt-2 text-xs font-medium text-blue-500 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                业主分账: 加入汇总
                            </div>
                        )}
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

                    {financials.cchpGasCost > 0 && (
                        <div className="bg-white p-4 rounded-xl border border-orange-200 shadow-sm relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 text-orange-100/50">
                                <span className="material-icons" style={{ fontSize: '100px' }}>local_fire_department</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2 relative z-10">
                                <div className="p-1.5 bg-orange-100 rounded text-orange-600"><span className="material-icons text-sm">local_fire_department</span></div>
                                <span className="text-xs font-semibold text-slate-500 uppercase">年天然气采购成本</span>
                            </div>
                            <div className="flex items-baseline gap-2 relative z-10">
                                <span className="text-2xl font-bold text-orange-600 tracking-tight">- ¥ {financials.cchpGasCost}</span>
                                <span className="text-sm text-slate-500">万元</span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-400 relative z-10">
                                三联供(CCHP)专项支出，已在净收益中扣减
                            </div>
                        </div>
                    )}

                    {/* Clickable Chart */}
                    <div
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer group hover:border-primary/50 relative"
                        onClick={() => setIsChartExpanded(true)}
                    >
                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-100 rounded text-indigo-600"><span className="material-icons text-sm">insert_chart</span></div>
                                <span className="text-xs font-semibold text-slate-500 uppercase">月度耗电对比</span>
                            </div>
                            <span className="material-icons text-slate-300 text-sm group-hover:text-primary">open_in_full</span>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 h-24 opacity-60 pointer-events-none group-hover:opacity-100 transition-opacity">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorRetrofit" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="base" stroke="#94a3b8" fillOpacity={1} fill="url(#colorBase)" strokeWidth={1} />
                                    <Area type="monotone" dataKey="retrofit" stroke="#10b981" fillOpacity={1} fill="url(#colorRetrofit)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="h-24 w-full flex items-center justify-center pointer-events-none z-10 relative"></div>
                    </div>

                    <button
                        onClick={() => setIsFinancialModalOpen(true)}
                        className="w-full py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-primary/30 transition-all flex justify-center items-center gap-2"
                    >
                        <span className="material-icons text-slate-400">request_quote</span>
                        查看详细财务分析测算表
                    </button>
                    <div className="text-xs text-slate-400 mt-2 px-2">
                        *注：此预估未包含设备残值及未来的电价波动风险。IRR {financials.irr}% / 静态回本 {financials.paybackPeriod} 年。
                    </div>
                </div>
            </aside>

            {/* Expanded Chart Modal */}
            {isChartExpanded && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6" onClick={() => setIsChartExpanded(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-5xl h-[600px] shadow-2xl p-8 flex flex-col relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                    <span className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><span className="material-icons">insert_chart</span></span>
                                    全年逐月耗电对比分析
                                </h2>
                            </div>
                            <button onClick={() => setIsChartExpanded(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                                <span className="material-icons text-2xl">close</span>
                            </button>
                        </div>
                        <div className="flex-1 w-full min-h-0 bg-slate-50 rounded-xl border border-slate-100 p-6 pt-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barSize={32}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10}
                                        label={{ value: '耗电量 (万kWh)', angle: -90, position: 'insideLeft', offset: -10, style: { textAnchor: 'middle', fill: '#94a3b8', fontSize: 12 } }} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(226, 232, 240, 0.4)' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                                    <Bar dataKey="base" name="改造前预估" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="retrofit" name="改造后预估" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Financial Modal */}
            {isFinancialModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6" onClick={() => setIsFinancialModalOpen(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-4xl h-[700px] shadow-2xl p-8 flex flex-col relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                    <span className="p-2 bg-green-100 text-green-600 rounded-lg"><span className="material-icons">request_quote</span></span>
                                    核心财务指标概览
                                </h2>
                            </div>
                            <button onClick={() => setIsFinancialModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                                <span className="material-icons text-2xl">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="grid grid-cols-3 gap-6 mb-8">
                                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                    <div className="text-sm text-slate-500 mb-1">内部收益率 (IRR)</div>
                                    <div className="text-3xl font-bold text-slate-800">{financials.irr}%</div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                    <div className="text-sm text-slate-500 mb-1">静态投资回收期</div>
                                    <div className="text-3xl font-bold text-slate-800">{financials.paybackPeriod} <span className="text-sm font-normal text-slate-500">年</span></div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                    <div className="text-sm text-slate-500 mb-1">生命周期总净现值 (NPV)</div>
                                    <div className="text-3xl font-bold text-slate-800">
                                        {(financials.cashFlows.reduce((acc, val, i) => acc + val / Math.pow(1 + globalParams.discountRate / 100, i), 0)).toFixed(1)} <span className="text-sm font-normal text-slate-500">万元</span>
                                    </div>
                                </div>
                            </div>

                            <h3 className="font-bold text-slate-800 mb-4 border-l-4 border-primary pl-2">生命周期现金流 (15年)</h3>
                            <div className="h-64 w-full bg-slate-50 rounded-xl border border-slate-200 p-4 mb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={financials.cashFlows.map((f, i) => ({ year: `第${i}年`, value: f }))}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                                        <ReferenceLine y={0} stroke="#cbd5e1" />
                                        <Bar dataKey="value">
                                            {financials.cashFlows.map((entry, index) => (
                                                <cell key={`cell-${index}`} fill={entry < 0 ? '#ef4444' : '#10b981'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-xs text-slate-500 bg-blue-50 p-3 rounded">说明: 第0年为初始改造投资支出（负值），第1-15年为节约电费带来的净现金流入（正值）。由于设备老化和维保费用增加（设定增速：{globalParams.maintenanceGrowth}%/年），后期收益可能会略有衰减，图中已做近似平滑化处理以供参考。</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RetrofitHVAC;
