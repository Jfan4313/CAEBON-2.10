export type InvestmentMode = 'epc' | 'emc' | 'financing' | 'co_build';

/** EMC 细分结算模式。southern_average 仅保留用于兼容旧方案，界面不再作为结算方式展示。 */
export type EmcSubMode = 'sharing' | 'discount' | 'fixed' | 'southern_average';
export type IncomeTaxMode = 'exempt' | 'small_micro' | 'custom';
export type VatTaxpayerType = 'small_scale' | 'general';
export type SolarConnectionType = 'high' | 'low';
export type SolarOperationMode = 'grid_connected' | 'off_grid';
export type SolarConstructionMethod = 'rooftop' | 'color_steel_canopy' | 'bipv_canopy' | 'daylighting_canopy';

export interface SolarMonthlyTariff {
    month: number;
    benchmarkPrice: number;
    discountedPrice: number;
    source: 'bill' | 'estimated' | 'config';
}

export interface SolarConstructionMethodConfig {
    id: SolarConstructionMethod;
    name: string;
    shortName: string;
    description: string;
    image: string;
    imageSource?: string;
}

export const SOLAR_CONSTRUCTION_METHODS: Record<SolarConstructionMethod, SolarConstructionMethodConfig> = {
    rooftop: {
        id: 'rooftop',
        name: '彩钢瓦屋顶光伏',
        shortName: '彩钢瓦屋顶',
        description: '利用既有彩钢瓦厂房屋面布置光伏组件，施工成熟、综合成本可控。',
        image: '/solar-construction/color-steel-rooftop.png',
        imageSource: '业主提供的彩钢瓦屋顶光伏参考图'
    },
    color_steel_canopy: {
        id: 'color_steel_canopy',
        name: '彩钢瓦棚架光伏',
        shortName: '彩钢瓦棚架',
        description: '在屋顶设备区或通道上方加建彩钢瓦棚架并铺设光伏，兼顾遮蔽、防护与发电。',
        image: '/solar-construction/color-steel-canopy.jpg',
        imageSource: 'AI 生成的工业屋顶彩钢瓦棚架光伏参考图'
    },
    bipv_canopy: {
        id: 'bipv_canopy',
        name: 'BIPV光伏棚架',
        shortName: 'BIPV棚架',
        description: '光伏组件与棚架围护一体化，兼顾发电、遮阳和防雨。',
        image: '/solar-construction/bipv-canopy.jpg',
        imageSource: 'AI 生成的工业屋顶 BIPV 光伏棚架参考图'
    },
    daylighting_canopy: {
        id: 'daylighting_canopy',
        name: '采光网光伏棚架',
        shortName: '采光棚架',
        description: '采用透光或间隔布置的光伏玻璃，兼顾自然采光与遮阳发电。',
        image: '/solar-construction/daylighting-canopy.jpg',
        imageSource: 'Sonnenstromfabrik 半透明光伏组件应用实景'
    }
};

export interface SolarMaterialItem {
    id: string;
    section: string;
    sequence: string;
    name: string;
    material: string;
    brand: string;
    specification: string;
    theoreticalLength: string;
    unit: string;
    quantity: string;
}

export interface SolarBusinessTerms {
    showInReport: boolean;
    contractYears: string;
    settlementTerms: string;
    ownerResponsibilities: string;
    investorResponsibilities: string;
    specialTerms: string;
}

const createMaterialItems = (section: string, rows: string[][]): SolarMaterialItem[] => rows.map((row, index) => ({
    id: `${section}-${index + 1}`,
    section,
    sequence: row[0] || '',
    name: row[1] || '',
    material: row[2] || '',
    brand: row[3] || '',
    specification: row[4] || '',
    theoreticalLength: row[5] || '',
    unit: row[6] || '',
    quantity: row[7] || ''
}));

export const DEFAULT_SOLAR_MATERIAL_TEMPLATES = {
    lowVoltage: createMaterialItems('低压光伏', [
        ['1', '光伏组件', 'A级', '通威', '640', '1134*2382', '项', '1'],
        ['2', '逆变器', 'IP66', '阳光电源', '', '/', '项', '1'],
        ['3', '光伏直流电缆（红/黑）', '铜芯电线', '国标', 'PV1F-4平方', '/', '项', '1'],
        ['4', 'MC4插头', '铜芯', '国标', 'IP68', '/', '项', '1'],
        ['5', '逆变器电缆（06/1kv）', '铝芯电缆', '国标', '-', '/', '项', '1'],
        ['6', '主线电缆（06/1kv）', '铜芯电缆', '国标', '-', '/', '项', '1'],
        ['7', '线槽', '热浸锌', '国标', '定制', '/', '项', '1'],
        ['8', '并网计量柜', 'GGD', '国标', '对应容量KW', '/', '项', '1'],
        ['9', '支架（铝合金）', '6063-T5', '国标', '氧化膜厚度≥15μm 41×41×2.0', '/', '项', '1'],
        ['10', '连接件（铝合金）', '6063-T5', '国标', '30×200', '200', '项', '1'],
        ['11', '夹具（铝合金）', '6063-T5', '国标', '50', '50', '项', '1'],
        ['12', '中压', '6063-T5', '国标', '60（含塑翼螺丝）', '/', '项', '1'],
        ['13', '边压', '6063-T5', '国标', '60（含塑翼螺丝）', '/', '项', '1'],
        ['14', '螺丝', 'SUS304', '304不锈钢', 'M10×25', '25', '项', '1'],
        ['15', '防雷接地', 'Q235B', '定制', '定制', '/', '项', '1'],
        ['16', '五金配件', '/', '/', '/', '/', '项', '1']
    ]),
    highVoltage: createMaterialItems('高压光伏', [
        ['1', '光伏组件', 'A级', '隆基', '', '', '块', ''],
        ['2', '光伏直流线', '铜芯电线', '玖开', 'PV1F-4平方', '/', '项', '1'],
        ['3', '线槽', 'SUS304', '不锈钢', '订制', '订制', '项', '1'],
        ['4', '支架（铝合金）', '6063-T5', '君诚', '41*41*2.0', '6000', '项', '1'],
        ['5', '夹具（铝合金）', '6063-T5', '君诚', '50', '50', '项', '1'],
        ['6', '连接件（铝合金）', '6063-T5', '君诚', '30*200', '200', '项', '1'],
        ['7', '中压', '6063-T5', '君诚', 'ZYM-421901', '60', '项', '1'],
        ['8', '边压', '6063-T5', '君诚', 'BYM-444201', '60', '项', '1'],
        ['9', '螺丝（夹具）', 'SUS304', '利康', 'M8*25', '2平1弹1母', '项', '1'],
        ['10', '螺丝（压块）', 'SUS304', '利康', 'M8*35', '/', '项', '1'],
        ['11', '螺丝（连接件）', 'SUS304', '利康', 'M10*25/垫加大加厚', '2平1弹1母', '项', '1'],
        ['12', '五金配件', '/', '/', '/', '/', '项', '1'],
        ['13', '光伏并网柜（KYN-28）', '覆铝锌板', '恒诺通用电气', '800×1500×2000', '/', '项', '1'],
        ['14', '光伏进线柜（HXGN）', '覆铝锌板', '恒诺通用电气', '800×900×2000', '/', '项', '1'],
        ['15', '光伏计量柜（HXGN）', '覆铝锌板', '恒诺通用电气', '800×900×2000', '/', '项', '1'],
        ['16', '光伏PT柜（HXGN）', '覆铝锌板', '恒诺通用电气', '800×900×2000', '/', '项', '1'],
        ['17', '10kV干式变压器', '覆铝锌板', '恒诺通用电气', 'SCB11-2000/10.5', '/', '项', '1'],
        ['18', '预制仓', '复合板', '恒诺通用电气', 'A级防火材料', '/', '项', '1'],
        ['19', '逆变器电缆', '铜芯电缆', '珠江电缆', 'ZCYJV', '/', '项', '1'],
        ['20', '电房建设', '/', '/', '/', '/', '项', '1']
    ]),
    arrayRack: createMaterialItems('阵列式光伏支架', [
        ['1', '底座（热镀锌）', 'Q235B', '君诚', '两孔150*3.0', '/', '项', '1'],
        ['2', '四孔三角（热镀锌）', 'Q235B', '君诚', '四孔150*3.0', '/', '项', '1'],
        ['3', '连接件（热镀锌）', 'Q235B', '君诚', '30×200', '/', '项', '1']
    ]),
    galvanizedCanopy: createMaterialItems('热镀锌光伏棚架', [
        ['1', '斜面主梁', '热镀锌', '方管', '120×60×2.5', '/', '项', '1'],
        ['2', '水平拉杆', '热镀锌', '方管', '120×60×2.0', '/', '项', '1'],
        ['3', '光伏支架', '热镀锌', '方管', '52×41×2.0', '/', '项', '1'],
        ['4', '立柱', '热镀锌', '方管', '150×150×2.5', '/', '项', '1'],
        ['5', '护栏1(女儿墙）', '热镀锌', '方管', '52×41×2.0', '/', '项', '1'],
        ['6', '护栏圆钢', '热镀锌', '圆钢', 'D10', '/', '项', '1'],
        ['7', '护栏2', '热镀锌', '方管', '52×41×2.0', '/', '项', '1'],
        ['8', '护栏圆钢', '热镀锌', '圆钢', 'D10', '/', '项', '1']
    ]),
    colorSteelCanopy: createMaterialItems('彩钢瓦棚架', [
        ['1', '棚架主体', '钢结构', '国标', '立柱、主梁、桁架按深化设计', '/', '项', '1'],
        ['2', '支撑系统', 'Q235B/热镀锌', '国标', '檩条、拉条、连接件按结构复核', '/', '项', '1'],
        ['3', '彩钢瓦屋面', '彩钢板', '国标', '0.5mm厚820角驰暗扣型或同等规格', '/', '项', '1'],
        ['4', '排水与收边', '不锈钢/彩钢板', '国标', '水沟、泛水、收边按现场深化', '/', '项', '1']
    ])
};

export const buildDefaultSolarMaterialBill = (
    connectionType: SolarConnectionType = 'low',
    constructionMethod: SolarConstructionMethod = 'rooftop'
): SolarMaterialItem[] => {
    const baseItems = connectionType === 'high'
        ? DEFAULT_SOLAR_MATERIAL_TEMPLATES.highVoltage
        : DEFAULT_SOLAR_MATERIAL_TEMPLATES.lowVoltage;
    const constructionItems = constructionMethod === 'color_steel_canopy'
        ? DEFAULT_SOLAR_MATERIAL_TEMPLATES.colorSteelCanopy
        : constructionMethod === 'bipv_canopy' || constructionMethod === 'daylighting_canopy'
            ? DEFAULT_SOLAR_MATERIAL_TEMPLATES.galvanizedCanopy
            : DEFAULT_SOLAR_MATERIAL_TEMPLATES.arrayRack;

    return [...baseItems, ...constructionItems].map((item, index) => ({
        ...item,
        id: `material-${index + 1}`
    }));
};

export interface SolarSimpleParams {
    connectionPoint: number;
    area: number;
    capacity: number;
    epcPrice: number; // 建造成本单价（元/Wp），EPC/EMC 投资模型共用
    connectionType: SolarConnectionType;
    operationMode: SolarOperationMode;
    investmentMode: InvestmentMode;
    emcSubMode: EmcSubMode; // 仅当 investmentMode === 'emc' 时生效
}

export interface SolarAdvParams {
    projectLifeYears: number;
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
    vatTaxpayerType: VatTaxpayerType;
    revenueVatRate: number;
    costVatRate: number;
    constructionVatRate: number;
    vatSurchargeRate: number;
    vatOffsetElectricityPrice: number;
    incomeTaxMode: IncomeTaxMode;
    taxRate: number;

    // ===== EMC 专项参数 =====
    // 【收益分成模式】业主获得总自用电费收益的百分比, 投资方获得 (100 - 此值)%
    emcOwnerShareRate: number;
    // 【折扣电价模式】兼容旧项目的固定折扣售电价；新模型使用 emcDiscountRate
    emcDiscountPrice: number;
    // 投资方售电价占当月南网尖峰平谷加权电价的比例
    emcDiscountRate: number;
    // 根据月度电费单生成的12个月南网加权基准价及折后售电价
    emcMonthlyTariffs: SolarMonthlyTariff[];
    // 【固定电价模式】投资方向业主售电的固定价格 (元/kWh)
    emcFixedPrice: number;
    // 【业主对标电价】南网均价/尖峰评估电价等参照值，仅用于计算业主每度省多少钱
    emcSouthernAveragePrice: number;
    // 【通用】业主向投资方收取的屋顶使用费 (元/㎡/年)
    roofRent: number;

    // ===== 融资共建专项参数 =====
    // 融资方提供的项目投资比例、融资年利率与等额本息期限
    financingRatio: number;
    financingAnnualRate: number;
    financingTermYears: number;

    // ===== 股权共建专项参数 =====
    // 我方持股/出资比例，业主持股比例为 (100 - 此值)%，双方同股同酬
    coBuildInvestorShareRate: number;
    // 合作期内项目向业主的售电价格与合作期限
    coBuildSalePrice: number;
    coBuildTermYears: number;
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
export type SolarCableBrand = 'far_east' | 'hengtong' | 'baosheng' | 'generic';
export type SolarInverterBrand = 'huawei' | 'sungrow' | 'ginlong' | 'generic';

export const CABLE_BRANDS: Record<SolarCableBrand, { id: SolarCableBrand; name: string }> = {
    far_east: { id: 'far_east', name: '远东电缆' },
    hengtong: { id: 'hengtong', name: '亨通电缆' },
    baosheng: { id: 'baosheng', name: '宝胜电缆' },
    generic: { id: 'generic', name: '国标电缆' }
};

export const INVERTER_BRANDS: Record<SolarInverterBrand, { id: SolarInverterBrand; name: string; description: string }> = {
    huawei: { id: 'huawei', name: '华为', description: '智能组串式逆变器' },
    sungrow: { id: 'sungrow', name: '阳光电源', description: '工商业组串式逆变器' },
    ginlong: { id: 'ginlong', name: '锦浪科技', description: '组串式光伏逆变器' },
    generic: { id: 'generic', name: '通用逆变器', description: '按项目技术规格选型' }
};

export interface SolarSolution {
    id: string;
    name: string;
    description: string;
    capacity?: number; // 本方案铺设容量（kWp）。未填写时跟随楼栋容量汇总
    connectionType: SolarConnectionType; // 高压/低压接入
    brand: SolarModuleBrand; // 组件品牌
    cableType: CableType; // 线缆材质
    cableBrand: SolarCableBrand; // 电缆品牌
    inverterBrand: SolarInverterBrand; // 逆变器品牌
    constructionMethod: SolarConstructionMethod; // 建设形式/效果图类型
    epcPrice: number; // 建造成本单价（元/Wp），EPC/EMC 投资模型共用
    investmentMode: InvestmentMode; // 该方案独立合作方式
    emcSubMode?: EmcSubMode;
    emcOwnerShareRate?: number;
    emcDiscountPrice?: number;
    emcDiscountRate?: number;
    emcFixedPrice?: number;
    emcSouthernAveragePrice?: number;
    roofRent?: number;
    financingRatio?: number;
    financingAnnualRate?: number;
    financingTermYears?: number;
    coBuildInvestorShareRate?: number;
    coBuildSalePrice?: number;
    coBuildTermYears?: number;
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
        cableBrand: 'far_east',
        inverterBrand: 'huawei',
        constructionMethod: 'rooftop',
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
        cableBrand: 'hengtong',
        inverterBrand: 'sungrow',
        constructionMethod: 'bipv_canopy',
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
        cableBrand: 'baosheng',
        inverterBrand: 'ginlong',
        constructionMethod: 'daylighting_canopy',
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
    materialBillItems?: SolarMaterialItem[];
    materialBillNote?: string;
    showMaterialBillInReport?: boolean;
    canopyOverheightOwnerResponsibility?: boolean;
    canopyOverheightResponsibilityNote?: string;
    businessTerms?: SolarBusinessTerms;
}

export type SolarReportAudience = 'owner' | 'investor';

export const DEFAULTS: SolarParamsState = {
    mode: 'simple',
    selfUseMode: 'manual',
    simpleParams: {
        connectionPoint: 0,
        area: 5000,
        capacity: 400,
        epcPrice: 2.0,
        connectionType: 'low',
        operationMode: 'grid_connected',
        investmentMode: 'epc',
        emcSubMode: 'sharing'
    },
    advParams: {
        projectLifeYears: 11,
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
        vatTaxpayerType: 'small_scale',
        revenueVatRate: 13,
        costVatRate: 6,
        constructionVatRate: 9,
        vatSurchargeRate: 6,
        vatOffsetElectricityPrice: 0.7555,
        incomeTaxMode: 'small_micro',
        taxRate: 5,
        emcOwnerShareRate: 10,   // 业主获 10% 自用电费
        emcDiscountPrice: 0.65,  // 投资方售电 0.65 元/度
        emcDiscountRate: 90,
        emcMonthlyTariffs: [],
        emcFixedPrice: 0.6,
        emcSouthernAveragePrice: 0.7555,
        roofRent: 5,             // 屋顶租金 5 元/㎡/年
        financingRatio: 70,
        financingAnnualRate: 4.2,
        financingTermYears: 10,
        coBuildInvestorShareRate: 60,
        coBuildSalePrice: 0.6,
        coBuildTermYears: 11
    },
    solutions: DEFAULT_SOLUTIONS,
    selectedSolutionId: DEFAULT_SOLUTIONS[0].id,
    showConsumptionRateAnalysis: false,
    consumptionRateScenarios: [50, 60, 70, 80, 90, 100],
    effectiveSelfConsumptionRate: 85,
    materialBillItems: undefined,
    materialBillNote: '材料清单按当前方案模板生成，可根据深化设计和最终采购清单调整。',
    showMaterialBillInReport: false,
    canopyOverheightOwnerResponsibility: false,
    canopyOverheightResponsibilityNote: '因本项目光伏棚架存在超高情况，需由业主对发改备案、电网接入、报批合规、违建认定、整改及相关责任进行兜底。',
    businessTerms: {
        showInReport: true,
        contractYears: '按项目测算周期签约，具体以双方商务合同为准。',
        settlementTerms: '按当前合作模式执行电费结算、租金或收益分配。',
        ownerResponsibilities: '业主提供屋顶资源，协助办理发改备案、电网接入、现场协调及必要资料盖章。',
        investorResponsibilities: '投资方负责方案设计、投资建设、设备采购、施工组织、运维管理及发电监控。',
        specialTerms: '涉及屋面结构、消防、规划、违建认定或属地审批事项的，以现场复核和政府主管部门口径为准。'
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
