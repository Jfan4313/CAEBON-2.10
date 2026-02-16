/**
 * AI 管理平台算法定义
 *
 * 涵盖照明、空调整、光储系统的智能优化算法
 * 考虑动态电价、天气、人流量、光照度、建筑热导系数等因素
 *
 * @author ZeroCarbon Team
 * @version 1.0.0
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 照明系统参数
 */
export interface LightingSystemParams {
  /** 照明区域面积 (m²) */
  area: number;

  /** 现有灯具总功率 (kW) */
  totalPower: number;

  /** 每天运行时间 (小时) */
  dailyHours: number;

  /** 传感器安装密度 (个/m²) */
  sensorDensity?: number;
}

/**
 * 空调系统参数
 */
export interface HVACSystemParams {
  /** 空调区域面积 (m²) */
  area: number;

  /** 当前COP值 */
  currentCOP: number;

  /** 目标COP值 (改造后） */
  targetCOP: number;

  /** 每年制冷时长 (小时） */
  annualCoolingHours: number;

  /** 围护结构类型 */
  buildingType?: 'standard' | 'insulated' | 'high-performance';

  /** 新风系统效率 */
  freshAirEfficiency?: number;

  /** 控制器类型 */
  controllerType?: 'on-off' | 'vrf' | 'chiller';

  /** VRF系统参数 */
  vrfSystem?: {
    /** 室外机数量 */
    outdoorUnitCount: number;
    /** 室内机数量 */
    indoorUnitCount: number;
    /** 制冷剂类型 */
    refrigerantType: 'R410A' | 'R32';
  };

  /** 湿度控制 */
  humidityControl?: boolean;

  /** 制冷容量 (kW) */
  coolingCapacity?: number;
}

/**
 * 光储系统参数
 */
export interface SolarStorageSystemParams {
  /** 光伏装机容量 (kWp) */
  pvCapacity: number;

  /** 储能容量 (kWh) */
  storageCapacity: number;

  /** 储能功率 (kW) */
  storagePower: number;

  /** 往返效率 (%) */
  roundTripEfficiency: number;

  /** 最大充放电深度 (%) */
  dod: number;

  /** 储能年循环次数 */
  cyclesPerDay: number;

  /** 电池类型 */
  batteryType?: 'LFP' | 'NCM' | 'LeadAcid';

  /** 电池使用年限 (年) */
  batteryAge?: number;

  /** 维护率 (%) */
  maintenanceRate?: number;

  /** 残值 (万元) */
  scrapValue?: number;

  /** 电池衰减率 (%/年) */
  degradationRate?: number;
}

/**
 * 建筑参数
 */
export interface BuildingParams {
  /** 建筑类型 */
  type: 'factory' | 'school' | 'office' | 'hospital' | 'mall';

  /** 建筑面积 (m²) */
  area: number;

  /** 建筑朝向 */
  orientation?: 'south' | 'south-east' | 'east' | 'north' | 'west';

  /** 建筑隔热等级 */
  insulationLevel?: 'poor' | 'average' | 'good' | 'excellent';

  /** 玻璃窗占比 (%) */
  glazingRatio?: number;

  /** 层高 (m) */
  floorHeight?: number;

  /** 窗户朝向 */
  windowOrientation?: string[];

  /** 遮阳系数 */
  shadingCoefficient?: number;

  /** 通风率 (m³/h) */
  ventilationRate?: number;

  /** 热质量 (kJ/(m²·K)) */
  thermalMass?: number;
}

/**
 * 外部环境因素
 */
export interface EnvironmentalFactors {
  /** 所在地区 */
  region: string;

  /** 平均气温 (°C) */
  avgTemperature: number;

  /** 年日照时数 (小时） */
  annualSunshineHours: number;

  /** 峰值电价 (元/kWh) */
  peakPrice: number;

  /** 谷值电价 (元/kWh) */
  valleyPrice: number;

  /** 平值电价 (元/kWh) */
  flatPrice: number;

  /** 云量 (%) */
  cloudCover?: number;

  /** 风速 (m/s) */
  windSpeed?: number;

  /** 降雨量 (mm) */
  rainfall?: number;

  /** 空气质量指数 */
  aqi?: number;

  /** 太阳辐射 (W/m²) */
  solarIrradiance?: number;
}

/**
 * 人流量模式
 */
export interface TrafficPattern {
  /** 工作日模式 */
  workdayPattern: number[]; // 每小时人流量比例（0-1）

  /** 周末模式 */
  weekendPattern: number[]; // 每小时人流量比例（0-1）

  /** 节假日模式 */
  holidayPattern?: number[]; // 每小时人流量比例（0-1）

  /** 特殊事件 */
  specialEvents?: Array<{
    date: string;
    hourFrom: number;
    hourTo: number;
    multiplier: number; // 流量倍数
  }>;
}

/**
 * V2G 设备参数
 */
export interface V2GDevice {
  /** 设备ID */
  id: string;
  /** 电池容量 (kWh) */
  capacity: number;
  /** 最大充放电功率 (kW) */
  maxPower: number;
  /** 当前SOC (%) */
  currentSoc: number;
  /** 可放电时段 [小时开始, 小时结束][] */
  availableHours: Array<[number, number]>;
  /** 电池衰减成本 (元/kWh) */
  degradationCost?: number;
  /** 用户优先级 */
  userPriority: 'low' | 'medium' | 'high';
}

/**
 * 强化学习配置
 */
export interface RLConfig {
  /** 算法类型 */
  algorithm: 'dqn' | 'ppo' | 'sac';
  /** 学习率 */
  learningRate: number;
  /** 折扣因子 */
  discountFactor: number;
  /** 探索率 */
  explorationRate: number;
  /** 批次大小 */
  batchSize: number;
  /** 训练回合数 */
  trainingEpisodes: number;
  /** 奖励函数类型 */
  rewardFunction: 'cost' | 'emission' | 'multi-objective';
}

/**
 * 数字孪生模型配置
 */
export interface DigitalTwinModel {
  /** 建筑热模型 */
  building: {
    /** 热区数量 */
    thermalZones: number;
    /** 热惯性 (小时) */
    thermalInertia: number;
    /** 热容量 (kJ/K) */
    heatCapacity: number;
  };
  /** HVAC系统模型 */
  hvac: {
    /** 响应时间 (分钟) */
    responseTime: number;
    /** 设定点死区 (°C) */
    setpointDeadband: number;
  };
  /** 环境预测模型 */
  environment: {
    /** 预测时长 (小时) */
    forecastHorizon: number;
    /** 预测精度 (%) */
    predictionAccuracy: number;
  };
}

/**
 * 舒适度指标 (PMV/PPD)
 */
export interface ComfortMetrics {
  /** 预测平均投票值 (-3 to +3) */
  pmv: number;
  /** 预测不满意百分比 (0-100%) */
  ppd: number;
  /** 设定点温度 (°C) */
  setpointTemperature: number;
  /** 湿度 (%) */
  humidity: number;
  /** 空气流速 (m/s) */
  airVelocity: number;
  /** 服装热阻 (clo) */
  cloValue: number;
  /** 新陈代谢率 (met) */
  metValue: number;
}

/**
 * 用户行为模式
 */
export interface UserBehaviorPattern {
  /** 24小时在室率 (0-1) */
  occupancy: number[];
  /** 日程类型 */
  scheduleType: 'fixed' | 'flexible' | 'shift';
  /** 舒适度偏好 */
  comfortPreference: 'conservative' | 'moderate' | 'flexible';
  /** 节能意识 (0-1) */
  energyAwareness: number;
}

/**
 * 历史数据
 */
export interface HistoricalData {
  /** 时间戳 */
  timestamp: number;
  /** 负荷 (kW) */
  load: number;
  /** 电价 (元/kWh) */
  price: number;
  /** 光伏发电 (kW) */
  pvGeneration?: number;
  /** 温度 (°C) */
  temperature?: number;
  /** 湿度 (%) */
  humidity?: number;
}

/**
 * 热状态
 */
export interface ThermalState {
  /** 室内温度 (°C) */
  indoorTemperature: number;
  /** 墙体温度 (°C) */
  wallTemperature: number;
  /** 热负荷 (kW) */
  thermalLoad: number;
  /** 热舒适度指标 */
  comfortLevel: 'comfortable' | 'slightly_cool' | 'slightly_warm' | 'cool' | 'warm' | 'cold' | 'hot';
}

/**
 * 电池健康状态
 */
export interface BatteryHealthMetrics {
  /** 当前容量 (kWh) */
  currentCapacity: number;
  /** 健康度 (%) */
  health: number;
  /** 累计循环次数 */
  cycleCount: number;
  /** 衰减成本 (元) */
  degradationCost: number;
}

/**
 * V2G 调度计划
 */
export interface V2GSchedule {
  /** 设备ID */
  deviceId: string;
  /** 24小时调度计划 */
  hourlySchedule: Array<{
    hour: number;
    action: 'charge' | 'discharge' | 'idle';
    power: number; // kW
    soc: number; // %
  }>;
  /** 预期收益 (元) */
  expectedRevenue: number;
}

/**
 * 强化学习训练结果
 */
export interface RLTrainingResult {
  /** 累计奖励 */
  cumulativeReward: number;
  /** 平均奖励 */
  averageReward: number;
  /** 训练回合数 */
  episodes: number;
  /** 损失值 */
  loss: number;
  /** 最优策略 */
  optimalPolicy: number[];
}

// ============================================================================
// 城础数据
// ============================================================================

/**
 * 中国主要城市平均年日照时数
 */
export const CITY_SUNSHINE_DATA: Record<string, number> = {
  // 华北地区
  '北京': 1650,
  '天津': 1680,
  '石家庄': 1720,
  '太原': 1750,
  '呼和浩特': 1820,

  // 华东地区
  '上海': 1420,
  '南京': 1650,
  '杭州': 1580,
  '合肥': 1750,
  '济南': 1820,
  '青岛': 1780,
  '苏州': 1600,
  '宁波': 1750,

  // 华南地区
  '广州': 1580,
  '深圳': 1720,
  '南宁': 1680,
  '海口': 1820,
  '昆明': 2100,
  '贵阳': 1320,
  '成都': 1250,
  '重庆': 1100,
  '长沙': 1520,
  '福州': 1650,
  '厦门': 1780,

  // 华中地区
  '武汉': 1650,
  '郑州': 1720,
  '西安': 1780,
  '兰州': 2100,
  '西宁': 2180,
  '南昌': 1650,
};

/**
 * 建筑热导系数 (W/(m²·K)）
 */
export const BUILDING_THERMAL_COEFFICIENTS: Record<BuildingParams['type'], number> = {
  factory: 2.5,      // 标准工厂墙体
  school: 2.0,      // 学校教室结构
  office: 2.8,      // 办公建筑
  hospital: 1.5,   // 医院保温较好
  mall: 1.8,      // 商场玻璃较多
};

/**
 * 照明系统节能效率基准值
 */
export const LIGHTING_EFFICIENCY_BASELINE = {
  /** LED灯具效率 (lm/W) */
  ledEfficiency: 100,

  /** 荧光灯效率 (lm/W) */
  fluorescentEfficiency: 60,

  /** 白炽灯效率 (lm/W) */
  incandescentEfficiency: 15,

  /** 智能照度控制系统节能率 */
  smartControlSavings: 0.25, // 25%
};

/**
 * 空调系统能效参数
 */
export const HVAC_EFFICIENCY_PARAMS = {
  /** 制冷设备能效系数 (0-1) */
  equipmentEfficiencyFactor: 0.85,

  /** 管道热损失系数 (0-1) */
  ductLossFactor: 0.9,

  /** 系统设计余量 (%) */
  systemDesignMargin: 0.15,

  /** 部分负荷系数（0-1) */
  partialLoadFactor: 0.7,
};

/**
 * 光储系统性能参数
 */
export const SOLAR_STORAGE_PERFORMANCE = {
  /** 光伏组件温度系数 */
  pvTempCoefficient: 0.0045, // -0.45%/°C

  /** 储能温度系数 */
  storageTempCoefficient: 0.002, // -0.2%/°C

  /** 逆变器效率 (%) */
  inverterEfficiency: 0.97,

  /** 系统线路损耗 (%) */
  systemLoss: 0.02,
};

// ============================================================================
// 场景定义
// ============================================================================

/**
 * 季节系数（用于计算季节性负荷）
 */
export const SEASONAL_FACTORS = {
  /** 春季（3-5月） */
  spring: {
    loadMultiplier: 0.9,      // 负荷降低
    hvacLoadMultiplier: 1.1,   // 空调负荷增加
    lightingLoadMultiplier: 1.05, // 照明负荷增加
  },

  /** 夏季（6-8月） */
  summer: {
    loadMultiplier: 1.2,      // 负荷最高
    hvacLoadMultiplier: 1.4,   // 空调负荷最高
    lightingLoadMultiplier: 1.1,  // 照明负荷增加
    pvEfficiencyMultiplier: 0.95, // 光伏效率下降
  },

  /** 秋季（9-11月） */
  autumn: {
    loadMultiplier: 1.0,      // 负荷正常
    hvacLoadMultiplier: 1.1,   // 空调负荷正常
    lightingLoadMultiplier: 0.95,  // 照明负荷降低
  },

  /** 冬季（12-2月） */
  winter: {
    loadMultiplier: 0.8,      // 负荷最低
    hvacLoadMultiplier: 0.85,  // 空调负荷降低
    lightingLoadMultiplier: 0.9,  // 照明负荷增加
  },
};

/**
 * 时间段定义
 * 修复了峰段和平段的重叠问题
 */
export const TIME_PERIODS = {
  /** 谷时段（0:00-8:00） */
  valley: { start: 0, end: 8, name: '谷' },

  /** 平时段（8:00-10:00, 17:00-22:00） */
  flat: { start: 8, end: 10, name: '平' },
  flat_evening: { start: 17, end: 22, name: '平' },

  /** 峰时段（10:00-12:00, 14:00-17:00） */
  peak: { start: 10, end: 12, name: '峰' },
  peak_afternoon: { start: 14, end: 17, name: '峰' },

  /** 尖峰时段（12:00-14:00） */
  sharpPeak: { start: 12, end: 14, name: '尖峰' },
};

/**
 * 光照等级
 */
export const SOLAR_IRRADIANCE_LEVELS = {
  direct: 1000,   // W/m² - 直射
  scattered: 850,   // W/m² - 散射
  cloudy: 600,    // W/m² - 多云
};

/**
 * 电价模式枚举
 */
export enum PriceMode {
  /** 固定分时电价（三段） */
  TOU_3_SEG = 'tou_3_seg',
  /** 四段式电价（含尖峰） */
  TOU_4_SEG = 'tou_4_seg',
  /** 实时动态电价 */
  REAL_TIME = 'real_time',
  /** 混合预测模式 */
  HYBRID = 'hybrid',
  /** 固定电价 */
  FIXED = 'fixed',
}

/**
 * 电价时段类型
 */
export enum PricePeriodType {
  VALLEY = 'valley',
  FLAT = 'flat',
  PEAK = 'peak',
  SHARP_PEAK = 'sharp_peak',
}

/**
 * 电价时段配置
 */
export interface PricePeriod {
  /** 时段类型 */
  type: PricePeriodType;
  /** 开始小时（0-23） */
  startHour: number;
  /** 结束小时（0-23，exclusive） */
  endHour: number;
  /** 电价（元/kWh） */
  price: number;
  /** 是否允许需求响应 */
  drEligible?: boolean;
  /** DR补偿倍数 */
  drCompensationMultiplier?: number;
}

/**
 * 电价配置
 */
export interface PriceConfiguration {
  /** 电价模式 */
  mode: PriceMode;
  /** 时段配置 */
  periods: PricePeriod[];
  /** 基准电价（元/kWh） */
  basePrice: number;
  /** 区域代码 */
  region?: string;
  /** 季节调整系数 */
  seasonalAdjustment?: number;
  /** 生效日期 */
  effectiveDate?: Date;
}

/**
 * 实时电价数据
 */
export interface RealTimePriceData {
  /** 时间戳 */
  timestamp: number;
  /** 电价（元/kWh） */
  price: number;
  /** 预测置信度（0-1） */
  confidence: number;
  /** 价格趋势 */
  trend: 'rising' | 'falling' | 'stable';
  /** 峰值标记 */
  isPeak: boolean;
  /** 可用于需求响应 */
  drAvailable: boolean;
}

/**
 * 电价预测结果
 */
export interface PriceForecastResult {
  /** 预测时间段 */
  timeRange: { start: Date; end: Date };
  /** 预测电价数组 */
  prices: RealTimePriceData[];
  /** 平均电价 */
  avgPrice: number;
  /** 最高电价 */
  maxPrice: number;
  /** 最低电价 */
  minPrice: number;
  /** 价差 */
  priceSpread: number;
  /** 预测精度 */
  accuracy: number;
}

/**
 * 电价数据源类型
 */
export enum PriceDataSource {
  /** 模拟数据 */
  SIMULATED = 'simulated',
  /** 真实API */
  REAL_API = 'real_api',
  /** 混合源 */
  HYBRID = 'hybrid',
}

/**
 * 计算平均电价
 * 根据电价配置计算24小时平均电价
 * @param config 电价配置
 * @returns 平均电价（元/kWh）
 */
export function calculateAveragePrice(config: PriceConfiguration): number {
  if (config.mode === PriceMode.FIXED) {
    return config.basePrice;
  }

  let totalPrice = 0;
  let totalHours = 0;

  for (const period of config.periods) {
    const hours = period.endHour - period.startHour;
    totalPrice += period.price * hours;
    totalHours += hours;
  }

  return totalHours > 0 ? totalPrice / totalHours : config.basePrice;
}

// ============================================================================
// 照明系统算法
// ============================================================================

/**
 * 计算照明系统基准能耗
 * @param params 照明系统参数
 * @param trafficPattern 人流量模式
 * @returns {baselineLoad: 基准负荷(kW), dailyConsumption: 日耗电量(kWh)}
 */
export function calculateLightingBaseline(
  params: LightingSystemParams,
  trafficPattern?: TrafficPattern
): { baselineLoad: number; dailyConsumption: number } {
  const { area, totalPower, dailyHours, sensorDensity } = params;

  // 计算单位面积功率密度
  const powerDensity = totalPower / area; // W/m²

  // 根据人流量调整基准
  let trafficMultiplier = 1;
  if (trafficPattern) {
    const hour = new Date().getHours();
    const pattern = hour < 7 ? trafficPattern.weekendPattern
                  : hour < 18 ? trafficPattern.workdayPattern
                  : trafficPattern.holidayPattern;

    const index = Math.min(pattern.length - 1, Math.floor(hour));
    if (index >= 0) {
      trafficMultiplier = 1 + pattern[index] * 0.3; // 人流量每增加10%影响负荷30%
    }
  }

  // 基准负荷 = 功率密度 × 面积 × 流量系数
  const baselineLoad = powerDensity * area * trafficMultiplier / 1000; // kW

  // 日耗电量 = 基准负荷 × 运行时间
  const dailyConsumption = baselineLoad * dailyHours;

  return { baselineLoad, dailyConsumption };
}

/**
 * 计算照明系统节能潜力
 * @param params 照明系统参数
 * @param currentSystem 当前系统配置
 * @param priceConfig 电价配置（可选，如果不提供则使用默认0.6元/kWh）
 * @returns {savingsKWh: 节电量, savingsRate: 节电率, roi: 投资回报率}
 */
export function calculateLightingSavings(
  params: LightingSystemParams,
  currentSystem: { area: number, totalPower: number, dailyHours: number },
  environmentalFactors?: EnvironmentalFactors,
  priceConfig?: PriceConfiguration
): { savingsKWh: number; savingsRate: number; roi: number } {
  const { area, totalPower, dailyHours } = params;
  const { totalPower: oldTotalPower, dailyHours: oldDailyHours } = currentSystem;

  // 1. 从白炽灯升级到LED的节能
  const incandescentToLedSavings = oldTotalPower *
    (LIGHTING_EFFICIENCY_BASELINE.ledEfficiency - LIGHTING_EFFICIENCY_BASELINE.incandescentEfficiency) /
    LIGHTING_EFFICIENCY_BASELINE.incandescentEfficiency;

  // 2. 智能控制系统节能（光感+调光）
  const smartControlSavings = totalPower * LIGHTING_EFFICIENCY_BASELINE.smartControlSavings * dailyHours;

  // 3. 按需调光节能（根据人流量和自然光）
  let daylightSavings = 0;
  if (environmentalFactors?.avgTemperature) {
    const avgSunshinePerHour = environmentalFactors.annualSunshineHours / 365 / 24;
    // 假设平均光照可利用6小时/天
    const daylightHours = Math.min(avgSunshinePerHour, 6) * dailyHours;
    daylightSavings = totalPower * daylightHours * 0.3; // 30%节能潜力
  }

  // 总节电量
  const totalSavingsKWh = incandescentToLedSavings + smartControlSavings + daylightSavings;

  // 节电率
  const dailyConsumption = oldTotalPower * oldDailyHours;
  const savingsRate = (totalSavingsKWh / dailyConsumption) * 100;

  // ROI计算（假设LED改造投资 50元/W，智能控制 30元/m²）
  const investment = totalPower * 50 + area * 30;
  const annualSavings = totalSavingsKWh * 365;

  // 使用动态电价计算平均电价
  const avgPrice = priceConfig ? calculateAveragePrice(priceConfig) : 0.6;
  const roi = (annualSavings * avgPrice - investment) / investment * 100;

  return { savingsKWh: totalSavingsKWh, savingsRate, roi };
}

// ============================================================================
// 空调系统算法
// ============================================================================

/**
 * 计算空调系统基准负荷
 * @param params 空调系统参数
 * @param buildingParams 建筑参数
 * @param environmentalFactors 环境因素
 * @param trafficPattern 人流量模式
 * @returns {baselineLoad: 基准负荷(kW), coolingLoad: 制冷负荷(kW)}
 */
export function calculateHVACBaseline(
  params: HVACSystemParams,
  buildingParams?: BuildingParams,
  environmentalFactors?: EnvironmentalFactors,
  trafficPattern?: TrafficPattern
): { baselineLoad: number; coolingLoad: number } {
  const { area, currentCOP, annualCoolingHours } = params;
  const thermalCoef = buildingParams
    ? BUILDING_THERMAL_COEFFICIENTS[buildingParams.type]
    : BUILDING_THERMAL_COEFFICIENTS.office;

  // 计算制冷负荷 (kW)
  const coolingLoad = (area * 100 / thermalCoef) * (annualCoolingHours / 24) / 1000;

  // 根据人流量和季节调整
  let seasonMultiplier = 1;
  if (trafficPattern) {
    const month = new Date().getMonth();
    const isWinter = month >= 12 || month <= 2;
    const isSummer = month >= 6 && month <= 8;

    if (isSummer) seasonMultiplier = SEASONAL_FACTORS.summer.loadMultiplier;
    else if (isWinter) seasonMultiplier = SEASONAL_FACTORS.winter.loadMultiplier;
    else seasonMultiplier = SEASONAL_FACTORS.autumn.loadMultiplier;

    // 人流量影响（增加15%）
    const hour = new Date().getHours();
    const pattern = hour < 7 ? trafficPattern.weekendPattern
                  : hour < 18 ? trafficPattern.workdayPattern
                  : trafficPattern.holidayPattern;
    const index = Math.min(pattern.length - 1, Math.floor(hour));
    if (index >= 0) {
      seasonMultiplier += pattern[index] * 0.15;
    }
  }

  // 环境温度影响
  if (environmentalFactors?.avgTemperature) {
    // 温度每高于26°C增加1%负荷
    const tempFactor = 1 + (environmentalFactors.avgTemperature - 26) * 0.01;
    seasonMultiplier *= tempFactor;
  }

  const baselineLoad = coolingLoad * seasonMultiplier;

  return { baselineLoad, coolingLoad };
}

/**
 * 计算空调系统节能潜力
 * @param params 空调系统参数
 * @param currentSystem 当前系统配置
 * @param priceConfig 电价配置（可选，如果不提供则使用默认0.8元/kWh）
 * @returns {savingsKWh: 节电量, copImprovement: COP提升, roi: 投资回报率}
 */
export function calculateHVACSavings(
  params: HVACSystemParams,
  currentSystem: HVACSystemParams,
  environmentalFactors?: EnvironmentalFactors,
  trafficPattern?: TrafficPattern,
  priceConfig?: PriceConfiguration
): { savingsKWh: number; copImprovement: number; roi: number } {
  const { area, currentCOP: oldCOP, targetCOP, annualCoolingHours, freshAirEfficiency } = params;

  // 计算制冷负荷 (kW)
  const coolingLoad = (area * 100 / BUILDING_THERMAL_COEFFICIENTS.office) *
                      (annualCoolingHours / 24) / 1000;

  // 1. COP提升节能
  const copSavings = coolingLoad * (1 - targetCOP / oldCOP) *
                     HVAC_EFFICIENCY_PARAMS.equipmentEfficiencyFactor *
                     HVAC_EFFICIENCY_PARAMS.systemDesignMargin;

  // 2. 新风系统节能
  const freshAirEff = freshAirEfficiency || HVAC_EFFICIENCY_PARAMS.equipmentEfficiencyFactor;
  const freshAirSavings = coolingLoad * (freshAirEff / 0.85) *
                          HVAC_EFFICIENCY_PARAMS.partialLoadFactor;

  // 3. 按需控制节能
  let occupancySavings = 0;
  if (trafficPattern) {
    const hour = new Date().getHours();
    const pattern = hour < 7 ? trafficPattern.weekendPattern
                  : hour < 18 ? trafficPattern.workdayPattern
                  : trafficPattern.holidayPattern || trafficPattern.workdayPattern;

    const index = Math.min(pattern.length - 1, Math.floor(hour));
    if (index >= 0) {
      // 人流量低时，按需控制节能15%
      occupancySavings = coolingLoad * (1 - pattern[index]) * 0.15 *
                      HVAC_EFFICIENCY_PARAMS.partialLoadFactor;
    }
  }

  // 总节电量
  const dailySavings = copSavings + freshAirSavings + occupancySavings;
  const totalSavingsKWh = dailySavings * 365;

  // COP提升
  const copImprovement = (targetCOP - oldCOP) / oldCOP * 100;

  // ROI计算（假设改造投资 200元/m²制冷容量）
  const investment = area * 200;

  // 使用动态电价计算平均电价
  const avgPrice = priceConfig ? calculateAveragePrice(priceConfig) : (environmentalFactors?.flatPrice || 0.8);
  const annualSavings = totalSavingsKWh * avgPrice / 10000; // 万元
  const roi = (annualSavings - investment / 10) / investment * 100;

  return { savingsKWh: totalSavingsKWh, copImprovement, roi };
}

// ============================================================================
// 光储系统算法
// ============================================================================

/**
 * 计算光伏系统发电量
 * @param params 光储系统参数
 * @param environmentalFactors 环境因素
 * @returns {dailyGeneration: 日发电量, annualGeneration: 年发电量}
 */
export function calculateSolarGeneration(
  params: SolarStorageSystemParams,
  environmentalFactors?: EnvironmentalFactors
): { dailyGeneration: number; annualGeneration: number } {
  const { pvCapacity } = params;

  // 根据城市获取年日照时数
  const annualSunshineHours = environmentalFactors?.region && CITY_SUNSHINE_DATA[environmentalFactors.region]
    ? CITY_SUNSHINE_DATA[environmentalFactors.region]
    : 1650; // 默认值

  const dailySunshineHours = annualSunshineHours / 365;

  // 根据天气条件调整效率
  let efficiencyFactor = 1;
  if (environmentalFactors) {
    // 光照等级调整
    const irradiance = environmentalFactors.solarIrradiance ||
                        (environmentalFactors.annualSunshineHours / 365 / 24 * 50); // W/m² 近似值
    if (irradiance >= 900) efficiencyFactor = 1.05;
    else if (irradiance >= 700) efficiencyFactor = 1;
    else if (irradiance >= 500) efficiencyFactor = 0.95;
    else efficiencyFactor = 0.9;

    // 温度调整
    if (environmentalFactors.avgTemperature) {
      efficiencyFactor *= (1 - (environmentalFactors.avgTemperature - 25) * 0.003);
    }
  }

  // 日发电量 = 装机容量 × 年日照时数 × 效率 × 温度系数
  const dailyGeneration = pvCapacity * dailySunshineHours *
    SOLAR_STORAGE_PERFORMANCE.inverterEfficiency *
    SOLAR_STORAGE_PERFORMANCE.systemLoss * efficiencyFactor;

  const annualGeneration = dailyGeneration * 365;

  return { dailyGeneration, annualGeneration };
}

/**
 * 计算储能系统容量利用率
 * @param params 光储系统参数
 * @param priceCurve 24小时电价曲线
 * @returns {optimalSchedule: 最优充放电计划, annualArbitrage: 年套利收益}
 */
export function calculateStorageOptimization(
  params: SolarStorageSystemParams,
  priceCurve: number[],
  trafficPattern?: TrafficPattern
): { optimalSchedule: { hour: number; action: 'charge' | 'discharge' | 'idle' }[];
       annualArbitrage: number } {
  const { storageCapacity, storagePower } = params;

  // 分析价格曲线
  const sortedPrices = priceCurve.map((p, i) => ({ price: p, hour: i }))
    .sort((a, b) => a.price - b.price);

  const valleyPrice = sortedPrices[0].price;
  const peakPrice = sortedPrices[sortedPrices.length - 1].price;
  const priceSpread = peakPrice - valleyPrice;

  // 计算最优充放电策略
  const optimalSchedule: { hour: number; action: 'charge' | 'discharge' | 'idle' }[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const price = priceCurve[hour];
    const isValleyHour = price <= valleyPrice * 1.1;
    const isPeakHour = price >= peakPrice * 0.9;

    // 获取当前时段
    const period = TIME_PERIODS.valley.start <= hour && hour < TIME_PERIODS.valley.end ? 'valley'
                 : TIME_PERIODS.flat.start <= hour && hour < TIME_PERIODS.flat.end ? 'flat'
                 : TIME_PERIODS.peak.start <= hour && hour < TIME_PERIODS.peak.end ? 'peak'
                 : TIME_PERIODS.sharpPeak.start <= hour && hour < TIME_PERIODS.sharpPeak.end ? 'sharpPeak'
                 : 'valley';

    // 基础策略：谷充峰放
    let action: 'charge' | 'discharge' | 'idle' = 'idle';

    if (isValleyHour) {
      // 谷时充电
      action = 'charge';
      optimalSchedule.push({ hour, action });
    } else if (isPeakHour) {
      // 峰时放电
      action = 'discharge';
      optimalSchedule.push({ hour, action });
    } else {
      // 平时段空闲
      action = 'idle';
      optimalSchedule.push({ hour, action });
    }
  }

  // 计算年套利收益
  let dailyArbitrage = 0;
  for (let hour = 0; hour < 24; hour++) {
    const schedule = optimalSchedule[hour];
    const price = priceCurve[hour];

    if (schedule.action === 'discharge') {
      dailyArbitrage += (storagePower / 2) * price * 0.95; // 放电效率95%
    }
  }

  const annualArbitrage = dailyArbitrage * 365;

  return { optimalSchedule, annualArbitrage };
}

// ============================================================================
// 综合优化算法
// ============================================================================

/**
 * 计算多系统协同优化
 * @param lightingParams 照明系统参数
 * @param hvacParams 空调系统参数
 * @param solarStorageParams 光储系统参数
 * @param buildingParams 建筑参数
 * @param environmentalFactors 环境因素
 * @param trafficPattern 人流量模式
 * @returns {optimizedLoadProfile: 优化后的负荷曲线, totalSavings: 总节电量}
 */
export function calculateIntegratedOptimization(
  lightingParams: LightingSystemParams,
  hvacParams: HVACSystemParams,
  solarStorageParams: SolarStorageSystemParams,
  buildingParams?: BuildingParams,
  environmentalFactors?: EnvironmentalFactors,
  trafficPattern?: TrafficPattern,
  aggressiveness: number = 0.5 // 0-1: 保守到激进
): { optimizedLoadProfile: number[]; totalSavings: number; recommendations: string[] } {
  const recommendations: string[] = [];

  // 1. 计算各系统基准
  const lightingBaseline = calculateLightingBaseline(lightingParams, trafficPattern);
  const hvacBaseline = calculateHVACBaseline(hvacParams, buildingParams, environmentalFactors, trafficPattern);

  // 2. 计算光伏发电
  const solarGeneration = calculateSolarGeneration(solarStorageParams, environmentalFactors);

  // 3. 计算储能优化
  const priceCurve = environmentalFactors?.peakPrice ?
    Array.from({ length: 24 }, (_, i) => {
      if (i < 8) return environmentalFactors!.valleyPrice;
      if (i < 14) return environmentalFactors!.flatPrice;
      if (i < 19) return environmentalFactors!.peakPrice;
      if (i < 24) return environmentalFactors!.flatPrice;
      return environmentalFactors!.valleyPrice;
    }) :
    Array.from({ length: 24 }, () => 0.5); // 默认价格

  const storageOptimization = calculateStorageOptimization(
    solarStorageParams,
    priceCurve,
    trafficPattern
  );

  // 4. 生成优化后的24小时负荷曲线
  const optimizedLoadProfile: number[] = [];
  let totalSavingsKWh = 0;

  for (let hour = 0; hour < 24; hour++) {
    // 基础负荷
    const baseLoad = lightingBaseline.baselineLoad + hvacBaseline.baselineLoad;

    // 激进程度调整
    const intensityFactor = 0.5 + aggressiveness * 0.5; // 0.5-1.0

    // 光储协同：光伏优先自用，降低电网购电
    const solarSelfUseRatio = Math.min(
      solarGeneration.dailyGeneration / (baseLoad * 1.2), // 假设最大负荷是基准的120%
      0.8 + aggressiveness * 0.2
    );

    const netGridPurchase = baseLoad * (1 - solarSelfUseRatio) * intensityFactor;

    // 考虑人流量调整
    let trafficFactor = 1;
    if (trafficPattern) {
      const index = hour % 24;
      const pattern = hour < 7 ? trafficPattern.weekendPattern
                    : hour < 18 ? trafficPattern.workdayPattern
                    : trafficPattern.holidayPattern;
      trafficFactor = 1 + (pattern[index] - 0.5) * 0.2; // 流量每偏离10%影响20%
    }

    // 最终优化负荷
    const optimizedLoad = netGridPurchase * trafficFactor * intensityFactor;
    optimizedLoadProfile.push(optimizedLoad);

    // 计算节电量（简化计算）
    const hourlySaving = baseLoad * (1 - optimizedLoad / baseLoad) * intensityFactor;
    totalSavingsKWh += hourlySaving;
  }

  // 5. 生成建议
  if (aggressiveness > 0.8) {
    recommendations.push('建议启用储能削峰填谷功能，利用峰谷价差最大化收益');
    recommendations.push('考虑安装需求响应系统，实现精准负荷控制');
  }
  if (solarGeneration.dailyGeneration / (lightingBaseline.baselineLoad + hvacBaseline.baselineLoad) < 0.5) {
    recommendations.push('光伏装机容量偏小，建议扩容以提升自用率');
  }
  if (buildingParams?.insulationLevel === 'poor') {
    recommendations.push('建议加强建筑保温，降低热负荷');
  }

  const totalAnnualSavings = totalSavingsKWh * 365 / 1000; // 转换为MWh

  return { optimizedLoadProfile, totalSavings: totalAnnualSavings, recommendations };
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取城市日照数据
 */
export function getCitySunshineData(city: string): number {
  return CITY_SUNSHINE_DATA[city] || 1650;
}

/**
 * 生成典型分时电价曲线
 */
export function generateDefaultPriceCurve(
  peakPrice: number = 1.2,
  valleyPrice: number = 0.35,
  flatPrice: number = 0.6
): number[] {
  const curve: number[] = [];
  for (let i = 0; i < 24; i++) {
    if (i >= 0 && i < 8) curve.push(valleyPrice);
    else if (i >= 8 && i < 14) curve.push(flatPrice);
    else if (i >= 14 && i < 19) curve.push(peakPrice);
    else curve.push(flatPrice);
  }
  return curve;
}

/**
 * 生成工作日人流量模式
 * @returns 每小时人流量比例（0-1）
 */
export function generateDefaultTrafficPattern(): number[] {
  const pattern = [];

  // 深夜/清晨 (0-6点): 低流量
  for (let i = 0; i < 6; i++) pattern.push(0.3);

  // 早高峰 (6-10点): 中高流量
  for (let i = 6; i < 10; i++) pattern.push(0.8);

  // 午休 (10-14点): 低流量
  for (let i = 10; i < 14; i++) pattern.push(0.4);

  // 下午工作 (14-18点): 高流量
  for (let i = 14; i < 18; i++) pattern.push(0.95);

  // 傍高峰 (18-22点): 中高流量
  for (let i = 18; i < 22; i++) pattern.push(0.8);

  // 夜间 (22-24点): 低流量
  for (let i = 22; i < 24; i++) pattern.push(0.2);

  return pattern;
}

// ============================================================================
// 高级算法 - PMV/PPD 舒适度计算
// ============================================================================

/**
 * 计算PMV (预测平均投票值)
 * 基于Fanger方程计算热舒适度
 * @param temperature 室内温度 (°C)
 * @param humidity 相对湿度 (%)
 * @param airVelocity 空气流速 (m/s)
 * @param meanRadiantTemp 平均辐射温度 (°C)
 * @param cloValue 服装热阻 (clo)
 * @param metValue 新陈代谢率 (met)
 * @returns PMV值 (-3 to +3)
 */
export function calculatePMV(
  temperature: number,
  humidity: number,
  airVelocity: number,
  meanRadiantTemp: number,
  cloValue: number = 0.5,
  metValue: number = 1.0
): number {
  // Fanger方程简化实现
  const t = temperature;
  const phi = humidity / 100; // 相对湿度转小数
  const v = Math.max(airVelocity, 0.1); // 最小0.1 m/s
  const clo = cloValue;
  const met = metValue;

  // 计算服装表面温度 (简化)
  const tClo = 35.7 - 0.028 * met - 0.155 * clo *
                (met * 3.05 - 0.357 - 0.028 * met * 5.36 * (35.7 - 0.028 * met - t));

  // 计算对流换热系数
  const hc = 12.1 * Math.pow(v, 0.5);
  const hr = hc + 5.4;

  // PMV计算 (简化版Fanger方程)
  const metabolicRate = met * 58.2; // W/m²

  // 服装表面温度
  const tcl = 35.7 - 0.028 * metabolicRate - 0.155 * clo *
               (metabolicRate * 3.05 - 0.357 - 0.028 * metabolicRate * 5.36 * (35.7 - 0.028 * metabolicRate - t));

  // PMV简化计算 (使用近似公式)
  const pmv = (0.303 * Math.exp(-0.036 * met) + 0.028) *
              (metabolicRate / 58.2 - 0.055 * met - 0.04 * met * (5.27 + 0.172 * v) * (35.7 - tcl));

  return Math.max(-3, Math.min(3, pmv));
}

/**
 * 计算PPD (预测不满意百分比)
 * @param pmv PMV值
 * @returns PPD百分比 (0-100)
 */
export function calculatePPD(pmv: number): number {
  const exp = Math.exp(0.3034 - 0.036 * pmv + 0.028 * pmv * pmv);
  const ppd = 100 - 95 * Math.exp(-0.03353 * pmv * pmv - 0.2179 * pmv * pmv * pmv * pmv);
  return Math.max(0, Math.min(100, ppd));
}

/**
 * 计算舒适度指标 (PMV/PPD)
 * @param temperature 室内温度 (°C)
 * @param humidity 相对湿度 (%)
 * @param airVelocity 空气流速 (m/s)
 * @param meanRadiantTemp 平均辐射温度 (°C)
 * @param cloValue 服装热阻 (clo)
 * @param metValue 新陈代谢率 (met)
 * @returns 舒适度指标
 */
export function calculateComfortMetrics(
  temperature: number,
  humidity: number,
  airVelocity: number,
  meanRadiantTemp: number,
  cloValue: number = 0.5,
  metValue: number = 1.0
): ComfortMetrics {
  const pmv = calculatePMV(temperature, humidity, airVelocity, meanRadiantTemp, cloValue, metValue);
  const ppd = calculatePPD(pmv);

  // 判断舒适等级
  let comfortLevel: 'comfortable' | 'slightly_cool' | 'slightly_warm' | 'cool' | 'warm' | 'cold' | 'hot';
  if (ppd < 10) comfortLevel = 'comfortable';
  else if (pmv < -1) comfortLevel = pmv < -2 ? 'cold' : 'cool';
  else if (pmv > 1) comfortLevel = pmv > 2 ? 'hot' : 'warm';
  else comfortLevel = 'comfortable';

  return {
    pmv,
    ppd,
    setpointTemperature: temperature,
    humidity,
    airVelocity,
    cloValue,
    metValue,
  };
}

// ============================================================================
// 高级算法 - 电池衰减计算
// ============================================================================

/**
 * 计算电池健康状态
 * @param batteryType 电池类型
 * @param cycles 累计循环次数
 * @param dod 充放电深度 (%)
 * @param temperature 运行温度 (°C)
 * @param age 电池使用年限 (年)
 * @returns 电池健康状态
 */
export function calculateBatteryDegradation(
  batteryType: 'LFP' | 'NCM' | 'LeadAcid',
  cycles: number,
  dod: number,
  temperature: number,
  age: number = 0
): BatteryHealthMetrics {
  // 基础容量衰减率
  let baseDegradationRate: number;
  switch (batteryType) {
    case 'LFP':
      baseDegradationRate = 0.02; // 2% per 1000 cycles
      break;
    case 'NCM':
      baseDegradationRate = 0.03; // 3% per 1000 cycles
      break;
    case 'LeadAcid':
      baseDegradationRate = 0.05; // 5% per 1000 cycles
      break;
    default:
      baseDegradationRate = 0.02;
  }

  // DoD影响 (深度放电加速衰减)
  const dodFactor = Math.pow(dod / 100, 0.5);

  // 温度影响 (25°C为基准)
  const tempFactor = Math.pow(25 / temperature, 2);

  // 年龄影响 (年衰减)
  const ageFactor = age * 0.01; // 每年1%

  // 计算总衰减
  const cycleDegradation = (cycles / 1000) * baseDegradationRate * dodFactor * tempFactor;
  const totalDegradation = Math.min(0.8, cycleDegradation + ageFactor);

  // 计算当前健康度
  const health = Math.max(0.2, 1 - totalDegradation);

  // 计算衰减成本 (简化：每1%衰减成本)
  const degradationCost = totalDegradation * 1000; // 假设初始容量1MWh

  return {
    currentCapacity: health * 100, // 假设初始100kWh
    health: health * 100, // %
    cycleCount: cycles,
    degradationCost,
  };
}

// ============================================================================
// 高级算法 - V2G 优化
// ============================================================================

/**
 * 计算V2G最优调度策略
 * @param v2gDevices V2G设备列表
 * @param priceCurve 24小时电价曲线
 * @param gridDemand 24小时电网需求
 * @returns V2G调度计划
 */
export function calculateV2GOptimization(
  v2gDevices: V2GDevice[],
  priceCurve: number[],
  gridDemand?: number[]
): V2GSchedule[] {
  const schedules: V2GSchedule[] = [];

  for (const device of v2gDevices) {
    const hourlySchedule: Array<{
      hour: number;
      action: 'charge' | 'discharge' | 'idle';
      power: number;
      soc: number;
    }> = [];

    let currentSoc = device.currentSoc;
    let revenue = 0;

    // 分析电价曲线
    const sortedPrices = priceCurve.map((p, i) => ({ price: p, hour: i }))
      .sort((a, b) => a.price - b.price);

    const valleyHours = sortedPrices.slice(0, 6).map(x => x.hour);
    const peakHours = sortedPrices.slice(-6).map(x => x.hour);

    for (let hour = 0; hour < 24; hour++) {
      let action: 'charge' | 'discharge' | 'idle' = 'idle';
      let power = 0;

      // 检查是否在可用时段
      const isAvailable = device.availableHours.some(([start, end]) =>
        hour >= start && hour < end
      );

      if (!isAvailable) {
        // 不在可用时段，保持空闲
        action = 'idle';
        power = 0;
      } else if (valleyHours.includes(hour) && currentSoc < 95) {
        // 谷时充电
        action = 'charge';
        power = Math.min(device.maxPower, (95 - currentSoc) / 100 * device.capacity);
        currentSoc = Math.min(95, currentSoc + power / device.capacity * 100 * 0.95); // 95%充电效率
      } else if (peakHours.includes(hour) && currentSoc > 20 && device.userPriority !== 'high') {
        // 峰时放电
        action = 'discharge';
        power = Math.min(device.maxPower, (currentSoc - 20) / 100 * device.capacity);
        revenue += power * priceCurve[hour] * 0.9; // 90%放电效率
        currentSoc = Math.max(20, currentSoc - power / device.capacity * 100 / 0.9);
      } else {
        action = 'idle';
        power = 0;
      }

      hourlySchedule.push({
        hour,
        action,
        power,
        soc: currentSoc,
      });
    }

    // 减去电池衰减成本
    const degCost = (device.degradationCost || 0.1) * hourlySchedule.filter(s => s.action === 'discharge').length;
    const expectedRevenue = revenue - degCost;

    schedules.push({
      deviceId: device.id,
      hourlySchedule,
      expectedRevenue,
    });
  }

  return schedules;
}

// ============================================================================
// 高级算法 - 数字孪生热建模
// ============================================================================

/**
 * 计算数字孪生建筑热状态
 * @param building 建筑参数
 * @param environmental 环境因素
 * @param twinModel 数字孪生模型
 * @param previousState 上一时刻热状态
 * @param hour 当前小时
 * @returns 当前热状态
 */
export function calculateDigitalTwinThermalModel(
  building: BuildingParams,
  environmental: EnvironmentalFactors,
  twinModel: DigitalTwinModel,
  previousState?: ThermalState,
  hour: number = 0
): ThermalState {
  const thermalCoef = BUILDING_THERMAL_COEFFICIENTS[building.type];
  const thermalMass = building.thermalMass || 100; // kJ/(m²·K)
  const outdoorTemp = environmental.avgTemperature;

  // 初始化上一状态
  const prevIndoorTemp = previousState?.indoorTemperature ?? 22; // 默认22°C
  const prevWallTemp = previousState?.wallTemperature ?? outdoorTemp;

  // 计算热负荷
  // Q = U * A * (Tout - Tin)
  const conductionLoad = thermalCoef * building.area * (outdoorTemp - prevIndoorTemp) / 1000; // kW

  // 太阳辐射热增益
  const solarGain = (environmental.solarIrradiance || 0) * (building.glazingRatio || 0.3) * 0.7 * building.area / 1000; // kW

  // 内部热增益 (设备、人员等，简化)
  const internalHeatGain = 50 * building.area / 1000; // 50 W/m²

  // 总热负荷
  const totalHeatLoad = conductionLoad + solarGain + internalHeatGain;

  // 更新室内温度（热平衡方程简化）
  // Tin_new = Tin_old + (Q * dt) / (m * cp)
  const dt = 1; // 1小时
  const thermalInertia = twinModel.building.thermalInertia; // h
  const indoorTemp = prevIndoorTemp + (totalHeatLoad * dt) / (thermalMass * thermalInertia) * 0.5;

  // 更新墙体温度（墙体响应较慢）
  const wallTemp = prevWallTemp + (outdoorTemp - prevWallTemp) * 0.1;

  // 判断舒适等级
  const comfortLevel = getComfortLevel(indoorTemp);

  return {
    indoorTemperature: indoorTemp,
    wallTemperature: wallTemp,
    thermalLoad: totalHeatLoad,
    comfortLevel,
  };
}

/**
 * 根据温度获取舒适等级
 */
function getComfortLevel(temperature: number): ThermalState['comfortLevel'] {
  if (temperature < 18) return 'cold';
  if (temperature < 20) return 'cool';
  if (temperature < 22) return 'slightly_cool';
  if (temperature <= 24) return 'comfortable';
  if (temperature <= 26) return 'slightly_warm';
  if (temperature <= 28) return 'warm';
  return 'hot';
}

// ============================================================================
// 高级算法 - 强化学习优化框架
// ============================================================================

/**
 * 简化版DQN强化学习优化
 * @param systemParams 系统参数
 * @param rlConfig RL配置
 * @param historicalData 历史数据
 * @returns 训练结果
 */
export function runRLOptimization(
  systemParams: {
    lighting: LightingSystemParams;
    hvac: HVACSystemParams;
    solarStorage: SolarStorageSystemParams;
    building: BuildingParams;
  },
  rlConfig: RLConfig,
  historicalData: HistoricalData[]
): RLTrainingResult {
  // 状态空间定义：24小时负荷、价格、温度
  const stateDim = 24 * 3; // 72维状态

  // 动作空间定义：每小时的调整量 [-10%, 0%, +10%]
  const actionDim = 3;

  // 初始化Q表 (简化版)
  const qTable: Map<string, number[]> = new Map();

  let cumulativeReward = 0;
  let totalLoss = 0;

  // 训练循环
  for (let episode = 0; episode < rlConfig.trainingEpisodes; episode++) {
    let episodeReward = 0;

    // 模拟24小时
    for (let hour = 0; hour < 24; hour++) {
      // 状态编码（简化）
      const stateKey = `${hour}_${Math.floor(historicalData[hour]?.temperature || 20)}`;

      // Q值初始化
      if (!qTable.has(stateKey)) {
        qTable.set(stateKey, [0, 0, 0]);
      }

      // ε-贪婪策略选择动作
      const qValues = qTable.get(stateKey)!;
      const action = Math.random() < rlConfig.explorationRate
        ? Math.floor(Math.random() * actionDim) // 探索
        : qValues.indexOf(Math.max(...qValues)); // 利用

      // 执行动作并计算奖励
      const data = historicalData[hour] || { load: 100, price: 0.6, temperature: 20 };

      // 奖励函数：根据电价和负荷
      const reward = -data.load * data.price * (1 - (action - 1) * 0.1);
      episodeReward += reward;

      // Q值更新 (简化版SARSA)
      const rewardFactor = rlConfig.discountFactor;
      const oldQ = qValues[action];
      const newQ = oldQ + rlConfig.learningRate * (reward + rewardFactor * oldQ - oldQ);
      qValues[action] = newQ;
    }

    cumulativeReward += episodeReward;
    totalLoss += Math.abs(episodeReward);
  }

  // 提取最优策略
  const optimalPolicy: number[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const stateKey = `${hour}_${Math.floor(historicalData[hour]?.temperature || 20)}`;
    const qValues = qTable.get(stateKey) || [0, 0, 0];
    optimalPolicy.push(qValues.indexOf(Math.max(...qValues)));
  }

  return {
    cumulativeReward,
    averageReward: cumulativeReward / rlConfig.trainingEpisodes,
    episodes: rlConfig.trainingEpisodes,
    loss: totalLoss / rlConfig.trainingEpisodes,
    optimalPolicy,
  };
}

// ============================================================================
// Phase 3: 动态电价管理器
// ============================================================================

/**
 * 多模式电价管理器
 * 管理不同电价模式的切换和计算
 */
export class PriceModeManager {
  private configurations: Map<PriceMode, PriceConfiguration>;

  constructor() {
    this.configurations = new Map();
    this.initializeDefaultConfigurations();
  }

  /**
   * 获取指定时间的电价
   * @param mode 电价模式
   * @param timestamp 时间戳
   * @returns 电价（元/kWh）
   */
  getPrice(mode: PriceMode, timestamp: number): number {
    const config = this.configurations.get(mode);
    if (!config) {
      throw new Error(`Price mode ${mode} not configured`);
    }

    const hour = new Date(timestamp).getHours();

    // 固定电价模式
    if (mode === PriceMode.FIXED) {
      return config.basePrice;
    }

    // TOU模式：根据小时匹配时段
    if (mode === PriceMode.TOU_3_SEG || mode === PriceMode.TOU_4_SEG) {
      for (const period of config.periods) {
        if (hour >= period.startHour && hour < period.endHour) {
          return period.price;
        }
      }
      // 默认返回基准电价
      return config.basePrice;
    }

    // 实时动态电价和混合模式：需要外部数据源
    // 暂时使用TOU电价作为fallback
    const period = config.periods.find(p =>
      hour >= p.startHour && hour < p.endHour
    );
    return period?.price || config.basePrice;
  }

  /**
   * 获取24小时电价曲线
   * @param mode 电价模式
   * @param date 日期
   * @returns 24小时电价数组
   */
  get24HourPriceCurve(mode: PriceMode, date?: Date): number[] {
    const baseDate = date || new Date();
    const prices: number[] = [];

    for (let hour = 0; hour < 24; hour++) {
      const timestamp = new Date(baseDate);
      timestamp.setHours(hour, 0, 0, 0);
      prices.push(this.getPrice(mode, timestamp.getTime()));
    }

    return prices;
  }

  /**
   * 初始化默认配置
   */
  private initializeDefaultConfigurations(): void {
    // 三段式TOU
    this.configurations.set(PriceMode.TOU_3_SEG, {
      mode: PriceMode.TOU_3_SEG,
      periods: [
        { type: PricePeriodType.VALLEY, startHour: 0, endHour: 8, price: 0.32, drEligible: false },
        { type: PricePeriodType.FLAT, startHour: 8, endHour: 10, price: 0.65, drEligible: true },
        { type: PricePeriodType.PEAK, startHour: 10, endHour: 12, price: 1.15, drEligible: true },
        { type: PricePeriodType.FLAT, startHour: 12, endHour: 14, price: 1.62, drEligible: true },
        { type: PricePeriodType.PEAK, startHour: 14, endHour: 17, price: 1.15, drEligible: true },
        { type: PricePeriodType.FLAT, startHour: 17, endHour: 22, price: 0.65, drEligible: true },
        { type: PricePeriodType.VALLEY, startHour: 22, endHour: 24, price: 0.32, drEligible: false },
      ],
      basePrice: 0.65,
    });

    // 四段式TOU
    this.configurations.set(PriceMode.TOU_4_SEG, {
      mode: PriceMode.TOU_4_SEG,
      periods: [
        { type: PricePeriodType.VALLEY, startHour: 0, endHour: 8, price: 0.32, drEligible: false },
        { type: PricePeriodType.FLAT, startHour: 8, endHour: 10, price: 0.65, drEligible: true },
        { type: PricePeriodType.PEAK, startHour: 10, endHour: 12, price: 1.15, drEligible: true },
        { type: PricePeriodType.SHARP_PEAK, startHour: 12, endHour: 14, price: 1.62, drEligible: true },
        { type: PricePeriodType.PEAK, startHour: 14, endHour: 17, price: 1.15, drEligible: true },
        { type: PricePeriodType.FLAT, startHour: 17, endHour: 22, price: 0.65, drEligible: true },
        { type: PricePeriodType.VALLEY, startHour: 22, endHour: 24, price: 0.32, drEligible: false },
      ],
      basePrice: 0.65,
    });

    // 固定电价
    this.configurations.set(PriceMode.FIXED, {
      mode: PriceMode.FIXED,
      periods: [
        { type: PricePeriodType.FLAT, startHour: 0, endHour: 24, price: 0.6, drEligible: true },
      ],
      basePrice: 0.6,
    });
  }
}

/**
 * 电价预测模块
 * 提供短期、中期、长期电价预测
 */
export class PriceForecastModule {
  private dataAdapter: PriceDataAdapter;
  private cacheManager: PriceDataCacheManager;

  constructor() {
    this.dataAdapter = new PriceDataAdapter();
    this.cacheManager = new PriceDataCacheManager();
  }

  /**
   * 获取当前电价
   * @param timestamp 时间戳
   * @returns 实时电价数据
   */
  getCurrentPrice(timestamp?: number): RealTimePriceData {
    const now = timestamp || Date.now();
    const cached = this.cacheManager.get('current_price');

    if (cached && Date.now() - cached.cachedAt < 5 * 60 * 1000) {
      return cached.data as RealTimePriceData;
    }

    const data = this.dataAdapter.fetchCurrentPrice();
    this.cacheManager.set('current_price', data, 5 * 60 * 1000);
    return data;
  }

  /**
   * 短期电价预测（1-24小时）
   * @param horizon 预测时长（小时）
   * @returns 预测结果
   */
  async forecastShortTerm(horizon: number = 24): Promise<PriceForecastResult> {
    const cacheKey = `short_term_${horizon}`;
    const cached = this.cacheManager.get(cacheKey);

    if (cached && Date.now() - cached.cachedAt < 15 * 60 * 1000) {
      return cached.data as PriceForecastResult;
    }

    const prices = await this.dataAdapter.fetchForecast(horizon);
    const result = this.analyzeForecast(prices);
    this.cacheManager.set(cacheKey, result, 15 * 60 * 1000);
    return result;
  }

  /**
   * 中期电价预测（1-7天）
   * @param days 预测天数
   * @returns 预测结果
   */
  async forecastMediumTerm(days: number = 7): Promise<PriceForecastResult> {
    const horizon = days * 24;
    const cacheKey = `medium_term_${days}`;
    const cached = this.cacheManager.get(cacheKey);

    if (cached && Date.now() - cached.cachedAt < 4 * 60 * 60 * 1000) {
      return cached.data as PriceForecastResult;
    }

    const prices = await this.dataAdapter.fetchForecast(horizon);
    const result = this.analyzeForecast(prices);
    this.cacheManager.set(cacheKey, result, 4 * 60 * 60 * 1000);
    return result;
  }

  /**
   * 长期趋势分析（1-12个月）
   * @param months 分析月数
   * @returns 趋势分析结果
   */
  async analyzeLongTermTrend(months: number = 12): Promise<{
    trend: 'rising' | 'falling' | 'stable';
    monthlyAverage: number[];
    seasonalPattern: number[];
    predictionConfidence: number;
  }> {
    const historicalData = await this.dataAdapter.fetchHistoricalData(months * 30);

    // 简单线性回归分析趋势
    const n = historicalData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    historicalData.forEach((d, i) => {
      sumX += i;
      sumY += d.price;
      sumXY += i * d.price;
      sumX2 += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const trend = slope > 0.01 ? 'rising' : slope < -0.01 ? 'falling' : 'stable';

    // 计算月度平均
    const monthlyAverage = this.calculateMonthlyAverage(historicalData);

    // 分析季节性模式
    const seasonalPattern = this.analyzeSeasonalPattern(historicalData);

    return {
      trend,
      monthlyAverage,
      seasonalPattern,
      predictionConfidence: 0.75, // 简化值
    };
  }

  /**
   * 分析预测结果
   */
  private analyzeForecast(prices: RealTimePriceData[]): PriceForecastResult {
    const priceValues = prices.map(p => p.price);
    const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const maxPrice = Math.max(...priceValues);
    const minPrice = Math.min(...priceValues);
    const priceSpread = maxPrice - minPrice;

    // 计算预测精度（基于价格变化率）
    const priceChanges = priceValues.slice(1).map((p, i) => Math.abs(p - priceValues[i]));
    const avgChange = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
    const accuracy = Math.max(0, 1 - avgChange / avgPrice);

    return {
      timeRange: {
        start: new Date(prices[0].timestamp),
        end: new Date(prices[prices.length - 1].timestamp),
      },
      prices,
      avgPrice,
      maxPrice,
      minPrice,
      priceSpread,
      accuracy,
    };
  }

  /**
   * 计算月度平均
   */
  private calculateMonthlyAverage(data: Array<{ timestamp: number; price: number }>): number[] {
    const monthly: Map<number, number[]> = new Map();

    data.forEach(d => {
      const month = new Date(d.timestamp).getMonth();
      if (!monthly.has(month)) monthly.set(month, []);
      monthly.get(month)!.push(d.price);
    });

    return Array.from(monthly.values()).map(prices =>
      prices.reduce((a, b) => a + b, 0) / prices.length
    );
  }

  /**
   * 分析季节性模式
   */
  private analyzeSeasonalPattern(data: Array<{ timestamp: number; price: number }>): number[] {
    const hourly: Map<number, number[]> = new Map();

    data.forEach(d => {
      const hour = new Date(d.timestamp).getHours();
      if (!hourly.has(hour)) hourly.set(hour, []);
      hourly.get(hour)!.push(d.price);
    });

    return Array.from({ length: 24 }, (_, i) => {
      const prices = hourly.get(i) || [];
      return prices.length > 0
        ? prices.reduce((a, b) => a + b, 0) / prices.length
        : 0;
    });
  }
}

/**
 * 电价数据适配器
 * 同时支持模拟数据和真实API
 */
export class PriceDataAdapter {
  private sourceConfig: PriceDataSource;
  private fallbackToSimulated: boolean;

  constructor(config?: Partial<{
    source: PriceDataSource;
    apiEndpoint: string;
    apiKey: string;
    cacheValidity: number;
    fallbackToSimulated: boolean;
  }>) {
    this.sourceConfig = {
      source: PriceDataSource.SIMULATED,
      apiEndpoint: '',
      apiKey: '',
      cacheValidity: 15 * 60 * 1000,
      fallbackToSimulated: true,
      ...config,
    };
    this.fallbackToSimulated = this.sourceConfig.fallbackToSimulated ?? true;
  }

  /**
   * 获取当前电价
   */
  async fetchCurrentPrice(): Promise<RealTimePriceData> {
    if (this.sourceConfig.source === PriceDataSource.SIMULATED) {
      return this.generateSimulatedPrice(Date.now());
    }

    try {
      // 真实API调用（预留接口）
      const response = await fetch(this.sourceConfig.apiEndpoint || '/api/prices/current', {
        headers: {
          'Authorization': `Bearer ${this.sourceConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return this.transformAPIResponse(data);
    } catch (error) {
      console.error('Failed to fetch real-time price:', error);

      if (this.fallbackToSimulated) {
        return this.generateSimulatedPrice(Date.now());
      }

      throw error;
    }
  }

  /**
   * 获取预测电价
   * @param horizon 预测时长
   * @returns 预测电价数组
   */
  async fetchForecast(horizon: number): Promise<RealTimePriceData[]> {
    if (this.sourceConfig.source === PriceDataSource.SIMULATED) {
      return this.generateSimulatedForecast(horizon);
    }

    try {
      const response = await fetch(
        `${this.sourceConfig.apiEndpoint}/forecast?hours=${horizon}`,
        {
          headers: {
            'Authorization': `Bearer ${this.sourceConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.map((p: any) => this.transformAPIResponse(p));
    } catch (error) {
      console.error('Failed to fetch forecast:', error);

      if (this.fallbackToSimulated) {
        return this.generateSimulatedForecast(horizon);
      }

      throw error;
    }
  }

  /**
   * 获取历史电价数据
   * @param days 天数
   * @returns 历史电价数据
   */
  async fetchHistoricalData(days: number): Promise<Array<{ timestamp: number; price: number }>> {
    if (this.sourceConfig.source === PriceDataSource.SIMULATED) {
      return this.generateSimulatedHistory(days);
    }

    try {
      const response = await fetch(
        `${this.sourceConfig.apiEndpoint}/historical?days=${days}`,
        {
          headers: {
            'Authorization': `Bearer ${this.sourceConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch historical data:', error);

      if (this.fallbackToSimulated) {
        return this.generateSimulatedHistory(days);
      }

      throw error;
    }
  }

  /**
   * 生成模拟电价数据
   */
  private generateSimulatedPrice(timestamp: number): RealTimePriceData {
    const hour = new Date(timestamp).getHours();
    const priceManager = new PriceModeManager();
    const prices = priceManager.get24HourPriceCurve(PriceMode.TOU_3_SEG);
    const price = prices[hour];

    return {
      timestamp,
      price,
      confidence: 0.85,
      trend: Math.random() > 0.5 ? 'stable' : (Math.random() > 0.5 ? 'rising' : 'falling'),
      isPeak: price > 1.0,
      drAvailable: price > 0.8,
    };
  }

  /**
   * 生成模拟预测数据
   */
  private generateSimulatedForecast(horizon: number): RealTimePriceData[] {
    const forecast: RealTimePriceData[] = [];
    const now = Date.now();

    for (let i = 0; i < horizon; i++) {
      const timestamp = now + i * 60 * 60 * 1000;
      forecast.push(this.generateSimulatedPrice(timestamp));
    }

    return forecast;
  }

  /**
   * 生成模拟历史数据
   */
  private generateSimulatedHistory(days: number): Array<{ timestamp: number; price: number }> {
    const history: Array<{ timestamp: number; price: number }>([]);
    const now = Date.now();

    for (let i = 0; i < days * 24; i++) {
      const timestamp = now - (days * 24 - i) * 60 * 60 * 1000;
      const priceData = this.generateSimulatedPrice(timestamp);
      history.push({
        timestamp,
        price: priceData.price,
      });
    }

    return history;
  }

  /**
   * 转换API响应
   */
  private transformAPIResponse(data: any): RealTimePriceData {
    return {
      timestamp: data.timestamp || Date.now(),
      price: data.price || 0.5,
      confidence: data.confidence || 0.8,
      trend: data.trend || 'stable',
      isPeak: data.isPeak || false,
      drAvailable: data.drAvailable !== undefined ? data.drAvailable : true,
    };
  }
}

/**
 * 电价数据缓存管理器
 */
export class PriceDataCacheManager {
  private cache: Map<string, any>;

  constructor() {
    this.cache = new Map();
    // 定期清理过期缓存
    setInterval(() => this.clearExpired(), 60 * 1000); // 每分钟清理一次
  }

  /**
   * 获取缓存
   */
  get(key: string): any {
    return this.cache.get(key);
  }

  /**
   * 设置缓存
   */
  set(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * 清除过期缓存
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 清除所有缓存
   */
  clearAll(): void {
    this.cache.clear();
  }
}
