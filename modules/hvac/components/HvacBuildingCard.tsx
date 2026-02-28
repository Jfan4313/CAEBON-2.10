import React from 'react';
import { HvacBuilding, HvacGlobalParams } from '../types';
import { STRATEGIES } from '../hooks';

interface HvacBuildingCardProps {
    building: HvacBuilding;
    mode: 'simple' | 'advanced';
    globalParams: HvacGlobalParams;
    toggleBuilding: (id: number) => void;
    updateBuildingRunHours: (id: number, val: number) => void;
    updateBuildingStrategy: (id: number, val: string) => void;
    updateBuildingSimpleField: (id: number, field: string, val: any) => void;
}

export const HvacBuildingCard: React.FC<HvacBuildingCardProps> = ({
    building: b,
    mode,
    globalParams,
    toggleBuilding,
    updateBuildingRunHours,
    updateBuildingStrategy,
    updateBuildingSimpleField
}) => {
    const strat = STRATEGIES[b.strategy as keyof typeof STRATEGIES];
    // Determine effective values (override or default)
    const effCOP = (mode === 'advanced' && b.customCOP > 0) ? b.customCOP : strat.targetCOP;

    // Calc Invest based on mode
    let invest = 0;
    if (mode === 'simple') {
        invest = (b.load * strat.unitCost) / 10000;
    } else {
        if (b.costMode === 'fixed') {
            invest = b.customTotalInvest > 0 ? b.customTotalInvest : (b.load * strat.unitCost) / 10000;
        } else if (b.costMode === 'area') {
            const areaCost = b.customUnitCost > 0 ? b.customUnitCost : 200;
            invest = (b.area * areaCost) / 10000;
        } else {
            const powerCost = b.customUnitCost > 0 ? b.customUnitCost : strat.unitCost;
            invest = (b.load * powerCost) / 10000;
        }
    }

    const oldP = b.load / globalParams.currentAvgCOP;
    const newP = b.load / effCOP;
    let saving = 0;

    if (b.strategy === 'cchp') {
        const baselineElecCost = (oldP * b.runHours * globalParams.electricityPrice) / 10000;
        const equivalentElecNeeded = b.load / strat.targetCOP * b.runHours;
        const gasNeededVolume = equivalentElecNeeded / 3.5;
        const gasCost = (gasNeededVolume * globalParams.gasPrice) / 10000;
        const extraElecGen = gasNeededVolume * 0.5;
        const extraElecValue = (extraElecGen * globalParams.electricityPrice) / 10000;
        saving = baselineElecCost - gasCost + extraElecValue;
    } else {
        saving = ((oldP - newP) * b.runHours * globalParams.electricityPrice) / 10000;
    }

    return (
        <div className={`flex flex-col rounded-xl border transition-all ${b.active ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 p-4">
                {/* Enable Checkbox & Info */}
                <div className="flex items-center gap-4 min-w-[200px]">
                    <input
                        type="checkbox"
                        checked={b.active}
                        onChange={() => toggleBuilding(b.id)}
                        className="w-5 h-5 accent-primary cursor-pointer shrink-0"
                    />
                    <div>
                        <div className="font-bold text-slate-800">{b.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                            {b.desc} | <span className="font-medium text-slate-700">{b.load} kW</span>
                            <span className="ml-2 text-slate-400">原COP: {globalParams.currentAvgCOP || '无'}</span>
                        </div>
                    </div>
                </div>

                {/* Run Hours Input (Moved here) */}
                <div className="flex flex-col items-center">
                    <label className="text-[10px] text-slate-400 mb-1">年运行 (h)</label>
                    <input
                        type="number"
                        value={b.runHours}
                        onChange={(e) => updateBuildingRunHours(b.id, parseFloat(e.target.value))}
                        className="w-20 px-2 py-1.5 text-sm text-center border border-slate-200 rounded focus:border-primary outline-none bg-white font-medium text-slate-700"
                    />
                </div>

                {/* Strategy Selector */}
                <div className="w-full lg:w-[460px] shrink-0">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        {(['basic', 'intermediate', 'advanced', 'cchp'] as const).map((sKey) => {
                            const s = STRATEGIES[sKey];
                            const isSelected = b.strategy === sKey;
                            let colorClass = 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white';
                            if (isSelected && b.active) {
                                if (sKey === 'basic') colorClass = 'bg-blue-50 border-blue-200 text-blue-700 font-bold ring-1 ring-blue-100';
                                if (sKey === 'intermediate') colorClass = 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold ring-1 ring-emerald-100';
                                if (sKey === 'advanced') colorClass = 'bg-purple-50 border-purple-200 text-purple-700 font-bold ring-1 ring-purple-100';
                                if (sKey === 'cchp') colorClass = 'bg-orange-50 border-orange-200 text-orange-700 font-bold ring-1 ring-orange-100';
                            }

                            return (
                                <button
                                    key={sKey}
                                    onClick={() => b.active && updateBuildingStrategy(b.id, sKey)}
                                    disabled={!b.active}
                                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] transition-all min-h-[64px] ${colorClass}`}
                                >
                                    <span className="mb-1 leading-tight text-center px-1">{s.name}</span>
                                    <span className="text-[10px] opacity-60 border-t border-black/5 pt-1 w-full text-center">COP {s.targetCOP}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Estimates */}
                <div className="flex items-center gap-6 min-w-[180px] justify-end w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-slate-100 pt-3 lg:pt-0 lg:pl-6">
                    <div className="text-right">
                        <div className="text-[10px] text-slate-400">预估投资</div>
                        <div className="text-sm font-bold text-slate-700">¥ {invest.toFixed(1)} 万</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-slate-400">年综合节约</div>
                        <div className="text-sm font-bold text-green-600">¥ {saving.toFixed(1)} 万</div>
                    </div>
                </div>
            </div>

            {/* Advanced Mode: Inline Customization */}
            {mode === 'advanced' && b.active && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-50 bg-slate-50/30 rounded-b-xl flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">精确估值参数微调</span>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Left: Performance */}
                        <div className="flex-1 bg-white p-3 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-3">
                                <label className="text-xs text-slate-500 whitespace-nowrap">目标 COP:</label>
                                <input
                                    type="number" step="0.1"
                                    value={b.customCOP || ''}
                                    placeholder={STRATEGIES[b.strategy as keyof typeof STRATEGIES].targetCOP.toString()}
                                    onChange={(e) => updateBuildingSimpleField(b.id, 'customCOP', parseFloat(e.target.value))}
                                    className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded focus:border-primary outline-none bg-white font-bold text-slate-700"
                                />
                            </div>
                        </div>

                        {/* Right: Cost Estimation Mode */}
                        <div className="flex-[2] bg-white p-3 rounded-lg border border-slate-200 flex flex-col gap-3">
                            {/* Mode Selector Tabs */}
                            <div className="flex gap-1 bg-slate-100 p-1 rounded text-[10px]">
                                <button
                                    onClick={() => updateBuildingSimpleField(b.id, 'costMode', 'power')}
                                    className={`flex-1 py-1.5 rounded transition-all ${b.costMode === 'power' ? 'bg-white text-primary shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    按冷负荷 (元/kW)
                                </button>
                                <button
                                    onClick={() => updateBuildingSimpleField(b.id, 'costMode', 'area')}
                                    className={`flex-1 py-1.5 rounded transition-all ${b.costMode === 'area' ? 'bg-white text-primary shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    按建筑面积 (元/㎡)
                                </button>
                                <button
                                    onClick={() => updateBuildingSimpleField(b.id, 'costMode', 'fixed')}
                                    className={`flex-1 py-1.5 rounded transition-all ${b.costMode === 'fixed' ? 'bg-white text-primary shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    直接录入总价 (万元)
                                </button>
                            </div>

                            {/* Input Fields based on Mode */}
                            <div className="flex items-center gap-4">
                                {b.costMode === 'power' && (
                                    <>
                                        <div className="flex items-center gap-2 flex-1">
                                            <span className="text-xs text-slate-400">当前负荷:</span>
                                            <span className="text-xs font-bold text-slate-700">{b.load} kW</span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-[2]">
                                            <label className="text-xs text-slate-500 whitespace-nowrap">改造成本单价:</label>
                                            <div className="relative w-full">
                                                <input
                                                    type="number" step="10"
                                                    value={b.customUnitCost || ''}
                                                    placeholder={STRATEGIES[b.strategy as keyof typeof STRATEGIES].unitCost.toString()}
                                                    onChange={(e) => updateBuildingSimpleField(b.id, 'customUnitCost', parseFloat(e.target.value))}
                                                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:border-primary outline-none bg-white font-medium"
                                                />
                                                <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">元/kW</span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {b.costMode === 'area' && (
                                    <>
                                        <div className="flex items-center gap-2 flex-1">
                                            <label className="text-xs text-slate-500 whitespace-nowrap">建筑面积:</label>
                                            <div className="relative w-full">
                                                <input
                                                    type="number"
                                                    value={b.area || ''}
                                                    onChange={(e) => updateBuildingSimpleField(b.id, 'area', parseFloat(e.target.value))}
                                                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:border-primary outline-none bg-white font-medium"
                                                />
                                                <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">㎡</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-[1.5]">
                                            <label className="text-xs text-slate-500 whitespace-nowrap">预估单价:</label>
                                            <div className="relative w-full">
                                                <input
                                                    type="number" step="10"
                                                    value={b.customUnitCost || ''}
                                                    placeholder="200"
                                                    onChange={(e) => updateBuildingSimpleField(b.id, 'customUnitCost', parseFloat(e.target.value))}
                                                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:border-primary outline-none bg-white font-medium"
                                                />
                                                <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">元/㎡</span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {b.costMode === 'fixed' && (
                                    <div className="flex items-center gap-2 w-full">
                                        <label className="text-xs text-slate-500 whitespace-nowrap">项目改造总价:</label>
                                        <div className="relative w-full">
                                            <input
                                                type="number" step="1"
                                                value={b.customTotalInvest || ''}
                                                placeholder="0"
                                                onChange={(e) => updateBuildingSimpleField(b.id, 'customTotalInvest', parseFloat(e.target.value))}
                                                className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:border-primary outline-none bg-white font-bold text-slate-800"
                                            />
                                            <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">万元</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
