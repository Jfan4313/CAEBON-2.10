import React, { useMemo } from 'react';
import { SolarParamsState } from '../types';
import { useSolarMetrics, calculateSolarMetrics } from '../hooks';

interface SensitivityAnalysisProps {
    params: SolarParamsState;
    selfConsumptionRate: number;
}

export const SensitivityAnalysis: React.FC<SensitivityAnalysisProps> = ({
    params,
    selfConsumptionRate
}) => {
    const projectLifeYears = Math.max(1, Math.round(params.advParams.projectLifeYears || 11));
    // 基础 IRR
    const baseResult = useSolarMetrics(params, selfConsumptionRate);
    const baseIrr = baseResult.longTermMetrics.irr;

    // 电价敏感性
    const electricitySensitivity = useMemo(() => {
        const variations = [-20, -10, 0, 10, 20];
        return variations.map(v => {
            const modifiedParams: SolarParamsState = {
                ...params,
                advParams: {
                    ...params.advParams,
                    electricityPrice: params.advParams.electricityPrice * (1 + v / 100)
                }
            };
            const result = calculateSolarMetrics(modifiedParams, selfConsumptionRate);
            return { variation: v, irr: result.irr };
        });
    }, [params, selfConsumptionRate]);

    // 衰减率敏感性
    const degradationSensitivity = useMemo(() => {
        const variations = [-0.2, -0.1, 0, 0.1, 0.2];
        return variations.map(v => {
            const modifiedParams: SolarParamsState = {
                ...params,
                advParams: {
                    ...params.advParams,
                    degradationLinear: params.advParams.degradationLinear + v
                }
            };
            const result = calculateSolarMetrics(modifiedParams, selfConsumptionRate);
            return { variation: v, rev25Year: result.rev25Year };
        });
    }, [params, selfConsumptionRate]);

    // 运维成本敏感性
    const omSensitivity = useMemo(() => {
        const variations = [-20, -10, 0, 10, 20];
        return variations.map(v => {
            const modifiedParams: SolarParamsState = {
                ...params,
                advParams: {
                    ...params.advParams,
                    omCost: params.advParams.omCost * (1 + v / 100)
                }
            };
            const result = calculateSolarMetrics(modifiedParams, selfConsumptionRate);
            return { variation: v, irr: result.irr };
        });
    }, [params, selfConsumptionRate]);

    // 找出最敏感的参数（对IRR影响最大）
    const electricityMaxDelta = Math.max(...electricitySensitivity.map(s => Math.abs(s.irr - baseIrr)));
    const omMaxDelta = Math.max(...omSensitivity.map(s => Math.abs(s.irr - baseIrr)));
    const mostSensitive = electricityMaxDelta > omMaxDelta ? '电价' : '运维成本';

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">敏感性分析</h3>

            {/* 电价敏感性 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    电价对 IRR 的影响
                </h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-blue-50">
                                <th className="px-4 py-2">电价变化</th>
                                <th className="px-4 py-2">调整后电价</th>
                                <th className="px-4 py-2">IRR</th>
                                <th className="px-4 py-2">IRR 变化</th>
                            </tr>
                        </thead>
                        <tbody>
                            {electricitySensitivity.map((s, i) => (
                                <tr key={i} className="border-b">
                                    <td className="px-4 py-2 text-center">
                                        <span className={s.variation < 0 ? 'text-red-600' : s.variation > 0 ? 'text-green-600' : ''}>
                                            {s.variation > 0 ? '+' : ''}{s.variation}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        ¥{(params.advParams.electricityPrice * (1 + s.variation / 100)).toFixed(4)}/度
                                    </td>
                                    <td className="px-4 py-2 text-center font-bold">{s.irr.toFixed(2)}%</td>
                                    <td className="px-4 py-2 text-center">
                                        <span className={s.irr - baseIrr > 0 ? 'text-green-600' : 'text-red-600'}>
                                            {s.irr - baseIrr > 0 ? '+' : ''}{(s.irr - baseIrr).toFixed(2)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 衰减率敏感性 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
                    年衰减率对{projectLifeYears}年发电量的影响
                </h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-amber-50">
                                <th className="px-4 py-2">衰减率变化</th>
                                <th className="px-4 py-2">调整后衰减率</th>
                                <th className="px-4 py-2">{projectLifeYears}年累计发电</th>
                            </tr>
                        </thead>
                        <tbody>
                            {degradationSensitivity.map((s, i) => (
                                <tr key={i} className="border-b">
                                    <td className="px-4 py-2 text-center">
                                        <span className={s.variation < 0 ? 'text-green-600' : s.variation > 0 ? 'text-red-600' : ''}>
                                            {s.variation > 0 ? '+' : ''}{s.variation.toFixed(3)}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        {(params.advParams.degradationLinear + s.variation).toFixed(3)}%
                                    </td>
                                    <td className="px-4 py-2 text-center font-bold">
                                        {s.rev25Year.toFixed(2)}万度
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 运维成本敏感性 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                    运维成本对 IRR 的影响
                </h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-purple-50">
                                <th className="px-4 py-2">运维成本变化</th>
                                <th className="px-4 py-2">调整后运维成本</th>
                                <th className="px-4 py-2">IRR</th>
                                <th className="px-4 py-2">IRR 变化</th>
                            </tr>
                        </thead>
                        <tbody>
                            {omSensitivity.map((s, i) => (
                                <tr key={i} className="border-b">
                                    <td className="px-4 py-2 text-center">
                                        <span className={s.variation < 0 ? 'text-green-600' : s.variation > 0 ? 'text-red-600' : ''}>
                                            {s.variation > 0 ? '+' : ''}{s.variation}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        ¥{(params.advParams.omCost * (1 + s.variation / 100)).toFixed(4)}/Wp/年
                                    </td>
                                    <td className="px-4 py-2 text-center font-bold">{s.irr.toFixed(2)}%</td>
                                    <td className="px-4 py-2 text-center">
                                        <span className={s.irr - baseIrr > 0 ? 'text-green-600' : 'text-red-600'}>
                                            {s.irr - baseIrr > 0 ? '+' : ''}{(s.irr - baseIrr).toFixed(2)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 关键结论 */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="material-icons text-blue-500">lightbulb</span>
                    关键结论
                </h4>
                <ul className="space-y-2 text-sm text-slate-600">
                    <li>• <strong>{mostSensitive}</strong> 是对收益率影响最敏感的因素</li>
                    <li>• 电价每变化 10%，IRR 变化约 {(electricityMaxDelta / 2).toFixed(2)}%</li>
                    <li>• 建议密切关注电价政策变化，必要时通过长期购电协议锁定电价</li>
                    <li>• 组件衰减率选择优质品牌可提升{projectLifeYears}年累计收益</li>
                </ul>
            </div>
        </div>
    );
};
