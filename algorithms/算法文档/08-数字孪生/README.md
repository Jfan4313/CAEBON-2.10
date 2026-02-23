# 数字孪生热建模 (Digital Twin Thermal Modeling)

## 概述

数字孪生热建模算法通过建立建筑热状态模型，模拟建筑在不同条件下的温度变化和能耗情况，为智能节能提供预测和优化基础。

---

## 函数列表

### `calculateDigitalTwinThermalModel()` - 建筑热状态模拟

模拟建筑24小时的热状态变化。

#### 接口定义

```typescript
interface BuildingParams {
  type: string;              // 建筑类型
  area: number;             // 建筑面积 (m²)
  orientation?: string;      // 建筑朝向
  insulationLevel?: string;  // 隔热等级
  glazingRatio?: number;     // 玻璃窗占比 (0-1)
  thermalMass?: number;     // 热质量 kJ/(m²·K)
}

interface DigitalTwinModel {
  building: {
    thermalZones: number;           // 热区数量
    thermalInertia: number;         // 热惯性 (小时)
    heatCapacity: number;          // 热容量 (kJ/K)
  };
  hvac: {
    responseTime: number;          // 响应时间（分钟）
    setpointDeadband: number;  // 设定点死区 (°C)
  };
  environment: {
    forecastHorizon: number;  // 预测时长（小时）
    predictionAccuracy: number; // 预测精度 (%)
  };
}

interface EnvironmentalFactors {
  outdoorTemp: number;        // 室外温度 (°C)
  humidity: number;          // 相对湿度 (%)
  solarIrradiance: number;  // 太阳辐射 (W/m²)
  windSpeed: number;        // 风速 (m/s)
  occupancy: number;        // 人员占用率 (0-1)
}
```

#### 返回值

```typescript
{
  thermalStates: {          // 24小时热状态
    hour: number;          // 小时
    indoorTemp: number;    // 室内温度 (°C)
    wallTemp: number;      // 墙体温度 (°C)
    thermalLoad: number;    // 热负荷 (kW)
    comfortLevel: string;  // 舒适度等级
  }[];
  totalLoad: number;       // 总负荷 (kWh)
  comfortMetrics: {        // 舒适度指标
    pmv: number;
    ppd: number;
    avgComfortHours: number;  // 舒适小时数
  };
}
```

---

## 热模型原理

### 热平衡方程

```
C × dT/dt = Q_gain - Q_loss + Q_hvac

其中:
- C: 建筑热容量 (kJ/K)
- dT/dt: 温度变化率 (K/s)
- Q_gain: 内部得热 (kW)
- Q_loss: 热损失 (kW)
- Q_hvac: 空调供热/供冷 (kW)
```

### 热惯性

| 热惯性 | 说明 | 保温能力 |
|--------|------|---------|
| 1-2h | 轻质建筑 | 低 |
| 2-4h | 中等建筑 | 中 |
| 4-6h | 重质建筑 | 高 |

---

## 模型参数

### 建筑类型参数

| 建筑类型 | 热导系数 K (W/(m²·K)) | 热质量 (kJ/(m²·K)) |
|---------|----------------------|-------------------|
| factory | 2.5 | 80 |
| school | 2.0 | 100 |
| office | 2.8 | 120 |
| hospital | 1.5 | 150 |
| mall | 1.8 | 90 |

### HVAC响应参数

| 参数 | 典型值 | 说明 |
|------|--------|------|
| responseTime | 15 min | 温度变化响应时间 |
| setpointDeadband | 1.0°C | 控制死区范围 |
| maxPower | 100 kW | 最大制冷/制热功率 |

---

## 热源计算

### 1. 内部得热

```
Q_internal = Q_people + Q_equipment + Q_lighting

其中:
- Q_people: 人员得热 = occupancy × 100 W/person
- Q_equipment: 设备得热 = occupancy × 50 W/person
- Q_lighting: 照明得热 = lighting_power × 0.9
```

### 2. 太阳辐射得热

```
Q_solar = I × A_glazing × SHGC × τ

其中:
- I: 太阳辐照度 (W/m²)
- A_glazing: 玻璃窗面积 (m²)
- SHGC: 遮阳系数
- τ: 玻璃透射率
```

### 3. 围护结构热损失

```
Q_loss = K × A × (T_in - T_out)

其中:
- K: 热导系数 (W/(m²·K))
- A: 围护结构面积 (m²)
- T_in: 室内温度 (°C)
- T_out: 室外温度 (°C)
```

---

## 使用示例

```typescript
import {
  calculateDigitalTwinThermalModel,
  calculateComfortMetrics
} from '../ai-platform-algorithms';

// 建筑参数
const buildingParams = {
  type: 'office',
  area: 1000,
  orientation: 'south',
  insulationLevel: 'average',
  glazingRatio: 0.3,
  thermalMass: 120
};

// 数字孪生模型配置
const thermalModel = {
  building: {
    thermalZones: 5,
    thermalInertia: 2,
    heatCapacity: 120000
  },
  hvac: {
    responseTime: 15,
    setpointDeadband: 1.0
  },
  environment: {
    forecastHorizon: 24,
    predictionAccuracy: 85
  }
};

// 环境因素（24小时数据）
const environmentalFactors = Array.from({ length: 24 }, (_, hour) => ({
  outdoorTemp: 25 + Math.sin((hour - 6) * Math.PI / 12) * 5,
  humidity: 60,
  solarIrradiance: hour >= 6 && hour <= 18 ?
    800 * Math.sin((hour - 6) * Math.PI / 12) : 0,
  windSpeed: 2,
  occupancy: hour >= 9 && hour <= 18 ? 0.8 : 0.1
}));

// 计算热模型
const result = calculateDigitalTwinThermalModel(
  buildingParams,
  environmentalFactors,
  thermalModel
);

console.log(`总负荷: ${result.totalLoad.toFixed(2)} kWh`);
console.log(`舒适小时数: ${result.comfortMetrics.avgComfortHours} 小时`);
console.log(`热状态时间序列:`);
result.thermalStates.forEach(state => {
  console.log(`  ${state.hour}点: 室温${state.indoorTemp.toFixed(1)}°C, ${state.comfortLevel}`);
});
```

---

## 应用场景

### 场景1：预冷策略

**原理**：利用热惯性，在电价低谷时段提前降低室温，减少峰值时段空调负荷

| 时段 | 策略 | 效益 |
|------|------|------|
| 0-6点（谷价）| 深度预冷至20°C | 降低峰时段负荷 |
| 10-14点（峰价）| 温度回升至24°C | 减少空调用电 |

### 场景2：舒适度优化

**原理**：根据预测模型调整设定温度，平衡舒适度和节能

| 条件 | 设定温度 | 原因 |
|------|---------|------|
| PMV < -1 | 升温至25°C | 过冷不舒适 |
| PMV > +1 | 降温至23°C | 过热不舒适 |
| -1 ≤ PMV ≤ +1 | 保持设定 | 舒适度良好 |

### 场景3：能耗预测

**原理**：基于历史数据和预测模型，预测未来24小时能耗

| 预测类型 | 用途 |
|---------|------|
| 短期（1-6小时）| 实时调度优化 |
| 中期（6-24小时）| 负荷计划制定 |
| 长期（1-7天）| 储能充放电计划 |

---

## 模型验证

### 验证指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 温度预测误差 | < 1°C | 预测精度 |
| 负荷预测误差 | < 10% | 能耗预测精度 |
| 舒适度准确率 | > 90% | PMV/PPD计算准确 |

### 验证方法

1. **历史数据回溯**
   - 使用历史气象数据
   - 对比实际温度和预测温度

2. **现场实测**
   - 安装温度传感器
   - 收集实际运行数据

3. **持续校准**
   - 定期更新模型参数
   - 提高预测精度

---

## 相关算法模块

- [舒适度计算](../05-舒适度计算/README.md) - PMV/PPD计算
- [暖通空调算法](../02-暖通空调算法/README.md) - 空调负荷计算

---

## 文件路径

- 主算法文件: `../ai-platform-algorithms.ts`
- 文档主页: `../README.md`
