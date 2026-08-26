export const FACTORY_LOAD_PROFILE = [0.42, 0.38, 0.35, 0.34, 0.36, 0.44, 0.58, 0.72, 0.86, 0.94, 1, 0.96, 0.88, 0.84, 0.92, 1, 0.98, 0.9, 0.82, 0.76, 0.68, 0.58, 0.5, 0.45];

/**
 * 商业办公典型日负荷：营业前仅保留安防、机房和基础设备负荷，
 * 8:00 后随营业和空调逐步升高，晚间 22:00 后回落到低基荷。
 * 光伏消纳必须按此时序与发电曲线匹配，不能把全年电量视为全天均匀用电。
 */
export const COMMERCIAL_LOAD_PROFILE = [
  0.05, 0.04, 0.04, 0.04, 0.04, 0.05,
  0.08, 0.20, 0.55, 0.82, 0.95, 1.00,
  0.95, 0.92, 0.90, 0.88, 0.82, 0.68,
  0.52, 0.36, 0.22, 0.15, 0.10, 0.07,
];

export const RESTAURANT_LOAD_PROFILE = [
  0.20, 0.18, 0.17, 0.16, 0.16, 0.18,
  0.24, 0.34, 0.46, 0.58, 0.76, 0.96,
  1.00, 0.88, 0.62, 0.46, 0.52, 0.72,
  0.94, 1.00, 0.92, 0.72, 0.46, 0.28,
];

/** 学校园区典型日负荷：教学时段较高，夜间仅保留宿舍、安防和基础设施负荷。 */
export const SCHOOL_LOAD_PROFILE = [
  0.30, 0.22, 0.20, 0.20, 0.22, 0.32,
  0.55, 0.78, 0.92, 1.00, 1.00, 0.92,
  0.72, 0.62, 0.62, 0.78, 0.90, 0.88,
  0.72, 0.58, 0.46, 0.38, 0.32, 0.28,
];

/**
 * 别墅户用典型日负荷：早晨起居形成小高峰，工作日白天维持冰箱、
 * 安防、热水循环等基荷，晚间空调、照明、炊事和家电形成主高峰。
 */
export const VILLA_RESIDENTIAL_LOAD_PROFILE = [
  0.30, 0.25, 0.21, 0.19, 0.19, 0.27,
  0.52, 0.78, 0.70, 0.46, 0.37, 0.34,
  0.38, 0.36, 0.34, 0.36, 0.44, 0.62,
  0.84, 1.00, 0.94, 0.76, 0.55, 0.39,
];

/** 夏季全天空调运行场景：压缩白天低谷，并显著抬高夜间连续制冷基荷。 */
export const VILLA_SUMMER_AC_LOAD_PROFILE = [
  0.56, 0.52, 0.49, 0.47, 0.47, 0.53,
  0.69, 0.88, 0.83, 0.70, 0.66, 0.64,
  0.68, 0.66, 0.64, 0.66, 0.72, 0.83,
  0.95, 1.00, 0.98, 0.89, 0.74, 0.62,
];

/** 全年模型按8个月普通季、4个月全天空调季加权。 */
export const VILLA_ANNUAL_WEIGHTED_LOAD_PROFILE = VILLA_RESIDENTIAL_LOAD_PROFILE.map(
  (value, hour) => value * (8 / 12) + VILLA_SUMMER_AC_LOAD_PROFILE[hour] * (4 / 12),
);

export const getProjectLoadProfile = (projectType?: string): number[] => (
  projectType === 'restaurant'
    ? RESTAURANT_LOAD_PROFILE
    : projectType === 'school'
      ? SCHOOL_LOAD_PROFILE
    : projectType === 'villa'
      ? VILLA_ANNUAL_WEIGHTED_LOAD_PROFILE
      : projectType === 'office' || projectType === 'commercial'
        ? COMMERCIAL_LOAD_PROFILE
        : FACTORY_LOAD_PROFILE
);

export const getProjectTypeLabel = (projectType?: string): string => {
  if (projectType === 'factory') return '工业厂房';
  if (projectType === 'school') return '学校园区';
  if (projectType === 'office' || projectType === 'commercial') return '商业办公';
  if (projectType === 'restaurant') return '饭店酒楼';
  if (projectType === 'villa') return '别墅户用';
  return '公共建筑';
};

export const estimateVillaAnnualLoadKwh = (
  totalAreaM2: number,
  hasAirConditioning = true,
  isSouthernRegion = false,
): number => {
  const area = Math.max(0, Number(totalAreaM2) || 0);
  const baseEui = hasAirConditioning ? 58 : 42;
  const climateFactor = hasAirConditioning && isSouthernRegion ? 1.12 : 1;
  return Math.max(6000, area * baseEui * climateFactor);
};
