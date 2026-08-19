import type { ModuleData } from '../../context/ModuleContext';
import type { Bill, PriceConfigState, Transformer } from '../../context/ConfigContext';
import type { ProjectBaseInfo } from '../../context/ProjectContext';

export type ReportModuleId = ModuleData['id'];
export type DataQuality = 'estimated' | 'measured';
export type PartyRole = 'owner' | 'solar_investor' | 'storage_investor' | 'ev_operator' | 'financier';

export interface FinancialMetrics {
  investment: number;
  firstYearNetBenefit: number;
  npv: number;
  irr: number;
  paybackPeriod: number;
  /** Decimal form used for display/export, e.g. 0.05 means 5%. */
  discountRate: number;
  cashFlows: number[];
}

export interface TechnicalMetric {
  label: string;
  value: string;
}

export interface ModuleReportResult {
  moduleId: string;
  name: string;
  strategy: string;
  investmentMode: string;
  dataQuality: DataQuality;
  metrics: FinancialMetrics;
  technicalMetrics: TechnicalMetric[];
  assumptions: string[];
  warnings: string[];
}

export interface ReportAdapterContext {
  module: ModuleData;
  projectBaseInfo: ProjectBaseInfo;
  priceConfig: PriceConfigState;
  bills: Bill[];
  transformers: Transformer[];
  horizonYears: number;
}

export interface ModuleReportAdapter {
  moduleId: string;
  capabilities: Array<'generation' | 'storage' | 'flexible_load' | 'load_reduction' | 'financial_only'>;
  buildStandalone(context: ReportAdapterContext): ModuleReportResult;
}

export interface TypicalDayPoint {
  hour: number;
  baseLoad: number;
  evLoad: number;
  pvGeneration: number;
  storageCharge: number;
  storageDischarge: number;
  gridImport: number;
  gridExport: number;
  soc: number;
  price: number;
}

export interface PhysicalScenarioResult {
  key: string;
  enabled: { solar: boolean; storage: boolean; ev: boolean };
  annualGridImportKwh: number;
  annualGridExportKwh: number;
  annualPvGenerationKwh: number;
  annualEvEnergyKwh: number;
  annualStorageChargeKwh: number;
  annualStorageDischargeKwh: number;
  annualEnergyCost: number;
  annualDemandCost: number;
  annualFeedInRevenue: number;
  annualEvServiceRevenue: number;
  annualSystemValue: number;
  peakGridKw: number;
  pvSelfConsumptionRate: number;
  typicalDay: TypicalDayPoint[];
}

export interface InteractionValue {
  id: 'solar_storage' | 'solar_ev' | 'storage_ev' | 'solar_storage_ev';
  label: string;
  annualValue: number;
}

export interface ParticipantLedger {
  id: PartyRole;
  name: string;
  role: PartyRole;
  investment: number;
  firstYearNetBenefit: number;
  metrics: FinancialMetrics;
  incomeSources: Array<{ label: string; value: number }>;
  assumptions: string[];
}

export interface CombinedReportResult {
  scenarioName: string;
  selectedModuleIds: string[];
  generatedAt: string;
  dataQuality: DataQuality;
  modules: ModuleReportResult[];
  activePhysicalScenario?: PhysicalScenarioResult;
  counterfactuals: Record<string, PhysicalScenarioResult>;
  interactions: InteractionValue[];
  standaloneAnnualBenefit: number;
  interactionAnnualBenefit: number;
  combinedAnnualBenefit: number;
  systemMetrics: FinancialMetrics;
  participantLedgers: ParticipantLedger[];
  relationshipLabels: string[];
  warnings: string[];
  assumptions: string[];
}

export interface BuildReportInput {
  selectedModuleIds: string[];
  modules: Record<string, ModuleData>;
  projectBaseInfo: ProjectBaseInfo;
  priceConfig: PriceConfigState;
  bills: Bill[];
  transformers: Transformer[];
  horizonYears?: number;
}
