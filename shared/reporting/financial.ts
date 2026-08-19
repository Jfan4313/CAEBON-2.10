import { calculateIRR, calculatePaybackPeriod } from '../../utils/financial';
import type { FinancialMetrics } from './types';

export const round3 = (value: number): number => Number((Number.isFinite(value) ? value : 0).toFixed(3));

export const calculateNpv = (cashFlows: number[], discountRatePercent: number): number => {
  const rate = Math.max(-99, discountRatePercent) / 100;
  return round3(cashFlows.reduce((sum, flow, year) => sum + flow / Math.pow(1 + rate, year), 0));
};

export interface CashFlowOptions {
  investment: number;
  firstYearBenefit: number;
  horizonYears: number;
  discountRate: number;
  annualDegradation?: number;
  annualOpex?: number;
  replacementYears?: number[];
  replacementCostRate?: number;
  residualRate?: number;
}

export const buildFinancialMetrics = (options: CashFlowOptions): FinancialMetrics => {
  const {
    investment,
    firstYearBenefit,
    horizonYears,
    discountRate,
    annualDegradation = 0,
    annualOpex = 0,
    replacementYears = [],
    replacementCostRate = 0,
    residualRate = 0
  } = options;
  const cashFlows = [-Math.max(0, investment)];
  for (let year = 1; year <= horizonYears; year++) {
    const benefit = firstYearBenefit * Math.pow(1 - Math.max(0, annualDegradation) / 100, year - 1);
    const replacement = replacementYears.includes(year) ? investment * replacementCostRate / 100 : 0;
    const residual = year === horizonYears ? investment * residualRate / 100 : 0;
    cashFlows.push(round3(benefit - annualOpex - replacement + residual));
  }
  return {
    investment: round3(investment),
    firstYearNetBenefit: round3(firstYearBenefit - annualOpex),
    npv: calculateNpv(cashFlows, discountRate),
    irr: round3(calculateIRR(cashFlows)),
    paybackPeriod: round3(calculatePaybackPeriod(cashFlows)),
    discountRate: round3(discountRate / 100),
    cashFlows
  };
};
