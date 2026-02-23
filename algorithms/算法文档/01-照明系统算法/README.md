# 照明系统算法 (Lighting System Algorithms)

## 概述

照明系统算法用于评估建筑照明系统的节能潜力和投资回报率，支持从传统灯具到LED智能照明的升级评估。

---

## 函数列表

### `calculateLightingBaseline()` - 照明基准计算

计算照明系统的基准负荷和日耗电量。

#### 接口定义

```typescript
interface LightingSystemParams {
  area: number;              // 照明区域面积 (m²)
  totalPower: number;         // 现有灯具总功率 (kW)
  dailyHours: number;         // 每天运行时间 (小时)
  sensorDensity?: number;     // 传感器安装密度 (个/m²)，可选
}
```

#### 功能说明

- 计算基准负荷（单位：kW）
- 计算日耗电量（单位：kWh）
- 考虑人流量模式调整

#### 返回值

```typescript
{
  baselineLoad: number;      // 基准负荷 (kW)
  dailyConsumption: number;  // 日耗电量 (kWh)
  powerDensity: number;      // 功率密度 (W/m²)
}
```

---

### `calculateLightingSavings()` - 照明节能潜力计算

计算照明系统改造后的节能潜力和投资回报率。

#### 接口定义

```typescript
interface LightingSavingsParams {
  area: number;
  totalPower: number;
  dailyHours: number;
  sensorDensity?: number;
}
```

#### 返回值

| 参数 | 类型 | 说明 |
|------|------|------|
| `savingsKWh` | number | 年节电量 (kWh) |
| `savingsRate` | number | 节电率 (%) |
| `roi` | number | 投资回报率 (%) |

#### 计算依据

1. **LED升级节能**
   - 从白炽灯到LED的能效提升
   - 典型节能率：60-80%

2. **智能控制系统节能**
   - 光感+调光系统
   - 节能率：20-30%

3. **按需调光节能**
   - 根据自然光照自动调节
   - 根据人流量自动开关/调光
   - 额外节能：10-20%

---

## 相关常量

### 照明效率基准

| 光源类型 | 效率 (lm/W) | 说明 |
|---------|-------------|------|
| LED | 100 | LED灯具效率 |
| 荧光灯 | 60 | 荧光灯效率 |
| 白炽灯 | 15 | 白炽灯效率 |

### 智能控制系统节能率

| 控制方式 | 节能率 |
|---------|-------|
| 简单调光 | 15% |
| 光感控制 | 20% |
| 人感控制 | 25% |
| 综合智能控制 | 30% |

---

## 使用示例

```typescript
import {
  calculateLightingBaseline,
  calculateLightingSavings
} from '../ai-platform-algorithms';

// 计算基准负荷
const params = {
  area: 1000,      // 1000平方米
  totalPower: 20,   // 20kW
  dailyHours: 8,     // 每天8小时
  sensorDensity: 0.01 // 1个传感器/100平方米
};

const baseline = calculateLightingBaseline(params);
console.log(`基准负荷: ${baseline.baselineLoad} kW`);
console.log(`日耗电量: ${baseline.dailyConsumption} kWh`);

// 计算节能潜力
const oldSystem = {
  area: 1000,
  totalPower: 30,     // 原来30kW
  dailyHours: 10,     // 每天10小时
};

const savings = calculateLightingSavings(params, oldSystem);
console.log(`年节电量: ${savings.savingsKWh.toFixed(2)} kWh`);
console.log(`节电率: ${savings.savingsRate.toFixed(2)}%`);
console.log(`ROI: ${savings.roi.toFixed(2)}%`);
```

---

## 相关工具函数

| 函数名 | 功能 |
|--------|------|
| `getCitySunshineData()` | 获取城市日照数据 |
| `generateDefaultTrafficPattern()` | 生成默认人流量模式 |

---

## 文件路径

- 主算法文件: `../ai-platform-algorithms.ts`
- 文档主页: `../README.md`
