export interface MonthlyBillLike {
  month?: string;
  kwh?: number;
  sharpPeakKwh?: number;
  peakKwh?: number;
  flatKwh?: number;
  valleyKwh?: number;
  billingMode?: 'tou' | 'fixed';
  fixedUnitPrice?: number;
  reactiveKvarh?: number;
}

export interface MonthlyLoadEstimate {
  month: number;
  kwh: number;
  sharpPeakKwh: number;
  peakKwh: number;
  flatKwh: number;
  valleyKwh: number;
  source: 'actual' | 'estimated';
  seasonalFactor: number;
  billingMode: 'tou' | 'fixed';
  fixedUnitPrice?: number;
  reactiveKvarh: number;
  powerFactor?: number;
}

export interface MonthlyEstimationOptions {
  projectType?: string;
  province?: string;
  hasAirConditioning?: boolean;
}

const SOUTHERN_PROVINCES = new Set([
  'Shanghai', 'Zhejiang', 'Fujian', 'Jiangxi', 'Guangdong', 'Guangxi', 'Hainan',
  'Chongqing', 'Sichuan', 'Guizhou', 'Yunnan', 'Hunan',
]);

const DEFAULT_TOU_RATIOS: Record<string, [number, number, number, number]> = {
  factory: [0.04, 0.34, 0.42, 0.20],
  office: [0.06, 0.38, 0.47, 0.09],
  commercial: [0.07, 0.39, 0.43, 0.11],
  restaurant: [0.10, 0.42, 0.39, 0.09],
  school: [0.05, 0.34, 0.48, 0.13],
  villa: [0.08, 0.31, 0.36, 0.25],
};

const normalize = (values: number[]): number[] => {
  const average = values.reduce((total, value) => total + value, 0) / values.length;
  return values.map(value => value / Math.max(0.0001, average));
};

/**
 * 月度系数体现建筑运营规律，平均值始终为1。
 * 空调修正主要抬高6-9月；学校另计寒暑假，餐饮保持较稳定的全年营业基荷。
 */
export const getMonthlySeasonalFactors = (options: MonthlyEstimationOptions = {}): number[] => {
  const type = options.projectType || 'factory';
  const hasAirConditioning = options.hasAirConditioning ?? ['office', 'commercial', 'restaurant', 'school', 'villa'].includes(type);
  const southernCooling = SOUTHERN_PROVINCES.has(options.province || '') ? 1.06 : 1;
  let factors: number[];

  if (type === 'school') {
    factors = [0.70, 0.72, 0.96, 1.00, 1.06, 1.12, 0.70, 0.64, 1.10, 1.04, 0.96, 0.78];
  } else if (type === 'villa') {
    factors = [0.96, 0.89, 0.84, 0.82, 0.90, 1.08, 1.24, 1.28, 1.13, 0.91, 0.85, 0.92];
  } else if (type === 'office' || type === 'commercial') {
    factors = [0.88, 0.86, 0.91, 0.95, 1.00, 1.12, 1.24, 1.26, 1.16, 1.00, 0.93, 0.89];
  } else if (type === 'restaurant') {
    factors = [0.91, 0.88, 0.94, 0.97, 1.00, 1.09, 1.17, 1.19, 1.10, 1.00, 0.96, 0.93];
  } else {
    factors = [0.94, 0.91, 0.94, 0.97, 1.00, 1.07, 1.14, 1.16, 1.09, 1.00, 0.96, 0.92];
  }

  if (!hasAirConditioning) {
    factors = factors.map((value, index) => index >= 5 && index <= 8 ? 1 + (value - 1) * 0.25 : value);
  } else if (southernCooling > 1) {
    factors = factors.map((value, index) => index >= 4 && index <= 9 ? value * southernCooling : value);
  }
  return normalize(factors);
};

export const parseBillMonth = (value?: string): number | null => {
  const text = String(value || '').trim();
  if (!text) return null;
  const yearMonth = text.match(/(?:19|20)\d{2}[-/.年](\d{1,2})/);
  const plainMonth = text.match(/(?:^|\D)(1[0-2]|0?[1-9])(?:月|$|\D)/);
  const month = Number(yearMonth?.[1] || plainMonth?.[1]);
  return month >= 1 && month <= 12 ? month : null;
};

const billTotal = (bill: MonthlyBillLike): number => {
  const touTotal = Number(bill.sharpPeakKwh || 0) + Number(bill.peakKwh || 0)
    + Number(bill.flatKwh || 0) + Number(bill.valleyKwh || 0);
  return Math.max(0, touTotal > 0 ? touTotal : Number(bill.kwh || 0));
};

const resolveTouRatios = (bills: MonthlyBillLike[], projectType?: string): number[] => {
  const totals = bills.reduce((values, bill) => {
    values[0] += Math.max(0, Number(bill.sharpPeakKwh || 0));
    values[1] += Math.max(0, Number(bill.peakKwh || 0));
    values[2] += Math.max(0, Number(bill.flatKwh || 0));
    values[3] += Math.max(0, Number(bill.valleyKwh || 0));
    return values;
  }, [0, 0, 0, 0]);
  const total = totals.reduce((sum, value) => sum + value, 0);
  return total > 0 ? totals.map(value => value / total) : (DEFAULT_TOU_RATIOS[projectType || 'factory'] || DEFAULT_TOU_RATIOS.factory);
};

const isGuangdong = (province?: string): boolean => {
  const value = String(province || '').trim().toLowerCase();
  return value === 'guangdong' || value.includes('广东');
};

const hasCoolingLoad = (options: MonthlyEstimationOptions): boolean => (
  options.hasAirConditioning
  ?? ['office', 'commercial', 'restaurant', 'school', 'villa'].includes(options.projectType || 'factory')
);

/**
 * 夏季新增电量主要来自白天空调，不应继续沿用全年平均尖峰平谷比例。
 * 这里仅对超过全年基荷的季节增量使用空调时段分布，避免改变月度总电量。
 */
const coolingIncrementRatios = (
  projectType?: string,
  airConditioning = false,
): [number, number, number, number] => {
  if (!airConditioning) return [0.10, 0.42, 0.36, 0.12];
  if (projectType === 'villa') return [0.18, 0.38, 0.34, 0.10];
  if (projectType === 'restaurant') return [0.26, 0.38, 0.30, 0.06];
  if (projectType === 'school') return [0.27, 0.38, 0.30, 0.05];
  return [0.32, 0.40, 0.24, 0.04];
};

/**
 * 广东7—9月全月执行尖峰时段。尖峰是原高峰时段的子集，因此在保持
 * “尖峰+峰”合计不变的前提下重分配，避免重复抬高用电量。
 */
const guangdongSummerSharpShare = (
  projectType?: string,
  airConditioning = false,
): number => {
  if (!airConditioning) return 0.27;
  if (projectType === 'villa') return 0.32;
  if (projectType === 'restaurant' || projectType === 'school') return 0.28;
  if (projectType === 'office' || projectType === 'commercial') return 0.34;
  return 0.30;
};

const estimateTouBreakdown = (
  kwh: number,
  baseline: number,
  month: number,
  historicalRatios: number[],
  options: MonthlyEstimationOptions,
): number[] => {
  const airConditioning = hasCoolingLoad(options);
  const isCoolingSeason = month >= 6 && month <= 9;
  const baseKwh = isCoolingSeason ? Math.min(kwh, Math.max(0, baseline)) : kwh;
  const coolingKwh = Math.max(0, kwh - baseKwh);
  const incrementRatios = coolingIncrementRatios(options.projectType, airConditioning);
  const breakdown = historicalRatios.map((ratio, index) => (
    baseKwh * ratio + coolingKwh * incrementRatios[index]
  ));

  if (isGuangdong(options.province) && month >= 7 && month <= 9) {
    const highPeriodKwh = breakdown[0] + breakdown[1];
    const historicalSharpShare = highPeriodKwh > 0 ? breakdown[0] / highPeriodKwh : 0;
    const sharpShare = Math.max(
      historicalSharpShare,
      guangdongSummerSharpShare(options.projectType, airConditioning),
    );
    breakdown[0] = highPeriodKwh * sharpShare;
    breakdown[1] = highPeriodKwh - breakdown[0];
  }

  return breakdown;
};

export const estimateMonthlyLoad = (
  bills: MonthlyBillLike[],
  options: MonthlyEstimationOptions = {},
): MonthlyLoadEstimate[] => {
  const factors = getMonthlySeasonalFactors(options);
  const actualByMonth = new Map<number, MonthlyBillLike>();
  bills.forEach(bill => {
    const month = parseBillMonth(bill.month);
    if (month && billTotal(bill) > 0) actualByMonth.set(month, bill);
  });
  const ratios = resolveTouRatios([...actualByMonth.values()], options.projectType);
  const inferredBillingMode: 'tou' | 'fixed' = [...actualByMonth.values()].some(bill => (
    bill.billingMode === 'tou'
    || Number(bill.sharpPeakKwh || 0) + Number(bill.peakKwh || 0) + Number(bill.flatKwh || 0) + Number(bill.valleyKwh || 0) > 0
  )) ? 'tou' : 'fixed';
  const fixedPrices = [...actualByMonth.values()]
    .filter(bill => bill.billingMode === 'fixed' && Number(bill.fixedUnitPrice || 0) > 0)
    .map(bill => Number(bill.fixedUnitPrice));
  const averageFixedPrice = fixedPrices.length > 0 ? fixedPrices.reduce((sum, value) => sum + value, 0) / fixedPrices.length : undefined;
  const reactiveRatios = [...actualByMonth.values()]
    .filter(bill => billTotal(bill) > 0 && Number(bill.reactiveKvarh || 0) > 0)
    .map(bill => Number(bill.reactiveKvarh) / billTotal(bill));
  const averageReactiveRatio = reactiveRatios.length > 0
    ? reactiveRatios.reduce((sum, value) => sum + value, 0) / reactiveRatios.length
    : 0;
  const baselines = [...actualByMonth.entries()].map(([month, bill]) => billTotal(bill) / factors[month - 1]);
  const baseline = baselines.length > 0
    ? baselines.reduce((total, value) => total + value, 0) / baselines.length
    : 0;

  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const actual = actualByMonth.get(month);
    const kwh = actual ? billTotal(actual) : baseline * factors[index];
    const actualHasTou = Boolean(actual && (actual.billingMode === 'tou' || [actual.sharpPeakKwh, actual.peakKwh, actual.flatKwh, actual.valleyKwh]
      .some(value => Number(value || 0) > 0)));
    const billingMode: 'tou' | 'fixed' = actual ? (actualHasTou ? 'tou' : 'fixed') : inferredBillingMode;
    const reactiveKvarh = actual
      ? Math.max(0, Number(actual.reactiveKvarh || 0))
      : kwh * averageReactiveRatio;
    const powerFactor = reactiveKvarh > 0 ? kwh / Math.sqrt(kwh ** 2 + reactiveKvarh ** 2) : undefined;
    const breakdown = billingMode === 'fixed' ? [0, 0, 0, 0] : actual && [actual.sharpPeakKwh, actual.peakKwh, actual.flatKwh, actual.valleyKwh]
      .some(value => Number(value || 0) > 0)
      ? [actual.sharpPeakKwh, actual.peakKwh, actual.flatKwh, actual.valleyKwh].map(value => Math.max(0, Number(value || 0)))
      : estimateTouBreakdown(kwh, baseline, month, ratios, options);
    return {
      month,
      kwh,
      sharpPeakKwh: breakdown[0],
      peakKwh: breakdown[1],
      flatKwh: breakdown[2],
      valleyKwh: breakdown[3],
      source: actual ? 'actual' : 'estimated',
      seasonalFactor: factors[index],
      billingMode,
      fixedUnitPrice: billingMode === 'fixed' ? Number(actual?.fixedUnitPrice || averageFixedPrice || 0) || undefined : undefined,
      reactiveKvarh,
      powerFactor,
    };
  });
};

export const estimateAnnualLoad = (bills: MonthlyBillLike[], options: MonthlyEstimationOptions = {}) => {
  const months = estimateMonthlyLoad(bills, options);
  const actualMonthCount = months.filter(month => month.source === 'actual').length;
  return {
    months,
    actualMonthCount,
    estimatedMonthCount: actualMonthCount > 0 ? 12 - actualMonthCount : 0,
    annualizedKwh: actualMonthCount > 0 ? months.reduce((total, month) => total + month.kwh, 0) : 0,
  };
};
