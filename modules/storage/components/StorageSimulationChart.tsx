import React, { useMemo } from 'react';
import { ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StorageSimulationData } from '../types';

interface StorageSimulationChartProps {
    data: StorageSimulationData[];
    mode: 'simple' | 'advanced';
    hasPvSelfConsumption: boolean;
    expanded?: boolean;
}

const formatWindows = (data: StorageSimulationData[], predicate: (row: StorageSimulationData) => boolean): string => {
    const hours = data.filter(predicate).map(row => Number.parseInt(row.hour, 10));
    if (hours.length === 0) return '无';
    const ranges: string[] = [];
    let start = hours[0];
    let previous = hours[0];
    hours.slice(1).forEach(hour => {
        if (hour === previous + 1) {
            previous = hour;
            return;
        }
        ranges.push(`${String(start).padStart(2, '0')}:00–${String(previous + 1).padStart(2, '0')}:00`);
        start = hour;
        previous = hour;
    });
    ranges.push(`${String(start).padStart(2, '0')}:00–${String(previous + 1).padStart(2, '0')}:00`);
    return ranges.join('、');
};

export const StorageSimulationChart: React.FC<StorageSimulationChartProps> = ({ data, mode, hasPvSelfConsumption, expanded = false }) => {
    const chartData = useMemo(() => data.map(row => ({
        ...row,
        chargePower: row.action < 0 ? Math.abs(row.action) : 0,
        dischargePower: row.action > 0 ? row.action : 0,
    })), [data]);
    const chargeWindows = useMemo(() => formatWindows(data, row => row.action < -0.01), [data]);
    const dischargeWindows = useMemo(() => formatWindows(data, row => row.action > 0.01), [data]);
    const chargedEnergy = data.reduce((total, row) => total + (row.action < 0 ? Math.abs(row.action) : 0), 0);
    const dischargedEnergy = data.reduce((total, row) => total + (row.action > 0 ? row.action : 0), 0);
    const maxSoc = Math.max(0, ...data.map(row => row.soc));

    return (
        <div className={`w-full flex flex-col ${expanded ? 'h-full min-h-[430px]' : 'h-[430px]'}`}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4 shrink-0">
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                    <div className="text-[10px] font-bold text-blue-500">蓝色 · 充电时段</div>
                    <div className="text-xs font-bold text-blue-900 mt-1 truncate" title={chargeWindows}>{chargeWindows}</div>
                </div>
                <div className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2">
                    <div className="text-[10px] font-bold text-orange-500">橙色 · 放电时段</div>
                    <div className="text-xs font-bold text-orange-900 mt-1 truncate" title={dischargeWindows}>{dischargeWindows}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-[10px] font-bold text-slate-500">典型日充 / 放电量</div>
                    <div className="text-xs font-bold text-slate-800 mt-1">{chargedEnergy.toFixed(1)} / {dischargedEnergy.toFixed(1)} kWh</div>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                    <div className="text-[10px] font-bold text-emerald-600">绿色 · 最高 SOC（剩余电量）</div>
                    <div className="text-xs font-bold text-emerald-900 mt-1">{maxSoc.toFixed(1)}%</div>
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 12, right: 28, bottom: 10, left: 2 }} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                        <YAxis yAxisId="power" label={{ value: '功率 (kW)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#64748b' } }} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="soc" orientation="right" domain={[0, 100]} label={{ value: 'SOC (%)', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#059669' } }} tick={{ fontSize: 10, fill: '#059669' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="price" hide domain={['auto', 'auto']} />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.12)', padding: '12px' }}
                            labelStyle={{ color: '#334155', marginBottom: '7px', fontWeight: 'bold' }}
                            formatter={(value, name) => {
                                const numericValue = Number(value || 0);
                                if (name === '储能SOC') return [`${numericValue.toFixed(1)}%`, name];
                                if (name === '分时电价') return [`${numericValue.toFixed(3)} 元/kWh`, name];
                                return [`${numericValue.toFixed(1)} kW`, name];
                            }}
                        />
                        <Area yAxisId="power" type="monotone" dataKey="load" fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1.5} name="项目负荷" fillOpacity={0.45} isAnimationActive={false} />
                        {mode === 'advanced' && hasPvSelfConsumption && (
                            <Area yAxisId="power" type="monotone" dataKey="pv" fill="#fde68a" stroke="#eab308" strokeWidth={2} name="光伏出力" fillOpacity={0.48} />
                        )}
                        <Bar yAxisId="power" dataKey="chargePower" fill="#2563eb" radius={[4, 4, 0, 0]} name="充电功率" maxBarSize={22} />
                        <Bar yAxisId="power" dataKey="dischargePower" fill="#f97316" radius={[4, 4, 0, 0]} name="放电功率" maxBarSize={22} />
                        <Line yAxisId="power" type="stepAfter" dataKey="gridLoad" stroke="#475569" strokeWidth={2} dot={false} name="电网侧负荷" />
                        <Line yAxisId="soc" type="monotone" dataKey="soc" stroke="#059669" strokeWidth={3} dot={{ r: 2, fill: '#059669' }} name="储能SOC" />
                        <Line yAxisId="price" type="stepAfter" dataKey="price" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="分时电价" />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-500 shrink-0">
                <span><i className="inline-block w-2 h-2 bg-blue-600 rounded-sm mr-1" />充电（吸收光伏余电）</span>
                <span><i className="inline-block w-2 h-2 bg-orange-500 rounded-sm mr-1" />放电（供应项目负荷）</span>
                <span><i className="inline-block w-4 h-0.5 bg-emerald-600 align-middle mr-1" />SOC</span>
                <span><i className="inline-block w-4 h-0.5 bg-slate-600 align-middle mr-1" />电网侧负荷</span>
                <span><i className="inline-block w-4 border-t border-dashed border-red-500 align-middle mr-1" />分时电价</span>
                <span className="text-emerald-700">SOC=荷电状态；按90% DOD时，10% SOC为保护下限。</span>
            </div>
        </div>
    );
};
