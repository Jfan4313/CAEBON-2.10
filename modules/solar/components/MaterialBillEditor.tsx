import React from 'react';
import { SolarMaterialItem } from '../types';

interface MaterialBillEditorProps {
    items: SolarMaterialItem[];
    onChange: (items: SolarMaterialItem[]) => void;
    onReset: () => void;
    showInReport: boolean;
    onToggleReport: (show: boolean) => void;
}

const MATERIAL_COLUMNS: Array<{ key: keyof SolarMaterialItem; label: string; className?: string }> = [
    { key: 'section', label: '分项', className: 'min-w-[120px]' },
    { key: 'sequence', label: '序号', className: 'w-16' },
    { key: 'name', label: '名称', className: 'min-w-[160px]' },
    { key: 'material', label: '材质', className: 'min-w-[120px]' },
    { key: 'brand', label: '品牌', className: 'min-w-[120px]' },
    { key: 'specification', label: '规格型号', className: 'min-w-[180px]' },
    { key: 'theoreticalLength', label: '理论长度', className: 'min-w-[110px]' },
    { key: 'unit', label: '单位', className: 'w-16' },
    { key: 'quantity', label: '数量', className: 'w-20' }
];

export const MaterialBillEditor: React.FC<MaterialBillEditorProps> = ({ items, onChange, onReset, showInReport, onToggleReport }) => {
    const updateItem = (id: string, key: keyof SolarMaterialItem, value: string) => {
        onChange(items.map(item => item.id === id ? { ...item, [key]: value } : item));
    };

    const addItem = () => {
        const lastItem = items[items.length - 1];
        onChange([
            ...items,
            {
                id: `material-${Date.now()}`,
                section: lastItem?.section || '低压光伏',
                sequence: '',
                name: '',
                material: '',
                brand: '',
                specification: '',
                theoreticalLength: '/',
                unit: '项',
                quantity: '1'
            }
        ]);
    };

    const removeItem = (id: string) => {
        onChange(items.filter(item => item.id !== id));
    };

    return (
        <section style={{ order: 8 }} className="solar-apple-section p-6 md:p-8 animate-fade-in">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
                <div>
                    <h3 className="solar-apple-title text-base flex items-center gap-3">
                        <span className="solar-apple-icon material-icons text-[18px]">inventory_2</span> 材料清单
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-2">项目需要材料范围说明时再加入汇报；可按实际品牌、规格、数量在线调整。</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onToggleReport(!showInReport)}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${showInReport ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                        <span className="material-icons text-[15px]">{showInReport ? 'check_circle' : 'radio_button_unchecked'}</span>
                        {showInReport ? '已加入本项目汇报' : '本项目需要时加入汇报'}
                    </button>
                    <button
                        type="button"
                        onClick={addItem}
                        className="px-3 py-2 rounded-xl bg-[#0071e3] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-[#0077ed]"
                    >
                        <span className="material-icons text-[15px]">add</span>新增材料
                    </button>
                    <button
                        type="button"
                        onClick={onReset}
                        className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50"
                    >
                        <span className="material-icons text-[15px]">restart_alt</span>恢复当前方案模板
                    </button>
                </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 overflow-hidden bg-white">
                <div className="max-h-[560px] overflow-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-50">
                            <tr>
                                {MATERIAL_COLUMNS.map(column => (
                                    <th key={column.key} className={`px-3 py-3 text-[11px] font-black text-slate-500 border-b border-slate-200 ${column.className || ''}`}>
                                        {column.label}
                                    </th>
                                ))}
                                <th className="w-14 px-2 py-3 border-b border-slate-200"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/45'}>
                                    {MATERIAL_COLUMNS.map(column => (
                                        <td key={column.key} className="px-2 py-2 border-b border-slate-100">
                                            <input
                                                value={String(item[column.key] || '')}
                                                onChange={(event) => updateItem(item.id, column.key, event.target.value)}
                                                className="w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-[#0071e3] focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10"
                                            />
                                        </td>
                                    ))}
                                    <td className="px-2 py-2 border-b border-slate-100 text-center">
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.id)}
                                            className="w-8 h-8 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500"
                                            aria-label="删除材料"
                                        >
                                            <span className="material-icons text-[16px]">delete_outline</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
};
