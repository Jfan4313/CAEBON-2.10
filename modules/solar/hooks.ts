import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { calculateCampusConsumptionRate, ConsumptionResult } from '../../services/campusConsumption';
import { getLocalSunHoursInfo, SunHoursResult } from '../../services/solarData';
import { fetchNasaSolarData } from '../../services/nasaPower';
import { DEFAULTS, SolarParamsState, BuildingData, DEFAULT_SOLUTIONS, SolarSolution, MODULE_BRANDS, EmcSubMode, InvestmentMode } from './types';

const getAverageElectricityPrice = (priceConfig: any, fallback = DEFAULTS.advParams.electricityPrice) => {
    if (!priceConfig) return fallback;

    if (priceConfig.mode === 'fixed') {
        return Number(priceConfig.fixedPrice) || fallback;
    }

    if (priceConfig.mode === 'tou') {
        const segments = priceConfig.touSegments || [];
        const totalDuration = segments.reduce((sum: number, seg: any) => sum + (Number(seg.end) - Number(seg.start)), 0);
        const weightedSum = segments.reduce((sum: number, seg: any) => sum + Number(seg.price) * (Number(seg.end) - Number(seg.start)), 0);
        return totalDuration > 0 ? weightedSum / totalDuration : fallback;
    }

    if (priceConfig.mode === 'spot') {
        const prices = priceConfig.spotPrices || [];
        const avgSpotPrice = prices.reduce((sum: number, p: number) => sum + Number(p), 0) / prices.length;
        return avgSpotPrice || fallback;
    }

    return fallback;
};

const getSolutionInvestmentMode = (solution?: SolarSolution | null): InvestmentMode => solution?.investmentMode || 'epc';

const getSolutionEmcSubMode = (solution?: SolarSolution | null, fallback: EmcSubMode = 'sharing'): EmcSubMode => {
    return solution?.emcSubMode || fallback;
};

const applySolutionToParams = (params: SolarParamsState, solution?: SolarSolution | null): SolarParamsState => {
    if (!solution) return params;

    const brandConfig = MODULE_BRANDS[solution.brand];

    return {
        ...params,
        selectedSolutionId: solution.id,
        simpleParams: {
            ...params.simpleParams,
            capacity: solution.capacity ?? params.simpleParams.capacity,
            epcPrice: solution.epcPrice,
            connectionType: solution.connectionType,
            investmentMode: getSolutionInvestmentMode(solution),
            emcSubMode: getSolutionEmcSubMode(solution, params.simpleParams.emcSubMode)
        },
        advParams: {
            ...params.advParams,
            degradationFirstYear: brandConfig ? brandConfig.degradationFirstYear : params.advParams.degradationFirstYear,
            degradationLinear: brandConfig ? brandConfig.degradationLinear : params.advParams.degradationLinear,
            emcOwnerShareRate: solution.emcOwnerShareRate ?? params.advParams.emcOwnerShareRate,
            emcDiscountPrice: solution.emcDiscountPrice ?? params.advParams.emcDiscountPrice,
            emcFixedPrice: solution.emcFixedPrice ?? params.advParams.emcFixedPrice,
            emcSouthernAveragePrice: solution.emcSouthernAveragePrice ?? params.advParams.emcSouthernAveragePrice,
            roofRent: solution.roofRent ?? params.advParams.roofRent
        }
    };
};

const getEffectiveEmcSalePrice = (params: SolarParamsState) => {
    switch (params.simpleParams.emcSubMode) {
        case 'fixed':
            return params.advParams.emcFixedPrice;
        case 'discount':
        case 'southern_average':
        default:
            return params.advParams.emcDiscountPrice;
    }
};

const getOwnerBenchmarkPrice = (params: SolarParamsState) => {
    return params.advParams.emcSouthernAveragePrice || params.advParams.electricityPrice;
};

const normalizeLegacySolutionPrice = (solution: SolarSolution) => {
    const legacyDefaultPrices: Record<string, number> = {
        'solution-1': 3.2,
        'solution-2': 3.5,
        'solution-3': 3.4
    };
    return legacyDefaultPrices[solution.id] === solution.epcPrice
        ? DEFAULT_SOLUTIONS.find(item => item.id === solution.id)?.epcPrice ?? solution.epcPrice
        : solution.epcPrice;
};

const isClose = (value: unknown, target: number, tolerance = 0.0001) => (
    typeof value === 'number' && Number.isFinite(value) && Math.abs(value - target) <= tolerance
);

const hasLegacyExcelMismatchDefaults = (advParams: Partial<SolarParamsState['advParams']>) => {
    return isClose(advParams.electricityPrice, 0.85)
        || isClose(advParams.prValue, 82)
        || isClose(advParams.azimuthEfficiency, 98)
        || isClose(advParams.degradationFirstYear, 2)
        || isClose(advParams.degradationLinear, 0.55)
        || isClose(advParams.omCost, 0.05)
        || isClose(advParams.insuranceRate, 0.2);
};

const normalizeLegacyAdvParams = (advParams: Partial<SolarParamsState['advParams']>) => {
    const normalized = { ...advParams };

    if (normalized.electricityPrice === undefined || isClose(normalized.electricityPrice, 0.85)) {
        normalized.electricityPrice = DEFAULTS.advParams.electricityPrice;
    }
    if (normalized.dailySunHours === undefined || isClose(normalized.dailySunHours, 3.8)) {
        normalized.dailySunHours = DEFAULTS.advParams.dailySunHours;
    }
    if (normalized.prValue === undefined || isClose(normalized.prValue, 82)) {
        normalized.prValue = DEFAULTS.advParams.prValue;
    }
    if (normalized.azimuthEfficiency === undefined || isClose(normalized.azimuthEfficiency, 98)) {
        normalized.azimuthEfficiency = DEFAULTS.advParams.azimuthEfficiency;
    }
    if (normalized.degradationFirstYear === undefined || isClose(normalized.degradationFirstYear, 2)) {
        normalized.degradationFirstYear = DEFAULTS.advParams.degradationFirstYear;
    }
    if (normalized.degradationLinear === undefined || isClose(normalized.degradationLinear, 0.55)) {
        normalized.degradationLinear = DEFAULTS.advParams.degradationLinear;
    }
    if (normalized.feedInTariff === undefined || isClose(normalized.feedInTariff, 0.35)) {
        normalized.feedInTariff = DEFAULTS.advParams.feedInTariff;
    }
    if (normalized.omCost === undefined || isClose(normalized.omCost, 0.05)) {
        normalized.omCost = DEFAULTS.advParams.omCost;
    }
    if (normalized.insuranceRate === undefined || isClose(normalized.insuranceRate, 0.2)) {
        normalized.insuranceRate = DEFAULTS.advParams.insuranceRate;
    }

    normalized.revenueVatRate = normalized.revenueVatRate ?? DEFAULTS.advParams.revenueVatRate;
    normalized.costVatRate = normalized.costVatRate ?? DEFAULTS.advParams.costVatRate;
    normalized.constructionVatRate = normalized.constructionVatRate ?? DEFAULTS.advParams.constructionVatRate;
    normalized.vatSurchargeRate = normalized.vatSurchargeRate ?? DEFAULTS.advParams.vatSurchargeRate;
    normalized.vatOffsetElectricityPrice = normalized.vatOffsetElectricityPrice ?? DEFAULTS.advParams.vatOffsetElectricityPrice;

    return normalized;
};

const getSolarInvestment = (params: SolarParamsState) => {
    const selectedSolution = (params.solutions || []).find(s => s.id === params.selectedSolutionId);
    const capacity = selectedSolution?.capacity ?? params.simpleParams.capacity ?? 0;
    const epcPrice = selectedSolution?.epcPrice ?? params.simpleParams.epcPrice;
    const connectionType = selectedSolution?.connectionType || params.simpleParams.connectionType;
    const voltageUpgradeCost = connectionType === 'high'
        ? (selectedSolution?.voltageUpgradeCost || 15)
        : 0;
    const baseInvestment = capacity * epcPrice / 10;

    return {
        capacity,
        selectedSolution,
        epcPrice,
        voltageUpgradeCost,
        investment: parseFloat((baseInvestment + voltageUpgradeCost).toFixed(3))
    };
};

const getDegradationFactor = (params: SolarParamsState, year: number) => {
    const firstYearLoss = params.advParams.degradationFirstYear / 100;
    const annualLinearLoss = params.advParams.degradationLinear / 100;
    return Math.max(0, 1 - firstYearLoss - Math.max(0, year - 1) * annualLinearLoss);
};

const calculateIRRFromCashFlows = (cashFlows: number[]) => {
    const hasPositive = cashFlows.some(v => v > 0);
    const hasNegative = cashFlows.some(v => v < 0);
    if (!hasPositive || !hasNegative) return 0;

    const npv = (rate: number) => cashFlows.reduce((sum, flow, index) => sum + flow / Math.pow(1 + rate, index), 0);
    let low = -0.99;
    let high = 5;
    let lowValue = npv(low);
    let highValue = npv(high);

    while (lowValue * highValue > 0 && high < 100) {
        high *= 2;
        highValue = npv(high);
    }

    if (lowValue * highValue > 0) return 0;

    for (let i = 0; i < 100; i++) {
        const mid = (low + high) / 2;
        const midValue = npv(mid);
        if (Math.abs(midValue) < 0.000001) return parseFloat((mid * 100).toFixed(2));
        if (lowValue * midValue <= 0) {
            high = mid;
            highValue = midValue;
        } else {
            low = mid;
            lowValue = midValue;
        }
    }

    return parseFloat((((low + high) / 2) * 100).toFixed(2));
};

const calculateSolarYearResult = (
    params: SolarParamsState,
    selfRate: number,
    year: number,
    investment: number,
    capacity: number
) => {
    const degradation = getDegradationFactor(params, year);
    const generation = capacity * params.advParams.dailySunHours * params.advParams.generationDays
        * (params.advParams.prValue / 100) * (params.advParams.azimuthEfficiency / 100) * degradation / 10000;

    const selfUseGen = generation * (selfRate / 100);
    const gridGen = generation * (1 - selfRate / 100);
    const revenueTaxFactor = 1 + ((params.advParams.revenueVatRate ?? 0) / 100);
    const costTaxFactor = 1 + ((params.advParams.costVatRate ?? 0) / 100);

    const totalSelfUseRevenue = selfUseGen * params.advParams.electricityPrice / revenueTaxFactor;
    const gridRevenue = gridGen * params.advParams.feedInTariff / revenueTaxFactor;
    const roofRentIncome = params.simpleParams.area * params.advParams.roofRent / 10000;

    let investorRevenue = 0;
    let ownerBenefit = 0;

    if (params.simpleParams.investmentMode === 'emc') {
        if (params.simpleParams.emcSubMode === 'sharing') {
            const ownerShare = params.advParams.emcOwnerShareRate / 100;
            ownerBenefit = totalSelfUseRevenue * ownerShare + roofRentIncome;
            investorRevenue = totalSelfUseRevenue * (1 - ownerShare) + gridRevenue - roofRentIncome;
        } else {
            const salePrice = getEffectiveEmcSalePrice(params);
            const benchmarkPrice = getOwnerBenchmarkPrice(params);
            const saleRevenue = selfUseGen * salePrice / revenueTaxFactor;
            ownerBenefit = selfUseGen * (benchmarkPrice - salePrice) + roofRentIncome;
            investorRevenue = saleRevenue + gridRevenue - roofRentIncome;
        }
    } else {
        investorRevenue = totalSelfUseRevenue + gridRevenue;
        ownerBenefit = investorRevenue;
    }

    const omCost = capacity * params.advParams.omCost / 10 / costTaxFactor;
    const insuranceCost = investment * (params.advParams.insuranceRate / 100) / costTaxFactor;
    const opex = omCost + insuranceCost;
    const taxableIncome = investorRevenue - opex;
    const tax = taxableIncome > 0 ? taxableIncome * (params.advParams.taxRate / 100) : 0;
    const netIncome = investorRevenue - opex - tax;

    return {
        year,
        generation: parseFloat(generation.toFixed(3)),
        revenue: parseFloat(investorRevenue.toFixed(3)),
        ownerBenefit: parseFloat(ownerBenefit.toFixed(3)),
        opex: parseFloat(opex.toFixed(3)),
        tax: parseFloat(tax.toFixed(3)),
        netIncome: parseFloat(netIncome.toFixed(3)),
        selfUseGen,
        selfUseRevenueNet: totalSelfUseRevenue,
        gridRevenueNet: gridRevenue,
        costNet: opex
    };
};

const calculateExcelStyleTax = (
    params: SolarParamsState,
    results: Array<{ selfUseGen: number; selfUseRevenueNet: number; gridRevenueNet: number; costNet: number }>,
    investment: number,
    year: number
) => {
    const revenueVatRate = (params.advParams.revenueVatRate ?? 0) / 100;
    const costVatRate = (params.advParams.costVatRate ?? 0) / 100;
    const constructionVatRate = (params.advParams.constructionVatRate ?? 0) / 100;
    const vatSurchargeRate = (params.advParams.vatSurchargeRate ?? 0) / 100;
    const constructionInputVat = constructionVatRate > 0
        ? (investment / (1 + constructionVatRate)) * constructionVatRate
        : 0;

    const vatBasis = (item: { selfUseGen: number; selfUseRevenueNet: number; gridRevenueNet: number; costNet: number }) => {
        const vatOffsetPrice = params.advParams.vatOffsetElectricityPrice ?? params.advParams.electricityPrice;
        const selfUseVatOffset = revenueVatRate > 0
            ? item.selfUseGen * vatOffsetPrice / (1 + revenueVatRate) * revenueVatRate
            : 0;
        const gridOutputVat = item.gridRevenueNet * revenueVatRate;
        const outputVat = selfUseVatOffset + gridOutputVat;
        const inputVat = item.costNet * costVatRate;
        return outputVat - inputVat;
    };

    const taxableVat = year <= 2
        ? results.slice(0, year).reduce((sum, item) => sum + vatBasis(item), -constructionInputVat)
        : vatBasis(results[year - 1]);
    const vatPayable = Math.max(0, taxableVat);
    const surcharge = vatPayable * vatSurchargeRate;

    return vatPayable + surcharge;
};

export const useSolarRetrofit = () => {
    const { modules, toggleModule, updateModule, saveProject, transformers, bills, projectBaseInfo, priceConfig } = useProject();
    const currentModule = modules['retrofit-solar'];
    const southernAveragePrice = parseFloat(getAverageElectricityPrice(priceConfig).toFixed(4));
    const rawStoredAdvParams = currentModule?.params?.advParams || {};
    const shouldMigrateExcelDefaults = hasLegacyExcelMismatchDefaults(rawStoredAdvParams);
    const storedAdvParams = normalizeLegacyAdvParams(rawStoredAdvParams);
    const normalizedSolutions: SolarSolution[] = (currentModule?.params?.solutions || DEFAULTS.solutions).map((solution: SolarSolution) => ({
        ...solution,
        epcPrice: normalizeLegacySolutionPrice(solution),
        investmentMode: solution.investmentMode || 'epc',
        emcSubMode: solution.emcSubMode || DEFAULTS.simpleParams.emcSubMode,
        emcOwnerShareRate: solution.emcOwnerShareRate ?? currentModule?.params?.advParams?.emcOwnerShareRate ?? DEFAULTS.advParams.emcOwnerShareRate,
        emcDiscountPrice: solution.emcDiscountPrice ?? currentModule?.params?.advParams?.emcDiscountPrice ?? DEFAULTS.advParams.emcDiscountPrice,
        emcFixedPrice: solution.emcFixedPrice ?? currentModule?.params?.advParams?.emcFixedPrice ?? DEFAULTS.advParams.emcFixedPrice,
        emcSouthernAveragePrice: solution.emcSouthernAveragePrice ?? currentModule?.params?.advParams?.emcSouthernAveragePrice ?? southernAveragePrice,
        roofRent: solution.roofRent ?? currentModule?.params?.advParams?.roofRent ?? DEFAULTS.advParams.roofRent
    }));

    const selectedNormalizedSolutionId = currentModule?.params?.selectedSolutionId || DEFAULTS.selectedSolutionId;
    const selectedNormalizedSolution = normalizedSolutions.find(s => s.id === selectedNormalizedSolutionId) || normalizedSolutions[0];

    // Fallback to defaults if params are not set
    const params: SolarParamsState = {
        mode: currentModule?.params?.mode || DEFAULTS.mode,
        selfUseMode: currentModule?.params?.selfUseMode || DEFAULTS.selfUseMode,
        simpleParams: {
            ...DEFAULTS.simpleParams,
            ...currentModule?.params?.simpleParams,
            ...(selectedNormalizedSolution ? {
                capacity: selectedNormalizedSolution.capacity ?? currentModule?.params?.simpleParams?.capacity ?? DEFAULTS.simpleParams.capacity,
                epcPrice: selectedNormalizedSolution.epcPrice,
                connectionType: selectedNormalizedSolution.connectionType,
                investmentMode: selectedNormalizedSolution.investmentMode || 'epc',
                emcSubMode: selectedNormalizedSolution.emcSubMode || currentModule?.params?.simpleParams?.emcSubMode || DEFAULTS.simpleParams.emcSubMode
            } : {})
        },
        advParams: { ...DEFAULTS.advParams, ...storedAdvParams, emcSouthernAveragePrice: storedAdvParams.emcSouthernAveragePrice ?? southernAveragePrice },
        buildings: currentModule?.params?.buildings,
        solutions: normalizedSolutions,
        selectedSolutionId: selectedNormalizedSolutionId,
        showConsumptionRateAnalysis: currentModule?.params?.showConsumptionRateAnalysis ?? DEFAULTS.showConsumptionRateAnalysis,
        consumptionRateScenarios: currentModule?.params?.consumptionRateScenarios ?? DEFAULTS.consumptionRateScenarios,
        effectiveSelfConsumptionRate: shouldMigrateExcelDefaults && isClose(currentModule?.params?.effectiveSelfConsumptionRate, 100, 0.01)
            ? DEFAULTS.effectiveSelfConsumptionRate
            : currentModule?.params?.effectiveSelfConsumptionRate ?? DEFAULTS.effectiveSelfConsumptionRate,
    };

    // UI Local State
    const [selfUseMode, setSelfUseModeState] = useState<'auto' | 'manual'>(params.selfUseMode || 'manual');
    const [calculatedSelfConsumption, setCalculatedSelfConsumption] = useState(params.effectiveSelfConsumptionRate ?? DEFAULTS.effectiveSelfConsumptionRate ?? 85);
    const [consumptionResult, setConsumptionResult] = useState<ConsumptionResult | null>(null);
    const [sunHoursSource, setSunHoursSource] = useState<SunHoursResult>({
        value: params.advParams.dailySunHours,
        source: 'default',
        label: '等待地址同步'
    });
    const [buildings, setBuildings] = useState<BuildingData[]>(
        currentModule?.params?.buildings || [
            { id: 1, name: '1号车间', area: 5000, active: true, manualCapacity: 400, transformerId: 0 }
        ]
    );

    const solutions = params.solutions || DEFAULT_SOLUTIONS;
    const selectedSolutionId = params.selectedSolutionId || DEFAULT_SOLUTIONS[0].id;
    const currentSolution = solutions.find(s => s.id === selectedSolutionId) || solutions[0];

    // 方案切换处理
    const handleSelectSolution = (id: string) => {
        const solution = solutions.find(s => s.id === id);
        if (solution) {
            handleUpdate(applySolutionToParams(params, solution));
        }
    };

    // 增加方案
    const handleAddSolution = (newSolution: SolarSolution) => {
        const newSolutions = [...solutions, newSolution];
        handleUpdate(applySolutionToParams({ ...params, solutions: newSolutions }, newSolution));
    };

    // 更新方案
    const handleUpdateSolution = (id: string, updates: Partial<SolarSolution>) => {
        const updatedSolutions = solutions.map(s => s.id === id ? { ...s, ...updates } : s);

        // 如果更新的是当前选中的方案，需要同步更新全局参数
        const paramsUpdate: Partial<SolarParamsState> = { solutions: updatedSolutions };
        if (id === selectedSolutionId) {
            const current = updatedSolutions.find(s => s.id === id);
            if (current) {
                const syncedParams = applySolutionToParams({ ...params, solutions: updatedSolutions }, current);
                paramsUpdate.selectedSolutionId = syncedParams.selectedSolutionId;
                paramsUpdate.simpleParams = syncedParams.simpleParams;
                paramsUpdate.advParams = syncedParams.advParams;
            }
        }

        // 直接更新模块，避免再次调用 handleUpdate
        const newParams = { ...params, ...paramsUpdate };
        const { investment, yearlySaving } = calculateFinancials(newParams, calculatedSelfConsumption);

        updateModule('retrofit-solar', {
            investment,
            yearlySaving,
            kpiPrimary: { label: '装机容量', value: `${newParams.simpleParams.capacity.toFixed(2)} kWp` },
            kpiSecondary: { label: '首年节省', value: `${yearlySaving.toFixed(3)} 万元` },
            params: newParams
        });
    };

    // 删除方案
    const handleDeleteSolution = (id: string) => {
        if (solutions.length <= 1) return; // 至少保留一个方案
        
        const newSolutions = solutions.filter(s => s.id !== id);
        const paramsUpdate: Partial<SolarParamsState> = { solutions: newSolutions };
        
        // 如果删除的是当前选中的方案，则自动切换到第一个可用方案
        if (id === selectedSolutionId) {
            const nextSolution = newSolutions[0];
            const syncedParams = applySolutionToParams({ ...params, solutions: newSolutions }, nextSolution);

            paramsUpdate.selectedSolutionId = syncedParams.selectedSolutionId;
            paramsUpdate.simpleParams = syncedParams.simpleParams;
            paramsUpdate.advParams = syncedParams.advParams;
        }
        
        handleUpdate(paramsUpdate);
    };

    const lastLocation = useRef<string>('');

    // Financial Calculation Core
    // ========== 核心财务测算 ==========
    // 返回值中的 yearlySaving 为【投资方视角】的净收益（即系统汇总使用的指标）
    // ownerBenefit 为【业主视角】的收益（EMC 模式下业主侧收益）
    const calculateFinancials = useCallback((p: SolarParamsState, selfRate: number) => {
        const { investment, capacity } = getSolarInvestment(p);
        const yearOne = calculateSolarYearResult(p, selfRate, 1, investment, capacity);
        const vatAndSurcharge = calculateExcelStyleTax(p, [yearOne], investment, 1);
        const totalTax = parseFloat((yearOne.tax + vatAndSurcharge).toFixed(3));
        const netIncome = parseFloat((yearOne.revenue - yearOne.opex - totalTax).toFixed(3));

        return {
            investment,
            yearlySaving: netIncome,
            genYear1: yearOne.generation,
            ownerBenefit: yearOne.ownerBenefit,
            investorRevenue: yearOne.revenue
        };
    }, []);

    const handleUpdate = useCallback((newParamsPart: Partial<SolarParamsState>) => {
        const newParams = { ...params, ...newParamsPart };
        const { investment, yearlySaving } = calculateFinancials(newParams, calculatedSelfConsumption);

        updateModule('retrofit-solar', {
            investment,
            yearlySaving,
            kpiPrimary: { label: '装机容量', value: `${newParams.simpleParams.capacity.toFixed(2)} kWp` },
            kpiSecondary: { label: '首年节省', value: `${yearlySaving.toFixed(3)} 万元` },
            params: newParams
        });
    }, [params, calculatedSelfConsumption, calculateFinancials, updateModule]);

    const setSelfUseMode = useCallback((next: 'auto' | 'manual' | ((prev: 'auto' | 'manual') => 'auto' | 'manual')) => {
        setSelfUseModeState(prev => {
            const nextMode = typeof next === 'function' ? next(prev) : next;
            if (nextMode !== params.selfUseMode) {
                handleUpdate({ selfUseMode: nextMode });
            }
            return nextMode;
        });
    }, [handleUpdate, params.selfUseMode]);

    // Sync Daily Sun Hours from Location (优先使用精确坐标调用NASA)
    useEffect(() => {
        const currentLoc = projectBaseInfo?.latitude && projectBaseInfo?.longitude
            ? `${projectBaseInfo.latitude}-${projectBaseInfo.longitude}`
            : `${projectBaseInfo?.province}-${projectBaseInfo?.city}`;

        if (!currentLoc || currentLoc === 'undefined-undefined' || currentLoc === lastLocation.current) return;
        if (!(projectBaseInfo?.latitude || projectBaseInfo?.province)) return;

        let cancelled = false;
        lastLocation.current = currentLoc;

        const syncSunHours = async () => {
            let sunHoursInfo: SunHoursResult = getLocalSunHoursInfo(projectBaseInfo.province, projectBaseInfo.city || '');

            if (projectBaseInfo.latitude && projectBaseInfo.longitude) {
                // 优先使用精确坐标调用 NASA API
                try {
                    const nasaData = await fetchNasaSolarData(projectBaseInfo.latitude, projectBaseInfo.longitude);
                    sunHoursInfo = {
                        value: nasaData.annualAverage,
                        source: 'nasa_coordinates',
                        label: 'NASA精确坐标多年均值'
                    };
                } catch {
                    sunHoursInfo = getLocalSunHoursInfo(projectBaseInfo.province, projectBaseInfo.city || '');
                }
            } else {
                sunHoursInfo = getLocalSunHoursInfo(projectBaseInfo.province, projectBaseInfo.city || '');
            }

            if (cancelled || !sunHoursInfo) return;

            const newSunHours = parseFloat(sunHoursInfo.value.toFixed(2));
            setSunHoursSource({ ...sunHoursInfo, value: newSunHours });

            if (Math.abs(newSunHours - params.advParams.dailySunHours) > 0.01) {
                handleUpdate({ advParams: { ...params.advParams, dailySunHours: newSunHours } });
            }
        };

        syncSunHours();

        return () => {
            cancelled = true;
        };
    }, [projectBaseInfo?.latitude, projectBaseInfo?.longitude, projectBaseInfo?.province, projectBaseInfo?.city, handleUpdate, params.advParams]);

    // Sync EMC benchmark price only. Solar EPC收益测算电价由本模块维护，避免被全局电价模型覆盖成旧口径。
    useEffect(() => {
        if (params.simpleParams.investmentMode === 'emc' && !params.advParams.emcSouthernAveragePrice) {
            handleUpdate({ advParams: { ...params.advParams, emcSouthernAveragePrice: southernAveragePrice } });
        }
    }, [params.simpleParams.investmentMode, params.advParams, southernAveragePrice, handleUpdate]);

    // Sync building list and default capacity into the persisted solar params.
    // If the selected solution has its own capacity, keep the active scheme independent.
    useEffect(() => {
        const totalBuildingCapacity = buildings.filter(b => b.active).reduce((sum, b) => sum + b.manualCapacity, 0);
        const selectedSolution = (params.solutions || []).find(s => s.id === params.selectedSolutionId);
        const shouldFollowBuildingCapacity = !selectedSolution?.capacity;
        const activeArea = buildings.filter(b => b.active).reduce((sum, b) => sum + (Number(b.area) || 0), 0);
        const nextSimpleParams = {
            ...params.simpleParams,
            area: activeArea || params.simpleParams.area
        };
        const update: Partial<SolarParamsState> = {};

        if (totalBuildingCapacity > 0 && shouldFollowBuildingCapacity && totalBuildingCapacity !== params.simpleParams.capacity) {
            update.simpleParams = { ...nextSimpleParams, capacity: totalBuildingCapacity };
        } else if (nextSimpleParams.area !== params.simpleParams.area) {
            update.simpleParams = nextSimpleParams;
        }

        if (JSON.stringify(params.buildings || []) !== JSON.stringify(buildings)) {
            update.buildings = buildings;
        }

        if (Object.keys(update).length > 0) {
            handleUpdate(update);
        }
    }, [buildings, params.buildings, params.simpleParams, params.solutions, params.selectedSolutionId, handleUpdate]);

    // Sync buildings from projectBaseInfo to solar module
    useEffect(() => {
        if (projectBaseInfo.buildings && projectBaseInfo.buildings.length > 0) {
            // Map Building[] to BuildingData[]
            const mappedBuildings: BuildingData[] = projectBaseInfo.buildings.map((b: any, index: number) => ({
                id: b.id || index + 1,
                name: b.name || `${index + 1}号建筑`,
                area: b.area || 0,
                active: true,
                // Estimate capacity based on area (default 80W/m² for rooftop solar)
                manualCapacity: Math.round((b.area || 0) * 0.08),
                transformerId: 0
            }));

            // Only update if buildings are different (avoid infinite loop)
            const currentIds = buildings.map(b => b.id).sort().join(',');
            const newIds = mappedBuildings.map(b => b.id).sort().join(',');
            const currentNames = buildings.map(b => b.name).sort().join(',');
            const newNames = mappedBuildings.map(b => b.name).sort().join(',');

            if (currentIds !== newIds || currentNames !== newNames) {
                setBuildings(mappedBuildings);
            }
        }
    }, [projectBaseInfo.buildings]);

    // Calculate Consumption
    useEffect(() => {
        if (selfUseMode !== 'auto') return;

        const totalCapacity = params.simpleParams.capacity || 0;
        const storageCapacity = modules['retrofit-storage']?.params?.capacity || 0;

        if (projectBaseInfo.type === 'school' && projectBaseInfo.schoolType) {
            const region = ['Shanghai', 'Guangdong', 'Zhejiang'].includes(projectBaseInfo.province) ? 'south' : 'central';
            const result = calculateCampusConsumptionRate({
                schoolType: projectBaseInfo.schoolType,
                pvCapacity: totalCapacity,
                storageCapacity: storageCapacity,
                hasAirConditioning: projectBaseInfo.hasAirConditioning ?? true,
                region,
                considerWeekends: true,
                considerVacations: true
            });
            setConsumptionResult(result);
            setCalculatedSelfConsumption(Math.round(result.recommendedRate * 100));
        } else {
            if (bills.length > 0) {
                const totalKwh = bills.reduce((sum, b) => sum + b.kwh, 0);
                const avgMonthly = totalKwh / 12;
                const estimatedYearlyGeneration = totalCapacity * params.advParams.dailySunHours * params.advParams.generationDays * (params.advParams.prValue / 100);
                const rate = Math.min(100, (avgMonthly * 12 / estimatedYearlyGeneration) * 100);
                setCalculatedSelfConsumption(Math.round(rate || 85));
                setConsumptionResult(null);
            } else {
                setCalculatedSelfConsumption(85);
                setConsumptionResult(null);
            }
        }
    }, [selfUseMode, projectBaseInfo, params.simpleParams.capacity, params.advParams.dailySunHours, params.advParams.generationDays, params.advParams.prValue, bills, modules]);

    useEffect(() => {
        if (Math.abs((params.effectiveSelfConsumptionRate ?? 85) - calculatedSelfConsumption) > 0.01) {
            handleUpdate({ effectiveSelfConsumptionRate: calculatedSelfConsumption });
        }
    }, [calculatedSelfConsumption, params.effectiveSelfConsumptionRate, handleUpdate]);

    return {
        currentModule,
        params,
        handleUpdate,
        buildings,
        setBuildings,
        selfUseMode,
        setSelfUseMode,
        calculatedSelfConsumption,
        setCalculatedSelfConsumption,
        consumptionResult,
        toggleModule,
        saveProject,
        transformers,
        bills,
        projectBaseInfo,
        priceConfig,
        storageModule: modules['retrofit-storage'],
        sunHoursSource,
        // 新增：方案和品牌状态
        solutions,
        selectedSolutionId,
        currentSolution,
        handleSelectSolution,
        handleAddSolution,
        handleUpdateSolution,
        handleDeleteSolution
    };
};

// 非Hook版本的计算函数 - 可在任何地方调用（包括在 map 内）
const calculateSolarMetrics = (params: SolarParamsState, selfRate: number) => {
    const base = [3.2, 3.5, 4.1, 4.8, 5.5, 5.2, 5.8, 5.6, 4.9, 4.5, 3.8, 3.3];
    const factor = ((params.simpleParams.capacity || 400) / 400);
    const chartData = base.map((v, i) => ({
        name: `${i + 1}月`,
        retrofit: parseFloat((v * factor).toFixed(3))
    }));

    const { capacity, investment } = getSolarInvestment(params);
    const details: any[] = [];
    const cashFlows = [-investment];

    let cumulativeNet = -investment;
    let paybackYear = -1;

    for (let year = 1; year <= 25; year++) {
        const yearResult = calculateSolarYearResult(params, selfRate, year, investment, capacity);
        const vatAndSurcharge = calculateExcelStyleTax(params, [...details, yearResult], investment, year);
        yearResult.tax = parseFloat((yearResult.tax + vatAndSurcharge).toFixed(3));
        yearResult.netIncome = parseFloat((yearResult.revenue - yearResult.opex - yearResult.tax).toFixed(3));

        details.push(yearResult);
        cashFlows.push(yearResult.netIncome);
        cumulativeNet += yearResult.netIncome;
        if (paybackYear === -1 && cumulativeNet >= 0 && yearResult.netIncome > 0) {
            paybackYear = year - (cumulativeNet / yearResult.netIncome);
        }
    }

    const rev25Year = details.reduce((sum: number, d: any) => sum + d.netIncome, 0);
    const totalOwnerBenefit25 = details.reduce((sum: number, d: any) => sum + d.ownerBenefit, 0);
    const irr = investment > 0 ? calculateIRRFromCashFlows(cashFlows) : 0;

    return {
        genYear1: details.length > 0 ? details[0].generation : 0,
        rev25Year: parseFloat(rev25Year.toFixed(3)),
        totalOwnerBenefit25: parseFloat(totalOwnerBenefit25.toFixed(3)),
        irr,
        paybackPeriod: paybackYear > 0 ? parseFloat(paybackYear.toFixed(2)) : 25,
        cashFlows,
        yearlyDetails: details
    };
};

export const useSolarMetrics = (params: SolarParamsState, selfRate: number) => {
    const chartData = useMemo(() => {
        const base = [3.2, 3.5, 4.1, 4.8, 5.5, 5.2, 5.8, 5.6, 4.9, 4.5, 3.8, 3.3];
        const capacity = params.simpleParams.capacity || 400;
        const factor = (capacity / 400);
        return base.map((v, i) => ({
            name: `${i + 1}月`,
            retrofit: parseFloat((v * factor).toFixed(3))
        }));
    }, [params.simpleParams.capacity]);

    const longTermMetrics = useMemo(() => {
        return calculateSolarMetrics(params, selfRate);
    }, [params, selfRate]);

    return { chartData, longTermMetrics };
};

// Export non-hook version for use inside loops/conditions
export { calculateSolarMetrics };
