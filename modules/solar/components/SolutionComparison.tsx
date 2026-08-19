import React from 'react';
import { SolarSolution, SolarParamsState, MODULE_BRANDS, CABLE_BRANDS, INVERTER_BRANDS } from '../types';
import { calculateSolarMetrics } from '../hooks';

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
    const projectLifeYears = Math.max(1, Math.round(params.advParams.projectLifeYears || 11));
    if (solutions.length === 0) {
        return (
            <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-4">
                暂无可对比方案
            </div>
        );
    }

    // 计算每个方案的财务指标
    const solutionResults = solutions.map(solution => {
        const modifiedParams: SolarParamsState = {
            ...params,
            simpleParams: {
                ...params.simpleParams,
                capacity: solution.capacity ?? params.simpleParams.capacity,
                epcPrice: solution.epcPrice,
                connectionType: solution.connectionType,
                investmentMode: solution.investmentMode || 'epc',
                emcSubMode: solution.emcSubMode || params.simpleParams.emcSubMode
            },
            advParams: {
                ...params.advParams,
                emcOwnerShareRate: solution.emcOwnerShareRate ?? params.advParams.emcOwnerShareRate,
                emcDiscountPrice: solution.emcDiscountPrice ?? params.advParams.emcDiscountPrice,
                emcDiscountRate: solution.emcDiscountRate ?? params.advParams.emcDiscountRate,
                emcFixedPrice: solution.emcFixedPrice ?? params.advParams.emcFixedPrice,
                emcSouthernAveragePrice: solution.emcSouthernAveragePrice ?? params.advParams.emcSouthernAveragePrice,
                roofRent: solution.roofRent ?? params.advParams.roofRent,
                financingRatio: solution.financingRatio ?? params.advParams.financingRatio,
                financingAnnualRate: solution.financingAnnualRate ?? params.advParams.financingAnnualRate,
                financingTermYears: solution.financingTermYears ?? params.advParams.financingTermYears,
                coBuildInvestorShareRate: solution.coBuildInvestorShareRate ?? params.advParams.coBuildInvestorShareRate,
                coBuildSalePrice: solution.coBuildSalePrice ?? params.advParams.coBuildSalePrice,
                coBuildTermYears: solution.coBuildTermYears ?? params.advParams.coBuildTermYears
            },
            selectedSolutionId: solution.id,
            solutions
        };
        const longTermMetrics = calculateSolarMetrics(modifiedParams, selfConsumptionRate);
        // 计算投资总额
        const capacity = solution.capacity ?? params.simpleParams.capacity ?? 0;
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
                        <tr className="border-b border-slate-100">
                            <td className="px-4 py-3 font-medium">合作方式</td>
                            {solutionResults.map((r, i) => (
                                <td key={i} className={`px-4 py-3 text-center ${
                                    r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''
                                }`}>
                                    <span className={`px-2 py-1 rounded text-white text-xs ${
                                        (r.solution.investmentMode || 'epc') === 'emc'
                                            ? 'bg-amber-500'
                                            : (r.solution.investmentMode || 'epc') === 'financing'
                                                ? 'bg-purple-500'
                                                : (r.solution.investmentMode || 'epc') === 'co_build'
                                                    ? 'bg-cyan-600'
                                                : 'bg-emerald-500'
                                    }`}>
                                        {(r.solution.investmentMode || 'epc') === 'financing'
                                            ? '融资共建'
                                            : (r.solution.investmentMode || 'epc') === 'co_build'
                                                ? '股权共建'
                                                : (r.solution.investmentMode || 'epc').toUpperCase()}
                                    </span>
                                </td>
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
                            <td className="px-4 py-3 font-medium">铺设容量</td>
                            {solutionResults.map((r, i) => (
                                <td key={i} className={`px-4 py-3 text-center ${
                                    r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''
                                }`}>
                                    {(r.solution.capacity ?? params.simpleParams.capacity).toFixed(2)} kWp
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="px-4 py-3 font-medium">组件品牌</td>
                            {solutionResults.map((r, i) => (
                                <td key={i} className={`px-4 py-3 text-center ${r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''}`}>
                                    {MODULE_BRANDS[r.solution.brand].name}
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="px-4 py-3 font-medium">电缆品牌 / 材质</td>
                            {solutionResults.map((r, i) => (
                                <td key={i} className={`px-4 py-3 text-center ${r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''}`}>
                                    {CABLE_BRANDS[r.solution.cableBrand || 'generic'].name} · {r.solution.cableType === 'copper' ? '铜芯' : '铝芯'}
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="px-4 py-3 font-medium">逆变器品牌</td>
                            {solutionResults.map((r, i) => (
                                <td key={i} className={`px-4 py-3 text-center ${r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''}`}>
                                    {INVERTER_BRANDS[r.solution.inverterBrand || 'generic'].name}
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="px-4 py-3 font-medium">建造成本单价</td>
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
                            <td className="px-4 py-3 font-medium">{projectLifeYears}年累计收益</td>
                            {solutionResults.map((r, i) => (
                                <td key={i} className={`px-4 py-3 text-center ${
                                    r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''
                                }`}>
                                    ¥{r.rev25Year.toFixed(2)}万
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className="px-4 py-3 font-medium">业主{projectLifeYears}年收益</td>
                            {solutionResults.map((r, i) => (
                                <td key={i} className={`px-4 py-3 text-center ${
                                    r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''
                                }`}>
                                    ¥{r.totalOwnerBenefit25.toFixed(2)}万
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
