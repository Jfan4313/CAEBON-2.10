import { getProjectLoadProfile } from './projectLoadProfiles';
import { estimateAnnualLoad, MonthlyEstimationOptions } from './monthlyLoadEstimation';
import { buildLocationSolarProfile, type SolarProfileLocation } from './solarGenerationProfile';

export const PV_TYPICAL_PROFILE = buildLocationSolarProfile();

export interface PvConsumptionPoint {
  hour: string;
  load: number;
  pv: number;
  directConsumption: number;
  storageCharge: number;
  remainingSurplus: number;
}

export interface PvConsumptionInput {
  annualLoadKwh: number;
  projectType?: string;
  pvCapacityKw: number;
  dailySunHours: number;
  performanceRatio: number;
  location?: SolarProfileLocation;
  storage?: {
    enabled: boolean;
    powerKw: number;
    capacityKwh: number;
    dod: number;
    rte: number;
  };
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export const annualizeBillEnergy = (
  bills: Array<{ month?: string; kwh?: number; sharpPeakKwh?: number; peakKwh?: number; flatKwh?: number; valleyKwh?: number; billingMode?: 'tou' | 'fixed'; fixedUnitPrice?: number; reactiveKvarh?: number }>,
  options: MonthlyEstimationOptions = {},
): { monthCount: number; estimatedMonthCount: number; annualizedKwh: number } => {
  const result = estimateAnnualLoad(bills, options);
  return {
    monthCount: result.actualMonthCount,
    estimatedMonthCount: result.estimatedMonthCount,
    annualizedKwh: result.annualizedKwh,
  };
};

export const buildPvConsumptionProfile = (input: PvConsumptionInput): PvConsumptionPoint[] => {
  const loadProfile = getProjectLoadProfile(input.projectType);
  const dailyLoadKwh = Math.max(0, input.annualLoadKwh) / 365;
  const loadFactor = dailyLoadKwh / Math.max(0.0001, sum(loadProfile));
  const load = loadProfile.map(value => value * loadFactor);
  const dailyPvKwh = Math.max(0, input.pvCapacityKw) * Math.max(0, input.dailySunHours) * Math.max(0, input.performanceRatio);
  const pvProfile = buildLocationSolarProfile(input.location);
  const pvFactor = dailyPvKwh / Math.max(0.0001, sum(pvProfile));
  const pv = pvProfile.map(value => value * pvFactor);
  const storage = input.storage;
  const chargeEfficiency = Math.sqrt(Math.max(0.1, storage?.rte || 0.88));
  const usableCapacity = storage?.enabled ? Math.max(0, storage.capacityKwh * storage.dod) : 0;
  let storedEnergy = 0;

  return load.map((loadKw, hour) => {
    const pvKw = pv[hour];
    const directConsumption = Math.min(loadKw, pvKw);
    const surplus = Math.max(0, pvKw - loadKw);
    const storageCharge = storage?.enabled
      ? Math.min(Math.max(0, storage.powerKw), surplus, Math.max(0, usableCapacity - storedEnergy) / chargeEfficiency)
      : 0;
    storedEnergy += storageCharge * chargeEfficiency;
    return {
      hour: `${hour}:00`,
      load: loadKw,
      pv: pvKw,
      directConsumption,
      storageCharge,
      remainingSurplus: Math.max(0, surplus - storageCharge),
    };
  });
};
