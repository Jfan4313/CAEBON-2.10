// 微电网可视化类型定义

/**
 * 设备运行状态枚举
 */
export enum DeviceStatus {
    IDLE = 'idle',           // 待机
    RUNNING = 'running',     // 运行中
    CHARGING = 'charging',   // 充电中
    DISCHARGING = 'discharging', // 放电中
    OFF = 'off'             // 关闭
}

/**
 * 昼夜状态枚举
 */
export enum TimeOfDay {
    DAY = 'day',
    NIGHT = 'night'
}

/**
 * 能源流向类型
 */
export enum EnergyFlow {
    FROM_GRID = 'from_grid',
    TO_GRID = 'to_grid',
    FROM_PV = 'from_pv',
    TO_STORAGE = 'to_storage',
    FROM_STORAGE = 'from_storage'
}

/**
 * 数据来源模式
 */
export enum DataSourceMode {
    MANUAL = 'manual',       // 手动控制
    SIMULATION = 'simulation', // 模拟数据
    REALTIME = 'realtime'    // 实时数据
}

/**
 * 单个设备状态
 */
export interface DeviceState {
    status: DeviceStatus;
    power: number;  // 功率（kW）
}

/**
 * 储能设备状态（扩展）
 */
export interface StorageDeviceState extends DeviceState {
    soc: number;  // 荷电状态（0-100%）
}

/**
 * 路灯设备状态
 */
export interface StreetLightState {
    status: DeviceStatus;
    count: number;     // 总数量
    onCount: number;   // 开启数量
}

/**
 * 光伏设备状态
 */
export interface PvDeviceState extends DeviceState {
    generation: number;  // 发电量（kW）
}

/**
 * 电动汽车状态
 */
export interface EvCarState {
    id: string;
    status: DeviceStatus;
    batteryLevel: number;  // 电池电量（0-100%）
}

/**
 * 微电网可视化状态
 */
export interface MicrogridVisualState {
    // 数据源模式
    dataSourceMode: DataSourceMode;

    // 昼夜状态
    timeOfDay: TimeOfDay;
    currentHour: number; // 0-23

    // 设备状态
    devices: {
        // 充电桩
        evCharger1: DeviceState;
        evCharger2: DeviceState;

        // 空调系统
        hvacOutdoor1: DeviceState;
        hvacOutdoor2: DeviceState;
        hvacIndoor: DeviceState;

        // 储能
        storage: StorageDeviceState;

        // 路灯
        streetLights: StreetLightState;

        // 光伏
        pvPanels: PvDeviceState;

        // 电动汽车
        evCars: EvCarState[];
    };

    // 能源流动
    energyFlow: {
        [EnergyFlow.FROM_GRID]: number;
        [EnergyFlow.TO_GRID]: number;
        [EnergyFlow.FROM_PV]: number;
        [EnergyFlow.TO_STORAGE]: number;
        [EnergyFlow.FROM_STORAGE]: number;
    };

    // 模拟数据接口（预留）
    simulationData: HourlyData[] | null;

    // 实时数据接口（预留）
    realtimeData: RealtimeData | null;
}

/**
 * 小时级数据接口（用于模拟）
 */
export interface HourlyData {
    hour: number;
    pvGeneration: number;      // 光伏发电量
    gridImport: number;        // 电网输入
    gridExport: number;        // 电网输出
    storageCharge: number;     // 储能充电
    storageDischarge: number;  // 储能放电
    load: number;              // 负荷
}

/**
 * 实时数据接口（预留）
 */
export interface RealtimeData {
    timestamp: string;
    devices: MicrogridVisualState['devices'];
    energyFlow: MicrogridVisualState['energyFlow'];
}

/**
 * 微电网状态返回值
 */
export interface MicrogridStateReturn {
    timeOfDay: TimeOfDay;
    setTimeOfDay: (time: TimeOfDay) => void;
    currentHour: number;
    setCurrentHour: (hour: number) => void;
    dataSourceMode: DataSourceMode;
    setDataSourceMode: (mode: DataSourceMode) => void;
    devices: MicrogridVisualState['devices'];
    energyFlow: MicrogridVisualState['energyFlow'];
    toggleDevice: (device: string) => void;
}
