import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { calculateCampusConsumptionRate, ConsumptionResult } from '../../services/campusConsumption';
import { getSunHours } from '../../services/solarData';
import { DEFAULTS, SolarParamsState, BuildingData, DEFAULT_SOLUTIONS, DEFAULT_BRAND, SolarModuleBrand, SolarSolution, MODULE_BRANDS } from './types';

export const useSolarRetrofit = () => {
    const { modules, toggleModule, updateModule, saveProject, transformers, bills, projectBaseInfo, priceConfig } = useProject();
    const currentModule = modules['retrofit-solar'];

    // Fallback to defaults if params are not set
    const params: SolarParamsState = {
        mode: currentModule?.params?.mode || DEFAULTS.mode,
        simpleParams: { ...DEFAULTS.simpleParams, ...currentModule?.params?.simpleParams },
        advParams: { ...DEFAULTS.advParams, ...currentModule?.params?.advParams },
        solutions: currentModule?.params?.solutions || DEFAULTS.solutions,
        selectedSolutionId: currentModule?.params?.selectedSolutionId || DEFAULTS.selectedSolutionId,
    };

    // UI Local State
    const [selfUseMode, setSelfUseMode] = useState<'auto' | 'manual'>('auto');
    const [calculatedSelfConsumption, setCalculatedSelfConsumption] = useState(85);
    const [consumptionResult, setConsumptionResult] = useState<ConsumptionResult | null>(null);
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
            const brandConfig = MODULE_BRANDS[solution.brand];
            // 更新主状态参数，让其与选中的方案对齐
            handleUpdate({
                selectedSolutionId: id,
                simpleParams: {
                    ...params.simpleParams,
                    epcPrice: solution.epcPrice
                },
                advParams: {
                    ...params.advParams,
                    degradationFirstYear: brandConfig ? brandConfig.degradationFirstYear : params.advParams.degradationFirstYear,
                    degradationLinear: brandConfig ? brandConfig.degradationLinear : params.advParams.degradationLinear
                }
            });
        }
    };

    // 增加方案
    const handleAddSolution = (newSolution: SolarSolution) => {
        handleUpdate({
            solutions: [...solutions, newSolution]
        });
    };

    // 更新方案
    const handleUpdateSolution = (id: string, updates: Partial<SolarSolution>) => {
        const updatedSolutions = solutions.map(s => s.id === id ? { ...s, ...updates } : s);

        // 如果更新的是当前选中的方案，需要同步更新全局参数
        const paramsUpdate: Partial<SolarParamsState> = { solutions: updatedSolutions };
        if (id === selectedSolutionId) {
            const current = updatedSolutions.find(s => s.id === id);
            if (current) {
                // 只同步 EPC 价格到全局参数（如果更新包含 EPC 价格）
                if ('epcPrice' in updates) {
                    paramsUpdate.simpleParams = { ...params.simpleParams, epcPrice: current.epcPrice };
                }
                if (updates.brand) {
                    const brandConfig = MODULE_BRANDS[updates.brand];
                    paramsUpdate.advParams = {
                        ...params.advParams,
                        degradationFirstYear: brandConfig.degradationFirstYear,
                        degradationLinear: brandConfig.degradationLinear
                    };
                }
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
            const brandConfig = MODULE_BRANDS[nextSolution.brand];
            
            paramsUpdate.selectedSolutionId = nextSolution.id;
            paramsUpdate.simpleParams = { ...params.simpleParams, epcPrice: nextSolution.epcPrice };
            paramsUpdate.advParams = { 
                ...params.advParams,
                degradationFirstYear: brandConfig ? brandConfig.degradationFirstYear : params.advParams.degradationFirstYear,
                degradationLinear: brandConfig ? brandConfig.degradationLinear : params.advParams.degradationLinear 
            };
        }
        
        handleUpdate(paramsUpdate);
    };

    const locationKey = `${projectBaseInfo?.province}-${projectBaseInfo?.city}`;
    const lastLocation = useRef<string>(locationKey);

    // Get O&M rate from global project context
    const omRate = projectBaseInfo?.omRate || 1.5;

    // Financial Calculation Core
    // ========== 核心财务测算 ==========
    // 返回值中的 yearlySaving 为【投资方视角】的净收益（即系统汇总使用的指标）
    // ownerBenefit 为【业主视角】的收益（EMC 模式下业主侧收益）
    const calculateFinancials = useCallback((p: SolarParamsState, selfRate: number) => {
        const capacity = p.simpleParams.capacity || 0;

        // 根据方案确定 EPC 单价
        let epcPrice = p.simpleParams.epcPrice;
        const selectedSolution = (p.solutions || []).find(s => s.id === p.selectedSolutionId);
        if (selectedSolution) {
            epcPrice = selectedSolution.epcPrice;
        }

        // 如果是高压接入，增加升压设备成本
        let voltageUpgradeCost = 0;
        if (p.simpleParams.connectionType === 'high' && selectedSolution) {
            voltageUpgradeCost = selectedSolution.voltageUpgradeCost || 15;
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
                // ===== 折扣电价模式 =====
                // 投资方以折扣价向业主售电 → 投资方的自用收入 = 自用电量 × 折扣电价
                // 业主节省 = 自用电量 × (市电价 - 折扣价) + 屋顶租金
                const discountRevenue = selfUseGen * p.advParams.emcDiscountPrice; // 投资方售电收入
                ownerBenefit = selfUseGen * (p.advParams.electricityPrice - p.advParams.emcDiscountPrice) + roofRentIncome;
                investorRevenue = discountRevenue + gridRevenue - roofRentIncome;
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

    // Sync Daily Sun Hours from Location
    useEffect(() => {
        const currentLoc = `${projectBaseInfo?.province}-${projectBaseInfo?.city}`;
        if (currentLoc !== lastLocation.current && projectBaseInfo?.province) {
            lastLocation.current = currentLoc;
            const newSunHours = getSunHours(projectBaseInfo.province, projectBaseInfo.city || '');
            if (newSunHours && Math.abs(newSunHours - params.advParams.dailySunHours) > 0.01) {
                handleUpdate({ advParams: { ...params.advParams, dailySunHours: newSunHours } });
            }
        }
    }, [projectBaseInfo?.province, projectBaseInfo?.city, handleUpdate, params.advParams]);

    // Sync Electricity Price
    useEffect(() => {
        if (params.mode === 'advanced') {
            let newElectricityPrice = DEFAULTS.advParams.electricityPrice;

            if (priceConfig.mode === 'fixed') {
                newElectricityPrice = priceConfig.fixedPrice;
            } else if (priceConfig.mode === 'tou') {
                const totalDuration = priceConfig.touSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
                const weightedSum = priceConfig.touSegments.reduce((sum, seg) => sum + seg.price * (seg.end - seg.start), 0);
                newElectricityPrice = totalDuration > 0 ? weightedSum / totalDuration : DEFAULTS.advParams.electricityPrice;
            } else if (priceConfig.mode === 'spot') {
                const avgSpotPrice = priceConfig.spotPrices.reduce((sum, p) => sum + p, 0) / priceConfig.spotPrices.length;
                newElectricityPrice = avgSpotPrice || DEFAULTS.advParams.electricityPrice;
            }

            if (Math.abs(params.advParams.electricityPrice - newElectricityPrice) > 0.0001) {
                handleUpdate({ advParams: { ...params.advParams, electricityPrice: parseFloat(newElectricityPrice.toFixed(4)) } });
            }
        }
    }, [priceConfig, params.mode, params.advParams.electricityPrice, handleUpdate]);

    // Sync Building Capacity to Global Parameter
    useEffect(() => {
        const totalBuildingCapacity = buildings.filter(b => b.active).reduce((sum, b) => sum + b.manualCapacity, 0);
        if (totalBuildingCapacity > 0 && totalBuildingCapacity !== params.simpleParams.capacity) {
            handleUpdate({ simpleParams: { ...params.simpleParams, capacity: totalBuildingCapacity } });
        }
    }, [buildings, params.simpleParams.capacity, handleUpdate]);

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
    const investment = capacity * params.simpleParams.epcPrice / 10;
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
                const discountRevenue = selfUseGen * params.advParams.emcDiscountPrice;
                ownerBenefit = selfUseGen * (params.advParams.electricityPrice - params.advParams.emcDiscountPrice) + roofRentIncome;
                investorRevenue = discountRevenue + gridRevenue - roofRentIncome;
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
