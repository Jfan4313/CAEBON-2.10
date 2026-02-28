import React from 'react';
import { DeviceStatus, TimeOfDay, DeviceImageConfig } from '../../types';
import CanvasHotspotLayer from './CanvasHotspotLayer';

interface DeviceLayerProps {
    configs: DeviceImageConfig[];
    devices: {
        evCharger1: { status: DeviceStatus; power: number };
        evCharger2: { status: DeviceStatus; power: number };
        hvacOutdoor1: { status: DeviceStatus; power: number };
        hvacOutdoor2: { status: DeviceStatus; power: number };
        hvacIndoor: { status: DeviceStatus; power: number };
        storage: { status: DeviceStatus; soc: number; power: number };
        streetLights: { status: DeviceStatus; count: number; onCount: number };
        pvPanels: { status: DeviceStatus; generation: number; power: number };
        evCars: Array<{ id: string; status: DeviceStatus; batteryLevel: number }>;
    };
    timeOfDay: TimeOfDay;
    onDeviceClick?: (deviceId: string) => void;
}

/**
 * 获取设备状态对应的CSS类
 */
const getDeviceClass = (device: any, config: DeviceImageConfig, timeOfDay: TimeOfDay): string => {
    if (!config.linkedDevice) return '';

    switch (device?.status) {
        case DeviceStatus.RUNNING:
            return 'device-running';
        case DeviceStatus.CHARGING:
            return 'charging';
        case DeviceStatus.DISCHARGING:
            return 'discharging';
        case DeviceStatus.OFF:
            return 'opacity-50 grayscale';
        default:
            return '';
    }
};

/**
 * 单个设备图片组件
 */
const DeviceImage: React.FC<{
    config: DeviceImageConfig;
    device: any;
    timeOfDay: TimeOfDay;
}> = ({ config, device, timeOfDay }) => {
    return (
        <img
            id={config.id}
            src={config.imageSrc}
            alt={config.name}
            className={`absolute transition-all duration-500 ${getDeviceClass(device, config, timeOfDay)} device-image`}
            style={{
                top: config.position.top !== undefined ? `${config.position.top}%` : undefined,
                bottom: config.position.bottom !== undefined ? `${config.position.bottom}%` : undefined,
                left: config.position.left !== undefined ? `${config.position.left}%` : undefined,
                right: config.position.right !== undefined ? `${config.position.right}%` : undefined,
                width: typeof config.size.width === 'number' ? `${config.size.width}%` : (config.size.width || '100%'),
                height: typeof config.size.height === 'number' ? `${config.size.height}%` : (config.size.height || 'auto'),
                maxWidth: typeof config.size.width === 'number' ? `${config.size.width}%` : (config.size.width || '100%'),
                maxHeight: typeof config.size.height === 'number' ? `${config.size.height}%` : (config.size.height || 'auto'),
                zIndex: config.zIndex,
                display: config.visible ? 'block' : 'none',
            }}
        />
    );
};

/**
 * 设备图层组件
 *
 * 使用 Canvas 像素检测实现精准的悬停和点击交互
 * 解决全尺寸透明图片遮挡鼠标事件的问题
 */
const DeviceLayer: React.FC<DeviceLayerProps> = ({
    configs,
    devices,
    timeOfDay,
    onDeviceClick
}) => {
    return (
        <CanvasHotspotLayer configs={configs} onDeviceClick={onDeviceClick}>
            {configs.map(config => (
                <DeviceImage
                    key={config.id}
                    config={config}
                    device={config.linkedDevice ? devices[config.linkedDevice as any] : null}
                    timeOfDay={timeOfDay}
                />
            ))}
        </CanvasHotspotLayer>
    );
};

export default DeviceLayer;
