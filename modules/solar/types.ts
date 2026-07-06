export type InvestmentMode = 'epc' | 'emc';

/** EMC 细分结算模式。southern_average 仅保留用于兼容旧方案，界面不再作为结算方式展示。 */
export type EmcSubMode = 'sharing' | 'discount' | 'fixed' | 'southern_average';
export type SolarConnectionType = 'high' | 'low';

export interface SolarSimpleParams {
    connectionPoint: number;
    area: number;
    capacity: number;
    epcPrice: number; // 建造成本单价（元/Wp），EPC/EMC 投资模型共用
    connectionType: SolarConnectionType;
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
    revenueVatRate: number;
    costVatRate: number;
    constructionVatRate: number;
    vatSurchargeRate: number;
    vatOffsetElectricityPrice: number;
    taxRate: number;

    // ===== EMC 专项参数 =====
    // 【收益分成模式】业主获得总自用电费收益的百分比, 投资方获得 (100 - 此值)%
    emcOwnerShareRate: number;
    // 【折扣电价模式】投资方向业主售电的价格 (元/kWh), 需低于市电价格
    emcDiscountPrice: number;
    // 【固定电价模式】投资方向业主售电的固定价格 (元/kWh)
    emcFixedPrice: number;
    // 【业主对标电价】南网均价/尖峰评估电价等参照值，仅用于计算业主每度省多少钱
    emcSouthernAveragePrice: number;
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
        degradationLinear: 0.35,
        description: '首年衰减 1%，次年开始 0.35%'
    },
    tongwei: {
        id: 'tongwei',
        name: '通威',
        degradationFirstYear: 1.0,
        degradationLinear: 0.4,
        description: '首年衰减 1%，次年开始 0.4%'
    },
    generic: {
        id: 'generic',
        name: '通用组件',
        degradationFirstYear: 1.0,
        degradationLinear: 0.4,
        description: 'EPC测算表口径（首年 1%，次年开始 0.4%）'
    }
};

// 方案配置
export type CableType = 'copper' | 'aluminum';

export interface SolarSolution {
    id: string;
    name: string;
    description: string;
    capacity?: number; // 本方案铺设容量（kWp）。未填写时跟随楼栋容量汇总
    connectionType: SolarConnectionType; // 高压/低压接入
    brand: SolarModuleBrand; // 组件品牌
    cableType: CableType; // 线缆材质
    epcPrice: number; // 建造成本单价（元/Wp），EPC/EMC 投资模型共用
    investmentMode: InvestmentMode; // 该方案独立合作方式
    emcSubMode?: EmcSubMode;
    emcOwnerShareRate?: number;
    emcDiscountPrice?: number;
    emcFixedPrice?: number;
    emcSouthernAveragePrice?: number;
    roofRent?: number;
    voltageUpgradeCost?: number; // 升压设备成本（仅高压接入需要）
    layoutImage?: string; // 铺设图 (Base64 数据URL)
    useSameLayout?: boolean; // 是否使用与第一个方案相同的铺设图（仅用于非第一个方案）
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
        epcPrice: 2.0,
        investmentMode: 'epc'
    },
    {
        id: 'solution-2',
        name: '低压铜芯方案',
        description: '380V低压并网，使用铜芯电缆，传输损耗更低',
        connectionType: 'low',
        brand: 'longi',
        cableType: 'copper',
        epcPrice: 2.0,
        investmentMode: 'epc'
    },
    {
        id: 'solution-3',
        name: '高压并网方案',
        description: '10kV高压并网，适合大容量项目，含升压设备投资',
        connectionType: 'high',
        brand: 'generic',
        cableType: 'aluminum',
        epcPrice: 2.0,
        investmentMode: 'epc',
        voltageUpgradeCost: 15 // 升压设备成本（万元）
    }
];

export const DEFAULT_BRAND: SolarModuleBrand = 'generic';

export interface SolarParamsState {
    mode: 'simple' | 'advanced';
    selfUseMode?: 'auto' | 'manual';
    simpleParams: SolarSimpleParams;
    advParams: SolarAdvParams;
    buildings?: BuildingData[];
    solutions?: SolarSolution[];
    selectedSolutionId?: string | null;
    showConsumptionRateAnalysis?: boolean;
    consumptionRateScenarios?: number[];
    effectiveSelfConsumptionRate?: number;
}

export const DEFAULTS: SolarParamsState = {
    mode: 'simple',
    selfUseMode: 'manual',
    simpleParams: {
        connectionPoint: 0,
        area: 5000,
        capacity: 400,
        epcPrice: 2.0,
        connectionType: 'low',
        investmentMode: 'epc',
        emcSubMode: 'sharing'
    },
    advParams: {
        electricityPrice: 0.7579,
        dailySunHours: 4.08,
        prValue: 80,
        azimuthEfficiency: 95,
        generationDays: 365,  // 固定365天，不可更改
        degradationFirstYear: 1.0,
        degradationLinear: 0.4,
        feedInTariff: 0.3515,
        omCost: 0.03,
        insuranceRate: 0.35,
        revenueVatRate: 13,
        costVatRate: 6,
        constructionVatRate: 9,
        vatSurchargeRate: 6,
        vatOffsetElectricityPrice: 0.7555,
        taxRate: 0, // 默认 0% (新能源享三免三减半）
        emcOwnerShareRate: 10,   // 业主获 10% 自用电费
        emcDiscountPrice: 0.65,  // 投资方售电 0.65 元/度
        emcFixedPrice: 0.6,
        emcSouthernAveragePrice: 0.7555,
        roofRent: 5              // 屋顶租金 5 元/㎡/年
    },
    solutions: DEFAULT_SOLUTIONS,
    selectedSolutionId: DEFAULT_SOLUTIONS[0].id,
    showConsumptionRateAnalysis: false,
    consumptionRateScenarios: [50, 60, 70, 80, 90, 100],
    effectiveSelfConsumptionRate: 85
};

export interface BuildingData {
    id: number;
    name: string;
    area: number;
    active: boolean;
    manualCapacity: number;
    transformerId: number;
}
