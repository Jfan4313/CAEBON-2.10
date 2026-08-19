import React from 'react';
import { EmcSubMode, InvestmentMode, SolarSolution, SOLAR_CONSTRUCTION_METHODS, CABLE_BRANDS, INVERTER_BRANDS } from '../types';

interface SolutionSelectorProps {
    solutions: SolarSolution[];
    selectedSolutionId: string | null;
    defaultCapacity: number;
    onSelectSolution: (id: string) => void;
    onAddSolution: (solution: SolarSolution) => void;
    onUpdateSolution: (id: string, updates: Partial<SolarSolution>) => void;
    onDeleteSolution: (id: string) => void;
    currentSolution: SolarSolution | null;
}

const getEmcModeLabel = (mode?: EmcSubMode) => {
    switch (mode) {
        case 'sharing': return '收益分成';
        case 'fixed': return '固定电价';
        case 'southern_average': return '折扣电价';
        case 'discount':
        default: return '折扣电价';
    }
};

const getInvestmentModeLabel = (mode?: InvestmentMode) => {
    if (mode === 'emc') return 'EMC';
    if (mode === 'financing') return '融资共建';
    if (mode === 'co_build') return '股权共建';
    return 'EPC';
};

export const SolutionSelector: React.FC<SolutionSelectorProps> = ({
    solutions,
    selectedSolutionId,
    defaultCapacity,
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                <div>
                    <h3 className="text-lg font-semibold text-[#1d1d1f]">
                        {solutions.length > 1 ? '接入方案与配置' : '接入方案配置'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">每个方案独立保存建设方式、合作模式、线缆、组件和投资口径</p>
                </div>
                {solutions.length > 0 && (
                    <button
                        onClick={handleAdd}
                        className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold solar-apple-primary px-4 py-2 rounded-full transition-all hover:brightness-95"
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
                                relative p-4 rounded-[22px] border transition-all cursor-pointer group overflow-hidden
                                ${selectedSolutionId === solution.id
                                    ? 'border-[#0071e3]/70 bg-white shadow-[0_18px_42px_rgba(0,113,227,0.12)]'
                                    : 'border-slate-200/80 bg-white/80 hover:border-slate-300 hover:shadow-[0_16px_34px_rgba(15,23,42,0.07)]'}
                            `}
                        >
                            {selectedSolutionId === solution.id && (
                                <div className="absolute inset-x-0 top-0 h-1 bg-[#0071e3]"></div>
                            )}
                            {/* 方案头部 */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="solar-apple-pill px-2.5 py-1 text-xs font-semibold">
                                        {solution.connectionType === 'high' ? '10kV高压' : '380V低压'}
                                    </span>
                                    <span className="solar-apple-pill px-2.5 py-1 text-xs font-semibold">
                                        {solution.cableType === 'copper' ? '铜芯' : '铝芯'}
                                    </span>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                        (solution.investmentMode || 'epc') === 'emc'
                                            ? 'bg-[#0071e3]/10 text-[#0071e3]'
                                            : (solution.investmentMode || 'epc') === 'financing'
                                                ? 'bg-purple-100 text-purple-700'
                                                : (solution.investmentMode || 'epc') === 'co_build'
                                                    ? 'bg-cyan-100 text-cyan-700'
                                            : 'bg-slate-100 text-slate-700'
                                    }`}>
                                        {getInvestmentModeLabel(solution.investmentMode)}
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
                            <div className="font-semibold text-[#1d1d1f] text-base mb-2 leading-snug">{solution.name}</div>

                            {/* 组件品牌 */}
                            <div className="flex items-center gap-1.5 mb-3">
                                <span className="material-icons text-[14px] text-slate-400">business</span>
                                <span className="text-xs text-slate-600">
                                    {solution.brand === 'longi' ? '隆基组件' : solution.brand === 'tongwei' ? '通威组件' : '通用组件'}
                                    {(solution.investmentMode || 'epc') === 'emc' ? ` · ${getEmcModeLabel(solution.emcSubMode)}` : ''}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 mb-3">
                                <span className="material-icons text-[14px] text-slate-400">electrical_services</span>
                                <span className="text-xs text-slate-600">
                                    {CABLE_BRANDS[solution.cableBrand || 'generic'].name} · {INVERTER_BRANDS[solution.inverterBrand || 'generic'].name}逆变器
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 mb-3">
                                <span className="material-icons text-[14px] text-slate-400">foundation</span>
                                <span className="text-xs text-slate-600">
                                    {SOLAR_CONSTRUCTION_METHODS[solution.constructionMethod || 'rooftop'].name}
                                </span>
                            </div>

                            {/* 建造成本单价展示 */}
                            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                                <div>
                                    <div className="text-[10px] text-slate-400">铺设容量</div>
                                    <div className="text-sm font-semibold text-slate-800">{(solution.capacity ?? defaultCapacity).toFixed(0)} kWp</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-400">建造成本</div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-lg font-semibold text-[#0071e3]">¥{solution.epcPrice.toFixed(2)}</span>
                                        <span className="text-[10px] text-slate-400">/Wp</span>
                                    </div>
                                </div>
                            </div>

                            {/* 选中指示器 */}
                            {selectedSolutionId === solution.id && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#0071e3] rounded-full flex items-center justify-center shadow-lg">
                                    <span className="material-icons text-white text-[14px]">check</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* 当前方案详细配置 */}
            {currentSolution && (
                <div className="solar-apple-panel p-5 mt-4 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/90 rounded-[18px] border border-white p-4 shadow-sm">
                            <label className="text-xs font-semibold text-slate-500 mb-2 block">方案名称</label>
                            <div className="flex items-center gap-2">
                                <span className="material-icons text-slate-300 text-[18px]">edit_note</span>
                                <input
                                    type="text"
                                    value={currentSolution.name}
                                    onChange={(e) => onUpdateSolution(currentSolution.id, { name: e.target.value })}
                                    className="text-base font-semibold text-[#1d1d1f] bg-transparent border-none outline-none px-1 py-1 w-full"
                                    placeholder="方案名称"
                                />
                            </div>
                        </div>

                        <div className="bg-white/90 rounded-[18px] border border-white p-4 shadow-sm">
                            <label className="text-xs font-semibold text-slate-500 mb-2 block">本方案铺设容量</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    step="1"
                                    value={currentSolution.capacity ?? defaultCapacity}
                                    onChange={(e) => {
                                        const nextCapacity = parseFloat(e.target.value) || 0;
                                        onUpdateSolution(currentSolution.id, { capacity: nextCapacity });
                                    }}
                                    className="text-base font-semibold text-[#1d1d1f] bg-transparent border-none outline-none px-1 py-1 w-full"
                                />
                                <span className="text-xs text-slate-400 font-mono">kWp</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-3">
                                <span className="text-[10px] text-slate-400">
                                    {currentSolution.capacity ? '该方案使用独立容量' : '当前跟随楼栋容量汇总'}
                                </span>
                                {currentSolution.capacity && (
                                    <button
                                        onClick={() => onUpdateSolution(currentSolution.id, { capacity: undefined })}
                                        className="text-[10px] font-semibold text-[#0071e3] hover:text-blue-700"
                                    >
                                        跟随楼栋汇总
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 rounded-[18px] border border-white bg-white/90 shadow-sm">
                        <label className="text-xs font-semibold text-slate-500 mb-2 block">当前方案合作模式</label>
                        <div className="solar-apple-segment grid grid-cols-1 md:grid-cols-4 gap-2">
                            {[
                                { id: 'emc', label: 'EMC 节能分成', icon: 'handshake' },
                                { id: 'epc', label: 'EPC 工程总包', icon: 'construction' },
                                { id: 'financing', label: '融资共建', icon: 'payments' },
                                { id: 'co_build', label: '股权共建', icon: 'group_work' }
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => onUpdateSolution(currentSolution.id, { investmentMode: mode.id as InvestmentMode })}
                                    className={`solar-apple-segment-item flex items-center justify-center gap-2 py-3 text-xs ${(currentSolution.investmentMode || 'epc') === mode.id ? 'is-active' : ''}`}
                                >
                                    <span className="material-icons text-[18px]">{mode.icon}</span>
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
