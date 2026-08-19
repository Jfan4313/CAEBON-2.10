import { getReportAdapter } from './adapters';
import { buildFinancialMetrics, round3 } from './financial';
import { buildCounterfactuals } from './physicalEngine';
import { getProjectTypeLabel } from '../utils/projectLoadProfiles';
import { estimateAnnualLoad } from '../utils/monthlyLoadEstimation';
import { getSolarProfileBasis } from '../utils/solarGenerationProfile';
import type {
  BuildReportInput,
  CombinedReportResult,
  InteractionValue,
  ParticipantLedger,
  PartyRole
} from './types';

const PHYSICAL_IDS = ['retrofit-solar', 'retrofit-storage', 'retrofit-ev'];
const toWan = (valueYuan: number) => valueYuan / 10000;

const participantName: Record<PartyRole, string> = {
  owner: '项目业主',
  solar_investor: '光伏投资方',
  storage_investor: '储能投资方',
  ev_operator: '充电运营方',
  financier: '融资方'
};

const getMode = (input: BuildReportInput, moduleId: string): string => {
  const params = input.modules[moduleId]?.params || {};
  if (moduleId === 'retrofit-solar') return params.simpleParams?.investmentMode || 'epc';
  if (moduleId === 'retrofit-storage') return params.investmentConfig?.mode || 'self';
  if (moduleId === 'retrofit-ev') return params.businessConfig?.mode || 'self_operated';
  return 'self';
};

interface Allocation { investment: Partial<Record<PartyRole, number>>; benefit: Partial<Record<PartyRole, number>>; assumptions: string[] }

const moduleAllocation = (input: BuildReportInput, moduleId: string, investment: number, benefit: number): Allocation => {
  const params = input.modules[moduleId]?.params || {};
  const mode = getMode(input, moduleId);
  if (moduleId === 'retrofit-solar') {
    if (mode === 'emc') {
      const ownerRate = Number(params.advParams?.emcOwnerShareRate || 10) / 100;
      return { investment: { solar_investor: investment }, benefit: { owner: benefit * ownerRate, solar_investor: benefit * (1 - ownerRate) }, assumptions: [`光伏EMC收益按业主${round3(ownerRate * 100)}%、投资方${round3((1 - ownerRate) * 100)}%分配。`] };
    }
    if (mode === 'co_build') {
      const investorRate = Number(params.advParams?.coBuildInvestorShareRate || 60) / 100;
      return { investment: { owner: investment * (1 - investorRate), solar_investor: investment * investorRate }, benefit: { owner: benefit * (1 - investorRate), solar_investor: benefit * investorRate }, assumptions: ['光伏股权共建按持股比例分配投资与收益。'] };
    }
    return { investment: { owner: investment }, benefit: { owner: benefit }, assumptions: [mode === 'financing' ? '融资建设暂按业主项目现金流列示，债务偿还沿用光伏模块参数。' : '光伏由业主自投并享有对应收益。'] };
  }
  if (moduleId === 'retrofit-storage') {
    if (mode === 'emc') {
      const ownerRate = Number(params.investmentConfig?.emcOwnerShareRate || 15) / 100;
      return { investment: { storage_investor: investment }, benefit: { owner: benefit * ownerRate, storage_investor: benefit * (1 - ownerRate) }, assumptions: [`储能EMC收益按业主${round3(ownerRate * 100)}%、投资方${round3((1 - ownerRate) * 100)}%分配。`] };
    }
    return { investment: { owner: investment }, benefit: { owner: benefit }, assumptions: ['储能由业主自投并享有对应收益。'] };
  }
  if (moduleId === 'retrofit-ev') {
    const config = params.businessConfig || {};
    if (mode === 'third_party') {
      const ownerRate = Number(config.ownerShareRate ?? 20) / 100;
      return { investment: { ev_operator: investment }, benefit: { owner: benefit * ownerRate, ev_operator: benefit * (1 - ownerRate) }, assumptions: [`充电运营收益按业主${round3(ownerRate * 100)}%、运营方${round3((1 - ownerRate) * 100)}%分配。`] };
    }
    if (mode === 'entrusted') {
      const commission = Number(config.operatorCommissionRate ?? 15) / 100;
      return { investment: { owner: investment }, benefit: { owner: benefit * (1 - commission), ev_operator: benefit * commission }, assumptions: [`充电运营方按净收益${round3(commission * 100)}%收取运营佣金。`] };
    }
    return { investment: { owner: investment }, benefit: { owner: benefit }, assumptions: ['充电桩由业主自投自营。'] };
  }
  return { investment: { owner: investment }, benefit: { owner: benefit }, assumptions: [] };
};

const allocateInteraction = (
  input: BuildReportInput,
  interaction: InteractionValue,
  benefits: Partial<Record<PartyRole, number>>,
  assumptions: string[]
) => {
  if (interaction.annualValue === 0) return;
  if (interaction.id.includes('storage') && getMode(input, 'retrofit-storage') === 'emc') {
    const ownerRate = Number(input.modules['retrofit-storage']?.params?.investmentConfig?.emcOwnerShareRate || 15) / 100;
    benefits.owner = (benefits.owner || 0) + interaction.annualValue * ownerRate;
    benefits.storage_investor = (benefits.storage_investor || 0) + interaction.annualValue * (1 - ownerRate);
    assumptions.push(`${interaction.label}按储能EMC分成规则结算。`);
    return;
  }
  if (interaction.id.includes('ev') && getMode(input, 'retrofit-ev') === 'third_party') {
    const ownerRate = Number(input.modules['retrofit-ev']?.params?.businessConfig?.ownerShareRate ?? 20) / 100;
    benefits.owner = (benefits.owner || 0) + interaction.annualValue * ownerRate;
    benefits.ev_operator = (benefits.ev_operator || 0) + interaction.annualValue * (1 - ownerRate);
    assumptions.push(`${interaction.label}按充电运营分成规则结算。`);
    return;
  }
  benefits.owner = (benefits.owner || 0) + interaction.annualValue;
  assumptions.push(`${interaction.label}未配置专项合同，默认归入业主节省。`);
};

export const buildCombinedReport = (rawInput: BuildReportInput): CombinedReportResult => {
  const horizonYears = rawInput.horizonYears || 25;
  const selectedModuleIds = rawInput.selectedModuleIds.filter(id => rawInput.modules[id]?.isActive);
  const input = { ...rawInput, selectedModuleIds, horizonYears };
  let moduleResults = selectedModuleIds.map(moduleId => getReportAdapter(moduleId).buildStandalone({
    module: input.modules[moduleId],
    projectBaseInfo: input.projectBaseInfo,
    priceConfig: input.priceConfig,
    bills: input.bills,
    transformers: input.transformers,
    horizonYears
  }));
  const counterfactuals = buildCounterfactuals(input);
  const hasSolar = selectedModuleIds.includes('retrofit-solar');
  const hasStorage = selectedModuleIds.includes('retrofit-storage');
  const hasEv = selectedModuleIds.includes('retrofit-ev');
  const billEstimation = estimateAnnualLoad(input.bills, {
    projectType: input.projectBaseInfo.type,
    province: input.projectBaseInfo.province,
    hasAirConditioning: input.projectBaseInfo.hasAirConditioning,
  });
  const billMonthCount = billEstimation.actualMonthCount;
  const storageParams = input.modules['retrofit-storage']?.params || {};
  const storageIsPvOnly = storageParams.dispatchMode !== 'hybrid';
  const storageHasValidScale = Number(storageParams.basicParams?.power ?? 261) > 0
    && Number(storageParams.basicParams?.capacity ?? 522) > 0;
  const physicalBenefitByModule: Record<string, number> = {
    'retrofit-solar': counterfactuals.p.annualSystemValue,
    'retrofit-storage': counterfactuals.s.annualSystemValue,
    'retrofit-ev': counterfactuals.e.annualSystemValue
  };
  moduleResults = moduleResults.map(result => {
    if (!(result.moduleId in physicalBenefitByModule)) return result;
    const degradation = result.moduleId === 'retrofit-solar'
      ? Number(input.modules[result.moduleId]?.params?.advParams?.degradationLinear || 0.4)
      : result.moduleId === 'retrofit-storage'
        ? Number(input.modules[result.moduleId]?.params?.advParams?.degradation || 1.5)
        : 0.5;
    const replacementYears = result.moduleId === 'retrofit-storage' ? [12, 24] : result.moduleId === 'retrofit-ev' ? [10, 20] : [];
    const replacementCostRate = result.moduleId === 'retrofit-storage' ? 60 : result.moduleId === 'retrofit-ev' ? 55 : 0;
    return {
      ...result,
      metrics: buildFinancialMetrics({
        investment: result.metrics.investment,
        firstYearBenefit: physicalBenefitByModule[result.moduleId],
        horizonYears,
        discountRate: Number(input.projectBaseInfo.discountRate || 5),
        annualDegradation: degradation,
        replacementYears,
        replacementCostRate,
        residualRate: result.moduleId === 'retrofit-solar' ? 5 : 0
      })
    };
  });
  const activeKey = `${hasSolar ? 'p' : ''}${hasStorage ? 's' : ''}${hasEv ? 'e' : ''}` || 'base';
  const physicalSingles = (hasSolar ? counterfactuals.p.annualSystemValue : 0)
    + (hasStorage ? counterfactuals.s.annualSystemValue : 0)
    + (hasEv ? counterfactuals.e.annualSystemValue : 0);
  const interactions: InteractionValue[] = [];
  if (hasSolar && hasStorage) interactions.push({ id: 'solar_storage', label: '光伏余电转存增量价值', annualValue: round3(counterfactuals.ps.annualSystemValue - counterfactuals.p.annualSystemValue - counterfactuals.s.annualSystemValue) });
  if (hasSolar && hasEv) interactions.push({ id: 'solar_ev', label: '充电负荷提升光伏消纳价值', annualValue: round3(counterfactuals.pe.annualSystemValue - counterfactuals.p.annualSystemValue - counterfactuals.e.annualSystemValue) });
  if (hasStorage && hasEv) interactions.push({ id: 'storage_ev', label: '储能降低充电需量价值', annualValue: round3(counterfactuals.se.annualSystemValue - counterfactuals.s.annualSystemValue - counterfactuals.e.annualSystemValue) });
  if (hasSolar && hasStorage && hasEv) {
    interactions.push({
      id: 'solar_storage_ev',
      label: '光储充三方联合优化价值',
      annualValue: round3(counterfactuals.pse.annualSystemValue - counterfactuals.ps.annualSystemValue - counterfactuals.pe.annualSystemValue - counterfactuals.se.annualSystemValue + counterfactuals.p.annualSystemValue + counterfactuals.s.annualSystemValue + counterfactuals.e.annualSystemValue)
    });
  }
  const otherResults = moduleResults.filter(result => !PHYSICAL_IDS.includes(result.moduleId));
  const otherAnnualBenefit = otherResults.reduce((total, result) => total + result.metrics.firstYearNetBenefit, 0);
  const activePhysical = counterfactuals[activeKey];
  const standaloneAnnualBenefit = round3(physicalSingles + otherAnnualBenefit);
  const interactionAnnualBenefit = round3(interactions.reduce((total, item) => total + item.annualValue, 0));
  const combinedAnnualBenefit = round3((activeKey === 'base' ? 0 : activePhysical.annualSystemValue) + otherAnnualBenefit);
  const totalInvestment = moduleResults.reduce((total, result) => total + result.metrics.investment, 0);
  const systemMetrics = buildFinancialMetrics({
    investment: totalInvestment,
    firstYearBenefit: combinedAnnualBenefit,
    horizonYears,
    discountRate: Number(input.projectBaseInfo.discountRate || 5),
    annualDegradation: 1,
    annualOpex: totalInvestment * Number(input.projectBaseInfo.omRate || 0) / 100
  });

  const investments: Partial<Record<PartyRole, number>> = {};
  const benefits: Partial<Record<PartyRole, number>> = {};
  const ledgerAssumptions: Partial<Record<PartyRole, string[]>> = {};
  moduleResults.forEach(result => {
    const allocation = moduleAllocation(input, result.moduleId, result.metrics.investment, result.metrics.firstYearNetBenefit);
    Object.entries(allocation.investment).forEach(([role, value]) => investments[role as PartyRole] = (investments[role as PartyRole] || 0) + Number(value || 0));
    Object.entries(allocation.benefit).forEach(([role, value]) => benefits[role as PartyRole] = (benefits[role as PartyRole] || 0) + Number(value || 0));
    const targetRole = Object.keys(allocation.investment)[0] as PartyRole || 'owner';
    ledgerAssumptions[targetRole] = [...(ledgerAssumptions[targetRole] || []), ...allocation.assumptions];
  });
  const interactionAssumptions: string[] = [];
  interactions.forEach(interaction => allocateInteraction(input, interaction, benefits, interactionAssumptions));
  ledgerAssumptions.owner = [...(ledgerAssumptions.owner || []), ...interactionAssumptions];

  const participantLedgers: ParticipantLedger[] = (Object.keys(participantName) as PartyRole[])
    .filter(role => (investments[role] || 0) !== 0 || (benefits[role] || 0) !== 0)
    .map(role => {
      const investment = Number(investments[role] || 0);
      const benefit = Number(benefits[role] || 0);
      return {
        id: role,
        role,
        name: participantName[role],
        investment: round3(investment),
        firstYearNetBenefit: round3(benefit),
        metrics: buildFinancialMetrics({ investment, firstYearBenefit: benefit, horizonYears, discountRate: Number(input.projectBaseInfo.discountRate || 5), annualDegradation: 1 }),
        incomeSources: [{ label: '合同分配后首年净收益', value: round3(benefit) }],
        assumptions: ledgerAssumptions[role] || []
      };
    });

  const relationshipLabels = [
    ...(hasSolar && hasStorage ? [storageIsPvOnly ? '光伏 → 储能：余电转存与后续自用' : '光伏 → 储能：余电转存与峰谷调节'] : []),
    ...(hasSolar && hasEv ? ['光伏 → 充电桩：绿电直接消纳'] : []),
    ...(hasStorage && hasEv ? ['储能 → 充电桩：需量保护与错峰供能'] : [])
  ];
  const unsupportedCombination = selectedModuleIds.length > 1 && relationshipLabels.length === 0;
  const dataQuality = moduleResults.every(result => result.dataQuality === 'measured') ? 'measured' : 'estimated';
  return {
    scenarioName: selectedModuleIds.length === 1 ? `${moduleResults[0]?.name || '单板块'}独立汇报` : '多板块联合汇报',
    selectedModuleIds,
    generatedAt: new Date().toISOString(),
    dataQuality,
    modules: moduleResults,
    activePhysicalScenario: activeKey === 'base' ? undefined : activePhysical,
    counterfactuals,
    interactions,
    standaloneAnnualBenefit,
    interactionAnnualBenefit,
    combinedAnnualBenefit,
    systemMetrics,
    participantLedgers,
    relationshipLabels,
    warnings: [
      ...(unsupportedCombination ? ['当前选择的板块之间尚未配置物理联动模型，本报告仅汇总独立财务结果。'] : []),
      ...(hasSolar && activePhysical.annualPvGenerationKwh <= 0 ? ['光伏板块缺少有效装机或发电参数，未计算光伏物理收益。'] : []),
      ...(hasStorage && !storageHasValidScale ? ['储能板块缺少有效功率/容量参数，未计算储能物理收益。'] : []),
      ...(hasStorage && storageIsPvOnly && !hasSolar ? ['当前储能采用光伏余电专用策略；未选择光伏板块时，储能独立场景不产生充放电收益。'] : []),
      ...(hasStorage && storageIsPvOnly && hasSolar && activePhysical.annualStorageChargeKwh <= 0 ? ['当前负荷曲线下未形成可供储能吸收的光伏余电，光储协同收益为0。'] : []),
      ...(hasEv && activePhysical.annualEvEnergyKwh <= 0 ? ['充电桩板块缺少有效设备或利用率参数，未计算充电运营收益。'] : []),
      ...(dataQuality === 'estimated' ? ['至少一个板块使用快速估算数据，正式投资决策前应使用实测负荷复核。'] : []),
      ...moduleResults.flatMap(result => result.warnings)
    ],
    assumptions: [
      '系统经济账只统计项目边界外部现金流，参与方之间的内部结算在合并时抵消。',
      '光储充协同收益来自反事实场景差额，不使用固定增益比例。',
      ...(billMonthCount > 0 ? [`已有${billMonthCount}个月真实电费数据；缺失的${billEstimation.estimatedMonthCount}个月按${getProjectTypeLabel(input.projectBaseInfo.type)}运营规律、季节与空调负荷补齐，24小时形状仍为估算级。`] : []),
      ...(hasSolar ? [`光伏典型日出力形状按${getSolarProfileBasis(input.projectBaseInfo)}计算，并以当地等效日照小时归一化发电总量。`] : []),
      ...(hasStorage && storageIsPvOnly ? [`储能按${Number(storageParams.basicParams?.power ?? 261).toFixed(0)}kW/${Number(storageParams.basicParams?.capacity ?? 522).toFixed(0)}kWh配置测算，仅由光伏余电充电，禁止电网充电套利。`] : []),
      ...(hasStorage && Number(storageParams.recommendation?.capacity || 0) > 0 ? [`基于${storageParams.recommendation.basis || '账单重构负荷'}，技术建议配储为${Number(storageParams.recommendation.power).toFixed(0)}kW/${Number(storageParams.recommendation.capacity).toFixed(0)}kWh；建议值需用15分钟实测数据复核。`] : []),
      `联合财务测算期为${horizonYears}年。`
    ]
  };
};

export const formatWan = (value: number) => `¥${round3(value).toLocaleString('zh-CN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}万`;
export const formatKwh = (value: number) => `${round3(value / 10000).toLocaleString('zh-CN')}万kWh`;
export const yuanToWan = toWan;
