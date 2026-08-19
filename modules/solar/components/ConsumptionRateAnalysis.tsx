import React, { useEffect, useMemo, useState } from 'react';
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
    const projectLifeYears = Math.max(1, Math.round(params.advParams.projectLifeYears || 11));
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
    const chartWidth = 600;
    const chartHeight = 205;
    const chartLeft = 42;
    const chartRight = 16;
    const chartTop = 12;
    const chartBottom = 30;
    const plotWidth = chartWidth - chartLeft - chartRight;
    const plotHeight = chartHeight - chartTop - chartBottom;
    const xFor = (index: number) => chartLeft + (index + 0.5) / Math.max(1, analysisData.length) * plotWidth;
    const revenueValues = analysisData.flatMap(item => isEmc ? [item.rev25Year, item.ownerBenefit] : [item.rev25Year]);
    const revenueMin = Math.min(0, ...revenueValues);
    const revenueMax = Math.max(1, ...revenueValues);
    const revenueRange = Math.max(1, revenueMax - revenueMin);
    const revenueY = (value: number) => chartTop + (revenueMax - value) / revenueRange * plotHeight;
    const revenueZeroY = revenueY(0);
    const paybackMin = Math.min(...analysisData.map(item => item.payback));
    const paybackMax = Math.max(paybackMin + 0.1, ...analysisData.map(item => item.payback));
    const irrMin = Math.min(...analysisData.map(item => item.irr));
    const irrMax = Math.max(irrMin + 0.1, ...analysisData.map(item => item.irr));
    const normalizedY = (value: number, min: number, max: number) => chartTop + (max - value) / (max - min) * plotHeight;
    const paybackPoints = analysisData.map((item, index) => `${xFor(index)},${normalizedY(item.payback, paybackMin, paybackMax)}`).join(' ');
    const irrPoints = analysisData.map((item, index) => `${xFor(index)},${normalizedY(item.irr, irrMin, irrMax)}`).join(' ');

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
                    <div className="text-xs font-semibold text-slate-700 mb-3">{isEmc ? `${projectLifeYears}年投资方/业主累计收益` : `${projectLifeYears}年投资方累计净收益`}</div>
                    <div className="h-52">
                        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full" role="img" aria-label="不同消纳率累计收益对比" preserveAspectRatio="none">
                            {[0, 0.5, 1].map(ratio => {
                                const y = chartTop + ratio * plotHeight;
                                const value = revenueMax - ratio * revenueRange;
                                return <g key={ratio}><line x1={chartLeft} y1={y} x2={chartLeft + plotWidth} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" /><text x={chartLeft - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{value.toFixed(0)}</text></g>;
                            })}
                            {analysisData.map((item, index) => {
                                const x = xFor(index);
                                const groupWidth = plotWidth / Math.max(1, analysisData.length) * 0.62;
                                const barWidth = groupWidth / (isEmc ? 2 : 1);
                                const investorY = revenueY(item.rev25Year);
                                const ownerY = revenueY(item.ownerBenefit);
                                return (
                                    <g key={item.rate}>
                                        <rect x={x - groupWidth / 2} y={Math.min(investorY, revenueZeroY)} width={barWidth} height={Math.max(1, Math.abs(revenueZeroY - investorY))} rx="3" fill="#3b82f6"><title>{`消纳率${item.rate}% 投资方净收益 ${item.rev25Year.toFixed(2)}万元`}</title></rect>
                                        {isEmc && <rect x={x - groupWidth / 2 + barWidth} y={Math.min(ownerY, revenueZeroY)} width={barWidth} height={Math.max(1, Math.abs(revenueZeroY - ownerY))} rx="3" fill="#10b981"><title>{`消纳率${item.rate}% 业主收益 ${item.ownerBenefit.toFixed(2)}万元`}</title></rect>}
                                        <text x={x} y={chartHeight - 10} textAnchor="middle" fontSize="9" fill="#64748b">{item.rate}%</text>
                                    </g>
                                );
                            })}
                        </svg>
                    </div>
                    {isEmc && <div className="flex justify-center gap-4 text-[10px] text-slate-500"><span className="flex items-center gap-1"><i className="w-3 h-2 bg-blue-500" />投资方净收益</span><span className="flex items-center gap-1"><i className="w-3 h-2 bg-emerald-500" />业主收益</span></div>}
                </div>

                <div className="bg-white rounded-[22px] border border-slate-200/70 p-4 shadow-sm">
                    <div className="text-xs font-semibold text-slate-700 mb-3">回本周期变化（核心）</div>
                    <div className="h-52">
                        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full" role="img" aria-label="消纳率对回本周期与内部收益率影响" preserveAspectRatio="none">
                            {[0, 0.5, 1].map(ratio => <line key={ratio} x1={chartLeft} y1={chartTop + ratio * plotHeight} x2={chartLeft + plotWidth} y2={chartTop + ratio * plotHeight} stroke="#e2e8f0" strokeDasharray="4 4" />)}
                            <text x={chartLeft - 6} y={chartTop + 4} textAnchor="end" fontSize="9" fill="#0071e3">{paybackMax.toFixed(1)}年</text>
                            <text x={chartLeft - 6} y={chartTop + plotHeight} textAnchor="end" fontSize="9" fill="#0071e3">{paybackMin.toFixed(1)}年</text>
                            <text x={chartWidth - 2} y={chartTop + 4} textAnchor="end" fontSize="9" fill="#8e8e93">{irrMax.toFixed(1)}%</text>
                            <text x={chartWidth - 2} y={chartTop + plotHeight} textAnchor="end" fontSize="9" fill="#8e8e93">{irrMin.toFixed(1)}%</text>
                            <polyline points={paybackPoints} fill="none" stroke="#0071e3" strokeWidth="4" />
                            <polyline points={irrPoints} fill="none" stroke="#8e8e93" strokeWidth="2" />
                            {analysisData.map((item, index) => (
                                <g key={item.rate}>
                                    <circle cx={xFor(index)} cy={normalizedY(item.payback, paybackMin, paybackMax)} r="4" fill="#0071e3"><title>{`消纳率${item.rate}% 回本周期 ${item.payback.toFixed(2)}年`}</title></circle>
                                    <circle cx={xFor(index)} cy={normalizedY(item.irr, irrMin, irrMax)} r="3" fill="#8e8e93"><title>{`消纳率${item.rate}% IRR ${item.irr.toFixed(2)}%`}</title></circle>
                                    <text x={xFor(index)} y={chartHeight - 10} textAnchor="middle" fontSize="9" fill="#64748b">{item.rate}%</text>
                                </g>
                            ))}
                        </svg>
                    </div>
                    <div className="flex justify-center gap-4 text-[10px] text-slate-500"><span className="flex items-center gap-1"><i className="w-3 h-0.5 bg-[#0071e3]" />回本周期</span><span className="flex items-center gap-1"><i className="w-3 h-0.5 bg-[#8e8e93]" />IRR</span></div>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-white rounded-[22px] border border-slate-200/70 p-4 shadow-sm">
                    <span className="text-slate-400 block mb-1">当前基准</span>
                    <span className="font-bold text-slate-700">
                        {baseResult.rate}% 消纳率，回本周期 {baseResult.payback.toFixed(2)} 年，IRR {baseResult.irr.toFixed(2)}%
                        {isEmc ? `，业主${projectLifeYears}年收益 ${baseResult.ownerBenefit.toFixed(1)} 万元` : ''}
                    </span>
                </div>
                <div className="bg-white rounded-[22px] border border-slate-200/70 p-4 shadow-sm">
                    <span className="text-slate-400 block mb-1">低消纳风险</span>
                    <span className="font-bold text-slate-700">
                        {lowResult.rate}% 时回本周期 {lowResult.payback.toFixed(2)} 年，投资方{projectLifeYears}年净收益 {lowResult.rev25Year.toFixed(1)} 万元
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
