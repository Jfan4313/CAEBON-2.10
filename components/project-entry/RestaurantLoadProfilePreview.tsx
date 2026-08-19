import React from 'react';
import { RESTAURANT_LOAD_PROFILE } from '../../shared/utils/projectLoadProfiles';

export const RestaurantLoadProfilePreview: React.FC = () => (
    <div className="md:col-span-2 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
        <div className="flex items-start justify-between gap-4 mb-4">
            <div>
                <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                    <span className="material-icons text-amber-600 text-lg">restaurant</span>
                    饭店酒楼典型日用电曲线
                </h4>
                <p className="text-xs text-amber-700 mt-1">用于缺少实测负荷数据时的估算；午餐和晚餐为双峰，夜间保留冷藏与基础通风负荷。</p>
            </div>
            <span className="shrink-0 rounded-full bg-white border border-amber-200 px-3 py-1 text-[10px] font-bold text-amber-700">估算级</span>
        </div>
        <div className="h-24 flex items-end gap-1 rounded-lg bg-white/70 border border-amber-100 px-3 pt-3 pb-2">
            {RESTAURANT_LOAD_PROFILE.map((value, hour) => (
                <div key={hour} className="flex-1 h-full flex flex-col justify-end items-center gap-1" title={`${hour}:00 · ${Math.round(value * 100)}%峰值负荷`}>
                    <div className={`w-full rounded-t-sm ${hour >= 11 && hour <= 13 ? 'bg-orange-500' : hour >= 17 && hour <= 21 ? 'bg-red-500' : 'bg-amber-300'}`} style={{ height: `${value * 72}px` }} />
                    {hour % 3 === 0 && <span className="text-[8px] text-amber-700">{hour}</span>}
                </div>
            ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-[10px] text-amber-800">
            <div className="rounded bg-white/70 px-2 py-1.5">06–10时：备餐升负荷</div>
            <div className="rounded bg-white/70 px-2 py-1.5">11–14时：午餐高峰</div>
            <div className="rounded bg-white/70 px-2 py-1.5">17–21时：晚餐高峰</div>
            <div className="rounded bg-white/70 px-2 py-1.5">夜间：冷藏基础负荷</div>
        </div>
    </div>
);
