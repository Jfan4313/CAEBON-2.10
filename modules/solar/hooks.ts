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

export const useSolarRetrofit = () => {
    const { modules, toggleModule, updateModule, saveProject, transformers, bills, projectBaseInfo, priceConfig } = useProject();
    const currentModule = modules['retrofit-solar'];
    const southernAveragePrice = parseFloat(getAverageElectricityPrice(priceConfig).toFixed(4));
    const storedAdvParams = currentModule?.params?.advParams || {};
    const normalizedSolutions: SolarSolution[] = (currentModule?.params?.solutions || DEFAULTS.solutions).map((solution: SolarSolution) => ({
        ...solution,
        investmentMode: solution.investmentMode || 'epc',
        emcSubMode: solution.emcSubMode || DEFAULTS.simpleParams.emcSubMode,
        emcOwnerShareRate: solution.emcOwnerShareRate ?? currentModule?.params?.advParams?.emcOwnerShareRate ?? DEFAULTS.advParams.emcOwnerShareRate,
        emcDiscountPrice: solution.emcDiscountPrice ?? currentModule?.params?.advParams?.emcDiscountPrice ?? DEFAULTS.advParams.emcDiscountPrice,
        emcFixedPrice: solution.emcFixedPrice ?? currentModule?.params?.advParams?.emcFixedPrice ?? DEFAULTS.advParams.emcFixedPrice,
        emcSouthernAveragePrice: solution.emcSouthernAveragePrice ?? currentModule?.params?.advParams?.emcSouthernAveragePrice ?? southernAveragePrice,
        roofRent: solution.roofRent ?? currentModule?.params?.advParams?.roofRent ?? DEFAULTS.advParams.roofRent
    }));

    // Fallback to defaults if params are not set
    const params: SolarParamsState = {
        mode: currentModule?.params?.mode || DEFAULTS.mode,
        simpleParams: { ...DEFAULTS.simpleParams, ...currentModule?.params?.simpleParams },
        advParams: { ...DEFAULTS.advParams, ...storedAdvParams, emcSouthernAveragePrice: storedAdvParams.emcSouthernAveragePrice ?? southernAveragePrice },
        solutions: normalizedSolutions,
        selectedSolutionId: currentModule?.params?.selectedSolutionId || DEFAULTS.selectedSolutionId,
        showConsumptionRateAnalysis: currentModule?.params?.showConsumptionRateAnalysis ?? DEFAULTS.showConsumptionRateAnalysis,
        consumptionRateScenarios: currentModule?.params?.consumptionRateScenarios ?? DEFAULTS.consumptionRateScenarios,
        effectiveSelfConsumptionRate: currentModule?.params?.effectiveSelfConsumptionRate ?? DEFAULTS.effectiveSelfConsumptionRate,
    };

    // UI Local State
    const [selfUseMode, setSelfUseMode] = useState<'auto' | 'manual'>('auto');
    const [calculatedSelfConsumption, setCalculatedSelfConsumption] = useState(85);
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

    // Get O&M rate from global project context
    const omRate = projectBaseInfo?.omRate ?? 0;

    // Financial Calculation Core
    // ========== 核心财务测算 ==========
    // 返回值中的 yearlySaving 为【投资方视角】的净收益（即系统汇总使用的指标）
    // ownerBenefit 为【业主视角】的收益（EMC 模式下业主侧收益）
    const calculateFinancials = useCallback((p: SolarParamsState, selfRate: number) => {
        const capacity = p.simpleParams.capacity || 0;

        // 根据方案确定建造成本单价，EPC/EMC 投资模型共用该成本。
        let epcPrice = p.simpleParams.epcPrice;
        const selectedSolution = (p.solutions || []).find(s => s.id === p.selectedSolutionId);
        if (selectedSolution) {
            epcPrice = selectedSolution.epcPrice;
        }

        // 如果是高压接入，增加升压设备成本
        let voltageUpgradeCost = 0;
        if ((selectedSolution?.connectionType || p.simpleParams.connectionType) === 'high') {
            voltageUpgradeCost = selectedSolution?.voltageUpgradeCost || 15;
        }

        const baseInvestment = parseFloat((capacity * epcPrice / 10).toFixed(3));
        const investment = parseFloat((baseInvestment + voltageUpgradeCost).toFixed(3)); // 万元

        // 首年总发电量 (万度 = 万kWh)
        const genYear1 = capacity * p.advParams.dailySunHours * p.advParams.generationDays
            * (p.advParams.prValue / 100) * (p.advParams.azimuthEfficiency / 100) / 10000;

        const selfUseGen = genYear1 * (selfRate / 100); // 自用电量 (万度)
        const gridGen = genYear1 * (1 - selfRate / 100); // 上网电量 (万度)

        // 总电费毛收益（无分成的情况下）
        const totalSelfUseRevenue = selfUseGen * p.advParams.electricityPrice; // 自用部分总价值 (万元)
        const gridRevenue = gridGen * p.advParams.feedInTariff; // 上网收入 (万元)
        const roofRentIncome = p.simpleParams.area * p.advParams.roofRent / 10000; // 屋顶租金 (万元/年)

        let investorRevenue = 0; // 投资方年收益
        let ownerBenefit = 0;    // 业主年收益

        if (p.simpleParams.investmentMode === 'emc') {
            if (p.simpleParams.emcSubMode === 'sharing') {
                // ===== 收益分成模式 =====
                // 业主获得 ownerShareRate% 的自用电费收益 + 屋顶租金
                // 投资方获得 (100 - ownerShareRate)% 的自用电费收益 + 全部上网收入, 需承担运维
                const ownerShare = p.advParams.emcOwnerShareRate / 100;
                ownerBenefit = totalSelfUseRevenue * ownerShare + roofRentIncome;
                investorRevenue = totalSelfUseRevenue * (1 - ownerShare) + gridRevenue - roofRentIncome;
            } else {
                const salePrice = getEffectiveEmcSalePrice(p);
                const benchmarkPrice = getOwnerBenchmarkPrice(p);
                const saleRevenue = selfUseGen * salePrice;
                ownerBenefit = selfUseGen * (benchmarkPrice - salePrice) + roofRentIncome;
                investorRevenue = saleRevenue + gridRevenue - roofRentIncome;
            }
        } else {
            // 自投 / 贷款 / EPC：全部收益归投资方(业主=投资方)
            investorRevenue = totalSelfUseRevenue + gridRevenue;
            ownerBenefit = investorRevenue; // 业主即投资方
        }

        // Use global O&M rate for precision consistency across modules, overriding local fixed omCost if needed.
        // Solar module originally uses a fixed OM cost per W (e.g. 0.05 RMB/W), which equals `capacity * p.advParams.omCost / 10`
        // We'll blend it or just rely on the standard percentage if the user set a global rate. For now we use the global percentage:
        const opex = investment * (omRate / 100) + (investment * (p.advParams.insuranceRate / 100)); // 运维+保险 (万元)
        const taxableIncome = investorRevenue - opex;
        const tax = taxableIncome > 0 ? taxableIncome * ((projectBaseInfo?.taxRate || p.advParams.taxRate) / 100) : 0;
        const yearlySaving = parseFloat((investorRevenue - opex - tax).toFixed(3)); // 投资方净收益

        return {
            investment,
            yearlySaving,
            genYear1,
            ownerBenefit: parseFloat(ownerBenefit.toFixed(3)),
            investorRevenue: parseFloat(investorRevenue.toFixed(3))
        };
    }, [omRate, projectBaseInfo?.taxRate]);

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

    // Sync Electricity Price
    useEffect(() => {
        if (params.mode === 'advanced') {
            let newElectricityPrice = DEFAULTS.advParams.electricityPrice;

            if (priceConfig.mode === 'fixed') {
                newElectricityPrice = priceConfig.fixedPrice;
            } else if (priceConfig.mode === 'tou') {
                const totalDuration = priceConfig.touSegments.reduce((sum: number, seg: any) => sum + (seg.end - seg.start), 0);
                const weightedSum = priceConfig.touSegments.reduce((sum: number, seg: any) => sum + seg.price * (seg.end - seg.start), 0);
                newElectricityPrice = totalDuration > 0 ? weightedSum / totalDuration : DEFAULTS.advParams.electricityPrice;
            } else if (priceConfig.mode === 'spot') {
                const avgSpotPrice = priceConfig.spotPrices.reduce((sum: number, p: number) => sum + p, 0) / priceConfig.spotPrices.length;
                newElectricityPrice = avgSpotPrice || DEFAULTS.advParams.electricityPrice;
            }

            if (Math.abs(params.advParams.electricityPrice - newElectricityPrice) > 0.0001) {
                handleUpdate({ advParams: { ...params.advParams, electricityPrice: parseFloat(newElectricityPrice.toFixed(4)) } });
            }
        }
    }, [priceConfig, params.mode, params.advParams, southernAveragePrice, handleUpdate]);

    // Sync Building Capacity to the default global parameter.
    // If the selected solution has its own capacity, keep the active scheme independent.
    useEffect(() => {
        const totalBuildingCapacity = buildings.filter(b => b.active).reduce((sum, b) => sum + b.manualCapacity, 0);
        const selectedSolution = (params.solutions || []).find(s => s.id === params.selectedSolutionId);
        const shouldFollowBuildingCapacity = !selectedSolution?.capacity;
        const nextSimpleParams = {
            ...params.simpleParams,
            area: buildings.filter(b => b.active).reduce((sum, b) => sum + (Number(b.area) || 0), 0) || params.simpleParams.area
        };

        if (totalBuildingCapacity > 0 && shouldFollowBuildingCapacity && totalBuildingCapacity !== params.simpleParams.capacity) {
            handleUpdate({ simpleParams: { ...nextSimpleParams, capacity: totalBuildingCapacity } });
        } else if (nextSimpleParams.area !== params.simpleParams.area) {
            handleUpdate({ simpleParams: nextSimpleParams });
        }
    }, [buildings, params.simpleParams, params.solutions, params.selectedSolutionId, handleUpdate]);

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

    const capacity = params.simpleParams.capacity || 0;
    const selectedSolution = (params.solutions || []).find(s => s.id === params.selectedSolutionId);
    const epcPrice = selectedSolution?.epcPrice ?? params.simpleParams.epcPrice;
    const voltageUpgradeCost = (selectedSolution?.connectionType || params.simpleParams.connectionType) === 'high'
        ? (selectedSolution?.voltageUpgradeCost || 15)
        : 0;
    const investment = capacity * epcPrice / 10 + voltageUpgradeCost;
    const roofRentIncome = params.simpleParams.area * params.advParams.roofRent / 10000; // 万元/年
    const details: any[] = [];
    const cashFlows = [-investment];

    let cumulativeNet = -investment;
    let paybackYear = -1;

    for (let year = 1; year <= 25; year++) {
        const degradation = year === 1 ?
            (1 - params.advParams.degradationFirstYear / 100) :
            (1 - params.advParams.degradationFirstYear / 100) * Math.pow(1 - params.advParams.degradationLinear / 100, year - 1);

        const generation = capacity * params.advParams.dailySunHours * params.advParams.generationDays
            * (params.advParams.prValue / 100) * (params.advParams.azimuthEfficiency / 100) * degradation / 10000;

        const selfUseGen = generation * (selfRate / 100);
        const gridGen = generation * (1 - selfRate / 100);

        const totalSelfUseRevenue = selfUseGen * params.advParams.electricityPrice;
        const gridRevenue = gridGen * params.advParams.feedInTariff;

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
                const saleRevenue = selfUseGen * salePrice;
                ownerBenefit = selfUseGen * (benchmarkPrice - salePrice) + roofRentIncome;
                investorRevenue = saleRevenue + gridRevenue - roofRentIncome;
            }
        } else {
            investorRevenue = totalSelfUseRevenue + gridRevenue;
            ownerBenefit = investorRevenue;
        }

        const opex = (capacity * params.advParams.omCost / 10) + (investment * (params.advParams.insuranceRate / 100));
        const taxableIncome = investorRevenue - opex;
        const tax = taxableIncome > 0 ? taxableIncome * (params.advParams.taxRate / 100) : 0;
        const netIncome = investorRevenue - opex - tax;

        details.push({
            year,
            generation: parseFloat(generation.toFixed(3)),
            revenue: parseFloat(investorRevenue.toFixed(3)),
            ownerBenefit: parseFloat(ownerBenefit.toFixed(3)),
            opex: parseFloat(opex.toFixed(3)),
            tax: parseFloat(tax.toFixed(3)),
            netIncome: parseFloat(netIncome.toFixed(3))
        });

        cashFlows.push(parseFloat(netIncome.toFixed(3)));
        cumulativeNet += netIncome;
        if (paybackYear === -1 && cumulativeNet >= 0) {
            paybackYear = year - (cumulativeNet / netIncome);
        }
    }

    const rev25Year = details.reduce((sum: number, d: any) => sum + d.netIncome, 0);
    const totalOwnerBenefit25 = details.reduce((sum: number, d: any) => sum + d.ownerBenefit, 0);
    const irr = investment > 0 ? parseFloat(((rev25Year / 25 / investment) * 100).toFixed(2)) : 0;

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
