# 综合优化算法 (Integrated Optimization Algorithms)

## 概述

综合优化算法实现多系统协同优化，将照明、空调、光储等系统进行整体优化，实现全局最优的能源管理策略。

---

## 函数列表

### `calculateIntegratedOptimization()` - 多系统协同优化

计算照明、空调、光储系统的协同优化策略。

#### 接口定义

```typescript
interface IntegratedOptimizationParams {
  // 照明系统参数
  lightingParams: LightingSystemParams;

  // 空调系统参数
  hvacParams: HVACSystemParams;

  // 光储系统参数
  solarStorageParams: SolarStorageSystemParams;

  // 建筑参数（可选）
  buildingParams?: BuildingParams;

  // 环境因素（可选）
  environmentalFactors?: EnvironmentalFactors;

  // 人流量模式（可选）
  trafficPattern?: TrafficPattern;

  // AI激进程度
  aggressiveness: number;  // 0-1
}
```

#### aggressiveness 参数说明

| 值 | 激进程度 | 说明 |
|-----|----------|------|
| 0-0.3 | 保守 | 优先保证舒适度，节能幅度较小 |
| 0.3-0.6 | 中等 | 平衡舒适度和节能 |
| 0.6-1.0 | 激进 | 最大化节能，可能影响舒适度 |

#### 返回值

| 参数 | 类型 | 说明 |
|------|------|------|
| `optimizedLoadProfile` | number[] | 优化后的24小时负荷曲线 (kW) |
| `totalSavings` | number | 总节电量 (MWh) |
| `recommendations` | string[] | 优化建议列表 |

#### 计算依据

1. **照明-空调协同**
   - 根据自然光照调整照明功率
   - 减少空调额外负荷

2. **空调-储能协同**
   - 在电价低谷时段预冷
   - 利用建筑热惯性减少峰时段用电

3. **光伏-储能协同**
   - 优先使用光伏发电
   - 富余电力存入储能

4. **整体优化**
   - 考虑激进度调整策略
   - 输出智能优化建议

---

## 优化策略

### 策略1：照明优化

| 激进度 | 策略 |
|--------|------|
| 保守 | 根据人流量自动调光 |
| 中等 | 光感+人感双重控制 |
| 激进 | 按需启停+最大调光 |

### 策略2：空调优化

| 激进度 | 策略 |
|--------|------|
| 保守 | 按需送风，保持舒适度 |
| 中等 | 预冷策略+温度范围扩大 |
| 激进 | 峰时停机+低谷预冷 |

### 策略3：储能优化

| 激进度 | 策略 |
|--------|------|
| 保守 | 仅峰谷套利 |
| 中等 | 峰谷套利+备用容量 |
| 激进 | 多次充放电+深度DOD |

---

## 使用示例

```typescript
import { calculateIntegratedOptimization } from '../ai-platform-algorithms';

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
const result = calculateIntegratedOptimization(
  lightingParams,
  hvacParams,
  solarStorageParams,
  undefined,  // buildingParams
  environmentalFactors,
  undefined,  // trafficPattern
  0.6        // aggressiveness (中等)
);

console.log(`优化后负荷曲线: ${result.optimizedLoadProfile}`);
console.log(`总节电量: ${result.totalSavings.toFixed(2)} MWh`);
console.log(`优化建议:`);
result.recommendations.forEach(rec => console.log(`  - ${rec}`));
```

---

## 输出示例

```json
{
  "optimizedLoadProfile": [12.5, 10.2, 8.7, 7.3, 6.8, 7.2, ...],
  "totalSavings": 15.8,
  "recommendations": [
    "建议启用储能削峰填谷功能",
    "谷时段（22:00-6:00）进行深度预冷",
    "峰值时段（10:00-14:00）照明调光至70%",
    "光伏发电优先供给空调负荷"
  ]
}
```

---

## 相关算法模块

- [照明系统算法](../01-照明系统算法/README.md)
- [暖通空调算法](../02-暖通空调算法/README.md)
- [光储系统算法](../03-光储系统算法/README.md)

---

## 文件路径

- 主算法文件: `../ai-platform-algorithms.ts`
- 文档主页: `../README.md`
