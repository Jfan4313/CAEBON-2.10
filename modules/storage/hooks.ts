import { useState, useEffect, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { COPYRIGHT_RELEASE_FEATURES } from '../../shared/config/productIdentity';
import {
    StorageBasicParams,
    StorageAdvParams,
    StorageAiFeatures,
    StorageDispatchMode,
    StorageInvestmentConfig,
    StorageSimulationData,
    StorageFinancials
} from './types';
import { getProjectLoadProfile } from '../../shared/utils/projectLoadProfiles';
import { annualizeBillEnergy, buildPvConsumptionProfile } from '../../shared/utils/pvConsumption';
import { optimizeSolarStorageCapacity } from '../../shared/utils/solarStorageOptimization';
import { calculateStorageRecommendation } from './recommendation';

export function useStorageLogic() {
    const { modules, updateModule, toggleModule, priceConfig, transformers, bills, saveProject, projectBaseInfo } = useProject();
    const currentModule = modules['retrofit-storage'];
    const solarModule = modules['retrofit-solar'];
    const isOffGridSolar = solarModule?.params?.simpleParams?.operationMode === 'off_grid';

    const savedParams = currentModule.params || {};

    // Get O&M rate from global project context
    const omRate = projectBaseInfo?.omRate ?? 0;

    // --- State ---
    const [mode, setMode] = useState<'simple' | 'advanced'>(savedParams.mode || 'advanced');
    const [isChartExpanded, setIsChartExpanded] = useState(false);

    const [basicParams, setBasicParams] = useState<StorageBasicParams>(savedParams.basicParams || {
        power: 261,
        capacity: 522,
        unitCost: 1200,
    });
    const [dispatchMode, setDispatchMode] = useState<StorageDispatchMode>(savedParams.dispatchMode || 'pv_surplus');

    const [advParams, setAdvParams] = useState<StorageAdvParams>(savedParams.advParams || {
        dod: 90,
        rte: 88,
        cycles: 6000,
        degradation: 1.5,
        auxPower: 1.5,
    });

    const [strategyType, setStrategyType] = useState<'baseline' | 'ai'>(
        COPYRIGHT_RELEASE_FEATURES.artificialIntelligencePlatform && savedParams.strategyType === 'ai' ? 'ai' : 'baseline'
    );
    const [baselineMode, setBaselineMode] = useState<'2c2d' | '1c1d'>(savedParams.baselineMode || '1c1d');
    const [aiFeatures, setAiFeatures] = useState<StorageAiFeatures>(savedParams.aiFeatures || {
        dynamicPricing: false,
        demandManagement: false,
        pvSelfConsumption: true,
    });

    const [investmentConfig, setInvestmentConfig] = useState<StorageInvestmentConfig>(savedParams.investmentConfig || {
        mode: 'self',
        emcOwnerShareRate: 15
    });

    const [marketPriceModel, setMarketPriceModel] = useState<'tou' | 'spot'>(savedParams.marketPriceModel || 'tou');

    // --- Mode Switching Logic ---
    useEffect(() => {
        if (mode === 'simple') {
            if (strategyType !== 'baseline' || baselineMode !== '2c2d') {
                setStrategyType('baseline');
                setBaselineMode('2c2d');
                setAiFeatures(prev => ({ ...prev, pvSelfConsumption: false, demandManagement: false }));
            }
        } else {
            if (!savedParams.aiFeatures && !aiFeatures.pvSelfConsumption) {
                const hasSolar = solarModule?.isActive && solarModule.kpiPrimary.value !== '0 kW';
                if (hasSolar && !aiFeatures.pvSelfConsumption) {
                    setAiFeatures(prev => ({ ...prev, pvSelfConsumption: true }));
                }
            }
        }
    }, [mode, solarModule, strategyType, baselineMode, aiFeatures.pvSelfConsumption, savedParams.aiFeatures]);

    useEffect(() => {
        if (isOffGridSolar && dispatchMode !== 'pv_surplus') {
            setDispatchMode('pv_surplus');
        }
    }, [isOffGridSolar, dispatchMode]);

    // --- Environment calculations ---
    const totalTransformerCap = useMemo(() => {
        if (transformers.length > 0) {
            return transformers.reduce((acc, t) => acc + t.capacity, 0);
        }
        return 800;
    }, [transformers]);

    const maxHistoricalLoad = useMemo(() => {
        if (projectBaseInfo.type === 'villa' && Number(projectBaseInfo.villaDailyKwh || 0) > 0) {
            const profile = getProjectLoadProfile('villa');
            const factor = Number(projectBaseInfo.villaDailyKwh) / Math.max(0.0001, profile.reduce((sum, value) => sum + value, 0));
            return Math.ceil(Math.max(...profile) * factor);
        }
        if (bills.length > 0) {
            const maxMonthKwh = Math.max(...bills.map(b => b.kwh));
            return Math.round((maxMonthKwh / 720) * 2.2);
        }
        return Math.round(totalTransformerCap * 0.35);
    }, [bills, totalTransformerCap, projectBaseInfo.type, projectBaseInfo.villaDailyKwh]);

    const billedEnergy = useMemo(() => annualizeBillEnergy(bills, {
        projectType: projectBaseInfo.type,
        province: projectBaseInfo.province,
        hasAirConditioning: projectBaseInfo.hasAirConditioning,
    }), [bills, projectBaseInfo.type, projectBaseInfo.province, projectBaseInfo.hasAirConditioning]);

    const pvCapacity = useMemo(() => {
        if (solarModule && solarModule.isActive) {
            const match = solarModule.kpiPrimary.value.match(/(\d+(\.\d+)?)/);
            return match ? parseFloat(match[0]) : 0;
        }
        return 0;
    }, [solarModule]);

    const remainingCap = totalTransformerCap - maxHistoricalLoad;
    const isOverloadRisk = basicParams.power > remainingCap;

    const fallbackAnnualLoadKwh = useMemo(() => {
        const profile = getProjectLoadProfile(projectBaseInfo.type);
        return profile.reduce((total, factor) => total + factor * Math.max(1, maxHistoricalLoad), 0) * 365;
    }, [projectBaseInfo.type, maxHistoricalLoad]);

    const villaAnnualLoadKwh = projectBaseInfo.type === 'villa'
        ? Math.max(0, Number(projectBaseInfo.villaDailyKwh || 0)) * 365
        : 0;
    const annualLoadKwh = villaAnnualLoadKwh || billedEnergy.annualizedKwh || fallbackAnnualLoadKwh;

    const pvConsumptionData = useMemo(() => buildPvConsumptionProfile({
        annualLoadKwh,
        projectType: projectBaseInfo.type,
        pvCapacityKw: pvCapacity,
        dailySunHours: Number(solarModule?.params?.advParams?.dailySunHours || 4),
        performanceRatio: Number(solarModule?.params?.advParams?.prValue || 80) / 100 * Number(solarModule?.params?.advParams?.azimuthEfficiency || 100) / 100,
        location: {
            latitude: projectBaseInfo.latitude,
            longitude: projectBaseInfo.longitude,
            province: projectBaseInfo.province,
            city: projectBaseInfo.city,
        },
        storage: {
            enabled: dispatchMode === 'pv_surplus',
            powerKw: basicParams.power,
            capacityKwh: basicParams.capacity,
            dod: advParams.dod / 100,
            rte: advParams.rte / 100,
        }
    }), [annualLoadKwh, projectBaseInfo, pvCapacity, solarModule, dispatchMode, basicParams.power, basicParams.capacity, advParams.dod, advParams.rte]);

    const sourceProfile = useMemo(() => ({
        baseLoadCurve: pvConsumptionData.map(point => point.load),
        pvCurve: pvConsumptionData.map(point => point.pv),
    }), [pvConsumptionData]);

    const storageRecommendation = useMemo(() => {
        const surplusCurve = sourceProfile.pvCurve.map((pv, hour) => Math.max(0, pv - sourceProfile.baseLoadCurve[hour]));
        const deficitCurve = sourceProfile.baseLoadCurve.map((load, hour) => Math.max(0, load - sourceProfile.pvCurve[hour]));
        return calculateStorageRecommendation({
            surplusCurveKw: surplusCurve,
            deficitCurveKw: deficitCurve,
            dod: advParams.dod / 100,
            rte: advParams.rte / 100,
            currentPowerKw: basicParams.power,
            currentCapacityKwh: basicParams.capacity,
            cycleMode: baselineMode,
        });
    }, [sourceProfile, advParams.dod, advParams.rte, basicParams.power, basicParams.capacity, baselineMode]);

    const hourlyPrices = useMemo(() => {
        let hourlyPrices = Array(24).fill(0.8);
        if (marketPriceModel === 'spot') {
            hourlyPrices = [
                0.3, 0.3, 0.3, 0.3, 0.3, 0.4, 0.6, 0.8,
                0.5, 0.2, 0.1, 0.05, 0.05, 0.1, 0.2, 0.5,
                0.9, 1.2, 1.5, 1.8, 1.4, 0.8, 0.5, 0.4
            ];
        } else if (priceConfig.mode === 'tou') {
            priceConfig.touSegments.forEach(seg => {
                for (let h = seg.start; h < seg.end; h++) hourlyPrices[h] = seg.price;
            });
        } else if (priceConfig.mode === 'fixed') {
            hourlyPrices.fill(priceConfig.fixedPrice);
        }
        return hourlyPrices;
    }, [marketPriceModel, priceConfig]);

    const jointRecommendation = useMemo(() => optimizeSolarStorageCapacity({
        annualLoadKwh,
        projectType: projectBaseInfo.type,
        maxPvCapacityKw: Math.max(0, Number(solarModule?.params?.simpleParams?.capacity || pvCapacity)),
        dailySunHours: Number(solarModule?.params?.advParams?.dailySunHours || 4),
        performanceRatio: Number(solarModule?.params?.advParams?.prValue || 80) / 100
            * Number(solarModule?.params?.advParams?.azimuthEfficiency || 100) / 100,
        location: {
            latitude: projectBaseInfo.latitude,
            longitude: projectBaseInfo.longitude,
            province: projectBaseInfo.province,
            city: projectBaseInfo.city,
        },
        hourlyPrices,
        pvUnitCostYuanPerWp: Number(solarModule?.params?.simpleParams?.epcPrice || 2),
        storageUnitCostYuanPerKwh: basicParams.unitCost,
        storageDod: advParams.dod / 100,
        storageRte: advParams.rte / 100,
        pvOmYuanPerWYear: Number(solarModule?.params?.advParams?.omCost || 0.03),
        storageOmRatePercent: Number(projectBaseInfo.omRate || 0),
        discountRatePercent: Number(projectBaseInfo.discountRate || 5),
        horizonYears: Number(solarModule?.params?.advParams?.projectLifeYears || 10),
        generationDays: Number(solarModule?.params?.advParams?.generationDays || 365),
        storageOperatingDays: 330,
    }), [
        annualLoadKwh, projectBaseInfo, solarModule, pvCapacity, hourlyPrices,
        basicParams.unitCost, advParams.dod, advParams.rte,
    ]);

    // --- Simulation Logic ---
    const simulationData: StorageSimulationData[] = useMemo(() => {
        const data: StorageSimulationData[] = [];
        const { power } = basicParams;

        const { baseLoadCurve, pvCurve } = sourceProfile;

        const chargeRate = power;
        const usableCapacity = basicParams.capacity * (advParams.dod / 100);
        const chargeEfficiency = Math.sqrt(advParams.rte / 100);
        const dischargeEfficiency = Math.sqrt(advParams.rte / 100);
        let stateOfCharge = dispatchMode === 'pv_surplus' ? 0 : usableCapacity * 0.15;

        for (let i = 0; i < 24; i++) {
            const price = hourlyPrices[i];
            const rawLoad = baseLoadCurve[i];
            const pv = pvCurve[i];
            const netLoadBeforeStorage = Math.max(0, rawLoad - pv);

            let storageAction = 0;

            if (dispatchMode === 'pv_surplus') {
                const pvSurplus = Math.max(0, pv - rawLoad);
                if (pvSurplus > 0 && stateOfCharge < usableCapacity) {
                    storageAction = -Math.min(chargeRate, pvSurplus);
                } else if (netLoadBeforeStorage > 0 && stateOfCharge > 0) {
                    storageAction = Math.min(chargeRate, netLoadBeforeStorage);
                }
            } else if (mode === 'simple' || strategyType === 'baseline') {
                if (baselineMode === '2c2d' || mode === 'simple') {
                    if ((i >= 0 && i < 7) || (i >= 12 && i < 14)) storageAction = -chargeRate;
                    else if ((i >= 9 && i < 11) || (i >= 15 && i < 21)) storageAction = chargeRate;
                } else {
                    if (i >= 0 && i < 8) storageAction = -chargeRate;
                    else if ((i >= 9 && i < 12) || (i >= 15 && i < 20)) {
                        storageAction = chargeRate;
                    }
                }
            } else {
                const avgPrice = hourlyPrices.reduce((a, b) => a + b, 0) / 24;
                if (aiFeatures.pvSelfConsumption && pv > rawLoad) {
                    storageAction = -Math.min(chargeRate, pv - rawLoad);
                } else if (aiFeatures.demandManagement && netLoadBeforeStorage > 180) {
                    storageAction = Math.min(chargeRate, netLoadBeforeStorage - 180);
                } else if (aiFeatures.dynamicPricing) {
                    if (price < avgPrice * 0.6) storageAction = -chargeRate;
                    else if (price > avgPrice * 1.4) storageAction = chargeRate;
                }
            }

            if (storageAction < 0) {
                const charge = Math.min(-storageAction, (usableCapacity - stateOfCharge) / chargeEfficiency);
                storageAction = -Math.max(0, charge);
                stateOfCharge += charge * chargeEfficiency;
            } else if (storageAction > 0) {
                const discharge = Math.min(storageAction, stateOfCharge * dischargeEfficiency);
                storageAction = Math.max(0, discharge);
                stateOfCharge -= discharge / dischargeEfficiency;
            }

            data.push({
                hour: `${i}:00`,
                price: price,
                load: rawLoad,
                pv: pv,
                action: storageAction,
                soc: basicParams.capacity > 0
                    ? Math.max(0, Math.min(100, 100 - advParams.dod + stateOfCharge / basicParams.capacity * 100))
                    : 0,
                gridLoad: Math.max(0, rawLoad - pv - storageAction),
                transformerLimit: totalTransformerCap
            });
        }
        return data;
    }, [basicParams, advParams.dod, advParams.rte, dispatchMode, strategyType, baselineMode, aiFeatures, hourlyPrices, sourceProfile, totalTransformerCap, mode]);

    // Financial Metrics Calculation
    const financials: StorageFinancials = useMemo(() => {
        const investment = (basicParams.capacity * basicParams.unitCost) / 10000;

        let dailyArbitrage = 0;
        const feedInTariff = isOffGridSolar ? 0 : Number(solarModule?.params?.advParams?.feedInTariff || 0.35);
        simulationData.forEach(d => {
            if (d.action > 0) dailyArbitrage += d.action * d.price;
            else dailyArbitrage += d.action * (dispatchMode === 'pv_surplus' ? feedInTariff : d.price);
        });

        const annualArbitrage = (dailyArbitrage * 330) / 10000;
        let annualDemandSaving = 0;

        if (mode === 'advanced' && strategyType === 'ai' && aiFeatures.demandManagement) {
            annualDemandSaving = (50 * 40 * 12) / 10000;
        }

        const totalYearlySaving = Math.max(0, annualArbitrage + annualDemandSaving);
        const isEmc = investmentConfig.mode === 'emc';
        const ownerBenefit = isEmc ? totalYearlySaving * (investmentConfig.emcOwnerShareRate / 100) : totalYearlySaving;
        const investorRevenue = isEmc ? totalYearlySaving * (1 - investmentConfig.emcOwnerShareRate / 100) : totalYearlySaving;

        // O&M Deduction
        const annualOpex = investment * (omRate / 100);
        const netInvestorRevenue = investorRevenue - annualOpex;

        const payback = netInvestorRevenue > 0 ? investment / netInvestorRevenue : 0;

        // Note: For storage we keep things simple here since RevenueAnalysis.tsx will do the rigorous 20 year calculation.
        // We just pass out the first year's total net saving as `yearlySaving` for the module context.
        return {
            investment,
            arbitrage: Math.max(0, annualArbitrage),
            demand: annualDemandSaving,
            totalSaving: Math.max(0, netInvestorRevenue), // Use net revenue instead
            ownerBenefit,
            investorRevenue: netInvestorRevenue,
            payback
        };
    }, [simulationData, basicParams, advParams, strategyType, aiFeatures, mode, investmentConfig, omRate, dispatchMode, solarModule, isOffGridSolar]);

    const recommendedFinancials: StorageFinancials | null = useMemo(() => {
        if (!storageRecommendation.available) return null;

        const investment = storageRecommendation.capacity * basicParams.unitCost / 10000;
        const deficitCurve = sourceProfile.baseLoadCurve.map((load, hour) => Math.max(0, load - sourceProfile.pvCurve[hour]));
        const totalDeficit = deficitCurve.reduce((total, value) => total + value, 0);
        const averageDischargePrice = totalDeficit > 0
            ? deficitCurve.reduce((total, value, hour) => total + value * hourlyPrices[hour], 0) / totalDeficit
            : 0;
        const feedInTariff = isOffGridSolar ? 0 : Number(solarModule?.params?.advParams?.feedInTariff || 0.35);
        const dailyGrossBenefit = Math.max(
            0,
            storageRecommendation.deliverableEnergyKwh * averageDischargePrice
                - storageRecommendation.usableShiftKwh * feedInTariff,
        );
        const annualBenefit = dailyGrossBenefit * 330 / 10000;
        const isEmc = investmentConfig.mode === 'emc';
        const ownerBenefit = isEmc ? annualBenefit * investmentConfig.emcOwnerShareRate / 100 : annualBenefit;
        const investorGrossBenefit = isEmc ? annualBenefit * (1 - investmentConfig.emcOwnerShareRate / 100) : annualBenefit;
        const annualOpex = investment * omRate / 100;
        const investorRevenue = investorGrossBenefit - annualOpex;

        return {
            investment,
            arbitrage: annualBenefit,
            demand: 0,
            totalSaving: Math.max(0, investorRevenue),
            ownerBenefit,
            investorRevenue,
            payback: investorRevenue > 0 ? investment / investorRevenue : 0,
        };
    }, [
        storageRecommendation, basicParams.unitCost, sourceProfile, hourlyPrices, isOffGridSolar,
        solarModule, investmentConfig, omRate,
    ]);

    // Sync to Global Context
    useEffect(() => {
        const newParams = {
            mode,
            dispatchMode,
            basicParams,
            advParams,
            strategyType,
            baselineMode,
            aiFeatures,
            investmentConfig,
            marketPriceModel,
            jointRecommendation,
            recommendation: storageRecommendation.available ? {
                power: storageRecommendation.power,
                capacity: storageRecommendation.capacity,
                dailySurplusKwh: storageRecommendation.dailySurplusKwh,
                usableShiftKwh: storageRecommendation.usableShiftKwh,
                deliverableEnergyKwh: storageRecommendation.deliverableEnergyKwh,
                currentCaptureRate: storageRecommendation.currentCaptureRate,
                requestedCycles: storageRecommendation.requestedCycles,
                effectiveCycles: storageRecommendation.effectiveCycles,
                cycleModeReason: storageRecommendation.cycleModeReason,
                basis: billedEnergy.monthCount > 0
                    ? `${billedEnergy.monthCount}个月账单+项目类型典型曲线+后续负荷可消纳量`
                    : '变压器容量+项目类型典型曲线+后续负荷可消纳量'
            } : undefined
        };

        const currentStoredParams = JSON.stringify(currentModule.params);
        if (JSON.stringify(newParams) !== currentStoredParams) {
            updateModule('retrofit-storage', {
                params: newParams,
                investment: financials.investment,
                yearlySaving: financials.totalSaving,
                kpiPrimary: { label: '装机规模', value: `${basicParams.power}kW/${basicParams.capacity}kWh` },
                kpiSecondary: { label: dispatchMode === 'pv_surplus' ? '光伏余电增值' : '套利收益', value: `¥${financials.arbitrage.toFixed(1)}万/年` },
                strategy: dispatchMode === 'pv_surplus' ? '光伏余电消纳' : (mode === 'advanced' ? (strategyType === 'ai' ? 'AI全局寻优' : '基础策略') : '标准策略'),
            });
        }
    }, [
        mode, dispatchMode, basicParams, advParams, strategyType, baselineMode, aiFeatures, investmentConfig, marketPriceModel, jointRecommendation, storageRecommendation, billedEnergy.monthCount,
        financials, currentModule.params, updateModule
    ]);

    return {
        // State
        mode, setMode,
        dispatchMode, setDispatchMode,
        isChartExpanded, setIsChartExpanded,
        basicParams, setBasicParams,
        advParams, setAdvParams,
        strategyType, setStrategyType,
        baselineMode, setBaselineMode,
        aiFeatures, setAiFeatures,
        investmentConfig, setInvestmentConfig,
        marketPriceModel, setMarketPriceModel,
        // Computed
        totalTransformerCap,
        maxHistoricalLoad,
        billedEnergy,
        storageRecommendation,
        pvConsumptionData,
        remainingCap,
        isOverloadRisk,
        simulationData,
        financials,
        recommendedFinancials,
        jointRecommendation,
        isOffGridSolar,
        // Context Actions
        solarModule,
        saveProject,
        toggleModule,
        currentModule
    };
}
