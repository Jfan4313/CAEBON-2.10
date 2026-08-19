export interface StorageBasicParams {
    power: number; // kW
    capacity: number; // kWh
    unitCost: number; // 元/kWh
}

export type StorageDispatchMode = 'pv_surplus' | 'hybrid';

export interface StorageAdvParams {
    dod: number; // %
    rte: number; // % (Round-Trip Efficiency)
    cycles: number;
    degradation: number; // % per year
    auxPower: number; // kW (Auxiliary power for cooling/BMS)
}

export interface StorageAiFeatures {
    dynamicPricing: boolean;
    demandManagement: boolean;
    pvSelfConsumption: boolean;
}

export interface StorageInvestmentConfig {
    mode: 'self' | 'emc';
    emcOwnerShareRate: number;
}

export interface StorageFinancials {
    investment: number;
    arbitrage: number;
    demand: number;
    totalSaving: number;
    ownerBenefit: number;
    investorRevenue: number;
    payback: number;
}

export interface StorageSimulationData {
    hour: string;
    price: number;
    load: number;
    pv: number;
    action: number;
    soc: number; // %
    gridLoad: number;
    transformerLimit: number;
}
