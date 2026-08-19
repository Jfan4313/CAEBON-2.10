import fs from 'node:fs';
import path from 'node:path';
import { buildFinancialMetrics } from '../shared/reporting/financial';
import { optimizeSolarStorageCapacity } from '../shared/utils/solarStorageOptimization';
import { calculateStorageRecommendation } from '../modules/storage/recommendation';

const outputPath = path.resolve('copyright-materials/05-testing/广东工业园标准算例.json');

const hourlyPrices = [
  0.28, 0.28, 0.28, 0.28, 0.28, 0.28, 0.28, 0.62,
  0.62, 0.62, 0.62, 0.62, 1.12, 1.12, 1.12, 1.12,
  1.12, 0.78, 0.78, 0.78, 1.12, 1.12, 0.62, 0.28,
];

const solar = {
  capacityKw: 1000,
  dailySunHours: 3.6,
  generationDays: 365,
  performanceRatio: 0.8,
  azimuthEfficiency: 0.98,
  firstYearDegradation: 0.01,
  annualLinearDegradation: 0.0045,
  selfConsumptionRate: 0.85,
  selfUseTariffYuanPerKwh: 0.82,
  feedInTariffYuanPerKwh: 0.453,
  epcUnitCostYuanPerWp: 3.2,
};

const solarFirstYearGenerationKwh = solar.capacityKw * solar.dailySunHours * solar.generationDays
  * solar.performanceRatio * solar.azimuthEfficiency * (1 - solar.firstYearDegradation);
const solarFirstYearGrossBenefitWan = (
  solarFirstYearGenerationKwh * solar.selfConsumptionRate * solar.selfUseTariffYuanPerKwh
  + solarFirstYearGenerationKwh * (1 - solar.selfConsumptionRate) * solar.feedInTariffYuanPerKwh
) / 10000;

const optimizationInput = {
  annualLoadKwh: 3_600_000,
  projectType: 'factory',
  maxPvCapacityKw: 1200,
  dailySunHours: solar.dailySunHours,
  performanceRatio: solar.performanceRatio,
  location: { latitude: 23.13, longitude: 113.26 },
  hourlyPrices,
  pvUnitCostYuanPerWp: solar.epcUnitCostYuanPerWp,
  storageUnitCostYuanPerKwh: 900,
  storageDod: 0.9,
  storageRte: 0.88,
  pvOmYuanPerWYear: 0.04,
  storageOmRatePercent: 1.5,
  discountRatePercent: 6,
  horizonYears: 20,
  generationDays: 365,
  storageOperatingDays: 330,
};

const recommendationInput = {
  surplusCurveKw: [0, 0, 0, 0, 0, 0, 0, 15, 45, 90, 130, 170, 180, 165, 135, 95, 50, 15, 0, 0, 0, 0, 0, 0],
  deficitCurveKw: [110, 105, 100, 95, 95, 110, 145, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 95, 150, 175, 165, 140, 120],
  dod: 0.9,
  rte: 0.88,
  currentPowerKw: 250,
  currentCapacityKwh: 500,
  cycleMode: '1c1d' as const,
};

const solarFinancial = buildFinancialMetrics({
  investment: solar.capacityKw * solar.epcUnitCostYuanPerWp / 10,
  firstYearBenefit: solarFirstYearGrossBenefitWan,
  horizonYears: 25,
  discountRate: 6,
  annualDegradation: solar.annualLinearDegradation * 100,
  annualOpex: solar.capacityKw * 0.04 / 10,
});
const storageRecommendation = calculateStorageRecommendation(recommendationInput);
const optimization = optimizeSolarStorageCapacity(optimizationInput);
const storageFinancial = buildFinancialMetrics({
  investment: 450,
  firstYearBenefit: 82,
  horizonYears: 15,
  discountRate: 6,
  annualDegradation: 1.5,
  annualOpex: 6.75,
  replacementYears: [10],
  replacementCostRate: 25,
  residualRate: 5,
});

const result = {
  schemaVersion: '1.0',
  software: {
    fullName: '园区综合能源项目投资收益测算与辅助决策系统',
    version: 'V2.14',
  },
  case: {
    id: 'GD-INDUSTRIAL-PARK-001',
    name: '广东工业园标准项目（匿名）',
    province: '广东省',
    city: '广州市',
    projectType: 'factory',
    annualLoadKwh: optimizationInput.annualLoadKwh,
    transformerCapacityKva: 4000,
    discountRatePercent: optimizationInput.discountRatePercent,
    currencyUnit: '万元',
    energyUnit: 'kWh',
  },
  tariffs: { hourlyPricesYuanPerKwh: hourlyPrices },
  solar: {
    input: solar,
    expected: {
      firstYearGenerationKwh: Number(solarFirstYearGenerationKwh.toFixed(3)),
      firstYearGrossBenefitWan: Number(solarFirstYearGrossBenefitWan.toFixed(3)),
      investmentWan: solarFinancial.investment,
      firstYearNetBenefitWan: solarFinancial.firstYearNetBenefit,
      npvWan: solarFinancial.npv,
      irrPercent: solarFinancial.irr,
      paybackYears: solarFinancial.paybackPeriod,
      cashFlowsWan: solarFinancial.cashFlows,
    },
  },
  storage: {
    engineeringInput: recommendationInput,
    engineeringExpected: storageRecommendation,
    financialInput: {
      investmentWan: 450,
      firstYearGrossBenefitWan: 82,
      annualOpexWan: 6.75,
      annualDegradationPercent: 1.5,
      replacementYear: 10,
      replacementCostRatePercent: 25,
      residualRatePercent: 5,
      horizonYears: 15,
    },
    financialExpected: {
      investmentWan: storageFinancial.investment,
      firstYearNetBenefitWan: storageFinancial.firstYearNetBenefit,
      npvWan: storageFinancial.npv,
      irrPercent: storageFinancial.irr,
      paybackYears: storageFinancial.paybackPeriod,
      cashFlowsWan: storageFinancial.cashFlows,
    },
  },
  solarStorageOptimization: {
    input: optimizationInput,
    expected: optimization,
  },
  tolerance: {
    energyKwh: 0.01,
    financialWan: 0.001,
    percentagePoint: 0.001,
  },
  notes: [
    '本算例为匿名标准项目，不包含真实客户名称、地址、账号或账单。',
    '光伏独立算例与光储联合优化算例用途不同，参数不要求完全相同。',
    '财务结果由V2.14代码生成，并由独立公式工作簿复核。',
  ],
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, solarFinancial, storageRecommendation, storageFinancial, optimization }, null, 2));
