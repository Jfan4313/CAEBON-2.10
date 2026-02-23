import React from 'react';
import { DataSourceMode, TimeOfDay, DeviceStatus, MicrogridVisualState } from '../../types';

interface ControlPanelProps {
    dataSourceMode: DataSourceMode;
    onToggleDevice: (device: string) => void;
    onSetTimeOfDay: (time: TimeOfDay) => void;
    onSetDataSourceMode: (mode: DataSourceMode) => void;
    devices: MicrogridVisualState['devices'];
}

/**
 * 微电网可视化控制面板组件
 *
 * 提供昼夜切换、数据源选择、设备控制等功能
 */
const ControlPanel: React.FC<ControlPanelProps> = ({
    dataSourceMode,
    onToggleDevice,
    onSetTimeOfDay,
    onSetDataSourceMode,
    devices
}) => {

    return (
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 p-4 w-72 max-h-[calc(100%-2rem)] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="material-icons text-indigo-600">settings</span>
                微电网场景控制
            </h3>

            {/* ==================== 昼夜切换 ==================== */}
            <div className="mb-5">
                <label className="text-xs font-medium text-slate-600 mb-2 block">时间模式</label>
                <div className="flex gap-2">
                    <button
                        onClick={() => onSetTimeOfDay(TimeOfDay.DAY)}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                            dataSourceMode === DataSourceMode.MANUAL && devices.streetLights.status === DeviceStatus.OFF
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
                            dataSourceMode === DataSourceMode.MANUAL && devices.streetLights.status === DeviceStatus.RUNNING
                                ? 'bg-indigo-100 border-2 border-indigo-400 text-indigo-700'
                                : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <span className="material-icons text-sm">nights_stay</span>
                        夜晚
                    </button>
                </div>
            </div>

            {/* ==================== 数据源模式 ==================== */}
            <div className="mb-5">
                <label className="text-xs font-medium text-slate-600 mb-2 block">数据来源</label>
                <select
                    value={dataSourceMode}
                    onChange={(e) => onSetDataSourceMode(e.target.value as DataSourceMode)}
                    className="w-full py-2 px-3 rounded-lg text-xs font-medium border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white cursor-pointer"
                >
                    <option value={DataSourceMode.MANUAL}>🎮 手动控制</option>
                    <option value={DataSourceMode.SIMULATION}>📊 模拟数据（预留）</option>
                    <option value={DataSourceMode.REALTIME}>📡 实时数据（预留）</option>
                </select>
                {dataSourceMode !== DataSourceMode.MANUAL && (
                    <p className="text-[10px] text-amber-600 mt-1.5 bg-amber-50 px-2 py-1 rounded">
                        此模式为预留接口，暂不可用
                    </p>
                )}
            </div>

            {/* ==================== 设备控制 ==================== */}
            {dataSourceMode === DataSourceMode.MANUAL && (
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-3 block">设备控制</label>

                    <div className="grid grid-cols-2 gap-2">
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
                    <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                            <span className="font-semibold text-slate-700">提示：</span>
                            点击按钮切换设备状态。蓝色表示充电/运行，橙色表示放电，绿色表示售电。
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ControlPanel;
