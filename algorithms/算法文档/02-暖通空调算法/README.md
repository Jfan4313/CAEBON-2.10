# 暖通空调系统算法 (HVAC System Algorithms)

## 概述

暖通空调（HVAC）系统算法用于评估空调系统的节能潜力和运行效率，支持从传统空调到高效变频系统的升级评估。

---

## 函数列表

### `calculateHVACBaseline()` - 空调基准计算

计算空调系统的制冷负荷和基准能耗。

#### 接口定义

```typescript
interface HVACSystemParams {
  area: number;                    // 空调区域面积 (m²)
  currentCOP: number;              // 当前COP值
  targetCOP: number;               // 目标COP值（改造后）
  annualCoolingHours: number;      // 每年制冷时长（小时）
  buildingType?: string;           // 围护结构类型
  freshAirEfficiency?: number;      // 新风系统效率
  controllerType?: string;          // 控制器类型：on-off/vrf/chiller
  humidityControl?: boolean;        // 湿度控制
  coolingCapacity?: number;         // 制冷容量 (kW)
}
```

#### buildingType 枚举值

| 类型 | 说明 |
|------|------|
| `'standard'` | 标准建筑 |
| `'insulated'` | 保温建筑 |
| `'high-performance'` | 高性能建筑 |

#### controllerType 枚举值

| 类型 | 说明 |
|------|------|
| `'on-off'` | 开关控制 |
| `'vrf'` | 变频多联机 |
| `'chiller'` | 冷水机组 |

#### 功能说明

- 计算制冷负荷（单位：kW）
- 计算基准负荷（单位：kW）
- 考虑建筑热导系数
- 考虑季节变化
- 考虑人流量影响

---

### `calculateHVACSavings()` - 空调节能潜力计算

计算空调系统改造后的节能潜力和投资回报率。

#### 返回值

| 参数 | 类型 | 说明 |
|------|------|------|
| `savingsKWh` | number | 年节电量 (kWh) |
| `copImprovement` | number | COP提升率 (%) |
| `roi` | number | 投资回报率 (%) |

#### 计算依据

1. **COP提升带来的节能**
   - COP（能效比）从2.8提升到4.5，节能约37%
   - 变频比定频节能约30%

2. **新风系统节能**
   - 热回收新风系统节能约20%
   - 按需通风节能约15%

3. **按需控制节能**
   - 根据人流量自动调节风量
   - 节能约10-25%

---

## 相关常量

### 建筑热导系数

| 建筑类型 | 热导系数 K (W/(m²·K)) | 说明 |
|---------|----------------------|------|
| factory | 2.5 | 标准工厂墙体 |
| school | 2.0 | 学校教室结构 |
| office | 2.8 | 办公建筑 |
| hospital | 1.5 | 医院保温较好 |
| mall | 1.8 | 商场玻璃较多 |

### 空调能效参数

| 参数 | 值 | 说明 |
|------|-----|------|
| `equipmentEfficiencyFactor` | 0.85 | 制冷设备能效系数 (0-1) |
| `ductLossFactor` | 0.9 | 管道热损失系数 (0-1) |
| `systemDesignMargin` | 0.15 | 系统设计余量 (15%) |
| `partialLoadFactor` | 0.7 | 部分负荷系数 (0-1) |

### 季节系数

| 季节 | 负荷系数 | 空调负荷乘数 |
|-----|---------|-------------|
| 春季(3-5月) | 0.9 | 1.1 |
| 夏季(6-8月) | 1.2 | 1.4 |
| 秋季(9-11月) | 1.0 | 1.1 |
| 冬季(12-2月) | 0.8 | 0.85 |

---

## 使用示例

```typescript
import {
  calculateHVACBaseline,
  calculateHVACSavings
} from '../ai-platform-algorithms';

// 计算基准负荷
const hvacParams = {
  area: 2000,
  currentCOP: 2.8,
  targetCOP: 4.5,
  annualCoolingHours: 1200,
  buildingType: 'office',
  freshAirEfficiency: 0.85,
  controllerType: 'vrf',
  humidityControl: false
};

const baseline = calculateHVACBaseline(hvacParams);
console.log(`制冷负荷: ${baseline.coolingLoad} kW`);
console.log(`基准负荷: ${baseline.baselineLoad} kW`);

// 计算节能潜力
const result = calculateHVACSavings(hvacParams, hvacParams);
console.log(`年节电量: ${result.savingsKWh.toFixed(2)} kWh`);
console.log(`COP提升: ${result.copImprovement.toFixed(2)}%`);
console.log(`ROI: ${result.roi.toFixed(2)}%`);
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
