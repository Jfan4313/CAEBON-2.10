import React, { useState, useEffect, useCallback } from 'react';
import { useMicrogridState } from './hooks/useMicrogridState';
import { useDeviceConfigs } from './hooks/useDeviceConfigs';
import { DeviceImageConfig } from '../../types';
import SceneBackground from './SceneBackground';
import DeviceLayer from './DeviceLayer';
import ConfigPanelButton from './ConfigPanelButton';
import ConfigPanel from './ConfigPanel';
import SidePanel from './SidePanel';

/**
 * 微电网可视化主容器组件
 *
 * 新布局设计：
 * - 中心区域：微电网可视化画布（无遮挡）
 * - 右侧面板：可折叠的控制面板 + 设备信息面板
 * - 点击设备后在侧边栏显示该设备的详细配置信息
 */
const MicrogridVisual: React.FC = () => {
    const {
        timeOfDay,
        setTimeOfDay,
        currentHour,
        setCurrentHour,
        dataSourceMode,
        setDataSourceMode,
        devices,
        toggleDevice
    } = useMicrogridState();

    const {
        panelState,
        setPanelState,
        addConfig,
        updateConfig,
        deleteConfig,
        saveConfigs,
        loadConfigs,
        resetConfigs,
        togglePanel
    } = useDeviceConfigs();

    // 选中的设备配置
    const [selectedDeviceConfig, setSelectedDeviceConfig] = useState<DeviceImageConfig | null>(null);

    // 存储底图的实际尺寸
    const [bgImageSize, setBgImageSize] = useState({ width: 1920, height: 1080 });

    // 处理底图加载，获取实际尺寸
    const handleImageLoad = useCallback((width: number, height: number) => {
        setBgImageSize({ width, height });
    }, []);

    // 处理设备点击，显示对应的配置信息
    const handleDeviceClick = (deviceId: string) => {
        toggleDevice(deviceId);

        // 找到对应的配置
        const config = panelState.configs.find(c => c.linkedDevice === deviceId);
        setSelectedDeviceConfig(config || null);
    };

    // 计算容器样式 - 使用明确的 16:9 宽高比
    const containerStyle = {
        position: 'relative',
        width: '100%',
        height: '0',
        paddingBottom: '56.25%' // 16:9 的宽高比 (1080/1920 = 0.5625)
    };

    return (
        <div className="relative w-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm flex">
            {/* 左侧：可视化画布区域（使用实际底图尺寸） */}
            <div className="flex-1 relative" style={containerStyle}>
                <SceneBackground timeOfDay={timeOfDay} onImageLoad={handleImageLoad} />
                <DeviceLayer
                    configs={panelState.configs}
                    devices={devices}
                    timeOfDay={timeOfDay}
                    onDeviceClick={handleDeviceClick}
                />

                {/* 配置面板按钮 */}
                <ConfigPanelButton
                    onClick={togglePanel}
                    hasUnsavedChanges={panelState.isDirty}
                />

                {/* 时间指示器（左下角） */}
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md rounded-lg shadow-md border border-slate-200 px-3 py-2">
                    <div className="flex items-center gap-2">
                        <span className={`material-icons text-lg ${timeOfDay === 'day' ? 'text-amber-500' : 'text-indigo-500'}`}>
                            {timeOfDay === 'day' ? 'wb_sunny' : 'nights_stay'}
                        </span>
                        <div>
                            <div className="text-xs font-bold text-slate-800">
                                {timeOfDay === 'day' ? '白天' : '夜晚'}
                            </div>
                            <div className="text-[10px] text-slate-500">
                                {currentHour}:00
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 右侧：控制面板和设备信息面板 */}
            <SidePanel
                dataSourceMode={dataSourceMode}
                onToggleDevice={toggleDevice}
                onSetTimeOfDay={setTimeOfDay}
                onSetDataSourceMode={setDataSourceMode}
                devices={devices}
                selectedDeviceConfig={selectedDeviceConfig}
            />

            {/* ==================== 配置面板对话框 ==================== */}
            {panelState.isOpen && (
                <ConfigPanel
                    configs={panelState.configs}
                    onAdd={addConfig}
                    onUpdate={updateConfig}
                    onDelete={deleteConfig}
                    onSave={saveConfigs}
                    onReset={resetConfigs}
                    onClose={togglePanel}
                />
            )}
        </div>
    );
};

export default MicrogridVisual;
