import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { calculateCampusConsumptionRate, ConsumptionResult } from '../../services/campusConsumption';
import { getLocalSunHoursInfo, SunHoursResult } from '../../services/solarData';
import { fetchNasaSolarData } from '../../services/nasaPower';
import { DEFAULTS, SolarParamsState, BuildingData, DEFAULT_SOLUTIONS, SolarSolution, MODULE_BRANDS, EmcSubMode, InvestmentMode } from './types';
import { buildMonthlyEmcTariffs, getGenerationWeightedTariff } from './utils/emcTariff';
import { estimateAnnualLoad } from '../../shared/utils/monthlyLoadEstimation';
import { buildPvConsumptionProfile } from '../../shared/utils/pvConsumption';
import { estimateVillaAnnualLoadKwh } from '../../shared/utils/projectLoadProfiles';

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
            emcDiscountRate: solution.emcDiscountRate ?? params.advParams.emcDiscountRate,
            emcFixedPrice: solution.emcFixedPrice ?? params.advParams.emcFixedPrice,
            emcSouthernAveragePrice: solution.emcSouthernAveragePrice ?? params.advParams.emcSouthernAveragePrice,
            roofRent: solution.roofRent ?? params.advParams.roofRent,
            financingRatio: solution.financingRatio ?? params.advParams.financingRatio,
            financingAnnualRate: solution.financingAnnualRate ?? params.advParams.financingAnnualRate,
            financingTermYears: solution.financingTermYears ?? params.advParams.financingTermYears,
            coBuildInvestorShareRate: solution.coBuildInvestorShareRate ?? params.advParams.coBuildInvestorShareRate,
            coBuildSalePrice: solution.coBuildSalePrice ?? params.advParams.coBuildSalePrice,
            coBuildTermYears: solution.coBuildTermYears ?? params.advParams.coBuildTermYears
        }
    };
};

const getEffectiveEmcSalePrice = (params: SolarParamsState) => {
    switch (params.simpleParams.emcSubMode) {
        case 'fixed':
            return params.advParams.emcFixedPrice;
        case 'discount':
            return getGenerationWeightedTariff(
                params.advParams.emcMonthlyTariffs || [],
                'benchmarkPrice',
                params.advParams.emcSouthernAveragePrice ?? params.advParams.electricityPrice,
            ) * Math.min(100, Math.max(0, params.advParams.emcDiscountRate ?? 100)) / 100;
        case 'southern_average':
        default:
            return params.advParams.emcDiscountPrice;
    }
};

const getOwnerBenchmarkPrice = (params: SolarParamsState) => {
    if (params.simpleParams.emcSubMode === 'discount') {
        return getGenerationWeightedTariff(
            params.advParams.emcMonthlyTariffs || [],
            'benchmarkPrice',
            params.advParams.emcSouthernAveragePrice ?? params.advParams.electricityPrice,
        );
    }
    return params.advParams.emcSouthernAveragePrice ?? params.advParams.electricityPrice;
};

const getEffectiveIncomeTaxRate = (params: SolarParamsState) => {
    if (params.advParams.incomeTaxMode === 'custom') {
        return Math.max(0, params.advParams.taxRate || 0);
    }
    if (
        params.advParams.incomeTaxMode === 'exempt'
        || params.simpleParams.operationMode === 'off_grid'
    ) {
        return 0;
    }
    return 5;
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
    normalized.vatTaxpayerType = normalized.vatTaxpayerType ?? DEFAULTS.advParams.vatTaxpayerType;
    normalized.costVatRate = normalized.costVatRate ?? DEFAULTS.advParams.costVatRate;
    normalized.constructionVatRate = normalized.constructionVatRate ?? DEFAULTS.advParams.constructionVatRate;
    normalized.vatSurchargeRate = normalized.vatSurchargeRate ?? DEFAULTS.advParams.vatSurchargeRate;
    normalized.vatOffsetElectricityPrice = normalized.vatOffsetElectricityPrice ?? DEFAULTS.advParams.vatOffsetElectricityPrice;
    normalized.incomeTaxMode = normalized.incomeTaxMode ?? DEFAULTS.advParams.incomeTaxMode;
    normalized.taxRate = normalized.taxRate ?? DEFAULTS.advParams.taxRate;

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

const getCoBuildTerms = (params: SolarParamsState) => ({
    investorShare: Math.min(100, Math.max(0, params.advParams.coBuildInvestorShareRate || 0)) / 100,
    salePrice: Math.max(0, params.advParams.coBuildSalePrice || 0),
    termYears: Math.min(
        Math.max(1, Math.round(params.advParams.projectLifeYears || DEFAULTS.advParams.projectLifeYears)),
        Math.max(1, Math.round(params.advParams.coBuildTermYears || 1))
    )
});

const getFinancingDebtService = (params: SolarParamsState, investment: number, year: number) => {
    if (params.simpleParams.investmentMode !== 'financing') return 0;

    const ratio = Math.min(100, Math.max(0, params.advParams.financingRatio || 0)) / 100;
    const term = Math.min(
        Math.max(1, Math.round(params.advParams.projectLifeYears || DEFAULTS.advParams.projectLifeYears)),
        Math.max(1, Math.round(params.advParams.financingTermYears || 1))
    );
    if (year > term) return 0;

    const principal = investment * ratio;
    const annualRate = Math.max(0, params.advParams.financingAnnualRate || 0) / 100;
    if (annualRate === 0) return principal / term;

    const factor = Math.pow(1 + annualRate, term);
    return principal * annualRate * factor / (factor - 1);
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
    const grossSelfUseRevenue = selfUseGen * params.advParams.electricityPrice;
    const isOffGrid = params.simpleParams.operationMode === 'off_grid';
    const grossGridRevenue = isOffGrid ? 0 : gridGen * params.advParams.feedInTariff;
    const roofRentIncome = params.simpleParams.area * params.advParams.roofRent / 10000;
    const isCoBuild = params.simpleParams.investmentMode === 'co_build';
    const coBuildTerms = getCoBuildTerms(params);
    const isWithinCoBuildTerm = isCoBuild && year <= coBuildTerms.termYears;
    const estimatedGrossGenerationRevenue = (() => {
        if (params.simpleParams.investmentMode === 'emc') {
            if (params.simpleParams.emcSubMode === 'sharing') {
                const ownerShare = params.advParams.emcOwnerShareRate / 100;
                return grossSelfUseRevenue * (1 - ownerShare) + grossGridRevenue;
            }
            return selfUseGen * getEffectiveEmcSalePrice(params) + grossGridRevenue;
        }
        if (isWithinCoBuildTerm) {
            return selfUseGen * coBuildTerms.salePrice + grossGridRevenue;
        }
        return grossSelfUseRevenue + grossGridRevenue;
    })();
    const isSmallScaleVatPayer = params.advParams.vatTaxpayerType !== 'general';
    const smallScaleVatRate = estimatedGrossGenerationRevenue <= 120 ? 0 : 0.01;
    const revenueTaxFactor = 1 + (isSmallScaleVatPayer
        ? smallScaleVatRate
        : ((params.advParams.revenueVatRate ?? 0) / 100));
    const costTaxFactor = isSmallScaleVatPayer
        ? 1
        : 1 + ((params.advParams.costVatRate ?? 0) / 100);

    const totalSelfUseRevenue = grossSelfUseRevenue / revenueTaxFactor;
    const gridRevenue = grossGridRevenue / revenueTaxFactor;

    let investorRevenue = 0;
    let ownerBenefit = 0;
    let grossGenerationRevenue = 0;
    let revenueVat = 0;
    let roofRentCost = 0;

    let ownerPowerSaving = 0;

    if (params.simpleParams.investmentMode === 'emc') {
        if (params.simpleParams.emcSubMode === 'sharing') {
            const ownerShare = params.advParams.emcOwnerShareRate / 100;
            ownerBenefit = totalSelfUseRevenue * ownerShare + roofRentIncome;
            investorRevenue = totalSelfUseRevenue * (1 - ownerShare) + gridRevenue - roofRentIncome;
            grossGenerationRevenue = grossSelfUseRevenue * (1 - ownerShare) + grossGridRevenue;
            roofRentCost = roofRentIncome;
        } else {
            const salePrice = getEffectiveEmcSalePrice(params);
            const benchmarkPrice = getOwnerBenchmarkPrice(params);
            const saleRevenue = selfUseGen * salePrice / revenueTaxFactor;
            ownerBenefit = selfUseGen * (benchmarkPrice - salePrice) + roofRentIncome;
            investorRevenue = saleRevenue + gridRevenue - roofRentIncome;
            grossGenerationRevenue = selfUseGen * salePrice + grossGridRevenue;
            roofRentCost = roofRentIncome;
        }
    } else if (isWithinCoBuildTerm) {
        const saleRevenue = selfUseGen * coBuildTerms.salePrice / revenueTaxFactor;
        investorRevenue = saleRevenue + gridRevenue;
        grossGenerationRevenue = selfUseGen * coBuildTerms.salePrice + grossGridRevenue;
        ownerPowerSaving = selfUseGen * Math.max(0, params.advParams.electricityPrice - coBuildTerms.salePrice);
    } else {
        investorRevenue = totalSelfUseRevenue + gridRevenue;
        grossGenerationRevenue = grossSelfUseRevenue + grossGridRevenue;
        ownerBenefit = investorRevenue;
    }
    revenueVat = Math.max(0, grossGenerationRevenue - (investorRevenue + roofRentCost));

    const grossOmCost = capacity * params.advParams.omCost / 10;
    const grossInsuranceCost = investment * (params.advParams.insuranceRate / 100);
    const grossOpex = grossOmCost + grossInsuranceCost;
    const omCost = grossOmCost / costTaxFactor;
    const insuranceCost = grossInsuranceCost / costTaxFactor;
    const opex = omCost + insuranceCost;
    const costInputVat = Math.max(0, grossOpex - opex);
    const taxableIncome = investorRevenue - opex;
    const effectiveIncomeTaxRate = getEffectiveIncomeTaxRate(params);
    const tax = taxableIncome > 0 ? taxableIncome * (effectiveIncomeTaxRate / 100) : 0;
    const projectNetIncome = investorRevenue - opex - tax;
    let netIncome = projectNetIncome;
    const debtService = getFinancingDebtService(params, investment, year);
    if (isWithinCoBuildTerm) {
        netIncome = projectNetIncome * coBuildTerms.investorShare;
        ownerBenefit = ownerPowerSaving + projectNetIncome * (1 - coBuildTerms.investorShare);
    } else if (isCoBuild) {
        // 合作期满后按资产移交业主的保守口径：我方不再分红，业主承接项目全部净收益。
        netIncome = 0;
        ownerBenefit = projectNetIncome;
    } else if (params.simpleParams.investmentMode === 'financing') {
        netIncome = projectNetIncome - debtService;
        ownerBenefit = netIncome;
    }

    return {
        year,
        generation: parseFloat(generation.toFixed(3)),
        revenue: parseFloat(investorRevenue.toFixed(3)),
        grossGenerationRevenue: parseFloat(grossGenerationRevenue.toFixed(3)),
        revenueVat: parseFloat(revenueVat.toFixed(3)),
        roofRentCost: parseFloat(roofRentCost.toFixed(3)),
        ownerBenefit: parseFloat(ownerBenefit.toFixed(3)),
        opex: parseFloat(opex.toFixed(3)),
        grossOpex: parseFloat(grossOpex.toFixed(3)),
        costInputVat: parseFloat(costInputVat.toFixed(3)),
        tax: parseFloat(tax.toFixed(3)),
        incomeTax: parseFloat(tax.toFixed(3)),
        vatSurcharge: 0,
        vatPayable: 0,
        netIncome: parseFloat(netIncome.toFixed(3)),
        projectNetIncome: parseFloat(projectNetIncome.toFixed(3)),
        ownerPowerSaving: parseFloat(ownerPowerSaving.toFixed(3)),
        ownerDividend: 0,
        debtService: parseFloat(debtService.toFixed(3)),
        selfUseGen,
        selfUseRevenueNet: isWithinCoBuildTerm
            ? selfUseGen * coBuildTerms.salePrice / revenueTaxFactor
            : totalSelfUseRevenue,
        gridRevenueNet: gridRevenue,
        costNet: opex
    };
};

const calculateExcelStyleTax = (
    params: SolarParamsState,
    results: Array<{ revenueVat: number; costInputVat: number; grossGenerationRevenue: number }>,
    investment: number,
    year: number
) => {
    const vatSurchargeRate = (params.advParams.vatSurchargeRate ?? 0) / 100;
    if (params.advParams.vatTaxpayerType !== 'general') {
        const current = results[Math.max(0, year - 1)];
        const vatPayable = current?.grossGenerationRevenue <= 120 ? 0 : (current?.revenueVat || 0);
        return { vatPayable, surcharge: vatPayable * vatSurchargeRate };
    }

    const constructionVatRate = (params.advParams.constructionVatRate ?? 0) / 100;
    const constructionInputVat = constructionVatRate > 0
        ? (investment / (1 + constructionVatRate)) * constructionVatRate
        : 0;

    const vatBasis = (item: { revenueVat: number; costInputVat: number }) => item.revenueVat - item.costInputVat;

    // 建设期进项税形成留抵余额，并逐年结转至完全抵扣，而不是在固定年份后直接清零。
    // 当累计销项税减进项税首次超过建设期留抵时，仅缴纳当年新增的应纳税额。
    const cumulativeVatBasis = results
        .slice(0, year)
        .reduce((sum, item) => sum + vatBasis(item), 0);
    const previousCumulativeVatBasis = results
        .slice(0, Math.max(0, year - 1))
        .reduce((sum, item) => sum + vatBasis(item), 0);
    const cumulativeVatPayable = Math.max(0, cumulativeVatBasis - constructionInputVat);
    const previousCumulativeVatPayable = Math.max(0, previousCumulativeVatBasis - constructionInputVat);
    const vatPayable = Math.max(0, cumulativeVatPayable - previousCumulativeVatPayable);
    const surcharge = vatPayable * vatSurchargeRate;

    return { vatPayable, surcharge };
};

export const useSolarRetrofit = () => {
    const { modules, toggleModule, updateModule, saveProject, transformers, bills, projectBaseInfo, priceConfig } = useProject();
    const currentModule = modules['retrofit-solar'];
    const storedParams = currentModule?.params || {};
    const storedSelectedSolution = (storedParams.solutions || []).find(
        (solution: SolarSolution) => solution.id === storedParams.selectedSolutionId,
    );
    const discountRate = storedSelectedSolution?.emcDiscountRate
        ?? storedParams.advParams?.emcDiscountRate
        ?? DEFAULTS.advParams.emcDiscountRate;
    const monthlyEmcTariffs = useMemo(() => buildMonthlyEmcTariffs(
        bills,
        priceConfig,
        discountRate,
        {
            projectType: projectBaseInfo.type,
            province: projectBaseInfo.province,
            hasAirConditioning: projectBaseInfo.hasAirConditioning,
        },
    ), [
        bills, priceConfig, discountRate,
        projectBaseInfo.type, projectBaseInfo.province, projectBaseInfo.hasAirConditioning,
    ]);
    const southernAveragePrice = parseFloat(getGenerationWeightedTariff(
        monthlyEmcTariffs,
        'benchmarkPrice',
        getAverageElectricityPrice(priceConfig),
    ).toFixed(4));
    // 参数标准化必须保持引用稳定，否则依赖 params/handleUpdate 的同步 Effect 会反复执行。
    const params = useMemo<SolarParamsState>(() => {
        const storedParams = currentModule?.params || {};
        const rawStoredAdvParams = storedParams.advParams || {};
        const shouldMigrateExcelDefaults = hasLegacyExcelMismatchDefaults(rawStoredAdvParams);
        const storedAdvParams = normalizeLegacyAdvParams(rawStoredAdvParams);
        const normalizedSolutions: SolarSolution[] = (storedParams.solutions || DEFAULTS.solutions).map((solution: SolarSolution) => ({
            ...solution,
            constructionMethod: solution.constructionMethod || 'rooftop',
            cableBrand: solution.cableBrand || 'generic',
            inverterBrand: solution.inverterBrand || 'generic',
            epcPrice: normalizeLegacySolutionPrice(solution),
            investmentMode: solution.investmentMode || 'epc',
            emcSubMode: solution.emcSubMode || DEFAULTS.simpleParams.emcSubMode,
            emcOwnerShareRate: solution.emcOwnerShareRate ?? storedParams.advParams?.emcOwnerShareRate ?? DEFAULTS.advParams.emcOwnerShareRate,
            emcDiscountPrice: solution.emcDiscountPrice ?? storedParams.advParams?.emcDiscountPrice ?? DEFAULTS.advParams.emcDiscountPrice,
            emcDiscountRate: solution.emcDiscountRate ?? storedParams.advParams?.emcDiscountRate ?? DEFAULTS.advParams.emcDiscountRate,
            emcFixedPrice: solution.emcFixedPrice ?? storedParams.advParams?.emcFixedPrice ?? DEFAULTS.advParams.emcFixedPrice,
            emcSouthernAveragePrice: solution.emcSouthernAveragePrice ?? storedParams.advParams?.emcSouthernAveragePrice ?? southernAveragePrice,
            roofRent: solution.roofRent ?? storedParams.advParams?.roofRent ?? DEFAULTS.advParams.roofRent,
            financingRatio: solution.financingRatio ?? storedParams.advParams?.financingRatio ?? DEFAULTS.advParams.financingRatio,
            financingAnnualRate: solution.financingAnnualRate ?? storedParams.advParams?.financingAnnualRate ?? DEFAULTS.advParams.financingAnnualRate,
            financingTermYears: solution.financingTermYears ?? storedParams.advParams?.financingTermYears ?? DEFAULTS.advParams.financingTermYears,
            coBuildInvestorShareRate: solution.coBuildInvestorShareRate ?? storedParams.advParams?.coBuildInvestorShareRate ?? DEFAULTS.advParams.coBuildInvestorShareRate,
            coBuildSalePrice: solution.coBuildSalePrice ?? storedParams.advParams?.coBuildSalePrice ?? DEFAULTS.advParams.coBuildSalePrice,
            coBuildTermYears: solution.coBuildTermYears ?? storedParams.advParams?.coBuildTermYears ?? DEFAULTS.advParams.coBuildTermYears
        }));
        const selectedSolutionId = storedParams.selectedSolutionId || DEFAULTS.selectedSolutionId;
        const selectedSolution = normalizedSolutions.find(solution => solution.id === selectedSolutionId) || normalizedSolutions[0];

        const operationMode = selectedSolution
            ? storedParams.simpleParams?.operationMode || DEFAULTS.simpleParams.operationMode
            : storedParams.simpleParams?.operationMode || DEFAULTS.simpleParams.operationMode;
        const defaultIncomeTaxExempt = operationMode === 'off_grid' || projectBaseInfo.type === 'villa';
        const storedIncomeTaxMode = storedAdvParams.incomeTaxMode ?? DEFAULTS.advParams.incomeTaxMode;

        return {
            mode: storedParams.mode || DEFAULTS.mode,
            selfUseMode: storedParams.selfUseMode || DEFAULTS.selfUseMode,
            simpleParams: {
                ...DEFAULTS.simpleParams,
                ...storedParams.simpleParams,
                ...(selectedSolution ? {
                    capacity: Number(selectedSolution.capacity) > 0
                        ? selectedSolution.capacity
                        : storedParams.simpleParams?.capacity ?? DEFAULTS.simpleParams.capacity,
                    epcPrice: selectedSolution.epcPrice,
                    connectionType: selectedSolution.connectionType,
                    investmentMode: selectedSolution.investmentMode || 'epc',
                    emcSubMode: selectedSolution.emcSubMode || storedParams.simpleParams?.emcSubMode || DEFAULTS.simpleParams.emcSubMode
                } : {})
            },
            advParams: {
                ...DEFAULTS.advParams,
                ...storedAdvParams,
                incomeTaxMode: defaultIncomeTaxExempt && storedIncomeTaxMode !== 'custom'
                    ? 'exempt'
                    : storedIncomeTaxMode,
                emcSouthernAveragePrice: storedAdvParams.emcSouthernAveragePrice ?? southernAveragePrice,
                emcDiscountRate: discountRate,
                emcMonthlyTariffs: monthlyEmcTariffs,
            },
            buildings: storedParams.buildings,
            solutions: normalizedSolutions,
            selectedSolutionId,
            showConsumptionRateAnalysis: storedParams.showConsumptionRateAnalysis ?? DEFAULTS.showConsumptionRateAnalysis,
            consumptionRateScenarios: storedParams.consumptionRateScenarios ?? DEFAULTS.consumptionRateScenarios,
            effectiveSelfConsumptionRate: shouldMigrateExcelDefaults && isClose(storedParams.effectiveSelfConsumptionRate, 100, 0.01)
                ? DEFAULTS.effectiveSelfConsumptionRate
                : storedParams.effectiveSelfConsumptionRate ?? DEFAULTS.effectiveSelfConsumptionRate,
            materialBillItems: storedParams.materialBillItems,
            materialBillNote: storedParams.materialBillNote ?? DEFAULTS.materialBillNote,
            showMaterialBillInReport: storedParams.showMaterialBillInReport ?? DEFAULTS.showMaterialBillInReport,
            canopyOverheightOwnerResponsibility: storedParams.canopyOverheightOwnerResponsibility ?? DEFAULTS.canopyOverheightOwnerResponsibility,
            canopyOverheightResponsibilityNote: storedParams.canopyOverheightResponsibilityNote ?? DEFAULTS.canopyOverheightResponsibilityNote,
            businessTerms: {
                ...DEFAULTS.businessTerms,
                ...storedParams.businessTerms,
            },
        };
    }, [currentModule?.params, southernAveragePrice, discountRate, monthlyEmcTariffs, projectBaseInfo.type]);

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
    // 股权共建面向业主展示，yearlySaving 使用业主侧“电价优惠 + 分红”口径。
    const calculateFinancials = useCallback((p: SolarParamsState, selfRate: number) => {
        const { investment, capacity } = getSolarInvestment(p);
        const yearOne = calculateSolarYearResult(p, selfRate, 1, investment, capacity);
        const vatBreakdown = calculateExcelStyleTax(p, [yearOne], investment, 1);
        const totalTax = parseFloat((yearOne.tax + vatBreakdown.surcharge).toFixed(3));
        const projectNetIncome = yearOne.grossGenerationRevenue
            - yearOne.roofRentCost
            - yearOne.grossOpex
            - vatBreakdown.vatPayable
            - totalTax;
        const coBuildTerms = getCoBuildTerms(p);
        const netIncome = parseFloat((p.simpleParams.investmentMode === 'co_build'
            ? projectNetIncome * coBuildTerms.investorShare
            : p.simpleParams.investmentMode === 'financing'
                ? projectNetIncome - yearOne.debtService
                : projectNetIncome).toFixed(3));
        const ownerBenefit = p.simpleParams.investmentMode === 'co_build'
            ? parseFloat((yearOne.ownerPowerSaving + projectNetIncome * (1 - coBuildTerms.investorShare)).toFixed(3))
            : p.simpleParams.investmentMode === 'financing'
                ? netIncome
            : yearOne.ownerBenefit;

        return {
            investment,
            yearlySaving: p.simpleParams.investmentMode === 'co_build' ? ownerBenefit : netIncome,
            genYear1: yearOne.generation,
            ownerBenefit,
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
        const nextMode = typeof next === 'function' ? next(selfUseMode) : next;
        setSelfUseModeState(nextMode);
        if (nextMode !== params.selfUseMode) {
            handleUpdate({ selfUseMode: nextMode });
        }
    }, [handleUpdate, params.selfUseMode, selfUseMode]);

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
        const benchmarkPrice = params.advParams.emcSouthernAveragePrice;
        if (
            params.simpleParams.investmentMode === 'emc' &&
            (benchmarkPrice === null || benchmarkPrice === undefined || !Number.isFinite(benchmarkPrice))
        ) {
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
        const storageCapacity = modules['retrofit-storage']?.params?.basicParams?.capacity
            || modules['retrofit-storage']?.params?.capacity
            || 0;

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
        } else if (projectBaseInfo.type === 'villa') {
            const billEstimation = estimateAnnualLoad(bills, {
                projectType: 'villa',
                province: projectBaseInfo.province,
                hasAirConditioning: projectBaseInfo.hasAirConditioning ?? true,
            });
            const totalArea = (projectBaseInfo.buildings || []).reduce(
                (sum: number, building: any) => sum + Math.max(0, Number(building.area || 0)),
                0,
            ) || params.simpleParams.area;
            const southernProvince = ['Shanghai', 'Zhejiang', 'Fujian', 'Jiangxi', 'Guangdong', 'Guangxi', 'Hainan', 'Hunan']
                .includes(projectBaseInfo.province);
            const configuredDailyKwh = Math.max(0, Number(projectBaseInfo.villaDailyKwh || 0));
            const annualLoadKwh = configuredDailyKwh > 0
                ? configuredDailyKwh * 365
                : billEstimation.annualizedKwh || estimateVillaAnnualLoadKwh(
                    totalArea,
                    projectBaseInfo.hasAirConditioning ?? true,
                    southernProvince,
                );
            const profile = buildPvConsumptionProfile({
                annualLoadKwh,
                projectType: 'villa',
                pvCapacityKw: totalCapacity,
                dailySunHours: params.advParams.dailySunHours,
                performanceRatio: (params.advParams.prValue / 100) * (params.advParams.azimuthEfficiency / 100),
                location: {
                    latitude: projectBaseInfo.latitude,
                    longitude: projectBaseInfo.longitude,
                    province: projectBaseInfo.province,
                    city: projectBaseInfo.city,
                },
                storage: {
                    enabled: Boolean(modules['retrofit-storage']?.isActive && storageCapacity > 0),
                    powerKw: Number(modules['retrofit-storage']?.params?.basicParams?.power || 0),
                    capacityKwh: Number(storageCapacity),
                    dod: Number(modules['retrofit-storage']?.params?.advParams?.dod || 90) / 100,
                    rte: Number(modules['retrofit-storage']?.params?.advParams?.rte || 88) / 100,
                },
            });
            const pvKwh = profile.reduce((sum, point) => sum + point.pv, 0);
            const consumedPvKwh = profile.reduce(
                (sum, point) => sum + point.directConsumption + point.storageCharge,
                0,
            );
            const rate = pvKwh > 0 ? Math.min(100, Math.max(0, consumedPvKwh / pvKwh * 100)) : 0;
            setCalculatedSelfConsumption(Math.round(rate));
            setConsumptionResult(null);
        } else {
            // 与光伏消纳曲线保持同一口径：先用电费单补齐全年负荷，再逐小时匹配光伏与负荷。
            // 旧逻辑把电费单总量直接当作全年负荷（单月账单会被低估约 12 倍），
            // 并用“年负荷 / 年发电量”代替时序消纳，导致曲线已全额消纳但这里仍显示很低。
            const billEstimation = estimateAnnualLoad(bills, {
                projectType: projectBaseInfo.type,
                province: projectBaseInfo.province,
                hasAirConditioning: projectBaseInfo.hasAirConditioning,
            });
            const annualLoadKwh = billEstimation.annualizedKwh
                || transformers.reduce((total, transformer) => total + Number(transformer.capacity || 0), 0) * 0.45 * 2000
                || 1000000;
            const storageParams = modules['retrofit-storage']?.params || {};
            const profile = buildPvConsumptionProfile({
                annualLoadKwh,
                projectType: projectBaseInfo.type,
                pvCapacityKw: totalCapacity,
                dailySunHours: Number(params.advParams.dailySunHours || 4),
                performanceRatio: Number(params.advParams.prValue || 80) / 100
                    * Number(params.advParams.azimuthEfficiency || 100) / 100,
                location: {
                    latitude: projectBaseInfo.latitude,
                    longitude: projectBaseInfo.longitude,
                    province: projectBaseInfo.province,
                    city: projectBaseInfo.city,
                },
                storage: {
                    enabled: Boolean(modules['retrofit-storage']?.isActive && storageParams.dispatchMode !== 'hybrid'),
                    powerKw: Number(storageParams.basicParams?.power ?? 261),
                    capacityKwh: Number(storageParams.basicParams?.capacity ?? 522),
                    dod: Number(storageParams.advParams?.dod || 90) / 100,
                    rte: Number(storageParams.advParams?.rte || 88) / 100,
                },
            });
            const pvKwh = profile.reduce((sum, point) => sum + point.pv, 0);
            const consumedPvKwh = profile.reduce(
                (sum, point) => sum + point.directConsumption + point.storageCharge,
                0,
            );
            const rate = pvKwh > 0 ? Math.min(100, Math.max(0, consumedPvKwh / pvKwh * 100)) : 0;
            setCalculatedSelfConsumption(Math.round(rate));
            setConsumptionResult(null);
        }
    }, [selfUseMode, projectBaseInfo, params.simpleParams.capacity, params.advParams.dailySunHours, params.advParams.prValue, bills, modules, transformers]);

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
    const coBuildTerms = getCoBuildTerms(params);
    const isCoBuild = params.simpleParams.investmentMode === 'co_build';
    const isFinancing = params.simpleParams.investmentMode === 'financing';
    const financingRatio = Math.min(100, Math.max(0, params.advParams.financingRatio || 0)) / 100;
    const investorInitialInvestment = isCoBuild
        ? investment * coBuildTerms.investorShare
        : isFinancing
            ? investment * (1 - financingRatio)
            : investment;
    const ownerInitialInvestment = isCoBuild ? investment * (1 - coBuildTerms.investorShare) : 0;
    const cashFlows = [-investorInitialInvestment];
    const ownerCashFlows = [-ownerInitialInvestment];

    let cumulativeNet = -investorInitialInvestment;
    let paybackYear = -1;
    let ownerCumulativeNet = -ownerInitialInvestment;
    let ownerPaybackYear = -1;
    const projectLifeYears = Math.max(1, Math.min(30, Math.round(params.advParams.projectLifeYears || DEFAULTS.advParams.projectLifeYears)));

    for (let year = 1; year <= projectLifeYears; year++) {
        const yearResult = calculateSolarYearResult(params, selfRate, year, investment, capacity);
        const vatBreakdown = calculateExcelStyleTax(params, [...details, yearResult], investment, year);
        yearResult.vatPayable = parseFloat(vatBreakdown.vatPayable.toFixed(3));
        yearResult.vatSurcharge = parseFloat(vatBreakdown.surcharge.toFixed(3));
        yearResult.tax = parseFloat((yearResult.tax + vatBreakdown.surcharge).toFixed(3));
        const projectNetIncome = yearResult.grossGenerationRevenue
            - yearResult.roofRentCost
            - yearResult.grossOpex
            - yearResult.vatPayable
            - yearResult.tax;
        yearResult.projectNetIncome = parseFloat(projectNetIncome.toFixed(3));
        if (isCoBuild && year <= coBuildTerms.termYears) {
            yearResult.netIncome = parseFloat((projectNetIncome * coBuildTerms.investorShare).toFixed(3));
            yearResult.ownerDividend = parseFloat((projectNetIncome * (1 - coBuildTerms.investorShare)).toFixed(3));
            yearResult.ownerBenefit = parseFloat((yearResult.ownerPowerSaving + yearResult.ownerDividend).toFixed(3));
        } else if (isCoBuild) {
            yearResult.netIncome = 0;
            yearResult.ownerDividend = 0;
            yearResult.ownerBenefit = parseFloat(projectNetIncome.toFixed(3));
        } else if (isFinancing) {
            yearResult.netIncome = parseFloat((projectNetIncome - yearResult.debtService).toFixed(3));
            yearResult.ownerBenefit = yearResult.netIncome;
        } else {
            yearResult.netIncome = parseFloat(projectNetIncome.toFixed(3));
        }

        details.push(yearResult);
        cashFlows.push(yearResult.netIncome);
        ownerCashFlows.push(isCoBuild ? yearResult.ownerBenefit : 0);
        cumulativeNet += yearResult.netIncome;
        if (paybackYear === -1 && cumulativeNet >= 0 && yearResult.netIncome > 0) {
            paybackYear = year - (cumulativeNet / yearResult.netIncome);
        }
        if (isCoBuild) {
            ownerCumulativeNet += yearResult.ownerBenefit;
            if (ownerPaybackYear === -1 && ownerCumulativeNet >= 0 && yearResult.ownerBenefit > 0) {
                ownerPaybackYear = year - (ownerCumulativeNet / yearResult.ownerBenefit);
            }
        }
    }

    const rev25Year = details.reduce((sum: number, d: any) => sum + d.netIncome, 0);
    const totalOwnerBenefit25 = details.reduce((sum: number, d: any) => sum + d.ownerBenefit, 0);
    const totalGenerationLifecycle = details.reduce((sum: number, d: any) => sum + d.generation, 0);
    const investorIrr = investorInitialInvestment > 0 ? calculateIRRFromCashFlows(cashFlows) : 0;
    const ownerIrr = isCoBuild && ownerInitialInvestment > 0 ? calculateIRRFromCashFlows(ownerCashFlows) : 0;
    const ownerBenefitDuringTerm = isCoBuild
        ? details.slice(0, coBuildTerms.termYears).reduce((sum: number, d: any) => sum + d.ownerBenefit, 0)
        : 0;
    const ownerBenefitAfterTerm = isCoBuild
        ? details.slice(coBuildTerms.termYears).reduce((sum: number, d: any) => sum + d.ownerBenefit, 0)
        : 0;
    const ownerBenefitFirstYearAfterTerm = isCoBuild
        ? details[coBuildTerms.termYears]?.ownerBenefit || 0
        : 0;

    return {
        genYear1: details.length > 0 ? details[0].generation : 0,
        investorInitialInvestment: parseFloat(investorInitialInvestment.toFixed(3)),
        ownerInitialInvestment: parseFloat(ownerInitialInvestment.toFixed(3)),
        projectLifeYears,
        lifecycleRevenue: parseFloat(rev25Year.toFixed(3)),
        totalOwnerBenefitLifecycle: parseFloat(totalOwnerBenefit25.toFixed(3)),
        totalGenerationLifecycle: parseFloat(totalGenerationLifecycle.toFixed(3)),
        // 保留旧字段名，兼容现有报告组件；数值口径已改为项目生命周期。
        rev25Year: parseFloat(rev25Year.toFixed(3)),
        totalOwnerBenefit25: parseFloat(totalOwnerBenefit25.toFixed(3)),
        ownerBenefitDuringTerm: parseFloat(ownerBenefitDuringTerm.toFixed(3)),
        ownerBenefitAfterTerm: parseFloat(ownerBenefitAfterTerm.toFixed(3)),
        ownerBenefitFirstYearAfterTerm: parseFloat(ownerBenefitFirstYearAfterTerm.toFixed(3)),
        investorIrr,
        ownerIrr,
        irr: isCoBuild ? ownerIrr : investorIrr,
        paybackPeriod: isCoBuild
            ? (ownerPaybackYear > 0 ? parseFloat(ownerPaybackYear.toFixed(2)) : projectLifeYears)
            : (paybackYear > 0 ? parseFloat(paybackYear.toFixed(2)) : projectLifeYears),
        cashFlows,
        ownerCashFlows,
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
