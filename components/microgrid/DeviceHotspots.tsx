import React, { useState } from 'react';

interface Hotspot {
    id: string;
    deviceId?: string;
    path: string;
    x: number;
    y: number;
    width: number;
    height: number;
    name: string;
}

interface DeviceHotspotsProps {
    onDeviceClick?: (deviceId: string) => void;
    children: React.ReactNode;
}

/**
 * SVG 热区定义
 */
const HOTSPOTS: Hotspot[] = [
    {
        id: 'pvPanel1',
        deviceId: 'pvPanels',
        path: 'M10,15 L30,15 L30,25 L10,25 Z',
        x: 15, y: 15, width: 15, height: 10,
        name: '光伏组件1'
    },
    {
        id: 'pvPanel2',
        deviceId: 'pvPanels',
        path: 'M35,12 L47,12 L47,22 L35,22 Z',
        x: 35, y: 12, width: 12, height: 10,
        name: '光伏组件2'
    },
    {
        id: 'hvacOutdoor1',
        deviceId: 'hvacOutdoor1',
        path: 'M70,18 L78,18 L78,26 L70,26 Z',
        x: 65, y: 18, width: 8, height: 8,
        name: '空调外机1'
    },
    {
        id: 'hvacOutdoor2',
        deviceId: 'hvacOutdoor2',
        path: 'M75,20 L83,20 L83,28 L75,28 Z',
        x: 75, y: 20, width: 8, height: 8,
        name: '空调外机2'
    },
    {
        id: 'storage',
        deviceId: 'storage',
        path: 'M45,30 L55,30 L55,45 L45,45 Z',
        x: 45, y: 30, width: 10, height: 15,
        name: '储能系统'
    },
    {
        id: 'powerTower',
        path: 'M88,5 L95,5 L95,35 L88,35 Z',
        x: 88, y: 5, width: 7, height: 30,
        name: '电塔'
    },
    {
        id: 'streetLight',
        deviceId: 'streetLights',
        path: 'M85,75 L92,75 L92,90 L85,90 Z',
        x: 85, y: 75, width: 7, height: 15,
        name: '路灯'
    },
    {
        id: 'evCharger1',
        deviceId: 'evCharger1',
        path: 'M10,80 L20,80 L20,88 L10,88 Z',
        x: 10, y: 80, width: 10, height: 8,
        name: '充电桩1'
    },
    {
        id: 'evCharger2',
        deviceId: 'evCharger2',
        path: 'M25,80 L35,80 L35,88 L25,88 Z',
        x: 25, y: 80, width: 10, height: 8,
        name: '充电桩2'
    },
    {
        id: 'evCar1',
        deviceId: 'evCars',
        path: 'M15,88 L23,88 L23,95 L15,95 Z',
        x: 15, y: 88, width: 8, height: 7,
        name: '电动汽车1'
    },
    {
        id: 'evCar2',
        deviceId: 'evCars',
        path: 'M30,88 L38,88 L38,95 L30,95 Z',
        x: 30, y: 88, width: 8, height: 7,
        name: '电动汽车2'
    },
    {
        id: 'evCar3',
        deviceId: 'evCars',
        path: 'M45,88 L53,88 L53,95 L45,95 Z',
        x: 45, y: 88, width: 8, height: 7,
        name: '电动汽车3'
    },
    {
        id: 'hvacIndoor',
        deviceId: 'hvacIndoor',
        path: 'M25,45 L30,45 L30,50 L25,50 Z',
        x: 25, y: 45, width: 5, height: 5,
        name: '空调挂机'
    },
];

/**
 * 设备热区组件
 *
 * 点击热区才显示对应的设备图片
 * 使用 CSS 条件选择器避免 React.cloneElement 导致的无限重新渲染
 */
const DeviceHotspots: React.FC<DeviceHotspotsProps> = ({
    children,
    onDeviceClick
}) => {
    const [activeDevice, setActiveDevice] = useState<string | null>(null);

    const handleClick = (hotspot: Hotspot) => {
        // 点击已激活的设备则取消激活，点击新设备则激活
        if (activeDevice === hotspot.id) {
            setActiveDevice(null);
        } else {
            setActiveDevice(hotspot.id);
        }

        if (onDeviceClick && hotspot.deviceId) {
            onDeviceClick(hotspot.deviceId);
        }
    };

    return (
        <div className="relative w-full h-full">
            {/* SVG 热区层 - 在最顶层接收鼠标事件 */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-auto"
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
            >
                {HOTSPOTS.map((hotspot) => (
                    <path
                        key={hotspot.id}
                        d={hotspot.path}
                        fill={activeDevice === hotspot.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent'}
                        stroke={activeDevice === hotspot.id ? '#3b82f6' : 'transparent'}
                        strokeWidth={activeDevice === hotspot.id ? '0.5' : '0'}
                        className="cursor-pointer transition-all duration-200"
                        onClick={() => handleClick(hotspot)}
                    />
                ))}
            </svg>

            {/* 子元素（全尺寸图片层） - 使用 CSS 选择器控制可见性 */}
            {React.Children.toArray(children).map((child, index) => {
                if (!React.isValidElement(child)) return child;

                const childId = (child.props as any).id || '';

                // 底图始终可见，其他设备只有被激活时才可见
                const isActive = childId === activeDevice;
                const isBaseLayer = ['sceneBackground', 'background-main', 'decorative'].includes(childId);
                const shouldBeVisible = isBaseLayer || isActive;

                return React.cloneElement(child as React.ReactElement<any>, {
                    key: childId || index,
                    className: `${(child.props as any).className || ''} ${
                        shouldBeVisible ? 'opacity-100' : 'opacity-0'
                    }`,
                } as any);
            })}

            {/* 激活提示框 */}
            {activeDevice && (
                <div className="absolute pointer-events-none z-50">
                    {(() => {
                        const hotspot = HOTSPOTS.find(h => h.id === activeDevice);
                        if (!hotspot) return null;
                        return (
                            <div
                                className="bg-slate-900/90 text-white text-xs px-2 py-1 rounded shadow-lg backdrop-blur-sm"
                                style={{
                                    left: `${hotspot.x + hotspot.width / 2}%`,
                                    top: `${hotspot.y - 2}%`,
                                    transform: 'translateX(-50%)'
                                }}
                            >
                                {hotspot.name}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* 关闭按钮 */}
            {activeDevice && (
                <button
                    className="absolute top-4 right-4 z-50 bg-slate-700/80 hover:bg-slate-600 text-white text-xs px-3 py-1 rounded transition-colors"
                    onClick={() => setActiveDevice(null)}
                >
                    关闭
                </button>
            )}
        </div>
    );
};

export default DeviceHotspots;
