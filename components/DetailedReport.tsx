import React, { useEffect, useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import type { CombinedReportResult } from '../shared/reporting';
import { getProjectTypeLabel } from '../shared/utils/projectLoadProfiles';
import { getModuleReportChapter } from '../shared/reporting/chapters/registry';
import { PRODUCT_IDENTITY } from '../shared/config/productIdentity';
import {
    ComposedChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function DetailedReport({ onClose, report, autoPrint = false }: { onClose: () => void; report: CombinedReportResult; autoPrint?: boolean }) {
    const { projectBaseInfo, modules } = useProject();
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        window.print();
    };

    useEffect(() => {
        if (!autoPrint) return;
        const originalTitle = document.title;
        document.title = `${projectBaseInfo.name}_${report.scenarioName}`;
        const timer = window.setTimeout(() => {
            window.print();
            document.title = originalTitle;
        }, 900);
        return () => { window.clearTimeout(timer); document.title = originalTitle; };
    }, [autoPrint, projectBaseInfo.name, report.scenarioName]);

    const activeModules = report.modules.map(result => ({
        ...modules[result.moduleId],
        investment: result.metrics.investment,
        yearlySaving: result.metrics.firstYearNetBenefit,
        reportResult: result
    }));
    const chapterOrder: Record<string, number> = { 'retrofit-solar': 2, 'retrofit-storage': 3 };
    const registeredChapters = report.modules.flatMap(result => {
        const definition = getModuleReportChapter(result.moduleId);
        const module = modules[result.moduleId];
        return definition && module ? [{ definition, module, result }] : [];
    }).sort((a, b) => (chapterOrder[a.result.moduleId] || 99) - (chapterOrder[b.result.moduleId] || 99));
    const genericModules = activeModules.filter(module => !getModuleReportChapter(module.id));
    const totalInvestment = report.systemMetrics.investment;
    const totalSaving = report.combinedAnnualBenefit;
    let cumulative = 0;
    const cashFlowData = report.systemMetrics.cashFlows.map((net, year) => {
        cumulative += net;
        return {
            year,
            net: Number(net.toFixed(2)),
            cumulative: Number(cumulative.toFixed(2)),
        };
    });

    const projectIRR = report.systemMetrics.irr;
    const leveredIRR = report.participantLedgers.find(ledger => ledger.role === 'owner')?.metrics.irr || 0;

    // Chart data for first 15 years to fit nicely
    const chartData = cashFlowData.slice(1, 16);

    const printStyle = `
@media print {
  html, body {
    height: auto !important;
    overflow: visible !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .fixed {
    position: static !important;
    height: auto !important;
    overflow: visible !important;
  }
  .overflow-y-auto {
    overflow: visible !important;
    height: auto !important;
    display: block !important;
  }
  .print-container {
    margin: 0 !important;
    padding: 0 !important;
    width: 210mm !important;
    box-shadow: none !important;
  }
  .page-break {
    page-break-after: always !important;
    break-after: page !important;
    display: block;
    height: 0;
  }
  tr, .page-break-inside-avoid {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
}
`;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col print:bg-white print:static print:block">
            <style>{printStyle}</style>
            {/* Action Bar (Not printed) */}
            <div className="h-16 bg-slate-800 flex items-center justify-between px-6 shrink-0 print:hidden text-white shadow-md">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors flex items-center justify-center">
                        <span className="material-icons text-xl">close</span>
                    </button>
                    <div>
                        <h2 className="font-bold text-lg leading-tight">完整版深度报告 (Detailed Report)</h2>
                        <span className="text-[10px] text-slate-400">支持 25 年期现金流表与 BOM 投资拆解</span>
                    </div>
                </div>
                <button
                    onClick={handlePrint}
                    className="bg-primary hover:bg-primary-hover px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-primary/30"
                >
                    <span className="material-icons text-sm">print</span> 打印完整报告 (A4)
                </button>
            </div>

            {/* A4 Canvas Area */}
            <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-200 print:bg-white print:p-0 print:block print:overflow-visible">
                <div
                    ref={printRef}
                    className="bg-white shadow-2xl print:shadow-none mx-auto print:mx-0 print:w-full print:block print-container relative"
                    style={{
                        width: '210mm',
                    }}
                >
                    {/* PAGE 1: Executive Summary */}
                    <div className="p-[13mm] min-h-[297mm] print:min-h-0 flex flex-col">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-7 mb-5 shadow-lg shadow-blue-900/10">
                            <div className="flex items-start justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 text-blue-100 text-xs font-bold tracking-widest uppercase mb-3"><span className="material-icons text-lg">assessment</span> ZERO CARBON PROJECT REPORT</div>
                                    <h1 className="text-3xl font-black tracking-tight leading-tight">{projectBaseInfo.name || '未命名项目'}</h1>
                                    <p className="text-lg font-bold text-blue-100 mt-2">{report.scenarioName} · 收益评估与推荐方案</p>
                                </div>
                                <div className="text-right shrink-0 border-l border-white/20 pl-5"><div className="text-sm font-black">{PRODUCT_IDENTITY.shortName} {PRODUCT_IDENTITY.version}</div><div className="text-xs text-blue-100 mt-1">完整版项目书</div></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-white/20 text-xs">
                                <div><span className="text-blue-200 block">项目类型</span><strong>{getProjectTypeLabel(projectBaseInfo.type)}</strong></div>
                                <div><span className="text-blue-200 block">项目地点</span><strong>{projectBaseInfo.province || '待确认'} {projectBaseInfo.city || ''}</strong></div>
                                <div><span className="text-blue-200 block">生成时间</span><strong>{new Date().toLocaleDateString('zh-CN')}</strong></div>
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-3"><span className="material-icons text-blue-600">insights</span>一、核心结论与收益指标</h3>

                        {/* Executive Summary stats */}
                        <div className="grid grid-cols-5 gap-4 mb-6">
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 p-4 rounded-xl">
                                <div className="text-xs text-slate-500 mb-1">总投资 (CAPEX)</div>
                                <div className="text-lg font-bold text-slate-800 whitespace-nowrap">¥ {totalInvestment.toFixed(2)} <span className="text-[10px] font-normal text-slate-500">万</span></div>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-50 to-green-100 border border-emerald-100 p-4 rounded-xl">
                                <div className="text-xs text-emerald-600 mb-1">首年收益预测</div>
                                <div className="text-lg font-bold text-emerald-700 whitespace-nowrap">¥ {totalSaving.toFixed(2)} <span className="text-[10px] font-normal text-emerald-600">万</span></div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-100 p-4 rounded-xl">
                                <div className="text-xs text-blue-600 mb-1">动态投资回收期</div>
                                <div className="text-lg font-bold text-blue-700 whitespace-nowrap">{report.systemMetrics.paybackPeriod.toFixed(2)} <span className="text-[10px] font-normal text-blue-600">年</span></div>
                            </div>
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-100 p-4 rounded-xl">
                                <div className="text-xs text-purple-600 mb-1">项目全投资 IRR</div>
                                <div className="text-lg font-bold text-purple-700 whitespace-nowrap">~{projectIRR.toFixed(1)} <span className="text-[10px] font-normal text-purple-600">%</span></div>
                            </div>
                            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-100 p-4 rounded-xl">
                                <div className="text-xs text-indigo-600 mb-1">业主侧 IRR</div>
                                <div className="text-lg font-bold text-indigo-700 whitespace-nowrap">~{leveredIRR.toFixed(1)} <span className="text-[10px] font-normal text-indigo-600">%</span></div>
                            </div>
                        </div>

                        {/* Financial Chart */}
                        <div className="mb-6 flex-1">
                            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-3"><span className="material-icons text-blue-600">show_chart</span>二、投资回报与累计现金流</h3>
                            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm h-[210px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="year" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={val => `¥${val}万`} />
                                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                                        <Bar yAxisId="left" dataKey="net" name="当年净现金流" fill="#3B82F6" radius={[2, 2, 0, 0]} maxBarSize={40} />
                                        <Line yAxisId="right" type="monotone" dataKey="cumulative" name="累计净现金流" stroke="#10B981" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* BOM Breakdown */}
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3"><span className="material-icons text-blue-600">settings</span>三、推荐方案与投资配置</h3>
                            <div className="overflow-hidden rounded-xl border border-slate-200">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-100 text-slate-600 font-medium">
                                        <tr>
                                            <th className="px-4 py-3">系统模块</th>
                                            <th className="px-4 py-3">核心配置策略</th>
                                            <th className="px-4 py-3 text-right">预计投资 (万)</th>
                                            <th className="px-4 py-3 text-right">首年收益 (万)</th>
                                            <th className="px-4 py-3 text-right">占比</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {activeModules.map((m, i) => (
                                            <tr key={i} className="bg-white">
                                                <td className="px-4 py-3 font-medium text-slate-800">{m.name}</td>
                                                <td className="px-4 py-3 text-slate-500 text-xs">{m.strategy || '综合模式'}</td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-700">{(Number(m.investment) || 0).toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right font-mono text-emerald-600">{(Number(m.yearlySaving) || 0).toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right text-xs text-slate-400">{totalInvestment > 0 ? ((Number(m.investment) || 0) / totalInvestment * 100).toFixed(1) : '0.0'}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                                        <tr>
                                            <td colSpan={2} className="px-4 py-3 text-slate-800">合计总计</td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-800">{totalInvestment.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right font-mono text-emerald-600">{totalSaving.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right">100%</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* TABLE OF CONTENTS */}
                    <div className="p-[15mm] min-h-[297mm] bg-white">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-7 mb-8"><div className="text-xs font-bold tracking-[0.25em] text-blue-100">CONTENTS</div><h2 className="text-3xl font-black mt-2">完整项目书目录</h2><p className="text-sm text-blue-100 mt-2">各板块章节与单板块完整版共用同一数据和排版组件</p></div>
                        <div className="space-y-3">
                            {[
                                { number: '01', title: '项目汇总与核心收益结论', note: '系统投资、联合收益、IRR与推荐方案' },
                                ...registeredChapters.map(item => ({ number: String(chapterOrder[item.result.moduleId]).padStart(2, '0'), title: item.definition.title, note: item.result.investmentMode })),
                                { number: '04', title: '板块联动与协同收益', note: '物理调度、反事实增量和参与方账本' },
                                { number: '05', title: '系统25年合并现金流', note: '各板块独立收益、协同增量与全周期汇总' },
                                { number: '06', title: '其他板块与统一风险提示', note: '通用模块参数、测算依据和风险边界' },
                            ].map(item => <div key={`${item.number}-${item.title}`} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">{item.number}</div><div className="flex-1"><div className="text-base font-black text-slate-900">{item.title}</div><div className="text-xs text-slate-500 mt-1">{item.note}</div></div><span className="material-icons text-slate-300">arrow_forward</span></div>)}
                        </div>
                        <div className="mt-10 rounded-xl border border-indigo-100 bg-indigo-50 p-5 text-xs text-indigo-800">章节口径：板块章节展示独立配置与独立收益；光储协同增量只在联合章节确认，系统合并现金流不重复计入内部结算。</div>
                        <div className="page-break" />
                    </div>

                    {/* REGISTERED NATIVE MODULE CHAPTERS */}
                    {registeredChapters.map(({ definition, module, result }) => {
                        const Chapter = definition.component;
                        return <Chapter key={definition.moduleId} module={module} result={result} report={report} projectBaseInfo={projectBaseInfo} />;
                    })}

                    {/* PAGE 3: Interaction and stakeholder ledgers */}
                    <div className="p-[15mm] min-h-[297mm] bg-white pt-[20mm]">
                        <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2 border-b border-slate-100 pb-3">
                            <span className="material-icons text-blue-600">account_tree</span>
                            四、板块联动与参与方收益账本
                        </h3>
                        <p className="text-xs text-slate-500 mb-6">物理联动决定系统创造的价值，投资方式与合同条款决定价值在各参与方之间的分配。</p>

                        {report.activePhysicalScenario && report.activePhysicalScenario.typicalDay.length > 0 && (
                            <div className="mb-7 rounded-xl border border-slate-200 bg-slate-50 p-4 page-break-inside-avoid">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-800">典型日光储运行策略</h4>
                                        <p className="text-[10px] text-slate-500 mt-1">光伏优先供项目负荷，余电充入储能；储能在后续负荷时段释放。</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-right shrink-0">
                                        <span className="text-slate-500">年光伏发电 <strong className="text-amber-600">{(report.activePhysicalScenario.annualPvGenerationKwh / 10000).toFixed(2)}万kWh</strong></span>
                                        <span className="text-slate-500">光伏消纳率 <strong className="text-emerald-600">{report.activePhysicalScenario.pvSelfConsumptionRate.toFixed(1)}%</strong></span>
                                        <span className="text-slate-500">年储能充电 <strong className="text-blue-600">{(report.activePhysicalScenario.annualStorageChargeKwh / 10000).toFixed(2)}万kWh</strong></span>
                                        <span className="text-slate-500">年储能放电 <strong className="text-indigo-600">{(report.activePhysicalScenario.annualStorageDischargeKwh / 10000).toFixed(2)}万kWh</strong></span>
                                    </div>
                                </div>
                                <div className="h-[225px] bg-white rounded-lg border border-slate-100 p-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={report.activePhysicalScenario.typicalDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                            <XAxis dataKey="hour" tick={{ fontSize: 9 }} tickFormatter={hour => `${hour}:00`} />
                                            <YAxis tick={{ fontSize: 9 }} tickFormatter={value => `${value}kW`} />
                                            <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} formatter={(value: number) => `${Number(value).toFixed(1)} kW`} />
                                            <Legend wrapperStyle={{ fontSize: '10px' }} />
                                            <Line type="monotone" dataKey="baseLoad" name="项目负荷" stroke="#475569" strokeWidth={2} dot={false} />
                                            <Line type="monotone" dataKey="pvGeneration" name="光伏出力" stroke="#EAB308" strokeWidth={2.5} dot={false} />
                                            <Bar dataKey="storageCharge" name="储能充电" fill="#3B82F6" maxBarSize={13} />
                                            <Bar dataKey="storageDischarge" name="储能放电" fill="#10B981" maxBarSize={13} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        <div className="mb-7">
                            <h4 className="text-sm font-bold text-slate-700 mb-3">已识别的物理关系</h4>
                            <div className="flex flex-wrap gap-2">
                                {report.relationshipLabels.length > 0 ? report.relationshipLabels.map(label => (
                                    <span key={label} className="px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-100 text-xs text-indigo-700">{label}</span>
                                )) : <span className="text-xs text-slate-400">当前组合未识别额外物理联动，按独立结果汇总。</span>}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4"><div className="text-xs text-slate-500">独立收益合计</div><div className="text-xl font-black text-slate-800 mt-1">¥{report.standaloneAnnualBenefit.toFixed(3)}万</div></div>
                            <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4"><div className="text-xs text-indigo-600">联动增量收益</div><div className="text-xl font-black text-indigo-700 mt-1">¥{report.interactionAnnualBenefit.toFixed(3)}万</div></div>
                            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4"><div className="text-xs text-emerald-600">联合首年收益</div><div className="text-xl font-black text-emerald-700 mt-1">¥{report.combinedAnnualBenefit.toFixed(3)}万</div></div>
                        </div>

                        {report.interactions.length > 0 && <div className="mb-8 overflow-hidden rounded-xl border border-slate-200">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-800 text-white"><tr><th className="text-left px-4 py-3">协同收益项目</th><th className="text-right px-4 py-3">年增量价值（万元）</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">{report.interactions.map(item => <tr key={item.id}><td className="px-4 py-3 text-slate-700">{item.label}</td><td className={`px-4 py-3 text-right font-mono font-bold ${item.annualValue >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{item.annualValue.toFixed(3)}</td></tr>)}</tbody>
                            </table>
                        </div>}

                        <h4 className="text-sm font-bold text-slate-700 mb-3">参与方25年财务结果</h4>
                        <div className="overflow-hidden rounded-xl border border-slate-200 mb-6">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-100 text-slate-600"><tr><th className="text-left px-3 py-3">参与方</th><th className="text-right px-3 py-3">承担投资</th><th className="text-right px-3 py-3">首年净收益</th><th className="text-right px-3 py-3">NPV</th><th className="text-right px-3 py-3">IRR</th><th className="text-right px-3 py-3">回收期</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">{report.participantLedgers.map(ledger => <tr key={ledger.id}><td className="px-3 py-3 font-bold text-slate-800">{ledger.name}</td><td className="px-3 py-3 text-right">{ledger.investment.toFixed(3)}</td><td className="px-3 py-3 text-right text-emerald-600">{ledger.firstYearNetBenefit.toFixed(3)}</td><td className="px-3 py-3 text-right">{ledger.metrics.npv.toFixed(3)}</td><td className="px-3 py-3 text-right text-purple-600">{ledger.metrics.irr.toFixed(2)}%</td><td className="px-3 py-3 text-right">{ledger.metrics.paybackPeriod.toFixed(2)}年</td></tr>)}</tbody>
                            </table>
                        </div>
                        <div className="page-break" />
                    </div>

                    {/* SYSTEM 25-YEAR CASH FLOW */}
                    <div className="p-[12mm] min-h-[297mm] bg-white pt-[12mm]">
                        <h3 className="text-xl font-black text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-3"><span className="material-icons text-blue-600">table_chart</span>五、25年项目生命周期现金流明细</h3>
                        <div className="text-[10px] text-slate-500 mb-3 flex gap-4"><span>* 现金流已包含各模块运维、衰减、设备更换及合同结算影响</span><span>折现率 = {(report.systemMetrics.discountRate * 100).toFixed(1)}%</span></div>
                        <div className="rounded-lg border border-slate-200 overflow-hidden text-[9px]"><table className="w-full text-right"><thead className="bg-blue-700 text-white font-medium"><tr><th className="px-2 py-1.5 text-center w-16">年份</th><th className="px-2 py-1.5 border-l border-blue-600">初始投资</th><th className="px-2 py-1.5 border-l border-blue-600">当期净现金流</th><th className="px-2 py-1.5 border-l border-blue-600">累计净现金流</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{cashFlowData.map(row => <tr key={row.year} className={row.year % 5 === 0 && row.year > 0 ? 'bg-blue-50/50 font-medium' : 'bg-white'}><td className="px-2 py-1 text-center text-slate-500">{row.year === 0 ? '建设期' : `第 ${row.year} 年`}</td><td className="px-2 py-1 border-l border-slate-100 text-slate-700">{row.year === 0 ? (-totalInvestment).toFixed(2) : '-'}</td><td className="px-2 py-1 border-l border-slate-100 font-bold font-mono text-slate-800">{row.net.toFixed(2)}</td><td className={`px-2 py-1 border-l border-slate-100 font-bold font-mono ${row.cumulative >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{row.cumulative.toFixed(2)}</td></tr>)}</tbody></table></div>
                        <div className="page-break" />
                    </div>

                    {/* PAGE 4: Module Details Breakdown */}
                    <div className="p-[15mm] min-h-[297mm] bg-white pt-[20mm]">
                        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                            <span className="material-icons text-blue-600">analytics</span>
                            六、其他板块与统一风险提示
                        </h3>
                        {genericModules.length > 0 ? <div className="text-xs text-slate-500 mb-8 max-w-3xl">
                            以下为尚未接入原生完整章节的其他有效板块，列出关键工程参数与该板块独立财务模型；其单项效益已计入系统现金流。
                        </div> : <div className="text-xs text-slate-500 mb-8 rounded-xl border border-blue-100 bg-blue-50 p-4">
                            本次选择的光伏、储能板块已在前文使用原生完整章节展示，本页仅统一披露测算依据与风险边界。
                        </div>}

                        <div className="space-y-6">
                            {genericModules.map((m, i) => {
                                let details: { label: string; value: string | number }[] = [];
                                if (m.id === 'retrofit-solar') {
                                    details = [
                                        { label: '光伏覆盖面积', value: `${m.params?.simpleParams?.area || 0} ㎡` },
                                        { label: '预计日照时长', value: `${m.params?.advParams?.dailySunHours || 0} h/天` },
                                        { label: '系统综合效率', value: `${m.params?.advParams?.prValue || 0} %` },
                                        { label: '首年预估满发', value: `${Math.round(m.kpiPrimary?.value?.replace(/[^0-9.]/g, '') * m.params?.advParams?.dailySunHours * m.params?.advParams?.generationDays * (m.params?.advParams?.prValue / 100)) || 0} 度` },
                                    ];
                                } else if (m.id === 'retrofit-storage') {
                                    details = [
                                        { label: '储能设计功率', value: `${m.params?.basicParams?.power || 0} kW` },
                                        { label: '系统容量', value: `${m.params?.basicParams?.capacity || 0} kWh` },
                                        { label: '建议配储规模', value: m.params?.recommendation?.capacity ? `${m.params.recommendation.power} kW / ${m.params.recommendation.capacity} kWh` : '待负荷曲线重构' },
                                        { label: 'DOD放电深度', value: `${m.params?.advParams?.dod || 0} %` },
                                        { label: '系统建设单价', value: `${m.params?.basicParams?.unitCost || 0} 元/kWh` }
                                    ];
                                } else if (m.id === 'retrofit-hvac') {
                                    details = [
                                        { label: '改造覆盖面积', value: `${m.params?.simpleParams?.area || 0} ㎡` },
                                        { label: '原有机组冷却COP', value: m.params?.advParams?.currentCoolingCop || 0 },
                                        { label: '新磁悬浮机组COP', value: m.params?.advParams?.newCoolingCop || 0 },
                                        { label: '预估综合节电率', value: `${m.params?.advParams?.energySavingRate || 0} %` }
                                    ];
                                } else if (m.id === 'retrofit-lighting') {
                                    details = [
                                        { label: '改造覆盖面积', value: `${m.params?.simpleParams?.area || 0} ㎡` },
                                        { label: '原灯具功率密度', value: `${m.params?.advParams?.currentPowerDensity || 0} W/㎡` },
                                        { label: '新灯具功率密度', value: `${m.params?.advParams?.newPowerDensity || 0} W/㎡` },
                                        { label: '日均点亮时长', value: `${m.params?.advParams?.dailyHours || 0} 小时` }
                                    ];
                                } else if (m.id === 'retrofit-water') {
                                    details = [
                                        { label: '当前加热源形式', value: m.params?.simpleParams?.currentType === 'electric' ? '电锅炉' : m.params?.simpleParams?.currentType === 'gas' ? '燃气锅炉' : '空气源热泵' },
                                        { label: '新热泵制热COP', value: m.params?.advParams?.newHeatingCop || 0 },
                                        { label: '目标供水温度', value: `${m.params?.advParams?.targetTemp || 0} ℃` },
                                        { label: '日均计划用水', value: `${m.params?.simpleParams?.dailyUsage || 0} 吨` }
                                    ];
                                } else if (m.id === 'retrofit-ev') {
                                    details = [
                                        { label: '投资运营方式', value: m.reportResult.investmentMode },
                                        { label: '数据模式', value: m.params?.mode === 'precise' ? '精确估值' : '快速测算' },
                                    ];
                                } else {
                                    details = [
                                        { label: '核心指征', value: m.kpiPrimary?.value || 'N/A' }
                                    ];
                                }

                                const metrics = m.reportResult.metrics;

                                return (
                                    <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden page-break-inside-avoid shadow-sm mb-6">
                                        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                                            <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <span className="material-icons text-primary text-base">extension</span>
                                                {m.name}
                                            </h4>
                                            <span className="text-xs font-bold text-emerald-600 tracking-wider">
                                                投资方式：{m.reportResult.investmentMode}
                                            </span>
                                        </div>
                                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Financial Panel */}
                                            <div>
                                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-1"><span className="material-icons text-sm">payments</span> 板块级财务模型</h5>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-end border-b border-slate-50 pb-2">
                                                        <span className="text-sm text-slate-500">专项投资额 (CAPEX)</span>
                                                        <span className="text-base font-bold text-slate-800">¥{(Number(m.investment) || 0).toFixed(2)} <span className="text-xs font-normal text-slate-500">万</span></span>
                                                    </div>
                                                    <div className="flex justify-between items-end border-b border-slate-50 pb-2">
                                                        <span className="text-sm text-slate-500">预期首年净收益</span>
                                                        <span className="text-base font-bold text-emerald-600">¥{(Number(m.yearlySaving) || 0).toFixed(2)} <span className="text-xs font-normal text-emerald-600/70">万</span></span>
                                                    </div>
                                                    <div className="flex justify-between items-end">
                                                        <span className="text-sm text-slate-500">单体动态回收期</span>
                                                        <span className="text-base font-bold text-blue-600">{Number.isFinite(metrics.paybackPeriod) ? metrics.paybackPeriod.toFixed(2) : '-'} <span className="text-xs font-normal text-blue-600/70">年</span></span>
                                                    </div>
                                                    <div className="flex justify-between items-end border-t border-slate-100 pt-2">
                                                        <span className="text-sm text-slate-500">25年净现值 (NPV)</span>
                                                        <span className={`text-base font-bold ${metrics.npv > 0 ? 'text-emerald-600' : 'text-red-500'}`}>¥{metrics.npv.toFixed(2)} <span className="text-xs font-normal opacity-70">万</span></span>
                                                    </div>
                                                    <div className="flex justify-between items-end">
                                                        <span className="text-sm text-slate-500">单模块 IRR</span>
                                                        <span className="text-base font-bold text-purple-600">{metrics.irr.toFixed(2)}%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Engineering Panel */}
                                            <div>
                                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-1"><span className="material-icons text-sm">settings_suggest</span> 核心设备/工程参数</h5>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 col-span-2 sm:col-span-1">
                                                        <div className="text-[10px] text-primary/70 font-bold uppercase mb-1">{m.kpiPrimary?.label}</div>
                                                        <div className="text-base font-black text-primary">{m.kpiPrimary?.value}</div>
                                                    </div>
                                                    {details.map((d, idx) => (
                                                        <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100 col-span-2 sm:col-span-1">
                                                            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">{d.label}</div>
                                                            <div className="text-sm font-bold text-slate-800">{d.value}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 page-break-inside-avoid">
                            <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2"><span className="material-icons text-base">shield</span>测算依据与风险提示</h4>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3 text-[11px] text-amber-900/80">
                                {[...report.assumptions, ...report.warnings].map((item, index) => <p key={`${item}-${index}`} className="flex items-start gap-1"><span>•</span><span>{item}</span></p>)}
                            </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
                            <p>本报告由{PRODUCT_IDENTITY.fullName}{PRODUCT_IDENTITY.version}自动生成</p>
                            <p className="mt-1">数据仅供参考，不作为最终投资承诺及法律依据。</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
