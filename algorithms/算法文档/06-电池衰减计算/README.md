# 电池衰减计算 (Battery Degradation Algorithms)

## 概述

电池衰减计算算法用于评估储能电池的健康状态和衰减成本，支持不同电池类型的衰减特性分析。

---

## 函数列表

### `calculateBatteryDegradation()` - 电池健康状态评估

计算电池的当前容量、健康度和累计衰减成本。

#### 接口定义

```typescript
interface BatteryDegradationParams {
  initialCapacity: number;      // 初始容量 (kWh)
  currentCapacity?: number;      // 当前容量 (kWh)，可选
  cycles: number;               // 累计循环次数
  batteryType: string;         // 电池类型：LFP/NCM/LeadAcid
  batteryAge: number;          // 电池使用年限（年）
  dod: number;                 // 最大充放电深度 (%)
  avgTemperature?: number;      // 平均运行温度 (°C)，默认25°C
}
```

#### batteryType 枚举值

| 类型 | 全称 | 衰减率 (%/1000次) | 寿命 (年) |
|------|------|-------------------|----------|
| `'LFP'` | 磷酸铁锂 | 2 | 15-20 |
| `'NCM'` | 三元锂 | 3 | 8-12 |
| `'LeadAcid'` | 铅酸电池 | 5 | 3-5 |

#### 返回值

| 参数 | 类型 | 说明 |
|------|------|------|
| `currentCapacity` | number | 当前容量 (kWh) |
| `health` | number | 电池健康度 (%) |
| `cycleCount` | number | 累计循环次数 |
| `degradationCost` | number | 累计衰减成本 (元) |
| `remainingLife` | number | 剩余寿命 (年) |

---

## 电池类型对比

### 性能对比表

| 特性 | LFP (磷酸铁锂) | NCM (三元锂) | 铅酸电池 |
|------|---------------|--------------|----------|
| 能量密度 | 120-160 Wh/kg | 200-280 Wh/kg | 30-40 Wh/kg |
| 循环寿命 | 2000-6000次 | 800-1500次 | 300-500次 |
| 工作温度 | -20°C ~ 60°C | -20°C ~ 55°C | -10°C ~ 50°C |
| 安全性 | 高（热稳定性好）| 中（热失控风险）| 高 |
| 成本 | 中 | 高 | 低 |
| 衰减率 | 低 (2%/1000次) | 中 (3%/1000次) | 高 (5%/1000次) |

### 适用场景

| 电池类型 | 适用场景 |
|---------|---------|
| LFP | 储能系统、商用车、长寿命需求 |
| NCM | 乘用车、高能量密度需求 |
| 铅酸 | 备用电源、低成本场景 |

---

## 衰减计算方法

### 1. 循环衰减

```
cycleDegradation = (cycles / 1000) × baseDegradationRate × DoD_factor × tempFactor
```

| 参数 | 说明 |
|------|------|
| `cycles` | 累计循环次数 |
| `baseDegradationRate` | 基础衰减率（%/1000次）|
| `DoD_factor` | DOD影响系数 |
| `tempFactor` | 温度影响系数 |

### 2. 日历衰减

```
calendarDegradation = age × 0.01  [每年约1%]
```

### 3. 总衰减

```
totalDegradation = min(0.8, cycleDegradation + calendarDegradation)
health = max(0.2, 1 - totalDegradation) × 100 [%]
```

---

## 影响因素

### DOD（充放电深度）影响

| DOD范围 | 衰减系数 |
|---------|---------|
| ≤ 50% | 0.6 |
| 50%-80% | 0.8 |
| 80%-90% | 1.0 |
| ≥ 90% | 1.2 |

### 温度影响

| 温度范围 | 温度系数 |
|---------|---------|
| ≤ 10°C | 0.7 |
| 10°C-25°C | 1.0 |
| 25°C-35°C | 1.3 |
| ≥ 35°C | 1.8 |

---

## 使用示例

```typescript
import { calculateBatteryDegradation } from '../ai-platform-algorithms';

// LFP电池评估
const lfpParams = {
  initialCapacity: 200,      // 200kWh初始容量
  cycles: 500,             // 已循环500次
  batteryType: 'LFP',
  batteryAge: 2,           // 使用2年
  dod: 90,                // 最大DOD 90%
  avgTemperature: 25        // 平均温度25°C
};

const lfpResult = calculateBatteryDegradation(lfpParams);
console.log(`当前容量: ${lfpResult.currentCapacity.toFixed(2)} kWh`);
console.log(`健康度: ${lfpResult.health.toFixed(1)}%`);
console.log(`剩余寿命: ${lfpResult.remainingLife.toFixed(1)} 年`);

// NCM电池对比
const ncmParams = {
  ...lfpParams,
  batteryType: 'NCM',
  cycles: 500
};

const ncmResult = calculateBatteryDegradation(ncmParams);
console.log(`NCM健康度: ${ncmResult.health.toFixed(1)}%`);
console.log(`衰减成本: ¥${ncmResult.degradationCost.toFixed(2)}`);
```

---

## 维护建议

### 延长电池寿命的建议

1. **控制充放电深度**
   - 建议DOD控制在80%以下
   - 避免深度放电和过充

2. **温度管理**
   - 保持运行温度在10°C-35°C范围内
   - 避免高温环境（≥40°C）

3. **充放电策略**
   - 采用小电流充放电
   - 避免频繁的满充满放循环

4. **定期维护**
   - 定期检查电池状态
   - 及时更换衰减严重的电池组

---

## 相关算法模块

- [光储系统算法](../03-光储系统算法/README.md) - 储能优化集成

---

## 文件路径

- 主算法文件: `../ai-platform-algorithms.ts`
- 文档主页: `../README.md`
