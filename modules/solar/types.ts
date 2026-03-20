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

// 组件品牌配置
export type SolarModuleBrand = 'longi' | 'tongwei' | 'generic';

export interface ModuleBrandConfig {
    id: SolarModuleBrand;
    name: string;
    degradationFirstYear: number; // 首年衰减率 (%)
    degradationLinear: number; // 次年开始衰减率 (%)
    description: string;
}

// 预定义的组件品牌配置
export const MODULE_BRANDS: Record<SolarModuleBrand, ModuleBrandConfig> = {
    longi: {
        id: 'longi',
        name: '隆基',
        degradationFirstYear: 1.0,
        degradationLinear: 0.035,
        description: '首年衰减 1%，次年开始 0.035%'
    },
    tongwei: {
        id: 'tongwei',
        name: '通威',
        degradationFirstYear: 1.0,
        degradationLinear: 0.04,
        description: '首年衰减 1%，次年开始 0.04%'
    },
    generic: {
        id: 'generic',
        name: '通用组件',
        degradationFirstYear: 2.0,
        degradationLinear: 0.55,
        description: '默认衰减率（首年 2%，次年开始 0.55%）'
    }
};

// 方案配置
export type CableType = 'copper' | 'aluminum';

export interface SolarSolution {
    id: string;
    name: string;
    description: string;
    connectionType: 'high' | 'low'; // 高压/低压接入
    brand: SolarModuleBrand; // 组件品牌
    cableType: CableType; // 线缆材质
    epcPrice: number; // 元/Wp
    voltageUpgradeCost?: number; // 升压设备成本（仅高压接入需要）
}

// 默认方案配置
export const DEFAULT_SOLUTIONS: SolarSolution[] = [
    {
        id: 'solution-1',
        name: '低压铝芯方案',
        description: '380V低压并网，使用铝芯电缆降低建造成本',
        connectionType: 'low',
        brand: 'tongwei',
        cableType: 'aluminum',
        epcPrice: 3.2
    },
    {
        id: 'solution-2',
        name: '低压铜芯方案',
        description: '380V低压并网，使用铜芯电缆，传输损耗更低',
        connectionType: 'low',
        brand: 'longi',
        cableType: 'copper',
        epcPrice: 3.5
    },
    {
        id: 'solution-3',
        name: '高压并网方案',
        description: '10kV高压并网，适合大容量项目，含升压设备投资',
        connectionType: 'high',
        brand: 'generic',
        cableType: 'aluminum',
        epcPrice: 3.4,
        voltageUpgradeCost: 15 // 升压设备成本（万元）
    }
];

export const DEFAULT_BRAND: SolarModuleBrand = 'generic';

export interface SolarParamsState {
    mode: 'simple' | 'advanced';
    simpleParams: SolarSimpleParams;
    advParams: SolarAdvParams;
    solutions?: SolarSolution[];
    selectedSolutionId?: string | null;
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
        taxRate: 0, // 默认 0% (新能源享三免三减半）
        emcOwnerShareRate: 10,   // 业主获 10% 自用电费
        emcDiscountPrice: 0.65,  // 投资方售电 0.65 元/度
        roofRent: 5              // 屋顶租金 5 元/㎡/年
    },
    solutions: DEFAULT_SOLUTIONS,
    selectedSolutionId: DEFAULT_SOLUTIONS[0].id
};

export interface BuildingData {
    id: number;
    name: string;
    area: number;
    active: boolean;
    manualCapacity: number;
    transformerId: number;
}
