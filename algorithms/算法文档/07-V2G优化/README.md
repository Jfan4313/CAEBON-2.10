# V2G 车辆交互优化 (V2G Optimization Algorithms)

## 概述

V2G（Vehicle-to-Grid，车网互动）优化算法用于管理电动汽车作为移动储能设备的调度策略，实现电网与车辆之间的能量双向流动。

---

## 函数列表

### `calculateV2GOptimization()` - V2G最优调度策略

计算V2G设备的最优充放电调度策略。

#### 接口定义

```typescript
interface V2GDevice {
  id: string;                              // 设备ID
  capacity: number;                        // 电池容量 (kWh)
  maxPower: number;                        // 最大充放电功率 (kW)
  currentSoc: number;                      // 当前SOC (%)
  availableHours: Array<[number, number]>;   // 可放电时段 [[开始, 结束], ...]
  degradationCost?: number;                  // 电池衰减成本（元/kWh）
  userPriority: string;                     // 用户优先级
}
```

#### userPriority 枚举值

| 类型 | 说明 | 可调度性 |
|------|------|---------|
| `'low'` | 低优先级 | 高度可调度 |
| `'medium'` | 中优先级 | 中度可调度 |
| `'high'` | 高优先级 | 低度可调度 |

#### 返回值

```typescript
{
  optimalSchedule: {      // 最优调度计划
    hour: number;      // 小时 (0-23)
    action: 'charge' | 'discharge' | 'idle';  // 动作
    power: number;     // 功率 (kW)
  }[];
  totalRevenue: number;       // 总收益（元）
  energyTransferred: number;  // 能量吞吐量 (kWh)
  recommendations: string[];  // 调度建议
}
```

---

## 优化策略

### 策略1：谷时充电

**原理**：在电价低谷时段充电，降低充电成本

| 时段 | 电价 | 策略 |
|------|------|------|
| 0:00-8:00 | 谷价 | 优先充电 |
| 22:00-24:00 | 谷价 | 延后充电 |

### 策略2：峰时放电

**原理**：在电价峰值时段向电网放电，获取收益

| 时段 | 电价 | 策略 |
|------|------|------|
| 10:00-12:00 | 峰价 | 放电套利 |
| 14:00-17:00 | 峰价 | 放电套利 |
| 12:00-14:00 | 尖峰价 | 最大放电 |

### 策略3：优先级管理

**用户优先级影响**：

| 优先级 | 充电保证 | 放电允许 |
|--------|---------|---------|
| low | 基础保证 | 完全允许 |
| medium | 基础保证 | 部分限制 |
| high | 优先保证 | 严格限制 |

---

## 成本收益模型

### 充电成本

```
chargeCost = energy × price × chargeEfficiency
```

### 放电收益

```
dischargeRevenue = energy × price × dischargeEfficiency - degradationCost
```

### 净收益

```
netRevenue = dischargeRevenue - chargeCost
```

---

## 调度示例

### 场景：家用储能式V2G

```typescript
import { calculateV2GOptimization, generateDefaultPriceCurve } from '../ai-platform-algorithms';

// V2G设备参数
const v2gDevice = {
  id: 'EV001',
  capacity: 60,           // 60kWh电池容量
  maxPower: 11,          // 11kW充放电功率
  currentSoc: 50,        // 当前SOC 50%
  availableHours: [
    [0, 8],      // 0-8点可充电
    [10, 12],    // 10-12点可放电
    [14, 17],    // 14-17点可放电
    [18, 24]     // 18-24点可充电
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

// 计算V2G优化
const result = calculateV2GOptimization(v2gDevice, priceCurve);
console.log(`最优调度计划:`);
result.optimalSchedule.forEach(item => {
  console.log(`  ${item.hour}点: ${item.action} ${item.power}kW`);
});
console.log(`总收益: ¥${result.totalRevenue.toFixed(2)}`);
console.log(`能量吞吐: ${result.energyTransferred.toFixed(2)} kWh`);
```

### 输出示例

```
最优调度计划:
  0点: charge 11.0kW
  1点: charge 11.0kW
  2点: charge 11.0kW
  ...
  10点: discharge 11.0kW
  11点: discharge 11.0kW
  12点: discharge 11.0kW
  ...
总收益: ¥45.80
能量吞吐: 85.5 kWh
```

---

## 调度建议

算法会根据分析结果输出调度建议：

1. **充电时机**
   - 建议充电时段
   - 充电功率建议

2. **放电时机**
   - 最佳放电时段
   - 放电功率建议

3. **电池保护**
   - SOC管理建议
   - 避免深度放电

4. **收益优化**
   - 最佳套利策略
   - 收益最大化方案

---

## V2G应用场景

### 场景1：家用储能

- 用途：家庭储能备用
- 特点：夜间充电、白天放电
- 优势：降低电费、提供备用电源

### 场景2：商用停车场

- 用途：车队调度管理
- 特点：统一充电、集中放电
- 优势：电网调峰、降低运营成本

### 场景3：公共充电站

- 用途：公共服务设施
- 特点：随机性强、动态调度
- 优势：电网服务收益、充电站收益

---

## 技术挑战

1. **电池寿命**
   - 频繁充放电影响寿命
   - 需要优化充放电深度

2. **用户行为**
   - 行车时间的不确定性
   - 需要智能预测

3. **电网交互**
   - 并网技术要求
   - 通信协议标准

4. **经济模型**
   - 电价波动风险
   - 收益不确定性

---

## 相关算法模块

- [光储系统算法](../03-光储系统算法/README.md) - 储能优化基础
- [电池衰减计算](../06-电池衰减计算/README.md) - 电池健康评估

---

## 文件路径

- 主算法文件: `../ai-platform-algorithms.ts`
- 文档主页: `../README.md`
