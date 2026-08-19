import { buildCombinedReport } from '../shared/reporting/scenario';
import { COMMERCIAL_LOAD_PROFILE, RESTAURANT_LOAD_PROFILE } from '../shared/utils/projectLoadProfiles';
import { buildPvConsumptionProfile } from '../shared/utils/pvConsumption';
import { estimateAnnualLoad } from '../shared/utils/monthlyLoadEstimation';
import { buildLocationSolarProfile } from '../shared/utils/solarGenerationProfile';

const assertClose = (actual: number, expected: number, label: string, tolerance = 0.01) => {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
};

const moduleBase = (id: string, name: string, investment: number, yearlySaving: number, params: any) => ({
  id, name, investment, yearlySaving, params, isActive: true, strategy: 'test',
  kpiPrimary: { label: '规模', value: '100' }, kpiSecondary: { label: '收益', value: '10' }
});

const modules: any = {
  'retrofit-solar': moduleBase('retrofit-solar', '分布式光伏', 100, 20, {
    mode: 'advanced', simpleParams: { capacity: 400, investmentMode: 'emc' },
    advParams: { dailySunHours: 4, prValue: 80, azimuthEfficiency: 95, feedInTariff: 0.35, degradationLinear: 0.4, emcOwnerShareRate: 12 }
  }),
  'retrofit-storage': moduleBase('retrofit-storage', '工商业储能', 60, 12, {
    mode: 'advanced', dispatchMode: 'pv_surplus', basicParams: { power: 261, capacity: 522 }, advParams: { dod: 90, rte: 88, degradation: 1.5 },
    investmentConfig: { mode: 'self', emcOwnerShareRate: 15 }, economics: { demandPrice: 40 }
  }),
  'retrofit-ev': moduleBase('retrofit-ev', '充电桩设施', 40, 15, {
    mode: 'precise', businessConfig: { mode: 'third_party', ownerShareRate: 20 },
    preciseState: { equipment: [{ type: 'dc60', count: 4, utilization: 5, serviceFee: 0.6 }] }
  }),
  'retrofit-hvac': moduleBase('retrofit-hvac', '暖通空调', 30, 8, { mode: 'advanced' })
};

const input: any = {
  selectedModuleIds: ['retrofit-solar', 'retrofit-storage', 'retrofit-ev'], modules,
  projectBaseInfo: { name: '测试项目', type: 'factory', province: 'Guangdong', city: 'Guangzhou', buildings: [], discountRate: 5, omRate: 0 },
  priceConfig: { mode: 'tou', fixedPrice: 0.85, spotPrices: [], touSegments: [
    { start: 0, end: 8, price: 0.32, type: 'valley' }, { start: 8, end: 11, price: 0.68, type: 'flat' },
    { start: 11, end: 17, price: 1.2, type: 'peak' }, { start: 17, end: 22, price: 0.8, type: 'flat' },
    { start: 22, end: 24, price: 0.32, type: 'valley' }
  ] },
  bills: Array.from({ length: 12 }, (_, index) => ({ id: index + 1, month: `${index + 1}月`, kwh: 100000, cost: 80000 })),
  transformers: [{ id: 1, name: '1号变压器', capacity: 1000, voltageLevel: '10kV' }], horizonYears: 25
};

const report = buildCombinedReport(input);
if (RESTAURANT_LOAD_PROFILE[12] < 0.95 || RESTAURANT_LOAD_PROFILE[19] < 0.95 || RESTAURANT_LOAD_PROFILE[3] > 0.25) {
  throw new Error('饭店酒楼典型曲线应具备午餐、晚餐双峰与夜间基础负荷');
}
if (COMMERCIAL_LOAD_PROFILE[8] < COMMERCIAL_LOAD_PROFILE[2] * 8 || COMMERCIAL_LOAD_PROFILE[23] >= COMMERCIAL_LOAD_PROFILE[12] * 0.1) {
  throw new Error('商业办公典型曲线应体现营业时段高负荷与夜间低基荷');
}
const consumptionProfile = buildPvConsumptionProfile({
  annualLoadKwh: 1200000, projectType: 'restaurant', pvCapacityKw: 450, dailySunHours: 4, performanceRatio: 0.8,
  storage: { enabled: true, powerKw: 261, capacityKwh: 522, dod: 0.9, rte: 0.88 }
});
const shanghaiSolarProfile = buildLocationSolarProfile({ latitude: 31.23, longitude: 121.47 });
const urumqiSolarProfile = buildLocationSolarProfile({ latitude: 43.83, longitude: 87.62 });
const peakHour = (profile: number[]) => profile.indexOf(Math.max(...profile));
if (peakHour(urumqiSolarProfile) <= peakHour(shanghaiSolarProfile)) {
  throw new Error('项目地经度未正确修正光伏出力峰值时刻');
}
if (shanghaiSolarProfile.every((value, hour) => Math.abs(value - urumqiSolarProfile[hour]) < 0.001)) {
  throw new Error('不同项目地不应生成相同光伏曲线');
}
assertClose(consumptionProfile.reduce((total, row) => total + row.load, 0) * 365, 1200000, '光伏消纳曲线负荷总量应与账单一致', 20);
for (const row of consumptionProfile) {
  if (row.directConsumption + row.storageCharge + row.remainingSurplus > row.pv + 0.01) throw new Error(`第${row.hour}光伏消纳分配超过发电量`);
}
if (report.counterfactuals.s.annualStorageChargeKwh !== 0 || report.counterfactuals.s.annualStorageDischargeKwh !== 0) {
  throw new Error('光伏余电专用储能不得在无光伏场景中充放电');
}
const legacySolarInput = JSON.parse(JSON.stringify(input));
legacySolarInput.modules['retrofit-solar'].params = {};
const legacySolarReport = buildCombinedReport(legacySolarInput);
if ((legacySolarReport.activePhysicalScenario?.annualPvGenerationKwh || 0) <= 0) {
  throw new Error('旧项目应能从光伏KPI汇总值恢复装机容量');
}
const partialBillInput = { ...input, bills: input.bills.slice(0, 6) };
const partialBillReport = buildCombinedReport(partialBillInput);
const reconstructedAnnualLoad = (partialBillReport.activePhysicalScenario?.typicalDay || [])
  .reduce((total: number, row: any) => total + row.baseLoad, 0) * 365;
const partialExpected = estimateAnnualLoad(partialBillInput.bills, partialBillInput.projectBaseInfo).annualizedKwh;
assertClose(reconstructedAnnualLoad, partialExpected, '不足12个月账单应按建筑季节系数补齐后重构日负荷', 20);
const oneMonthTou = estimateAnnualLoad([{
  month: '2026-07', kwh: 999999, sharpPeakKwh: 10000, peakKwh: 40000, flatKwh: 35000, valleyKwh: 15000,
}], { projectType: 'restaurant', province: 'Guangdong', hasAirConditioning: true });
const july = oneMonthTou.months[6];
const december = oneMonthTou.months[11];
assertClose(july.kwh, 100000, '分时电量之和应优先作为真实月总电量');
if (july.source !== 'actual' || december.source !== 'estimated') throw new Error('真实月份与估算月份标记错误');
if (december.kwh >= july.kwh) throw new Error('饭店酒楼夏季空调月用电应高于冬季普通月份');
for (const month of oneMonthTou.months) {
  assertClose(month.sharpPeakKwh + month.peakKwh + month.flatKwh + month.valleyKwh, month.kwh, `${month.month}月尖峰平谷汇总`);
}
const guangdongSummerForecast = estimateAnnualLoad([
  { month: '2026-04', sharpPeakKwh: 0, peakKwh: 54420, flatKwh: 29595, valleyKwh: 2670 },
  { month: '2026-05', sharpPeakKwh: 2640, peakKwh: 44640, flatKwh: 19965, valleyKwh: 2370 },
  { month: '2026-06', sharpPeakKwh: 6000, peakKwh: 35550, flatKwh: 19050, valleyKwh: 3585 },
], { projectType: 'factory', province: 'Guangdong', hasAirConditioning: true });
const forecastJuly = guangdongSummerForecast.months[6];
if (forecastJuly.sharpPeakKwh / forecastJuly.kwh < 0.15) {
  throw new Error('广东7—9月预测应按全月尖峰时段及夏季空调负荷提高尖峰占比');
}
if (forecastJuly.sharpPeakKwh <= guangdongSummerForecast.months[5].sharpPeakKwh) {
  throw new Error('广东7月预测尖峰电量不应低于相邻高温真实月份');
}
for (const month of guangdongSummerForecast.months) {
  if (month.source === 'estimated' && month.billingMode === 'tou') {
    assertClose(month.sharpPeakKwh + month.peakKwh + month.flatKwh + month.valleyKwh, month.kwh, `${month.month}月预测电量守恒`);
  }
}
const oneMonthFixed = estimateAnnualLoad([{
  month: '2026-07', kwh: 100000, reactiveKvarh: 30000, billingMode: 'fixed', fixedUnitPrice: 0.72,
}], { projectType: 'office', province: 'Guangdong', hasAirConditioning: true });
if (oneMonthFixed.months.some(month => month.billingMode !== 'fixed')) throw new Error('固定电价账单补齐月份不得切换为分时电价');
if (oneMonthFixed.months.some(month => month.sharpPeakKwh + month.peakKwh + month.flatKwh + month.valleyKwh !== 0)) {
  throw new Error('固定电价账单不得虚构尖峰平谷电量');
}
assertClose(oneMonthFixed.months[6].kwh, 100000, '固定电价真实月总电量');
assertClose(oneMonthFixed.months[0].fixedUnitPrice || 0, 0.72, '固定电价应沿用至估算月份');
assertClose(oneMonthFixed.months[6].reactiveKvarh, 30000, '正向无功总应独立保存');
assertClose(oneMonthFixed.months[6].powerFactor || 0, 100000 / Math.sqrt(100000 ** 2 + 30000 ** 2), '功率因数计算', 0.0001);
assertClose(oneMonthFixed.months[0].reactiveKvarh / oneMonthFixed.months[0].kwh, 0.3, '缺失月份沿用无功有功比', 0.0001);
assertClose(report.standaloneAnnualBenefit + report.interactionAnnualBenefit, report.combinedAnnualBenefit, '协同收益恒等式');
assertClose(report.participantLedgers.reduce((sum, item) => sum + item.investment, 0), report.systemMetrics.investment, '参与方投资合计');
assertClose(report.participantLedgers.reduce((sum, item) => sum + item.firstYearNetBenefit, 0), report.combinedAnnualBenefit, '参与方首年收益合计');

const solarOnlyReport = buildCombinedReport({ ...input, selectedModuleIds: ['retrofit-solar'] });
const storageOnlyReport = buildCombinedReport({ ...input, selectedModuleIds: ['retrofit-storage'] });
const solarStorageReport = buildCombinedReport({ ...input, selectedModuleIds: ['retrofit-solar', 'retrofit-storage'] });
if (solarOnlyReport.modules.length !== 1 || solarOnlyReport.modules[0].moduleId !== 'retrofit-solar') {
  throw new Error('仅光伏完整项目书应只包含光伏原生章节数据');
}
if (storageOnlyReport.modules.length !== 1 || storageOnlyReport.modules[0].moduleId !== 'retrofit-storage') {
  throw new Error('仅储能完整项目书应只包含储能原生章节数据');
}
if (solarStorageReport.modules.map(item => item.moduleId).join(',') !== 'retrofit-solar,retrofit-storage') {
  throw new Error('光储完整项目书应按光伏、储能顺序提供两个原生章节数据');
}
if (storageOnlyReport.activePhysicalScenario?.annualStorageChargeKwh !== 0 || storageOnlyReport.activePhysicalScenario?.annualStorageDischargeKwh !== 0) {
  throw new Error('光伏余电专用储能在单独汇报时不得虚构独立充放电收益');
}
assertClose(
  solarOnlyReport.modules[0].metrics.firstYearNetBenefit,
  solarStorageReport.modules.find(item => item.moduleId === 'retrofit-solar')?.metrics.firstYearNetBenefit || 0,
  '光伏独立报告与联合项目书光伏章节收益应一致',
);
assertClose(
  storageOnlyReport.modules[0].metrics.firstYearNetBenefit,
  solarStorageReport.modules.find(item => item.moduleId === 'retrofit-storage')?.metrics.firstYearNetBenefit || 0,
  '储能独立报告与联合项目书储能章节收益应一致',
);
assertClose(
  solarStorageReport.standaloneAnnualBenefit + solarStorageReport.interactionAnnualBenefit,
  solarStorageReport.combinedAnnualBenefit,
  '光储联合收益应等于独立收益加协同增量',
);
assertClose(
  solarStorageReport.participantLedgers.reduce((sum, item) => sum + item.firstYearNetBenefit, 0),
  solarStorageReport.combinedAnnualBenefit,
  '光储参与方首年现金流应与系统现金流一致',
);

for (const row of report.activePhysicalScenario?.typicalDay || []) {
  const supply = row.gridImport + row.pvGeneration + row.storageDischarge;
  const demand = row.baseLoad + row.evLoad + row.storageCharge + row.gridExport;
  assertClose(supply, demand, `第${row.hour}小时能量守恒`, 0.02);
}

const changedContracts = JSON.parse(JSON.stringify(input));
changedContracts.modules['retrofit-solar'].params.simpleParams.investmentMode = 'epc';
changedContracts.modules['retrofit-storage'].params.investmentConfig.mode = 'emc';
changedContracts.modules['retrofit-ev'].params.businessConfig.mode = 'self_operated';
const changedReport = buildCombinedReport(changedContracts);
assertClose(changedReport.activePhysicalScenario.annualGridImportKwh, report.activePhysicalScenario?.annualGridImportKwh || 0, '商业模式不得改变购电量');
assertClose(changedReport.activePhysicalScenario.peakGridKw, report.activePhysicalScenario?.peakGridKw || 0, '商业模式不得改变物理峰值');

const unsupported = buildCombinedReport({ ...input, selectedModuleIds: ['retrofit-hvac', 'retrofit-ev'] });
if (!unsupported.warnings.some((warning: string) => warning.includes('未配置物理联动'))) {
  throw new Error('无联动模型组合缺少明确提示');
}

console.log(JSON.stringify({
  status: 'ok',
  combinedAnnualBenefit: report.combinedAnnualBenefit,
  interactionAnnualBenefit: report.interactionAnnualBenefit,
  participantCount: report.participantLedgers.length,
  energyBalanceRows: report.activePhysicalScenario?.typicalDay.length || 0
}, null, 2));
