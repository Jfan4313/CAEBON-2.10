# 光储系统算法 (Solar & Storage System Algorithms)

## 概述

光储系统算法用于评估光伏发电和储能系统的运行效率及经济效益，支持发电量预测、储能充放电优化等功能。

---

## 函数列表

### `calculateSolarGeneration()` - 光伏发电量计算

计算光伏系统的日发电量和年发电量。

#### 接口定义

```typescript
interface SolarStorageSystemParams {
  pvCapacity: number;              // 光伏装机容量 (kWp)
  storageCapacity: number;         // 储能容量 (kWh)
  storagePower: number;            // 储能功率 (kW)
  roundTripEfficiency: number;    // 往返效率 (%)
  dod: number;                    // 最大充放电深度 (%)
  cyclesPerDay: number;          // 储能年循环次数
  batteryType?: string;          // 电池类型：LFP/NCM/铅酸
  batteryAge?: number;           // 电池使用年限（年）
  degradationRate?: number;     // 电池衰减率 (%/年)
}
```

#### batteryType 枚举值

| 类型 | 全称 | 说明 |
|------|------|------|
| `'LFP'` | 磷酸铁锂 | 衰减率低，寿命长 |
| `'NCM'` | 三元锂 | 衰减率中等，寿命中等 |
| `'LeadAcid'` | 铅酸电池 | 衰减率高，寿命短 |

#### 功能说明

- 计算日发电量（单位：kWh）
- 计算年发电量（单位：kWh）
- 考虑城市日照数据（20+城市）
- 考虑天气条件（云量、温度、太阳辐射）

---

### `calculateStorageOptimization()` - 储能充放电优化

计算储能系统的最优充放电策略。

#### 接口定义

```typescript
interface PriceCurve {
  hourlyPrices: number[];  // 24小时电价数组 (元/kWh)
}
```

#### 返回值

| 参数 | 类型 | 说明 |
|------|------|------|
| `optimalSchedule` | number[] | 最优充放电计划（24小时，负数=充电，正数=放电）|
| `annualArbitrage` | number | 年套利收益（元）|

#### 计算依据

- **电价曲线分析**：峰谷平价时段识别
- **充放电策略**：
  - 谷时充电：利用低电价时段
  - 峰时放电：高价时段放电套利
  - 平时空闲：保持容量或小幅调整

---

## 相关常量

### 光储性能参数

| 参数 | 值 | 说明 |
|------|-----|------|
| `pvTempCoefficient` | 0.0045 | 光伏组件温度系数 (-0.45%/°C) |
| `storageTempCoefficient` | 0.002 | 储能温度系数 (-0.2%/°C) |
| `inverterEfficiency` | 0.97 | 逆变器效率 (97%) |
| `systemLoss` | 0.02 | 系统线路损耗 (2%) |

### 城市日照数据（部分）

| 城市 | 年日照时数 (小时) |
|------|----------------|
| 北京 | 1650 |
| 上海 | 1420 |
| 广州 | 1580 |
| 深圳 | 1720 |
| 成都 | 1250 |
| 昆明 | 2100 |

### 电池衰减率对比

| 电池类型 | 衰减率 (%/1000次循环) | 寿命 (年) |
|---------|---------------------|----------|
| LFP | 2 | 15-20 |
| NCM | 3 | 8-12 |
| 铅酸 | 5 | 3-5 |

---

## 使用示例

```typescript
import {
  calculateSolarGeneration,
  calculateStorageOptimization,
  generateDefaultPriceCurve
} from '../ai-platform-algorithms';

// 光储系统参数
const solarStorageParams = {
  pvCapacity: 100,           // 100kW光伏
  storageCapacity: 200,      // 200kWh储能
  storagePower: 100,         // 100kW功率
  roundTripEfficiency: 90,
  dod: 90,
  cyclesPerDay: 1,
  batteryType: 'LFP',
  batteryAge: 0,
  degradationRate: 2
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

// 计算发电量
const solarGen = calculateSolarGeneration(solarStorageParams, envFactors);
console.log(`日发电量: ${solarGen.dailyGeneration.toFixed(2)} kWh`);
console.log(`年发电量: ${solarGen.annualGeneration.toFixed(2)} kWh`);

// 计算储能优化
const storageOpt = calculateStorageOptimization(solarStorageParams, priceCurve);
console.log(`最优充放电计划: ${storageOpt.optimalSchedule}`);
console.log(`年套利收益: ${storageOpt.annualArbitrage.toFixed(2)} 元`);
```

---

## 相关工具函数

| 函数名 | 功能 |
|--------|------|
| `getCitySunshineData()` | 获取城市日照数据 |
| `generateDefaultPriceCurve()` | 生成默认电价曲线 |
| `calculateBatteryDegradation()` | 计算电池衰减 |

---

## 文件路径

- 主算法文件: `../ai-platform-algorithms.ts`
- 文档主页: `../README.md`
