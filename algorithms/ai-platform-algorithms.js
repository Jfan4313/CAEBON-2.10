"use strict";
/**
 * AI 管理平台算法定义
 *
 * 涵盖照明、空调整、光储系统的智能优化算法
 * 考虑动态电价、天气、人流量、光照度、建筑热导系数等因素
 *
 * @author ZeroCarbon Team
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOLAR_IRRADIANCE_LEVELS = exports.TIME_PERIODS = exports.SEASONAL_FACTORS = exports.SOLAR_STORAGE_PERFORMANCE = exports.HVAC_EFFICIENCY_PARAMS = exports.LIGHTING_EFFICIENCY_BASELINE = exports.BUILDING_THERMAL_COEFFICIENTS = exports.CITY_SUNSHINE_DATA = void 0;
exports.calculateLightingBaseline = calculateLightingBaseline;
exports.calculateLightingSavings = calculateLightingSavings;
exports.calculateHVACBaseline = calculateHVACBaseline;
exports.calculateHVACSavings = calculateHVACSavings;
exports.calculateSolarGeneration = calculateSolarGeneration;
exports.calculateStorageOptimization = calculateStorageOptimization;
exports.calculateIntegratedOptimization = calculateIntegratedOptimization;
exports.getCitySunshineData = getCitySunshineData;
exports.generateDefaultPriceCurve = generateDefaultPriceCurve;
exports.generateDefaultTrafficPattern = generateDefaultTrafficPattern;
exports.calculatePMV = calculatePMV;
exports.calculatePPD = calculatePPD;
exports.calculateComfortMetrics = calculateComfortMetrics;
exports.calculateBatteryDegradation = calculateBatteryDegradation;
exports.calculateV2GOptimization = calculateV2GOptimization;
exports.calculateDigitalTwinThermalModel = calculateDigitalTwinThermalModel;
exports.runRLOptimization = runRLOptimization;
// ============================================================================
// 城础数据
// ============================================================================
/**
 * 中国主要城市平均年日照时数
 */
exports.CITY_SUNSHINE_DATA = {
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
exports.BUILDING_THERMAL_COEFFICIENTS = {
    factory: 2.5, // 标准工厂墙体
    school: 2.0, // 学校教室结构
    office: 2.8, // 办公建筑
    hospital: 1.5, // 医院保温较好
    mall: 1.8, // 商场玻璃较多
};
/**
 * 照明系统节能效率基准值
 */
exports.LIGHTING_EFFICIENCY_BASELINE = {
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
exports.HVAC_EFFICIENCY_PARAMS = {
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
exports.SOLAR_STORAGE_PERFORMANCE = {
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
exports.SEASONAL_FACTORS = {
    /** 春季（3-5月） */
    spring: {
        loadMultiplier: 0.9, // 负荷降低
        hvacLoadMultiplier: 1.1, // 空调负荷增加
        lightingLoadMultiplier: 1.05, // 照明负荷增加
    },
    /** 夏季（6-8月） */
    summer: {
        loadMultiplier: 1.2, // 负荷最高
        hvacLoadMultiplier: 1.4, // 空调负荷最高
        lightingLoadMultiplier: 1.1, // 照明负荷增加
        pvEfficiencyMultiplier: 0.95, // 光伏效率下降
    },
    /** 秋季（9-11月） */
    autumn: {
        loadMultiplier: 1.0, // 负荷正常
        hvacLoadMultiplier: 1.1, // 空调负荷正常
        lightingLoadMultiplier: 0.95, // 照明负荷降低
    },
    /** 冬季（12-2月） */
    winter: {
        loadMultiplier: 0.8, // 负荷最低
        hvacLoadMultiplier: 0.85, // 空调负荷降低
        lightingLoadMultiplier: 0.9, // 照明负荷增加
    },
};
/**
 * 时间段定义
 */
exports.TIME_PERIODS = {
    /** 谷时段（如 8:00-22:00） */
    valley: { start: 0, end: 8, name: '谷' },
    /** 平时段（如 22:00-6:00） */
    flat: { start: 8, end: 14, name: '平' },
    /** 峰时段（如 8:00-11:00） */
    peak: { start: 8, end: 11, name: '峰' },
    /** 尖峰时段（如 19:00-21:00） */
    sharpPeak: { start: 19, end: 21, name: '尖峰' },
};
/**
 * 光照等级
 */
exports.SOLAR_IRRADIANCE_LEVELS = {
    direct: 1000, // W/m² - 直射
    scattered: 850, // W/m² - 散射
    cloudy: 600, // W/m² - 多云
};
// ============================================================================
// 照明系统算法
// ============================================================================
/**
 * 计算照明系统基准能耗
 * @param params 照明系统参数
 * @param trafficPattern 人流量模式
 * @returns {baselineLoad: 基准负荷(kW), dailyConsumption: 日耗电量(kWh)}
 */
function calculateLightingBaseline(params, trafficPattern) {
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
 * @returns {savingsKWh: 节电量, savingsRate: 节电率, roi: 投资回报率}
 */
function calculateLightingSavings(params, currentSystem, environmentalFactors) {
    const { area, totalPower, dailyHours } = params;
    const { totalPower: oldTotalPower, dailyHours: oldDailyHours } = currentSystem;
    // 1. 从白炽灯升级到LED的节能
    const incandescentToLedSavings = oldTotalPower *
        (exports.LIGHTING_EFFICIENCY_BASELINE.ledEfficiency - exports.LIGHTING_EFFICIENCY_BASELINE.incandescentEfficiency) /
        exports.LIGHTING_EFFICIENCY_BASELINE.incandescentEfficiency;
    // 2. 智能控制系统节能（光感+调光）
    const smartControlSavings = totalPower * exports.LIGHTING_EFFICIENCY_BASELINE.smartControlSavings * dailyHours;
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
    const roi = (annualSavings * 0.6 - investment) / investment * 100; // 假设电价0.6元/kWh
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
function calculateHVACBaseline(params, buildingParams, environmentalFactors, trafficPattern) {
    const { area, currentCOP, annualCoolingHours } = params;
    const thermalCoef = buildingParams
        ? exports.BUILDING_THERMAL_COEFFICIENTS[buildingParams.type]
        : exports.BUILDING_THERMAL_COEFFICIENTS.office;
    // 计算制冷负荷 (kW)
    const coolingLoad = (area * 100 / thermalCoef) * (annualCoolingHours / 24) / 1000;
    // 根据人流量和季节调整
    let seasonMultiplier = 1;
    if (trafficPattern) {
        const month = new Date().getMonth();
        const isWinter = month >= 12 || month <= 2;
        const isSummer = month >= 6 && month <= 8;
        if (isSummer)
            seasonMultiplier = exports.SEASONAL_FACTORS.summer.loadMultiplier;
        else if (isWinter)
            seasonMultiplier = exports.SEASONAL_FACTORS.winter.loadMultiplier;
        else
            seasonMultiplier = exports.SEASONAL_FACTORS.autumn.loadMultiplier;
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
 * @returns {savingsKWh: 节电量, copImprovement: COP提升, roi: 投资回报率}
 */
function calculateHVACSavings(params, currentSystem, environmentalFactors, trafficPattern) {
    const { area, currentCOP: oldCOP, targetCOP, annualCoolingHours, freshAirEfficiency } = params;
    // 计算制冷负荷 (kW)
    const coolingLoad = (area * 100 / exports.BUILDING_THERMAL_COEFFICIENTS.office) *
        (annualCoolingHours / 24) / 1000;
    // 1. COP提升节能
    const copSavings = coolingLoad * (1 - targetCOP / oldCOP) *
        exports.HVAC_EFFICIENCY_PARAMS.equipmentEfficiencyFactor *
        exports.HVAC_EFFICIENCY_PARAMS.systemDesignMargin;
    // 2. 新风系统节能
    const freshAirEff = freshAirEfficiency || exports.HVAC_EFFICIENCY_PARAMS.equipmentEfficiencyFactor;
    const freshAirSavings = coolingLoad * (freshAirEff / 0.85) *
        exports.HVAC_EFFICIENCY_PARAMS.partialLoadFactor;
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
                exports.HVAC_EFFICIENCY_PARAMS.partialLoadFactor;
        }
    }
    // 总节电量
    const dailySavings = copSavings + freshAirSavings + occupancySavings;
    const totalSavingsKWh = dailySavings * 365;
    // COP提升
    const copImprovement = (targetCOP - oldCOP) / oldCOP * 100;
    // ROI计算（假设改造投资 200元/m²制冷容量）
    const investment = area * 200;
    const avgPrice = (environmentalFactors?.flatPrice || 0.8); // 假设平均电价
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
function calculateSolarGeneration(params, environmentalFactors) {
    const { pvCapacity } = params;
    // 根据城市获取年日照时数
    const annualSunshineHours = environmentalFactors?.region && exports.CITY_SUNSHINE_DATA[environmentalFactors.region]
        ? exports.CITY_SUNSHINE_DATA[environmentalFactors.region]
        : 1650; // 默认值
    const dailySunshineHours = annualSunshineHours / 365;
    // 根据天气条件调整效率
    let efficiencyFactor = 1;
    if (environmentalFactors) {
        // 光照等级调整
        const irradiance = environmentalFactors.solarIrradiance ||
            (environmentalFactors.annualSunshineHours / 365 / 24 * 50); // W/m² 近似值
        if (irradiance >= 900)
            efficiencyFactor = 1.05;
        else if (irradiance >= 700)
            efficiencyFactor = 1;
        else if (irradiance >= 500)
            efficiencyFactor = 0.95;
        else
            efficiencyFactor = 0.9;
        // 温度调整
        if (environmentalFactors.avgTemperature) {
            efficiencyFactor *= (1 - (environmentalFactors.avgTemperature - 25) * 0.003);
        }
    }
    // 日发电量 = 装机容量 × 年日照时数 × 效率 × 温度系数
    const dailyGeneration = pvCapacity * dailySunshineHours *
        exports.SOLAR_STORAGE_PERFORMANCE.inverterEfficiency *
        exports.SOLAR_STORAGE_PERFORMANCE.systemLoss * efficiencyFactor;
    const annualGeneration = dailyGeneration * 365;
    return { dailyGeneration, annualGeneration };
}
/**
 * 计算储能系统容量利用率
 * @param params 光储系统参数
 * @param priceCurve 24小时电价曲线
 * @returns {optimalSchedule: 最优充放电计划, annualArbitrage: 年套利收益}
 */
function calculateStorageOptimization(params, priceCurve, trafficPattern) {
    const { storageCapacity, storagePower } = params;
    // 分析价格曲线
    const sortedPrices = priceCurve.map((p, i) => ({ price: p, hour: i }))
        .sort((a, b) => a.price - b.price);
    const valleyPrice = sortedPrices[0].price;
    const peakPrice = sortedPrices[sortedPrices.length - 1].price;
    const priceSpread = peakPrice - valleyPrice;
    // 计算最优充放电策略
    const optimalSchedule = [];
    for (let hour = 0; hour < 24; hour++) {
        const price = priceCurve[hour];
        const isValleyHour = price <= valleyPrice * 1.1;
        const isPeakHour = price >= peakPrice * 0.9;
        // 获取当前时段
        const period = exports.TIME_PERIODS.valley.start <= hour && hour < exports.TIME_PERIODS.valley.end ? 'valley'
            : exports.TIME_PERIODS.flat.start <= hour && hour < exports.TIME_PERIODS.flat.end ? 'flat'
                : exports.TIME_PERIODS.peak.start <= hour && hour < exports.TIME_PERIODS.peak.end ? 'peak'
                    : exports.TIME_PERIODS.sharpPeak.start <= hour && hour < exports.TIME_PERIODS.sharpPeak.end ? 'sharpPeak'
                        : 'valley';
        // 基础策略：谷充峰放
        let action = 'idle';
        if (isValleyHour) {
            // 谷时充电
            action = 'charge';
            optimalSchedule.push({ hour, action });
        }
        else if (isPeakHour) {
            // 峰时放电
            action = 'discharge';
            optimalSchedule.push({ hour, action });
        }
        else {
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
function calculateIntegratedOptimization(lightingParams, hvacParams, solarStorageParams, buildingParams, environmentalFactors, trafficPattern, aggressiveness = 0.5 // 0-1: 保守到激进
) {
    const recommendations = [];
    // 1. 计算各系统基准
    const lightingBaseline = calculateLightingBaseline(lightingParams, trafficPattern);
    const hvacBaseline = calculateHVACBaseline(hvacParams, buildingParams, environmentalFactors, trafficPattern);
    // 2. 计算光伏发电
    const solarGeneration = calculateSolarGeneration(solarStorageParams, environmentalFactors);
    // 3. 计算储能优化
    const priceCurve = environmentalFactors?.peakPrice ?
        Array.from({ length: 24 }, (_, i) => {
            if (i < 8)
                return environmentalFactors.valleyPrice;
            if (i < 14)
                return environmentalFactors.flatPrice;
            if (i < 19)
                return environmentalFactors.peakPrice;
            if (i < 24)
                return environmentalFactors.flatPrice;
            return environmentalFactors.valleyPrice;
        }) :
        Array.from({ length: 24 }, () => 0.5); // 默认价格
    const storageOptimization = calculateStorageOptimization(solarStorageParams, priceCurve, trafficPattern);
    // 4. 生成优化后的24小时负荷曲线
    const optimizedLoadProfile = [];
    let totalSavingsKWh = 0;
    for (let hour = 0; hour < 24; hour++) {
        // 基础负荷
        const baseLoad = lightingBaseline.baselineLoad + hvacBaseline.baselineLoad;
        // 激进程度调整
        const intensityFactor = 0.5 + aggressiveness * 0.5; // 0.5-1.0
        // 光储协同：光伏优先自用，降低电网购电
        const solarSelfUseRatio = Math.min(solarGeneration.dailyGeneration / (baseLoad * 1.2), // 假设最大负荷是基准的120%
        0.8 + aggressiveness * 0.2);
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
function getCitySunshineData(city) {
    return exports.CITY_SUNSHINE_DATA[city] || 1650;
}
/**
 * 生成典型分时电价曲线
 */
function generateDefaultPriceCurve(peakPrice = 1.2, valleyPrice = 0.35, flatPrice = 0.6) {
    const curve = [];
    for (let i = 0; i < 24; i++) {
        if (i >= 0 && i < 8)
            curve.push(valleyPrice);
        else if (i >= 8 && i < 14)
            curve.push(flatPrice);
        else if (i >= 14 && i < 19)
            curve.push(peakPrice);
        else
            curve.push(flatPrice);
    }
    return curve;
}
/**
 * 生成工作日人流量模式
 * @returns 每小时人流量比例（0-1）
 */
function generateDefaultTrafficPattern() {
    const pattern = [];
    // 深夜/清晨 (0-6点): 低流量
    for (let i = 0; i < 6; i++)
        pattern.push(0.3);
    // 早高峰 (6-10点): 中高流量
    for (let i = 6; i < 10; i++)
        pattern.push(0.8);
    // 午休 (10-14点): 低流量
    for (let i = 10; i < 14; i++)
        pattern.push(0.4);
    // 下午工作 (14-18点): 高流量
    for (let i = 14; i < 18; i++)
        pattern.push(0.95);
    // 傍高峰 (18-22点): 中高流量
    for (let i = 18; i < 22; i++)
        pattern.push(0.8);
    // 夜间 (22-24点): 低流量
    for (let i = 22; i < 24; i++)
        pattern.push(0.2);
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
function calculatePMV(temperature, humidity, airVelocity, meanRadiantTemp, cloValue = 0.5, metValue = 1.0) {
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
function calculatePPD(pmv) {
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
function calculateComfortMetrics(temperature, humidity, airVelocity, meanRadiantTemp, cloValue = 0.5, metValue = 1.0) {
    const pmv = calculatePMV(temperature, humidity, airVelocity, meanRadiantTemp, cloValue, metValue);
    const ppd = calculatePPD(pmv);
    // 判断舒适等级
    let comfortLevel;
    if (ppd < 10)
        comfortLevel = 'comfortable';
    else if (pmv < -1)
        comfortLevel = pmv < -2 ? 'cold' : 'cool';
    else if (pmv > 1)
        comfortLevel = pmv > 2 ? 'hot' : 'warm';
    else
        comfortLevel = 'comfortable';
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
function calculateBatteryDegradation(batteryType, cycles, dod, temperature, age = 0) {
    // 基础容量衰减率
    let baseDegradationRate;
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
function calculateV2GOptimization(v2gDevices, priceCurve, gridDemand) {
    const schedules = [];
    for (const device of v2gDevices) {
        const hourlySchedule = [];
        let currentSoc = device.currentSoc;
        let revenue = 0;
        // 分析电价曲线
        const sortedPrices = priceCurve.map((p, i) => ({ price: p, hour: i }))
            .sort((a, b) => a.price - b.price);
        const valleyHours = sortedPrices.slice(0, 6).map(x => x.hour);
        const peakHours = sortedPrices.slice(-6).map(x => x.hour);
        for (let hour = 0; hour < 24; hour++) {
            let action = 'idle';
            let power = 0;
            // 检查是否在可用时段
            const isAvailable = device.availableHours.some(([start, end]) => hour >= start && hour < end);
            if (!isAvailable) {
                // 不在可用时段，保持空闲
                action = 'idle';
                power = 0;
            }
            else if (valleyHours.includes(hour) && currentSoc < 95) {
                // 谷时充电
                action = 'charge';
                power = Math.min(device.maxPower, (95 - currentSoc) / 100 * device.capacity);
                currentSoc = Math.min(95, currentSoc + power / device.capacity * 100 * 0.95); // 95%充电效率
            }
            else if (peakHours.includes(hour) && currentSoc > 20 && device.userPriority !== 'high') {
                // 峰时放电
                action = 'discharge';
                power = Math.min(device.maxPower, (currentSoc - 20) / 100 * device.capacity);
                revenue += power * priceCurve[hour] * 0.9; // 90%放电效率
                currentSoc = Math.max(20, currentSoc - power / device.capacity * 100 / 0.9);
            }
            else {
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
function calculateDigitalTwinThermalModel(building, environmental, twinModel, previousState, hour = 0) {
    const thermalCoef = exports.BUILDING_THERMAL_COEFFICIENTS[building.type];
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
function getComfortLevel(temperature) {
    if (temperature < 18)
        return 'cold';
    if (temperature < 20)
        return 'cool';
    if (temperature < 22)
        return 'slightly_cool';
    if (temperature <= 24)
        return 'comfortable';
    if (temperature <= 26)
        return 'slightly_warm';
    if (temperature <= 28)
        return 'warm';
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
function runRLOptimization(systemParams, rlConfig, historicalData) {
    // 状态空间定义：24小时负荷、价格、温度
    const stateDim = 24 * 3; // 72维状态
    // 动作空间定义：每小时的调整量 [-10%, 0%, +10%]
    const actionDim = 3;
    // 初始化Q表 (简化版)
    const qTable = new Map();
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
            const qValues = qTable.get(stateKey);
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
    const optimalPolicy = [];
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
