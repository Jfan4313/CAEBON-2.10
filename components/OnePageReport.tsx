import React, { useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import type { CombinedReportResult } from '../shared/reporting';
import { getProjectTypeLabel } from '../shared/utils/projectLoadProfiles';
import { PRODUCT_IDENTITY } from '../shared/config/productIdentity';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine,
    BarChart, Bar, Tooltip as RechartsTooltip, Legend, Cell, PieChart, Pie
} from 'recharts';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];

export default function OnePageReport({ onClose, report }: { onClose: () => void; report: CombinedReportResult }) {
    const { projectBaseInfo } = useProject();
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        window.print();
    };

    const activeModules = report.modules.map(module => ({
        ...module,
        investment: module.metrics.investment,
        yearlySaving: module.metrics.firstYearNetBenefit
    }));
    const totalInvestment = report.systemMetrics.investment;
    const totalSaving = report.combinedAnnualBenefit;
    const payback = report.systemMetrics.paybackPeriod;
    const projectIRR = report.systemMetrics.irr;
    const leveredIRR = report.participantLedgers.find(ledger => ledger.role === 'owner')?.metrics.irr || 0;

    // Simulate 10-year cash flow for chart
    let cumulative = 0;
    const cashFlowData = report.systemMetrics.cashFlows.slice(0, 11).map((value, year) => {
        cumulative += value;
        return { year, value, cumulative: Number(cumulative.toFixed(3)) };
    });

    // Data for Investment Donut
    const investmentData = activeModules.map(m => {
        const val = Number(m.investment) || 0;
        return {
            name: (m.name as string).replace('改造', ''),
            value: Number(val.toFixed(2))
        };
    }).filter(d => d.value > 0);

    // Data for Savings Bar 
    const savingsData = activeModules.map(m => ({
        name: m.name as string,
        value: Number(m.yearlySaving) || 0
    })).filter(d => d.value > 0);

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col print:static print:bg-white print:block print:overflow-visible print:h-auto">
            {/* Action Bar (Not printed) */}
            <div className="h-16 bg-slate-800 flex items-center justify-between px-6 shrink-0 print:hidden text-white shadow-md">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors flex items-center justify-center">
                        <span className="material-icons text-xl">close</span>
                    </button>
                    <div>
                        <h2 className="font-bold text-lg leading-tight">投资意向预览 (Teaser)</h2>
                        <span className="text-[10px] text-slate-400">一页式极致排版简报</span>
                    </div>
                </div>
                <button
                    onClick={handlePrint}
                    className="bg-primary hover:bg-primary-hover px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-primary/30"
                >
                    <span className="material-icons text-sm">print</span> 打印 / 保存 PDF
                </button>
            </div>

            {/* A4 Canvas Area */}
            <div className="flex-1 overflow-y-auto p-8 flex justify-center print:p-0 print:overflow-visible print:block print:h-auto bg-slate-200 print:bg-white custom-scrollbar">
                <div
                    ref={printRef}
                    className="bg-white shadow-2xl print:shadow-none mx-auto print:mx-0 print:w-full relative flex flex-col"
                    style={{
                        width: '210mm',
                        minHeight: '297mm',
                        padding: '15mm', // Margin for print
                    }}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 mb-6 shadow-lg shadow-blue-900/10">
                        <div className="flex items-start justify-between gap-5">
                            <div className="flex-1"><div className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mb-2">零碳规划及收益评估</div><h1 className="text-3xl font-extrabold tracking-tight leading-tight">{projectBaseInfo.name || '未命名零碳项目'}</h1><p className="text-sm font-bold text-blue-100 mt-2">{report.scenarioName} · 一页式决策简报</p></div>
                            <div className="text-right shrink-0"><div className="text-sm font-black">{PRODUCT_IDENTITY.shortName} {PRODUCT_IDENTITY.version}</div><div className="text-[10px] text-blue-100 mt-1">{new Date().toLocaleDateString('zh-CN')}</div></div>
                        </div>
                        <div className="flex items-center gap-5 mt-4 pt-3 border-t border-white/20 text-xs text-blue-50"><span>{getProjectTypeLabel(projectBaseInfo.type)}</span><span>{projectBaseInfo.province || '地点待定'} {projectBaseInfo.city || ''}</span><span>{projectBaseInfo.buildings?.reduce((acc: number, b: any) => acc + (b.area || 0), 0) || 0} m²</span></div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center gap-2"><span className="material-icons text-blue-600 text-base">insights</span>一、核心收益指标</h3>

                    {/* Core Financials */}
                    <div className="grid grid-cols-5 gap-4 mb-6">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-center items-center text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">预计总投资 (Capex)</span>
                            <div className="text-xl font-black text-slate-800">¥ {totalInvestment.toFixed(1)} <span className="text-xs font-normal text-slate-500">万</span></div>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex flex-col justify-center items-center text-center">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase mb-1">年度合并收益预测</span>
                            <div className="text-xl font-black text-emerald-700">¥ {totalSaving.toFixed(1)} <span className="text-xs font-normal text-emerald-600/60">万</span></div>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex flex-col justify-center items-center text-center">
                            <span className="text-[10px] font-bold text-blue-600 uppercase mb-1">静态投资回收期</span>
                            <div className="text-xl font-black text-blue-700">{payback.toFixed(1)} <span className="text-xs font-normal text-blue-600/60">年</span></div>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 flex flex-col justify-center items-center text-center">
                            <span className="text-[10px] font-bold text-purple-600 uppercase mb-1">项目全投资 IRR</span>
                            <div className="text-xl font-black text-purple-700">{projectIRR.toFixed(1)}<span className="text-xs font-normal text-purple-600/60">%</span></div>
                        </div>
                        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 flex flex-col justify-center items-center text-center">
                            <span className="text-[10px] font-bold text-indigo-600 uppercase mb-1">业主侧 IRR</span>
                            <div className="text-xl font-black text-indigo-700">{leveredIRR.toFixed(1)}<span className="text-xs font-normal text-indigo-600/60">%</span></div>
                        </div>
                    </div>

                    {/* Donut & Bar Chart Row */}
                    <div className="grid grid-cols-2 gap-4 mb-6 h-48">
                        <div className="bg-white border border-slate-100 rounded-lg p-2 flex flex-col">
                            <h3 className="text-[11px] font-bold text-slate-700 ml-2 mt-1">二、资金投入分布 (CAPEX)</h3>
                            <div className="flex-1 w-full">
                                <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                                    <PieChart>
                                        <Pie data={investmentData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value" stroke="none" isAnimationActive={false}>
                                            {investmentData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <RechartsTooltip formatter={(val: number) => `¥ ${val.toFixed(1)} 万`} contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-lg p-2 flex flex-col">
                            <h3 className="text-[11px] font-bold text-slate-700 ml-2 mt-1">三、板块收益贡献 (Yearly Savings)</h3>
                            <div className="flex-1 w-full relative -left-4">
                                <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                                    <BarChart data={savingsData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#F1F5F9" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#64748B' }} tickLine={false} axisLine={false} width={80} />
                                        <RechartsTooltip formatter={(val: number) => `¥ ${val.toFixed(1)} 万`} cursor={{ fill: '#F8FAFC' }} contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12} isAnimationActive={false}>
                                            {savingsData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Active Modules Summary */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-slate-800 border-b-2 border-slate-100 pb-2 mb-3 flex items-center gap-2">
                            <span className="material-icons text-primary text-sm">view_module</span>
                            四、推荐方案与纳入板块
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {activeModules.map((m: any, idx: number) => (
                                <div key={idx} className="flex items-start gap-3 p-3 border border-slate-100 bg-slate-50/50 rounded-lg">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 border border-slate-200 shadow-sm">
                                        <span className="material-icons text-slate-500 text-[16px]">
                                            {m.name?.includes('光伏') ? 'solar_power' : m.name?.includes('储能') ? 'battery_charging_full' : m.name?.includes('暖通') ? 'ac_unit' : m.name?.includes('照明') ? 'lightbulb' : 'water_drop'}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-800 text-[13px] mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{m.name}</h4>
                                        <div className="text-[10px] font-medium text-slate-500 mb-1.5 truncate max-w-[150px]">{m.strategy}</div>
                                        <div className="flex gap-2">
                                            <div className="bg-white px-1.5 py-0.5 rounded border border-slate-100 flex-1 flex justify-between items-center">
                                                <span className="text-[9px] text-slate-500">建设</span>
                                                <span className="text-[10px] font-bold text-slate-700">{(m.investment || 0).toFixed(1)} <span className="font-normal text-[8px] text-slate-400">万</span></span>
                                            </div>
                                            <div className="bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex-1 flex justify-between items-center">
                                                <span className="text-[9px] text-emerald-600">收益</span>
                                                <span className="text-[10px] font-bold text-emerald-700">{(m.yearlySaving || 0).toFixed(1)} <span className="font-normal text-[8px] text-emerald-600/60">万</span></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {activeModules.length === 0 && (
                                <div className="col-span-2 text-center text-slate-400 py-6 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    未启用任何模块
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cash Flow Chart */}
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-slate-800 border-b-2 border-slate-100 pb-2 mb-3 flex items-center gap-2">
                            <span className="material-icons text-primary text-sm">show_chart</span>
                            五、投资回报：十年期累计净现金流
                        </h3>
                        <div className="h-40 w-full bg-white rounded-lg border border-slate-100 p-2 relative -left-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCum" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis dataKey="year" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} dy={5} tickFormatter={(val) => `第${val}年`} />
                                    <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} dx={-5} />
                                    <RechartsTooltip formatter={(val: number) => `¥ ${val.toFixed(1)} 万`} labelFormatter={(l) => `第 ${l} 年`} contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                                    <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="3 3" />
                                    <Area type="monotone" dataKey="cumulative" name="累计现金流" stroke="#10B981" fillOpacity={1} fill="url(#colorCum)" strokeWidth={2} activeDot={{ r: 4 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Footer Warning */}
                    <div className="mt-auto pt-4 text-[9px] text-slate-400 text-center border-t border-slate-100 flex justify-between items-center bg-white print:break-inside-avoid">
                        <div>本页报告由 <span className="font-bold text-slate-500">{PRODUCT_IDENTITY.fullName}{PRODUCT_IDENTITY.version}</span> 自动生成，预测指标不构成最终商务承诺。</div>
                        <div className="uppercase tracking-widest font-bold">Internal Confidential</div>
                    </div>

                </div>
            </div>

            {/* Print CSS Injection */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: A4 portrait; margin: 0; }
                    *, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    html, body { height: auto !important; overflow: visible !important; background-color: white !important; }
                    .custom-scrollbar { background-color: white !important; }
                }
            `}} />
        </div>
    );
}
