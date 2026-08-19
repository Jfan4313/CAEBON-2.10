import React, { useMemo, useState } from 'react';
import { useSolarRetrofit, useSolarMetrics, calculateSolarMetrics } from './hooks';
import { SolarParamsState, SolarReportAudience } from './types';
import { SolarForm } from './components/SolarForm';
import { SolarCharts } from './components/SolarCharts';
import SolarReport from './components/SolarReport';
import { SolutionComparison } from './components/SolutionComparison';
import { SolarFinancialDetails } from './components/SolarFinancialDetails';
import { useProject } from '../../context/ProjectContext';
import { isModuleTakenOver } from '../../utils/moduleAggregation';
import { requestReportForModules } from '../../shared/reporting';
import { PvConsumptionChart } from '../../shared/components/PvConsumptionChart';
import { annualizeBillEnergy, buildPvConsumptionProfile } from '../../shared/utils/pvConsumption';
import { getSolarProfileBasis } from '../../shared/utils/solarGenerationProfile';
import { optimizeSolarStorageCapacity } from '../../shared/utils/solarStorageOptimization';

const RetrofitSolar: React.FC = () => {
    const { modules, updateModule } = useProject();
    const isTakenOver = isModuleTakenOver('retrofit-solar', modules);
    const {
        currentModule, params, handleUpdate, buildings, setBuildings,
        selfUseMode, setSelfUseMode, calculatedSelfConsumption, setCalculatedSelfConsumption,
        consumptionResult, toggleModule, saveProject, transformers, bills, projectBaseInfo,
        priceConfig, storageModule, sunHoursSource,
        // 新增：方案和品牌状态
        solutions, selectedSolutionId, currentSolution,
        handleSelectSolution, handleAddSolution, handleUpdateSolution, handleDeleteSolution
    } = useSolarRetrofit();

    const { chartData, longTermMetrics } = useSolarMetrics(params, calculatedSelfConsumption);
    const billedEnergy = useMemo(() => annualizeBillEnergy(bills, {
        projectType: projectBaseInfo.type,
        province: projectBaseInfo.province,
        hasAirConditioning: projectBaseInfo.hasAirConditioning,
    }), [bills, projectBaseInfo.type, projectBaseInfo.province, projectBaseInfo.hasAirConditioning]);
    const pvConsumptionData = useMemo(() => {
        const storageParams = storageModule?.params || {};
        const villaAnnualLoadKwh = projectBaseInfo.type === 'villa'
            ? Math.max(0, Number(projectBaseInfo.villaDailyKwh || 0)) * 365
            : 0;
        const annualLoadKwh = villaAnnualLoadKwh
            || billedEnergy.annualizedKwh
            || transformers.reduce((total, transformer) => total + Number(transformer.capacity || 0), 0) * 0.45 * 2000
            || 1000000;
        return buildPvConsumptionProfile({
            annualLoadKwh,
            projectType: projectBaseInfo.type,
            pvCapacityKw: Number(params.simpleParams.capacity || 0),
            dailySunHours: Number(params.advParams.dailySunHours || 4),
            performanceRatio: Number(params.advParams.prValue || 80) / 100 * Number(params.advParams.azimuthEfficiency || 100) / 100,
            location: {
                latitude: projectBaseInfo.latitude,
                longitude: projectBaseInfo.longitude,
                province: projectBaseInfo.province,
                city: projectBaseInfo.city,
            },
            storage: {
                enabled: Boolean(storageModule?.isActive && storageParams.dispatchMode !== 'hybrid'),
                powerKw: Number(storageParams.basicParams?.power ?? 261),
                capacityKwh: Number(storageParams.basicParams?.capacity ?? 522),
                dod: Number(storageParams.advParams?.dod || 90) / 100,
                rte: Number(storageParams.advParams?.rte || 88) / 100,
            }
        });
    }, [billedEnergy.annualizedKwh, transformers, projectBaseInfo, params.simpleParams.capacity, params.advParams.dailySunHours, params.advParams.prValue, params.advParams.azimuthEfficiency, storageModule]);
    const solarProfileBasis = useMemo(() => getSolarProfileBasis(projectBaseInfo), [projectBaseInfo]);
    const hourlyPrices = useMemo(() => {
        if (priceConfig.mode === 'fixed') return Array(24).fill(Number(priceConfig.fixedPrice || 0));
        if (priceConfig.mode === 'spot') {
            return Array.from({ length: 24 }, (_, hour) => Number(priceConfig.spotPrices?.[hour] || 0));
        }
        return Array.from({ length: 24 }, (_, hour) => {
            const segment = priceConfig.touSegments.find(item => hour >= item.start && hour < item.end);
            return Number(segment?.price || priceConfig.fixedPrice || 0.85);
        });
    }, [priceConfig]);
    const annualLoadKwh = useMemo(() => {
        const villaAnnualLoadKwh = projectBaseInfo.type === 'villa'
            ? Math.max(0, Number(projectBaseInfo.villaDailyKwh || 0)) * 365
            : 0;
        return villaAnnualLoadKwh
            || billedEnergy.annualizedKwh
            || transformers.reduce((total, transformer) => total + Number(transformer.capacity || 0), 0) * 0.45 * 2000
            || 1000000;
    }, [projectBaseInfo.type, projectBaseInfo.villaDailyKwh, billedEnergy.annualizedKwh, transformers]);
    const storageParams = storageModule?.params || {};
    const jointRecommendation = useMemo(() => optimizeSolarStorageCapacity({
        annualLoadKwh,
        projectType: projectBaseInfo.type,
        maxPvCapacityKw: Math.max(0, Number(params.simpleParams.capacity || 0)),
        dailySunHours: Number(params.advParams.dailySunHours || 4),
        performanceRatio: Number(params.advParams.prValue || 80) / 100
            * Number(params.advParams.azimuthEfficiency || 100) / 100,
        location: {
            latitude: projectBaseInfo.latitude,
            longitude: projectBaseInfo.longitude,
            province: projectBaseInfo.province,
            city: projectBaseInfo.city,
        },
        hourlyPrices,
        pvUnitCostYuanPerWp: Number(params.simpleParams.epcPrice || 2),
        storageUnitCostYuanPerKwh: Number(storageParams.basicParams?.unitCost || 1100),
        storageDod: Number(storageParams.advParams?.dod || 90) / 100,
        storageRte: Number(storageParams.advParams?.rte || 88) / 100,
        pvOmYuanPerWYear: Number(params.advParams.omCost || 0.03),
        storageOmRatePercent: Number(projectBaseInfo.omRate || 0),
        discountRatePercent: Number(projectBaseInfo.discountRate || 5),
        horizonYears: Number(params.advParams.projectLifeYears || 10),
        generationDays: Number(params.advParams.generationDays || 365),
        storageOperatingDays: 330,
    }), [
        annualLoadKwh, projectBaseInfo, params.simpleParams.capacity, params.simpleParams.epcPrice,
        params.advParams, hourlyPrices, storageParams,
    ]);

    const [isChartExpanded, setIsChartExpanded] = useState(false);
    const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
    const [isSolarPresentationMode, setIsSolarPresentationMode] = useState(false);
    const [solarReportAudience, setSolarReportAudience] = useState<SolarReportAudience>('owner');
    const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
    const [selectedSolutionForDetails, setSelectedSolutionForDetails] = useState<string | null>(null);

    if (!currentModule) return null;

    const applyJointRecommendation = () => {
        if (currentSolution) {
            handleUpdateSolution(currentSolution.id, { capacity: jointRecommendation.pvCapacityKw });
        } else {
            handleUpdate({
                simpleParams: {
                    ...params.simpleParams,
                    capacity: jointRecommendation.pvCapacityKw,
                },
            });
        }

        const nextStorageParams = {
            ...storageParams,
            dispatchMode: 'pv_surplus',
            basicParams: {
                ...(storageParams.basicParams || {}),
                power: jointRecommendation.storagePowerKw,
                capacity: jointRecommendation.storageCapacityKwh,
                unitCost: Number(storageParams.basicParams?.unitCost || 1100),
            },
            jointRecommendation,
        };
        updateModule('retrofit-storage', {
            isActive: jointRecommendation.storageRecommended,
            params: nextStorageParams,
            kpiPrimary: {
                label: '装机规模',
                value: jointRecommendation.storageRecommended
                    ? `${jointRecommendation.storagePowerKw}kW/${jointRecommendation.storageCapacityKwh}kWh`
                    : '暂不配置',
            },
        });
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
                        {isTakenOver && <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">已纳入综合能源管理</span>}
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => requestReportForModules(['retrofit-solar'])} className="flex items-center gap-2 text-sm text-primary font-bold px-3 py-2 rounded-lg bg-primary/5 hover:bg-primary/10">
                            <span className="material-icons text-base">summarize</span> 光伏独立汇报
                        </button>
                        <button
                            onClick={() => requestReportForModules(['retrofit-solar', 'retrofit-storage'])}
                            disabled={!storageModule?.isActive}
                            title={storageModule?.isActive ? '生成光伏与储能联合方案汇报' : '请先启用储能板块'}
                            className="flex items-center gap-2 text-sm text-white font-bold px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                        >
                            <span className="material-icons text-base">account_tree</span> 光储联合汇报
                        </button>
                    </div>
                </header>

                <div className={`flex-1 overflow-y-auto p-8 pb-32 transition-opacity duration-300 ${currentModule.isActive ? 'opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>
                    <div className="max-w-6xl mx-auto mb-6 rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 shadow-sm">
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 text-emerald-900">
                                        <span className="material-icons text-emerald-600">energy_savings_leaf</span>
                                        <h3 className="font-black">光储联合投资建议</h3>
                                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white">按净现值优化</span>
                                        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                                            {params.simpleParams.operationMode === 'off_grid' ? '离网优化' : '并网保守优化'}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-[11px] text-emerald-700">
                                        先按负荷确定经济光伏容量，再判断储能边际收益；储能不经济时直接建议为0。
                                        {params.simpleParams.operationMode !== 'off_grid' && ' 当前按自发自用价值进行保守测算。'}
                                    </p>
                                </div>
                                <button
                                    onClick={applyJointRecommendation}
                                    disabled={jointRecommendation.decision === 'defer'}
                                    className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                                >
                                    一键应用联合建议
                                </button>
                            </div>
                            <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
                                <div><div className="text-[10px] text-emerald-600">建议光伏</div><div className="text-lg font-black text-emerald-950">{Number(jointRecommendation.pvCapacityKw || 0).toFixed(1)} kWp</div></div>
                                <div><div className="text-[10px] text-emerald-600">建议储能</div><div className="text-lg font-black text-emerald-950">{jointRecommendation.storageRecommended ? `${Number(jointRecommendation.storagePowerKw || 0).toFixed(0)}kW/${Number(jointRecommendation.storageCapacityKwh || 0).toFixed(1)}kWh` : '暂不配置'}</div></div>
                                <div><div className="text-[10px] text-emerald-600">联合投资</div><div className="text-lg font-black text-emerald-950">{Number(jointRecommendation.investmentWan || 0).toFixed(2)} 万</div></div>
                                <div><div className="text-[10px] text-emerald-600">首年净收益</div><div className="text-lg font-black text-emerald-950">{Number(jointRecommendation.firstYearNetBenefitWan || 0).toFixed(2)} 万</div></div>
                                <div><div className="text-[10px] text-emerald-600">静态回本</div><div className="text-lg font-black text-emerald-950">{Number(jointRecommendation.staticPaybackYears || 0) > 0 ? `${Number(jointRecommendation.staticPaybackYears).toFixed(1)} 年` : '暂不投资'}</div></div>
                            </div>
                            <p className="mt-3 text-[11px] font-bold text-emerald-800">{jointRecommendation.reason}</p>
                            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] text-emerald-700">
                                <div className="rounded-lg bg-white/70 px-3 py-2">项目期净现值：<strong>{Number(jointRecommendation.npvWan || 0).toFixed(2)}万</strong></div>
                                <div className="rounded-lg bg-white/70 px-3 py-2">光伏消纳率：<strong>{Number(jointRecommendation.pvSelfConsumptionRate || 0).toFixed(1)}%</strong></div>
                                <div className="rounded-lg bg-white/70 px-3 py-2">年光伏发电：<strong>{(Number(jointRecommendation.annualPvGenerationKwh || 0) / 10000).toFixed(2)}万kWh</strong></div>
                                <div className="rounded-lg bg-white/70 px-3 py-2">年弃光：<strong>{(Number(jointRecommendation.annualCurtailedKwh || 0) / 10000).toFixed(2)}万kWh</strong></div>
                            </div>
                    </div>
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
                        sunHoursSource={sunHoursSource}
                        // 新增：方案和品牌相关
                        solutions={solutions}
                        selectedSolutionId={selectedSolutionId}
                        currentSolution={currentSolution}
                        handleSelectSolution={handleSelectSolution}
                        handleAddSolution={handleAddSolution}
                        handleUpdateSolution={handleUpdateSolution}
                        handleDeleteSolution={handleDeleteSolution}
                    />
                    <div className="max-w-6xl mx-auto mt-6">
                        <PvConsumptionChart
                            data={pvConsumptionData}
                            title="光伏发电与项目消纳曲线"
                            dataBasis={`${billedEnergy.monthCount > 0
                                ? `总用电量来自${billedEnergy.monthCount}个月真实账单并补齐全年；负荷形状按项目类型重构。`
                                : '当前总用电量为估算值，导入账单后将自动归一化重算。'} 光伏曲线依据：${solarProfileBasis}及当地等效日照小时。`}
                        />
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
                            className="px-8 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all flex items-center gap-2"
                        >
                            保存配置 <span className="material-icons text-[18px]">save</span>
                        </button>
                    </div>
                </div>

            </div>

            <aside className={`w-[340px] bg-white border-l border-slate-200 flex flex-col shrink-0 z-20 overflow-y-auto shadow-xl mb-16 transition-all duration-300 ${currentModule.isActive ? '' : 'opacity-60 grayscale'}`}>
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
                            <span className="text-xs font-semibold text-slate-500 uppercase">
                                {params.simpleParams.investmentMode === 'emc'
                                    ? '投资方首年净收益（税后）'
                                    : params.simpleParams.investmentMode === 'co_build'
                                        ? '业主首年综合收益'
                                        : '首年净收益 (税后)'}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-slate-900 tracking-tight">¥ {currentModule.yearlySaving}</span>
                            <span className="text-sm text-slate-500">万元</span>
                        </div>
                    </div>

                    {params.simpleParams.investmentMode === 'emc' && (
                        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="rounded bg-amber-100 p-1.5 text-amber-700"><span className="material-icons text-sm">account_balance_wallet</span></div>
                                    <span className="text-xs font-bold uppercase text-slate-600">EMC投资决策</span>
                                </div>
                                <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold text-white">投资方</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-[10px] text-slate-400">初始投入</p>
                                    <p className="mt-1 font-bold text-slate-900">¥ {Number(longTermMetrics.investorInitialInvestment ?? currentModule.investment).toFixed(2)}万</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400">投资方 IRR</p>
                                    <p className="mt-1 font-bold text-blue-600">{Number(longTermMetrics.investorIrr ?? longTermMetrics.irr ?? 0).toFixed(2)}%</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400">回本周期</p>
                                    <p className="mt-1 font-bold text-orange-600">{Number(longTermMetrics.paybackPeriod ?? 0).toFixed(2)}年</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400">{Math.max(1, Math.round(params.advParams.projectLifeYears || 11))}年净收益</p>
                                    <p className="mt-1 font-bold text-emerald-600">¥ {Number(longTermMetrics.rev25Year ?? 0).toFixed(2)}万</p>
                                </div>
                            </div>
                        </div>
                    )}

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
                        <div className="h-24 w-full pointer-events-none flex items-end gap-1">
                            {chartData.map(item => {
                                const maxValue = Math.max(...chartData.map(row => Number(row.retrofit || 0)), 1);
                                return (
                                    <div key={item.name} className="flex-1 h-full flex items-end">
                                        <div
                                            className="w-full rounded-t-sm bg-amber-400"
                                            style={{ height: `${Math.max(4, Number(item.retrofit || 0) / maxValue * 100)}%` }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors rounded-xl"></div>
                    </div>

                    {/* Financial Detail Trigger */}
                    <div
                        onClick={() => setIsFinancialModalOpen(true)}
                        className="p-4 bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl shadow-lg cursor-pointer hover:shadow-xl transition-all group relative overflow-hidden"
                    >
                        <div className="absolute right-0 top-0 w-16 h-16 bg-white/10 rounded-full -mr-4 -mt-4 blur-xl group-hover:bg-white/20 transition-all"></div>
                        <div className="flex justify-between items-center relative z-10">
                            <div>
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    <span className="material-icons text-sm text-yellow-400">monetization_on</span> 收益详细分析
                                </h4>
                                <p className="text-[10px] text-slate-300 mt-1">查看 {params.advParams.projectLifeYears} 年现金流、IRR、回收期</p>
                            </div>
                            <span className="material-icons text-white/50 group-hover:text-white transition-colors">chevron_right</span>
                        </div>
                    </div>

                    {/* Solar Report Trigger */}
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsSolarPresentationMode(true);
                        }}
                        className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg cursor-pointer hover:shadow-xl transition-all group relative overflow-hidden"
                    >
                        <div className="absolute right-0 top-0 w-16 h-16 bg-white/10 rounded-full -mr-4 -mt-4 blur-xl group-hover:bg-white/20 transition-all"></div>
                        <div className="flex justify-between items-center relative z-10">
                            <div>
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    <span className="material-icons text-sm text-yellow-400">slideshow</span> 光伏PPT演示
                                </h4>
                                <p className="text-[10px] text-blue-100 mt-1">
                                    {params.simpleParams.investmentMode === 'emc'
                                        ? `当前：${solarReportAudience === 'owner' ? '对业主汇报' : '对投资方汇报'}`
                                        : '点击查看项目收益评估PPT演示'}
                                </p>
                            </div>
                            <span className="material-icons text-white/50 group-hover:text-white transition-colors">chevron_right</span>
                        </div>
                    </div>

                    {/* 方案对比触发按钮 */}
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsComparisonModalOpen(true);
                        }}
                        className="p-4 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl shadow-lg cursor-pointer hover:shadow-xl transition-all group relative overflow-hidden"
                    >
                        <div className="absolute right-0 top-0 w-16 h-16 bg-white/10 rounded-full -mr-4 -mt-4 blur-xl group-hover:bg-white/20 transition-all"></div>
                        <div className="flex justify-between items-center relative z-10">
                            <div>
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    <span className="material-icons text-sm text-yellow-400">compare</span> 方案对比分析
                                </h4>
                                <p className="text-[10px] text-purple-100">对比所有方案的财务指标</p>
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

            {/* Solar Report - Direct Presentation Mode */}
            {isSolarPresentationMode && (
                <SolarReport
                    onClose={() => setIsSolarPresentationMode(false)}
                    defaultToPresentationMode={true}
                    selfConsumptionRate={calculatedSelfConsumption}
                    initialAudience={solarReportAudience}
                    onAudienceChange={setSolarReportAudience}
                />
            )}

            {/* 方案对比模态框 */}
            {isComparisonModalOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 animate-in"
                    onClick={() => {
                        setIsComparisonModalOpen(false);
                        setSelectedSolutionForDetails(null);
                    }}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                    <span className="material-icons text-white text-xl">compare_arrows</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">方案对比分析</h2>
                                    <p className="text-sm text-slate-500">对比所有方案的技术参数和财务指标</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsComparisonModalOpen(false);
                                    setSelectedSolutionForDetails(null);
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 transition-all text-slate-500"
                                title="关闭"
                            >
                                <span className="material-icons text-lg">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                            <SolutionComparison
                                solutions={solutions}
                                params={params}
                                selfConsumptionRate={calculatedSelfConsumption}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RetrofitSolar;
