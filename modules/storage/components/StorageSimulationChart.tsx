import React from 'react';
import { ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StorageSimulationData } from '../types';

interface StorageSimulationChartProps {
    data: StorageSimulationData[];
    mode: 'simple' | 'advanced';
    hasPvSelfConsumption: boolean;
}

export const StorageSimulationChart: React.FC<StorageSimulationChartProps> = ({ data, mode, hasPvSelfConsumption }) => {
    return (
        <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" label={{ value: '功率 (kW)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } }} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" label={{ value: '电价 (元)', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#94a3b8' } }} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                        labelStyle={{ color: '#64748b', marginBottom: '5px', fontWeight: 'bold' }}
                    />

                    {/* Background Load Area */}
                    <Area yAxisId="left" type="monotone" dataKey="load" fill="#f1f5f9" stroke="none" name="原始负荷" isAnimationActive={false} />

                    {/* PV Curve (Optional) */}
                    {mode === 'advanced' && hasPvSelfConsumption && (
                        <Area yAxisId="left" type="monotone" dataKey="pv" fill="#fef08a" stroke="#eab308" strokeWidth={2} name="光伏出力" fillOpacity={0.5} />
                    )}

                    {/* Storage Action Bar */}
                    <Bar yAxisId="left" dataKey="action" fill="#4f46e5" radius={[4, 4, 4, 4]} name="储能动作 (+放 -充)" maxBarSize={30} />

                    {/* Leftover Grid Load */}
                    <Line yAxisId="left" type="stepAfter" dataKey="gridLoad" stroke="#cbd5e1" strokeWidth={2} dot={false} strokeDasharray="5 5" name="电网侧负荷" />

                    {/* Electricity Price Line */}
                    <Line yAxisId="right" type="stepAfter" dataKey="price" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="电价" />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};
