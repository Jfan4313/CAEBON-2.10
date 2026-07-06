import React, { useState, useEffect } from 'react';
import { getSchoolTypeName } from '../../../services/campusConsumption';
import { SolarParamsState, BuildingData, EmcSubMode, SolarSolution, MODULE_BRANDS } from '../types';
import { SunHoursResult } from '../../../services/solarData';
import { SolutionSelector } from './SolutionSelector';
import { ConsumptionRateAnalysis } from './ConsumptionRateAnalysis';
import { ModuleBrandSelector } from './ModuleBrandSelector';
import { LayoutImageUploader } from './LayoutImageUploader';

interface SolarFormProps {
    params: SolarParamsState;
    handleUpdate: (updates: Partial<SolarParamsState>) => void;
    buildings: BuildingData[];
    setBuildings: React.Dispatch<React.SetStateAction<BuildingData[]>>;
    transformers: any[];
    bills: any[];
    projectBaseInfo: any;
    currentModule: any;
    selfUseMode: 'auto' | 'manual';
    setSelfUseMode: (val: 'auto' | 'manual') => void;
    calculatedSelfConsumption: number;
    setCalculatedSelfConsumption: (val: number) => void;
    consumptionResult: any;
    storageModule: any;
    sunHoursSource: SunHoursResult;
    // Solution selector props
    solutions: SolarSolution[];
    selectedSolutionId: string | null;
    currentSolution: SolarSolution | null;
    handleSelectSolution: (id: string) => void;
    handleAddSolution: (solution: SolarSolution) => void;
    handleUpdateSolution: (id: string, updates: Partial<SolarSolution>) => void;
    handleDeleteSolution: (id: string) => void;
}

export const SolarForm: React.FC<SolarFormProps> = ({
    params, handleUpdate, buildings, setBuildings, transformers, bills,
    projectBaseInfo, currentModule, selfUseMode, setSelfUseMode,
    calculatedSelfConsumption, setCalculatedSelfConsumption, consumptionResult, storageModule,
    sunHoursSource,
    solutions, selectedSolutionId, currentSolution,
    handleSelectSolution, handleAddSolution, handleUpdateSolution, handleDeleteSolution
}) => {
    const [showConsumptionDetail, setShowConsumptionDetail] = useState(false);

    // 计算衰减率是否锁定（根据所选组件）
    const selectedSolution = solutions?.find(s => s.id === selectedSolutionId);
    const isDegradationLocked = selectedSolution?.brand && selectedSolution.brand !== 'generic';

    // 当选择了具体组件品牌时，自动填充该品牌的标准衰减率
    // 当选择"通用组件"时，允许手动编辑
    useEffect(() => {
        if (selectedSolution?.brand && selectedSolution.brand !== 'generic') {
            const brandConfig = MODULE_BRANDS[selectedSolution.brand];
            if (brandConfig) {
                // 只在值不同时才更新，避免无限循环
                if (params.advParams.degradationFirstYear !== brandConfig.degradationFirstYear ||
                    params.advParams.degradationLinear !== brandConfig.degradationLinear) {
                    handleUpdate({
                        advParams: {
                            ...params.advParams,
                            degradationFirstYear: brandConfig.degradationFirstYear,
                            degradationLinear: brandConfig.degradationLinear
                        }
                    });
                }
            }
        }
    }, [selectedSolutionId, solutions?.length, selectedSolution?.brand]);

    const toggleBuilding = (id: number) => {
        setBuildings(buildings.map(b => b.id === id ? { ...b, active: !b.active } : b));
    };

    const updateBuildingCapacity = (id: number, val: number) => {
        setBuildings(buildings.map(b => b.id === id ? { ...b, manualCapacity: val } : b));
    };

    const updateBuildingTransformer = (id: number, val: number) => {
        setBuildings(buildings.map(b => b.id === id ? { ...b, transformerId: val } : b));
    };

    const updateCurrentSolution = (updates: Partial<SolarSolution>) => {
        if (selectedSolutionId) {
            handleUpdateSolution(selectedSolutionId, updates);
        }
    };

    const currentEmcSalePrice = params.simpleParams.emcSubMode === 'fixed'
        ? params.advParams.emcFixedPrice
        : params.advParams.emcDiscountPrice;
    const ownerBenchmarkPrice = params.advParams.emcSouthernAveragePrice || params.advParams.electricityPrice;
    const ownerSavingPerKwh = ownerBenchmarkPrice - currentEmcSalePrice;
    const activeBuildings = buildings.filter(b => b.active);
    const activeBuildingArea = activeBuildings.reduce((sum, b) => sum + (Number(b.area) || 0), 0);
    const activeBuildingCapacity = activeBuildings.reduce((sum, b) => sum + (Number(b.manualCapacity) || 0), 0);

    return (
        <div className="solar-apple-shell max-w-6xl mx-auto flex flex-col gap-7">
            {/* --- 楼栋容量配置 --- */}
            <section style={{ order: 1 }} className="solar-apple-section p-6 md:p-8 animate-fade-in">
                <h3 className="solar-apple-title text-base mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="solar-apple-icon material-icons text-[18px]">domain</span> 楼栋容量配置
                </h3>
                <div className="space-y-3">
                    {buildings.map((b) => (
                        <div key={b.id} className={`flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl border transition-all ${b.active ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                            <div className="flex items-center gap-3 flex-1">
                                <input
                                    type="checkbox"
                                    checked={b.active}
                                    onChange={() => toggleBuilding(b.id)}
                                    className="w-5 h-5 accent-primary cursor-pointer shrink-0"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={b.name}
                                            onChange={(e) => {
                                                setBuildings(buildings.map(building => building.id === b.id ? { ...building, name: e.target.value } : building));
                                            }}
                                            className="font-bold text-slate-800 text-sm bg-transparent border-none outline-none focus:bg-slate-50 px-2 py-1 rounded-lg w-full"
                                        />
                                        <span className="material-icons text-slate-300 text-[14px] cursor-pointer hover:text-primary">edit</span>
                                    </div>
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
                                            className="w-24 px-2 py-1.5 text-sm text-right bg-white border border-slate-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
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
                                            className="w-32 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none appearance-none cursor-pointer text-slate-700"
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
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-[10px] text-slate-400 mb-1">启用楼栋</div>
                        <div className="text-sm font-bold text-slate-800">{activeBuildings.length} 栋</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-[10px] text-slate-400 mb-1">可用面积汇总</div>
                        <div className="text-sm font-bold text-slate-800">{activeBuildingArea.toFixed(0)} ㎡</div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="text-[10px] text-blue-500 mb-1">拟装容量汇总</div>
                        <div className="text-sm font-bold text-blue-700">{activeBuildingCapacity.toFixed(2)} kWp</div>
                    </div>
                </div>
            </section>

            {/* --- 方案与组件配置 --- */}
            <section style={{ order: 2 }} className="solar-apple-section p-6 md:p-8 animate-fade-in">
                <h3 className="solar-apple-title text-base mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="solar-apple-icon material-icons text-[18px]">engineering</span> 方案与组件配置
                </h3>
                <SolutionSelector
                    solutions={solutions}
                    selectedSolutionId={selectedSolutionId}
                    defaultCapacity={activeBuildingCapacity || params.simpleParams.capacity}
                    currentSolution={currentSolution}
                    onSelectSolution={handleSelectSolution}
                    onAddSolution={handleAddSolution}
                    onUpdateSolution={handleUpdateSolution}
                    onDeleteSolution={handleDeleteSolution}
                />
            </section>

            {/* --- 消纳率配置 --- */}
            <section style={{ order: 7 }} className="solar-apple-section p-6 md:p-8 animate-fade-in">
                <h3 className="solar-apple-title text-base mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="solar-apple-icon material-icons text-[18px]">analytics</span> 消纳率配置
                </h3>
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    <div className="flex-1 w-full solar-apple-panel p-5 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="text-sm font-bold text-slate-800 block">预估光伏消纳率</span>
                                <span className="text-xs text-slate-400">决定了电费收益与上网收益的比例</span>
                            </div>
                            <div className="solar-apple-segment flex">
                                <button
                                    onClick={() => setSelfUseMode('auto')}
                                    className={`solar-apple-segment-item px-3 py-1.5 text-xs ${selfUseMode === 'auto' ? 'is-active' : ''}`}
                                >
                                    自动测算
                                </button>
                                <button
                                    onClick={() => setSelfUseMode('manual')}
                                    className={`solar-apple-segment-item px-3 py-1.5 text-xs ${selfUseMode === 'manual' ? 'is-active' : ''}`}
                                >
                                    手动设置
                                </button>
                            </div>
                        </div>
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
                    </div>
                    <div className="flex-1 space-y-2">
                        {selfUseMode === 'auto' ? (
                            <div className="text-xs text-slate-500 space-y-1">
                                {projectBaseInfo.type === 'school' ? (
                                    <>
                                        <p className="flex items-center gap-1">
                                            <span className="material-icons text-[12px] text-[#0071e3]">school</span>
                                            <span className="font-bold text-slate-700">{getSchoolTypeName(projectBaseInfo.schoolType || 'university')}消纳率预估</span>
                                        </p>
                                        <p>基于学校类型、储容比、空调配置、节假日等因素综合计算</p>
                                        <button
                                            onClick={() => setShowConsumptionDetail(!showConsumptionDetail)}
                                            className="text-[#0071e3] hover:text-blue-700 flex items-center gap-1 mt-1"
                                        >
                                            <span className="material-icons text-[14px]">info</span>
                                            {showConsumptionDetail ? '隐藏详情' : '查看详情'}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p>基于<span className="font-bold text-slate-700">月度用电量</span>与<span className="font-bold text-slate-700">模拟发电量</span>匹配计算。</p>
                                        <p className="flex items-center gap-1">
                                            <span className="material-icons text-[12px] text-[#0071e3]">info</span>
                                            {bills.length > 0 ? '已关联 12 个月电费单数据' : '未检测到电费单，默认100%'}
                                        </p>
                                    </>
                                )}
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

                {/* 校园消纳率详情面板 */}
                {showConsumptionDetail && consumptionResult && projectBaseInfo.type === 'school' && (
                    <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <span className="material-icons text-[#0071e3]">assessment</span>
                                消纳率计算详情
                            </h4>
                            <button
                                onClick={() => setShowConsumptionDetail(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div className="bg-white p-3 rounded-lg">
                                <p className="text-[10px] text-slate-500 mb-1">最终推荐消纳率</p>
                                <p className="text-2xl font-bold text-primary">{(consumptionResult.recommendedRate * 100).toFixed(1)}%</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg">
                                <p className="text-[10px] text-slate-500 mb-1">考虑节假日后</p>
                                <p className="text-2xl font-bold text-[#0071e3]">{(consumptionResult.vacationAdjustedRate * 100).toFixed(1)}%</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg">
                                <p className="text-[10px] text-slate-500 mb-1">考虑周末后</p>
                                <p className="text-2xl font-bold text-green-600">{(consumptionResult.weekendAdjustedRate * 100).toFixed(1)}%</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg">
                                <p className="text-[10px] text-slate-500 mb-1">储容比</p>
                                <p className="text-lg font-bold text-slate-800">{((storageModule?.params?.capacity || 0) / (params.simpleParams.capacity || 1)).toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 mb-4">
                            <h5 className="text-xs font-bold text-slate-700 mb-3">季节消纳率对比</h5>
                            <div className="grid grid-cols-4 gap-3">
                                {[
                                    { name: '春季', rate: consumptionResult.seasonalRates.spring, color: 'text-green-600' },
                                    { name: '夏季', rate: consumptionResult.seasonalRates.summer, color: 'text-red-600' },
                                    { name: '秋季', rate: consumptionResult.seasonalRates.autumn, color: 'text-amber-600' },
                                    { name: '冬季', rate: consumptionResult.seasonalRates.winter, color: 'text-[#0071e3]' }
                                ].map((season) => (
                                    <div key={season.name} className="text-center">
                                        <p className="text-xs text-slate-500 mb-1">{season.name}</p>
                                        <p className={`text-lg font-bold ${season.color}`}>{(season.rate * 100).toFixed(1)}%</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                            <h5 className="text-xs font-bold text-slate-700 mb-3">计算说明</h5>
                            <div className="space-y-2">
                                {consumptionResult.explanation.map((exp: string, i: number) => (
                                    <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                        <span className="material-icons text-[14px] text-[#0071e3] mt-0.5">check_circle</span>
                                        <span>{exp}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                        <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <span className="material-icons text-[#0071e3] text-[18px]">insights</span>
                            多消纳率影响分析
                        </div>
                        <div className="text-xs text-slate-500 mt-1">对比不同消纳率对累计收益、IRR 和回收期的影响</div>
                    </div>
                    <button
                        onClick={() => handleUpdate({ showConsumptionRateAnalysis: !params.showConsumptionRateAnalysis })}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            params.showConsumptionRateAnalysis
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
                        }`}
                    >
                        <span className="material-icons text-[16px]">{params.showConsumptionRateAnalysis ? 'visibility' : 'visibility_off'}</span>
                        {params.showConsumptionRateAnalysis ? '已启用' : '未启用'}
                    </button>
                </div>

                {params.showConsumptionRateAnalysis && (
                    <ConsumptionRateAnalysis
                        params={params}
                        baseRate={calculatedSelfConsumption}
                        onUpdateRates={(rates) => handleUpdate({ consumptionRateScenarios: rates })}
                    />
                )}
            </section>

            {/* --- 深度财务与工程参数 --- */}
            <section style={{ order: 5 }} className="solar-apple-section p-6 md:p-8 animate-fade-in">
                <h3 className="solar-apple-title text-base mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="solar-apple-icon material-icons text-[18px]">tune</span> 深度财务与工程参数
                </h3>
                <div className="space-y-6">
                    {/* Group 1: Engineering & Design */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">发电测算参数</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500 flex items-center gap-1">
                                    日照时长 (h/day)
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                                        sunHoursSource.source.startsWith('nasa')
                                            ? 'bg-blue-50 text-[#0071e3]'
                                            : sunHoursSource.source === 'default'
                                                ? 'bg-slate-100 text-slate-500'
                                                : 'bg-emerald-50 text-[#0071e3]'
                                    }`}>
                                        {sunHoursSource.label}
                                    </span>
                                </label>
                                <input type="number" step="0.1" value={params.advParams.dailySunHours} onChange={(e) => handleUpdate({ advParams: { ...params.advParams, dailySunHours: parseFloat(e.target.value) } })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                                <span className="text-[10px] text-slate-400">地址变化自动刷新，也可手动覆盖</span>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500">系统综合效率 (%)</label>
                                <input type="number" value={params.advParams.prValue} onChange={(e) => handleUpdate({ advParams: { ...params.advParams, prValue: parseFloat(e.target.value) } })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500">非正南角度效率 (%)</label>
                                <input type="number" value={params.advParams.azimuthEfficiency} onChange={(e) => handleUpdate({ advParams: { ...params.advParams, azimuthEfficiency: parseFloat(e.target.value) } })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500">年发电天数 (天)</label>
                                <input type="number" value={365} disabled className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm outline-none text-slate-500 cursor-not-allowed" />
                                <span className="text-[10px] text-slate-400">固定365天</span>
                            </div>
                        </div>
                    </div>

                    {/* Group 2: Degradation */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center justify-between"><span>组件衰减配置</span><span className="text-[10px] text-slate-400 font-normal">{isDegradationLocked ? "(已根据所选组件自动填充)" : ""}</span></h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500">首年衰减率 (%)</label>
                                <input type="number" step="0.1" value={params.advParams.degradationFirstYear} onChange={(e) => handleUpdate({ advParams: { ...params.advParams, degradationFirstYear: parseFloat(e.target.value) } })} disabled={isDegradationLocked} className={`w-full px-3 py-2 rounded-lg text-sm outline-none ${isDegradationLocked ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white border-slate-200 focus:border-primary"} `} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500">次年起逐年衰减 (%)</label>
                                <input type="number" step="0.05" value={params.advParams.degradationLinear} onChange={(e) => handleUpdate({ advParams: { ...params.advParams, degradationLinear: parseFloat(e.target.value) } })} disabled={isDegradationLocked} className={`w-full px-3 py-2 rounded-lg text-sm outline-none ${isDegradationLocked ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white border-slate-200 focus:border-primary"} `} />
                            </div>
                        </div>
                    </div>

                    {/* Group 3: Financials */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">财务模型参数</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500">上网电价 (元/kWh)</label>
                                <input type="number" value={params.advParams.feedInTariff} step="0.01" onChange={(e) => handleUpdate({ advParams: { ...params.advParams, feedInTariff: parseFloat(e.target.value) } })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500">基准电价 (元/kWh)</label>
                                <input type="number" value={params.advParams.electricityPrice} step="0.01" onChange={(e) => handleUpdate({ advParams: { ...params.advParams, electricityPrice: parseFloat(e.target.value) } })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500">运维费 (元/W/年)</label>
                                <input type="number" value={params.advParams.omCost} step="0.01" onChange={(e) => handleUpdate({ advParams: { ...params.advParams, omCost: parseFloat(e.target.value) } })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500">保险费率 (%)</label>
                                <input type="number" value={params.advParams.insuranceRate} step="0.01" onChange={(e) => handleUpdate({ advParams: { ...params.advParams, insuranceRate: parseFloat(e.target.value) } })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500">收入增值税 (%)</label>
                                <input type="number" value={params.advParams.revenueVatRate} step="0.1" onChange={(e) => handleUpdate({ advParams: { ...params.advParams, revenueVatRate: parseFloat(e.target.value) } })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500">成本进项税 (%)</label>
                                <input type="number" value={params.advParams.costVatRate} step="0.1" onChange={(e) => handleUpdate({ advParams: { ...params.advParams, costVatRate: parseFloat(e.target.value) } })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500">综合税率 (%)</label>
                                <input type="number" value={params.advParams.taxRate} step="0.1" onChange={(e) => handleUpdate({ advParams: { ...params.advParams, taxRate: parseFloat(e.target.value) } })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary font-bold text-slate-700" />
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            {/* --- 组件品牌选择 --- */}
            <section style={{ order: 6 }} className="solar-apple-section p-6 md:p-8 animate-fade-in">
                <h3 className="solar-apple-title text-base mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="solar-apple-icon material-icons text-[18px]">solar_power</span> 组件品牌选择
                </h3>
                {currentSolution && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500">接入电压等级</label>
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button
                                        onClick={() => handleUpdateSolution(currentSolution.id, { connectionType: 'low' })}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${currentSolution.connectionType === 'low' ? 'bg-white text-[#0071e3] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        低压 (380V)
                                    </button>
                                    <button
                                        onClick={() => handleUpdateSolution(currentSolution.id, { connectionType: 'high' })}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${currentSolution.connectionType === 'high' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        高压 (10kV)
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500">线缆材质</label>
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button
                                        onClick={() => handleUpdateSolution(currentSolution.id, { cableType: 'aluminum' })}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${currentSolution.cableType === 'aluminum' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        铝缆 (成本优)
                                    </button>
                                    <button
                                        onClick={() => handleUpdateSolution(currentSolution.id, { cableType: 'copper' })}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${currentSolution.cableType === 'copper' ? 'bg-white text-[#0071e3] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        铜缆 (性能优)
                                    </button>
                                </div>
                            </div>
                        </div>

                        <ModuleBrandSelector
                            selectedBrand={currentSolution.brand}
                            onSelect={(brand) => handleUpdateSolution(currentSolution.id, { brand })}
                        />

                        <div className="pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="material-icons text-[18px] text-primary">map</span>
                                <label className="text-sm font-bold text-slate-700">光伏铺设图</label>
                            </div>
                            <LayoutImageUploader
                                currentImage={currentSolution.layoutImage}
                                onImageChange={(imageData) => handleUpdateSolution(currentSolution.id, { layoutImage: imageData })}
                                canUseSameLayout={solutions.length > 1 && currentSolution.id !== solutions[0].id}
                                usingSameLayout={currentSolution.useSameLayout}
                                onToggleSameLayout={(useSame) => handleUpdateSolution(currentSolution.id, {
                                    useSameLayout: useSame,
                                    layoutImage: useSame ? undefined : currentSolution.layoutImage
                                })}
                            />
                        </div>
                    </div>
                )}
            </section>

            {/* --- 当前方案投资测算 --- */}
            <section style={{ order: 3 }} className="solar-apple-section p-6 md:p-8 animate-fade-in">
                <h3 className="solar-apple-title text-base mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="solar-apple-icon material-icons text-[18px]">paid</span> 当前方案投资测算
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* EMC 合同能源管理专项 - 仅在选择EMC模式时显示 */}
                    {params.simpleParams.investmentMode === 'emc' && (
                        <div className="lg:col-span-4 p-5 solar-apple-panel">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="solar-apple-icon material-icons text-[18px]">handshake</span>
                                <h4 className="text-sm font-black text-[#1d1d1f]">当前方案 EMC 合同能源管理配置</h4>
                            </div>
                            {/* 角色说明 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                <div className="p-3 bg-white rounded-xl border border-slate-200/70 shadow-sm">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                        <span className="text-[10px] font-bold text-slate-600">业主方</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400">提供屋顶资源，享受电价优惠或收益分成，收取屋顶租金</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200/70 shadow-sm">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="w-2 h-2 rounded-full bg-[#0071e3]"></span>
                                        <span className="text-[10px] font-bold text-slate-600">投资方 (EMC公司)</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400">负责投资建设、运维管理，承担投资风险，获取电费收益</p>
                                </div>
                            </div>
                            {/* 子模式切换 */}
                            <div className="mb-4">
                                <label className="text-xs font-bold text-slate-500 mb-2 block">结算方式</label>
                                <div className="grid grid-cols-3 gap-2 p-1 solar-apple-segment rounded-xl">
                                    {[
                                        { id: 'sharing', label: '收益分成', icon: 'pie_chart' },
                                        { id: 'discount', label: '折扣电价', icon: 'sell' },
                                        { id: 'fixed', label: '固定电价', icon: 'price_change' }
                                    ].map((mode) => (
                                        <button
                                            key={mode.id}
                                            onClick={() => {
                                                updateCurrentSolution({ emcSubMode: mode.id as EmcSubMode });
                                            }}
                                            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${params.simpleParams.emcSubMode === mode.id
                                                ? 'bg-white text-[#0071e3] shadow-[0_8px_20px_rgba(0,113,227,0.12)] border border-slate-200'
                                                : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                            <span className="material-icons text-[14px]">{mode.icon}</span>
                                            {mode.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* 条件参数区域 */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {params.simpleParams.emcSubMode === 'sharing' ? (
                                    /* 收益分成模式参数 */
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                            业主分成比例 (%)
                                        </label>
                                        <input
                                            type="number" step="1"
                                            value={params.advParams.emcOwnerShareRate}
                                            onChange={(e) => {
                                                const value = parseFloat(e.target.value) || 0;
                                                updateCurrentSolution({ emcOwnerShareRate: value });
                                            }}
                                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                                        />
                                        <p className="text-[10px] text-slate-400">业主获得自用电费收益的 {params.advParams.emcOwnerShareRate}%，投资方获 {100 - params.advParams.emcOwnerShareRate}%</p>
                                    </div>
                                ) : (
                                    /* 售电价模式参数 */
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3]"></span>
                                            {params.simpleParams.emcSubMode === 'fixed' ? '固定售电价' : '投资方售电价'} (元/kWh)
                                        </label>
                                        <input
                                            type="number" step="0.01"
                                            value={params.simpleParams.emcSubMode === 'fixed' ? params.advParams.emcFixedPrice : params.advParams.emcDiscountPrice}
                                            onChange={(e) => {
                                                const value = parseFloat(e.target.value) || 0;
                                                if (params.simpleParams.emcSubMode === 'fixed') {
                                                    updateCurrentSolution({ emcFixedPrice: value });
                                                } else {
                                                    updateCurrentSolution({ emcDiscountPrice: value });
                                                }
                                            }}
                                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                                        />
                                        <p className="text-[10px] text-slate-400">
                                            业主每度省{' '}
                                            <span className="font-bold text-[#0071e3]">
                                                {ownerSavingPerKwh.toFixed(2)}
                                            </span> 元
                                        </p>
                                    </div>
                                )}
                                {params.simpleParams.emcSubMode !== 'sharing' && (
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                            业主对标电价 (元/kWh)
                                        </label>
                                        <input
                                            type="number" step="0.0001"
                                            value={params.advParams.emcSouthernAveragePrice}
                                            onChange={(e) => {
                                                const value = parseFloat(e.target.value) || 0;
                                                updateCurrentSolution({ emcSouthernAveragePrice: value });
                                            }}
                                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                                        />
                                        <p className="text-[10px] text-slate-400">用于衡量业主省电费，不作为投资方售电收入</p>
                                    </div>
                                )}
                                {/* 通用: 屋顶租金 */}
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                        屋顶租金 (元/㎡/年)
                                    </label>
                                    <input
                                        type="number" step="0.5"
                                        value={params.advParams.roofRent}
                                        onChange={(e) => {
                                            const value = parseFloat(e.target.value) || 0;
                                            updateCurrentSolution({ roofRent: value });
                                        }}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10"
                                    />
                                    <p className="text-[10px] text-slate-400">业主收 → 投资方付 | 年化约 {(params.simpleParams.area * params.advParams.roofRent / 10000).toFixed(3)} 万元</p>
                                </div>
                                {/* 预计对比 */}
                                <div className="space-y-1 bg-white/80 p-3 rounded-xl border border-slate-200/70 shadow-sm">
                                    <span className="text-[10px] font-bold text-slate-500 block mb-1">业主 vs 投资方 (首年预估)</span>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                            <span className="text-[10px] text-slate-600">业主收益:</span>
                                            <span className="text-[10px] font-bold text-[#0071e3]">自动计算</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3]"></span>
                                            <span className="text-[10px] text-slate-600">投资方收益:</span>
                                            <span className="text-[10px] font-bold text-[#0071e3]">自动计算</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="space-y-1.5 lg:col-span-2">
                        <label className="text-xs font-semibold text-slate-500 flex justify-between">
                            建造成本单价 <span className="text-[10px] text-slate-400 font-normal">用于 EPC/EMC 投资模型，参考范围: 2.5-4.0 元/Wp</span>
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                value={params.simpleParams.epcPrice}
                                onChange={(e) => {
                                    const newEpcPrice = parseFloat(e.target.value) || 0;
                                    // Update current solution, which will also sync to simpleParams
                                    if (selectedSolutionId) {
                                        handleUpdateSolution(selectedSolutionId, { epcPrice: newEpcPrice });
                                    } else {
                                        // Fallback if no solution selected
                                        handleUpdate({ simpleParams: { ...params.simpleParams, epcPrice: newEpcPrice } });
                                    }
                                }}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 font-bold shadow-sm"
                            />
                            <span className="absolute right-4 top-3 text-xs text-slate-400 font-medium font-mono">元/Wp</span>
                        </div>
                    </div>
                    <div className="space-y-1.5 lg:col-span-2">
                        <label className="text-xs font-semibold text-slate-500">预估项目总投资额 (Capex)</label>
                        <div className="relative">
                            <input
                                type="text"
                                disabled
                                value={(currentModule?.investment || 0).toFixed(3)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 outline-none"
                            />
                            <span className="absolute right-4 top-3 text-xs text-slate-500 font-medium font-mono">万元</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
