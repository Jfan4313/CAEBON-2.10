# PMV/PPD 舒适度计算 (Thermal Comfort Algorithms)

## 概述

PMV（Predicted Mean Vote，预测平均投票值）和PPD（Predicted Percentage of Dissatisfied，预测不满意百分比）是国际标准ISO 7730定义的热舒适度评价指标，用于评估室内环境的热舒适程度。

---

## 函数列表

### `calculatePMV()` - PMV（预测平均投票值）

计算热感觉的平均投票值。

#### 接口定义

```typescript
interface ComfortMetrics {
  airTemperature: number;    // 空气温度 (°C)
  meanRadiantTemp: number;   // 平均辐射温度 (°C)
  humidity: number;          // 相对湿度 (%)
  airVelocity: number;        // 空气流速 (m/s)
  clothing: number;          // 服装热阻 (clo)
  metabolicRate: number;     // 新陈代谢率 (met)
}
```

#### 返回值

| 类型 | 范围 | 说明 |
|------|------|------|
| number | -3 到 +3 | PMV值 |

#### PMV 值含义

| PMV值 | 热感觉 | PPD (%) |
|--------|--------|---------|
| -3 | 冷 | 91% |
| -2 | 凉 | 75% |
| -1 | 微凉 | 27% |
| 0 | 中性（舒适）| 5% |
| +1 | 微暖 | 27% |
| +2 | 暖 | 75% |
| +3 | 热 | 91% |

#### 功能说明

- 基于Fanger方程计算PMV值
- 考虑6个热舒适影响因素：
  - 空气温度
  - 平均辐射温度
  - 相对湿度
  - 空气流速
  - 服装热阻
  - 新陈代谢率

---

### `calculatePPD()` - PPD（预测不满意百分比）

根据PMV值计算预测不满意百分比。

#### 接口定义

```typescript
function calculatePPD(pmv: number): number
```

#### 返回值

| 类型 | 范围 | 说明 |
|------|------|------|
| number | 0-100% | 预测不满意百分比 |

#### 计算公式

```
PPD = 100 - 95 × exp(-0.03353 × PMV² - 0.2179 × PMV⁴)
```

---

### `calculateComfortMetrics()` - 舒适度指标综合

计算完整的舒适度指标。

#### 接口定义

```typescript
interface ComfortMetrics {
  pmv: number;                    // PMV值 (-3 to +3)
  ppd: number;                    // PPD值 (0-100%)
  setpointTemperature: number;       // 设定点温度 (°C)
  humidity: number;                // 湿度 (%)
  airVelocity: number;              // 空气流速 (m/s)
  cloValue: number;                // 服装热阻 (clo)
  metValue: number;                // 新陈代谢率 (met)
}
```

#### 返回值

```typescript
{
  pmv: number;                    // PMV值
  ppd: number;                    // PPD值
  comfortLevel: string;            // 舒适度等级
  recommendations: string[];         // 舒适度建议
}
```

#### 舒适度等级

| PMV范围 | 舒适度等级 | 说明 |
|---------|-----------|------|
| -3 ≤ PMV < -1 | "偏冷" | 需要增加供暖或减少通风 |
| -1 ≤ PMV ≤ +1 | "舒适" | 符合舒适度标准 |
| +1 < PMV ≤ +3 | "偏热" | 需要增加降温或通风 |

---

## 参考数值

### 服装热阻 (clo值)

| 服装类型 | clo值 | 说明 |
|---------|-------|------|
| 裤子+短袖衬衫 | 0.5 | 夏季标准办公着装 |
| 长裤+长袖衬衫 | 0.7 | 春秋季标准办公着装 |
| 薄毛衣+外套 | 1.0 | 冬季标准办公着装 |
| 厚毛衣+大衣 | 1.5 | 冬季室外着装 |

### 新陈代谢率 (met值)

| 活动类型 | met值 | 说明 |
|---------|-------|------|
| 静坐休息 | 0.8 | 典型办公状态 |
| 轻度活动（打字） | 1.0 | 典型办公工作 |
| 中度活动（走动） | 1.5 | 会议、讲解 |
| 重度活动（搬运） | 2.0 | 体力劳动 |

---

## 使用示例

```typescript
import {
  calculatePMV,
  calculatePPD,
  calculateComfortMetrics
} from '../ai-platform-algorithms';

// 计算PMV值
const metrics = {
  airTemperature: 24,       // 室温24°C
  meanRadiantTemp: 24,      // 辐射温度24°C
  humidity: 50,              // 湿度50%
  airVelocity: 0.1,         // 风速0.1 m/s
  clothing: 0.7,            // 办公着装
  metabolicRate: 1.0        // 办公活动
};

const pmv = calculatePMV(metrics);
console.log(`PMV值: ${pmv.toFixed(2)}`);

// 计算PPD值
const ppd = calculatePPD(pmv);
console.log(`PPD值: ${ppd.toFixed(1)}%`);

// 计算综合舒适度指标
const comfort = calculateComfortMetrics(metrics);
console.log(`舒适度等级: ${comfort.comfortLevel}`);
console.log(`优化建议:`);
comfort.recommendations.forEach(rec => console.log(`  - ${rec}`));
```

---

## 标准参考

- **ISO 7730**: 热环境的人体工程学标准
- **ASHRAE 55**: 热舒适度标准
- **GB/T 18049**: 中性热环境测量与计算标准

---

## 相关算法模块

- [数字孪生热建模](../08-数字孪生/README.md) - 舒适度评估集成

---

## 文件路径

- 主算法文件: `../ai-platform-algorithms.ts`
- 文档主页: `../README.md`
