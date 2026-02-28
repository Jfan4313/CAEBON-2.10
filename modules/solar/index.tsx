import React, { useState } from 'react';
import { useSolarRetrofit, useSolarMetrics } from './hooks';
import { SolarForm } from './components/SolarForm';
import { SolarCharts } from './components/SolarCharts';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const RetrofitSolar: React.FC = () => {
    const {
        currentModule, params, handleUpdate, buildings, setBuildings,
        selfUseMode, setSelfUseMode, calculatedSelfConsumption, setCalculatedSelfConsumption,
        consumptionResult, toggleModule, saveProject, transformers, bills, projectBaseInfo,
        priceConfig, storageModule
    } = useSolarRetrofit();

    const { chartData, longTermMetrics } = useSolarMetrics(params, calculatedSelfConsumption);

    const [isChartExpanded, setIsChartExpanded] = useState(false);
    const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);

    if (!currentModule) return null;

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
                    <SolarForm
                        params={params}
                        handleUpdate={handleUpdate}
                        buildings={buildings}
                        setBuildings={setBuildings}
                        transformers={transformers}
                        bills={bills}
                        projectBaseInfo={projectBaseInfo}
                        currentModule={currentModule}
                        selfUseMode={selfUseMode}
                        setSelfUseMode={setSelfUseMode}
                        calculatedSelfConsumption={calculatedSelfConsumption}
                        setCalculatedSelfConsumption={setCalculatedSelfConsumption}
                        consumptionResult={consumptionResult}
                        storageModule={storageModule}
                    />
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
                            className="px-8 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all flex items-center gap-2"
                        >
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
                                    <Bar dataKey="retrofit" fill="#fbbf24" radius={[2, 2, 0, 0]} />
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

            <SolarCharts
                isChartExpanded={isChartExpanded}
                setIsChartExpanded={setIsChartExpanded}
                isFinancialModalOpen={isFinancialModalOpen}
                setIsFinancialModalOpen={setIsFinancialModalOpen}
                chartData={chartData}
                longTermMetrics={longTermMetrics}
                params={params}
                investment={currentModule.investment}
                handleUpdate={handleUpdate}
            />
        </div>
    );
};

export default RetrofitSolar;
