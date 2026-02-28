export type InvestmentMode = 'epc' | 'emc';

/** EMC 细分结算模式：收益分成 vs 折扣电价（二选一） */
export type EmcSubMode = 'sharing' | 'discount';

export interface SolarSimpleParams {
    connectionPoint: number;
    area: number;
    capacity: number;
    epcPrice: number;
    investmentMode: InvestmentMode;
    emcSubMode: EmcSubMode; // 仅当 investmentMode === 'emc' 时生效
}

export interface SolarAdvParams {
    electricityPrice: number;
    dailySunHours: number;
    prValue: number;
    azimuthEfficiency: number;
    generationDays: number;
    degradationFirstYear: number;
    degradationLinear: number;
    feedInTariff: number;
    omCost: number;
    insuranceRate: number;
    taxRate: number;

    // ===== EMC 专项参数 =====
    // 【收益分成模式】业主获得总自用电费收益的百分比, 投资方获得 (100 - 此值)%
    emcOwnerShareRate: number;
    // 【折扣电价模式】投资方向业主售电的价格 (元/kWh), 需低于市电价格
    emcDiscountPrice: number;
    // 【通用】业主向投资方收取的屋顶使用费 (元/㎡/年)
    roofRent: number;
}

export interface SolarParamsState {
    mode: 'simple' | 'advanced';
    simpleParams: SolarSimpleParams;
    advParams: SolarAdvParams;
}

export const DEFAULTS: SolarParamsState = {
    mode: 'simple',
    simpleParams: {
        connectionPoint: 0,
        area: 5000,
        capacity: 400,
        epcPrice: 3.5,
        investmentMode: 'epc',
        emcSubMode: 'sharing'
    },
    advParams: {
        electricityPrice: 0.85,
        dailySunHours: 3.8,
        prValue: 82,
        azimuthEfficiency: 98,
        generationDays: 330,
        degradationFirstYear: 2.0,
        degradationLinear: 0.55,
        feedInTariff: 0.35,
        omCost: 0.05,
        insuranceRate: 0.2,
        taxRate: 0, // 默认 0% (新能源享三免三减半)
        emcOwnerShareRate: 10,   // 业主获 10% 自用电费
        emcDiscountPrice: 0.65,  // 投资方售电 0.65 元/度
        roofRent: 5              // 屋顶租金 5 元/㎡/年
    }
};

export interface BuildingData {
    id: number;
    name: string;
    area: number;
    active: boolean;
    manualCapacity: number;
    transformerId: number;
}
