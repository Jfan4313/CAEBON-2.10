import React from 'react';
import { SolarSolution, SolarParamsState, MODULE_BRANDS, CABLE_BRANDS, INVERTER_BRANDS } from '../types';
import { calculateSolarMetrics } from '../hooks';
import { getGenerationWeightedTariff } from '../utils/emcTariff';

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
        const voltageUpgradeCost = solution.connectionType === 'high' ? (solution.voltageUpgradeCost || 15) : 0;
        const totalInvestment = parseFloat((baseInvestment + voltageUpgradeCost).toFixed(2));
        return {
            solution,
            ...longTermMetrics,
            totalInvestment
        };
    });

    // 推荐排序统一按出资方IRR，避免把股权共建的业主IRR与EMC投资方IRR混在一起比较。
    const bestSolution = solutionResults.reduce((best, current) =>
        current.investorIrr > best.investorIrr ? current : best
    );

    const ownerInitialInvestment = (result: (typeof solutionResults)[number]) => {
        if ((result.solution.investmentMode || 'epc') === 'emc') return 0;
        if ((result.solution.investmentMode || 'epc') === 'co_build') return result.ownerInitialInvestment;
        return result.investorInitialInvestment;
    };
    const settlementSummary = (result: (typeof solutionResults)[number]) => {
        const mode = result.solution.investmentMode || 'epc';
        if (mode === 'co_build') return `项目售电 ¥${(result.solution.coBuildSalePrice ?? params.advParams.coBuildSalePrice).toFixed(2)}/度`;
        if (mode !== 'emc') return `业主自用电价 ¥${params.advParams.electricityPrice.toFixed(2)}/度`;
        const emcMode = result.solution.emcSubMode || params.simpleParams.emcSubMode;
        if (emcMode === 'sharing') return `业主分成 ${result.solution.emcOwnerShareRate ?? params.advParams.emcOwnerShareRate}%`;
        if (emcMode === 'fixed') return `固定售电 ¥${(result.solution.emcFixedPrice ?? params.advParams.emcFixedPrice).toFixed(2)}/度`;
        if (emcMode === 'southern_average') return `参考售电 ¥${(result.solution.emcDiscountPrice ?? params.advParams.emcDiscountPrice).toFixed(2)}/度`;
        const benchmark = getGenerationWeightedTariff(
            params.advParams.emcMonthlyTariffs || [],
            'benchmarkPrice',
            result.solution.emcSouthernAveragePrice ?? params.advParams.emcSouthernAveragePrice ?? params.advParams.electricityPrice,
        );
        const discount = result.solution.emcDiscountRate ?? params.advParams.emcDiscountRate;
        return `折扣售电 ¥${(benchmark * Number(discount || 0) / 100).toFixed(2)}/度（基准×${discount}%）`;
    };

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
                        <tr className="border-b border-slate-100">
                            <td className="px-4 py-3 font-medium">售电 / 结算口径</td>
                            {solutionResults.map((r, i) => (
                                <td key={i} className={`px-4 py-3 text-center ${r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''}`}>
                                    {settlementSummary(r)}
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
                            <td className="px-4 py-3 font-medium">出资方初始投入</td>
                            {solutionResults.map((r, i) => (
                                <td key={i} className={`px-4 py-3 text-center ${r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''}`}>
                                    ¥{r.investorInitialInvestment.toFixed(2)}万
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="px-4 py-3 font-medium">业主初始投入</td>
                            {solutionResults.map((r, i) => (
                                <td key={i} className={`px-4 py-3 text-center ${r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''}`}>
                                    ¥{ownerInitialInvestment(r).toFixed(2)}万
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
                            <td className="px-4 py-3 font-medium">出资方 IRR</td>
                            {solutionResults.map((r, i) => (
                                <td key={i} className={`px-4 py-3 text-center ${
                                    r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''
                                }`}>
                                    <span className={r.irr > 15 ? 'text-green-600' : r.irr > 10 ? 'text-yellow-600' : 'text-red-600'}>
                                        {r.investorIrr.toFixed(2)}%
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="px-4 py-3 font-medium">出资方回本周期</td>
                            {solutionResults.map((r, i) => (
                                <td key={i} className={`px-4 py-3 text-center ${
                                    r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''
                                }`}>
                                    {r.investorPaybackReached ? `${r.investorPaybackPeriod.toFixed(2)}年` : '测算期内未回本'}
                                </td>
                            ))}
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="px-4 py-3 font-medium">业主回本周期</td>
                            {solutionResults.map((r, i) => {
                                const isEmc = (r.solution.investmentMode || 'epc') === 'emc';
                                return (
                                    <td key={i} className={`px-4 py-3 text-center ${r.solution.id === bestSolution.solution.id ? 'bg-green-50 font-bold' : ''}`}>
                                        {isEmc ? '业主零投入，不适用' : r.paybackReached ? `${r.paybackPeriod.toFixed(2)}年` : '测算期内未回本'}
                                    </td>
                                );
                            })}
                        </tr>
                        <tr>
                            <td className="px-4 py-3 font-medium">出资方{projectLifeYears}年累计净收益（未扣出资）</td>
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
            <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 px-4 py-3 text-xs leading-relaxed text-slate-600">
                回本周期按“谁出资、谁收回现金流”分别计算。EMC 业主零投入，因此业主回本不适用；EMC 出资方回本按其全额投资及项目净收益计算。股权共建出资方按我方投资比例和分红计算，业主回本则按业主出资及电费优惠、业主分红计算。同一项目在售电价、成本、合作期限和现金流相同的前提下，股权投资方的出资和分红按同一比例缩放，投资方回本周期应与全额出资口径相同；业主回本周期因另含电费优惠，不能与 EMC 业主零投入收益直接比较。推荐方案按出资方 IRR 排序。
            </div>
        </div>
    );
};
