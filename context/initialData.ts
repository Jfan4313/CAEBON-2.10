import { ModuleData, PriceConfigState, ProjectBaseInfo } from './ProjectContext';

export const initialModules: Record<string, ModuleData> = {
    'retrofit-solar': {
        id: 'retrofit-solar',
        name: '分布式光伏',
        isActive: true,
        strategy: 'rooftop',
        investment: 165.0,
        yearlySaving: 38.8,
        kpiPrimary: { label: '装机容量', value: '450 kW' },
        kpiSecondary: { label: 'ROI', value: '23.5%' }
    },
    'retrofit-storage': {
        id: 'retrofit-storage',
        name: '工商业储能',
        isActive: false,
        strategy: '光伏余电消纳',
        investment: 62.64,
        yearlySaving: 0,
        kpiPrimary: { label: '装机规模', value: '261kW/522kWh' },
        kpiSecondary: { label: '运行策略', value: '仅光伏余电充电' },
        params: {
            mode: 'advanced',
            dispatchMode: 'pv_surplus',
            basicParams: { power: 261, capacity: 522, unitCost: 1200 },
            advParams: { dod: 90, rte: 88, cycles: 6000, degradation: 1.5, auxPower: 1.5 },
            strategyType: 'baseline',
            baselineMode: '1c1d',
            aiFeatures: { dynamicPricing: false, demandManagement: false, pvSelfConsumption: true },
            investmentConfig: { mode: 'self', emcOwnerShareRate: 15 },
            marketPriceModel: 'tou'
        }
    },
    'retrofit-hvac': {
        id: 'retrofit-hvac',
        name: '暖通空调',
        isActive: true,
        strategy: 'replace',
        investment: 325.0,
        yearlySaving: 28.5,
        kpiPrimary: { label: '年节电', value: '34.2 万kWh' },
        kpiSecondary: { label: '节能率', value: '18.5%' }
    },
    'retrofit-lighting': {
        id: 'retrofit-lighting',
        name: '智能照明',
        isActive: true,
        strategy: 'smart',
        investment: 45.0,
        yearlySaving: 13.2,
        kpiPrimary: { label: '灯具数量', value: '2500 盏' },
        kpiSecondary: { label: '节电率', value: '60.5%' }
    },
    'retrofit-water': {
        id: 'retrofit-water',
        name: '热水系统',
        isActive: false,
        strategy: 'heatpump',
        investment: 85.0,
        yearlySaving: 18.8,
        kpiPrimary: { label: '日供水', value: '120 吨' },
        kpiSecondary: { label: '节能率', value: '65%' }
    },
    'retrofit-ev': {
        id: 'retrofit-ev',
        name: '充电桩设施',
        isActive: false,
        strategy: 'smart',
        investment: 45.0,
        yearlySaving: 43.8,
        kpiPrimary: { label: '桩体数量', value: '12 个' },
        kpiSecondary: { label: '年服务费', value: '43.8 万' }
    },
    'retrofit-microgrid': {
        id: 'retrofit-microgrid',
        name: '微电网',
        isActive: false,
        strategy: 'grid-tied',
        investment: 40.0,
        yearlySaving: 0,
        kpiPrimary: { label: 'PCC容量', value: '2500 kVA' },
        kpiSecondary: { label: '可靠性', value: '99.9%' }
    },
    'retrofit-energy-sales': {
        id: 'retrofit-energy-sales',
        name: '售电服务',
        isActive: false,
        strategy: 'retail',
        investment: 0,
        yearlySaving: 0,
        kpiPrimary: { label: '年售电量', value: '0 万度' },
        kpiSecondary: { label: '售电净收益', value: '¥0万/年' }
    },
    'retrofit-vpp': {
        id: 'retrofit-vpp',
        name: '虚拟电厂',
        isActive: false,
        strategy: 'dr',
        investment: 10.0,
        yearlySaving: 13.5,
        kpiPrimary: { label: '调节容量', value: '500 kW' },
        kpiSecondary: { label: '响应时间', value: '分钟级' }
    },
    'retrofit-ai': {
        id: 'retrofit-ai',
        name: 'AI 智控平台',
        isActive: false,
        strategy: 'ai',
        investment: 35.0,
        yearlySaving: 20.0,
        kpiPrimary: { label: '接入点位', value: '2000 个' },
        kpiSecondary: { label: '额外节能', value: '8.5%' }
    },
    'retrofit-carbon': {
        id: 'retrofit-carbon',
        name: '碳资产管理',
        isActive: false,
        strategy: 'trade',
        investment: 0,
        yearlySaving: 4.9,
        kpiPrimary: { label: '年减排', value: '580 t' },
        kpiSecondary: { label: '碳价', value: '85 元/t' }
    }
};

export const initialPriceConfig: PriceConfigState = {
    mode: 'tou',
    fixedPrice: 0.85,
    touSegments: [
        { start: 0, end: 8, price: 0.32, type: 'valley' },
        { start: 8, end: 11, price: 0.68, type: 'flat' },
        { start: 11, end: 14, price: 1.15, type: 'peak' },
        { start: 14, end: 17, price: 1.62, type: 'tip' },
        { start: 17, end: 19, price: 1.15, type: 'peak' },
        { start: 19, end: 22, price: 0.68, type: 'flat' },
        { start: 22, end: 24, price: 0.32, type: 'valley' },
    ],
    spotPrices: Array(24).fill(0.5)
};

export const initialProjectBaseInfo: ProjectBaseInfo = {
    name: '广东工业园标准项目（匿名）',
    type: 'factory',
    villaDailyKwh: 35,
    province: 'Guangdong',
    city: 'Guangzhou',
    // 新增: 精确位置信息 (默认为空)
    latitude: undefined,
    longitude: undefined,
    formattedAddress: undefined,
    buildings: [],
    omRate: 0, // 不使用全局运维费用
    taxRate: 0, // 小微企业免税
    discountRate: 5.0,
    spvConfig: {
        debtRatio: 70, // 70% loan
        loanInterest: 4.5, // 4.5% interest
        loanTerm: 10, // 10 years
        shareholderARate: 51 // 51% shareholder A
    }
};
