"use strict";
/**
 * AI平台算法演示
 *
 * 演示各种算法的使用方式和计算结果
 * 可直接运行此文件查看算法效果
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ai_platform_algorithms_js_1 = require("./ai-platform-algorithms.js");
// ============================================================================
// 演示1: 照明系统
// ============================================================================
console.log('\n=== 照明系统算法演示 ===\n');
const lightingParams = {
    area: 1000, // 1000平方米
    totalPower: 20, // 20kW
    dailyHours: 8, // 每天8小时
    sensorDensity: 0.1, // 每10平米一个传感器
};
// 测试用例：改造前系统
const oldLightingSystem = {
    area: 1000,
    totalPower: 30, // 原来30kW（白炽灯）
    dailyHours: 10, // 每天10小时
};
// 计算基准
const lightingBaseline = (0, ai_platform_algorithms_js_1.calculateLightingBaseline)(lightingParams);
console.log('1. 照明系统基准计算:');
console.log(`   基准负荷: ${lightingBaseline.baselineLoad.toFixed(2)} kW`);
console.log(`   日耗电量: ${lightingBaseline.dailyConsumption.toFixed(2)} kWh`);
// 计算节能潜力
const lightingSavings = (0, ai_platform_algorithms_js_1.calculateLightingSavings)(lightingParams, oldLightingSystem);
console.log('\n2. 照明系统节能潜力:');
console.log(`   年节电量: ${lightingSavings.savingsKWh.toFixed(2)} kWh`);
console.log(`   节电率: ${lightingSavings.savingsRate.toFixed(2)}%`);
console.log(`   投资回报率 (ROI): ${lightingSavings.roi.toFixed(2)}%`);
// ============================================================================
// 演示2: 暖通空调系统
// ============================================================================
console.log('\n=== 暖通空调系统算法演示 ===\n');
const hvacParams = {
    area: 2000, // 2000平方米
    currentCOP: 2.8, // 当前COP
    targetCOP: 4.5, // 目标COP（改造后）
    annualCoolingHours: 1200, // 每年1200小时制冷
    buildingType: 'office',
    freshAirEfficiency: 0.75,
    controllerType: 'vrf',
    vrfSystem: {
        outdoorUnitCount: 2,
        indoorUnitCount: 8,
        refrigerantType: 'R410A',
    },
    coolingCapacity: 500,
    humidityControl: true,
};
const oldHVACSystem = {
    area: 2000,
    currentCOP: 2.8,
    targetCOP: 2.8,
    annualCoolingHours: 1200,
};
const buildingParams = {
    type: 'office',
    area: 2000,
    orientation: 'south',
    insulationLevel: 'good',
    glazingRatio: 0.3,
    floorHeight: 3.5,
    shadingCoefficient: 0.2,
    ventilationRate: 1500,
    thermalMass: 150,
};
const environmentalFactors = {
    region: '上海',
    avgTemperature: 26,
    annualSunshineHours: (0, ai_platform_algorithms_js_1.getCitySunshineData)('上海'),
    peakPrice: 1.2,
    valleyPrice: 0.35,
    flatPrice: 0.6,
    cloudCover: 30,
    windSpeed: 3,
    rainfall: 1200,
    aqi: 75,
    solarIrradiance: 600,
};
const trafficPattern = (0, ai_platform_algorithms_js_1.generateDefaultTrafficPattern)();
// 计算基准负荷
const hvacBaseline = (0, ai_platform_algorithms_js_1.calculateHVACBaseline)(hvacParams, buildingParams, environmentalFactors, trafficPattern);
console.log('3. 暖通空调系统基准:');
console.log(`   基准负荷: ${hvacBaseline.baselineLoad.toFixed(2)} kW`);
console.log(`   制冷负荷: ${hvacBaseline.coolingLoad.toFixed(2)} kW`);
// 计算节能潜力
const hvacSavings = (0, ai_platform_algorithms_js_1.calculateHVACSavings)(hvacParams, oldHVACSystem, environmentalFactors, trafficPattern);
console.log('\n4. 暖通空调系统节能潜力:');
console.log(`   年节电量: ${hvacSavings.savingsKWh.toFixed(2)} kWh`);
console.log(`   COP提升: ${hvacSavings.copImprovement.toFixed(2)}%`);
console.log(`   投资回报率 (ROI): ${hvacSavings.roi.toFixed(2)}%`);
// ============================================================================
// 演示3: 光储系统
// ============================================================================
console.log('\n=== 光储系统算法演示 ===\n');
const solarStorageParams = {
    pvCapacity: 100, // 100kWp
    storageCapacity: 200, // 200kWh
    storagePower: 100, // 100kW
    roundTripEfficiency: 0.92,
    dod: 90, // 90%放电深度
    cyclesPerDay: 1, // 每天1次循环
    batteryType: 'LFP',
    batteryAge: 0,
    maintenanceRate: 0.5,
    scrapValue: 5,
    degradationRate: 2,
};
// 计算光伏发电
const solarGeneration = (0, ai_platform_algorithms_js_1.calculateSolarGeneration)(solarStorageParams, environmentalFactors);
console.log('5. 光伏系统发电量:');
console.log(`   日发电量: ${solarGeneration.dailyGeneration.toFixed(2)} kWh`);
console.log(`   年发电量: ${solarGeneration.annualGeneration.toFixed(2)} kWh`);
// 计算储能优化
const priceCurve = (0, ai_platform_algorithms_js_1.generateDefaultPriceCurve)(1.2, 0.35, 0.6);
const storageOptimization = (0, ai_platform_algorithms_js_1.calculateStorageOptimization)(solarStorageParams, priceCurve, trafficPattern);
console.log('\n6. 储能系统容量利用率:');
console.log(`   年套利收益: ${storageOptimization.annualArbitrage.toFixed(2)} 元`);
console.log(`   最优调度计划 (前8小时):`);
storageOptimization.optimalSchedule.slice(0, 8).forEach(s => {
    const actionName = s.action === 'charge' ? '充电' : s.action === 'discharge' ? '放电' : '空闲';
    console.log(`     ${s.hour}时: ${actionName}`);
});
// ============================================================================
// 演示4: 综合优化
// ============================================================================
console.log('\n=== 综合系统优化演示 ===\n');
const integratedResult = (0, ai_platform_algorithms_js_1.calculateIntegratedOptimization)({
    area: 1000,
    totalPower: 20,
    dailyHours: 8,
}, {
    area: 2000,
    currentCOP: 2.8,
    targetCOP: 4.5,
    annualCoolingHours: 1200,
}, solarStorageParams, buildingParams, environmentalFactors, trafficPattern, 0.5 // 激进程度50%
);
console.log('7. 多系统协同优化结果:');
console.log(`   总节电量: ${integratedResult.totalSavings.toFixed(2)} MWh`);
console.log(`   优化负荷曲线 (24小时):`);
integratedResult.optimizedLoadProfile.forEach((load, i) => {
    const hour = i + 1;
    const timeLabel = hour < 12 ? `${hour}点` : `${hour}点`;
    const bar = '█'.repeat(Math.floor(load / 5));
    const barEmpty = '░'.repeat(20 - bar.length);
    console.log(`     ${timeLabel}: ${bar}${barEmpty}`);
});
console.log('\n优化建议:');
integratedResult.recommendations.forEach(rec => {
    console.log(`   • ${rec}`);
});
// ============================================================================
// 演示5: PMV/PPD 舒适度计算
// ============================================================================
console.log('\n=== PMV/PPD 舒适度计算演示 ===\n');
const comfortMetrics = (0, ai_platform_algorithms_js_1.calculateComfortMetrics)(24, // 温度
60, // 湿度
0.1, // 空气流速
24, // 平均辐射温度
0.5, // 服装热阻
1.0 // 新陈代谢率
);
console.log('8. 热舒适度指标:');
console.log(`   PMV (预测平均投票值): ${comfortMetrics.pmv.toFixed(2)}`);
console.log(`     (-3 = 冷, 0 = 舒适, +3 = 热)`);
console.log(`   PPD (预测不满意百分比): ${comfortMetrics.ppd.toFixed(2)}%`);
console.log(`   舒适度等级: ${comfortMetrics.pmv < -1 ? '冷' : comfortMetrics.pmv > 1 ? '热' : '舒适'}`);
// 不同温度场景对比
console.log('\n9. 不同温度场景下的舒适度:');
[20, 22, 24, 26, 28].forEach(temp => {
    const metrics = (0, ai_platform_algorithms_js_1.calculateComfortMetrics)(temp, 50, 0.1, 24, 0.5, 1.0);
    const level = metrics.pmv < -1 ? '冷' : metrics.pmv > 1 ? '热' : '舒适';
    console.log(`   ${temp}°C: PMV=${metrics.pmv.toFixed(2)}, PPD=${metrics.ppd.toFixed(1)}%, ${level}`);
});
// ============================================================================
// 演示6: 电池衰减计算
// ============================================================================
console.log('\n=== 电池衰减计算演示 ===\n');
const batteryHealth = (0, ai_platform_algorithms_js_1.calculateBatteryDegradation)('LFP', // 磷酸铁锂电池
3650, // 使用3年
90, // 90%放电深度
25, // 25°C运行温度
3 // 电池使用年限
);
console.log('10. 电池健康状态评估:');
console.log(`   电池类型: LFP (磷酸铁锂)`);
console.log(`   当前健康度: ${batteryHealth.health.toFixed(1)}%`);
console.log(`   当前容量: ${batteryHealth.currentCapacity.toFixed(1)} kWh`);
console.log(`   累计循环次数: ${batteryHealth.cycleCount} 次`);
console.log(`   衰减成本: ${batteryHealth.degradationCost.toFixed(2)} 元`);
不同电池类型对比;
console.log('\n11. 不同电池类型衰减对比:');
const batteryTypes = ['LFP', 'NCM', 'LeadAcid'];
batteryTypes.forEach(type => {
    const health = (0, ai_platform_algorithms_js_1.calculateBatteryDegradation)(type, 2000, 90, 25, 3);
    console.log(`   ${type}: 健康${health.health.toFixed(1)}%, 容量${health.currentCapacity.toFixed(1)}kWh, 成本${health.degradationCost.toFixed(2)}元`);
});
// ============================================================================
// 演示7: V2G 优化
// ============================================================================
console.log('\n=== V2G 车辆交互优化演示 ===\n');
const v2gDevices = [
    {
        id: 'EV001',
        capacity: 60, // 60kWh
        maxPower: 22, // 22kW
        currentSoc: 70, // 70% SOC
        availableHours: [[0, 7], [18, 24]], // 0-7点和18-24点可用
        degradationCost: 0.05,
        userPriority: 'medium',
    },
    {
        id: 'EV002',
        capacity: 40, // 40kWh
        maxPower: 11, // 11kW
        currentSoc: 80, // 80% SOC
        availableHours: [[6, 8], [19, 22]], // 6-8点和19-22点可用
        degradationCost: 0.08,
        userPriority: 'low',
    },
];
const v2gSchedules = (0, ai_platform_algorithms_js_1.calculateV2GOptimization)(v2gDevices, priceCurve);
console.log('12. V2G 充放电调度计划:');
v2gSchedules.forEach(schedule => {
    console.log(`   设备 ${schedule.deviceId}:`);
    console.log(`     预期收益: ${schedule.expectedRevenue.toFixed(2)} 元`);
    console.log('     24小时调度:');
    schedule.hourlySchedule.forEach(hour => {
        const actionName = hour.action === 'charge' ? '充电' : hour.action === 'discharge' ? '放电' : '空闲';
        console.log(`       ${hour.hour}时: ${actionName} ${hour.power.toFixed(1)}kW SOC${hour.soc.toFixed(0)}%`);
    });
});
// ============================================================================
// 演示8: 数字孪生热建模
// ============================================================================
console.log('\n=== 数字孪生建筑热模型演示 ===\n');
const digitalTwinModel = {
    building: {
        thermalZones: 4,
        thermalInertia: 2, // 2小时热惯性
        heatCapacity: 1000, // kJ/K
    },
    hvac: {
        responseTime: 5, // 5分钟响应时间
        setpointDeadband: 1, // 1°C死区
    },
    environment: {
        forecastHorizon: 24, // 24小时预测
        predictionAccuracy: 85, // 85%预测精度
    },
};
// 模拟24小时建筑热状态
console.log('13. 24小时建筑热状态模拟:');
for (let hour = 0; hour < 24; hour++) {
    const thermalState = (0, ai_platform_algorithms_js_1.calculateDigitalTwinThermalModel)(buildingParams, environmentalFactors, digitalTwinModel, undefined, hour);
    const timeLabel = `${hour}时`;
    const comfortLabel = thermalState.comfortLevel === 'comfortable' ? '舒适' :
        thermalState.comfortLevel === 'slightly_cool' ? '微冷' :
            thermalState.comfortLevel === 'slightly_warm' ? '微热' :
                thermalState.comfortLevel === 'cool' ? '冷' :
                    thermalState.comfortLevel === 'warm' ? '热' :
                        '极' + thermalState.comfortLevel;
    console.log(`   ${timeLabel}: 室温${thermalState.indoorTemperature.toFixed(1)}°C, 墙温${thermalState.wallTemperature.toFixed(1)}°C, 热负荷${thermalState.thermalLoad.toFixed(1)}kW, ${comfortLabel}`);
}
// ============================================================================
// 演示9: 强化学习优化
// ============================================================================
console.log('\n=== 强化学习优化演示 ===\n');
const rlConfig = {
    algorithm: 'dqn',
    learningRate: 0.1,
    discountFactor: 0.95,
    explorationRate: 0.2,
    batchSize: 32,
    trainingEpisodes: 100,
    rewardFunction: 'cost',
};
// 生成模拟历史数据
const historicalData = [];
for (let i = 0; i < 24; i++) {
    historicalData.push({
        timestamp: Date.now() - (24 - i) * 3600000,
        load: 80 + Math.sin(i / 4) * 20,
        price: priceCurve[i],
        temperature: 20 + Math.cos(i / 6) * 8,
    });
}
const rlTrainingResult = (0, ai_platform_algorithms_js_1.runRLOptimization)({
    lighting: lightingParams,
    hvac: hvacParams,
    solarStorage: solarStorageParams,
    building: buildingParams,
}, rlConfig, historicalData);
console.log('14. 强化学习训练结果:');
console.log(`   算法: ${rlConfig.algorithm.toUpperCase()}`);
console.log(`   累计奖励: ${rlTrainingResult.cumulativeReward.toFixed(2)}`);
console.log(`   平均奖励: ${rlTrainingResult.averageReward.toFixed(2)}`);
console.log(`   训练回合数: ${rlTrainingResult.episodes}`);
console.log(`   损失值: ${rlTrainingResult.loss.toFixed(4)}`);
console.log('\n15. 最优策略 (24小时):');
rlTrainingResult.optimalPolicy.forEach((action, i) => {
    const actionName = action === 0 ? '-10%节能' : action === 1 ? '保持' : '+10%节能';
    const timeLabel = `${i + 1}点`;
    console.log(`   ${timeLabel}: ${actionName}`);
});
// ============================================================================
// 总结
// ============================================================================
console.log('\n=== 算法库使用总结 ===\n');
const summary = {
    totalAnnualSavings: lightingSavings.savingsKWh + hvacSavings.savingsKWh + integratedResult.totalSavings * 1000,
    totalPVGeneration: solarGeneration.annualGeneration,
    totalStorageCapacity: solarStorageParams.storageCapacity,
};
console.log('16. 项目整体效益:');
console.log(`   总年发电量: ${summary.totalPVGeneration.toFixed(0)} kWh`);
console.log(`   总储能容量: ${summary.totalStorageCapacity} kWh`);
console.log(`   总年节电量: ${summary.totalAnnualSavings.toFixed(0)} kWh`);
console.log(`   总年节电收益 (按0.6元/kWh): ${(summary.totalAnnualSavings * 0.6).toFixed(2)} 元`);
console.log('\n✓ 所有算法演示完成！');
console.log('✓ 算法库位置: algorithms/ai-platform-algorithms.ts');
console.log('\n提示: 使用 ts-node algorithm-demo.ts 运行此演示文件');
