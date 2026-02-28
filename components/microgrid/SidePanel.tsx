import React, { useState, useMemo } from 'react';
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
 * 头部包含运行状态汇总和折叠按钮
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

    // 计算运行状态汇总
    const getSummaryStatus = () => {
        const statusCounts = {
            charging: 0,
            discharging: 0,
            running: 0,
            off: 0
        };

        Object.values(devices).forEach(device => {
            if (device.status === DeviceStatus.CHARGING) statusCounts.charging++;
            if (device.status === DeviceStatus.DISCHARGING) statusCounts.discharging++;
            if (device.status === DeviceStatus.RUNNING) statusCounts.running++;
            if (device.status === DeviceStatus.OFF) statusCounts.off++;
        });

        return statusCounts;
    };

    const summaryStatus = getSummaryStatus();

    return (
        <div
            className={`fixed right-0 top-0 bottom-0 bg-white/95 backdrop-blur-md border-l border-slate-200 shadow-xl transition-all duration-300 z-50 flex flex-col ${
                isCollapsed ? 'w-12' : 'w-80'
            }`}
        >
            {/* ========== 头部：折叠按钮 + 汇总信息 ========== */}
            <div className={`p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white transition-all duration-300 ${
                isCollapsed ? '' : ''
            }`}>
                <div className="flex items-center justify-between">
                    {/* 折叠/展开按钮 */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-2 rounded-lg transition-all hover:shadow-md hover:bg-slate-50"
                        title={isCollapsed ? '展开面板' : '折叠面板'}
                    >
                        <span className="material-icons text-slate-600">
                            {isCollapsed ? 'chevron_left' : 'chevron_right'}
                        </span>
                    </button>

                    {/* 运行状态汇总（展开时显示） */}
                    {!isCollapsed && (
                        <div className="flex items-center gap-6">
                            {/* 充电中 */}
                            {summaryStatus.charging > 0 && (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 border border-blue-200">
                                    <span className="material-icons text-sm text-blue-700">battery_charging_full</span>
                                    <span className="text-xs font-semibold text-blue-700">{summaryStatus.charging}</span>
                                </div>
                            )}

                            {/* 放电中 */}
                            {summaryStatus.discharging > 0 && (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 border border-orange-200">
                                    <span className="material-icons text-sm text-orange-700">battery_alert</span>
                                    <span className="text-xs font-semibold text-orange-700">{summaryStatus.discharging}</span>
                                </div>
                            )}

                            {/* 运行中 */}
                            {summaryStatus.running > 0 && (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 border border-green-200">
                                    <span className="material-icons text-sm text-green-700">power</span>
                                    <span className="text-xs font-semibold text-green-700">{summaryStatus.running}</span>
                                </div>
                            )}

                            {/* 关闭中 */}
                            {summaryStatus.off > 0 && (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 border border-slate-200">
                                    <span className="material-icons text-sm text-slate-700">power_off</span>
                                    <span className="text-xs font-semibold text-slate-700">{summaryStatus.off}</span>
                                </div>
                            )}

                            {/* 设备总数 */}
                            <div className="text-xs font-medium text-slate-500">
                                设备总数: <span className="font-semibold text-slate-700">{Object.keys(devices).length}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ========== 展开时的内容 ========== */}
            {!isCollapsed && (
                <div className="flex-1 overflow-y-auto">
                    {/* ==================== 控制面板 ==================== */}
                    <div className="p-4 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="material-icons text-indigo-600">settings</span>
                            场景控制
                        </h3>

                        {/* 时间切换 */}
                        <div className="mb-4">
                            <label className="text-xs font-medium text-slate-600 mb-2 block">时间模式</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onSetTimeOfDay(TimeOfDay.DAY)}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                        dataSourceMode === 'manual' && devices.streetLights.status === DeviceStatus.OFF
                                            ? 'bg-amber-100 border-2 border-amber-400 text-amber-700'
                                            : 'bg-slate-100 border-2 border-slate-200 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    <span className="material-icons text-sm">wb_sunny</span>
                                    白天
                                </button>
                                <button
                                    onClick={() => onSetTimeOfDay(TimeOfDay.NIGHT)}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                        dataSourceMode === 'manual' && devices.streetLights.status === DeviceStatus.RUNNING
                                            ? 'bg-indigo-100 border-2 border-indigo-400 text-indigo-700'
                                            : 'bg-slate-100 border-2 border-slate-200 text-slate-600 hover:bg-slate-200'
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
                                className="w-full py-2 px-4 rounded-lg text-sm font-medium border-2 border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white cursor-pointer"
                            >
                                <option value="manual"> 手动控制</option>
                                <option value="simulation"> 模拟数据（预留）</option>
                                <option value="realtime"> 实时数据（预留）</option>
                            </select>
                            {dataSourceMode !== 'manual' && (
                                <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 px-2 py-1 rounded">
                                    此模式为预留接口，暂不可用
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ==================== 设备控制 ==================== */}
                    <div className="p-4 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="material-icons text-blue-600">tune</span>
                            设备控制
                        </h3>

                        {dataSourceMode === 'manual' && (
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-3 block">设备控制</label>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    {/* 充电桩1 */}
                                    <button
                                        onClick={() => onToggleDevice('evCharger1')}
                                        className={`p-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                            devices.evCharger1.status === DeviceStatus.CHARGING
                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                : 'bg-slate-100 border-2 border-slate-200 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <span className="material-icons text-base">ev_station</span>
                                        充电桩1
                                    </button>
                                    {/* 充电桩2 */}
                                    <button
                                        onClick={() => onToggleDevice('evCharger2')}
                                        className={`p-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                            devices.evCharger2.status === DeviceStatus.CHARGING
                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                : 'bg-slate-100 border-2 border-slate-200 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <span className="material-icons text-base">ev_station</span>
                                        充电桩2
                                    </button>
                                    {/* 空调系统 */}
                                    <button
                                        onClick={() => onToggleDevice('hvac')}
                                        className={`p-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                            devices.hvacOutdoor1.status === DeviceStatus.RUNNING
                                                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                                                : 'bg-slate-100 border-2 border-slate-200 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <span className="material-icons text-base">ac_unit</span>
                                        空调
                                    </button>
                                    {/* 储能系统 */}
                                    <button
                                        onClick={() => onToggleDevice('storage')}
                                        className={`p-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                            devices.storage.status === DeviceStatus.CHARGING
                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                : devices.storage.status === DeviceStatus.DISCHARGING
                                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                                : 'bg-slate-100 border-2 border-slate-200 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <span className="material-icons text-base">battery_charging_full</span>
                                        储能
                                    </button>
                                    {/* 路灯 */}
                                    <button
                                        onClick={() => onToggleDevice('streetLights')}
                                        className={`p-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                            devices.streetLights.status === DeviceStatus.RUNNING
                                                ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30'
                                                : 'bg-slate-100 border-2 border-slate-200 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <span className="material-icons text-base">light</span>
                                        路灯
                                    </button>
                                    {/* 光伏 */}
                                    <button
                                        onClick={() => onToggleDevice('pv')}
                                        className={`p-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                            devices.pvPanels.status === DeviceStatus.RUNNING
                                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                                                : 'bg-slate-100 border-2 border-slate-200 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <span className="material-icons text-base">solar_power</span>
                                        光伏
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ==================== 设备信息面板 ==================== */}
                    {selectedDeviceConfig && (
                        <div className="p-4">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="material-icons text-indigo-600">info</span>
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
