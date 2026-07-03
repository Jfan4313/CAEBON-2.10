import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { calculateSolarMetrics } from '../hooks';
import { SolarParamsState } from '../types';

interface ConsumptionRateAnalysisProps {
    params: SolarParamsState;
    baseRate: number;
    onUpdateRates: (rates: number[]) => void;
}

const DEFAULT_SCENARIO_RATES = [50, 60, 70, 80, 90, 100];

const normalizeRates = (rates?: number[]) => {
    const sourceRates = rates && rates.length > 0 ? rates : DEFAULT_SCENARIO_RATES;
    return Array.from(new Set(
        sourceRates
            .map(rate => Math.round(rate))
            .filter(rate => Number.isFinite(rate) && rate >= 0 && rate <= 100)
    )).sort((a, b) => a - b);
};

const parseRates = (value: string) => {
    return normalizeRates(
        value
            .split(/[,，\s]+/)
            .map(item => Number(item.trim()))
    );
};

const buildRates = (baseRate: number, scenarioRates?: number[]) => {
    const customRates = normalizeRates(scenarioRates);
    const safeBaseRate = Math.max(0, Math.min(100, Math.round(baseRate)));
    return Array.from(new Set([...customRates, safeBaseRate])).sort((a, b) => a - b);
};

export const ConsumptionRateAnalysis: React.FC<ConsumptionRateAnalysisProps> = ({
    params,
    baseRate,
    onUpdateRates
}) => {
    const scenarioRates = useMemo(() => normalizeRates(params.consumptionRateScenarios), [params.consumptionRateScenarios]);
    const [rateInput, setRateInput] = useState(scenarioRates.join(', '));

    useEffect(() => {
        setRateInput(scenarioRates.join(', '));
    }, [scenarioRates]);

    const analysisData = useMemo(() => {
        return buildRates(baseRate, scenarioRates).map((rate) => {
            const result = calculateSolarMetrics(params, rate);
            return {
                rate,
                irr: result.irr,
                payback: result.paybackPeriod,
                rev25Year: result.rev25Year,
                ownerBenefit: result.totalOwnerBenefit25,
                isBase: rate === Math.round(baseRate)
            };
        });
    }, [params, baseRate, scenarioRates]);

    const baseResult = analysisData.find(item => item.isBase) || analysisData[0];
    const lowResult = analysisData[0];
    const highResult = analysisData[analysisData.length - 1];
    const isEmc = params.simpleParams.investmentMode === 'emc';
    const revenueSpread = highResult.rev25Year - lowResult.rev25Year;
    const ownerBenefitSpread = highResult.ownerBenefit - lowResult.ownerBenefit;
    const paybackRangeDiff = lowResult.payback - highResult.payback;
    const baseToHighPaybackDiff = baseResult.payback - highResult.payback;

    const applyRateInput = () => {
        const nextRates = parseRates(rateInput);
        if (nextRates.length > 0) {
            onUpdateRates(nextRates);
            setRateInput(nextRates.join(', '));
        }
    };

    const resetRates = () => {
        onUpdateRates(DEFAULT_SCENARIO_RATES);
        setRateInput(DEFAULT_SCENARIO_RATES.join(', '));
    };

    return (
        <div className="mt-6 rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)] backdrop-blur">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
                <div>
                    <h4 className="text-sm font-semibold text-[#1d1d1f] flex items-center gap-2">
                        <span className="solar-apple-icon material-icons text-[18px]">stacked_line_chart</span>
                        多消纳率回本周期影响
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">重点看回本周期随消纳率变化；收益仅作为辅助判断口径。</p>
                </div>
                <div className={`grid ${isEmc ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'} gap-2 text-center`}>
                    <div className="bg-[#f5f5f7] rounded-[18px] border border-slate-200/70 px-3 py-2">
                        <div className="text-[10px] text-slate-400">当前消纳率</div>
                        <div className="text-base font-semibold text-[#0071e3]">{Math.round(baseRate)}%</div>
                    </div>
                    <div className="bg-[#f5f5f7] rounded-[18px] border border-slate-200/70 px-3 py-2">
                        <div className="text-[10px] text-slate-400">当前回本周期</div>
                        <div className="text-base font-semibold text-[#0071e3]">{baseResult.payback.toFixed(2)}年</div>
                    </div>
                    {isEmc && (
                        <div className="bg-[#f5f5f7] rounded-[18px] border border-slate-200/70 px-3 py-2">
                            <div className="text-[10px] text-slate-400">业主收益差</div>
                            <div className="text-base font-semibold text-[#0071e3]">{ownerBenefitSpread.toFixed(1)}万</div>
                        </div>
                    )}
                    <div className="bg-[#f5f5f7] rounded-[18px] border border-slate-200/70 px-3 py-2">
                        <div className="text-[10px] text-slate-400">高低档回本差</div>
                        <div className="text-base font-semibold text-[#0071e3]">{paybackRangeDiff.toFixed(2)}年</div>
                    </div>
                </div>
            </div>

            <div className="mb-4 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-end bg-[#f5f5f7] rounded-[22px] border border-slate-200/70 p-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">分析消纳率档位 (%)</label>
                    <input
                        value={rateInput}
                        onChange={(e) => setRateInput(e.target.value)}
                        onBlur={applyRateInput}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                applyRateInput();
                            }
                        }}
                        placeholder="例如：45, 60, 75, 90, 100"
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10"
                    />
                    <div className="text-[10px] text-slate-400">用逗号或空格分隔；当前消纳率会自动加入对比，不需要重复填写。</div>
                </div>
                <button
                    onClick={resetRates}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:border-[#0071e3]/40 hover:text-[#0071e3] transition-all"
                >
                    恢复默认
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-[22px] border border-slate-200/70 p-4 shadow-sm">
                    <div className="text-xs font-semibold text-slate-700 mb-3">{isEmc ? '25年投资方/业主累计收益' : '25年投资方累计净收益'}</div>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analysisData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="rate" tickFormatter={(value) => `${value}%`} tick={{ fontSize: 11, fill: '#64748b' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                <Tooltip
                                    formatter={(value: number, name: string, item: any) => [
                                        `${value.toFixed(2)} 万元`,
                                        item?.dataKey === 'ownerBenefit' ? '业主25年收益' : '投资方25年净收益'
                                    ]}
                                    labelFormatter={(label) => `消纳率 ${label}%`}
                                />
                                {isEmc && <Legend />}
                                <Bar dataKey="rev25Year" name="投资方净收益" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                {isEmc && <Bar dataKey="ownerBenefit" name="业主收益" fill="#10b981" radius={[4, 4, 0, 0]} />}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-[22px] border border-slate-200/70 p-4 shadow-sm">
                    <div className="text-xs font-semibold text-slate-700 mb-3">回本周期变化（核心）</div>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analysisData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="rate" tickFormatter={(value) => `${value}%`} tick={{ fontSize: 11, fill: '#64748b' }} />
                                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#0071e3' }} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#8e8e93' }} />
                                <Tooltip
                                    formatter={(value: number, name: string) => [
                                        name === 'payback' ? `${value.toFixed(2)} 年` : `${value.toFixed(2)}%`,
                                        name === 'payback' ? '回本周期' : 'IRR（辅助）'
                                    ]}
                                    labelFormatter={(label) => `消纳率 ${label}%`}
                                />
                                <Line yAxisId="left" type="monotone" dataKey="payback" stroke="#0071e3" strokeWidth={4} dot={{ r: 4 }} />
                                <Line yAxisId="right" type="monotone" dataKey="irr" stroke="#8e8e93" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-white rounded-[22px] border border-slate-200/70 p-4 shadow-sm">
                    <span className="text-slate-400 block mb-1">当前基准</span>
                    <span className="font-bold text-slate-700">
                        {baseResult.rate}% 消纳率，回本周期 {baseResult.payback.toFixed(2)} 年，IRR {baseResult.irr.toFixed(2)}%
                        {isEmc ? `，业主25年收益 ${baseResult.ownerBenefit.toFixed(1)} 万元` : ''}
                    </span>
                </div>
                <div className="bg-white rounded-[22px] border border-slate-200/70 p-4 shadow-sm">
                    <span className="text-slate-400 block mb-1">低消纳风险</span>
                    <span className="font-bold text-slate-700">
                        {lowResult.rate}% 时回本周期 {lowResult.payback.toFixed(2)} 年，投资方25年净收益 {lowResult.rev25Year.toFixed(1)} 万元
                        {isEmc ? `，业主收益 ${lowResult.ownerBenefit.toFixed(1)} 万元` : ''}
                    </span>
                </div>
                <div className="bg-white rounded-[22px] border border-slate-200/70 p-4 shadow-sm">
                    <span className="text-slate-400 block mb-1">高消纳上限</span>
                    <span className="font-bold text-slate-700">
                        {highResult.rate}% 时回本周期 {highResult.payback.toFixed(2)} 年，比 {lowResult.rate}% 档少 {paybackRangeDiff.toFixed(2)} 年
                        {baseToHighPaybackDiff > 0 ? `，比当前基准少 ${baseToHighPaybackDiff.toFixed(2)} 年` : ''}
                        {isEmc ? `，业主收益 ${highResult.ownerBenefit.toFixed(1)} 万元` : ''}
                    </span>
                </div>
            </div>
        </div>
    );
};
