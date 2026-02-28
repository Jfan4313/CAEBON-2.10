import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, LineChart, Line } from 'recharts';
import { SolarParamsState } from '../types';

interface SolarChartsProps {
    isChartExpanded: boolean;
    setIsChartExpanded: (val: boolean) => void;
    isFinancialModalOpen: boolean;
    setIsFinancialModalOpen: (val: boolean) => void;
    chartData: any[];
    longTermMetrics: any;
    params: SolarParamsState;
    investment: number;
    handleUpdate: (updates: Partial<SolarParamsState>) => void;
}

export const SolarCharts: React.FC<SolarChartsProps> = ({
    isChartExpanded, setIsChartExpanded,
    isFinancialModalOpen, setIsFinancialModalOpen,
    chartData, longTermMetrics,
    params, investment, handleUpdate
}) => {
    const isEmc = params.simpleParams.investmentMode === 'emc';

    return (
        <>
            {/* Expanded Chart Modal: Monthly Generation */}
            {isChartExpanded && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6"
                    onClick={() => setIsChartExpanded(false)}
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-5xl h-[600px] shadow-2xl p-8 flex flex-col relative animate-[zoomIn_0.2s_ease-out]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                    <span className="p-2 bg-blue-100 text-blue-600 rounded-lg"><span className="material-icons">bar_chart</span></span>
                                    月度发电量详细预测
                                </h2>
                                <p className="text-slate-500 mt-1 ml-12">基于当地气象数据与系统配置的模拟结果 (首年)</p>
                            </div>
                            <button
                                onClick={() => setIsChartExpanded(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800"
                            >
                                <span className="material-icons text-2xl">close</span>
                            </button>
                        </div>

                        <div className="flex-1 w-full min-h-0 bg-slate-50 rounded-xl border border-slate-100 p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barSize={40}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 14, fill: '#64748b', fontWeight: 500 }}
                                        axisLine={{ stroke: '#e2e8f0' }}
                                        tickLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                                        axisLine={false}
                                        tickLine={false}
                                        label={{ value: '发电量 (万kWh)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#94a3b8', fontSize: 12 } }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                            padding: '12px 16px'
                                        }}
                                        formatter={(value: number) => [`${value.toFixed(3)} 万度`, '预估发电']}
                                        labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '14px' }}
                                        itemStyle={{ color: '#1e293b', fontWeight: 600, fontSize: '16px' }}
                                    />
                                    <Bar
                                        dataKey="retrofit"
                                        name="发电量"
                                        fill="url(#colorPv)"
                                        radius={[6, 6, 0, 0]}
                                        animationDuration={1500}
                                    />
                                    <defs>
                                        <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#d97706" stopOpacity={1} />
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Financial Modal */}
            {isFinancialModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6"
                    onClick={() => setIsFinancialModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-7xl max-h-[95vh] shadow-2xl overflow-hidden flex flex-col animate-[zoomIn_0.2s_ease-out]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-slate-50/50 text-slate-800">
                            <div>
                                <h2 className="text-2xl font-bold flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center shadow-sm">
                                        <span className="material-icons">monetization_on</span>
                                    </span>
                                    全生命周期测算 (25年财务模型)
                                </h2>
                                <p className="text-slate-500 mt-1 ml-14">
                                    模式: <span className="font-bold text-primary">{params.simpleParams.investmentMode.toUpperCase()}</span> |
                                    精度: <span className="text-blue-600 font-mono">0.001</span> (万)
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsFinancialModalOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors text-slate-500"
                                >
                                    <span className="material-icons">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
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
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
