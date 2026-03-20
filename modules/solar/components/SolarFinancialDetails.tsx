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

    return (
        <>
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">项目总投资</p>
                    <div className="text-2xl font-bold text-slate-900">¥ {investment.toFixed(3)} <span className="text-sm font-normal text-slate-500">万</span></div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        {isEmc ? '投资方 25年净收益' : '25年总累计净收益'}
                    </p>
                    <div className="text-2xl font-bold text-emerald-600">¥ {longTermMetrics.rev25Year.toFixed(3)} <span className="text-sm font-normal text-slate-500">万</span></div>
                </div>
                {isEmc && (
                    <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm">
                        <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span> 业主 25年总收益
                        </p>
                        <div className="text-2xl font-bold text-blue-600">¥ {longTermMetrics.totalOwnerBenefit25.toFixed(3)} <span className="text-sm font-normal text-slate-500">万</span></div>
                    </div>
                )}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">内部收益率 (IRR)</p>
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
                        <span className="material-icons text-primary text-base">savings</span> 25年累计现金流趋势
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={longTermMetrics.cashFlows.map((v: number, i: number) => {
                                const cumulative = longTermMetrics.cashFlows.slice(0, i + 1).reduce((a: number, b: number) => a + b, 0);
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
                        {isEmc ? '业主 vs 投资方 逐年收益明细 (25年)' : '测算数据明细 (25年)'}
                    </h3>
                    <span className="text-[10px] text-slate-400">单位: 万元 (除发电量外) | 精度: 0.001</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-4 sticky left-0 bg-slate-50">运营年份</th>
                                <th className="px-5 py-4">发电量(万度)</th>
                                <th className="px-5 py-4 text-right">
                                    {isEmc ? '投资方营收' : '总营收'}
                                </th>
                                {isEmc && <th className="px-5 py-4 text-right text-blue-600">业主收益</th>}
                                <th className="px-5 py-4 text-right">运维质保</th>
                                <th className="px-5 py-4 text-right">所得税费</th>
                                <th className="px-5 py-4 text-right bg-slate-50/50 font-bold text-slate-700">
                                    {isEmc ? '投资方净收益' : '净现金流'}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr className="hover:bg-slate-50 bg-slate-50/30">
                                <td className="px-5 py-3 font-bold text-slate-700 sticky left-0 bg-slate-50/30">第 0 年 (投资)</td>
                                <td className="px-5 py-3 text-slate-400">-</td>
                                <td className="px-5 py-3 text-right text-slate-400">-</td>
                                {isEmc && <td className="px-5 py-3 text-right text-slate-400">-</td>}
                                <td className="px-5 py-3 text-right text-slate-400">-</td>
                                <td className="px-5 py-3 text-right text-slate-400">-</td>
                                <td className="px-5 py-3 text-right font-bold text-red-500">
                                    -{investment.toFixed(3)}
                                </td>
                            </tr>
                            {longTermMetrics.yearlyDetails.map((row: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3 font-medium text-slate-700 sticky left-0 bg-white">第 {row.year} 年</td>
                                    <td className="px-5 py-3 text-slate-600 font-mono">{row.generation.toFixed(3)}</td>
                                    <td className="px-5 py-3 text-right text-orange-600 font-medium font-mono">{row.revenue.toFixed(3)}</td>
                                    {isEmc && <td className="px-5 py-3 text-right text-blue-600 font-medium font-mono">{row.ownerBenefit.toFixed(3)}</td>}
                                    <td className="px-5 py-3 text-right text-orange-500 font-mono">-{row.opex.toFixed(3)}</td>
                                    <td className="px-5 py-3 text-right text-slate-500 font-mono">-{row.tax.toFixed(3)}</td>
                                    <td className={`px-5 py-3 text-right font-bold bg-slate-50/30 font-mono ${row.netIncome >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {row.netIncome.toFixed(3)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};
