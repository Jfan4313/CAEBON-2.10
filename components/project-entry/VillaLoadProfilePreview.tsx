import React, { useMemo } from 'react';
import { getMonthlySeasonalFactors } from '../../shared/utils/monthlyLoadEstimation';
import { VILLA_RESIDENTIAL_LOAD_PROFILE, VILLA_SUMMER_AC_LOAD_PROFILE } from '../../shared/utils/projectLoadProfiles';
import { EditableNumberInput } from '../../shared/components/EditableNumberInput';

const VILLA_MONTHLY_FACTORS = getMonthlySeasonalFactors({
    projectType: 'villa',
    province: 'Guangdong',
    hasAirConditioning: true,
});

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const distributeDailyEnergy = (profile: number[], dailyKwh: number) => {
    const total = Math.max(0.0001, sum(profile));
    return profile.map(value => value / total * dailyKwh);
};

interface VillaLoadProfilePreviewProps {
    dailyKwh: number;
    onDailyKwhChange: (value: number) => void;
}

export const VillaLoadProfilePreview: React.FC<VillaLoadProfilePreviewProps> = ({
    dailyKwh,
    onDailyKwhChange,
}) => {
    const averageDailyKwh = Math.max(1, Number(dailyKwh) || 35);
    const summerFactor = VILLA_MONTHLY_FACTORS.slice(5, 9).reduce((total, value) => total + value, 0) / 4;
    const normalFactors = VILLA_MONTHLY_FACTORS.filter((_, index) => index < 5 || index > 8);
    const normalFactor = normalFactors.reduce((total, value) => total + value, 0) / normalFactors.length;
    const normalDailyKwh = averageDailyKwh * normalFactor;
    const summerDailyKwh = averageDailyKwh * summerFactor;
    const normalHourlyKwh = useMemo(
        () => distributeDailyEnergy(VILLA_RESIDENTIAL_LOAD_PROFILE, normalDailyKwh),
        [normalDailyKwh],
    );
    const summerHourlyKwh = useMemo(
        () => distributeDailyEnergy(VILLA_SUMMER_AC_LOAD_PROFILE, summerDailyKwh),
        [summerDailyKwh],
    );
    const maxHourlyKwh = Math.max(...normalHourlyKwh, ...summerHourlyKwh, 0.01);
    const annualKwh = averageDailyKwh * 365;
    const peakHourKwh = Math.max(...summerHourlyKwh);

    return (
        <div className="md:col-span-2 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-cyan-50 p-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <div>
                    <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                        <span className="material-icons text-emerald-600 text-lg">villa</span>
                        别墅户用用电曲线预测
                    </h4>
                    <p className="text-xs text-emerald-700 mt-1">输入全年平均每天用电量，系统按家庭作息和夏季全天空调场景分配到每个小时。</p>
                </div>
                <label className="shrink-0 text-[10px] font-bold text-emerald-800">
                    预计平均日用电量（kWh/天）
                    <EditableNumberInput
                        min={1}
                        step="1"
                        value={averageDailyKwh}
                        onValueChange={(value) => onDailyKwhChange(Math.max(1, value))}
                        className="mt-1 w-40 px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm font-black text-emerald-900 outline-none focus:border-emerald-500"
                    />
                </label>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="rounded-lg bg-white/75 border border-emerald-100 px-3 py-2">
                    <p className="text-[9px] text-emerald-600">预计年用电量</p>
                    <p className="text-sm font-black text-emerald-900">{(annualKwh / 10000).toFixed(2)}万 kWh</p>
                </div>
                <div className="rounded-lg bg-white/75 border border-emerald-100 px-3 py-2">
                    <p className="text-[9px] text-emerald-600">普通季典型日</p>
                    <p className="text-sm font-black text-emerald-900">{normalDailyKwh.toFixed(1)} kWh</p>
                </div>
                <div className="rounded-lg bg-orange-50/90 border border-orange-100 px-3 py-2">
                    <p className="text-[9px] text-orange-600">夏季全天空调日</p>
                    <p className="text-sm font-black text-orange-800">{summerDailyKwh.toFixed(1)} kWh</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2">
                    <p className="text-[10px] font-bold text-emerald-800 mb-1.5">每小时预计用电量（普通季 / 夏季全天空调）</p>
                    <div className="h-28 flex items-end gap-1 rounded-lg bg-white/75 border border-emerald-100 px-3 pt-3 pb-2">
                        {normalHourlyKwh.map((value, hour) => (
                            <div key={hour} className="flex-1 h-full flex flex-col justify-end items-center gap-1" title={`${hour}:00 普通季 ${value.toFixed(2)}kWh / 夏季 ${summerHourlyKwh[hour].toFixed(2)}kWh`}>
                                <div className="w-full h-full flex items-end justify-center gap-px">
                                    <div
                                        className={`w-1/2 rounded-t-sm ${hour >= 18 && hour <= 22 ? 'bg-emerald-600' : hour >= 6 && hour <= 8 ? 'bg-cyan-500' : 'bg-emerald-300'}`}
                                        style={{ height: `${value / maxHourlyKwh * 78}px` }}
                                        title={`${hour}:00 普通季 · ${value.toFixed(2)} kWh`}
                                    />
                                    <div
                                        className="w-1/2 rounded-t-sm bg-orange-400"
                                        style={{ height: `${summerHourlyKwh[hour] / maxHourlyKwh * 78}px` }}
                                        title={`${hour}:00 夏季全天空调 · ${summerHourlyKwh[hour].toFixed(2)} kWh`}
                                    />
                                </div>
                                {hour % 3 === 0 && <span className="text-[8px] text-emerald-700">{hour}</span>}
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between gap-4 mt-1 text-[9px] text-emerald-700">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-emerald-500" />普通季</span>
                            <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-orange-400" />夏季全天空调</span>
                        </div>
                        <span>夏季小时峰值约 {peakHourKwh.toFixed(2)} kWh</span>
                    </div>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-emerald-800 mb-1.5">每月预计用电量</p>
                    <div className="h-28 flex items-end gap-1 rounded-lg bg-white/75 border border-emerald-100 px-2 pt-3 pb-2">
                        {VILLA_MONTHLY_FACTORS.map((value, index) => {
                            const monthlyKwh = annualKwh / 12 * value;
                            return (
                                <div key={index} className="flex-1 h-full flex flex-col justify-end items-center gap-1" title={`${index + 1}月 · ${monthlyKwh.toFixed(0)} kWh`}>
                                    <div className={`w-full rounded-t-sm ${index >= 5 && index <= 8 ? 'bg-orange-400' : 'bg-cyan-400'}`} style={{ height: `${Math.min(78, value * 54)}px` }} />
                                    <span className="text-[7px] text-emerald-700">{index + 1}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-[10px] text-emerald-800">
                <div className="rounded bg-white/70 px-2 py-1.5">06–09时：早餐与起居</div>
                <div className="rounded bg-white/70 px-2 py-1.5">09–17时：住宅基础负荷</div>
                <div className="rounded bg-white/70 px-2 py-1.5">18–22时：家庭用电主峰</div>
                <div className="rounded bg-white/70 px-2 py-1.5">夏季：空调全天连续基荷</div>
            </div>
        </div>
    );
};
