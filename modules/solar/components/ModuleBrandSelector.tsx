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
            <h3 className="text-lg font-bold text-slate-800 mb-2">组件品牌选择</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(MODULE_BRANDS).map(([id, config]) => (
                    <div
                        key={id}
                        onClick={() => onSelect(id as SolarModuleBrand)}
                        className={`
                            p-4 rounded-lg border-2 cursor-pointer transition-all
                            ${selectedBrand === id
                                ? 'border-primary bg-primary/5 shadow-md'
                                : 'border-slate-200 hover:border-primary/50 bg-white hover:shadow-sm'}
                        `}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="text-2xl">🏭</div>
                            <div>
                                <h4 className="font-bold text-slate-800">{config.name}</h4>
                                <p className="text-xs text-slate-500">{config.description}</p>
                            </div>
                        </div>
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">首年衰减</span>
                                <span className="font-mono text-slate-800">
                                    {config.degradationFirstYear}%
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">次年开始衰减</span>
                                <span className="font-mono text-slate-800">
                                    {config.degradationLinear}%
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {/* 说明卡片 */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-start gap-2">
                    <span className="material-icons text-blue-500 text-xl">info</span>
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
