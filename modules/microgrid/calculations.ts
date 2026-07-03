import { calculateIRR, calculatePaybackPeriod } from '../../utils/financial';
import type { PriceConfigState } from '../../context/ConfigContext';
import type { ModuleData } from '../../context/ModuleContext';
import type {
  IntegratedScenario,
  IntegratedScenarioResult,
  SalesCalculationContext,
  SalesScenario,
  SalesScenarioResult
} from './types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number(value) || 0));
const toWan = (yuan: number) => yuan / 10000;

export const getWeightedElectricityPrice = (priceConfig: PriceConfigState): number => {
  if (priceConfig.mode === 'fixed') return Number(priceConfig.fixedPrice) || 0;
  if (priceConfig.mode === 'spot') {
    const prices = priceConfig.spotPrices || [];
    return prices.length > 0 ? prices.reduce((sum, price) => sum + Number(price || 0), 0) / prices.length : 0;
  }

  const segments = priceConfig.touSegments || [];
  const hours = segments.reduce((sum, segment) => sum + Math.max(0, Number(segment.end) - Number(segment.start)), 0);
  if (hours <= 0) return 0;
  return segments.reduce((sum, segment) => {
    const duration = Math.max(0, Number(segment.end) - Number(segment.start));
    return sum + duration * Number(segment.price || 0);
  }, 0) / hours;
};

export const getMarketSpotPrice = (priceConfig: PriceConfigState): number => {
  const prices = priceConfig.spotPrices || [];
  return prices.length > 0
    ? prices.reduce((sum, price) => sum + Number(price || 0), 0) / prices.length
    : getWeightedElectricityPrice(priceConfig);
};

export const getHistoricalAveragePrice = (bills: Array<{ kwh?: number; cost?: number }>, fallback: number): number => {
  const totalKwh = bills.reduce((sum, bill) => sum + Number(bill.kwh || 0), 0);
  const totalCost = bills.reduce((sum, bill) => sum + Number(bill.cost || 0), 0);
  return totalKwh > 0 && totalCost > 0 ? totalCost / totalKwh : fallback;
};

export const getAnnualDemandKwh = (
  bills: Array<{ kwh?: number }>,
  transformers: Array<{ capacity?: number }>
): number => {
  const billDemand = bills.reduce((sum, bill) => sum + Number(bill.kwh || 0), 0);
  if (billDemand > 0) return billDemand;
  const transformerCapacity = transformers.reduce((sum, transformer) => sum + Number(transformer.capacity || 0), 0);
  return transformerCapacity > 0 ? transformerCapacity * 0.45 * 2000 : 1000000;
};

export const getSolarSalesContext = (solarModule?: ModuleData): { availableRenewableKwh: number; feedInTariff: number } => {
  if (!solarModule?.isActive || !solarModule.params) {
    return { availableRenewableKwh: 0, feedInTariff: 0.35 };
  }

  const simple = solarModule.params.simpleParams || {};
  const advanced = solarModule.params.advParams || {};
  const capacity = Number(simple.capacity || 0);
  const generationKwh = capacity
    * Number(advanced.dailySunHours || 0)
    * Number(advanced.generationDays || 365)
    * (Number(advanced.prValue || 0) / 100)
    * (Number(advanced.azimuthEfficiency || 100) / 100);
  const selfConsumptionRate = clamp(Number(solarModule.params.effectiveSelfConsumptionRate ?? 85), 0, 100);

  return {
    availableRenewableKwh: generationKwh * (1 - selfConsumptionRate / 100),
    feedInTariff: Number(advanced.feedInTariff || 0.35)
  };
};

const resolveBenchmarkPrice = (scenario: SalesScenario, context: SalesCalculationContext) => {
  if (scenario.benchmarkMode === 'historical') return context.historicalAveragePrice;
  if (scenario.benchmarkMode === 'manual') return Number(scenario.manualBenchmarkPrice || 0);
  return context.projectWeightedPrice;
};

export const calculateSalesScenario = (
  scenario: SalesScenario,
  context: SalesCalculationContext
): SalesScenarioResult => {
  const annualSalesKwh = Math.max(0, scenario.volumeMode === 'auto'
    ? context.annualDemandKwh
    : Number(scenario.manualAnnualSalesKwh || 0));
  const requestedRenewableKwh = annualSalesKwh * clamp(scenario.renewableRatio, 0, 100) / 100;
  const renewableSalesKwh = Math.min(requestedRenewableKwh, Math.max(0, context.availableRenewableKwh));
  const externalSalesKwh = Math.max(0, annualSalesKwh - renewableSalesKwh);
  const benchmarkPrice = resolveBenchmarkPrice(scenario, context);
  const fixedSettlementRatio = scenario.pricingMode === 'blended'
    ? clamp(scenario.fixedSettlementRatio, 0, 100)
    : 100;
  const spotSettlementRatio = scenario.pricingMode === 'blended' ? 100 - fixedSettlementRatio : 0;
  const spotPrice = scenario.spotPriceMode === 'manual'
    ? Number(scenario.manualSpotPrice || 0)
    : context.marketSpotPrice;
  const salePrice = scenario.pricingMode === 'fixed'
    ? Number(scenario.fixedSalePrice || 0)
    : scenario.pricingMode === 'discount'
      ? benchmarkPrice * clamp(scenario.discountRate, 0, 200) / 100
      : Number(scenario.fixedSalePrice || 0) * fixedSettlementRatio / 100
        + spotPrice * spotSettlementRatio / 100;
  const purchasePrice = scenario.purchasePriceMode === 'manual'
    ? Number(scenario.manualPurchasePrice || 0)
    : context.projectWeightedPrice;
  const lossRate = clamp(scenario.lineLossRate, 0, 30) / 100;
  const purchasedKwh = externalSalesKwh / Math.max(0.01, 1 - lossRate);

  const salesRevenue = toWan(annualSalesKwh * salePrice);
  const purchaseCost = toWan(purchasedKwh * purchasePrice);
  const renewableOpportunityCost = toWan(renewableSalesKwh * context.renewableFeedInTariff);
  const unitFees = Number(scenario.transmissionFee || 0)
    + Number(scenario.governmentSurcharge || 0)
    + Number(scenario.tradingServiceFee || 0);
  const deviationCost = annualSalesKwh
    * clamp(scenario.deviationRate, 0, 100) / 100
    * Number(scenario.deviationPenaltyPrice || 0);
  const transactionCost = toWan(annualSalesKwh * unitFees + deviationCost);

  const vatRate = clamp(scenario.vatRate, 0, 100) / 100;
  const surchargeRate = clamp(scenario.vatSurchargeRate, 0, 100) / 100;
  let taxCost = 0;
  if (scenario.taxMode === 'tax_included') {
    const outputVat = vatRate > 0 ? salesRevenue * vatRate / (1 + vatRate) : 0;
    taxCost = outputVat * (1 + surchargeRate);
  } else if (scenario.taxMode === 'separated') {
    taxCost = Math.max(0, salesRevenue - purchaseCost - renewableOpportunityCost) * vatRate * (1 + surchargeRate);
  }

  const netProfit = salesRevenue - purchaseCost - renewableOpportunityCost - transactionCost - taxCost;
  const customerSaving = toWan(annualSalesKwh * Math.max(0, benchmarkPrice - salePrice));

  return {
    annualSalesKwh,
    renewableSalesKwh,
    externalSalesKwh,
    salePrice,
    benchmarkPrice,
    purchasePrice,
    fixedSettlementRatio,
    spotSettlementRatio,
    spotPrice,
    salesRevenue,
    purchaseCost,
    renewableOpportunityCost,
    transactionCost,
    taxCost,
    netProfit,
    customerSaving,
    savingPerKwh: Math.max(0, benchmarkPrice - salePrice),
    renewableShortfallKwh: Math.max(0, requestedRenewableKwh - renewableSalesKwh)
  };
};

export interface IntegratedCalculationContext {
  modules: Record<string, ModuleData>;
  microgridInvestment: number;
  microgridSynergy: number;
  demandRevenue: number;
  vppRevenue: number;
  reliabilityRevenue: number;
  annualDemandKwh: number;
  benchmarkPrice: number;
  salesResult?: SalesScenarioResult;
}

export const calculateIntegratedScenario = (
  scenario: IntegratedScenario,
  context: IntegratedCalculationContext
): IntegratedScenarioResult => {
  const solar = context.modules['retrofit-solar'];
  const storage = context.modules['retrofit-storage'];
  const vpp = context.modules['retrofit-vpp'];
  const solarRevenue = solar?.isActive ? Number(solar.yearlySaving || 0) : 0;
  const storageRevenue = storage?.isActive ? Number(storage.yearlySaving || 0) : 0;
  const vppRevenue = vpp?.isActive ? Number(vpp.yearlySaving || 0) : context.vppRevenue;
  const solarInvestment = solar?.isActive ? Number(solar.investment || 0) : 0;
  const storageInvestment = storage?.isActive ? Number(storage.investment || 0) : 0;
  const vppInvestment = vpp?.isActive ? Number(vpp.investment || 0) : 0;
  const consumptionLiftValue = solarRevenue * clamp(scenario.selfConsumptionLift, 0, 100) / 100;
  const demandLiftValue = context.demandRevenue * clamp(scenario.demandOptimizationRate, 0, 100) / 100;
  const emsValue = context.microgridSynergy + consumptionLiftValue + demandLiftValue - Number(scenario.annualEmsOpex || 0);

  const ledger = {
    solar: solarRevenue,
    storage: storageRevenue,
    demand: context.demandRevenue + demandLiftValue,
    sales: context.salesResult?.netProfit || 0,
    vpp: vppRevenue,
    reliability: context.reliabilityRevenue,
    ems: emsValue
  };
  const grossBenefit = Object.values(ledger).reduce((sum, value) => sum + value, 0);
  const totalInvestment = solarInvestment + storageInvestment + vppInvestment
    + context.microgridInvestment + Number(scenario.emsInvestment || 0);
  let serviceProviderNet = 0;
  let ownerSaving = 0;

  if (scenario.businessMode === 'service_fee') {
    serviceProviderNet = Math.min(grossBenefit, Math.max(0, Number(scenario.annualServiceFee || 0)));
    ownerSaving = Math.max(0, grossBenefit - serviceProviderNet);
  } else if (scenario.businessMode === 'savings_share') {
    serviceProviderNet = grossBenefit * clamp(scenario.providerShareRate, 0, 100) / 100;
    ownerSaving = Math.max(0, grossBenefit - serviceProviderNet);
  } else {
    const baselineCost = toWan(context.annualDemandKwh * context.benchmarkPrice);
    const managedBill = toWan(context.annualDemandKwh * Number(scenario.comprehensiveEnergyPrice || 0));
    ownerSaving = clamp(baselineCost - managedBill, 0, grossBenefit);
    serviceProviderNet = Math.max(0, grossBenefit - ownerSaving);
  }

  const years = Math.max(1, Math.round(Number(scenario.contractYears || 10)));
  const cashFlows = [-totalInvestment, ...Array.from({ length: years }, () => serviceProviderNet)];

  return {
    ledger,
    totalInvestment,
    grossBenefit,
    serviceProviderNet,
    ownerSaving,
    managedEnergyCost: toWan(context.annualDemandKwh * context.benchmarkPrice) - ownerSaving,
    irr: calculateIRR(cashFlows),
    paybackPeriod: calculatePaybackPeriod(cashFlows),
    cashFlows
  };
};
