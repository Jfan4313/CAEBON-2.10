import type { ModuleData } from '../../context/ModuleContext';
import type { ModuleReportAdapter, ModuleReportResult, ReportAdapterContext, TechnicalMetric } from './types';
import { buildFinancialMetrics } from './financial';

const numberFromText = (value?: string): number => Number(value?.replace(/[^0-9.-]/g, '') || 0);

const modeLabels: Record<string, string> = {
  epc: '业主自投（EPC）',
  emc: '合同能源管理（EMC）',
  financing: '融资建设',
  co_build: '股权共建',
  self: '业主自投',
  self_operated: '业主自投自营',
  third_party: '第三方投建运营',
  entrusted: '业主投建委托运营'
};

const resolveInvestmentMode = (module: ModuleData): string => {
  const params = module.params || {};
  if (module.id === 'retrofit-solar') return params.simpleParams?.investmentMode || 'epc';
  if (module.id === 'retrofit-storage') return params.investmentConfig?.mode || 'self';
  if (module.id === 'retrofit-ev') return params.businessConfig?.mode || 'self_operated';
  return params.investmentMode || 'self';
};

const technicalMetrics = (module: ModuleData): TechnicalMetric[] => {
  const params = module.params || {};
  if (module.id === 'retrofit-solar') {
    return [
      { label: '装机容量', value: `${Number(params.simpleParams?.capacity || numberFromText(module.kpiPrimary?.value)).toFixed(1)} kWp` },
      { label: '系统效率PR', value: `${Number(params.advParams?.prValue || 0).toFixed(1)}%` },
      { label: '自用比例', value: `${Number(params.effectiveSelfConsumptionRate || 0).toFixed(1)}%` }
    ];
  }
  if (module.id === 'retrofit-storage') {
    const recommendation = params.recommendation;
    return [
      { label: '额定功率', value: `${Number(params.basicParams?.power || 0).toFixed(1)} kW` },
      { label: '系统容量', value: `${Number(params.basicParams?.capacity || 0).toFixed(1)} kWh` },
      { label: '运行策略', value: params.dispatchMode === 'hybrid' ? '综合套利' : '仅吸收光伏余电' },
      ...(recommendation?.capacity > 0 ? [{ label: '建议配储规模', value: `${Number(recommendation.power).toFixed(0)} kW / ${Number(recommendation.capacity).toFixed(0)} kWh` }] : []),
      { label: '往返效率', value: `${Number(params.advParams?.rte || 0).toFixed(1)}%` }
    ];
  }
  if (module.id === 'retrofit-ev') {
    const quick = params.quickState || {};
    const equipment = params.preciseState?.equipment || [];
    const count = params.mode === 'precise'
      ? equipment.reduce((total: number, item: any) => total + Number(item.count || 0), 0)
      : Number(quick.acCount || 0) + Number(quick.dcCount || 0);
    return [
      { label: '充电桩数量', value: `${count} 个` },
      { label: '运营方式', value: modeLabels[resolveInvestmentMode(module)] || resolveInvestmentMode(module) },
      { label: '数据模式', value: params.mode === 'precise' ? '精确估值' : '快速测算' }
    ];
  }
  return [
    { label: module.kpiPrimary?.label || '核心指标', value: module.kpiPrimary?.value || '-' },
    { label: module.kpiSecondary?.label || '收益指标', value: module.kpiSecondary?.value || '-' }
  ];
};

const replacementConfig = (module: ModuleData) => {
  if (module.id === 'retrofit-storage') return { replacementYears: [12, 24], replacementCostRate: 60, degradation: Number(module.params?.advParams?.degradation || 1.5) };
  if (module.id === 'retrofit-ev') return { replacementYears: [10, 20], replacementCostRate: 55, degradation: 0.5 };
  if (module.id === 'retrofit-solar') return { replacementYears: [], replacementCostRate: 0, degradation: Number(module.params?.advParams?.degradationLinear || 0.4) };
  return { replacementYears: [], replacementCostRate: 0, degradation: 1 };
};

const buildResult = (context: ReportAdapterContext): ModuleReportResult => {
  const { module, projectBaseInfo, horizonYears } = context;
  const replacement = replacementConfig(module);
  const investment = Math.max(0, Number(module.investment || 0));
  const firstYearBenefit = Number(module.yearlySaving || 0);
  const opex = investment * Math.max(0, Number(projectBaseInfo.omRate || 0)) / 100;
  const metrics = buildFinancialMetrics({
    investment,
    firstYearBenefit,
    horizonYears,
    discountRate: Number(projectBaseInfo.discountRate || 5),
    annualDegradation: replacement.degradation,
    annualOpex: opex,
    replacementYears: replacement.replacementYears.filter(year => year <= horizonYears),
    replacementCostRate: replacement.replacementCostRate,
    residualRate: module.id === 'retrofit-solar' ? 5 : 0
  });
  const mode = resolveInvestmentMode(module);
  const dataQuality = module.params?.mode === 'advanced' || module.params?.mode === 'precise' ? 'measured' : 'estimated';
  return {
    moduleId: module.id,
    name: module.name,
    strategy: module.strategy || '独立方案',
    investmentMode: modeLabels[mode] || mode,
    dataQuality,
    metrics,
    technicalMetrics: technicalMetrics(module),
    assumptions: [
      `测算期 ${horizonYears} 年，折现率 ${Number(projectBaseInfo.discountRate || 5).toFixed(2)}%。`,
      dataQuality === 'measured' ? '采用模块精确模式参数。' : '采用快速估算参数，正式投资决策前需用实测数据复核。'
    ],
    warnings: firstYearBenefit <= 0 ? ['首年净收益不为正，请复核输入参数和商业合同。'] : []
  };
};

const createAdapter = (moduleId: string, capabilities: ModuleReportAdapter['capabilities']): ModuleReportAdapter => ({
  moduleId,
  capabilities,
  buildStandalone: buildResult
});

const adapters: ModuleReportAdapter[] = [
  createAdapter('retrofit-solar', ['generation']),
  createAdapter('retrofit-storage', ['storage']),
  createAdapter('retrofit-ev', ['flexible_load']),
  createAdapter('retrofit-hvac', ['load_reduction']),
  createAdapter('retrofit-lighting', ['load_reduction']),
  createAdapter('retrofit-water', ['load_reduction']),
  createAdapter('retrofit-vpp', ['financial_only']),
  createAdapter('retrofit-ai', ['financial_only']),
  createAdapter('retrofit-carbon', ['financial_only']),
  createAdapter('retrofit-microgrid', ['financial_only']),
  createAdapter('retrofit-energy-sales', ['financial_only'])
];

export const reportAdapterRegistry = new Map(adapters.map(adapter => [adapter.moduleId, adapter]));

export const getReportAdapter = (moduleId: string): ModuleReportAdapter => reportAdapterRegistry.get(moduleId)
  || createAdapter(moduleId, ['financial_only']);
