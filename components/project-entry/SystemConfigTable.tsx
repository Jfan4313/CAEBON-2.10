import React from 'react';
import { Building, EquipmentItem } from './types';

interface SystemConfigTableProps {
    systemKey: keyof Building['systems'];
    items: EquipmentItem[];
    powerUnitLabel: string;
    showType: boolean;
    currentBuildingId: number;
    updateSystemItem: (buildingId: number, systemKey: keyof Building['systems'], itemId: number, field: keyof EquipmentItem, value: any) => void;
    addSystemItem: (buildingId: number, systemKey: keyof Building['systems']) => void;
    removeSystemItem: (buildingId: number, systemKey: keyof Building['systems'], itemId: number) => void;
}

export const SystemConfigTable: React.FC<SystemConfigTableProps> = ({
    systemKey, items, powerUnitLabel, showType, currentBuildingId,
    updateSystemItem, addSystemItem, removeSystemItem
}) => {
    return (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 text-xs text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                        <th className="px-4 py-3">设备/灯具名称</th>

                        {systemKey === 'hvac' ? (
                            <>
                                <th className="px-4 py-3">类型型号形式</th>
                                <th className="px-4 py-3">系统健康度/年限</th>
                                <th className="px-4 py-3">COP (可选)</th>
                            </>
                        ) : (
                            showType && <th className="px-4 py-3">类型/型号</th>
                        )}

                        <th className="px-4 py-3">单台功率 ({powerUnitLabel})</th>
                        <th className="px-4 py-3">数量</th>
                        <th className="px-4 py-3 text-right">合计功率</th>
                        <th className="px-4 py-3 w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {items.map((item) => (
                        <tr key={item.id} className="group hover:bg-slate-50">
                            <td className="px-4 py-2">
                                <input
                                    value={item.name}
                                    onChange={(e) => updateSystemItem(currentBuildingId, systemKey, item.id, 'name', e.target.value)}
                                    className="w-full min-w-[120px] bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary text-slate-700 font-medium"
                                    placeholder="输入名称"
                                />
                            </td>

                            {systemKey === 'hvac' ? (
                                <>
                                    <td className="px-4 py-2">
                                        <select
                                            value={item.type || '多联机 (VRF)'}
                                            onChange={(e) => updateSystemItem(currentBuildingId, systemKey, item.id, 'type', e.target.value)}
                                            className="w-[160px] bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary text-slate-600 appearance-none cursor-pointer"
                                        >
                                            <option>多联机 (VRF)</option>
                                            <option>水冷冷水机组 (Chiller)</option>
                                            <option>风冷模块机组</option>
                                            <option>分体空调 (Split AC)</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-2">
                                        <select
                                            value={item.health || '良 (5-10年)'}
                                            onChange={(e) => updateSystemItem(currentBuildingId, systemKey, item.id, 'health', e.target.value)}
                                            className={`w-[130px] bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary text-xs font-medium appearance-none cursor-pointer
                                                ${item.health?.includes('优') ? 'text-green-600' : item.health?.includes('差') ? 'text-red-500' : 'text-slate-600'}
                                            `}
                                        >
                                            <option>优 (1-5年)</option>
                                            <option>良 (5-10年)</option>
                                            <option>差 (10年以上)</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={item.cop || ''}
                                            onChange={(e) => updateSystemItem(currentBuildingId, systemKey, item.id, 'cop', parseFloat(e.target.value))}
                                            className="w-16 bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary text-slate-600 text-center"
                                            placeholder="-"
                                        />
                                    </td>
                                </>
                            ) : (
                                showType && (
                                    <td className="px-4 py-2">
                                        <input
                                            value={item.type || ''}
                                            onChange={(e) => updateSystemItem(currentBuildingId, systemKey, item.id, 'type', e.target.value)}
                                            className="w-full min-w-[100px] bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary text-slate-600"
                                            placeholder="输入类型"
                                        />
                                    </td>
                                )
                            )}

                            <td className="px-4 py-2">
                                <input
                                    type="number"
                                    value={item.power}
                                    onChange={(e) => updateSystemItem(currentBuildingId, systemKey, item.id, 'power', parseFloat(e.target.value))}
                                    className="w-24 bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary text-slate-600"
                                />
                            </td>
                            <td className="px-4 py-2">
                                <input
                                    type="number"
                                    value={item.count}
                                    onChange={(e) => updateSystemItem(currentBuildingId, systemKey, item.id, 'count', parseFloat(e.target.value))}
                                    className="w-20 bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary text-slate-600"
                                />
                            </td>
                            <td className="px-4 py-2 text-right font-medium text-slate-700">
                                {(item.power * item.count).toLocaleString()} {powerUnitLabel}
                            </td>
                            <td className="px-4 py-2 text-center">
                                <button
                                    onClick={() => removeSystemItem(currentBuildingId, systemKey, item.id)}
                                    className="text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                            </td>
                        </tr>
                    ))}
                    {items.length === 0 && (
                        <tr>
                            <td colSpan={systemKey === 'hvac' ? 8 : (showType ? 6 : 5)} className="px-4 py-8 text-center text-slate-400 text-xs">暂无设备，请添加</td>
                        </tr>
                    )}
                </tbody>
            </table>
            <div className="bg-slate-50/50 p-2 border-t border-slate-200">
                <button
                    onClick={() => addSystemItem(currentBuildingId, systemKey)}
                    className="w-full py-2 text-xs font-medium text-slate-500 hover:text-primary hover:bg-white border border-dashed border-slate-300 hover:border-primary/50 rounded-lg transition-all flex items-center justify-center gap-1"
                >
                    <span className="material-symbols-outlined text-[16px]">add</span> 添加一行
                </button>
            </div>
        </div>
    );
};
