import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, LineChart, Line } from 'recharts';
import { SolarParamsState } from '../types';

interface SolarFinancialDetailsProps {
    params: SolarParamsState;
    longTermMetrics: any;
    investment: number;
}

export const SolarFinancialDetails: React.FC<SolarFinancialDetailsProps> = ({
    params,
    longTermMetrics,
    investment
}) => {
    const isEmc = params.simpleParams.investmentMode === 'emc';
    const isFinancing = params.simpleParams.investmentMode === 'financing';
    const isCoBuild = params.simpleParams.investmentMode === 'co_build';
    const projectLifeYears = Math.max(1, Math.round(params.advParams.projectLifeYears || 11));
    const coBuildHasPostTermYears = params.advParams.coBuildTermYears < projectLifeYears;

    return (
        <>
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{isFinancing ? '业主初始投入' : isCoBuild ? '业主初始投入（40%）' : '项目总投资'}</p>
                    <div className="text-2xl font-bold text-slate-900">¥ {(isFinancing ? longTermMetrics.investorInitialInvestment : isCoBuild ? longTermMetrics.ownerInitialInvestment : investment).toFixed(3)} <span className="text-sm font-normal text-slate-500">万</span></div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        {isEmc ? `投资方 ${projectLifeYears}年净收益` : isFinancing ? `业主${projectLifeYears}年净现金流` : isCoBuild ? `业主${projectLifeYears}年累计收益` : `${projectLifeYears}年总累计净收益`}
                    </p>
                    <div className="text-2xl font-bold text-emerald-600">¥ {(isCoBuild ? longTermMetrics.totalOwnerBenefit25 : longTermMetrics.rev25Year).toFixed(3)} <span className="text-sm font-normal text-slate-500">万</span></div>
                </div>
                {(isEmc || (isCoBuild && coBuildHasPostTermYears)) && (
                    <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm">
                        <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span> {isCoBuild ? '合作期后累计收益' : `业主 ${projectLifeYears}年总收益`}
                        </p>
                        <div className="text-2xl font-bold text-blue-600">¥ {(isCoBuild ? longTermMetrics.ownerBenefitAfterTerm : longTermMetrics.totalOwnerBenefit25).toFixed(3)} <span className="text-sm font-normal text-slate-500">万</span></div>
                    </div>
                )}
                {isCoBuild && coBuildHasPostTermYears && (
                    <div className="bg-white p-6 rounded-xl border border-cyan-200 shadow-sm">
                        <p className="text-xs font-bold text-cyan-500 uppercase tracking-wider mb-2">第{params.advParams.coBuildTermYears + 1}年业主预计收益</p>
                        <div className="text-2xl font-bold text-cyan-700">¥ {longTermMetrics.ownerBenefitFirstYearAfterTerm.toFixed(3)} <span className="text-sm font-normal text-slate-500">万/年</span></div>
                    </div>
                )}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{isCoBuild ? '业主内部收益率 (IRR)' : '内部收益率 (IRR)'}</p>
                    <div className="text-2xl font-bold text-purple-600">{longTermMetrics.irr}%</div>
                </div>
                {!isEmc && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">回本周期</p>
                        <div className="text-2xl font-bold text-orange-500">{longTermMetrics.paybackPeriod.toFixed(2)} <span className="text-sm font-normal text-slate-500">年</span></div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Cash Flow Trend */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <span className="material-icons text-primary text-base">savings</span> {isCoBuild ? `业主${projectLifeYears}年累计现金流趋势` : `${projectLifeYears}年累计现金流趋势`}
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={(isCoBuild ? longTermMetrics.ownerCashFlows : longTermMetrics.cashFlows).map((v: number, i: number) => {
                                const sourceCashFlows = isCoBuild ? longTermMetrics.ownerCashFlows : longTermMetrics.cashFlows;
                                const cumulative = sourceCashFlows.slice(0, i + 1).reduce((a: number, b: number) => a + b, 0);
                                return { year: i, value: parseFloat(cumulative.toFixed(3)) };
                            })} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                                    formatter={(value: number) => [`¥ ${value} 万`, '累计净值']}
                                    labelFormatter={(label) => `运营第 ${label} 年`}
                                />
                                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCash)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Yearly Generation Decay */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <span className="material-icons text-orange-500 text-base">wb_sunny</span> 年度发电量预测 (考虑衰减)
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={longTermMetrics.yearlyDetails} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                                    formatter={(value: number) => [`${value} 万kWh`, '年度发电']}
                                    labelFormatter={(label) => `第 ${label} 年`}
                                />
                                <Line type="monotone" dataKey="generation" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <h3 className="text-sm font-bold text-slate-700">
                        {isEmc ? `业主 vs 投资方 逐年收益明细 (${projectLifeYears}年)` : isFinancing ? `融资共建逐年现金流明细 (${projectLifeYears}年)` : isCoBuild ? `股权共建逐年分配明细 (${projectLifeYears}年)` : `测算数据明细 (${projectLifeYears}年)`}
                    </h3>
                    <span className="text-[10px] text-slate-400">单位: 万元 (除发电量外) | 精度: 0.001</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap" style={{ minWidth: '600px' }}>
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-3 py-2.5 sticky left-0 bg-slate-50 text-xs">年份</th>
                                <th className="px-3 py-2.5 text-xs">发电量<br/><span className="text-[10px] font-normal">(万度)</span></th>
                                <th className="px-3 py-2.5 text-right text-xs">
                                    {isEmc ? <>发电收益<br/><span className="text-[10px] font-normal">(含税)</span></> : '总营收'}
                                </th>
                                {isEmc && <th className="px-3 py-2.5 text-right text-red-500 text-xs">减：应缴<br/>增值税</th>}
                                {isEmc && <th className="px-3 py-2.5 text-right text-red-500 text-xs">减：屋顶<br/>租金</th>}
                                <th className="px-3 py-2.5 text-right text-xs">{isEmc ? '减：运维' : '运维'}<br/>质保</th>
                                <th className="px-3 py-2.5 text-right text-xs">{isEmc ? '减：所得税' : '所得税'}<br/>及附加</th>
                                {isFinancing && <th className="px-3 py-2.5 text-right text-purple-600 text-xs">还本<br/>付息</th>}
                                <th className="px-3 py-2.5 text-right bg-slate-50/50 font-bold text-slate-700 text-xs">
                                    {isEmc ? '投资方<br/>净收益' : isCoBuild ? '我方<br/>分红' : '净<br/>现金流'}
                                </th>
                                {(isEmc || isCoBuild) && <th className="px-3 py-2.5 text-right text-blue-600 text-xs">业主综合<br/>收益</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr className="hover:bg-slate-50 bg-slate-50/30">
                                <td className="px-3 py-2 font-bold text-slate-700 sticky left-0 bg-slate-50/30 text-xs">第 0 年</td>
                                <td className="px-3 py-2 text-slate-400 text-xs">-</td>
                                <td className="px-3 py-2 text-right text-slate-400 text-xs">-</td>
                                {isEmc && <td className="px-3 py-2 text-right text-slate-400 text-xs">-</td>}
                                {isEmc && <td className="px-3 py-2 text-right text-slate-400 text-xs">-</td>}
                                <td className="px-3 py-2 text-right text-slate-400 text-xs">-</td>
                                <td className="px-3 py-2 text-right text-slate-400 text-xs">-</td>
                                {isFinancing && <td className="px-3 py-2 text-right text-slate-400 text-xs">-</td>}
                                <td className="px-3 py-2 text-right font-bold text-red-500 text-xs">
                                    -{(isFinancing ? longTermMetrics.investorInitialInvestment : isCoBuild ? longTermMetrics.ownerInitialInvestment : investment).toFixed(3)}
                                </td>
                                {(isEmc || isCoBuild) && <td className="px-3 py-2 text-right text-slate-400 text-xs">-</td>}
                            </tr>
                            {longTermMetrics.yearlyDetails.map((row: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-3 py-2 font-medium text-slate-700 sticky left-0 bg-white text-xs">第 {row.year} 年</td>
                                    <td className="px-3 py-2 text-slate-600 font-mono text-xs">{row.generation.toFixed(3)}</td>
                                    <td className="px-3 py-2 text-right text-orange-600 font-medium font-mono text-xs">
                                        {(isEmc ? row.grossGenerationRevenue : row.revenue).toFixed(3)}
                                    </td>
                                    {isEmc && <td className="px-3 py-2 text-right text-red-500 font-mono text-xs">-{row.vatPayable.toFixed(3)}</td>}
                                    {isEmc && <td className="px-3 py-2 text-right text-red-500 font-mono text-xs">-{row.roofRentCost.toFixed(3)}</td>}
                                    <td className="px-3 py-2 text-right text-orange-500 font-mono text-xs">-{(isEmc ? row.grossOpex : row.opex).toFixed(3)}</td>
                                    <td className="px-3 py-2 text-right text-slate-500 font-mono text-xs">-{row.tax.toFixed(3)}</td>
                                    {isFinancing && <td className="px-3 py-2 text-right text-purple-600 font-mono text-xs">-{row.debtService.toFixed(3)}</td>}
                                    <td className={`px-3 py-2 text-right font-bold bg-slate-50/30 font-mono text-xs ${row.netIncome >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {row.netIncome.toFixed(3)}
                                    </td>
                                    {(isEmc || isCoBuild) && <td className="px-3 py-2 text-right text-blue-600 font-medium font-mono text-xs">{row.ownerBenefit.toFixed(3)}</td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};
