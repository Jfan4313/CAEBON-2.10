import React, { useMemo, useState } from 'react';
import { calculateSalesScenario } from '../calculations';
import type { SalesCalculationContext, SalesScenario, SalesServiceConfig } from '../types';

interface SalesServicePanelProps {
  config: SalesServiceConfig;
  context: SalesCalculationContext;
  onChange: (config: SalesServiceConfig) => void;
}

const cloneScenario = (scenario: SalesScenario): SalesScenario => ({
  ...scenario,
  id: `sales-${Date.now()}`,
  name: `${scenario.name} 副本`
});

const money = (value: number) => `${value.toFixed(1)} 万`;

export const SalesServicePanel: React.FC<SalesServicePanelProps> = ({ config, context, onChange }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const selected = config.scenarios.find(item => item.id === config.selectedScenarioId) || config.scenarios[0];
  const results = useMemo(() => config.scenarios.map(scenario => ({
    scenario,
    result: calculateSalesScenario(scenario, context)
  })), [config.scenarios, context]);
  const currentResult = results.find(item => item.scenario.id === selected?.id)?.result;

  if (!selected || !currentResult) return null;

  const updateScenario = (updates: Partial<SalesScenario>) => {
    onChange({
      ...config,
      scenarios: config.scenarios.map(item => item.id === selected.id ? { ...item, ...updates } : item)
    });
  };

  const addScenario = () => {
    const next = cloneScenario(selected);
    onChange({ ...config, scenarios: [...config.scenarios, next], selectedScenarioId: next.id });
  };

  const deleteScenario = () => {
    if (config.scenarios.length <= 1) return;
    const next = config.scenarios.filter(item => item.id !== selected.id);
    onChange({ ...config, scenarios: next, selectedScenarioId: next[0].id });
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">售电服务</h3>
          <p className="text-xs text-slate-500 mt-1">适用于园区代理售电与新能源电量销售，独立于综合能源管理。</p>
        </div>
        <button
          onClick={() => onChange({ ...config, enabled: !config.enabled })}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${config.enabled ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
        >
          <span className="material-icons text-[18px]">{config.enabled ? 'toggle_on' : 'toggle_off'}</span>
          {config.enabled ? '已启用' : '未启用'}
        </button>
      </section>

      <div className={config.enabled ? 'space-y-6' : 'space-y-6 opacity-50 pointer-events-none'}>
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">
            <div className="flex flex-wrap gap-2">
              {config.scenarios.map(item => (
                <button
                  key={item.id}
                  onClick={() => onChange({ ...config, selectedScenarioId: item.id })}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border ${item.id === selected.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={addScenario} className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1">
                <span className="material-icons text-[16px]">add</span>新增方案
              </button>
              <button onClick={deleteScenario} disabled={config.scenarios.length <= 1} className="p-2 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30" title="删除方案">
                <span className="material-icons text-[17px]">delete_outline</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">方案名称</span>
              <input value={selected.name} onChange={event => updateScenario({ name: event.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">售电量口径</span>
              <select value={selected.volumeMode} onChange={event => updateScenario({ volumeMode: event.target.value as SalesScenario['volumeMode'] })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="auto">自动关联项目用电量</option>
                <option value="manual">手动输入年售电量</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">年售电量 (kWh)</span>
              <input type="number" disabled={selected.volumeMode === 'auto'} value={selected.volumeMode === 'auto' ? Math.round(context.annualDemandKwh) : selected.manualAnnualSalesKwh} onChange={event => updateScenario({ manualAnnualSalesKwh: Number(event.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">新能源售电占比 (%)</span>
              <input type="number" min="0" max="100" value={selected.renewableRatio} onChange={event => updateScenario({ renewableRatio: Number(event.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">定价方式</span>
              <select value={selected.pricingMode} onChange={event => updateScenario({ pricingMode: event.target.value as SalesScenario['pricingMode'] })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="blended">固定价 + 市场现货价</option>
                <option value="fixed">固定售电价</option>
                <option value="discount">基准电价折扣</option>
              </select>
            </label>
            {selected.pricingMode === 'blended' ? (
              <>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-500">固定部分电价 (元/kWh)</span>
                  <input type="number" step="0.01" value={selected.fixedSalePrice} onChange={event => updateScenario({ fixedSalePrice: Number(event.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-500">固定价比例 (%)</span>
                  <input type="number" min="0" max="100" value={selected.fixedSettlementRatio} onChange={event => updateScenario({ fixedSettlementRatio: Number(event.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-500">现货价来源</span>
                  <select value={selected.spotPriceMode} onChange={event => updateScenario({ spotPriceMode: event.target.value as SalesScenario['spotPriceMode'] })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white">
                    <option value="market">读取市场现货均价</option>
                    <option value="manual">手动输入现货价</option>
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-500">现货部分电价 (元/kWh)</span>
                  <input type="number" step="0.01" disabled={selected.spotPriceMode === 'market'} value={selected.spotPriceMode === 'market' ? context.marketSpotPrice.toFixed(4) : selected.manualSpotPrice} onChange={event => updateScenario({ manualSpotPrice: Number(event.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" />
                </label>
              </>
            ) : (
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-500">{selected.pricingMode === 'fixed' ? '售电价 (元/kWh)' : '折扣比例 (%)'}</span>
                <input type="number" step="0.01" value={selected.pricingMode === 'fixed' ? selected.fixedSalePrice : selected.discountRate} onChange={event => updateScenario(selected.pricingMode === 'fixed' ? { fixedSalePrice: Number(event.target.value) } : { discountRate: Number(event.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </label>
            )}
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">折扣基准</span>
              <select value={selected.benchmarkMode} onChange={event => updateScenario({ benchmarkMode: event.target.value as SalesScenario['benchmarkMode'] })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="project">项目电价加权均价</option>
                <option value="historical">客户历史用电均价</option>
                <option value="manual">手动合同基准价</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">基准价 (元/kWh)</span>
              <input type="number" step="0.01" disabled={selected.benchmarkMode !== 'manual'} value={selected.benchmarkMode === 'project' ? context.projectWeightedPrice.toFixed(4) : selected.benchmarkMode === 'historical' ? context.historicalAveragePrice.toFixed(4) : selected.manualBenchmarkPrice} onChange={event => updateScenario({ manualBenchmarkPrice: Number(event.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" />
            </label>
          </div>

          {selected.pricingMode === 'blended' && (
            <div className="mt-3 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-800">
              综合结算价 = {currentResult.fixedSettlementRatio.toFixed(0)}% × {selected.fixedSalePrice.toFixed(4)} + {currentResult.spotSettlementRatio.toFixed(0)}% × {currentResult.spotPrice.toFixed(4)} = <span className="font-bold">{currentResult.salePrice.toFixed(4)} 元/kWh</span>
            </div>
          )}

          <button onClick={() => setShowAdvanced(!showAdvanced)} className="mt-4 text-xs font-semibold text-blue-600 flex items-center gap-1">
            <span className="material-icons text-[16px]">{showAdvanced ? 'expand_less' : 'tune'}</span>
            {showAdvanced ? '收起高级成本' : '高级成本与税费'}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              {[
                ['lineLossRate', '线损率 (%)'], ['transmissionFee', '输配电费 (元/kWh)'],
                ['governmentSurcharge', '政府附加 (元/kWh)'], ['tradingServiceFee', '交易服务费 (元/kWh)'],
                ['deviationRate', '偏差电量比例 (%)'], ['deviationPenaltyPrice', '偏差考核单价'],
                ['vatRate', '增值税率 (%)'], ['vatSurchargeRate', '增值税附加 (%)']
              ].map(([key, label]) => (
                <label key={key} className="space-y-1">
                  <span className="text-[10px] text-slate-500">{label}</span>
                  <input type="number" step="0.01" value={selected[key as keyof SalesScenario] as number} onChange={event => updateScenario({ [key]: Number(event.target.value) })} className="w-full px-2.5 py-2 border border-slate-200 rounded-md text-xs" />
                </label>
              ))}
              <label className="space-y-1">
                <span className="text-[10px] text-slate-500">税价口径</span>
                <select value={selected.taxMode} onChange={event => updateScenario({ taxMode: event.target.value as SalesScenario['taxMode'] })} className="w-full px-2.5 py-2 border border-slate-200 rounded-md text-xs bg-white">
                  <option value="tax_included">统一含税价</option>
                  <option value="separated">价税分离</option>
                  <option value="excluded">暂不计税</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] text-slate-500">外购电价口径</span>
                <select value={selected.purchasePriceMode} onChange={event => updateScenario({ purchasePriceMode: event.target.value as SalesScenario['purchasePriceMode'] })} className="w-full px-2.5 py-2 border border-slate-200 rounded-md text-xs bg-white">
                  <option value="project">读取项目电价</option>
                  <option value="manual">手动采购价</option>
                </select>
              </label>
              {selected.purchasePriceMode === 'manual' && (
                <label className="space-y-1">
                  <span className="text-[10px] text-slate-500">手动采购价 (元/kWh)</span>
                  <input type="number" step="0.01" value={selected.manualPurchasePrice} onChange={event => updateScenario({ manualPurchasePrice: Number(event.target.value) })} className="w-full px-2.5 py-2 border border-slate-200 rounded-md text-xs" />
                </label>
              )}
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {[
            ['年售电量', `${(currentResult.annualSalesKwh / 10000).toFixed(1)} 万度`, 'text-slate-900'],
            ['综合结算价', `${currentResult.salePrice.toFixed(4)} 元`, 'text-indigo-700'],
            ['售电收入', money(currentResult.salesRevenue), 'text-blue-700'],
            ['采购成本', money(currentResult.purchaseCost), 'text-slate-900'],
            ['交易税费', money(currentResult.transactionCost + currentResult.taxCost), 'text-amber-700'],
            ['售电净收益', money(currentResult.netProfit), 'text-emerald-700'],
            ['客户年节省', money(currentResult.customerSaving), 'text-cyan-700']
          ].map(([label, value, color]) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-[10px] text-slate-500 mb-1">{label}</div>
              <div className={`text-lg font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </section>

        {currentResult.renewableShortfallKwh > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
            新能源电量不足，缺口 {(currentResult.renewableShortfallKwh / 10000).toFixed(1)} 万度已自动转为外购电量。
          </div>
        )}

        {results.length > 1 && (
          <section className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <div className="px-5 py-4 border-b border-slate-200 font-bold text-sm text-slate-800">售电方案对比</div>
            <table className="w-full min-w-[760px] text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr><th className="p-3 text-left">方案</th><th>售电量</th><th>售电价</th><th>新能源</th><th>净收益</th><th>客户节省</th><th>每度节省</th></tr>
              </thead>
              <tbody>
                {results.map(({ scenario, result }) => (
                  <tr key={scenario.id} className="border-t border-slate-100 text-center">
                    <td className="p-3 text-left font-semibold text-slate-800">{scenario.name}</td>
                    <td>{(result.annualSalesKwh / 10000).toFixed(1)}万度</td><td><div>{result.salePrice.toFixed(4)}</div>{scenario.pricingMode === 'blended' && <div className="text-[10px] text-slate-400">{result.fixedSettlementRatio.toFixed(0)}/{result.spotSettlementRatio.toFixed(0)}</div>}</td>
                    <td>{(result.renewableSalesKwh / Math.max(1, result.annualSalesKwh) * 100).toFixed(1)}%</td>
                    <td className="font-bold text-emerald-700">{money(result.netProfit)}</td><td>{money(result.customerSaving)}</td><td>{result.savingPerKwh.toFixed(3)}元</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
};
