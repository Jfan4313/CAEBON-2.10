// 微电网模块类型定义

export interface MicrogridProjectData {
  // 基础信息
  projectName: string;
  projectType: 'campus' | 'factory' | 'community';

  // 容量配置
  totalCapacity: number;
  renewableCapacity: number;
  storageCapacity: number;
  loadCapacity: number;

  // 电价信息
  electricityPrice: number;
  peakPrice: number;
  valleyPrice: number;

  // 财务参数
  investment: number;
  operationCost: number;
  maintenanceCost: number;
  electricitySavings: number;
  annualRevenue: number;
}

export const initialMicrogridData: MicrogridProjectData = {
  projectName: '',
  projectType: 'campus',

  totalCapacity: 1000,
  renewableCapacity: 500,
  storageCapacity: 200,
  loadCapacity: 300,

  electricityPrice: 0.8,
  peakPrice: 1.2,
  valleyPrice: 0.4,

  investment: 5000000,
  operationCost: 100000,
  maintenanceCost: 50000,
  electricitySavings: 2000000,
  annualRevenue: 1800000
};

export type MicrogridTab = 'system' | 'integrated';
export type SalesVolumeMode = 'auto' | 'manual';
export type SalesPricingMode = 'blended' | 'fixed' | 'discount';
export type SalesSpotPriceMode = 'market' | 'manual';
export type SalesBenchmarkMode = 'project' | 'historical' | 'manual';
export type SalesPurchasePriceMode = 'project' | 'manual';
export type SalesTaxMode = 'tax_included' | 'separated' | 'excluded';

export interface SalesScenario {
  id: string;
  name: string;
  volumeMode: SalesVolumeMode;
  manualAnnualSalesKwh: number;
  renewableRatio: number;
  pricingMode: SalesPricingMode;
  fixedSalePrice: number;
  fixedSettlementRatio: number;
  spotPriceMode: SalesSpotPriceMode;
  manualSpotPrice: number;
  discountRate: number;
  benchmarkMode: SalesBenchmarkMode;
  manualBenchmarkPrice: number;
  purchasePriceMode: SalesPurchasePriceMode;
  manualPurchasePrice: number;
  taxMode: SalesTaxMode;
  lineLossRate: number;
  transmissionFee: number;
  governmentSurcharge: number;
  tradingServiceFee: number;
  deviationRate: number;
  deviationPenaltyPrice: number;
  vatRate: number;
  vatSurchargeRate: number;
}

export interface SalesServiceConfig {
  enabled: boolean;
  scenarios: SalesScenario[];
  selectedScenarioId: string;
}

export type IntegratedBusinessMode = 'service_fee' | 'savings_share' | 'comprehensive_price';

export interface IntegratedScenario {
  id: string;
  name: string;
  businessMode: IntegratedBusinessMode;
  annualServiceFee: number;
  providerShareRate: number;
  comprehensiveEnergyPrice: number;
  emsInvestment: number;
  annualEmsOpex: number;
  selfConsumptionLift: number;
  demandOptimizationRate: number;
  contractYears: number;
}

export interface IntegratedEnergyConfig {
  enabled: boolean;
  scenarios: IntegratedScenario[];
  selectedScenarioId: string;
  takeoverModuleIds: Array<'retrofit-solar' | 'retrofit-storage' | 'retrofit-vpp' | 'retrofit-energy-sales'>;
}

export interface MicrogridEnhancedParams {
  activeTab: MicrogridTab;
  salesService: SalesServiceConfig;
  integratedEnergy: IntegratedEnergyConfig;
}

export interface SalesCalculationContext {
  annualDemandKwh: number;
  projectWeightedPrice: number;
  historicalAveragePrice: number;
  marketSpotPrice: number;
  availableRenewableKwh: number;
  renewableFeedInTariff: number;
}

export interface SalesScenarioResult {
  annualSalesKwh: number;
  renewableSalesKwh: number;
  externalSalesKwh: number;
  salePrice: number;
  benchmarkPrice: number;
  purchasePrice: number;
  fixedSettlementRatio: number;
  spotSettlementRatio: number;
  spotPrice: number;
  salesRevenue: number;
  purchaseCost: number;
  renewableOpportunityCost: number;
  transactionCost: number;
  taxCost: number;
  netProfit: number;
  customerSaving: number;
  savingPerKwh: number;
  renewableShortfallKwh: number;
}

export interface IntegratedLedger {
  solar: number;
  storage: number;
  demand: number;
  sales: number;
  vpp: number;
  reliability: number;
  ems: number;
}

export interface IntegratedScenarioResult {
  ledger: IntegratedLedger;
  totalInvestment: number;
  grossBenefit: number;
  serviceProviderNet: number;
  ownerSaving: number;
  managedEnergyCost: number;
  irr: number;
  paybackPeriod: number;
  cashFlows: number[];
}

export const DEFAULT_SALES_SCENARIOS: SalesScenario[] = [{
  id: 'sales-1',
  name: '园区售电基准方案',
  volumeMode: 'auto',
  manualAnnualSalesKwh: 5000000,
  renewableRatio: 20,
  pricingMode: 'blended',
  fixedSalePrice: 0.72,
  fixedSettlementRatio: 80,
  spotPriceMode: 'market',
  manualSpotPrice: 0.5,
  discountRate: 95,
  benchmarkMode: 'project',
  manualBenchmarkPrice: 0.85,
  purchasePriceMode: 'project',
  manualPurchasePrice: 0.68,
  taxMode: 'tax_included',
  lineLossRate: 3,
  transmissionFee: 0,
  governmentSurcharge: 0,
  tradingServiceFee: 0.01,
  deviationRate: 2,
  deviationPenaltyPrice: 0.2,
  vatRate: 13,
  vatSurchargeRate: 6
}];

export const DEFAULT_INTEGRATED_SCENARIOS: IntegratedScenario[] = [{
  id: 'integrated-1',
  name: '综合能源服务基准方案',
  businessMode: 'savings_share',
  annualServiceFee: 30,
  providerShareRate: 60,
  comprehensiveEnergyPrice: 0.72,
  emsInvestment: 20,
  annualEmsOpex: 3,
  selfConsumptionLift: 8,
  demandOptimizationRate: 10,
  contractYears: 10
}];

export const DEFAULT_ENHANCED_PARAMS: MicrogridEnhancedParams = {
  activeTab: 'system',
  salesService: {
    enabled: false,
    scenarios: DEFAULT_SALES_SCENARIOS,
    selectedScenarioId: DEFAULT_SALES_SCENARIOS[0].id
  },
  integratedEnergy: {
    enabled: false,
    scenarios: DEFAULT_INTEGRATED_SCENARIOS,
    selectedScenarioId: DEFAULT_INTEGRATED_SCENARIOS[0].id,
    takeoverModuleIds: ['retrofit-solar', 'retrofit-storage', 'retrofit-vpp', 'retrofit-energy-sales']
  }
};
