import React, { useEffect } from 'react';
import { useMicrogridState } from './hooks/useMicrogridState';
import SceneBackground from './SceneBackground';
import DeviceLayer from './DeviceLayer';
import ControlPanel from './ControlPanel';
import ConfigPanelButton from './ConfigPanelButton';
import ConfigPanel from './ConfigPanel';
import { useDeviceConfigs } from './hooks/useDeviceConfigs';

/**
 * 微电网可视化主容器组件
 *
 * 整合所有子组件，提供完整的微电网动态可视化功能
 * - 场景背景（支持昼夜切换）
 * - 设备图层（15个组件图片，支持动态位置调整）
 * - 能源流动覆盖层（SVG动画）
 * - 控制面板（手动控制模式）
 * - 配置面板（可调整图片位置、大小和关联设备）
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

    // 加载保存的配置
    useEffect(() => {
        const loaded = loadConfigs();
        if (loaded && loaded.length > 0) {
            setPanelState(prev => ({ ...prev, configs: loaded }));
        }
    }, [loadConfigs]);

    return (
        <div className="relative w-full h-[600px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <SceneBackground timeOfDay={timeOfDay} />
            <DeviceLayer configs={panelState.configs} devices={devices} timeOfDay={timeOfDay} />
            {/* 能源流动覆盖层已禁用 */}
            {/* <EnergyFlowOverlay energyFlow={energyFlow} timeOfDay={timeOfDay} /> */}

            {/* ==================== 控制面板 ==================== */}
            {dataSourceMode === 'manual' && (
                <ControlPanel
                    dataSourceMode={dataSourceMode}
                    onToggleDevice={toggleDevice}
                    onSetTimeOfDay={setTimeOfDay}
                    onSetDataSourceMode={setDataSourceMode}
                    devices={devices}
                />
            )}

            {/* ==================== 配置面板按钮 ==================== */}
            <ConfigPanelButton
                onClick={togglePanel}
                hasUnsavedChanges={panelState.isDirty}
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

            {/* ==================== 时间指示器（左下角）==================== */}
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

            {/* ==================== 数据来源模式指示器（右下角）==================== */}
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md rounded-lg shadow-md border border-slate-200 px-3 py-2">
                <div className="flex items-center gap-2">
                    <span className="material-icons text-sm text-slate-500">
                        {dataSourceMode === 'manual' ? 'gamepad' :
                         dataSourceMode === 'simulation' ? 'show_chart' :
                         'wifi'}
                    </span>
                    <div>
                        <div className="text-xs font-bold text-slate-800">
                            {dataSourceMode === 'manual' ? '手动控制' :
                             dataSourceMode === 'simulation' ? '模拟数据' :
                             '实时数据'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MicrogridVisual;
