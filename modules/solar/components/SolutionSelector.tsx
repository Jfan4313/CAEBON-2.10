import React, { useState } from 'react';
import { MODULE_BRANDS, SolarSolution, SolarModuleBrand, CableType } from '../types';
import { ModuleBrandSelector } from './ModuleBrandSelector';
import { LayoutImageUploader } from './LayoutImageUploader';

interface SolutionSelectorProps {
    solutions: SolarSolution[];
    selectedSolutionId: string | null;
    onSelectSolution: (id: string) => void;
    onAddSolution: (solution: SolarSolution) => void;
    onUpdateSolution: (id: string, updates: Partial<SolarSolution>) => void;
    onDeleteSolution: (id: string) => void;
    currentSolution: SolarSolution | null;
}

// 计算方案投资估算
const calculateSolutionInvestment = (solution: SolarSolution, capacity: number) => {
    const baseInvestment = parseFloat((capacity * solution.epcPrice / 10).toFixed(2));
    const voltageUpgradeCost = solution.connectionType === 'high' && solution.voltageUpgradeCost ? solution.voltageUpgradeCost : 0;
    return parseFloat((baseInvestment + voltageUpgradeCost).toFixed(2));
};

export const SolutionSelector: React.FC<SolutionSelectorProps> = ({
    solutions,
    selectedSolutionId,
    onSelectSolution,
    onAddSolution,
    onUpdateSolution,
    onDeleteSolution,
    currentSolution
}) => {
    const handleAdd = () => {
        const newId = `solution-${Date.now()}`;
        // 默认复制当前选定的解决方案，或者使用默认值
        const baseSolution = currentSolution || solutions[0];

        onAddSolution({
            ...baseSolution,
            id: newId,
            name: `${baseSolution.name} (副本)`
        });
        onSelectSolution(newId);
    };

    return (
        <div className="space-y-6">
            {/* 方案顶部操作区 */}
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-800">
                    {solutions.length > 1 ? '接入方案与配置' : '接入方案配置'}
                </h3>
                {solutions.length > 0 && (
                    <button
                        onClick={handleAdd}
                        className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark font-medium bg-primary/10 px-3 py-1.5 rounded-md transition-colors"
                    >
                        <span className="material-icons text-[18px]">add</span>
                        新增对比方案
                    </button>
                )}
            </div>

            {/* 方案卡片列表 - 仅在有多个方案时显示 */}
            {solutions.length > 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {solutions.map((solution) => (
                        <div
                            key={solution.id}
                            onClick={() => onSelectSolution(solution.id)}
                            className={`
                                relative p-4 rounded-xl border-2 transition-all cursor-pointer group
                                ${selectedSolutionId === solution.id
                                    ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg scale-[1.02]'
                                    : 'border-slate-200 hover:border-primary/40 bg-white hover:shadow-md'}
                            `}
                        >
                            {/* 方案头部 */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                        solution.connectionType === 'high'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {solution.connectionType === 'high' ? '10kV高压' : '380V低压'}
                                    </span>
                                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                        solution.cableType === 'copper'
                                            ? 'bg-orange-100 text-orange-700'
                                            : 'bg-slate-100 text-slate-700'
                                    }`}>
                                        {solution.cableType === 'copper' ? '铜芯' : '铝芯'}
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteSolution(solution.id);
                                    }}
                                    className={`
                                        transition-all p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50
                                        ${selectedSolutionId === solution.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                                    `}
                                    title="删除方案"
                                >
                                    <span className="material-icons text-[16px]">delete_outline</span>
                                </button>
                            </div>

                            {/* 方案名称 */}
                            <div className="font-bold text-slate-800 text-base mb-2">{solution.name}</div>

                            {/* 组件品牌 */}
                            <div className="flex items-center gap-1.5 mb-3">
                                <span className="material-icons text-[14px] text-slate-400">business</span>
                                <span className="text-xs text-slate-600">
                                    {solution.brand === 'longi' ? '隆基组件' : solution.brand === 'tongwei' ? '通威组件' : '通用组件'}
                                </span>
                            </div>

                            {/* EPC 单价展示 */}
                            <div className="flex items-baseline gap-1 pt-2 border-t border-slate-100">
                                <span className="text-xs text-slate-500">EPC单价</span>
                                <span className="text-xl font-black text-primary">¥{solution.epcPrice.toFixed(2)}</span>
                                <span className="text-xs text-slate-400">/Wp</span>
                            </div>

                            {/* 选中指示器 */}
                            {selectedSolutionId === solution.id && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                                    <span className="material-icons text-white text-[14px]">check</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* 当前方案详细配置 */}
            {currentSolution && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 mt-4 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 flex-1">
                            <input
                                type="text"
                                value={currentSolution.name}
                                onChange={(e) => onUpdateSolution(currentSolution.id, { name: e.target.value })}
                                className="text-base font-bold text-slate-800 bg-transparent border-b border-dashed border-slate-300 focus:border-primary outline-none px-1 py-0.5 w-1/2 min-w-[200px]"
                                placeholder="方案名称"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 接入方式 */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500">接入电压等级</label>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button
                                    onClick={() => onUpdateSolution(currentSolution.id, { connectionType: 'low' })}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${currentSolution.connectionType === 'low' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                                >
                                    低压 (380V)
                                </button>
                                <button
                                    onClick={() => onUpdateSolution(currentSolution.id, { connectionType: 'high' })}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${currentSolution.connectionType === 'high' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
                                >
                                    高压 (10kV)
                                </button>
                            </div>
                        </div>

                        {/* 线缆材质 */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500">线缆材质</label>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button
                                    onClick={() => onUpdateSolution(currentSolution.id, { cableType: 'aluminum' })}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${currentSolution.cableType === 'aluminum' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                                >
                                    铝缆 (成本优)
                                </button>
                                <button
                                    onClick={() => onUpdateSolution(currentSolution.id, { cableType: 'copper' })}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${currentSolution.cableType === 'copper' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
                                >
                                    铜缆 (性能优)
                                </button>
                            </div>
                        </div>

                        {/* 组件品牌整合 */}
                        <div className="col-span-3 pt-4 border-t border-slate-50">
                            <ModuleBrandSelector
                                selectedBrand={currentSolution.brand}
                                onSelect={(brand) => onUpdateSolution(currentSolution.id, { brand })}
                            />
                        </div>
                    </div>

                    {/* 铺设图上传 */}
                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="material-icons text-[18px] text-primary">map</span>
                            <label className="text-sm font-bold text-slate-700">光伏铺设图</label>
                        </div>
                        <LayoutImageUploader
                            currentImage={currentSolution.layoutImage}
                            onImageChange={(imageData) => onUpdateSolution(currentSolution.id, { layoutImage: imageData })}
                            canUseSameLayout={solutions.length > 1 && currentSolution.id !== solutions[0].id}
                            usingSameLayout={currentSolution.useSameLayout}
                            onToggleSameLayout={(useSame) => onUpdateSolution(currentSolution.id, {
                                useSameLayout: useSame,
                                layoutImage: useSame ? undefined : currentSolution.layoutImage
                            })}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
