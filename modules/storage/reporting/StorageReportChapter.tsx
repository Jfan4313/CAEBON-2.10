import React from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ModuleReportChapterProps } from '../../../shared/reporting/chapters/types';
import { ChapterHeader, ChapterPage, MetricCard, ReportFooter, SectionTitle } from '../../../shared/reporting/chapters/ChapterLayout';
import { buildFinancialMetrics } from '../../../shared/reporting/financial';
import type { StorageAdvParams, StorageBasicParams, StorageInvestmentConfig } from '../types';

interface StorageChapterParams {
  dispatchMode?: 'pv_surplus' | 'hybrid';
  basicParams?: Partial<StorageBasicParams>;
  advParams?: Partial<StorageAdvParams>;
  investmentConfig?: Partial<StorageInvestmentConfig>;
  recommendation?: { power?: number; capacity?: number; dailySurplusKwh?: number; usableShiftKwh?: number; deliverableEnergyKwh?: number; currentCaptureRate?: number; requestedCycles?: number; effectiveCycles?: number; cycleModeReason?: string; basis?: string };
}

const money = (value: number) => `¥${Number(value || 0).toFixed(2)}万`;

export const StorageReportChapter: React.FC<ModuleReportChapterProps> = ({ module, result, report }) => {
  const params = (module.params || {}) as StorageChapterParams;
  const basic = { power: 261, capacity: 522, unitCost: 1200, ...(params.basicParams || {}) };
  const advanced = { dod: 90, rte: 88, cycles: 6000, degradation: 1.5, auxPower: 1.5, ...(params.advParams || {}) };
  const investmentMode = params.investmentConfig?.mode === 'emc' ? '合同能源管理（EMC）' : '业主自投';
  const operatingScenario = report.counterfactuals.ps || report.activePhysicalScenario || report.counterfactuals.s;
  const interaction = report.interactions.find(item => item.id === 'solar_storage');
  const collaborationValue = Number(interaction?.annualValue || 0);
  const chargeKwh = Number(operatingScenario?.annualStorageChargeKwh || 0);
  const dischargeKwh = Number(operatingScenario?.annualStorageDischargeKwh || 0);
  const captureRate = Number(params.recommendation?.currentCaptureRate || 0);
  const recommendationText = params.recommendation?.capacity
    ? `${Number(params.recommendation.power || 0).toFixed(0)} kW / ${Number(params.recommendation.capacity).toFixed(0)} kWh`
    : '待15分钟负荷复核';
  const cashFlow = result.metrics.cashFlows.reduce<Array<{ year: number; annual: number; cumulative: number }>>((rows, value, year) => {
    rows.push({ year, annual: Number(value.toFixed(3)), cumulative: Number(((rows.at(-1)?.cumulative || 0) + value).toFixed(3)) });
    return rows;
  }, []);
  const sensitivityCases = [
    { name: '储能成本-15%', investment: result.metrics.investment * 0.85, benefit: collaborationValue },
    { name: '当前方案', investment: result.metrics.investment, benefit: collaborationValue },
    { name: '储能成本+15%', investment: result.metrics.investment * 1.15, benefit: collaborationValue },
    { name: '可用余电-20%', investment: result.metrics.investment, benefit: collaborationValue * 0.8 },
    { name: '可用余电+20%', investment: result.metrics.investment, benefit: collaborationValue * 1.2 },
    { name: '效率-5pct', investment: result.metrics.investment, benefit: advanced.rte > 5 ? collaborationValue * (advanced.rte - 5) / advanced.rte : 0 },
  ].map(item => {
    const metrics = buildFinancialMetrics({ investment: item.investment, firstYearBenefit: item.benefit, horizonYears: 25, discountRate: report.systemMetrics.discountRate * 100, annualDegradation: advanced.degradation, replacementYears: [12, 24], replacementCostRate: 60 });
    return { ...item, irr: metrics.irr, payback: metrics.paybackPeriod };
  });

  return <>
    <ChapterPage>
      <ChapterHeader number="03" icon="battery_charging_full" title="工商业储能完整方案" subtitle="建议配储、充放电策略、SOC约束与设备全生命周期" tone="emerald" />
      <div className="grid grid-cols-4 gap-3 mb-6"><MetricCard label="额定功率" value={`${basic.power.toFixed(0)} kW`} tone="blue" /><MetricCard label="系统容量" value={`${basic.capacity.toFixed(0)} kWh`} tone="emerald" /><MetricCard label="建议配储规模" value={recommendationText} tone="amber" /><MetricCard label="投资方式" value={investmentMode} tone="violet" /></div>
      <SectionTitle icon="tune">技术配置与运行边界</SectionTitle>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          ['运行策略', params.dispatchMode === 'hybrid' ? '光储＋峰谷综合优化' : '仅吸收光伏余电'],
          ['放电深度 DOD', `${advanced.dod.toFixed(1)}%`],
          ['往返效率 RTE', `${advanced.rte.toFixed(1)}%`],
          ['循环寿命', `${advanced.cycles.toLocaleString()}次`],
          ['年衰减率', `${advanced.degradation.toFixed(2)}%`],
          ['辅助功率', `${advanced.auxPower.toFixed(1)} kW`],
          ['系统单价', `${basic.unitCost.toFixed(0)} 元/kWh`],
          ['当前余电覆盖率', captureRate > 0 ? `${captureRate.toFixed(1)}%` : '待曲线复核'],
        ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="text-[10px] font-bold text-slate-400">{label}</div><div className="text-sm font-black text-slate-800 mt-1">{value}</div></div>)}
      </div>
      <SectionTitle icon="monitoring">典型日充放电与SOC策略</SectionTitle>
      <div className="h-[305px] rounded-xl border border-slate-200 bg-white p-3"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={operatingScenario?.typicalDay || []}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="hour" tickFormatter={hour => `${hour}:00`} tick={{ fontSize: 9 }} /><YAxis yAxisId="power" tick={{ fontSize: 9 }} /><YAxis yAxisId="soc" orientation="right" domain={[0, 100]} tick={{ fontSize: 9 }} /><Tooltip formatter={(value: number, name: string) => [name === 'SOC' ? `${Number(value).toFixed(1)}%` : `${Number(value).toFixed(1)}kW`, name]} /><Legend /><Line yAxisId="power" dataKey="pvGeneration" name="光伏出力" stroke="#eab308" strokeWidth={2.5} dot={false} /><Line yAxisId="power" dataKey="baseLoad" name="项目负荷" stroke="#475569" strokeWidth={2} dot={false} /><Bar yAxisId="power" dataKey="storageCharge" name="储能充电" fill="#3b82f6" maxBarSize={14} /><Bar yAxisId="power" dataKey="storageDischarge" name="储能放电" fill="#10b981" maxBarSize={14} /><Line yAxisId="soc" dataKey="soc" name="SOC" stroke="#8b5cf6" strokeWidth={2} dot={false} /></ComposedChart></ResponsiveContainer></div>
      <div className="grid grid-cols-3 gap-3 mt-4 text-xs"><div className="rounded-lg bg-blue-50 border border-blue-100 p-3"><span className="text-blue-600">年储能充电</span><strong className="block text-blue-800 text-base">{(chargeKwh / 10000).toFixed(2)}万kWh</strong></div><div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3"><span className="text-emerald-600">年储能放电</span><strong className="block text-emerald-800 text-base">{(dischargeKwh / 10000).toFixed(2)}万kWh</strong></div><div className="rounded-lg bg-amber-50 border border-amber-100 p-3"><span className="text-amber-600">建议依据</span><strong className="block text-amber-800 mt-1">{params.recommendation?.basis || '项目负荷与所在地光伏曲线'}</strong></div></div>
      <ReportFooter label="储能板块 · 配置与调度策略" />
    </ChapterPage>

    <ChapterPage>
      <ChapterHeader number="03 · 2" icon="trending_up" title="储能投资回报与敏感性" subtitle="独立收益与光储协同价值分账展示，不重复计算" tone="emerald" />
      <div className="grid grid-cols-4 gap-3 mb-6"><MetricCard label="储能专项投资" value={money(result.metrics.investment)} /><MetricCard label="独立首年收益" value={money(result.metrics.firstYearNetBenefit)} tone="emerald" /><MetricCard label="光储协同增量" value={money(collaborationValue)} tone="blue" /><MetricCard label="独立回收期" value={result.metrics.firstYearNetBenefit > 0 ? `${result.metrics.paybackPeriod.toFixed(2)}年` : '依赖光伏协同'} tone="violet" /></div>
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 mb-6 text-xs text-indigo-900"><strong>收益边界：</strong>当前储能采用光伏余电专用策略时，无光伏场景不产生独立套利收益；光伏余电转存形成的价值只在联合章节和上方“光储协同增量”中确认。</div>
      <SectionTitle icon="show_chart">储能独立25年现金流</SectionTitle>
      <div className="h-[180px] rounded-xl border border-slate-200 bg-white p-3 mb-4"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={cashFlow.slice(0, 26)}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" tick={{ fontSize: 9 }} /><YAxis yAxisId="left" tick={{ fontSize: 9 }} /><YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} /><Tooltip formatter={(value: number) => `${Number(value).toFixed(2)}万元`} /><Legend /><Bar yAxisId="left" dataKey="annual" name="年度净现金流" fill="#10b981" maxBarSize={17} /><Line yAxisId="right" dataKey="cumulative" name="累计现金流" stroke="#2563eb" strokeWidth={3} dot={false} /></ComposedChart></ResponsiveContainer></div>
      <SectionTitle icon="ssid_chart">关键变量敏感性</SectionTitle>
      <div className="overflow-hidden rounded-xl border border-slate-200 mb-4"><table className="w-full text-[11px]"><thead className="bg-emerald-700 text-white"><tr><th className="text-left p-2">情景</th><th className="text-right p-2">投资额</th><th className="text-right p-2">协同年价值</th><th className="text-right p-2">IRR</th><th className="text-right p-2">动态回收期</th></tr></thead><tbody className="divide-y divide-slate-100">{sensitivityCases.map(item => <tr key={item.name} className={item.name === '当前方案' ? 'bg-emerald-50' : ''}><td className="p-2 font-bold">{item.name}</td><td className="p-2 text-right">{money(item.investment)}</td><td className="p-2 text-right">{money(item.benefit)}</td><td className="p-2 text-right">{item.irr.toFixed(2)}%</td><td className="p-2 text-right">{item.payback.toFixed(2)}年</td></tr>)}</tbody></table></div>
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-900"><strong>设备与合同风险：</strong>建议在第12年评估电芯更换，第24年按测算口径再次更换；正式投资前使用15分钟负荷和光伏数据复核容量，同时确认消防、并网、场地、质保、衰减保证及协同收益结算合同。</div>
      <div className="[&_footer]:mt-4"><ReportFooter label="储能板块 · 财务与风险" /></div>
    </ChapterPage>
  </>;
};

export default StorageReportChapter;
