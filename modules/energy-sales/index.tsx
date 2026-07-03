import React, { useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { SalesServicePanel } from '../microgrid/components/SalesServicePanel';
import {
  calculateSalesScenario,
  getAnnualDemandKwh,
  getHistoricalAveragePrice,
  getMarketSpotPrice,
  getSolarSalesContext,
  getWeightedElectricityPrice
} from '../microgrid/calculations';
import { DEFAULT_ENHANCED_PARAMS, type SalesServiceConfig } from '../microgrid/types';
import { isModuleTakenOver } from '../../utils/moduleAggregation';

const MODULE_ID = 'retrofit-energy-sales';

const EnergySales: React.FC = () => {
  const { modules, updateModule, bills, transformers, priceConfig, saveProject } = useProject();
  const currentModule = modules[MODULE_ID];
  const legacyConfig = modules['retrofit-microgrid']?.params?.salesService;
  const storedConfig = currentModule?.params?.salesService || legacyConfig;
  const config: SalesServiceConfig = {
    ...DEFAULT_ENHANCED_PARAMS.salesService,
    ...storedConfig,
    scenarios: (storedConfig?.scenarios || DEFAULT_ENHANCED_PARAMS.salesService.scenarios).map((scenario: any) => ({
      ...DEFAULT_ENHANCED_PARAMS.salesService.scenarios[0],
      ...scenario
    }))
  };
  const projectWeightedPrice = useMemo(() => getWeightedElectricityPrice(priceConfig), [priceConfig]);
  const marketSpotPrice = useMemo(() => getMarketSpotPrice(priceConfig), [priceConfig]);
  const historicalAveragePrice = useMemo(() => getHistoricalAveragePrice(bills, projectWeightedPrice), [bills, projectWeightedPrice]);
  const annualDemandKwh = useMemo(() => getAnnualDemandKwh(bills, transformers), [bills, transformers]);
  const solarContext = useMemo(() => getSolarSalesContext(modules['retrofit-solar']), [modules]);
  const calculationContext = useMemo(() => ({
    annualDemandKwh,
    projectWeightedPrice,
    historicalAveragePrice,
    marketSpotPrice,
    availableRenewableKwh: solarContext.availableRenewableKwh,
    renewableFeedInTariff: solarContext.feedInTariff
  }), [annualDemandKwh, projectWeightedPrice, historicalAveragePrice, marketSpotPrice, solarContext]);
  const isTakenOver = isModuleTakenOver(MODULE_ID, modules);

  const updateConfig = (nextConfig: SalesServiceConfig) => {
    const selected = nextConfig.scenarios.find(item => item.id === nextConfig.selectedScenarioId) || nextConfig.scenarios[0];
    const result = calculateSalesScenario(selected, calculationContext);
    updateModule(MODULE_ID, {
      id: MODULE_ID,
      name: '售电服务',
      strategy: 'retail',
      isActive: nextConfig.enabled,
      investment: 0,
      yearlySaving: nextConfig.enabled ? Number(result.netProfit.toFixed(3)) : 0,
      kpiPrimary: { label: '年售电量', value: `${(result.annualSalesKwh / 10000).toFixed(1)} 万度` },
      kpiSecondary: { label: '售电净收益', value: `¥${result.netProfit.toFixed(1)}万/年` },
      params: {
        ...(currentModule?.params || {}),
        salesService: nextConfig,
        calculationResult: result
      }
    });
  };

  return (
    <div className="flex h-full bg-slate-50 relative overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="min-h-16 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-3 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">售电服务</h2>
            <p className="text-xs text-slate-500 mt-1">购售电合同、新能源电量与客户节省测算</p>
          </div>
          <div className="flex items-center gap-2">
            {isTakenOver && <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">已纳入综合能源管理</span>}
            <button onClick={saveProject} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold flex items-center gap-2">
              <span className="material-icons text-[17px]">save</span>保存配置
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <SalesServicePanel config={config} context={calculationContext} onChange={updateConfig} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default EnergySales;
