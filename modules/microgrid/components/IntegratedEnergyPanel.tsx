import React, { useMemo } from 'react';
import type { ModuleData } from '../../../context/ModuleContext';
import { calculateIntegratedScenario, type IntegratedCalculationContext } from '../calculations';
import type { IntegratedEnergyConfig, IntegratedScenario } from '../types';

interface IntegratedEnergyPanelProps {
  config: IntegratedEnergyConfig;
  modules: Record<string, ModuleData>;
  calculationContext: IntegratedCalculationContext;
  onChange: (config: IntegratedEnergyConfig) => void;
}

const businessLabels: Record<IntegratedScenario['businessMode'], string> = {
  service_fee: '固定服务费',
  savings_share: '综合节省分成',
  comprehensive_price: '固定综合能源价'
};

const ledgerLabels = {
  solar: '光伏价值', storage: '储能套利', demand: '需量优化', sales: '售电净收益',
  vpp: 'VPP 交易', reliability: '可靠性价值', ems: 'EMS 协同'
};

export const IntegratedEnergyPanel: React.FC<IntegratedEnergyPanelProps> = ({ config, modules, calculationContext, onChange }) => {
  const selected = config.scenarios.find(item => item.id === config.selectedScenarioId) || config.scenarios[0];
  const results = useMemo(() => config.scenarios.map(scenario => ({
    scenario,
    result: calculateIntegratedScenario(scenario, calculationContext)
  })), [config.scenarios, calculationContext]);
  const currentResult = results.find(item => item.scenario.id === selected?.id)?.result;

  if (!selected || !currentResult) return null;

  const updateScenario = (updates: Partial<IntegratedScenario>) => {
    onChange({
      ...config,
      scenarios: config.scenarios.map(item => item.id === selected.id ? { ...item, ...updates } : item)
    });
  };

  const addScenario = () => {
    const next = { ...selected, id: `integrated-${Date.now()}`, name: `${selected.name} 副本` };
    onChange({ ...config, scenarios: [...config.scenarios, next], selectedScenarioId: next.id });
  };

  const removeScenario = () => {
    if (config.scenarios.length <= 1) return;
    const next = config.scenarios.filter(item => item.id !== selected.id);
    onChange({ ...config, scenarios: next, selectedScenarioId: next[0].id });
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">综合能源管理</h3>
          <p className="text-xs text-slate-500 mt-1">统一管理光伏、储能、售电、需量、EMS 与 VPP，适用于能源托管项目。</p>
        </div>
        <button
          onClick={() => onChange({ ...config, enabled: !config.enabled })}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border ${config.enabled ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
        >
          <span className="material-icons text-[18px]">{config.enabled ? 'toggle_on' : 'toggle_off'}</span>{config.enabled ? '已启用并接管汇总' : '未启用'}
        </button>
      </section>

      <div className={config.enabled ? 'space-y-6' : 'space-y-6 opacity-50 pointer-events-none'}>
        <section className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="material-icons text-indigo-600">account_tree</span>
            <div className="flex-1">
              <div className="text-sm font-bold text-indigo-900">统一汇总已接管</div>
              <p className="text-xs text-indigo-700 mt-1">项目总览不再重复累加下列模块，但单项配置和分析仍然保留。</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {config.takeoverModuleIds.map(id => (
                  <span key={id} className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${modules[id]?.isActive ? 'bg-white border-indigo-200 text-indigo-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                    {modules[id]?.name || id}{modules[id]?.isActive ? ' · 已纳入' : ' · 未启用'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">
            <div className="flex flex-wrap gap-2">
              {config.scenarios.map(item => (
                <button key={item.id} onClick={() => onChange({ ...config, selectedScenarioId: item.id })} className={`px-3 py-2 rounded-lg text-xs font-semibold border ${item.id === selected.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                  {item.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={addScenario} className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold flex items-center gap-1"><span className="material-icons text-[16px]">add</span>新增方案</button>
              <button onClick={removeScenario} disabled={config.scenarios.length <= 1} className="p-2 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30"><span className="material-icons text-[17px]">delete_outline</span></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">方案名称</span>
              <input value={selected.name} onChange={event => updateScenario({ name: event.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">商务结算模式</span>
              <select value={selected.businessMode} onChange={event => updateScenario({ businessMode: event.target.value as IntegratedScenario['businessMode'] })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white">
                {Object.entries(businessLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">
                {selected.businessMode === 'service_fee' ? '年服务费 (万元)' : selected.businessMode === 'savings_share' ? '服务商分成 (%)' : '综合能源价 (元/kWh)'}
              </span>
              <input type="number" step="0.01" value={selected.businessMode === 'service_fee' ? selected.annualServiceFee : selected.businessMode === 'savings_share' ? selected.providerShareRate : selected.comprehensiveEnergyPrice} onChange={event => {
                const value = Number(event.target.value);
                updateScenario(selected.businessMode === 'service_fee' ? { annualServiceFee: value } : selected.businessMode === 'savings_share' ? { providerShareRate: value } : { comprehensiveEnergyPrice: value });
              }} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">合同年限 (年)</span>
              <input type="number" min="1" value={selected.contractYears} onChange={event => updateScenario({ contractYears: Number(event.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
            </label>
            <label className="space-y-1.5"><span className="text-xs font-semibold text-slate-500">EMS 新增投资 (万元)</span><input type="number" value={selected.emsInvestment} onChange={event => updateScenario({ emsInvestment: Number(event.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" /></label>
            <label className="space-y-1.5"><span className="text-xs font-semibold text-slate-500">EMS 年运营费 (万元)</span><input type="number" value={selected.annualEmsOpex} onChange={event => updateScenario({ annualEmsOpex: Number(event.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" /></label>
            <label className="space-y-1.5"><span className="text-xs font-semibold text-slate-500">光伏消纳提升 (%)</span><input type="number" value={selected.selfConsumptionLift} onChange={event => updateScenario({ selfConsumptionLift: Number(event.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" /></label>
            <label className="space-y-1.5"><span className="text-xs font-semibold text-slate-500">需量优化增幅 (%)</span><input type="number" value={selected.demandOptimizationRate} onChange={event => updateScenario({ demandOptimizationRate: Number(event.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" /></label>
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            ['统一总投资', `${currentResult.totalInvestment.toFixed(1)} 万`, 'text-slate-900'],
            ['综合价值', `${currentResult.grossBenefit.toFixed(1)} 万/年`, 'text-indigo-700'],
            ['服务商净收益', `${currentResult.serviceProviderNet.toFixed(1)} 万/年`, 'text-emerald-700'],
            ['业主节省', `${currentResult.ownerSaving.toFixed(1)} 万/年`, 'text-cyan-700'],
            ['IRR', `${currentResult.irr.toFixed(2)}%`, 'text-purple-700'],
            ['回本周期', `${currentResult.paybackPeriod.toFixed(2)} 年`, 'text-amber-700']
          ].map(([label, value, color]) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl p-4"><div className="text-[10px] text-slate-500 mb-1">{label}</div><div className={`text-lg font-bold ${color}`}>{value}</div></div>
          ))}
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h4 className="text-sm font-bold text-slate-800 mb-4">统一收益台账</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
            {Object.entries(currentResult.ledger).map(([key, value]) => (
              <div key={key} className="border-l-2 border-slate-300 pl-3 py-1">
                <div className="text-[10px] text-slate-500">{ledgerLabels[key as keyof typeof ledgerLabels]}</div>
                <div className="text-sm font-bold text-slate-800 mt-1">{value.toFixed(1)} 万</div>
              </div>
            ))}
          </div>
        </section>

        {results.length > 1 && (
          <section className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <div className="px-5 py-4 border-b border-slate-200 font-bold text-sm text-slate-800">综合能源方案对比</div>
            <table className="w-full min-w-[760px] text-xs">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3 text-left">方案</th><th>商务模式</th><th>总投资</th><th>服务商净收益</th><th>业主节省</th><th>IRR</th><th>回本周期</th></tr></thead>
              <tbody>{results.map(({ scenario, result }) => <tr key={scenario.id} className="border-t border-slate-100 text-center"><td className="p-3 text-left font-semibold">{scenario.name}</td><td>{businessLabels[scenario.businessMode]}</td><td>{result.totalInvestment.toFixed(1)}万</td><td className="text-emerald-700 font-bold">{result.serviceProviderNet.toFixed(1)}万</td><td>{result.ownerSaving.toFixed(1)}万</td><td>{result.irr.toFixed(2)}%</td><td>{result.paybackPeriod.toFixed(2)}年</td></tr>)}</tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
};
