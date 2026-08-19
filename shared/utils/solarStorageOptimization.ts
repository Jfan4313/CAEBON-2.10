import { getProjectLoadProfile } from './projectLoadProfiles';
import { buildLocationSolarProfile, type SolarProfileLocation } from './solarGenerationProfile';

export interface SolarStorageOptimizationInput {
    annualLoadKwh: number;
    projectType?: string;
    maxPvCapacityKw: number;
    dailySunHours: number;
    performanceRatio: number;
    location?: SolarProfileLocation;
    hourlyPrices: number[];
    pvUnitCostYuanPerWp: number;
    storageUnitCostYuanPerKwh: number;
    storageDod: number;
    storageRte: number;
    pvOmYuanPerWYear: number;
    storageOmRatePercent: number;
    discountRatePercent: number;
    horizonYears: number;
    generationDays?: number;
    storageOperatingDays?: number;
}

export interface SolarStorageOptimizationResult {
    pvCapacityKw: number;
    storagePowerKw: number;
    storageCapacityKwh: number;
    investmentWan: number;
    firstYearNetBenefitWan: number;
    staticPaybackYears: number;
    npvWan: number;
    annualPvGenerationKwh: number;
    annualDirectUseKwh: number;
    annualStorageDischargeKwh: number;
    annualCurtailedKwh: number;
    pvSelfConsumptionRate: number;
    storageRecommended: boolean;
    decision: 'invest' | 'solar_only' | 'defer';
    reason: string;
}

interface EvaluatedCombination extends SolarStorageOptimizationResult {
    score: number;
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const roundToStep = (value: number, step: number) => Math.round(value / step) * step;

const buildCandidates = (maximum: number, step: number): number[] => {
    const values = [0];
    for (let value = step; value < maximum; value += step) values.push(value);
    if (maximum > 0) values.push(maximum);
    return [...new Set(values.map(value => Number(value.toFixed(3))))];
};

const buildStorageCandidates = (maximum: number, step: number): number[] => {
    const roundedMaximum = Math.floor(Math.max(0, maximum) / step) * step;
    return Array.from(
        { length: Math.floor(roundedMaximum / step) + 1 },
        (_, index) => Number((index * step).toFixed(3)),
    );
};

const simulateTypicalDay = (
    load: number[],
    pv: number[],
    prices: number[],
    storageCapacityKwh: number,
    storageDod: number,
    storageRte: number,
) => {
    const usableCapacity = storageCapacityKwh * storageDod;
    const powerKw = storageCapacityKwh > 0 ? Math.max(1, storageCapacityKwh / 2) : 0;
    const chargeEfficiency = Math.sqrt(storageRte);
    const dischargeEfficiency = Math.sqrt(storageRte);
    let storedEnergy = 0;
    let secondDayDirectValue = 0;
    let secondDayDirectKwh = 0;
    let secondDayStorageValue = 0;
    let secondDayDischargeKwh = 0;
    let secondDayCurtailedKwh = 0;

    for (let absoluteHour = 0; absoluteHour < 48; absoluteHour += 1) {
        const hour = absoluteHour % 24;
        const directUse = Math.min(load[hour], pv[hour]);
        let surplus = Math.max(0, pv[hour] - load[hour]);
        let deficit = Math.max(0, load[hour] - pv[hour]);
        const chargeInput = usableCapacity > 0
            ? Math.min(powerKw, surplus, Math.max(0, usableCapacity - storedEnergy) / chargeEfficiency)
            : 0;
        storedEnergy += chargeInput * chargeEfficiency;
        surplus -= chargeInput;
        const dischargeOutput = usableCapacity > 0
            ? Math.min(powerKw, deficit, storedEnergy * dischargeEfficiency)
            : 0;
        storedEnergy -= dischargeOutput / dischargeEfficiency;
        deficit -= dischargeOutput;

        if (absoluteHour >= 24) {
            secondDayDirectKwh += directUse;
            secondDayDirectValue += directUse * prices[hour];
            secondDayDischargeKwh += dischargeOutput;
            secondDayStorageValue += dischargeOutput * prices[hour];
            secondDayCurtailedKwh += surplus;
        }
    }

    return {
        directKwh: secondDayDirectKwh,
        directValue: secondDayDirectValue,
        dischargeKwh: secondDayDischargeKwh,
        storageValue: secondDayStorageValue,
        curtailedKwh: secondDayCurtailedKwh,
        powerKw,
    };
};

export const optimizeSolarStorageCapacity = (
    input: SolarStorageOptimizationInput,
): SolarStorageOptimizationResult => {
    const annualLoadKwh = Math.max(0, input.annualLoadKwh);
    const maxPvCapacityKw = Math.max(0, input.maxPvCapacityKw);
    if (annualLoadKwh <= 0 || maxPvCapacityKw <= 0) {
        return {
            pvCapacityKw: 0,
            storagePowerKw: 0,
            storageCapacityKwh: 0,
            investmentWan: 0,
            firstYearNetBenefitWan: 0,
            staticPaybackYears: 0,
            npvWan: 0,
            annualPvGenerationKwh: 0,
            annualDirectUseKwh: 0,
            annualStorageDischargeKwh: 0,
            annualCurtailedKwh: 0,
            pvSelfConsumptionRate: 0,
            storageRecommended: false,
            decision: 'defer',
            reason: '缺少有效负荷或可建设光伏容量，暂不形成投资建议。',
        };
    }

    const generationDays = Math.max(1, input.generationDays || 365);
    const storageOperatingDays = Math.max(1, input.storageOperatingDays || 330);
    const loadProfile = getProjectLoadProfile(input.projectType);
    const dailyLoadKwh = annualLoadKwh / 365;
    const loadFactor = dailyLoadKwh / Math.max(0.0001, sum(loadProfile));
    const load = loadProfile.map(value => value * loadFactor);
    const solarProfile = buildLocationSolarProfile(input.location);
    const perKwDailyPvKwh = Math.max(0, input.dailySunHours) * Math.max(0, input.performanceRatio);
    const solarFactorPerKw = perKwDailyPvKwh / Math.max(0.0001, sum(solarProfile));
    const pvPerKw = solarProfile.map(value => value * solarFactorPerKw);
    const prices = Array.from({ length: 24 }, (_, hour) => Math.max(0, Number(input.hourlyPrices[hour] || 0)));
    const dod = clamp(input.storageDod, 0.1, 1);
    const rte = clamp(input.storageRte, 0.1, 1);
    const discountRate = Math.max(0, input.discountRatePercent) / 100;
    const horizonYears = Math.max(1, Math.round(input.horizonYears));

    const pvStep = maxPvCapacityKw <= 30 ? 1 : maxPvCapacityKw <= 200 ? 5 : 20;
    const storageStep = dailyLoadKwh <= 100 ? 5 : dailyLoadKwh <= 1000 ? 10 : 50;
    const pvCandidates = buildCandidates(maxPvCapacityKw, pvStep);
    let best: EvaluatedCombination | null = null;

    pvCandidates.forEach(pvCapacityKw => {
        if (pvCapacityKw <= 0) return;
        const pv = pvPerKw.map(value => value * pvCapacityKw);
        const rawDailySurplusKwh = sum(pv.map((value, hour) => Math.max(0, value - load[hour])));
        const maximumUsefulStorageKwh = rawDailySurplusKwh > 0
            ? Math.min(rawDailySurplusKwh * Math.sqrt(rte) / dod, dailyLoadKwh / dod)
            : 0;
        const storageCandidates = buildStorageCandidates(maximumUsefulStorageKwh, storageStep);

        storageCandidates.forEach(storageCapacityKwh => {
            const simulated = simulateTypicalDay(load, pv, prices, storageCapacityKwh, dod, rte);
            const annualDirectUseKwh = simulated.directKwh * generationDays;
            const annualStorageDischargeKwh = simulated.dischargeKwh * storageOperatingDays;
            const annualPvGenerationKwh = sum(pv) * generationDays;
            const annualCurtailedKwh = simulated.curtailedKwh * generationDays;
            const grossAnnualValueWan = (
                simulated.directValue * generationDays
                + simulated.storageValue * storageOperatingDays
            ) / 10000;
            const pvInvestmentWan = pvCapacityKw * Math.max(0, input.pvUnitCostYuanPerWp) / 10;
            const storageInvestmentWan = storageCapacityKwh * Math.max(0, input.storageUnitCostYuanPerKwh) / 10000;
            const investmentWan = pvInvestmentWan + storageInvestmentWan;
            const annualOpexWan = (
                pvCapacityKw * Math.max(0, input.pvOmYuanPerWYear) / 10
                + storageInvestmentWan * Math.max(0, input.storageOmRatePercent) / 100
            );
            const firstYearNetBenefitWan = Math.max(0, grossAnnualValueWan - annualOpexWan);
            let npvWan = -investmentWan;
            for (let year = 1; year <= horizonYears; year += 1) {
                const pvDegradation = Math.pow(0.996, year - 1);
                const storageDegradation = Math.pow(0.985, year - 1);
                const yearBenefit = (
                    simulated.directValue * generationDays * pvDegradation
                    + simulated.storageValue * storageOperatingDays * storageDegradation
                ) / 10000 - annualOpexWan;
                npvWan += yearBenefit / Math.pow(1 + discountRate, year);
            }
            const staticPaybackYears = firstYearNetBenefitWan > 0
                ? investmentWan / firstYearNetBenefitWan
                : Number.POSITIVE_INFINITY;
            const selfConsumptionRate = annualPvGenerationKwh > 0
                ? (annualDirectUseKwh + annualStorageDischargeKwh / rte) / annualPvGenerationKwh * 100
                : 0;

            // NPV is the primary investment objective. For near-equal NPV, prefer the
            // smaller investment to avoid recommending capacity with weak marginal value.
            const score = npvWan - investmentWan * 0.002;
            const candidate: EvaluatedCombination = {
                pvCapacityKw,
                storagePowerKw: storageCapacityKwh > 0
                    ? Math.max(storageStep <= 2.5 ? 1 : 5, roundToStep(simulated.powerKw, storageStep <= 2.5 ? 1 : 5))
                    : 0,
                storageCapacityKwh: Number(storageCapacityKwh.toFixed(1)),
                investmentWan,
                firstYearNetBenefitWan,
                staticPaybackYears,
                npvWan,
                annualPvGenerationKwh,
                annualDirectUseKwh,
                annualStorageDischargeKwh,
                annualCurtailedKwh,
                pvSelfConsumptionRate: clamp(selfConsumptionRate, 0, 100),
                storageRecommended: storageCapacityKwh > 0,
                decision: storageCapacityKwh > 0 ? 'invest' : 'solar_only',
                reason: '',
                score,
            };
            if (!best || candidate.score > best.score) best = candidate;
        });
    });

    if (!best || best.npvWan <= 0) {
        return {
            pvCapacityKw: 0,
            storagePowerKw: 0,
            storageCapacityKwh: 0,
            investmentWan: 0,
            firstYearNetBenefitWan: 0,
            staticPaybackYears: 0,
            npvWan: best?.npvWan || 0,
            annualPvGenerationKwh: 0,
            annualDirectUseKwh: 0,
            annualStorageDischargeKwh: 0,
            annualCurtailedKwh: 0,
            pvSelfConsumptionRate: 0,
            storageRecommended: false,
            decision: 'defer',
            reason: `按${horizonYears}年周期和${input.discountRatePercent.toFixed(1)}%折现率测算，光储组合净现值不为正，建议暂缓投资。`,
        };
    }

    const result = best as EvaluatedCombination;
    return {
        ...result,
        reason: result.storageRecommended
            ? `该组合在${horizonYears}年周期内净现值最高，储能仅配置到边际收益仍为正的容量。`
            : `该组合在${horizonYears}年周期内净现值最高；储能边际收益不足，建议先建设光伏并预留储能接口。`,
    };
};
