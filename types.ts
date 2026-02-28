export type View =
  | 'dashboard'
  | 'project-entry'
  | 'price-config'
  | 'retrofit-solar'
  | 'retrofit-storage'
  | 'retrofit-hvac'
  | 'retrofit-lighting'
  | 'retrofit-water'
  | 'retrofit-ev'
  | 'retrofit-microgrid'
  | 'retrofit-vpp'
  | 'retrofit-ai'
  | 'retrofit-carbon'
  | 'revenue-analysis'
  | 'report-center'
  | 'formula-admin'
  | 'visual-analysis';

// Module type definitions for better type safety
export type ModuleType =
  | 'solar'
  | 'storage'
  | 'hvac'
  | 'lighting'
  | 'water'
  | 'ev'
  | 'microgrid'
  | 'vpp'
  | 'ai'
  | 'carbon';

// Strategy type definitions
export type StrategyType =
  | 'rooftop'
  | 'arbitrage'
  | 'replace'
  | 'smart'
  | 'grid-tied'
  | 'dr'
  | 'ai'
  | 'trade';

// KPI Metric interface
export interface KPIMetric {
  label: string;
  value: string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface SidebarItemProps {
  icon: string;
  label: string;
  view: View;
  isActive: boolean;
  onClick: (view: View) => void;
  hasSubmenu?: boolean;
}

// 管理员模式类型定义
export interface FormulaParam {
  key: string;
  label: string;
  defaultValue: number | string;
  unit: string;
  editable: boolean;
  type?: 'number' | 'select';
  options?: Record<string, string>;
}

export interface FormulaItem {
  formula: string;
  description: string;
}

export interface ModuleFormula {
  id: string;
  name: string;
  formulas: FormulaItem[];
  params: FormulaParam[];
  testResult?: {
    investment?: number;
    annual_saving?: number;
    roi?: number;
    irr?: number;
    payback_period?: number;
    npv?: number;
    carbon_reduction?: number;
    [key: string]: number | undefined;
  };
}

// ==================== Microgrid Visual Types ====================

/**
 * 设备运行状态枚举
 */
export enum DeviceStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  CHARGING = 'charging',
  DISCHARGING = 'discharging',
  OFF = 'off'
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
  MANUAL = 'manual',
  SIMULATION = 'simulation',
  REALTIME = 'realtime'
}

/**
 * 单个设备状态
 */
export interface DeviceState {
  status: DeviceStatus;
  power: number;
}

/**
 * 储能设备状态（扩展）
 */
export interface StorageDeviceState extends DeviceState {
  soc: number;
}

/**
 * 路灯设备状态
 */
export interface StreetLightState {
  status: DeviceStatus;
  count: number;
  onCount: number;
}

/**
 * 光伏设备状态
 */
export interface PvDeviceState extends DeviceState {
  generation: number;
}

/**
 * 电动汽车状态
 */
export interface EvCarState {
  id: string;
  status: DeviceStatus;
  batteryLevel: number;
}

/**
 * 微电网设备状态集合
 */
export interface MicrogridDevices {
  evCharger1: DeviceState;
  evCharger2: DeviceState;
  hvacOutdoor1: DeviceState;
  hvacOutdoor2: DeviceState;
  hvacIndoor: DeviceState;
  storage: StorageDeviceState;
  streetLights: StreetLightState;
  pvPanels: PvDeviceState;
  evCars: EvCarState[];
}

/**
 * 微电网可视化状态
 */
export interface MicrogridVisualState {
  dataSourceMode: DataSourceMode;
  timeOfDay: TimeOfDay;
  currentHour: number;
  devices: MicrogridDevices;
  energyFlow: {
    [EnergyFlow.FROM_GRID]: number;
    [EnergyFlow.TO_GRID]: number;
    [EnergyFlow.FROM_PV]: number;
    [EnergyFlow.TO_STORAGE]: number;
    [EnergyFlow.FROM_STORAGE]: number;
  };
  simulationData: HourlyData[] | null;
  realtimeData: RealtimeData | null;
}

/**
 * 小时级数据接口
 */
export interface HourlyData {
  hour: number;
  pvGeneration: number;
  gridImport: number;
  gridExport: number;
  storageCharge: number;
  storageDischarge: number;
  load: number;
}

/**
 * 实时数据接口
 */
export interface RealtimeData {
  timestamp: string;
  devices: MicrogridDevices;
  energyFlow: MicrogridVisualState['energyFlow'];
}

// ==================== Device Config Types ====================

/**
 * 图片位置类型
 */
export interface Position {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
}

/**
 * 图片尺寸类型
 */
export interface Size {
    width?: number;
    height?: number | 'auto';
}

/**
 * 设备图片配置
 */
export interface DeviceImageConfig {
    id: string;
    name: string;
    imageSrc: string;
    position: Position;
    size: Size;
    zIndex?: number;
    visible: boolean;
    linkedDevice?: string;
}

/**
 * 面板状态
 */
export interface PanelState {
    isOpen: boolean;
    selectedConfigId: string | null;
    configs: DeviceImageConfig[];
    isDirty: boolean;
}
