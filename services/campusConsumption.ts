/**
 * 校园光伏消纳率预估服务
 * 考虑学校类型、储能配置、空调系统、季节因素、节假日等
 */

// ==================== 类型定义 ====================

export type SchoolType = 'primary_middle' | 'high_school' | 'university' | 'vocational' | 'training';

export interface CampusConsumptionParams {
  /** 学校类型 */
  schoolType: SchoolType;
  /** 光伏容量 */
  pvCapacity: number;
  /** 储能容量 */
  storageCapacity: number;
  /** 是否有空调系统 */
  hasAirConditioning: boolean;
  /** 季节权重（春、夏、秋、冬） */
  seasonWeights?: {
    spring: number;
    summer: number;
    autumn: number;
    winter: number;
  };
  /** 地区（用于调整寒暑假天数） */
  region?: 'north' | 'south' | 'central';
  /** 是否考虑周末影响 */
  considerWeekends?: boolean;
  /** 是否考虑寒暑假影响 */
  considerVacations?: boolean;
}

export interface ConsumptionResult {
  /** 预估消纳率 */
  consumptionRate: number;
  /** 季节消纳率详情 */
  seasonalRates: {
    spring: number;
    summer: number;
    autumn: number;
    winter: number;
  };
  /** 考虑周末后的消纳率 */
  weekendAdjustedRate: number;
  /** 考虑寒暑假后的消纳率 */
  vacationAdjustedRate: number;
  /** 最终推荐消纳率 */
  recommendedRate: number;
  /** 计算说明 */
  explanation: string[];
}

// ==================== 学校类型基础数据 ====================

/**
 * 各学校类型的基础消纳率和特征
 */
const SCHOOL_BASE_DATA: Record<SchoolType, {
  /** 基础消纳率 */
  baseRate: number;
  /** 白天活动集中度（越高，消纳率越高） */
  dayActivityLevel: number;
  /** 负荷稳定性 */
  loadStability: number;
  /** 说明 */
  description: string;
}> = {
  primary_middle: {
    baseRate: 0.68,
    dayActivityLevel: 0.9,
    loadStability: 0.85,
    description: '中小学：白天教学活动集中，与光伏发电时段高度匹配'
  },
  high_school: {
    baseRate: 0.64,
    dayActivityLevel: 0.85,
    loadStability: 0.8,
    description: '高中：教学活动白天集中，下午活动较多'
  },
  university: {
    baseRate: 0.55,
    dayActivityLevel: 0.7,
    loadStability: 0.65,
    description: '大学：校园面积大，宿舍夜间负荷，消纳率中等'
  },
  vocational: {
    baseRate: 0.60,
    dayActivityLevel: 0.8,
    loadStability: 0.75,
    description: '职业院校：实训设备白天运行，与光伏匹配'
  },
  training: {
    baseRate: 0.72,
    dayActivityLevel: 0.95,
    loadStability: 0.9,
    description: '培训机构：白天集中授课，负荷匹配度最高'
  }
};

// ==================== 节假日数据 ====================

/**
 * 各学校类型的寒暑假天数（按地区）
 */
const VACATION_DAYS: Record<SchoolType, {
  /** 北方地区（冬假较长） */
  north: number;
  /** 南方地区（寒假较短） */
  south: number;
  /** 中部地区 */
  central: number;
}> = {
  primary_middle: {
    north: 70,    // 寒假45天 + 暑假25天
    south: 60,    // 寒假30天 + 暑假30天
    central: 65
  },
  high_school: {
    north: 70,
    south: 60,
    central: 65
  },
  university: {
    north: 90,    // 寒假45天 + 暑假45天
    south: 80,    // 寒假35天 + 暑假45天
    central: 85
  },
  vocational: {
    north: 75,    // 职业学校实习期较长
    south: 65,
    central: 70
  },
  training: {
    north: 40,    // 培训机构主要周末和法定节假日
    south: 35,
    central: 38
  }
};

/**
 * 法定节假日天数（每年）
 */
const STATUTORY_HOLIDAY_DAYS = 11;

/**
 * 周末天数（每年52周 × 2天 = 104天）
 */
const WEEKEND_DAYS = 104;

// ==================== 典型日负荷曲线 ====================

/**
 * 各学校类型的典型24小时负荷系数（归一化，1为日平均负荷）
 */
const HOURLY_LOAD_PROFILE: Record<SchoolType, number[]> = {
  primary_middle: [
    0.3, 0.2, 0.2, 0.2,  // 0-3点 夜间基础
    0.2, 0.3, 0.5, 0.7,  // 4-7点 起床、早餐
    0.9, 1.0, 1.0, 0.9,  // 8-11点 上课高峰
    0.7, 0.6, 0.6,         // 12-14点 午餐、休息
    0.9, 0.9, 0.9, 0.8,  // 14-18点 下午上课
    0.6, 0.4, 0.3,          // 19-21点 晚自习
    0.3, 0.2, 0.2            // 22-24点 夜间休息
  ],
  high_school: [
    0.3, 0.2, 0.2, 0.2,
    0.2, 0.3, 0.6, 0.8,
    1.0, 1.0, 1.0, 0.9,
    0.7, 0.6, 0.5,
    0.9, 0.9, 0.9, 0.8,
    0.7, 0.5, 0.4,
    0.3, 0.2, 0.2
  ],
  university: [
    0.5, 0.4, 0.3, 0.3,  // 宿舍夜间负荷较高
    0.3, 0.5, 0.7, 0.9,
    0.9, 0.9, 0.8, 0.8,
    0.7, 0.6, 0.6,
    0.8, 0.8, 0.8, 0.7,
    0.7, 0.6, 0.5,          // 食堂、图书馆开放
    0.5, 0.4, 0.4            // 宿舍负荷
  ],
  vocational: [
    0.3, 0.2, 0.2, 0.2,
    0.2, 0.4, 0.7, 0.9,
    1.0, 1.0, 0.9, 0.9,
    0.7, 0.6, 0.6,
    0.9, 0.9, 0.9, 0.8,  // 实训设备运行
    0.6, 0.4, 0.3,
    0.3, 0.2, 0.2
  ],
  training: [
    0.2, 0.2, 0.2, 0.2,
    0.2, 0.3, 0.8, 1.0,
    1.0, 1.0, 1.0, 0.8,
    0.6, 0.6, 0.6,
    1.0, 1.0, 1.0, 1.0,  // 全天培训
    0.8, 0.6, 0.4,
    0.2, 0.2, 0.2
  ]
};

/**
 * 光伏典型24小时发电系数（归一化）
 * 假设晴天条件，日照时段：6-18点
 */
const HOURLY_PV_PROFILE = [
  0, 0, 0, 0, 0, 0,       // 0-5点 无发电
  0.05, 0.15, 0.30, 0.45,  // 6-9点
  0.65, 0.80, 0.95, 0.90,  // 10-13点 峰值
  0.80, 0.65, 0.45, 0.25,  // 14-17点
  0.10, 0.02, 0            // 18-20点 傍晚微弱
];

// ==================== 核心计算函数 ====================

/**
 * 计算基础消纳率（基于学校类型和储能配置）
 */
function calculateBaseRate(params: CampusConsumptionParams): number {
  const { schoolType, storageCapacity, pvCapacity, hasAirConditioning } = params;

  const schoolData = SCHOOL_BASE_DATA[schoolType];

  // 1. 基础消纳率
  let rate = schoolData.baseRate;

  // 2. 储能修正（储容比每增加1，消纳率提高8-15%）
  const storageToPvRatio = storageCapacity / pvCapacity;
  const storageBonus = Math.min(0.25, storageToPvRatio * 0.12);
  rate += storageBonus;

  // 3. 空调修正（有空调时夏季消纳率更高）
  const acBonus = hasAirConditioning ? 0.10 : 0;
  rate += acBonus;

  return Math.min(0.95, rate);
}

/**
 * 计算季节消纳率
 */
function calculateSeasonalRates(params: CampusConsumptionParams, baseRate: number): {
  spring: number;
  summer: number;
  autumn: number;
  winter: number;
} {
  const { schoolType, hasAirConditioning, storageCapacity, pvCapacity } = params;

  const schoolData = SCHOOL_BASE_DATA[schoolType];

  // 季节负荷调整系数
  const seasonalFactors = {
    spring: 1.0,   // 气温适中
    summer: 1.15,  // 空调高峰
    autumn: 1.08,  // 气温适中，教学正常
    winter: 0.85    // 日照弱，负荷相对稳定
  };

  // 空调增强夏季消纳
  const acEnhancement = hasAirConditioning ? {
    spring: 0.02,
    summer: 0.08,
    autumn: 0.04,
    winter: 0
  } : { spring: 0, summer: 0, autumn: 0, winter: 0 };

  // 储能季节效应（夏季储能利用率更高）
  const storageToPvRatio = storageCapacity / pvCapacity;
  const storageSeasonalBonus = {
    spring: storageToPvRatio * 0.03,
    summer: storageToPvRatio * 0.06,
    autumn: storageToPvRatio * 0.05,
    winter: storageToPvRatio * 0.02
  };

  // 学校类型季节特征
  const schoolSeasonalAdjustment = {
    spring: 0,
    summer: schoolType === 'primary_middle' || schoolType === 'high_school' ? 0.05 : 0,
    autumn: 0,
    winter: schoolType === 'university' ? -0.05 : -0.02  // 冬季日照弱，大学消纳率略降
  };

  // 计算各季节消纳率
  const calculateSeasonRate = (base: number, factor: number, ac: number, storage: number, school: number): number => {
    const adjusted = base * factor + ac + storage + school;
    return Math.min(0.95, Math.max(0.3, adjusted));
  };

  return {
    spring: calculateSeasonRate(baseRate, seasonalFactors.spring, acEnhancement.spring, storageSeasonalBonus.spring, schoolSeasonalAdjustment.spring),
    summer: calculateSeasonRate(baseRate, seasonalFactors.summer, acEnhancement.summer, storageSeasonalBonus.summer, schoolSeasonalAdjustment.summer),
    autumn: calculateSeasonRate(baseRate, seasonalFactors.autumn, acEnhancement.autumn, storageSeasonalBonus.autumn, schoolSeasonalAdjustment.autumn),
    winter: calculateSeasonRate(baseRate, seasonalFactors.winter, acEnhancement.winter, storageSeasonalBonus.winter, schoolSeasonalAdjustment.winter)
  };
}

/**
 * 计算考虑周末的消纳率
 */
function calculateWeekendAdjustedRate(
  baseRate: number,
  schoolType: SchoolType,
  storageCapacity: number,
  pvCapacity: number
): number {
  // 周末负荷系数（不同学校类型周末活动程度不同）
  const weekendLoadFactor: Record<SchoolType, number> = {
    primary_middle: 0.25,   // 周末几乎无活动
    high_school: 0.30,      // 部分补习、社团
    university: 0.50,       // 宿舍、图书馆开放
    vocational: 0.35,       // 实训室关闭
    training: 0.60         // 部分周末培训
  };

  // 周末光伏发电系数（周六日仍有发电）
  const weekendPvFactor = 0.7;  // 周末发电约为工作日的70%

  // 计算周末影响
  const workingDays = 365 - WEEKEND_DAYS - STATUTORY_HOLIDAY_DAYS;
  const weekendDays = WEEKEND_DAYS;

  // 工作日消纳
  const workingDayRate = baseRate;

  // 周末消纳（考虑储能）
  const storageRatio = storageCapacity / pvCapacity;
  const weekendRate = weekendLoadFactor[schoolType] * (0.3 + storageRatio * 0.4) * weekendPvFactor;

  // 加权平均
  const adjustedRate = (
    (workingDayRate * workingDays + weekendRate * weekendDays) / 365
  );

  return Math.min(0.95, adjustedRate);
}

/**
 * 计算考虑寒暑假的消纳率
 */
function calculateVacationAdjustedRate(
  baseRate: number,
  schoolType: SchoolType,
  region: 'north' | 'south' | 'central'
): number {
  const vacationDays = VACATION_DAYS[schoolType][region];
  const workingDays = 365 - vacationDays - STATUTORY_HOLIDAY_DAYS;

  // 寒暑假期间消纳率（仅基础负荷）
  const vacationRate = 0.25;  // 仅保安、基础照明

  // 加权平均
  const adjustedRate = (
    (baseRate * workingDays + vacationRate * vacationDays) / 365
  );

  return Math.min(0.95, adjustedRate);
}

/**
 * 使用典型日负荷曲线计算消纳率（可选精确计算）
 */
function calculateByLoadProfile(
  schoolType: SchoolType,
  storageCapacity: number,
  pvCapacity: number
): number {
  const loadProfile = HOURLY_LOAD_PROFILE[schoolType];
  const pvProfile = HOURLY_PV_PROFILE;

  let totalGeneration = 0;
  let totalSelfConsumed = 0;
  let currentStorage = 0;
  const maxStorage = storageCapacity / 24;  // 储能功率（按小时）

  for (let hour = 0; hour < 24; hour++) {
    const pv = pvProfile[hour] * pvCapacity;  // 当时光伏功率
    const load = loadProfile[hour] * 0.5 * pvCapacity;  // 负荷按光伏容量比例

    totalGeneration += pv;

    if (pv >= load) {
      // 发电大于负荷
      const excess = pv - load;
      const canStore = Math.min(excess, maxStorage - currentStorage);
      currentStorage += canStore;
      totalSelfConsumed += load;
    } else {
      // 发电不足
      const shortage = load - pv;
      const canDischarge = Math.min(shortage, currentStorage);
      currentStorage -= canDischarge;
      totalSelfConsumed += pv + canDischarge;
    }
  }

  return totalSelfConsumed / totalGeneration;
}

// ==================== 主函数 ====================

/**
 * 计算校园光伏消纳率（综合方法）
 */
export function calculateCampusConsumptionRate(params: CampusConsumptionParams): ConsumptionResult {
  const {
    schoolType,
    pvCapacity,
    storageCapacity,
    hasAirConditioning,
    seasonWeights = { spring: 0.25, summer: 0.35, autumn: 0.25, winter: 0.15 },
    region = 'central',
    considerWeekends = true,
    considerVacations = true
  } = params;

  const explanation: string[] = [];

  // 1. 获取学校基础数据
  const schoolData = SCHOOL_BASE_DATA[schoolType];
  explanation.push(schoolData.description);

  // 2. 计算基础消纳率
  const baseRate = calculateBaseRate(params);
  explanation.push(`基础消纳率: ${(baseRate * 100).toFixed(1)}%（基于学校类型和储能配置）`);

  // 3. 计算季节消纳率
  const seasonalRates = calculateSeasonalRates(params, baseRate);
  explanation.push(`季节消纳率：春 ${(seasonalRates.spring * 100).toFixed(1)}%，夏 ${(seasonalRates.summer * 100).toFixed(1)}%，秋 ${(seasonalRates.autumn * 100).toFixed(1)}%，冬 ${(seasonalRates.winter * 100).toFixed(1)}%`);

  // 4. 加权季节平均
  const weightedSeasonalRate =
    seasonalRates.spring * seasonWeights.spring +
    seasonalRates.summer * seasonWeights.summer +
    seasonalRates.autumn * seasonWeights.autumn +
    seasonalRates.winter * seasonWeights.winter;
  explanation.push(`季节加权平均: ${(weightedSeasonalRate * 100).toFixed(1)}%`);

  // 5. 考虑周末
  let weekendAdjustedRate = weightedSeasonalRate;
  if (considerWeekends) {
    weekendAdjustedRate = calculateWeekendAdjustedRate(weightedSeasonalRate, schoolType, storageCapacity, pvCapacity);
    const weekendReduction = (weightedSeasonalRate - weekendAdjustedRate) * 100;
    explanation.push(`考虑周末影响: -${weekendReduction.toFixed(1)}% (周末${WEEKEND_DAYS}天，负荷降低)`);
  }

  // 6. 考虑寒暑假
  let vacationAdjustedRate = weekendAdjustedRate;
  if (considerVacations) {
    vacationAdjustedRate = calculateVacationAdjustedRate(weekendAdjustedRate, schoolType, region);
    const vacationDays = VACATION_DAYS[schoolType][region];
    const vacationReduction = (weekendAdjustedRate - vacationAdjustedRate) * 100;
    explanation.push(`考虑寒暑假影响: -${vacationReduction.toFixed(1)}% (${vacationDays}天假期)`);
  }

  // 7. 储容比说明
  const storageToPvRatio = (storageCapacity / pvCapacity).toFixed(2);
  explanation.push(`储容比: ${storageToPvRatio}（储能容量/光伏容量）`);

  // 8. 空调说明
  if (hasAirConditioning) {
    explanation.push(`有空调系统: 夏季消纳率提高约8%`);
  }

  // 9. 最终推荐消纳率（使用典型日曲线验证）
  const curveVerifiedRate = calculateByLoadProfile(schoolType, storageCapacity, pvCapacity);
  const recommendedRate = Math.min(vacationAdjustedRate, curveVerifiedRate);

  explanation.push(`典型日曲线验证: ${(curveVerifiedRate * 100).toFixed(1)}%`);

  return {
    consumptionRate: Math.round(vacationAdjustedRate * 10000) / 100,
    seasonalRates,
    weekendAdjustedRate: Math.round(weekendAdjustedRate * 10000) / 100,
    vacationAdjustedRate: Math.round(vacationAdjustedRate * 10000) / 100,
    recommendedRate: Math.round(recommendedRate * 10000) / 100,
    explanation
  };
}

/**
 * 快速估算消纳率（简化版本）
 */
export function quickEstimateConsumptionRate(
  schoolType: SchoolType,
  pvCapacity: number,
  storageCapacity: number
): number {
  const schoolData = SCHOOL_BASE_DATA[schoolType];
  let rate = schoolData.baseRate;

  // 储容比修正
  const storageBonus = Math.min(0.2, (storageCapacity / pvCapacity) * 0.1);
  rate += storageBonus;

  // 周末和假期折减（粗略估计）
  rate *= 0.85;

  return Math.round(rate * 10000) / 100;
}

/**
 * 获取学校类型显示名称
 */
export function getSchoolTypeName(type: SchoolType): string {
  const names: Record<SchoolType, string> = {
    primary_middle: '小学/初中',
    high_school: '高中',
    university: '大学',
    vocational: '职业院校',
    training: '培训机构'
  };
  return names[type];
}

/**
 * 获取学校类型列表
 */
export function getSchoolTypes(): { value: SchoolType; label: string; description: string }[] {
  return Object.entries(SCHOOL_BASE_DATA).map(([type, data]) => ({
    value: type as SchoolType,
    label: getSchoolTypeName(type as SchoolType),
    description: data.description
  }));
}
