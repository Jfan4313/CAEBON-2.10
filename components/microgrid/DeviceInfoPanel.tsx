import React from 'react';
import { DeviceStatus, DeviceImageConfig } from '../../types';

interface DeviceInfoPanelProps {
    config: DeviceImageConfig | null;
    deviceStatus?: {
        status: DeviceStatus;
        power?: number;
        soc?: number;
        count?: number;
        onCount?: number;
        generation?: number;
    };
    onClose?: () => void;
}

const DeviceInfoPanel: React.FC<DeviceInfoPanelProps> = ({
    config,
    deviceStatus,
    onClose
}) => {
    if (!config) return null;

    const getStatusText = (status?: DeviceStatus): string => {
        switch (status) {
            case DeviceStatus.RUNNING:
                return '运行中';
            case DeviceStatus.CHARGING:
                return '充电中';
            case DeviceStatus.DISCHARGING:
                return '放电中';
            case DeviceStatus.OFF:
                return '已关闭';
            default:
                return '未知';
        }
    };

    const getStatusColor = (status?: DeviceStatus): string => {
        switch (status) {
            case DeviceStatus.RUNNING:
                return 'text-green-600 bg-green-50 border-green-200';
            case DeviceStatus.CHARGING:
                return 'text-blue-600 bg-blue-50 border-blue-200';
            case DeviceStatus.DISCHARGING:
                return 'text-orange-600 bg-orange-50 border-orange-200';
            case DeviceStatus.OFF:
                return 'text-slate-600 bg-slate-50 border-slate-200';
            default:
                return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <span className="material-icons text-indigo-600">info</span>
                    <h3 className="text-sm font-bold text-slate-800">{config.name}</h3>
                </div>
                {onClose && (
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                        <span className="material-icons">close</span>
                    </button>
                )}
            </div>

            <div className="space-y-3">
                <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">设备 ID</label>
                    <div className="text-sm text-slate-800 font-mono">{config.id}</div>
                </div>

                {config.linkedDevice && (
                    <div>
                        <label className="text-xs font-medium text-slate-500 block mb-1">关联设备</label>
                        <div className="text-sm text-slate-800 font-mono">{config.linkedDevice}</div>
                    </div>
                )}

                {deviceStatus && (
                    <div>
                        <label className="text-xs font-medium text-slate-500 block mb-1">当前状态</label>
                        <div className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(deviceStatus.status)}`}>
                            {getStatusText(deviceStatus.status)}
                        </div>
                    </div>
                )}

                {deviceStatus?.power !== undefined && (
                    <div>
                        <label className="text-xs font-medium text-slate-500 block mb-1">当前功率</label>
                        <div className="text-sm text-slate-800">
                            <span className="font-semibold">{deviceStatus.power.toFixed(2)}</span>
                            <span className="text-slate-500"> kW</span>
                        </div>
                    </div>
                )}

                {deviceStatus?.soc !== undefined && (
                    <div>
                        <label className="text-xs font-medium text-slate-500 block mb-1">电池电量</label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 transition-all" style={{ width: String(deviceStatus.soc) + 'pct' }} />
                            </div>
                        </div>
                        <span className="text-sm text-slate-800 font-semibold">{deviceStatus.soc.toFixed(1)} pct</span>
                    </div>
                )}

                {deviceStatus?.count !== undefined && (
                    <div>
                        <label className="text-xs font-medium text-slate-500 block mb-1">设备数量</label>
                        <div className="text-sm text-slate-800">
                            <span className="font-semibold">{deviceStatus.onCount}</span>
                            <span className="text-slate-500"> / {deviceStatus.count}</span>
                        </div>
                    </div>
                )}

                {deviceStatus?.generation !== undefined && (
                    <div>
                        <label className="text-xs font-medium text-slate-500 block mb-1">发电功率</label>
                        <div className="text-sm text-slate-800">
                            <span className="font-semibold">{deviceStatus.generation.toFixed(2)}</span>
                            <span className="text-slate-500"> kW</span>
                        </div>
                    </div>
                )}

                <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">图片路径</label>
                    <div className="text-xs text-slate-600 font-mono break-all max-h-20 overflow-y-auto">{config.imageSrc}</div>
                </div>

                {config.zIndex !== undefined && (
                    <div>
                        <label className="text-xs font-medium text-slate-500 block mb-1">显示层级</label>
                        <div className="text-sm text-slate-800 font-mono">{config.zIndex}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeviceInfoPanel;
