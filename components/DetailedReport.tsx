import React, { useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import {
    ComposedChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function DetailedReport({ onClose }: { onClose: () => void }) {
    const { projectBaseInfo, modules } = useProject();
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        window.print();
    };

    // Calculate module financial indicators
    const calculateModuleMetrics = (investment: number, yearlySaving: number, period = 20) => {
        let cashFlows = [-investment];
        let npv = -investment;
        const discountRate = 5.0; // 5% default
        for (let year = 1; year <= period; year++) {
            const net = yearlySaving * Math.pow(0.99, year - 1) - (investment * 0.015);
            cashFlows.push(net);
            npv += net / Math.pow(1 + discountRate / 100, year);
        }

        let guess = 0.1;
        for (let i = 0; i < 40; i++) {
            let tmpNpv = 0;
            for (let j = 0; j < cashFlows.length; j++) tmpNpv += cashFlows[j] / Math.pow(1 + guess, j);
            if (Math.abs(tmpNpv) < 0.1) break;
            guess += tmpNpv > 0 ? 0.01 : -0.01;
        }
        const irr = guess * 100;

        return { npv: parseFloat(npv.toFixed(2)), irr: parseFloat(irr.toFixed(1)) };
    };

    const activeModules = (Object.values(modules) as any[]).filter(m => m.isActive);
    const totalInvestment = activeModules.reduce((sum, m) => sum + (Number(m.investment) || 0), 0);
    const totalSaving = activeModules.reduce((sum, m) => sum + (Number(m.yearlySaving) || 0), 0);
    const omRate = projectBaseInfo.omRate ?? 1.5;
    const taxRate = projectBaseInfo.taxRate ?? 25.0;

    // SPV Config
    const spvConfig = projectBaseInfo.spvConfig || { debtRatio: 70, loanInterest: 4.5, loanTerm: 10, shareholderARate: 51 };
    const loanAmount = totalInvestment * (spvConfig.debtRatio / 100);
    const equityAmount = totalInvestment - loanAmount;
    const principalPerYear = spvConfig.loanTerm > 0 ? loanAmount / spvConfig.loanTerm : 0;

    // Simulate 25-year cash flow
    const cashFlowData = Array.from({ length: 26 }, (_, i) => {
        if (i === 0) return { year: 0, revenue: 0, opex: 0, depreciation: 0, interest: 0, principal: 0, ebit: 0, tax: 0, net: -totalInvestment, leveredNet: -equityAmount, cumulative: -totalInvestment, leveredCumulative: -equityAmount };

        const revenue = totalSaving * Math.pow(0.99, i - 1); // 1% degradation
        const opex = totalInvestment * (omRate / 100) * Math.pow(1.02, i - 1); // 2% inflation
        const depreciation = i <= 20 ? totalInvestment / 20 : 0; // Straight line 20 years

        // Loan payments
        let remainingPrincipal = loanAmount - principalPerYear * (i - 1);
        if (remainingPrincipal < 0) remainingPrincipal = 0;
        const interestItem = remainingPrincipal * (spvConfig.loanInterest / 100);
        const principalItem = i <= spvConfig.loanTerm ? principalPerYear : 0;

        const ebit = revenue - opex - depreciation;
        const ebt = ebit - interestItem;
        const tax = ebt > 0 ? ebt * (taxRate / 100) : 0;

        // Project Cash Flow (Unlevered)
        const unleveredTax = ebit > 0 ? ebit * (taxRate / 100) : 0;
        const net = ebit - unleveredTax + depreciation;

        // Equity Cash Flow (Levered)
        const leveredNet = ebit - tax + depreciation - interestItem - principalItem;

        return {
            year: i,
            revenue,
            opex,
            depreciation,
            interest: interestItem,
            principal: principalItem,
            ebit,
            tax,
            net,
            leveredNet,
            cumulative: 0,
            leveredCumulative: 0
        };
    });

    let cum = -totalInvestment;
    let leveredCum = -equityAmount;
    cashFlowData.forEach((row, i) => {
        if (i > 0) {
            cum += row.net;
            leveredCum += row.leveredNet;
            row.cumulative = parseFloat(cum.toFixed(2));
            row.leveredCumulative = parseFloat(leveredCum.toFixed(2));
            row.net = parseFloat(row.net.toFixed(2));
            row.leveredNet = parseFloat(row.leveredNet.toFixed(2));
        }
    });

    // Helper calculate IRR
    const calculateIRR = (cashFlows: number[]) => {
        let guess = 0.1;
        for (let i = 0; i < 40; i++) {
            let npv = 0;
            for (let j = 0; j < cashFlows.length; j++) npv += cashFlows[j] / Math.pow(1 + guess, j);
            if (Math.abs(npv) < 0.1) break;
            guess += npv > 0 ? 0.01 : -0.01;
        }
        return guess * 100;
    };

    const projectIRR = totalInvestment > 0 ? calculateIRR(cashFlowData.map(d => d.net)) : 0;
    const leveredIRR = equityAmount > 0 ? calculateIRR(cashFlowData.map(d => d.leveredNet)) : 0;

    // Chart data for first 15 years to fit nicely
    const chartData = cashFlowData.slice(1, 16);

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col">
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
            <div className="flex-1 overflow-y-auto p-8 flex justify-center print:p-0 print:overflow-visible bg-slate-200 print:bg-white custom-scrollbar">
                <div
                    ref={printRef}
                    className="bg-white shadow-2xl print:shadow-none mx-auto print:mx-0 print:w-full relative"
                    style={{
                        width: '210mm',
                        minHeight: '297mm',
                    }}
                >
                    {/* PAGE 1: Executive Summary */}
                    <div className="p-[15mm] min-h-[297mm] print:break-after-page flex flex-col">
                        {/* Header */}
                        <div className="border-b-4 border-slate-800 pb-6 mb-8 flex items-end justify-between">
                            <div className="flex-1 pr-4">
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">{projectBaseInfo.name || '未命名项目'} 零碳改造评估报告</h1>
                                <div className="flex items-center gap-4 mt-3 text-sm font-medium text-slate-600">
                                    <span className="flex items-center gap-1"><span className="material-icons text-[16px] text-slate-400">business_center</span> {projectBaseInfo.type === 'factory' ? '工业厂房' : projectBaseInfo.type === 'commercial' ? '商业综合体' : '公共建筑'}</span>
                                    <span className="flex items-center gap-1"><span className="material-icons text-[16px] text-slate-400">location_on</span> {projectBaseInfo.province || ''} {projectBaseInfo.city || ''}</span>
                                    <span className="flex items-center gap-1"><span className="material-icons text-[16px] text-slate-400">today</span> {new Date().toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">DETAILED REPORT</div>
                                <div className="text-2xl font-black text-slate-800">ZeroCarbon Pro</div>
                            </div>
                        </div>

                        {/* Executive Summary stats */}
                        <div className="grid grid-cols-5 gap-4 mb-6">
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                <div className="text-xs text-slate-500 mb-1">总投资 (CAPEX)</div>
                                <div className="text-xl font-bold text-slate-800">¥ {totalInvestment.toFixed(2)} <span className="text-xs font-normal text-slate-500">万</span></div>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                                <div className="text-xs text-emerald-600 mb-1">首年收益预测</div>
                                <div className="text-xl font-bold text-emerald-700">¥ {totalSaving.toFixed(2)} <span className="text-xs font-normal text-emerald-600">万</span></div>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                                <div className="text-xs text-blue-600 mb-1">静态投资回收期</div>
                                <div className="text-xl font-bold text-blue-700">{(totalSaving > 0 ? totalInvestment / totalSaving : 0).toFixed(2)} <span className="text-xs font-normal text-blue-600">年</span></div>
                            </div>
                            <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl">
                                <div className="text-xs text-purple-600 mb-1">项目全投资 IRR</div>
                                <div className="text-xl font-bold text-purple-700">~{projectIRR.toFixed(1)} <span className="text-xs font-normal text-purple-600">%</span></div>
                            </div>
                            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                                <div className="text-xs text-indigo-600 mb-1">资本金 IRR (L-IRR)</div>
                                <div className="text-xl font-bold text-indigo-700">~{leveredIRR.toFixed(1)} <span className="text-xs font-normal text-indigo-600">%</span></div>
                            </div>
                        </div>

                        {/* Financial Chart */}
                        <div className="mb-6 flex-1">
                            <h3 className="text-lg font-bold text-slate-800 mb-3 border-l-4 border-primary pl-3">前 15 年现金流预测 (简图)</h3>
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 h-[240px]">
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
                            <h3 className="text-lg font-bold text-slate-800 mb-4 border-l-4 border-primary pl-3">子系统投资清单 (BOM)</h3>
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
                                                <td className="px-4 py-3 text-right text-xs text-slate-400">{((Number(m.investment) || 0) / totalInvestment * 100).toFixed(1)}%</td>
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

                    {/* PAGE 2: 25-Year Cash Flow Statement */}
                    <div className="p-[15mm] min-h-[297mm] bg-white pt-[20mm]">
                        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                            <span className="material-icons text-primary">table_chart</span>
                            25年项目生命周期现金流明细表
                        </h3>
                        <div className="text-xs text-slate-500 mb-4 flex gap-4">
                            <span>* 测算假设条件：全局运维费率(O&M) = {omRate}% (年上浮2%)</span>
                            <span>企业所得税率 = {taxRate}%</span>
                            <span>折旧年限 = 20年直线折旧</span>
                        </div>

                        <div className="rounded-lg border border-slate-200 overflow-hidden text-[10px]">
                            <table className="w-full text-right">
                                <thead className="bg-slate-800 text-white font-medium">
                                    <tr>
                                        <th className="px-2 py-2 text-center w-12">年份</th>
                                        <th className="px-2 py-2 border-l border-slate-700">投资(CAPEX)</th>
                                        <th className="px-2 py-2 border-l border-slate-700">节能/发电收益</th>
                                        <th className="px-2 py-2 border-l border-slate-700">运维(O&M)</th>
                                        <th className="px-2 py-2 border-l border-slate-700">折旧摊销</th>
                                        <th className="px-2 py-2 border-l border-slate-700">税前利润(EBIT)</th>
                                        <th className="px-2 py-2 border-l border-slate-700">所得税({taxRate}%)</th>
                                        <th className="px-2 py-2 border-l border-slate-700 bg-primary/20">当期净现金流</th>
                                        <th className="px-2 py-2 border-l border-slate-700 bg-primary/40">累计净现金流</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {cashFlowData.map((row) => (
                                        <tr key={row.year} className={`${row.year % 5 === 0 && row.year > 0 ? 'bg-slate-50/80 font-medium' : 'bg-white'} hover:bg-slate-50`}>
                                            <td className="px-2 py-1.5 text-center text-slate-500">{row.year === 0 ? '建设期' : `第 ${row.year} 年`}</td>
                                            <td className="px-2 py-1.5 border-l border-slate-100 text-slate-700">{row.year === 0 ? (-totalInvestment).toFixed(2) : '-'}</td>
                                            <td className="px-2 py-1.5 border-l border-slate-100 text-emerald-600">{row.year === 0 ? '-' : row.revenue.toFixed(2)}</td>
                                            <td className="px-2 py-1.5 border-l border-slate-100 text-red-500">{row.year === 0 ? '-' : `-${row.opex.toFixed(2)}`}</td>
                                            <td className="px-2 py-1.5 border-l border-slate-100 text-slate-500">{row.year === 0 ? '-' : `-${row.depreciation.toFixed(2)}`}</td>
                                            <td className="px-2 py-1.5 border-l border-slate-100 text-slate-700">{row.year === 0 ? '-' : row.ebit.toFixed(2)}</td>
                                            <td className="px-2 py-1.5 border-l border-slate-100 text-red-500">{row.year === 0 ? '-' : `-${row.tax.toFixed(2)}`}</td>
                                            <td className="px-2 py-1.5 border-l border-slate-100 font-bold font-mono text-slate-800 bg-slate-50/50">{row.net.toFixed(2)}</td>
                                            <td className={`px-2 py-1.5 border-l border-slate-100 font-bold font-mono ${row.cumulative >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{row.cumulative.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="page-break" />
                    </div>

                    {/* PAGE 3: Module Details Breakdown */}
                    <div className="p-[15mm] min-h-[297mm] bg-white pt-[20mm]">
                        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                            <span className="material-icons text-primary">analytics</span>
                            子系统改造方案与关键工程对比参数
                        </h3>
                        <div className="text-xs text-slate-500 mb-8 max-w-3xl">
                            以下是经过评估确立的有效改造模块，列出了设备替换前后的核心物理量对比与该模块**独立剥离**后的单体财务模型。
                            这些单项效益已完整计入此项目全生命周期的总体现金流演算。
                        </div>

                        <div className="space-y-6">
                            {activeModules.map((m, i) => {
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
                                        { label: '储能设计功率', value: `${m.params?.power || 0} kW` },
                                        { label: '充放电策略', value: m.params?.strategy === 'two_charge_two_discharge' ? '两充两放' : '一充一放' },
                                        { label: 'DOD放电深度', value: `${m.params?.dod || 0} %` },
                                        { label: '单瓦时硬件造价', value: `${m.params?.unitPrice || 0} 元/Wh` }
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
                                        { label: '日均满载利用率', value: `${m.params?.utilizationRate || 0} %` },
                                        { label: '充电服务费', value: `${m.params?.serviceFee || 0} 元/度` },
                                    ];
                                } else {
                                    details = [
                                        { label: '核心指征', value: m.kpiPrimary?.value || 'N/A' }
                                    ];
                                }

                                const metrics = calculateModuleMetrics(Number(m.investment) || 0, Number(m.yearlySaving) || 0);

                                return (
                                    <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden page-break-inside-avoid shadow-sm mb-6">
                                        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                                            <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <span className="material-icons text-primary text-base">extension</span>
                                                {m.name}
                                            </h4>
                                            <span className="text-xs font-bold text-emerald-600 tracking-wider">
                                                {m.kpiSecondary?.label}: {m.kpiSecondary?.value || 'N/A'}
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
                                                        <span className="text-sm text-slate-500">单体静态回收期</span>
                                                        <span className="text-base font-bold text-blue-600">{Number(m.yearlySaving) > 0 ? ((Number(m.investment) || 0) / (Number(m.yearlySaving))).toFixed(2) : '-'} <span className="text-xs font-normal text-blue-600/70">年</span></span>
                                                    </div>
                                                    <div className="flex justify-between items-end border-t border-slate-100 pt-2">
                                                        <span className="text-sm text-slate-500">20年 净现值 (NPV)</span>
                                                        <span className={`text-base font-bold ${metrics.npv > 0 ? 'text-emerald-600' : 'text-red-500'}`}>¥{metrics.npv} <span className="text-xs font-normal opacity-70">万</span></span>
                                                    </div>
                                                    <div className="flex justify-between items-end">
                                                        <span className="text-sm text-slate-500">单模块 IRR</span>
                                                        <span className="text-base font-bold text-purple-600">{metrics.irr}%</span>
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

                        <div className="mt-12 pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
                            <p>本报告由 ZeroCarbon Pro 评估软件自动生成</p>
                            <p className="mt-1">数据仅供参考，不作为最终投资承诺及法律依据。</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
