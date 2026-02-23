import React, { useState, useEffect } from 'react';
import { DeviceImageConfig, PanelState, Position, Size } from '../../../types';
import { useDeviceConfigs } from './hooks/useDeviceConfigs';

interface ConfigPanelProps {
    configs: DeviceImageConfig[];
    selectedId: string | null;
    onAdd: (config: DeviceImageConfig) => void;
    onUpdate: (id: string, updates: Partial<DeviceImageConfig>) => void;
    onDelete: (id: string) => void;
    onSave: () => void;
    onReset: () => void;
    onClose: () => void;
}

interface ConfigFormProps {
    config: DeviceImageConfig;
    onUpdate: (id: string, updates: Partial<DeviceImageConfig>) => void;
    onDelete: (id: string) => void;
}

/**
 * 配置项表单
 */
const ConfigForm: React.FC<ConfigFormProps> = ({ config, onUpdate, onDelete }) => {
    const handlePositionChange = (field: 'top' | 'bottom' | 'left' | 'right', value: number) => {
        const position = { ...config.position, [field]: value };
        onUpdate(config.id, { position });
    };

    const handleSizeChange = (field: 'width' | 'height', value: number | 'auto') => {
        const size = { ...config.size, [field]: value };
        onUpdate(config.id, { size });
    };

    const handleLinkedDeviceChange = (value: string) => {
        onUpdate(config.id, { linkedDevice: value });
    };

    const handleZIndexChange = (value: number) => {
        onUpdate(config.id, { zIndex: value });
    };

    const handleVisibleChange = (value: boolean) => {
        onUpdate(config.id, { visible: value });
    };

    return (
        <div className={`p-4 border-b border-slate-100 rounded-lg ${config.id === 'sceneBackground' ? 'bg-slate-50' : 'bg-white'}`}>
            {/* 配置项名称 */}
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-sm text-slate-800">{config.name}</h4>
                <button
                    onClick={() => onDelete(config.id)}
                    className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded transition-colors"
                >
                    删除
                </button>
            </div>

            {/* 表单字段 */}
            <div className="grid grid-cols-2 gap-3 text-sm">
                {/* 位置设置 */}
                <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">位置 Top (%)</label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={config.position.top || 0}
                        onChange={(e) => handlePositionChange('top', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded text-xs"
                    />
                    <label className="block text-xs font-medium text-slate-600 mb-1">位置 Left (%)</label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={config.position.left || 0}
                        onChange={(e) => handlePositionChange('left', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded text-xs"
                    />
                    <label className="block text-xs font-medium text-slate-600 mb-1">位置 Bottom (%)</label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={config.position.bottom || 0}
                        onChange={(e) => handlePositionChange('bottom', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded text-xs"
                    />
                    <label className="block text-xs font-medium text-slate-600 mb-1">位置 Right (%)</label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={config.position.right || 0}
                        onChange={(e) => handlePositionChange('right', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded text-xs"
                    />
                </div>

                {/* 尺寸设置 */}
                <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">宽度 (%)</label>
                    <input
                        type="number"
                        min="1"
                        max="100"
                        value={config.size.width || 100}
                        onChange={(e) => handleSizeChange('width', parseInt(e.target.value) || 100)}
                        className="w-full px-3 py-2 border border-slate-200 rounded text-xs"
                    />
                    <label className="block text-xs font-medium text-slate-600 mb-1">高度 (%)</label>
                    <input
                        type="number"
                        min="1"
                        max="100"
                        value={typeof config.size.height === 'number' ? config.size.height : ''}
                        onChange={(e) => handleSizeChange('height', e.target.value === 'auto' ? 'auto' : parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded text-xs"
                    />
                </div>

                {/* 层级设置 */}
                <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">层级</label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={config.zIndex || 0}
                        onChange={(e) => handleZIndexChange(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded text-xs"
                    />
                </div>

                {/* 可见性设置 */}
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs font-medium text-slate-600">
                        <input
                            type="checkbox"
                            checked={config.visible}
                            onChange={(e) => handleVisibleChange(e.target.checked)}
                            className="w-4 h-4 accent-indigo-600 cursor-pointer"
                        />
                    </label>
                    <span className="text-xs text-slate-500">可见</span>
                </div>

                {/* 关联设备设置 */}
                {!config.id.startsWith('background-') && !config.id.startsWith('scene') && (
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">关联设备</label>
                        <select
                            value={config.linkedDevice || ''}
                            onChange={(e) => handleLinkedDeviceChange(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded text-xs"
                        >
                            <option value="">无</option>
                            <option value="pvPanels">光伏组件</option>
                            <option value="evCharger1">充电桩1</option>
                            <option value="evCharger2">充电桩2</option>
                            <option value="hvacOutdoor1">空调外机1</option>
                            <option value="hvacOutdoor2">空调外机2</option>
                            <option value="hvacIndoor">空调挂机</option>
                            <option value="storage">储能系统</option>
                            <option value="streetLights">路灯</option>
                            <option value="evCars">电动汽车</option>
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * 配置面板主组件
 */
const ConfigPanel: React.FC<ConfigPanelProps> = ({
    configs,
    selectedId,
    onAdd,
    onUpdate,
    onDelete,
    onSave,
    onReset,
    onClose
}) => {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
                {/* 标题栏 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800">微电网图片配置</h2>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onReset}
                            className="text-slate-500 hover:text-slate-700 text-sm px-3 py-1 rounded transition-colors"
                        >
                            重置默认
                        </button>
                        <button
                            onClick={onSave}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1 rounded transition-colors"
                        >
                            保存配置
                        </button>
                        <button
                            onClick={onClose}
                            className="text-slate-500 hover:text-slate-700 text-sm px-3 py-1 rounded transition-colors"
                        >
                            关闭
                        </button>
                    </div>
                </div>

                {/* 配置列表（可滚动） */}
                <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* 配置卡片列表 */}
                        {configs.map(config => (
                            <ConfigForm
                                key={config.id}
                                config={config}
                                onUpdate={onUpdate}
                                onDelete={onDelete}
                            />
                        ))}

                        {/* 新增配置按钮 */}
                        <div className="col-span-2 lg:col-span-1 flex items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                             onClick={onAdd}
                        >
                            <div className="text-center">
                                <span className="material-icons text-4xl text-slate-400 mb-2">add</span>
                                <div className="text-sm font-medium text-slate-600">添加新配置</div>
                                <div className="text-xs text-slate-400">选择现有图片或上传新图片</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfigPanel;
