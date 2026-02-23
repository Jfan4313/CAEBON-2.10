import React, { useState } from 'react';
import { DataSourceMode, TimeOfDay, DeviceStatus, MicrogridVisualState, DeviceImageConfig } from '../../types';
import DeviceInfoPanel from './DeviceInfoPanel';

interface SidePanelProps {
    dataSourceMode: DataSourceMode;
    onToggleDevice: (device: string) => void;
    onSetTimeOfDay: (time: TimeOfDay) => void;
    onSetDataSourceMode: (mode: DataSourceMode) => void;
    devices: MicrogridVisualState['devices'];
    selectedDeviceConfig: DeviceImageConfig | null;
}

/**
 * 右侧面板组件
 *
 * 包含控制面板和设备信息面板，支持折叠功能
 */
const SidePanel: React.FC<SidePanelProps> = ({
    dataSourceMode,
    onToggleDevice,
    onSetTimeOfDay,
    onSetDataSourceMode,
    devices,
    selectedDeviceConfig
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    // 根据选中的设备配置获取对应的设备状态
    const getDeviceStatus = (config: DeviceImageConfig) => {
        if (!config.linkedDevice) return undefined;
        return (devices as any)[config.linkedDevice];
    };

    const selectedDeviceStatus = selectedDeviceConfig ? getDeviceStatus(selectedDeviceConfig) : undefined;

    return (
        <div
            className={`fixed right-0 top-0 bottom-0 bg-white/95 backdrop-blur-md border-l border-slate-200 shadow-xl transition-all duration-300 ${
                isCollapsed ? 'w-12' : 'w-80'
            }`}
        >
            {/* 展开/折叠按钮 */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`absolute left-0 top-1/2 -translate-x-full px-2 py-2 bg-white rounded-l shadow-md border border-slate-200 transition-all ${
                    isCollapsed ? 'w-8' : 'w-10'
                }`}
                title={isCollapsed ? '展开面板' : '折叠面板'}
            >
                <span className="material-icons text-slate-600">
                    {isCollapsed ? 'chevron_left' : 'chevron_right'}
                </span>
            </button>

            {/* 展开时的内容 */}
            {!isCollapsed && (
                <div className="h-full overflow-y-auto p-4">
                    {/* ==================== 控制面板 ==================== */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="material-icons text-indigo-600">settings</span>
                            场景控制
                        </h3>

                        {/* 昼夜切换 */}
                        <div className="mb-4">
                            <label className="text-xs font-medium text-slate-600 mb-2 block">时间模式</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onSetTimeOfDay(TimeOfDay.DAY)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                                        dataSourceMode === 'manual' && devices.streetLights.status === DeviceStatus.OFF
                                            ? 'bg-amber-100 border-2 border-amber-400 text-amber-700'
                                            : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    <span className="material-icons text-sm">wb_sunny</span>
                                    白天
                                </button>
                                <button
                                    onClick={() => onSetTimeOfDay(TimeOfDay.NIGHT)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                                        dataSourceMode === 'manual' && devices.streetLights.status === DeviceStatus.RUNNING
                                            ? 'bg-indigo-100 border-2 border-indigo-400 text-indigo-700'
                                            : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    <span className="material-icons text-sm">nights_stay</span>
                                    夜晚
                                </button>
                            </div>
                        </div>

                        {/* 数据源模式 */}
                        <div className="mb-4">
                            <label className="text-xs font-medium text-slate-600 mb-2 block">数据来源</label>
                            <select
                                value={dataSourceMode}
                                onChange={(e) => onSetDataSourceMode(e.target.value as DataSourceMode)}
                                className="w-full py-2 px-3 rounded-lg text-xs font-medium border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white cursor-pointer"
                            >
                                <option value="manual">🎮 手动控制</option>
                                <option value="simulation">📊 模拟数据（预留）</option>
                                <option value="realtime">📡 实时数据（预留）</option>
                            </select>
                            {dataSourceMode !== 'manual' && (
                                <p className="text-[10px] text-amber-600 mt-1.5 bg-amber-50 px-2 py-1 rounded">
                                    此模式为预留接口，暂不可用
                                </p>
                            )}
                        </div>

                        {/* 设备控制 */}
                        {dataSourceMode === 'manual' && (
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-3 block">设备控制</label>

                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    {/* 充电桩1 */}
                                    <button
                                        onClick={() => onToggleDevice('evCharger1')}
                                        className={`p-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                                            devices.evCharger1.status === DeviceStatus.CHARGING
                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <span className="material-icons text-[14px]">ev_station</span>
                                        充电桩1
                                    </button>

                                    {/* 充电桩2 */}
                                    <button
                                        onClick={() => onToggleDevice('evCharger2')}
                                        className={`p-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                                            devices.evCharger2.status === DeviceStatus.CHARGING
                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <span className="material-icons text-[14px]">ev_station</span>
                                        充电桩2
                                    </button>

                                    {/* 空调系统 */}
                                    <button
                                        onClick={() => onToggleDevice('hvac')}
                                        className={`p-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                                            devices.hvacOutdoor1.status === DeviceStatus.RUNNING
                                                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <span className="material-icons text-[14px]">ac_unit</span>
                                        空调
                                    </button>

                                    {/* 储能系统 */}
                                    <button
                                        onClick={() => onToggleDevice('storage')}
                                        className={`p-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                                            devices.storage.status === DeviceStatus.CHARGING
                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                : devices.storage.status === DeviceStatus.DISCHARGING
                                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <span className="material-icons text-[14px]">battery_charging_full</span>
                                        储能
                                    </button>

                                    {/* 路灯 */}
                                    <button
                                        onClick={() => onToggleDevice('streetLights')}
                                        className={`p-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                                            devices.streetLights.status === DeviceStatus.RUNNING
                                                ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <span className="material-icons text-[14px]">light</span>
                                        路灯
                                    </button>

                                    {/* 光伏 */}
                                    <button
                                        onClick={() => onToggleDevice('pv')}
                                        className={`p-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                                            devices.pvPanels.status === DeviceStatus.RUNNING
                                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <span className="material-icons text-[14px]">solar_power</span>
                                        光伏
                                    </button>
                                </div>

                                {/* 设备状态说明 */}
                                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="text-[10px] text-slate-500 leading-relaxed">
                                        <span className="font-semibold text-slate-700">提示：</span>
                                        点击按钮切换设备状态。蓝色表示充电/运行，橙色表示放电。
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ==================== 设备信息面板 ==================== */}
                    {selectedDeviceConfig && (
                        <div className="border-t border-slate-200 pt-6">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="material-icons text-indigo-600">description</span>
                                设备信息
                            </h3>
                            <DeviceInfoPanel
                                config={selectedDeviceConfig}
                                deviceStatus={selectedDeviceStatus}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SidePanel;
