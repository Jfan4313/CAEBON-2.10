export interface StorageRecommendationInput {
    surplusCurveKw: number[];
    deficitCurveKw: number[];
    dod: number;
    rte: number;
    currentPowerKw: number;
    currentCapacityKwh: number;
    cycleMode: '1c1d' | '2c2d';
}

export interface StorageRecommendation {
    power: number;
    capacity: number;
    dailySurplusKwh: number;
    usableShiftKwh: number;
    deliverableEnergyKwh: number;
    currentCaptureRate: number;
    requestedCycles: 1 | 2;
    effectiveCycles: number;
    cycleModeReason: string;
    available: boolean;
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const roundUp = (value: number, step: number) => Math.ceil(Math.max(0, value) / step) * step;

/**
 * Finds the smallest charge power that can absorb the target input energy
 * across the actual hourly surplus window.
 */
const findRequiredChargePower = (surplusCurveKw: number[], targetInputKwh: number): number => {
    const maxSurplusKw = Math.max(0, ...surplusCurveKw);
    if (maxSurplusKw <= 0 || targetInputKwh <= 0) return 0;

    let low = 0;
    let high = maxSurplusKw;
    for (let index = 0; index < 40; index += 1) {
        const middle = (low + high) / 2;
        const captured = sum(surplusCurveKw.map(value => Math.min(Math.max(0, value), middle)));
        if (captured >= targetInputKwh) high = middle;
        else low = middle;
    }
    return high;
};

interface ChargeOpportunity {
    surplusCurveKw: number[];
    usableInputKwh: number;
}

const buildChargeOpportunities = (
    surplusCurveKw: number[],
    deficitCurveKw: number[],
    rte: number,
): ChargeOpportunity[] => {
    const windows: Array<{ start: number; end: number }> = [];
    let start = -1;

    surplusCurveKw.forEach((value, index) => {
        if (value > 0.01 && start < 0) start = index;
        const closesWindow = start >= 0 && (value <= 0.01 || index === surplusCurveKw.length - 1);
        if (closesWindow) {
            windows.push({ start, end: value > 0.01 ? index : index - 1 });
            start = -1;
        }
    });

    return windows.map((window, windowIndex) => {
        const windowCurve = surplusCurveKw.map((value, index) => (
            index >= window.start && index <= window.end ? Math.max(0, value) : 0
        ));
        const nextWindow = windows[(windowIndex + 1) % windows.length];
        let followingDeficitKwh = 0;
        let index = (window.end + 1) % deficitCurveKw.length;
        while (index !== nextWindow.start) {
            followingDeficitKwh += Math.max(0, deficitCurveKw[index] || 0);
            index = (index + 1) % deficitCurveKw.length;
        }
        const windowSurplusKwh = sum(windowCurve);
        return {
            surplusCurveKw: windowCurve,
            usableInputKwh: Math.min(windowSurplusKwh, followingDeficitKwh / rte),
        };
    }).filter(opportunity => opportunity.usableInputKwh > 0.01);
};

export const calculateStorageRecommendation = ({
    surplusCurveKw,
    deficitCurveKw,
    dod,
    rte,
    currentPowerKw,
    currentCapacityKwh,
    cycleMode,
}: StorageRecommendationInput): StorageRecommendation => {
    const safeDod = Math.max(0.1, Math.min(1, dod));
    const safeRte = Math.max(0.1, Math.min(1, rte));
    const chargeEfficiency = Math.sqrt(safeRte);
    const dailySurplusKwh = sum(surplusCurveKw.map(value => Math.max(0, value)));
    const dailyDeficitKwh = sum(deficitCurveKw.map(value => Math.max(0, value)));
    const requestedCycles = cycleMode === '2c2d' ? 2 : 1;

    if (dailySurplusKwh <= 0.01 || dailyDeficitKwh <= 0.01) {
        return {
            power: 0,
            capacity: 0,
            dailySurplusKwh,
            usableShiftKwh: 0,
            deliverableEnergyKwh: 0,
            currentCaptureRate: 0,
            requestedCycles,
            effectiveCycles: 0,
            cycleModeReason: '当前曲线没有同时形成可充电余电与可替代负荷。',
            available: false,
        };
    }

    const allOpportunities = buildChargeOpportunities(surplusCurveKw, deficitCurveKw, safeRte);
    const selectedOpportunities = requestedCycles === 2 && allOpportunities.length >= 2
        ? [...allOpportunities]
            .sort((left, right) => right.usableInputKwh - left.usableInputKwh)
            .slice(0, 2)
        : [{
            surplusCurveKw,
            usableInputKwh: Math.min(dailySurplusKwh, dailyDeficitKwh / safeRte),
        }];
    const effectiveCycles = selectedOpportunities.length;
    const usableShiftKwh = sum(selectedOpportunities.map(opportunity => opportunity.usableInputKwh));
    const deliverableEnergyKwh = usableShiftKwh * safeRte;
    const largestCycleInputKwh = Math.max(0, ...selectedOpportunities.map(opportunity => opportunity.usableInputKwh));
    const nominalCapacityKwh = largestCycleInputKwh * chargeEfficiency / safeDod;
    const requiredPowerKw = Math.max(0, ...selectedOpportunities.map(opportunity => (
        findRequiredChargePower(opportunity.surplusCurveKw, opportunity.usableInputKwh)
    )));

    // Small household systems need finer steps; larger C&I systems retain 10-unit steps.
    const powerStep = requiredPowerKw <= 50 ? 5 : 10;
    const capacityStep = nominalCapacityKwh <= 100 ? 5 : 10;
    const power = roundUp(requiredPowerKw, powerStep);
    const capacity = roundUp(nominalCapacityKwh, capacityStep);

    const capacityLimitedInputKwh = Math.max(0, currentCapacityKwh) * safeDod / chargeEfficiency;
    const currentUsableInputKwh = sum(selectedOpportunities.map(opportunity => {
        const powerLimitedInputKwh = sum(opportunity.surplusCurveKw.map(value => (
            Math.min(Math.max(0, value), Math.max(0, currentPowerKw))
        )));
        return Math.min(opportunity.usableInputKwh, powerLimitedInputKwh, capacityLimitedInputKwh);
    }));
    const currentCaptureRate = usableShiftKwh > 0
        ? Math.min(100, currentUsableInputKwh / usableShiftKwh * 100)
        : 0;
    const cycleModeReason = requestedCycles === 2 && effectiveCycles < 2
        ? '余电曲线只有一个有效充电窗口，已自动按一充一放配置，避免容量虚降。'
        : requestedCycles === 2
            ? '存在两个独立充电窗口，容量按较大单次循环电量配置。'
            : '容量按每日一次完整充放电所需电量配置。';

    return {
        power,
        capacity,
        dailySurplusKwh,
        usableShiftKwh,
        deliverableEnergyKwh,
        currentCaptureRate,
        requestedCycles,
        effectiveCycles,
        cycleModeReason,
        available: power > 0 && capacity > 0,
    };
};
