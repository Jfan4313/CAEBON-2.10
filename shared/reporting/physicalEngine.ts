import type { BuildReportInput, PhysicalScenarioResult, TypicalDayPoint } from './types';
import { round3 } from './financial';
import { getProjectLoadProfile } from '../utils/projectLoadProfiles';
import { buildLocationSolarProfile } from '../utils/solarGenerationProfile';
import { estimateAnnualLoad } from '../utils/monthlyLoadEstimation';

type PhysicalModule = 'solar' | 'storage' | 'ev';
type Enabled = Record<PhysicalModule, boolean>;

const EV_BASE_PROFILE = [0.03, 0.02, 0.02, 0.02, 0.03, 0.05, 0.08, 0.12, 0.18, 0.21, 0.18, 0.14, 0.1, 0.09, 0.1, 0.13, 0.19, 0.25, 0.3, 0.27, 0.2, 0.12, 0.07, 0.04];

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const pricesForDay = (input: BuildReportInput): number[] => {
  const config = input.priceConfig;
  if (config.mode === 'fixed') return Array(24).fill(Number(config.fixedPrice || 0));
  if (config.mode === 'spot') return Array.from({ length: 24 }, (_, hour) => Number(config.spotPrices?.[hour] || 0));
  return Array.from({ length: 24 }, (_, hour) => {
    const segment = config.touSegments.find(item => hour >= item.start && hour < item.end);
    return Number(segment?.price || config.fixedPrice || 0.85);
  });
};

const getSolar = (input: BuildReportInput) => {
  const solarModule = input.modules['retrofit-solar'];
  const params = solarModule?.params || {};
  const simple = params.simpleParams || {};
  const advanced = params.advParams || {};
  const capacityFromKpi = Number(String(solarModule?.kpiPrimary?.value || '').match(/\d+(?:\.\d+)?/)?.[0] || 0);
  return {
    capacity: Number(simple.capacity || capacityFromKpi),
    sunHours: Number(advanced.dailySunHours || 4),
    performance: Number(advanced.prValue || 80) / 100 * Number(advanced.azimuthEfficiency || 100) / 100,
    feedInTariff: simple.operationMode === 'off_grid' ? 0 : Number(advanced.feedInTariff || 0.35),
    isOffGrid: simple.operationMode === 'off_grid'
  };
};

const getStorage = (input: BuildReportInput) => {
  const params = input.modules['retrofit-storage']?.params || {};
  const basic = params.basicParams || params;
  const advanced = params.advParams || params;
  return {
    power: Math.max(0, Number(basic.power ?? 261)),
    capacity: Math.max(0, Number(basic.capacity ?? 522)),
    dod: clamp(Number(advanced.dod || 90) / 100, 0.1, 1),
    rte: clamp(Number(advanced.rte || 88) / 100, 0.1, 1),
    demandPrice: Math.max(0, Number(params.economics?.demandPrice || params.demandPrice || 40)),
    dispatchMode: params.dispatchMode === 'hybrid' ? 'hybrid' : 'pv_surplus'
  };
};

const getEv = (input: BuildReportInput) => {
  const params = input.modules['retrofit-ev']?.params || {};
  const quick = params.quickState || {};
  const precise = params.preciseState || {};
  let annualKwh = 0;
  let serviceRevenue = 0;
  if (params.mode === 'precise' && Array.isArray(precise.equipment)) {
    precise.equipment.forEach((item: any) => {
      const powers: Record<string, number> = { ac7: 7, dc60: 60, dc120: 120, v2g: 15 };
      const energy = Number(powers[item.type] || 7) * Number(item.count || 0) * Number(item.utilization || 0) * 365;
      annualKwh += energy;
      serviceRevenue += energy * Number(item.serviceFee || 0);
    });
  } else {
    const power = Number(quick.acCount || 0) * 7 + Number(quick.dcCount || 0) * 60;
    annualKwh = power * Number(quick.turnover || 0) * 0.6 * 365;
    serviceRevenue = annualKwh * Number(quick.serviceFee || 0);
  }
  return { annualKwh, annualServiceRevenue: serviceRevenue };
};

const buildEvProfile = (annualKwh: number, prices: number[], smart: boolean, solarEnabled: boolean, solarProfile: number[]): number[] => {
  const dailyKwh = annualKwh / 365;
  const minPrice = Math.min(...prices);
  const weights = EV_BASE_PROFILE.map((base, hour) => {
    if (!smart) return base;
    const solarWeight = solarEnabled ? solarProfile[hour] * 1.8 : 0;
    const valleyWeight = prices[hour] <= minPrice * 1.05 ? 0.7 : 0;
    return base + solarWeight + valleyWeight;
  });
  const factor = dailyKwh / Math.max(0.0001, sum(weights));
  return weights.map(weight => weight * factor);
};

export const simulatePhysicalScenario = (input: BuildReportInput, enabled: Enabled): PhysicalScenarioResult => {
  const annualizedBillKwh = estimateAnnualLoad(input.bills, {
    projectType: input.projectBaseInfo.type,
    province: input.projectBaseInfo.province,
    hasAirConditioning: input.projectBaseInfo.hasAirConditioning,
  }).annualizedKwh;
  const villaAnnualLoadKwh = input.projectBaseInfo.type === 'villa'
    ? Math.max(0, Number(input.projectBaseInfo.villaDailyKwh || 0)) * 365
    : 0;
  const annualBaseKwh = villaAnnualLoadKwh
    || annualizedBillKwh
    || input.transformers.reduce((total, transformer) => total + Number(transformer.capacity || 0), 0) * 0.45 * 2000
    || 1000000;
  const baseDailyKwh = annualBaseKwh / 365;
  const baseProfile = getProjectLoadProfile(input.projectBaseInfo.type);
  const baseFactor = baseDailyKwh / sum(baseProfile);
  const baseLoad = baseProfile.map(value => value * baseFactor);
  const prices = pricesForDay(input);
  const solar = getSolar(input);
  const storage = getStorage(input);
  const ev = getEv(input);
  const pvDailyKwh = enabled.solar ? solar.capacity * solar.sunHours * solar.performance : 0;
  const locationSolarProfile = buildLocationSolarProfile({
    latitude: input.projectBaseInfo.latitude,
    longitude: input.projectBaseInfo.longitude,
    province: input.projectBaseInfo.province,
    city: input.projectBaseInfo.city,
  });
  const pvFactor = pvDailyKwh / Math.max(0.0001, sum(locationSolarProfile));
  const pvProfile = locationSolarProfile.map(value => value * pvFactor);
  const evProfile = enabled.ev ? buildEvProfile(ev.annualKwh, prices, enabled.storage || enabled.solar, enabled.solar, locationSolarProfile) : Array(24).fill(0);
  const lowPrice = [...prices].sort((a, b) => a - b)[Math.floor(prices.length * 0.3)];
  const highPrice = [...prices].sort((a, b) => a - b)[Math.floor(prices.length * 0.7)];
  const usableCapacity = enabled.storage ? storage.capacity * storage.dod : 0;
  const chargeEfficiency = Math.sqrt(storage.rte);
  const dischargeEfficiency = Math.sqrt(storage.rte);
  let soc = storage.dispatchMode === 'pv_surplus' ? 0 : usableCapacity * 0.15;
  const transformerLimit = input.transformers.reduce((total, transformer) => total + Number(transformer.capacity || 0), 0) || Infinity;
  const demandTarget = Math.min(transformerLimit, Math.max(...baseLoad) * 0.92);
  const rows: TypicalDayPoint[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const load = baseLoad[hour] + evProfile[hour];
    const pv = pvProfile[hour];
    let remainingLoad = Math.max(0, load - pv);
    let surplusPv = Math.max(0, pv - load);
    let storageCharge = 0;
    let storageDischarge = 0;

    if (enabled.storage && surplusPv > 0 && soc < usableCapacity) {
      storageCharge = Math.min(storage.power, surplusPv, (usableCapacity - soc) / chargeEfficiency);
      soc += storageCharge * chargeEfficiency;
      surplusPv -= storageCharge;
    }
    if (enabled.storage && remainingLoad > 0 && (storage.dispatchMode === 'pv_surplus' || prices[hour] >= highPrice || remainingLoad > demandTarget) && soc > 0) {
      const requiredForDemand = Math.max(0, remainingLoad - demandTarget);
      const desired = storage.dispatchMode === 'pv_surplus' || prices[hour] >= highPrice ? remainingLoad : requiredForDemand;
      storageDischarge = Math.min(storage.power, desired, soc * dischargeEfficiency);
      soc -= storageDischarge / dischargeEfficiency;
      remainingLoad -= storageDischarge;
    }
    if (enabled.storage && storage.dispatchMode === 'hybrid' && prices[hour] <= lowPrice && soc < usableCapacity && remainingLoad + storage.power <= transformerLimit) {
      const gridCharge = Math.min(storage.power, (usableCapacity - soc) / chargeEfficiency);
      storageCharge += gridCharge;
      soc += gridCharge * chargeEfficiency;
      remainingLoad += gridCharge;
    }

    rows.push({
      hour,
      baseLoad: round3(baseLoad[hour]),
      evLoad: round3(evProfile[hour]),
      pvGeneration: round3(pv),
      storageCharge: round3(storageCharge),
      storageDischarge: round3(storageDischarge),
      gridImport: round3(Math.max(0, remainingLoad)),
      gridExport: round3(Math.max(0, surplusPv)),
      soc: round3(soc),
      price: round3(prices[hour])
    });
  }

  const annualGridImportKwh = sum(rows.map(row => row.gridImport)) * 365;
  const annualGridExportKwh = sum(rows.map(row => row.gridExport)) * 365;
  const annualPvGenerationKwh = sum(rows.map(row => row.pvGeneration)) * 365;
  const annualStorageChargeKwh = sum(rows.map(row => row.storageCharge)) * 365;
  const annualStorageDischargeKwh = sum(rows.map(row => row.storageDischarge)) * 365;
  const annualEnergyCost = sum(rows.map(row => row.gridImport * row.price)) * 365;
  const peakGridKw = Math.max(...rows.map(row => row.gridImport));
  const annualDemandCost = peakGridKw * storage.demandPrice * 12;
  const annualFeedInRevenue = annualGridExportKwh * solar.feedInTariff;
  const annualEvServiceRevenue = enabled.ev ? ev.annualServiceRevenue : 0;
  const baselineCost = sum(baseLoad.map((value, hour) => value * prices[hour])) * 365
    + Math.max(...baseLoad) * storage.demandPrice * 12;
  const annualSystemValue = baselineCost - annualEnergyCost - annualDemandCost + annualFeedInRevenue + annualEvServiceRevenue;

  return {
    key: `${enabled.solar ? 'p' : ''}${enabled.storage ? 's' : ''}${enabled.ev ? 'e' : ''}` || 'base',
    enabled,
    annualGridImportKwh: round3(annualGridImportKwh),
    annualGridExportKwh: round3(annualGridExportKwh),
    annualPvGenerationKwh: round3(annualPvGenerationKwh),
    annualEvEnergyKwh: round3(enabled.ev ? ev.annualKwh : 0),
    annualStorageChargeKwh: round3(annualStorageChargeKwh),
    annualStorageDischargeKwh: round3(annualStorageDischargeKwh),
    annualEnergyCost: round3(annualEnergyCost / 10000),
    annualDemandCost: round3(annualDemandCost / 10000),
    annualFeedInRevenue: round3(annualFeedInRevenue / 10000),
    annualEvServiceRevenue: round3(annualEvServiceRevenue / 10000),
    annualSystemValue: round3(annualSystemValue / 10000),
    peakGridKw: round3(peakGridKw),
    pvSelfConsumptionRate: annualPvGenerationKwh > 0 ? round3((1 - annualGridExportKwh / annualPvGenerationKwh) * 100) : 0,
    typicalDay: rows
  };
};

export const buildCounterfactuals = (input: BuildReportInput): Record<string, PhysicalScenarioResult> => {
  const combinations: Enabled[] = [
    { solar: false, storage: false, ev: false },
    { solar: true, storage: false, ev: false },
    { solar: false, storage: true, ev: false },
    { solar: false, storage: false, ev: true },
    { solar: true, storage: true, ev: false },
    { solar: true, storage: false, ev: true },
    { solar: false, storage: true, ev: true },
    { solar: true, storage: true, ev: true }
  ];
  return Object.fromEntries(combinations.map(enabled => {
    const result = simulatePhysicalScenario(input, enabled);
    return [result.key, result];
  }));
};
