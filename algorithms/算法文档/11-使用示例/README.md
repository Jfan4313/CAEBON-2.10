# 使用示例 (Usage Examples)

## 概述

本节提供AI平台算法库的完整使用示例，帮助开发者快速集成和使用各个算法模块。

---

## 示例1：照明系统节能评估

### 场景
某办公楼照明系统改造评估，从传统白炽灯升级到LED智能照明系统。

### 代码实现

```typescript
import {
  calculateLightingBaseline,
  calculateLightingSavings
} from '../ai-platform-algorithms';

// 当前系统参数（改造前）
const oldSystem = {
  area: 1000,         // 1000平方米
  totalPower: 30,     // 原来30kW（白炽灯）
  dailyHours: 10,      // 每天10小时
  sensorDensity: 0     // 无传感器
};

// 新系统参数（改造后）
const newSystem = {
  area: 1000,
  totalPower: 15,     // 升级到15kW（LED）
  dailyHours: 10,
  sensorDensity: 0.01  // 安装1个传感器/100平方米
};

// 计算基准负荷
const oldBaseline = calculateLightingBaseline(oldSystem);
const newBaseline = calculateLightingBaseline(newSystem);

console.log('=== 照明系统改造评估 ===');
console.log(`改造前基准负荷: ${oldBaseline.baselineLoad.toFixed(2)} kW`);
console.log(`改造前日耗电量: ${oldBaseline.dailyConsumption.toFixed(2)} kWh`);
console.log(`改造后基准负荷: ${newBaseline.baselineLoad.toFixed(2)} kW`);
console.log(`改造后日耗电量: ${newBaseline.dailyConsumption.toFixed(2)} kWh`);

// 计算节能潜力
const savings = calculateLightingSavings(newSystem, oldSystem);
console.log('\n=== 节能潜力 ===');
console.log(`年节电量: ${savings.savingsKWh.toFixed(2)} kWh`);
console.log(`节电率: ${savings.savingsRate.toFixed(2)}%`);
console.log(`投资回报率: ${savings.roi.toFixed(2)}%`);
```

### 输出示例

```
=== 照明系统改造评估 ===
改造前基准负荷: 30.00 kW
改造前日耗电量: 300.00 kWh
改造后基准负荷: 15.00 kW
改造后日耗电量: 150.00 kWh

=== 节能潜力 ===
年节电量: 54,750.00 kWh
节电率: 50.00%
投资回报率: 125.00%
```

---

## 示例2：暖通空调系统优化

### 场景
某写字楼空调系统从定频空调升级到变频VRF系统。

### 代码实现

```typescript
import {
  calculateHVACBaseline,
  calculateHVACSavings
} from '../ai-platform-algorithms';

// 当前空调系统
const currentHVAC = {
  area: 2000,                // 2000平方米
  currentCOP: 2.8,           // 当前COP 2.8
  targetCOP: 4.5,            // 目标COP 4.5（VRF系统）
  annualCoolingHours: 1200,   // 每年制冷1200小时
  buildingType: 'office',
  freshAirEfficiency: 0.85,
  controllerType: 'vrf',
  humidityControl: false
};

// 计算基准负荷
const baseline = calculateHVACBaseline(currentHVAC);
console.log('=== 暖通空调系统评估 ===');
console.log(`制冷负荷: ${baseline.coolingLoad.toFixed(2)} kW`);
console.log(`基准负荷: ${baseline.baselineLoad.toFixed(2)} kW`);

// 计算节能潜力
const savings = calculateHVACSavings(currentHVAC, currentHVAC);
console.log('\n=== 节能潜力 ===');
console.log(`年节电量: ${savings.savingsKWh.toFixed(2)} kWh`);
console.log(`COP提升: ${savings.copImprovement.toFixed(2)}%`);
console.log(`投资回报率: ${savings.roi.toFixed(2)}%`);

// 计算节能金额
const avgPrice = 0.8; // 平均电价 0.8元/kWh
const annualSavings = savings.savingsKWh * avgPrice;
console.log(`年节省电费: ¥${annualSavings.toFixed(2)}`);
```

### 输出示例

```
=== 暖通空调系统评估 ===
制冷负荷: 142.86 kW
基准负荷: 142.86 kW

=== 节能潜力 ===
年节电量: 180,000.00 kWh
COP提升: 37.78%
投资回报率: 85.00%
年节省电费: ¥144,000.00
```

---

## 示例3：光储系统综合评估

### 场景
某工业园区建设100kW光伏+200kWh储能系统，评估发电量和套利收益。

### 代码实现

```typescript
import {
  calculateSolarGeneration,
  calculateStorageOptimization,
  calculateBatteryDegradation,
  generateDefaultPriceCurve
} from '../ai-platform-algorithms';

// 光储系统参数
const solarStorageParams = {
  pvCapacity: 100,             // 100kW光伏
  storageCapacity: 200,        // 200kWh储能
  storagePower: 100,           // 100kW功率
  roundTripEfficiency: 90,     // 往返效率90%
  dod: 90,                    // 最大DOD 90%
  cyclesPerDay: 1,             // 每天循环1次
  batteryType: 'LFP',         // 磷酸铁锂电池
  batteryAge: 0,              // 新电池
  degradationRate: 2           // 2%/年
};

// 环境参数
const envFactors = {
  region: '上海',
  avgTemperature: 26,
  annualSunshineHours: 1650,
  peakPrice: 1.2,
  valleyPrice: 0.35,
  flatPrice: 0.6
};

// 生成电价曲线
const priceCurve = generateDefaultPriceCurve({
  peakPrice: 1.2,
  valleyPrice: 0.35,
  flatPrice: 0.6
});

console.log('=== 光储系统评估 ===');

// 计算光伏发电量
const solarGen = calculateSolarGeneration(solarStorageParams, envFactors);
console.log(`\n=== 光伏发电 ===`);
console.log(`日发电量: ${solarGen.dailyGeneration.toFixed(2)} kWh`);
console.log(`年发电量: ${solarGen.annualGeneration.toFixed(2)} kWh`);
console.log(`等效利用小时数: ${(solarGen.annualGeneration / solarStorageParams.pvCapacity / 365).toFixed(2)} h`);

// 计算储能套利收益
const storageOpt = calculateStorageOptimization(solarStorageParams, priceCurve);
console.log(`\n=== 储能套利 ===`);
console.log(`最优充放电计划: ${storageOpt.optimalSchedule}`);
console.log(`年套利收益: ¥${storageOpt.annualArbitrage.toFixed(2)}`);

// 计算电池衰减
const batteryDegradation = calculateBatteryDegradation({
  initialCapacity: 200,
  cycles: 365,          // 使用1年，每天1次循环
  batteryType: 'LFP',
  batteryAge: 1,
  dod: 90,
  avgTemperature: 25
});
console.log(`\n=== 电池衰减 ===`);
console.log(`当前容量: ${batteryDegradation.currentCapacity.toFixed(2)} kWh`);
console.log(`健康度: ${batteryDegradation.health.toFixed(1)}%`);
console.log(`衰减成本: ¥${batteryDegradation.degradationCost.toFixed(2)}`);

// 综合收益分析
const annualRevenue = solarGen.annualGeneration * 0.6 + storageOpt.annualArbitrage;
console.log(`\n=== 综合收益 ===`);
console.log(`发电收益: ¥${(solarGen.annualGeneration * 0.6).toFixed(2)}`);
console.log(`套利收益: ¥${storageOpt.annualArbitrage.toFixed(2)}`);
console.log(`衰减成本: ¥${batteryDegradation.degradationCost.toFixed(2)}`);
console.log(`年净收益: ¥${(annualRevenue - batteryDegradation.degradationCost).toFixed(2)}`);
```

### 输出示例

```
=== 光储系统评估 ===

=== 光伏发电 ===
日发电量: 405.00 kWh
年发电量: 147,825.00 kWh
等效利用小时数: 4.05 h

=== 储能套利 ===
最优充放电计划: [0,0,0,0,0,0,0,0,50,50,50,50,0,0,0,-50,-50,-50,0,0,0,0,0]
年套利收益: ¥25,550.00

=== 电池衰减 ===
当前容量: 199.40 kWh
健康度: 99.7%
衰减成本: ¥144.00

=== 综合收益 ===
发电收益: ¥88,695.00
套利收益: ¥25,550.00
衰减成本: ¥144.00
年净收益: ¥114,101.00
```

---

## 示例4：综合优化多系统协同

### 场景
某办公园区综合改造，包括照明、空调、光储系统的协同优化。

### 代码实现

```typescript
import {
  calculateIntegratedOptimization,
  calculateComfortMetrics
} from '../ai-platform-algorithms';

// 照明参数
const lightingParams = {
  area: 1000,
  totalPower: 15,
  dailyHours: 10,
  sensorDensity: 0.01
};

// 空调参数
const hvacParams = {
  area: 1000,
  currentCOP: 3.0,
  targetCOP: 4.5,
  annualCoolingHours: 1200
};

// 光储参数
const solarStorageParams = {
  pvCapacity: 50,
  storageCapacity: 100,
  storagePower: 50,
  roundTripEfficiency: 90,
  dod: 90,
  cyclesPerDay: 1
};

// 环境因素
const environmentalFactors = {
  region: '上海',
  avgTemperature: 26,
  annualSunshineHours: 1650,
  peakPrice: 1.2,
  valleyPrice: 0.35,
  flatPrice: 0.6
};

// 计算综合优化（中等激进度）
const aggressiveness = 0.6; // 中等激进度
const result = calculateIntegratedOptimization(
  lightingParams,
  hvacParams,
  solarStorageParams,
  undefined,    // buildingParams
  environmentalFactors,
  undefined,    // trafficPattern
  aggressiveness
);

console.log('=== 综合优化结果 ===');
console.log(`AI激进度: ${aggressiveness}`);
console.log(`\n优化后负荷曲线 (24小时):`);
console.log(result.optimizedLoadProfile.map((load, hour) =>
  `${hour.toString().padStart(2, '0')}:00 - ${load.toFixed(1)} kW`
).join('\n'));

console.log(`\n总节电量: ${result.totalSavings.toFixed(2)} MWh`);
console.log(`\n优化建议:`);
result.recommendations.forEach((rec, index) => {
  console.log(`${index + 1}. ${rec}`);
});
```

### 输出示例

```
=== 综合优化结果 ===
AI激进度: 0.6

优化后负荷曲线 (24小时):
00:00 - 8.2 kW
01:00 - 7.5 kW
02:00 - 6.8 kW
03:00 - 6.3 kW
04:00 - 6.1 kW
05:00 - 6.5 kW
06:00 - 7.8 kW
07:00 - 9.2 kW
08:00 - 11.5 kW
09:00 - 14.8 kW
10:00 - 17.2 kW
11:00 - 18.5 kW
12:00 - 17.8 kW
13:00 - 16.5 kW
14:00 - 15.2 kW
15:00 - 14.5 kW
16:00 - 13.8 kW
17:00 - 12.5 kW
18:00 - 11.2 kW
19:00 - 10.5 kW
20:00 - 9.8 kW
21:00 - 9.2 kW
22:00 - 8.5 kW
23:00 - 7.8 kW

总节电量: 15.80 MWh

优化建议:
1. 谷时段（22:00-6:00）进行深度预冷，设定温度22°C
2. 峰值时段（10:00-14:00）照明调光至70%，设定温度25°C
3. 光伏发电优先供给空调负荷，余量存入储能
4. 建议启用储能削峰填谷功能，峰时放电补充空调负荷
5. 周末模式启用更激进的节能策略
```

---

## 示例5：V2G车辆调度优化

### 场景
停车场V2G充电站，优化电动汽车充放电调度策略。

### 代码实现

```typescript
import {
  calculateV2GOptimization,
  generateDefaultPriceCurve
} from '../ai-platform-algorithms';

// V2G设备参数
const v2gDevice = {
  id: 'EV001',
  capacity: 60,           // 60kWh电池容量
  maxPower: 11,          // 11kW充放电功率
  currentSoc: 30,        // 当前SOC 30%
  availableHours: [
    [0, 6],     // 0-6点可充电（夜间谷价）
    [18, 22],   // 18-22点可充电（晚间谷价）
    [10, 12],   // 10-12点可放电（峰价）
    [14, 17]    // 14-17点可放电（峰价）
  ],
  degradationCost: 0.1,  // 衰减成本 0.1元/kWh
  userPriority: 'medium'  // 中等优先级
};

// 生成电价曲线
const priceCurve = generateDefaultPriceCurve({
  peakPrice: 1.2,
  valleyPrice: 0.35,
  flatPrice: 0.6
});

console.log('=== V2G充电站调度优化 ===');
console.log(`设备ID: ${v2gDevice.id}`);
console.log(`电池容量: ${v2gDevice.capacity} kWh`);
console.log(`当前SOC: ${v2gDevice.currentSoc}%`);
console.log(`用户优先级: ${v2gDevice.userPriority}`);

// 计算V2G优化
const result = calculateV2GOptimization(v2gDevice, priceCurve);

console.log(`\n=== 最优调度计划 ===`);
result.optimalSchedule.forEach(item => {
  const actionMap = { charge: '充电', discharge: '放电', idle: '空闲' };
  console.log(`${item.hour.toString().padStart(2, '0')}:00 - ${actionMap[item.action]} ${item.power}kW`);
});

console.log(`\n=== 收益分析 ===`);
console.log(`总收益: ¥${result.totalRevenue.toFixed(2)}`);
console.log(`能量吞吐: ${result.energyTransferred.toFixed(2)} kWh`);
console.log(`平均收益: ¥${(result.totalRevenue / result.energyTransferred).toFixed(2)}/kWh`);

console.log(`\n=== 调度建议 ===`);
result.recommendations.forEach((rec, index) => {
  console.log(`${index + 1}. ${rec}`);
});
```

### 输出示例

```
=== V2G充电站调度优化 ===
设备ID: EV001
电池容量: 60 kWh
当前SOC: 30%
用户优先级: medium

=== 最优调度计划 ===
00:00 - 充电 11.0kW
01:00 - 充电 11.0kW
02:00 - 充电 11.0kW
...
10:00 - 放电 11.0kW
11:00 - 放电 11.0kW
...
18:00 - 充电 11.0kW
19:00 - 充电 11.0kW
20:00 - 充电 11.0kW
...

=== 收益分析 ===
总收益: ¥45.80
能量吞吐: 85.5 kWh
平均收益: ¥0.54/kWh

=== 调度建议 ===
1. 谷时段（0-6点）充电至80%SOC
2. 峰时段（10-12点、14-17点）放电至50%SOC
3. 晚间（18-22点）补充电至90%SOC
4. 考虑电池寿命，避免深度DOD超过90%
5. 如用户优先级调整为high，减少放电时长
```

---

## 快速开始

### 导入算法库

```typescript
import {
  // 照明算法
  calculateLightingBaseline,
  calculateLightingSavings,

  // 空调算法
  calculateHVACBaseline,
  calculateHVACSavings,

  // 光储算法
  calculateSolarGeneration,
  calculateStorageOptimization,

  // 综合优化
  calculateIntegratedOptimization,

  // 高级算法
  calculatePMV,
  calculatePPD,
  calculateComfortMetrics,
  calculateBatteryDegradation,
  calculateV2GOptimization,
  calculateDigitalTwinThermalModel,
  runRLOptimization,

  // 工具函数
  getCitySunshineData,
  generateDefaultPriceCurve,
  generateDefaultTrafficPattern,
} from './algorithms/ai-platform-algorithms';
```

---

## 文件路径

- 主算法文件: `../ai-platform-algorithms.ts`
- 文档主页: `../README.md`
