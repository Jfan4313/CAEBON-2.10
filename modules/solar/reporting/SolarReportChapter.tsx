import React from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { calculateSolarMetrics } from '../hooks';
import { CABLE_BRANDS, DEFAULTS, INVERTER_BRANDS, MODULE_BRANDS, type SolarParamsState } from '../types';
import type { ModuleReportChapterProps } from '../../../shared/reporting/chapters/types';
import { ChapterHeader, ChapterPage, MetricCard, ReportFooter, SectionTitle } from '../../../shared/reporting/chapters/ChapterLayout';

const modeLabel: Record<string, string> = { epc: '业主自投（EPC）', emc: '合同能源管理（EMC）', financing: '融资建设', co_build: '股权共建' };
const money = (value: number) => `¥${Number(value || 0).toFixed(2)}万`;

export const SolarReportChapter: React.FC<ModuleReportChapterProps> = ({ module, result, report, projectBaseInfo }) => {
  const params = { ...DEFAULTS, ...(module.params as Partial<SolarParamsState>), simpleParams: { ...DEFAULTS.simpleParams, ...(module.params?.simpleParams || {}) }, advParams: { ...DEFAULTS.advParams, ...(module.params?.advParams || {}) } } as SolarParamsState;
  const selfRate = Number(params.effectiveSelfConsumptionRate ?? report.counterfactuals.p?.pvSelfConsumptionRate ?? 85);
  const longTerm = calculateSolarMetrics(params, selfRate);
  const scenario = report.counterfactuals.p;
  const cashFlow = result.metrics.cashFlows.reduce<Array<{ year: number; annual: number; cumulative: number }>>((rows, value, year) => {
    rows.push({ year, annual: Number(value.toFixed(3)), cumulative: Number(((rows.at(-1)?.cumulative || 0) + value).toFixed(3)) });
    return rows;
  }, []);
  const sensitivityRates = [...new Set([Math.max(40, selfRate - 15), selfRate, Math.min(100, selfRate + 10)])];
  const sensitivity = sensitivityRates.map(rate => {
    const metrics = calculateSolarMetrics(params, rate);
    return { rate: `${rate.toFixed(0)}%`, firstYear: Number(metrics.yearlyDetails?.[0]?.netIncome || 0), lifecycle: Number(metrics.rev25Year || 0), payback: Number(metrics.paybackPeriod || 0) };
  });
  const solutions = params.solutions || [];
  const selectedSolutionId = params.selectedSolutionId || solutions[0]?.id;

  return <>
    <ChapterPage>
      <ChapterHeader number="02" icon="solar_power" title="分布式光伏完整方案" subtitle="推荐方案、工程配置、发电能力与投资边界" />
      <div className="grid grid-cols-4 gap-3 mb-6">
        <MetricCard label="拟装机容量" value={`${params.simpleParams.capacity.toFixed(1)} kWp`} tone="blue" />
        <MetricCard label="首年发电量" value={`${(scenario?.annualPvGenerationKwh || 0) / 10000 > 0 ? ((scenario?.annualPvGenerationKwh || 0) / 10000).toFixed(2) : longTerm.genYear1.toFixed(2)}万kWh`} tone="amber" />
        <MetricCard label="光伏自用比例" value={`${selfRate.toFixed(1)}%`} tone="emerald" />
        <MetricCard label="投资方式" value={modeLabel[params.simpleParams.investmentMode] || params.simpleParams.investmentMode} tone="violet" />
      </div>
      <SectionTitle icon="recommend">推荐方案配置</SectionTitle>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          ['安装面积', `${Number(params.simpleParams.area || 0).toLocaleString()} ㎡`],
          ['系统方式', params.simpleParams.operationMode === 'off_grid' ? '离网光伏＋配套储能' : (params.simpleParams.connectionType === 'high' ? '10kV高压并网' : '380V低压并网')],
          ['建造单价', `${params.simpleParams.epcPrice.toFixed(2)} 元/Wp`],
          ['日均等效日照', `${params.advParams.dailySunHours.toFixed(2)} h/天`],
          ['系统效率 PR', `${params.advParams.prValue.toFixed(1)}%`],
          ['方位角效率', `${params.advParams.azimuthEfficiency.toFixed(1)}%`],
          ['上网电价', params.simpleParams.operationMode === 'off_grid' ? '不适用（余电不出售）' : `${params.advParams.feedInTariff.toFixed(4)} 元/kWh`],
          ['项目地点', `${projectBaseInfo.province || ''} ${projectBaseInfo.city || ''}`],
        ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-4"><div className="text-[10px] font-bold text-slate-400">{label}</div><div className="text-base font-black text-slate-800 mt-1">{value}</div></div>)}
      </div>
      <SectionTitle icon="compare_arrows">备选方案对比</SectionTitle>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-xs"><thead className="bg-blue-600 text-white"><tr><th className="text-left p-3">方案</th><th className="text-left p-3">合作方式</th><th className="text-right p-3">容量</th><th className="text-right p-3">估算投资</th><th className="text-left p-3">核心配置</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{solutions.slice(0, 6).map(solution => {
            const capacity = Number(solution.capacity || params.simpleParams.capacity);
            const investment = capacity * Number(solution.epcPrice || params.simpleParams.epcPrice) / 10 + Number(solution.voltageUpgradeCost || 0);
            return <tr key={solution.id} className={solution.id === selectedSolutionId ? 'bg-emerald-50' : 'bg-white'}><td className="p-3 font-bold text-slate-800">{solution.name}{solution.id === selectedSolutionId && <span className="ml-2 text-[9px] text-emerald-700">推荐</span>}</td><td className="p-3">{modeLabel[solution.investmentMode] || solution.investmentMode}</td><td className="p-3 text-right">{capacity.toFixed(1)} kWp</td><td className="p-3 text-right">{money(investment)}</td><td className="p-3 text-slate-500">{MODULE_BRANDS[solution.brand]?.name} · {INVERTER_BRANDS[solution.inverterBrand]?.name} · {CABLE_BRANDS[solution.cableBrand]?.name}</td></tr>;
          })}</tbody>
        </table>
      </div>
      <ReportFooter label="光伏板块 · 方案与工程配置" />
    </ChapterPage>

    <ChapterPage>
      <ChapterHeader number="02 · 2" icon="payments" title="光伏投资回报与消纳分析" subtitle="板块独立现金流口径，不包含储能协同增量" />
      <div className="grid grid-cols-4 gap-3 mb-6"><MetricCard label="光伏专项投资" value={money(result.metrics.investment)} /><MetricCard label="首年独立收益" value={money(result.metrics.firstYearNetBenefit)} tone="emerald" /><MetricCard label="板块 IRR" value={`${result.metrics.irr.toFixed(2)}%`} tone="violet" /><MetricCard label="动态回收期" value={`${result.metrics.paybackPeriod.toFixed(2)}年`} tone="blue" /></div>
      <SectionTitle icon="show_chart">25年年度收益与累计现金流</SectionTitle>
      <div className="h-[270px] rounded-xl border border-slate-200 bg-white p-3 mb-6"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={cashFlow.slice(0, 26)}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" tick={{ fontSize: 10 }} /><YAxis yAxisId="left" tick={{ fontSize: 10 }} /><YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} /><Tooltip formatter={(value: number) => `${Number(value).toFixed(2)}万元`} /><Legend /><Bar yAxisId="left" dataKey="annual" name="年度净现金流" fill="#10b981" maxBarSize={18} /><Line yAxisId="right" dataKey="cumulative" name="累计现金流" stroke="#2563eb" strokeWidth={3} dot={false} /></ComposedChart></ResponsiveContainer></div>
      <SectionTitle icon="timeline">消纳率敏感性</SectionTitle>
      <div className="h-[230px] rounded-xl border border-slate-200 bg-slate-50 p-3 mb-5"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={sensitivity}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="rate" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(value: number, name: string) => [name === 'payback' ? `${Number(value).toFixed(2)}年` : `${Number(value).toFixed(2)}万元`, name]} /><Legend /><Bar dataKey="firstYear" name="首年净收益" fill="#10b981" maxBarSize={38} /><Line dataKey="lifecycle" name="全周期净收益" stroke="#2563eb" strokeWidth={3} /><Line dataKey="payback" name="回收期" stroke="#f59e0b" strokeWidth={2} /></ComposedChart></ResponsiveContainer></div>
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900"><strong>光伏风险控制：</strong>重点复核屋顶荷载与权属、并网批复、项目地日照、实际负荷曲线、电价政策、组件衰减、运维和消纳率。联合报告中的储能增量价值在后续光储联动章节单独确认。</div>
      <ReportFooter label="光伏板块 · 收益与敏感性" />
    </ChapterPage>
  </>;
};

export default SolarReportChapter;
