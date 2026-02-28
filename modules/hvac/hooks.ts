import { useState, useEffect, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { HvacGlobalParams, HvacBuilding, HvacSchedule, HvacFinancials } from './types';

export const STRATEGIES = {
    basic: { name: '基础节能', targetCOP: 4.5, unitCost: 1500 },
    intermediate: { name: '高效机房', targetCOP: 5.2, unitCost: 2500 },
    advanced: { name: '磁悬浮+AI', targetCOP: 6.2, unitCost: 4000 },
    cchp: { name: '燃气三联供(CCHP)', targetCOP: 7.5, unitCost: 8000 }
};

export function useHvacLogic() {
    const { modules, toggleModule, updateModule, saveProject, priceConfig, projectBaseInfo } = useProject();
    const currentModule = modules['retrofit-hvac'];
    const savedParams = currentModule.params || {};

    // Get O&M rate from global project context
    const omRate = projectBaseInfo?.omRate || 1.5;

    const [mode, setMode] = useState<'simple' | 'advanced'>(savedParams.mode || 'simple');

    // --- State ---
    const [globalParams, setGlobalParams] = useState<HvacGlobalParams>(savedParams.globalParams || {
        electricityPrice: 0.85,
        gasPrice: 3.5,
        currentAvgCOP: 3.2,
        discountRate: 5.0,
        maintenanceGrowth: 2.0,
        investmentMode: 'self',
        emcOwnerShareRate: 20
    });

    const [schedule, setSchedule] = useState<HvacSchedule>(savedParams.schedule || { start: 8, end: 18 });

    const [hvacBuildings, setHvacBuildings] = useState<HvacBuilding[]>(savedParams.hvacBuildings || [
        { id: 1, name: '1号生产车间', desc: '中央空调系统', load: 1200, area: 5000, active: true, strategy: 'cchp', runHours: 2500, costMode: 'power', customUnitCost: 0, customTotalInvest: 0, customCOP: 0 },
        { id: 2, name: '研发中心大楼', desc: '多联机VRV', load: 450, area: 2000, active: true, strategy: 'basic', runHours: 2000, costMode: 'power', customUnitCost: 0, customTotalInvest: 0, customCOP: 0 }
    ]);

    const [isChartExpanded, setIsChartExpanded] = useState(false);
    const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);

    // --- Calculations ---
    const financials: HvacFinancials = useMemo(() => {
        let totalInvest = 0;
        let totalYearlySaving = 0;
        let cchpGasCost = 0;
        let cchpElecGen = 0;

        hvacBuildings.forEach((b) => {
            if (!b.active) return;
            const strat = STRATEGIES[b.strategy as keyof typeof STRATEGIES];

            let invest = 0;
            if (mode === 'simple') {
                invest = (b.load * strat.unitCost) / 10000;
            } else {
                if (b.costMode === 'fixed') invest = b.customTotalInvest;
                else if (b.costMode === 'area') invest = (b.area * (b.customUnitCost || 200)) / 10000;
                else invest = (b.load * (b.customUnitCost || strat.unitCost)) / 10000;
            }
            totalInvest += invest;

            const oldP = b.load / globalParams.currentAvgCOP;
            const baselineElecCost = (oldP * b.runHours * globalParams.electricityPrice) / 10000;

            if (b.strategy === 'cchp') {
                const equivalentElecNeeded = b.load / strat.targetCOP * b.runHours;
                const gasNeededVolume = equivalentElecNeeded / 3.5;
                const gasCost = (gasNeededVolume * globalParams.gasPrice) / 10000;

                const extraElecGen = gasNeededVolume * 0.5;
                const extraElecValue = (extraElecGen * globalParams.electricityPrice) / 10000;

                cchpGasCost += gasCost;
                cchpElecGen += extraElecGen;

                const saving = baselineElecCost - gasCost + extraElecValue;
                totalYearlySaving += saving;
            } else {
                const effCOP = (mode === 'advanced' && b.customCOP > 0) ? b.customCOP : strat.targetCOP;
                const newP = b.load / effCOP;
                const newElecCost = (newP * b.runHours * globalParams.electricityPrice) / 10000;

                const saving = baselineElecCost - newElecCost;
                totalYearlySaving += saving;
            }
        });

        const isEmc = globalParams.investmentMode === 'emc';
        const ownerShareRate = isEmc ? (globalParams.emcOwnerShareRate / 100) : 0;

        const ownerBenefit = isEmc ? (totalYearlySaving * ownerShareRate) : totalYearlySaving;
        const investorRevenue = isEmc ? (totalYearlySaving * (1 - ownerShareRate)) : totalYearlySaving;

        // O&M Cost Deduction Loop
        const opexYearly = totalInvest * (omRate / 100);
        let cumulativeInvestorCash = -totalInvest;
        let paybackY = 0;
        let paybackFound = false;

        const cashFlows = [-totalInvest];
        for (let y = 1; y <= 15; y++) {
            const netCashFlow = investorRevenue - opexYearly;
            cashFlows.push(netCashFlow);

            const prevCumulative = cumulativeInvestorCash;
            cumulativeInvestorCash += netCashFlow;

            if (!paybackFound && cumulativeInvestorCash >= 0) {
                paybackY = (y - 1) + (Math.abs(prevCumulative) / netCashFlow);
                paybackFound = true;
            }
        }

        if (!paybackFound) paybackY = 16;

        // Simple IRR calculation for 15 years
        const calculateIRR = (cashFlows: number[]) => {
            let guess = 0.1;
            for (let i = 0; i < 30; i++) {
                let npv = 0;
                for (let j = 0; j < cashFlows.length; j++) npv += cashFlows[j] / Math.pow(1 + guess, j);
                if (Math.abs(npv) < 0.1) break;
                guess += npv > 0 ? 0.01 : -0.01;
            }
            return guess * 100;
        };

        const irr = totalInvest > 0 ? calculateIRR(cashFlows) : 0;
        const payback = paybackY;

        return {
            totalInvestment: parseFloat(totalInvest.toFixed(3)),
            totalYearlySaving: parseFloat(totalYearlySaving.toFixed(3)),
            ownerBenefit: parseFloat(ownerBenefit.toFixed(3)),
            investorRevenue: parseFloat(investorRevenue.toFixed(3)),
            cchpGasCost: parseFloat(cchpGasCost.toFixed(2)),
            irr,
            paybackPeriod: parseFloat(payback.toFixed(3)),
            cashFlows
        };
    }, [hvacBuildings, mode, globalParams]);

    // Sync electricity price from priceConfig
    useEffect(() => {
        let newElectricityPrice = 0.85;

        if (priceConfig.mode === 'fixed') {
            newElectricityPrice = priceConfig.fixedPrice;
        } else if (priceConfig.mode === 'tou') {
            const totalDuration = priceConfig.touSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
            const weightedSum = priceConfig.touSegments.reduce((sum, seg) => sum + seg.price * (seg.end - seg.start), 0);
            newElectricityPrice = totalDuration > 0 ? weightedSum / totalDuration : 0.85;
        } else if (priceConfig.mode === 'spot') {
            const avgSpotPrice = priceConfig.spotPrices.reduce((sum, p) => sum + p, 0) / priceConfig.spotPrices.length;
            newElectricityPrice = avgSpotPrice || 0.85;
        }

        if (globalParams.electricityPrice !== newElectricityPrice) {
            setGlobalParams({ ...globalParams, electricityPrice: parseFloat(newElectricityPrice.toFixed(4)) });
        }
    }, [priceConfig.mode, priceConfig.fixedPrice, priceConfig.touSegments, priceConfig.spotPrices]);

    const chartData = useMemo(() => [
        { name: '1月', base: 45, retrofit: 35 }, { name: '2月', base: 40, retrofit: 30 },
        { name: '3月', base: 55, retrofit: 42 }, { name: '4月', base: 70, retrofit: 55 },
        { name: '5月', base: 90, retrofit: 65 }, { name: '6月', base: 120, retrofit: 85 },
        { name: '7月', base: 150, retrofit: 105 }, { name: '8月', base: 145, retrofit: 100 },
        { name: '9月', base: 110, retrofit: 80 }, { name: '10月', base: 80, retrofit: 60 },
        { name: '11月', base: 60, retrofit: 45 }, { name: '12月', base: 50, retrofit: 38 }
    ], []);

    // Update Context
    useEffect(() => {
        const newParams = { mode, globalParams, schedule, hvacBuildings };
        const currentStoredParams = JSON.stringify(currentModule.params);

        if (currentStoredParams !== JSON.stringify(newParams)) {
            updateModule('retrofit-hvac', {
                investment: financials.totalInvestment,
                yearlySaving: financials.investorRevenue,
                ownerBenefit: financials.ownerBenefit,
                kpiPrimary: { label: '年节电费用', value: `${financials.totalYearlySaving.toFixed(1)} 万元` },
                kpiSecondary: { label: '综合能效COP', value: `提升至 ${(hvacBuildings.reduce((sum, b) => sum + (b.active ? STRATEGIES[b.strategy as keyof typeof STRATEGIES].targetCOP : 0), 0) / hvacBuildings.filter(b => b.active).length || 0).toFixed(1)}` },
                strategy: mode === 'simple' ? '快速测算' : '精确估值',
                params: newParams
            });
        }
    }, [mode, globalParams, schedule, hvacBuildings, financials, updateModule, currentModule.params]);

    return {
        mode, setMode,
        globalParams, setGlobalParams,
        schedule, setSchedule,
        hvacBuildings, setHvacBuildings,
        isChartExpanded, setIsChartExpanded,
        isFinancialModalOpen, setIsFinancialModalOpen,
        financials,
        chartData,
        currentModule,
        toggleModule,
        saveProject
    };
}
