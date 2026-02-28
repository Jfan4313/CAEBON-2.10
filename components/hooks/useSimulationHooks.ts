import { useMemo } from 'react';

// 电价数据类型
export interface PriceData {
    hour: number;
    price: number;
}

// 仿真结果类型
export interface SimulationResult {
    data: {
        hour: number;
        hourLabel: string;
        price: number;
        baseLoad: number;
        aiLoad: number;
        costBase: number;
        costAi: number;
        flowState: string;
        aiAction: string;
    }[];
    dailyCostBase: number;
    dailyCostAi: number;
    annualBillBase: number;
    annualBillAi: number;
    annualSaving: number;
    netBenefit: number;
    roi: number;
    payback: number;
    cashFlows: { year: number; flow: number; cumulative: number }[];
    sectorImpacts: { name: string; base: number; ai: number; increase: string }[];
}

// 动态仿真结果类型
export interface DynamicSimulationResult {
    states: {
        hour: number;
        period: string;
        price: number;
        gridState: string;
        battery: string;
        load: number;
        gridPower: number;
        pvPower: number;
        batteryPower: number;
    }[];
    metrics: {
        totalCost: string;
        totalRevenue: string;
        roi: string;
        peakSavingRate: string;
        batteryArbitrage: string;
    };
}

// 金融参数类型
export interface FinancialParams {
    investment: number;
    opex: number;
    analysisPeriod: number;
}

/**
 * 24小时仿真数据 Hook
 * 从 RetrofitAI.tsx 的 simulation useMemo 提取
 */
export const useSimulationData = (
    useSpotPrice: boolean,
    importedPriceData: PriceData[],
    financialParams: FinancialParams
): SimulationResult => {
    const { investment, opex, analysisPeriod } = financialParams;

    return useMemo(() => {
        const data = [];
        let totalCostBase = 0;
        let totalCostAi = 0;
        let totalLoadBase = 0;
        let totalLoadAi = 0;

        for (let i = 0; i < 24; i++) {
            // 1. Price Curve Generator
            let price = 0;
            if (useSpotPrice && importedPriceData.length > 0) {
                // Use imported price data
                const importedData = importedPriceData.find(d => d.hour === i);
                price = importedData ? importedData.price : 0.35; // Fallback to TOU price
            } else if (useSpotPrice) {
                // Volatile Spot Price Simulation (fallback)
                price = 0.4 + Math.random() * 0.4 + (i > 16 && i < 20 ? 0.8 : 0) - (i > 2 && i < 6 ? 0.2 : 0);
            } else {
                // Standard TOU
                if (i < 8) price = 0.35;
                else if ((i >= 8 && i < 11) || (i >= 17 && i < 22)) price = 1.1;
                else if (i >= 11 && i < 13) price = 0.7;
                else if (i >= 13 && i < 15) price = 1.1; // Peak
                else price = 0.7;
            }
            price = Math.max(0.2, parseFloat(price.toFixed(2)));

            // 2. Load Simulation
            // Baseline: Commercial building curve
            let baseLoad = 200 + Math.sin((i - 8) / 16 * Math.PI) * 300;
            if (baseLoad < 100) baseLoad = 100;
            if (i > 22 || i < 6) baseLoad *= 0.6; // Night drop

            // AI Load: Price sensitive shifting based on aggressiveness (fixed at 50% for now)
            const aiAggressiveness = 50;
            const avgPrice = useSpotPrice ? 0.6 : 0.7;
            const priceFactor = price / avgPrice;
            const sensitivity = 0.1 + (aiAggressiveness / 100) * 0.4; // 0.1 to 0.5 impact factor

            let aiLoad = baseLoad;

            if (priceFactor > 1.2) {
                aiLoad = baseLoad * (1 - sensitivity); // Shed/Shift
            } else if (priceFactor < 0.8) {
                aiLoad = baseLoad * (1 + sensitivity * 0.8); // Absorb/Charge (slightly less efficient to absorb)
            } else {
                aiLoad = baseLoad * (1 - (aiAggressiveness / 100) * 0.05); // General efficiency gain 0-5%
            }

            // Costs
            const costBase = baseLoad * price;
            const costAi = aiLoad * price;

            totalCostBase += costBase;
            totalCostAi += costAi;
            totalLoadBase += baseLoad;
            totalLoadAi += aiLoad;

            // Determine Energy Flow States for Visualization
            let flowState = 'idle';
            let aiAction = '监控中';
            if (priceFactor > 1.3) { flowState = 'discharge'; aiAction = '强力削峰'; }
            else if (priceFactor < 0.7) { flowState = 'charge'; aiAction = '低价蓄能'; }
            else if (priceFactor > 1.0) { flowState = 'optimize'; aiAction = '柔性调节'; }

            data.push({
                hour: i,
                hourLabel: `${i}:00`,
                price,
                baseLoad: Math.round(baseLoad),
                aiLoad: Math.round(aiLoad),
                costBase,
                costAi,
                flowState,
                aiAction
            });
        }

        // Annual Projections (300 effective days)
        const annualBillBase = (totalCostBase * 300) / 10000; // 万元
        const annualBillAi = (totalCostAi * 300) / 10000;
        const annualSaving = annualBillBase - annualBillAi;
        const netBenefit = annualSaving - opex;

        const roi = investment > 0 ? (netBenefit / investment) * 100 : 0;
        const payback = netBenefit > 0 ? investment / netBenefit : 0;

        // Long term Cash Flow
        const cashFlows = [];
        let cumulative = -investment;
        for (let year = 0; year <= analysisPeriod; year++) {
            if (year === 0) {
                cashFlows.push({ year, flow: -investment, cumulative });
            } else {
                cumulative += netBenefit;
                cashFlows.push({ year, flow: netBenefit, cumulative });
            }
        }

        // Breakdown Analysis (Mock Calculation of AI contribution)
        const sectorImpacts = [
            { name: '储能套利', base: annualSaving * 0.2, ai: annualSaving * 0.45, increase: '+125%' }, // AI dramatically improves arbitrage
            { name: '暖通优化', base: annualSaving * 0.3, ai: annualSaving * 0.40, increase: '+33%' },
            { name: '照明控制', base: annualSaving * 0.1, ai: annualSaving * 0.12, increase: '+20%' },
            { name: '需量管理', base: 0, ai: annualSaving * 0.15, increase: '新增' }, // Pure AI benefit
        ];

        return {
            data,
            dailyCostBase: totalCostBase,
            dailyCostAi: totalCostAi,
            annualBillBase,
            annualBillAi,
            annualSaving,
            netBenefit,
            roi,
            payback,
            cashFlows,
            sectorImpacts
        };
    }, [useSpotPrice, importedPriceData, investment, opex, analysisPeriod]);
};

/**
 * 动态分析仿真数据 Hook
 * 从 RetrofitAI.tsx 的 dynamicSimulation useMemo 提取
 */
export const useDynamicSimulation = (
    selectedScenario: string,
    dynamicAiEnabled: boolean,
    dynamicAiAggressiveness: number
): DynamicSimulationResult => {
    return useMemo(() => {
        const states = [];
        const basePrice = 0.8;
        const pvCapacity = 450; // kW
        const storageCapacity = 2000; // kWh
        const batteryPower = 500; // kW
        const efficiency = 0.9;

        // Get price modifier based on scenario and AI level
        const getPriceModifier = (hour: number, scenario: string, aiLevel: number) => {
            let modifier = 1.0;

            if (scenario === 'extreme-price') {
                const isPeak = hour >= 17 && hour <= 21;
                if (isPeak) modifier = 0.2; // 削峰70%
                if (aiLevel > 70) modifier *= 0.8; // AI进一步削减
            } else if (scenario === 'peak-shaving') {
                const isPeak = hour >= 17 && hour <= 21;
                if (isPeak && aiLevel > 60) modifier = 0.5; // 削峰50%
                else if (aiLevel > 70) modifier *= 0.9; // AI更积极削峰
            }

            return Math.round(modifier * 100) / 100;
        };

        for (let i = 0; i < 24; i++) {
            const priceModifier = getPriceModifier(i, selectedScenario, dynamicAiEnabled ? dynamicAiAggressiveness : 50);
            const hourPrice = basePrice * priceModifier;

            // Generate system state
            let gridPower = 500;
            let pvPower = 0;
            let load = 100;
            let batteryState: 'idle' | 'discharging' | 'charging' = 'idle';

            // PV generation based on hour
            let sunHours = 0;
            if (i >= 8 && i <= 15) sunHours = 4;
            else if (i >= 16 && i <= 18) sunHours = 2;
            else if (i >= 19 || i <= 6) sunHours = 0;
            else sunHours = 1;

            const pvGen = pvCapacity * sunHours / 1000; // kW
            pvPower = pvGen > 0 ? pvGen : 0;

            // Storage charge/discharge decision
            if (i >= 8 && i <= 16) {
                batteryState = dynamicAiEnabled || selectedScenario === 'price-arbitrage' ? 'charging' : 'idle';
            } else if (i >= 18 && i <= 22) {
                if (selectedScenario === 'price-arbitrage' || dynamicAiEnabled) {
                    batteryState = 'discharging';
                }
            }

            // Load calculation
            const baseLoad = 100;
            if (batteryState === 'charging') {
                load = baseLoad + batteryPower * efficiency;
            } else if (batteryState === 'discharging') {
                load = baseLoad - batteryPower * efficiency;
                if (load < 50) load = 50; // Minimum load
            } else {
                load = baseLoad;
            }

            // Grid state
            let gridState: 'idle' | 'pv-charging' | 'discharging' | 'charging' = 'idle';
            if (pvPower > 0 && pvPower >= load) {
                gridState = 'pv-charging';
            } else if (batteryState === 'discharging') {
                gridState = 'discharging';
            } else if (batteryState === 'charging') {
                gridState = 'charging';
            }

            gridPower = load - (pvPower || 0);
            if (gridPower < 0) gridPower = 0;

            states.push({
                hour: i,
                period: i >= 6 && i < 12 ? 'morning' : i >= 12 && i < 18 ? 'afternoon' : i >= 18 && i < 22 ? 'evening' : 'night',
                price: hourPrice,
                gridState,
                battery: batteryState,
                load,
                gridPower,
                pvPower,
                batteryPower: batteryState === 'charging' || batteryState === 'discharging' ? batteryPower : 0
            });
        }

        // Calculate metrics
        let totalCost = 0;
        let totalRevenue = 0;
        let peakShaving = 0;
        let batteryArbitrage = 0;

        states.forEach(state => {
            const hourCost = state.price * state.load / 1000;
            totalCost += hourCost;

            // PV self-use revenue
            if (state.pvPower > 0) {
                const selfUseRevenue = Math.min(state.pvPower, state.load) * (state.price * 1.2);
                const pvRevenue = (state.price * 0.4) * Math.max(0, state.pvPower - state.load);
                totalRevenue += selfUseRevenue + pvRevenue;
            }

            // Storage arbitrage revenue
            if (state.battery === 'discharging') {
                const chargeCost = 0.52 * state.batteryPower * 0.9; // Valley price charging
                const dischargeRevenue = 1.62 * state.batteryPower * 0.9; // Peak price discharging
                batteryArbitrage = dischargeRevenue - chargeCost;
                totalRevenue += batteryArbitrage;
            }

            // Peak shaving savings
            if (state.gridState === 'pv-charging') {
                peakShaving += (state.price - 0.8) * state.pvPower;
            }
        });

        const roi = totalCost > 0 ? ((totalRevenue / 10 - totalCost) / totalCost * 100) : 0;
        const peakSavingRate = totalCost > 0 ? (peakShaving / totalCost * 100) : 0;

        return {
            states,
            metrics: {
                totalCost: totalCost.toFixed(2),
                totalRevenue: totalRevenue.toFixed(2),
                roi: roi.toFixed(1),
                peakSavingRate: peakSavingRate.toFixed(1),
                batteryArbitrage: batteryArbitrage.toFixed(2),
            }
        };
    }, [selectedScenario, dynamicAiEnabled, dynamicAiAggressiveness]);
};
