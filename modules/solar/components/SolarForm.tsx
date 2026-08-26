import React, { useState, useEffect, useMemo } from 'react';
import { getSchoolTypeName } from '../../../services/campusConsumption';
import { SolarParamsState, BuildingData, EmcSubMode, SolarSolution, MODULE_BRANDS, SOLAR_CONSTRUCTION_METHODS, SolarConstructionMethod, CABLE_BRANDS, INVERTER_BRANDS, SolarCableBrand, SolarInverterBrand, buildDefaultSolarMaterialBill } from '../types';
import { SunHoursResult } from '../../../services/solarData';
import { SolutionSelector } from './SolutionSelector';
import { ConsumptionRateAnalysis } from './ConsumptionRateAnalysis';
import { ModuleBrandSelector } from './ModuleBrandSelector';
import { LayoutImageUploader } from './LayoutImageUploader';
import { MaterialBillEditor } from './MaterialBillEditor';
import { EditableNumberInput } from '../../../shared/components/EditableNumberInput';
import { getGenerationWeightedTariff } from '../utils/emcTariff';

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

    const monthlyEmcTariffs = params.advParams.emcMonthlyTariffs || [];
    const currentEmcSalePrice = params.simpleParams.emcSubMode === 'fixed'
        ? params.advParams.emcFixedPrice
        : getGenerationWeightedTariff(monthlyEmcTariffs, 'discountedPrice', params.advParams.emcDiscountPrice);
    const ownerBenchmarkPrice = params.simpleParams.emcSubMode === 'discount'
        ? getGenerationWeightedTariff(
            monthlyEmcTariffs,
            'benchmarkPrice',
            params.advParams.emcSouthernAveragePrice ?? params.advParams.electricityPrice,
        )
        : params.advParams.emcSouthernAveragePrice ?? params.advParams.electricityPrice;
    const ownerSavingPerKwh = ownerBenchmarkPrice - currentEmcSalePrice;
    const activeBuildings = buildings.filter(b => b.active);
    const activeBuildingArea = activeBuildings.reduce((sum, b) => sum + (Number(b.area) || 0), 0);
    const activeBuildingCapacity = activeBuildings.reduce((sum, b) => sum + (Number(b.manualCapacity) || 0), 0);
    const currentConstructionMethod = currentSolution?.constructionMethod || 'rooftop';
    const isCanopyConstruction = ['color_steel_canopy', 'bipv_canopy', 'daylighting_canopy'].includes(currentConstructionMethod);
    const defaultMaterialBillItems = useMemo(
        () => buildDefaultSolarMaterialBill(
            params.simpleParams.connectionType,
            currentConstructionMethod,
        ),
        [params.simpleParams.connectionType, currentConstructionMethod]
    );
    const materialBillItems = params.materialBillItems?.length ? params.materialBillItems : defaultMaterialBillItems;
    const businessTerms = params.businessTerms;
    const updateBusinessTerms = (updates: Partial<NonNullable<SolarParamsState['businessTerms']>>) => {
        handleUpdate({
            businessTerms: {
                ...businessTerms!,
                ...updates
            }
        });
    };

    return (
        <div className="solar-apple-shell max-w-6xl mx-auto flex flex-col gap-7">
            <section style={{ order: 0 }} className="solar-apple-section p-6 md:p-8 animate-fade-in">
                <h3 className="solar-apple-title text-base mb-4 flex items-center gap-3">
                    <span className="solar-apple-icon material-icons text-[18px]">electrical_services</span> 光伏系统运行方式
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                        onClick={() => handleUpdate({ simpleParams: { ...params.simpleParams, operationMode: 'off_grid' } })}
                        className={`p-4 rounded-xl border text-left transition-all ${params.simpleParams.operationMode === 'off_grid' ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:border-emerald-200'}`}
                    >
                        <div className="font-black text-sm text-slate-800">离网光伏＋配套储能</div>
                        <div className="text-[11px] text-slate-500 mt-1">余电不出售，储能充电不计上网机会成本；放电收益按替代购电计算。</div>
                    </button>
                    <button
                        onClick={() => handleUpdate({ simpleParams: { ...params.simpleParams, operationMode: 'grid_connected' } })}
                        className={`p-4 rounded-xl border text-left transition-all ${params.simpleParams.operationMode !== 'off_grid' ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200'}`}
                    >
                        <div className="font-black text-sm text-slate-800">并网自发自用＋余电上网</div>
                        <div className="text-[11px] text-slate-500 mt-1">未被负荷和储能吸收的电量按上网电价结算。</div>
                    </button>
                </div>
            </section>
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
                {isCanopyConstruction && (
                    <div className="mt-5 rounded-[22px] border border-amber-200 bg-amber-50/70 p-4">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                            <div>
                                <h4 className="text-sm font-black text-amber-900 flex items-center gap-2">
                                    <span className="material-icons text-[18px] text-amber-600">gavel</span>
                                    光伏棚架商务专项
                                </h4>
                                <p className="text-[11px] text-amber-700/80 mt-1">
                                    仅针对当前项目需要时开启，开启后会写入方案汇报的商务方案页。
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleUpdate({ canopyOverheightOwnerResponsibility: !(params.canopyOverheightOwnerResponsibility ?? false) })}
                                className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${params.canopyOverheightOwnerResponsibility ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-amber-200 text-amber-700'}`}
                            >
                                <span className="material-icons text-[15px]">{params.canopyOverheightOwnerResponsibility ? 'check_circle' : 'radio_button_unchecked'}</span>
                                棚架超高，业主责任兜底
                            </button>
                        </div>
                        {params.canopyOverheightOwnerResponsibility && (
                            <textarea
                                value={params.canopyOverheightResponsibilityNote || ''}
                                onChange={(event) => handleUpdate({ canopyOverheightResponsibilityNote: event.target.value })}
                                rows={3}
                                className="mt-3 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200/70"
                            />
                        )}
                    </div>
                )}
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
                                        <p>按电费单年化用电量，结合学校日负荷与光伏出力逐时匹配；储能仅在储能模块启用时计入</p>
                                    </>
                                ) : projectBaseInfo.type === 'villa' ? (
                                    <>
                                        <p className="flex items-center gap-1">
                                            <span className="material-icons text-[12px] text-emerald-600">villa</span>
                                            <span className="font-bold text-slate-700">别墅户用消纳率预估</span>
                                        </p>
                                        <p>按早晚居家双峰、白天低基荷、夏季空调负荷与当地光伏出力逐小时匹配。</p>
                                        <p className="flex items-center gap-1">
                                            <span className="material-icons text-[12px] text-[#0071e3]">info</span>
                                            {bills.length > 0 ? '优先采用电费单并补齐全年' : '未录账单，按建筑面积与户用能耗强度估算'}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p>基于<span className="font-bold text-slate-700">月度用电量</span>与<span className="font-bold text-slate-700">模拟发电量</span>匹配计算。</p>
                                        <p className="flex items-center gap-1">
                                            <span className="material-icons text-[12px] text-[#0071e3]">info</span>
                                            {bills.length > 0 ? '已关联电费单，已按季节模型补齐全年' : '未检测到电费单，将按典型负荷估算'}
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
                                <EditableNumberInput value={params.advParams.feedInTariff} min={0} step="0.01" disabled={params.simpleParams.operationMode === 'off_grid'} onValueChange={(value) => handleUpdate({ advParams: { ...params.advParams, feedInTariff: value } })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary disabled:bg-slate-100 disabled:text-slate-400" />
                                {params.simpleParams.operationMode === 'off_grid' && <span className="text-[10px] text-emerald-600">离网模式不计算余电上网收入</span>}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500">基准电价 (元/kWh)</label>
                                <EditableNumberInput value={params.advParams.electricityPrice} min={0} step="0.01" onValueChange={(value) => handleUpdate({ advParams: { ...params.advParams, electricityPrice: value } })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
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
                                <label className="text-xs text-slate-500">增值税纳税人类型</label>
                                <select
                                    value={params.advParams.vatTaxpayerType}
                                    onChange={(e) => handleUpdate({
                                        advParams: {
                                            ...params.advParams,
                                            vatTaxpayerType: e.target.value as 'small_scale' | 'general'
                                        }
                                    })}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary font-bold text-slate-700"
                                >
                                    <option value="small_scale">小规模纳税人（默认）</option>
                                    <option value="general">一般纳税人</option>
                                </select>
                                <span className="text-[10px] text-slate-400">按项目月均销售额折算：年销售额≤120万元免征，超过时按1%测算</span>
                            </div>
                            {params.advParams.vatTaxpayerType === 'general' && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500">收入增值税 (%)</label>
                                        <input type="number" value={params.advParams.revenueVatRate} step="0.1" onChange={(e) => handleUpdate({ advParams: { ...params.advParams, revenueVatRate: parseFloat(e.target.value) } })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500">成本进项税 (%)</label>
                                        <input type="number" value={params.advParams.costVatRate} step="0.1" onChange={(e) => handleUpdate({ advParams: { ...params.advParams, costVatRate: parseFloat(e.target.value) } })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                                    </div>
                                </>
                            )}
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500">企业所得税口径</label>
                                <select
                                    value={params.advParams.incomeTaxMode}
                                    onChange={(e) => handleUpdate({
                                        advParams: {
                                            ...params.advParams,
                                            incomeTaxMode: e.target.value as 'exempt' | 'small_micro' | 'custom'
                                        }
                                    })}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary font-bold text-slate-700"
                                >
                                    <option value="exempt">免计所得税（离网/户用默认）</option>
                                    <option value="small_micro">小型微利企业（有效税率5%）</option>
                                    <option value="custom">自定义所得税率</option>
                                </select>
                                <span className="text-[10px] text-slate-400">
                                    {params.advParams.incomeTaxMode === 'exempt'
                                        ? '当前收益模型不扣企业所得税；如实际由公司投资并形成应税利润，可切换为小微企业或自定义税率'
                                        : '实际税务资格以投资主体、交易方式及当地执行口径为准'}
                                </span>
                            </div>
                            {params.advParams.incomeTaxMode === 'custom' && (
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500">自定义所得税率 (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={params.advParams.taxRate}
                                        step="0.1"
                                        onChange={(e) => handleUpdate({ advParams: { ...params.advParams, taxRate: parseFloat(e.target.value) || 0 } })}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary font-bold text-slate-700"
                                    />
                                </div>
                            )}
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500">项目剩余周期 (年)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    step="1"
                                    value={params.advParams.projectLifeYears}
                                    onChange={(e) => {
                                        const projectLifeYears = Math.min(30, Math.max(1, Math.round(parseFloat(e.target.value) || 1)));
                                        handleUpdate({
                                            advParams: {
                                                ...params.advParams,
                                                projectLifeYears,
                                                financingTermYears: Math.min(params.advParams.financingTermYears, projectLifeYears),
                                                coBuildTermYears: Math.min(params.advParams.coBuildTermYears, projectLifeYears)
                                            }
                                        });
                                    }}
                                    className="w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm outline-none focus:border-amber-400 font-bold text-amber-800"
                                />
                                <span className="text-[10px] text-amber-600">收益、现金流和发电量均按剩余周期计算</span>
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
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-500">建设方式与效果图</label>
                                <p className="text-[11px] text-slate-400 mt-1">每个方案可独立选择，报告将增加对应的建设效果图页面。</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                                {(Object.keys(SOLAR_CONSTRUCTION_METHODS) as SolarConstructionMethod[]).map(methodId => {
                                    const method = SOLAR_CONSTRUCTION_METHODS[methodId];
                                    const active = (currentSolution.constructionMethod || 'rooftop') === methodId;
                                    return (
                                        <button
                                            key={methodId}
                                            type="button"
                                            onClick={() => handleUpdateSolution(currentSolution.id, { constructionMethod: methodId })}
                                            className={`overflow-hidden rounded-[20px] border text-left transition-all ${active ? 'border-[#0071e3] ring-2 ring-[#0071e3]/15 shadow-lg' : 'border-slate-200 hover:border-slate-300'}`}
                                        >
                                            <div className="h-28 bg-slate-100 overflow-hidden">
                                                <img src={method.image} alt={method.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="p-3 bg-white">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-sm font-bold text-slate-900">{method.name}</span>
                                                    {active && <span className="material-icons text-[#0071e3] text-[18px]">check_circle</span>}
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{method.description}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-bold text-slate-700">电缆品牌</label>
                                    <p className="text-[10px] text-slate-400 mt-1">与上方铜芯/铝芯材质共同组成电缆配置</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.keys(CABLE_BRANDS) as SolarCableBrand[]).map(brandId => {
                                        const cableBrand = CABLE_BRANDS[brandId];
                                        const active = (currentSolution.cableBrand || 'generic') === brandId;
                                        return (
                                            <button
                                                key={brandId}
                                                type="button"
                                                onClick={() => handleUpdateSolution(currentSolution.id, { cableBrand: brandId })}
                                                className={`px-3 py-3 rounded-xl border text-xs font-bold transition-all ${active ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                            >
                                                {cableBrand.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-bold text-slate-700">逆变器品牌</label>
                                    <p className="text-[10px] text-slate-400 mt-1">每个方案独立保存逆变器选型</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.keys(INVERTER_BRANDS) as SolarInverterBrand[]).map(brandId => {
                                        const inverterBrand = INVERTER_BRANDS[brandId];
                                        const active = (currentSolution.inverterBrand || 'generic') === brandId;
                                        return (
                                            <button
                                                key={brandId}
                                                type="button"
                                                onClick={() => handleUpdateSolution(currentSolution.id, { inverterBrand: brandId })}
                                                className={`px-3 py-2.5 rounded-xl border text-left transition-all ${active ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                            >
                                                <span className="block text-xs font-bold">{inverterBrand.name}</span>
                                                <span className="block text-[9px] mt-1 opacity-70">{inverterBrand.description}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

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

            <MaterialBillEditor
                items={materialBillItems}
                onChange={(items) => handleUpdate({ materialBillItems: items })}
                onReset={() => handleUpdate({ materialBillItems: defaultMaterialBillItems })}
                showInReport={params.showMaterialBillInReport ?? false}
                onToggleReport={(show) => handleUpdate({ showMaterialBillInReport: show })}
            />

            <section style={{ order: 9 }} className="solar-apple-section p-6 md:p-8 animate-fade-in">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
                    <div>
                        <h3 className="solar-apple-title text-base flex items-center gap-3">
                            <span className="solar-apple-icon material-icons text-[18px]">contract</span> 商务条件
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-2">用于向业主说明签约年限、结算方式、双方责任和特殊兜底条款。</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => updateBusinessTerms({ showInReport: !(businessTerms?.showInReport ?? true) })}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${(businessTerms?.showInReport ?? true) ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                        <span className="material-icons text-[15px]">{(businessTerms?.showInReport ?? true) ? 'check_circle' : 'radio_button_unchecked'}</span>
                        {(businessTerms?.showInReport ?? true) ? '已加入方案汇报' : '加入方案汇报'}
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        ['contractYears', '签约年限'],
                        ['settlementTerms', '商务结算条件'],
                        ['ownerResponsibilities', '业主责任'],
                        ['investorResponsibilities', '我方/投资方责任'],
                        ['specialTerms', '特殊条款与兜底责任']
                    ].map(([key, label]) => (
                        <div key={key} className={key === 'specialTerms' ? 'md:col-span-2' : ''}>
                            <label className="text-xs font-bold text-slate-500">{label}</label>
                            <textarea
                                rows={key === 'specialTerms' ? 3 : 2}
                                value={String(businessTerms?.[key as keyof typeof businessTerms] || '')}
                                onChange={(event) => updateBusinessTerms({ [key]: event.target.value } as Partial<NonNullable<SolarParamsState['businessTerms']>>)}
                                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10"
                            />
                        </div>
                    ))}
                </div>
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
                                ) : params.simpleParams.emcSubMode === 'discount' ? (
                                    /* 月度南网分时折扣模式 */
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3]"></span>
                                            南网电价折扣 (%)
                                        </label>
                                        <EditableNumberInput
                                            step="1"
                                            min={0}
                                            max={100}
                                            value={params.advParams.emcDiscountRate}
                                            onValueChange={(value) => {
                                                updateCurrentSolution({ emcDiscountRate: Math.min(100, Math.max(0, value)) });
                                            }}
                                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                                        />
                                        <p className="text-[10px] text-slate-400">
                                            年加权基准 {ownerBenchmarkPrice.toFixed(4)} 元/度，
                                            折后约 <span className="font-bold text-[#0071e3]">{currentEmcSalePrice.toFixed(4)}</span> 元/度
                                        </p>
                                    </div>
                                ) : (
                                    /* 固定售电价模式参数 */
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3]"></span>
                                            固定售电价 (元/kWh)
                                        </label>
                                        <EditableNumberInput
                                            step="0.01"
                                            min={0}
                                            value={params.advParams.emcFixedPrice}
                                            onValueChange={(value) => updateCurrentSolution({ emcFixedPrice: value })}
                                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                                        />
                                        <p className="text-[10px] text-slate-400">
                                            业主每度省 <span className="font-bold text-[#0071e3]">{ownerSavingPerKwh.toFixed(2)}</span> 元
                                        </p>
                                    </div>
                                )}
                                {params.simpleParams.emcSubMode === 'fixed' && (
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                            业主对标电价 (元/kWh)
                                        </label>
                                        <EditableNumberInput
                                            step="0.0001"
                                            min={0}
                                            value={params.advParams.emcSouthernAveragePrice}
                                            onValueChange={(value) => updateCurrentSolution({ emcSouthernAveragePrice: value })}
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
                            {params.simpleParams.emcSubMode === 'discount' && (
                                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/40 overflow-hidden">
                                    <div className="px-3 py-2 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-[10px] font-bold text-slate-600">每月南网分时加权折扣电价</p>
                                        <p className="text-[9px] text-slate-400">尖峰/峰/平/谷电量 × 当月单价；缺失月份按负荷模型补齐</p>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-px bg-blue-100">
                                        {monthlyEmcTariffs.map(item => (
                                            <div key={item.month} className="bg-white px-3 py-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-[10px] font-bold text-slate-600">{item.month}月</span>
                                                    <span className={`text-[8px] px-1 py-0.5 rounded ${item.source === 'bill' ? 'bg-green-100 text-green-700' : item.source === 'config' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {item.source === 'bill' ? '账单价' : item.source === 'config' ? '配置价' : '估算'}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-[10px] text-slate-400">
                                                    {item.benchmarkPrice.toFixed(4)} → <span className="font-bold text-[#0071e3]">{item.discountedPrice.toFixed(4)}</span>
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {params.simpleParams.investmentMode === 'financing' && (
                        <div className="lg:col-span-4 p-5 solar-apple-panel">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="solar-apple-icon material-icons text-[18px]">payments</span>
                                <div>
                                    <h4 className="text-sm font-black text-[#1d1d1f]">当前方案融资共建配置</h4>
                                    <p className="text-[10px] text-slate-400 mt-1">业主投入自有资金，融资方提供其余建设资金；运营现金流按等额本息偿还融资。</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500">融资比例 (%)</label>
                                    <input type="number" min="0" max="100" step="1" value={params.advParams.financingRatio}
                                        onChange={(e) => updateCurrentSolution({ financingRatio: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 font-bold" />
                                    <p className="text-[10px] text-slate-400">业主自有资金比例为 {100 - params.advParams.financingRatio}%</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500">融资年利率 (%)</label>
                                    <input type="number" min="0" step="0.1" value={params.advParams.financingAnnualRate}
                                        onChange={(e) => updateCurrentSolution({ financingAnnualRate: Math.max(0, parseFloat(e.target.value) || 0) })}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 font-bold" />
                                    <p className="text-[10px] text-slate-400">用于计算年度等额本息还款额</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500">融资期限 (年)</label>
                                    <input type="number" min="1" max={params.advParams.projectLifeYears} step="1" value={params.advParams.financingTermYears}
                                        onChange={(e) => updateCurrentSolution({ financingTermYears: Math.min(params.advParams.projectLifeYears, Math.max(1, Math.round(parseFloat(e.target.value) || 1))) })}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 font-bold" />
                                    <p className="text-[10px] text-slate-400">融资期满后不再扣除还本付息</p>
                                </div>
                            </div>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="p-3 bg-white rounded-xl border border-slate-200/70">
                                    <p className="text-[10px] text-slate-400">业主初始投入</p>
                                    <p className="text-base font-black text-slate-900">¥ {((currentModule?.investment || 0) * (1 - params.advParams.financingRatio / 100)).toFixed(3)} 万元</p>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                                    <p className="text-[10px] text-purple-500">融资金额</p>
                                    <p className="text-base font-black text-purple-700">¥ {((currentModule?.investment || 0) * params.advParams.financingRatio / 100).toFixed(3)} 万元</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {params.simpleParams.investmentMode === 'co_build' && (
                        <div className="lg:col-span-4 p-5 solar-apple-panel">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="solar-apple-icon material-icons text-[18px]">account_balance</span>
                                <div>
                                    <h4 className="text-sm font-black text-[#1d1d1f]">当前方案股权共建配置</h4>
                                    <p className="text-[10px] text-slate-400 mt-1">双方按持股比例共同出资、同股同酬；合作期内项目按约定电价向业主售电。</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500">我方持股比例 (%)</label>
                                    <input
                                        type="number" min="0" max="100" step="1"
                                        value={params.advParams.coBuildInvestorShareRate}
                                        onChange={(e) => updateCurrentSolution({ coBuildInvestorShareRate: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                                    />
                                    <p className="text-[10px] text-slate-400">业主持股 {100 - params.advParams.coBuildInvestorShareRate}%，项目利润按相同比例分配</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500">合作售电价 (元/kWh)</label>
                                    <EditableNumberInput
                                        min={0} step="0.01"
                                        value={params.advParams.coBuildSalePrice}
                                        onValueChange={(value) => updateCurrentSolution({ coBuildSalePrice: value })}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                                    />
                                    <p className="text-[10px] text-slate-400">业主每度电较基准电价节省 {Math.max(0, params.advParams.electricityPrice - params.advParams.coBuildSalePrice).toFixed(4)} 元</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500">合作期限 (年)</label>
                                    <input
                                        type="number" min="1" step="1"
                                        value={params.advParams.coBuildTermYears}
                                        max={params.advParams.projectLifeYears}
                                        onChange={(e) => updateCurrentSolution({ coBuildTermYears: Math.min(params.advParams.projectLifeYears, Math.max(1, Math.round(parseFloat(e.target.value) || 1))) })}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                                    />
                                    <p className="text-[10px] text-slate-400">合作期限不超过项目剩余周期；本项目按到期终止测算</p>
                                </div>
                            </div>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="p-3 bg-white rounded-xl border border-slate-200/70">
                                    <p className="text-[10px] text-slate-400">我方初始投入（{params.advParams.coBuildInvestorShareRate}%）</p>
                                    <p className="text-base font-black text-slate-900">¥ {((currentModule?.investment || 0) * params.advParams.coBuildInvestorShareRate / 100).toFixed(3)} 万元</p>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                                    <p className="text-[10px] text-purple-500">业主初始投入（{100 - params.advParams.coBuildInvestorShareRate}%）</p>
                                    <p className="text-base font-black text-purple-700">¥ {((currentModule?.investment || 0) * (1 - params.advParams.coBuildInvestorShareRate / 100)).toFixed(3)} 万元</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="space-y-1.5 lg:col-span-2">
                        <label className="text-xs font-semibold text-slate-500 flex justify-between">
                            建造成本单价 <span className="text-[10px] text-slate-400 font-normal">用于 EPC/EMC/融资共建/股权共建投资模型，参考范围: 2.5-4.0 元/Wp</span>
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
