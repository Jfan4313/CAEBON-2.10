import React from 'react';
import { SolarSolution, SolarParamsState } from '../types';
import { useSolarMetrics, calculateSolarMetrics } from '../hooks';

interface SolutionComparisonProps {
    solutions: SolarSolution[];
    params: SolarParamsState;
    selfConsumptionRate: number;
}

export const SolutionComparison: React.FC<SolutionComparisonProps> = ({
    solutions,
    params,
    selfConsumptionRate
}) => {
    // 计算每个方案的财务指标
    const solutionResults = solutions.map(solution => {
        const modifiedParams: SolarParamsState = {
            ...params,
            simpleParams: {
                ...params.simpleParams,
                epcPrice: solution.epcPrice,
                connectionType: solution.connectionType
            }
        };
        const longTermMetrics = calculateSolarMetrics(modifiedParams, selfConsumptionRate);
        // 计算投资总额
        const capacity = params.simpleParams.capacity || 0;
        const baseInvestment = parseFloat((capacity * solution.epcPrice / 10).toFixed(2));
        const voltageUpgradeCost = solution.connectionType === 'high' && solution.voltageUpgradeCost ? solution.voltageUpgradeCost : 0;
        const totalInvestment = parseFloat((baseInvestment + voltageUpgradeCost).toFixed(2));
        return {
            solution,
            ...longTermMetrics,
            totalInvestment
        };
    });

    // 找出最优方案（IRR最高）
    const bestSolution = solutionResults.reduce((best, current) =>
        current.irr > best.irr ? current : best
    );

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">方案对比分析</h3>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm border-collapse">
                    <thead>
                        <tr className="bg-slate-100">
                            <th className="px-4 py-3 text-left">对比项</th>
                            {solutions.map(s => (
                                <th key={s.id} className={`px-4 py-3 text-center ${
                                    s.id === bestSolution.solution.id ? 'bg-green-100' : ''
                                }`}>
                                    {s.name}
                                    {s.id === bestSolution.solution.id && (
                                        <span className="ml-2 px-2 py-1 bg-green-500 text-white text-xs rounded">推荐</span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-slate-100">
                            <td className="px-4 py-3 font-medium">接入类型</td>
                            {solutionResults.map((r, i) => (
                                <td key={i} className={`px-4 py-3 text-center ${
                                    r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''
                                }`}>
                                    <span className={`px-2 py-1 rounded text-white text-xs ${
                                        r.solution.connectionType === 'high' ? 'bg-red-500' : 'bg-blue-500'
                                    }`}>
                                        {r.solution.connectionType === 'high' ? '高压接入' : '低压接入'}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="px-4 py-3 font-medium">EPC单价</td>
                            {solutionResults.map((r, i) => (
                                <td key={i} className={`px-4 py-3 text-center ${
                                    r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''
                                }`}>
                                    ¥{r.solution.epcPrice.toFixed(2)}/Wp
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="px-4 py-3 font-medium">升压设备成本</td>
                            {solutionResults.map((r, i) => (
                                <td key={i} className={`px-4 py-3 text-center ${
                                    r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''
                                }`}>
                                    {r.solution.connectionType === 'high' && r.solution.voltageUpgradeCost
                                        ? `¥${r.solution.voltageUpgradeCost}万`
                                        : '-'}
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="px-4 py-3 font-medium">总投资</td>
                            {solutionResults.map((r, i) => (
                                <td key={i} className={`px-4 py-3 text-center ${
                                    r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''
                                }`}>
                                    ¥{r.totalInvestment.toFixed(2)}万
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="px-4 py-3 font-medium">首年发电量</td>
                            {solutionResults.map((r, i) => (
                                <td key={i} className={`px-4 py-3 text-center ${
                                    r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''
                                }`}>
                                    {r.genYear1.toFixed(2)}万度
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="px-4 py-3 font-medium">IRR</td>
                            {solutionResults.map((r, i) => (
                                <td key={i} className={`px-4 py-3 text-center ${
                                    r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''
                                }`}>
                                    <span className={r.irr > 15 ? 'text-green-600' : r.irr > 10 ? 'text-yellow-600' : 'text-red-600'}>
                                        {r.irr.toFixed(2)}%
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="px-4 py-3 font-medium">回收周期</td>
                            {solutionResults.map((r, i) => (
                                <td key={i} className={`px-4 py-3 text-center ${
                                    r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''
                                }`}>
                                    {r.paybackPeriod.toFixed(2)}年
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className="px-4 py-3 font-medium">25年累计收益</td>
                            {solutionResults.map((r, i) => (
                                <td key={i} className={`px-4 py-3 text-center ${
                                    r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''
                                }`}>
                                    ¥{r.rev25Year.toFixed(2)}万
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
