# 强化学习优化 (Reinforcement Learning Optimization)

## 概述

强化学习（RL）优化算法使用DQN（Deep Q-Network）等深度强化学习方法，通过与环境交互学习最优的能源管理策略，实现运行成本最小化。

---

## 函数列表

### `runRLOptimization()` - 简化版DQN强化学习

运行强化学习优化算法，学习最优的能源调度策略。

#### 接口定义

```typescript
interface RLConfig {
  algorithm: 'dqn' | 'ppo' | 'sac';  // 算法类型
  learningRate: number;                 // 学习率
  discountFactor: number;            // 折扣因子
  explorationRate: number;            // 探索率
  batchSize: number;                 // 批次大小
  trainingEpisodes: number;          // 训练回合数
  rewardFunction: 'cost' | 'emission' | 'multi-objective';  // 奖励函数
}

interface RLEnvironment {
  hourlyLoad: number[];           // 24小时负荷 (kW)
  hourlyPrice: number[];          // 24小时电价 (元/kWh)
  hourlyTemp: number[];           // 24小时温度 (°C)
  systemConstraints: {
    maxStoragePower: number;       // 储能最大功率 (kW)
    maxStorageCapacity: number;    // 储能容量 (kWh)
    maxHVACPower: number;        // 空调最大功率 (kW)
  };
}
```

#### algorithm 枚举值

| 算法 | 全称 | 特点 |
|------|------|------|
| `'dqn'` | Deep Q-Network | 基于值函数，稳定收敛 |
| `'ppo'` | Proximal Policy Optimization | 基于策略，学习快 |
| `'sac'` | Soft Actor-Critic | 高样本效率 |

#### rewardFunction 枚举值

| 类型 | 说明 | 优化目标 |
|------|------|---------|
| `'cost'` | 仅考虑成本 | 最小化运行成本 |
| `'emission'` | 仅考虑排放 | 最小化碳排放 |
| `'multi-objective'` | 多目标优化 | 平衡成本和排放 |

#### 返回值

```typescript
{
  optimalPolicy: number[];       // 最优策略（24小时动作）
  cumulativeReward: number;      // 累计奖励
  averageReward: number;        // 平均奖励
  episodes: number;            // 训练回合数
  loss: number;                // 训练损失
  convergence: boolean;         // 是否收敛
}
```

---

## RL算法原理

### DQN（Deep Q-Network）

**核心思想**：使用神经网络逼近Q函数，学习状态-动作值映射

```
Q(s, a) ≈ r + γ × max_a' Q(s', a')

其中:
- s: 当前状态
- a: 动作
- r: 奖励
- γ: 折扣因子
- s': 下一状态
```

**关键组件**：

1. **经验回放（Experience Replay）**
   - 存储(s, a, r, s')元组
   - 随机采样训练，打破相关性

2. **目标网络（Target Network）**
   - 固定的目标网络参数
   - 提高训练稳定性

3. **探索策略（ε-greedy）**
   - 以ε概率随机探索
   - 以(1-ε)概率选择最优动作

---

## 状态空间

### 状态向量

```typescript
state = [
  hourLoad,          // 当前负荷 (kW)
  hourPrice,         // 当前电价 (元/kWh)
  hourTemp,          // 当前温度 (°C)
  storageSoc,        // 储能SOC (%)
  hvacSetpoint,      // 空调设定温度 (°C)
  nextHourPrice,      // 下一小时电价
  nextHourTemp       // 下一小时温度
]
```

### 状态离散化

| 连续变量 | 离散化方法 |
|---------|-----------|
| 负荷 | 分为10档（0-10, 10-20, ...）|
| 电价 | 分为5档（谷、平、峰、尖峰）|
| 温度 | 分为7档（18°C-24°C，每1°C一档）|

---

## 动作空间

### 动作定义

| 动作编号 | 动作说明 | 对应操作 |
|---------|---------|---------|
| 0 | 储能放电-10% | 从储能放电，功率=最大功率×0.1 |
| 1 | 储能放电0% | 不充放电 |
| 2 | 储能充电+10% | 向储能充电，功率=最大功率×0.1 |
| 3 | 空调降温1°C | 降低设定温度1°C |
| 4 | 空调降温0°C | 保持设定温度 |
| 5 | 空调升温1°C | 提高设定温度1°C |
| 6 | 照明调暗10% | 降低照明功率10% |
| 7 | 照明不变 | 保持照明功率 |
| 8 | 照明调亮10% | 提高照明功率10% |

### 动作约束

```typescript
// 储能SOC约束
if (storageSoc < 10 && action === 'discharge') {
  action = 'idle';  // SOC过低，禁止放电
}

// 储能SOC约束
if (storageSoc > 90 && action === 'charge') {
  action = 'idle';  // SOC过高，禁止充电
}
```

---

## 奖励函数设计

### 奖励1：成本优化

```typescript
function calculateReward(state, action, nextState) {
  const powerChange = calculatePowerChange(action);
  const cost = powerChange * state.hourPrice;

  // 惩罚项
  let penalty = 0;
  if (nextState.storageSoc < 10) penalty -= 100;  // SOC过低
  if (nextState.storageSoc > 90) penalty -= 100;  // SOC过高
  if (Math.abs(nextState.hvacSetpoint - 24) > 2) {
    penalty -= 50;  // 温度偏离舒适区
  }

  return -cost + penalty;
}
```

### 奖励2：排放优化

```typescript
function calculateEmissionReward(state, action) {
  const powerChange = calculatePowerChange(action);
  const emissionFactor = state.hour < 8 || state.hour > 20 ? 0.3 : 0.8;

  const emission = powerChange * emissionFactor;
  return -emission;
}
```

### 奖励3：多目标优化

```typescript
function calculateMultiObjectiveReward(state, action, nextState) {
  const costReward = calculateCostReward(state, action, nextState);
  const emissionReward = calculateEmissionReward(state, action);

  // 加权组合
  const weightCost = 0.6;     // 成本权重
  const weightEmission = 0.4;  // 排放权重

  return weightCost * costReward + weightEmission * emissionReward;
}
```

---

## 使用示例

```typescript
import { runRLOptimization, generateDefaultPriceCurve } from '../ai-platform-algorithms';

// 强化学习配置
const rlConfig = {
  algorithm: 'dqn',
  learningRate: 0.001,
  discountFactor: 0.99,
  explorationRate: 0.1,
  batchSize: 32,
  trainingEpisodes: 1000,
  rewardFunction: 'cost'
};

// 环境配置
const environment = {
  hourlyLoad: [10, 8, 7, 6, 6, 7, 9, 12, 15, 18, 20, 19, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6],
  hourlyPrice: generateDefaultPriceCurve({
    peakPrice: 1.2,
    valleyPrice: 0.35,
    flatPrice: 0.6
  }).hourlyPrices,
  hourlyTemp: [22, 21, 21, 20, 20, 21, 23, 25, 27, 28, 29, 29, 28, 27, 26, 25, 24, 23, 22, 21, 21, 20, 20, 20],
  systemConstraints: {
    maxStoragePower: 50,
    maxStorageCapacity: 200,
    maxHVACPower: 100
  }
};

// 运行强化学习优化
const result = runRLOptimization(rlConfig, environment);

console.log(`最优策略: ${result.optimalPolicy}`);
console.log(`累计奖励: ${result.cumulativeReward.toFixed(2)}`);
console.log(`平均奖励: ${result.averageReward.toFixed(2)}`);
console.log(`训练回合: ${result.episodes}`);
console.log(`是否收敛: ${result.convergence ? '是' : '否'}`);
```

---

## 算法对比

| 算法 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| DQN | 稳定收敛、实现简单 | 样本效率低 | 离散动作空间 |
| PPO | 学习快、策略稳定 | 超参数敏感 | 连续动作空间 |
| SAC | 高样本效率 | 实现复杂 | 高维状态空间 |

---

## 训练技巧

### 1. 超参数调优

| 参数 | 推荐范围 | 说明 |
|------|---------|------|
| learningRate | 1e-4 ~ 1e-3 | 学习率 |
| discountFactor | 0.95 ~ 0.99 | 折扣因子 |
| explorationRate | 0.05 ~ 0.3 | 初始探索率 |
| batchSize | 32 ~ 128 | 批次大小 |

### 2. 奖励函数设计

- 奖励要可微分
- 避免奖励稀疏
- 加入合理的惩罚项

### 3. 经验回放

- 经验缓冲区大小：10000-50000
- 采样方式：优先采样或随机采样

---

## 相关算法模块

- [综合优化算法](../04-综合优化算法/README.md) - 传统优化方法
- [数字孪生](../08-数字孪生/README.md) - 环境模型

---

## 文件路径

- 主算法文件: `../ai-platform-algorithms.ts`
- 文档主页: `../README.md`
