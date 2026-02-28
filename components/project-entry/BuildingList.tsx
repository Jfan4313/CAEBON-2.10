import React from 'react';
import { Building } from './types';

interface BuildingListProps {
    buildings: Building[];
    handleBuildingChange: (id: number, field: string, value: string | number) => void;
    handleDeleteBuilding: (id: number) => void;
    handleAddBuilding: () => void;
}

export const BuildingList: React.FC<BuildingListProps> = ({
    buildings, handleBuildingChange, handleDeleteBuilding, handleAddBuilding
}) => {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
                <label className="text-sm font-semibold text-slate-700">建筑列表</label>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">共 {buildings.length} 栋建筑</span>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-xs text-slate-500 font-semibold border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 w-1/3">建筑名称</th>
                            <th className="px-6 py-4 w-1/4">建筑类型</th>
                            <th className="px-6 py-4 w-1/4">总建筑面积 (㎡)</th>
                            <th className="px-6 py-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {buildings.map((b) => (
                            <tr key={b.id} className="group hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-3">
                                    <input
                                        value={b.name}
                                        onChange={(e) => handleBuildingChange(b.id, 'name', e.target.value)}
                                        className="bg-white w-full outline-none font-medium border border-slate-200 rounded px-2 py-1 focus:border-primary"
                                    />
                                </td>
                                <td className="px-6 py-3">
                                    <select
                                        value={b.type}
                                        onChange={(e) => handleBuildingChange(b.id, 'type', e.target.value)}
                                        className="bg-white w-full outline-none text-slate-600 appearance-none cursor-pointer border border-slate-200 rounded px-2 py-1 focus:border-primary"
                                    >
                                        <option>工厂 (Factory)</option>
                                        <option>办公楼 (Office)</option>
                                        <option>仓库 (Warehouse)</option>
                                        <option>商业 (Retail)</option>
                                        <option>未定义</option>
                                    </select>
                                </td>
                                <td className="px-6 py-3">
                                    <input
                                        type="number"
                                        value={b.area}
                                        onChange={(e) => handleBuildingChange(b.id, 'area', parseFloat(e.target.value))}
                                        className="bg-white w-full outline-none text-slate-600 border border-slate-200 rounded px-2 py-1 focus:border-primary"
                                    />
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <button
                                        onClick={() => handleDeleteBuilding(b.id)}
                                        className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                                        title="删除"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {buildings.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm">暂无建筑，请点击下方按钮添加</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div className="bg-slate-50/50 p-2 border-t border-slate-100">
                    <button
                        onClick={handleAddBuilding}
                        className="w-full py-2.5 text-sm font-medium text-slate-600 hover:text-primary hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                        新增建筑条目
                    </button>
                </div>
            </div>
        </div>
    );
};
