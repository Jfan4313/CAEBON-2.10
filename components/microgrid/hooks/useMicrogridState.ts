import { useState, useCallback, useEffect } from 'react';
import {
    DeviceStatus,
    TimeOfDay,
    DataSourceMode,
    MicrogridVisualState,
    DeviceState,
    StorageDeviceState,
    StreetLightState,
    PvDeviceState,
    EvCarState,
    MicrogridStateReturn,
    EnergyFlow
} from '../../../types';

/**
 * 微电网可视化状态管理 Hook
 */
export const useMicrogridState = (): MicrogridStateReturn => {
    // 昼夜状态
    const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(TimeOfDay.DAY);
    const [currentHour, setCurrentHour] = useState<number>(12);

    // 数据源模式
    const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode>(DataSourceMode.MANUAL);

    // 设备状态
    const [devices, setDevices] = useState<MicrogridVisualState['devices']>({
        evCharger1: { status: DeviceStatus.IDLE, power: 0 },
        evCharger2: { status: DeviceStatus.IDLE, power: 0 },
        hvacOutdoor1: { status: DeviceStatus.IDLE, power: 0 },
        hvacOutdoor2: { status: DeviceStatus.IDLE, power: 0 },
        hvacIndoor: { status: DeviceStatus.IDLE, power: 0 },
        storage: { status: DeviceStatus.IDLE, soc: 50, power: 0 },
        streetLights: { status: DeviceStatus.OFF, count: 8, onCount: 0 },
        pvPanels: { status: DeviceStatus.RUNNING, generation: 0 },
        evCars: [
            { id: 'car1', status: DeviceStatus.CHARGING, batteryLevel: 30 },
            { id: 'car2', status: DeviceStatus.IDLE, batteryLevel: 80 },
            { id: 'car3', status: DeviceStatus.IDLE, batteryLevel: 90 }
        ]
    });

    // 能源流动
    const [energyFlow, setEnergyFlow] = useState<MicrogridVisualState['energyFlow']>({
        [EnergyFlow.FROM_GRID]: 0,
        [EnergyFlow.TO_GRID]: 0,
        [EnergyFlow.FROM_PV]: 0,
        [EnergyFlow.TO_STORAGE]: 0,
        [EnergyFlow.FROM_STORAGE]: 0
    });

    /**
     * 切换设备状态
     */
    const toggleDevice = useCallback((device: string) => {
        setDevices(prev => {
            switch (device) {
                case 'evCharger1':
                    return {
                        ...prev,
                        evCharger1: {
                            ...prev.evCharger1,
                            status: prev.evCharger1.status === DeviceStatus.CHARGING
                                ? DeviceStatus.IDLE
                                : DeviceStatus.CHARGING,
                            power: prev.evCharger1.status === DeviceStatus.CHARGING ? 0 : 120
                        }
                    };
                case 'evCharger2':
                    return {
                        ...prev,
                        evCharger2: {
                            ...prev.evCharger2,
                            status: prev.evCharger2.status === DeviceStatus.CHARGING
                                ? DeviceStatus.IDLE
                                : DeviceStatus.CHARGING,
                            power: prev.evCharger2.status === DeviceStatus.CHARGING ? 0 : 120
                        }
                    };
                case 'hvac':
                    const newHvacStatus = prev.hvacOutdoor1.status === DeviceStatus.RUNNING
                        ? DeviceStatus.OFF
                        : DeviceStatus.RUNNING;
                    return {
                        ...prev,
                        hvacOutdoor1: { ...prev.hvacOutdoor1, status: newHvacStatus, power: newHvacStatus === DeviceStatus.RUNNING ? 50 : 0 },
                        hvacOutdoor2: { ...prev.hvacOutdoor2, status: newHvacStatus, power: newHvacStatus === DeviceStatus.RUNNING ? 50 : 0 },
                        hvacIndoor: { ...prev.hvacIndoor, status: newHvacStatus, power: newHvacStatus === DeviceStatus.RUNNING ? 30 : 0 }
                    };
                case 'storage':
                    const newStorageStatus = prev.storage.status === DeviceStatus.DISCHARGING
                        ? DeviceStatus.CHARGING
                        : DeviceStatus.DISCHARGING;
                    return {
                        ...prev,
                        storage: {
                            ...prev.storage,
                            status: newStorageStatus,
                            power: 100
                        }
                    };
                case 'streetLights':
                    const isNight = timeOfDay === TimeOfDay.NIGHT;
                    return {
                        ...prev,
                        streetLights: {
                            ...prev.streetLights,
                            status: isNight ? DeviceStatus.RUNNING : DeviceStatus.OFF,
                            onCount: isNight ? 8 : 0
                        }
                    };
                case 'pv':
                    const newPvStatus = prev.pvPanels.status === DeviceStatus.RUNNING
                        ? DeviceStatus.OFF
                        : DeviceStatus.RUNNING;
                    return {
                        ...prev,
                        pvPanels: {
                            ...prev.pvPanels,
                            status: newPvStatus
                        }
                    };
                default:
                    return prev;
            }
        });
    }, [timeOfDay]);

    /**
     * 根据时间更新光伏发电量和能源流动
     */
    useEffect(() => {
        const updatePvGeneration = () => {
            const isNight = timeOfDay === TimeOfDay.NIGHT;
            const isDayTime = currentHour >= 6 && currentHour <= 18;

            if (isNight || !isDayTime) {
                // 夜晚或非日照时间：光伏不发电
                setDevices(prev => ({
                    ...prev,
                    pvPanels: { ...prev.pvPanels, status: DeviceStatus.IDLE, generation: 0 }
                }));
                setEnergyFlow(prev => ({ ...prev, [EnergyFlow.FROM_PV]: 0 }));
            } else if (devices.pvPanels.status === DeviceStatus.RUNNING) {
                // 白天且有光照：计算发电量
                const solarCurve = Math.sin(((currentHour - 6) / 12) * Math.PI);
                const generation = Math.max(0, Math.round(450 * solarCurve));
                setDevices(prev => ({
                    ...prev,
                    pvPanels: { ...prev.pvPanels, status: DeviceStatus.RUNNING, generation }
                }));
                setEnergyFlow(prev => ({ ...prev, [EnergyFlow.FROM_PV]: generation }));
            }
        };

        updatePvGeneration();
    }, [currentHour, timeOfDay, devices.pvPanels.status]);

    /**
     * 根据储能状态更新能源流动
     */
    useEffect(() => {
        if (devices.storage.status === DeviceStatus.CHARGING) {
            setEnergyFlow(prev => ({ ...prev, [EnergyFlow.TO_STORAGE]: 100, [EnergyFlow.FROM_STORAGE]: 0 }));
        } else if (devices.storage.status === DeviceStatus.DISCHARGING) {
            setEnergyFlow(prev => ({ ...prev, [EnergyFlow.TO_STORAGE]: 0, [EnergyFlow.FROM_STORAGE]: 100 }));
        } else {
            setEnergyFlow(prev => ({ ...prev, [EnergyFlow.TO_STORAGE]: 0, [EnergyFlow.FROM_STORAGE]: 0 }));
        }
    }, [devices.storage.status]);

    /**
     * 昼夜切换时自动更新路灯状态
     */
    useEffect(() => {
        const isNight = timeOfDay === TimeOfDay.NIGHT;
        setDevices(prev => ({
            ...prev,
            streetLights: {
                ...prev.streetLights,
                status: isNight ? DeviceStatus.RUNNING : DeviceStatus.OFF,
                onCount: isNight ? 8 : 0
            }
        }));
    }, [timeOfDay]);

    return {
        timeOfDay,
        setTimeOfDay,
        currentHour,
        setCurrentHour,
        dataSourceMode,
        setDataSourceMode,
        devices,
        energyFlow,
        toggleDevice
    };
};
