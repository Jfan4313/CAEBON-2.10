import React, { useMemo } from 'react';
import type { PvConsumptionPoint } from '../utils/pvConsumption';

export const PvConsumptionChart: React.FC<{ data: PvConsumptionPoint[]; title?: string; dataBasis?: string }> = ({ data, title = '光伏发电与消纳曲线', dataBasis }) => {
    const summary = useMemo(() => {
        const pv = data.reduce((total, row) => total + row.pv, 0);
        const direct = data.reduce((total, row) => total + row.directConsumption, 0);
        const storage = data.reduce((total, row) => total + row.storageCharge, 0);
        const surplus = data.reduce((total, row) => total + row.remainingSurplus, 0);
        const maxPower = Math.max(1, ...data.flatMap(row => [
            row.load, row.pv, row.directConsumption, row.storageCharge, row.remainingSurplus,
        ]));
        return { pv, direct, storage, surplus, maxPower, rate: pv > 0 ? (direct + storage) / pv * 100 : 0 };
    }, [data]);

    const width = 960;
    const height = 300;
    const left = 52;
    const right = 18;
    const top = 16;
    const bottom = 36;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const xFor = (index: number) => left + (data.length <= 1 ? plotWidth / 2 : index / (data.length - 1) * plotWidth);
    const yFor = (value: number) => top + plotHeight - Math.max(0, value) / summary.maxPower * plotHeight;
    const pointsFor = (key: 'load' | 'pv' | 'remainingSurplus') => (
        data.map((row, index) => `${xFor(index)},${yFor(row[key])}`).join(' ')
    );
    const pvAreaPoints = data.length > 0
        ? `${left},${top + plotHeight} ${pointsFor('pv')} ${xFor(data.length - 1)},${top + plotHeight}`
        : '';
    const barWidth = Math.max(4, plotWidth / Math.max(1, data.length) * 0.5);

    return (
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-4">
                <div>
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><span className="material-icons text-amber-500">solar_power</span>{title}</h3>
                    <p className="text-[10px] text-slate-500 mt-1">绿色为负荷直接消纳，蓝色为储能吸收，红线为仍需上网或限制的剩余光伏。</p>
                    {dataBasis && <p className="text-[10px] text-indigo-600 mt-1">{dataBasis}</p>}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0">
                    <div className="rounded bg-amber-50 px-3 py-2"><div className="text-[9px] text-amber-600">典型日发电</div><div className="text-xs font-bold text-amber-900">{summary.pv.toFixed(1)} kWh</div></div>
                    <div className="rounded bg-emerald-50 px-3 py-2"><div className="text-[9px] text-emerald-600">直接消纳</div><div className="text-xs font-bold text-emerald-900">{summary.direct.toFixed(1)} kWh</div></div>
                    <div className="rounded bg-blue-50 px-3 py-2"><div className="text-[9px] text-blue-600">储能吸收</div><div className="text-xs font-bold text-blue-900">{summary.storage.toFixed(1)} kWh</div></div>
                    <div className="rounded bg-rose-50 px-3 py-2"><div className="text-[9px] text-rose-600">综合消纳率</div><div className="text-xs font-bold text-rose-900">{summary.rate.toFixed(1)}%</div></div>
                </div>
            </div>
            <div className="h-[320px] w-full overflow-hidden">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-full"
                    role="img"
                    aria-label="光伏发电、项目负荷与消纳曲线"
                    preserveAspectRatio="none"
                >
                    {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                        const y = top + plotHeight * ratio;
                        const value = summary.maxPower * (1 - ratio);
                        return (
                            <g key={ratio}>
                                <line x1={left} y1={y} x2={left + plotWidth} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                                <text x={left - 8} y={y + 4} textAnchor="end" fontSize="9" fill="#64748b">{value.toFixed(0)}</text>
                            </g>
                        );
                    })}
                    <text x="13" y={top + plotHeight / 2} textAnchor="middle" fontSize="10" fill="#64748b" transform={`rotate(-90 13 ${top + plotHeight / 2})`}>功率 (kW)</text>
                    {pvAreaPoints && <polygon points={pvAreaPoints} fill="#fde68a" fillOpacity="0.45" />}
                    {data.map((row, index) => {
                        const x = xFor(index);
                        const directY = yFor(row.directConsumption);
                        const storageY = yFor(row.directConsumption + row.storageCharge);
                        return (
                            <g key={row.hour}>
                                <rect
                                    x={x - barWidth / 2}
                                    y={directY}
                                    width={barWidth}
                                    height={top + plotHeight - directY}
                                    rx="2"
                                    fill="#22c55e"
                                    fillOpacity="0.68"
                                >
                                    <title>{`${row.hour} 直接消纳 ${row.directConsumption.toFixed(1)} kW`}</title>
                                </rect>
                                {row.storageCharge > 0 && (
                                    <rect
                                        x={x - barWidth / 2}
                                        y={storageY}
                                        width={barWidth}
                                        height={directY - storageY}
                                        rx="2"
                                        fill="#2563eb"
                                    >
                                        <title>{`${row.hour} 储能吸收 ${row.storageCharge.toFixed(1)} kW`}</title>
                                    </rect>
                                )}
                                {index % 3 === 0 && (
                                    <text x={x} y={height - 13} textAnchor="middle" fontSize="9" fill="#64748b">{row.hour}</text>
                                )}
                            </g>
                        );
                    })}
                    {data.length > 1 && (
                        <>
                            <polyline points={pointsFor('pv')} fill="none" stroke="#eab308" strokeWidth="2.5" />
                            <polyline points={pointsFor('load')} fill="none" stroke="#475569" strokeWidth="2.5" />
                            <polyline points={pointsFor('remainingSurplus')} fill="none" stroke="#e11d48" strokeWidth="2.5" strokeDasharray="6 4" />
                        </>
                    )}
                </svg>
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-4 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><i className="w-3 h-0.5 bg-amber-500" />光伏出力</span>
                <span className="flex items-center gap-1"><i className="w-3 h-2 bg-emerald-500/70" />直接消纳</span>
                <span className="flex items-center gap-1"><i className="w-3 h-2 bg-blue-600" />储能吸收</span>
                <span className="flex items-center gap-1"><i className="w-3 h-0.5 bg-slate-600" />项目负荷</span>
                <span className="flex items-center gap-1"><i className="w-3 border-t-2 border-dashed border-rose-600" />剩余光伏</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">剩余光伏：{summary.surplus.toFixed(1)} kWh/典型日。无储能时蓝色为0；配置储能后，蓝色部分从红色剩余光伏中转存。</div>
        </section>
    );
};
