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
        isActive: true,
        strategy: 'arbitrage',
        investment: 300.0,
        yearlySaving: 88.5,
        kpiPrimary: { label: '配置容量', value: '2 MWh' },
        kpiSecondary: { label: '回收期', value: '3.4 年' }
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
        isActive: true,
        strategy: 'ai',
        investment: 35.0,
        yearlySaving: 20.0,
        kpiPrimary: { label: '接入点位', value: '2000 个' },
        kpiSecondary: { label: '额外节能', value: '8.5%' }
    },
    'retrofit-carbon': {
        id: 'retrofit-carbon',
        name: '碳资产管理',
        isActive: true,
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
    name: '上海浦东新区工业园节能改造项目',
    type: 'factory',
    province: 'Shanghai',
    city: 'Pudong',
    buildings: [],
    omRate: 1.5, // Default 1.5% of total CAPEX per year
    taxRate: 25.0, // Default 25% corporate tax
    discountRate: 5.0,
    spvConfig: {
        debtRatio: 70, // 70% loan
        loanInterest: 4.5, // 4.5% interest
        loanTerm: 10, // 10 years
        shareholderARate: 51 // 51% shareholder A
    }
};
