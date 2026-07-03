import React from 'react';
import { MODULE_BRANDS, SolarModuleBrand } from '../types';

interface BrandSelectorProps {
    selectedBrand: SolarModuleBrand;
    onSelect: (brand: SolarModuleBrand) => void;
}

export const ModuleBrandSelector: React.FC<BrandSelectorProps> = ({
    selectedBrand,
    onSelect
}) => {
    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-[#1d1d1f] mb-1">组件品牌选择</h3>
                <p className="text-xs text-slate-400">选择品牌后将自动带入组件衰减参数</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(MODULE_BRANDS).map(([id, config]) => (
                    <div
                        key={id}
                        onClick={() => onSelect(id as SolarModuleBrand)}
                        className={`
                            relative p-4 rounded-[22px] border cursor-pointer transition-all overflow-hidden
                            ${selectedBrand === id
                                ? 'border-[#0071e3]/70 bg-white shadow-[0_18px_42px_rgba(0,113,227,0.12)]'
                                : 'border-slate-200/80 bg-white/80 hover:border-slate-300 hover:shadow-[0_16px_34px_rgba(15,23,42,0.07)]'}
                        `}
                    >
                        {selectedBrand === id && <div className="absolute inset-x-0 top-0 h-1 bg-[#0071e3]"></div>}
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                                <span className="material-icons text-[#0071e3] text-[20px]">factory</span>
                            </div>
                            <div>
                                <h4 className="font-semibold text-[#1d1d1f]">{config.name}</h4>
                                <p className="text-xs text-slate-500">{config.description}</p>
                            </div>
                        </div>
                        <div className="space-y-2 text-xs bg-slate-50 rounded-xl p-3">
                            <div className="flex justify-between">
                                <span className="text-slate-500">首年衰减</span>
                                <span className="font-mono font-bold text-slate-800">
                                    {config.degradationFirstYear}%
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">次年开始衰减</span>
                                <span className="font-mono font-bold text-slate-800">
                                    {config.degradationLinear}%
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {/* 说明卡片 */}
            <div className="bg-[#f5f5f7] border border-slate-200/80 rounded-[22px] p-4">
                <div className="flex items-start gap-2">
                    <span className="material-icons text-[#0071e3] text-xl">info</span>
                    <div className="text-sm text-slate-600">
                        <p className="font-semibold mb-1">衰减率说明</p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            • 首年衰减：组件在第一年的性能损失<br/>
                            • 次年开始衰减：从第二年开始每年的线性衰减<br/>
                            • 不同品牌组件的衰减率存在差异，建议根据供应商数据调整
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
