export interface HvacStrategy {
    name: string;
    targetCOP: number;
    unitCost: number; // 元/kW (Cooling Load)
}

export interface HvacGlobalParams {
    electricityPrice: number;
    gasPrice: number; // 元/m3 (For CCHP)
    currentAvgCOP: number;
    discountRate: number;
    maintenanceGrowth: number;
    investmentMode: 'self' | 'emc';
    emcOwnerShareRate: number;
}

export interface HvacBuilding {
    id: number;
    name: string;
    desc: string;
    load: number;
    area: number;
    active: boolean;
    strategy: string; // 'basic' | 'intermediate' | 'advanced' | 'cchp'
    runHours: number;
    costMode: 'power' | 'area' | 'fixed';
    customUnitCost: number;
    customTotalInvest: number;
    customCOP: number;
}

export interface HvacSchedule {
    start: number;
    end: number;
}

export interface HvacFinancials {
    totalInvestment: number;
    totalYearlySaving: number;
    ownerBenefit: number;
    investorRevenue: number;
    cchpGasCost: number;
    irr: number;
    paybackPeriod: number;
    cashFlows: number[];
}
