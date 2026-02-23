# AI平台算法库使用说明

## 📁 概述

本算法库提供完整的AI管理平台算法实现，涵盖照明、暖通空调、光储充系统的智能优化功能，包括强化学习、数字孪生建模、V2G交互、PMV/PPD舒适度计算、电池衰减分析等高级功能。

---

## 📦 文件结构

```
algorithms/
├── ai-platform-algorithms.ts    # 主算法库文件
├── algorithm-demo.ts            # 演示文件
├── 算法说明文档.md             # 原始文档
└── 算法文档/                  # 分模块文档（本目录）
    ├── 01-照明系统算法/
    ├── 02-暖通空调算法/
    ├── 03-光储系统算法/
    ├── 04-综合优化算法/
    ├── 05-舒适度计算/
    ├── 06-电池衰减计算/
    ├── 07-V2G优化/
    ├── 08-数字孪生/
    ├── 09-强化学习/
    ├── 10-基础数据/
    └── 11-使用示例/
```

---

## 📦 快速开始

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
} from './ai-platform-algorithms';
```

---

## 📚 模块列表

### 1. [照明系统算法](./01-照明系统算法/README.md)

照明系统节能评估和优化，包括：
- 照明基准计算
- LED升级节能评估
- 智能控制系统节能

### 2. [暖通空调算法](./02-暖通空调算法/README.md)

空调系统节能评估和优化，包括：
- 制冷负荷计算
- COP提升节能评估
- 变频系统优化

### 3. [光储系统算法](./03-光储系统算法/README.md)

光伏发电和储能优化，包括：
- 光伏发电量预测
- 储能充放电策略
- 套利收益计算

### 4. [综合优化算法](./04-综合优化算法/README.md)

多系统协同优化，包括：
- 照明-空调-光储协同
- 负荷曲线优化
- 智能调度建议

### 5. [舒适度计算](./05-舒适度计算/README.md)

PMV/PPD热舒适度评估，包括：
- PMV（预测平均投票值）计算
- PPD（预测不满意百分比）计算
- 舒适度等级评定

### 6. [电池衰减计算](./06-电池衰减计算/README.md)

电池健康状态评估，包括：
- 电池容量衰减计算
- 健康度评估
- 电池类型对比

### 7. [V2G优化](./07-V2G优化/README.md)

车网互动优化，包括：
- 充放电调度策略
- 套利收益优化
- 电池保护管理

### 8. [数字孪生](./08-数字孪生/README.md)

建筑热状态模拟，包括：
- 热平衡建模
- 温度预测
- 舒适度评估

### 9. [强化学习](./09-强化学习/README.md)

深度强化学习优化，包括：
- DQN/PPO/SAC算法
- 状态-动作空间定义
- 奖励函数设计

### 10. [基础数据](./10-基础数据/README.md)

参考数据常量，包括：
- 城市日照数据（20+城市）
- 建筑热导系数
- 季节系数
- 时间段定义

### 11. [使用示例](./11-使用示例/README.md)

完整使用示例，包括：
- 照明系统改造评估
- 暖通空调系统优化
- 光储系统综合评估
- 综合优化多系统协同
- V2G车辆调度优化

---

## 📊 集成进度

- ✅ Phase 1 - 语法错误修复（4处）
- ✅ Phase 2 - 接口扩展（10个新接口）
- ✅ Phase 3 - 高级算法实现（7个函数）
- ✅ Phase 4 - 文档模块化（11个独立模块）
- ✅ 文件可编译，无TypeScript错误

---

## 📞 后续集成

当算法成熟后，可将这些算法集成到 `RetrofitAI.tsx` 组件中，实现：

1. **参数输入界面**
   - 绑定算法参数
   - 表单验证

2. **实时计算**
   - 动态计算
   - 实时可视化

3. **智能优化建议**
   - 输出优化建议
   - 对比分析

4. **多情景分析**
   - 情景模拟
   - 方案对比

---

## 🔧 开发指南

### 添加新算法

1. 在 `ai-platform-algorithms.ts` 中添加函数实现
2. 更新对应的模块文档
3. 添加使用示例到 `11-使用示例/README.md`
4. 更新本文档的模块列表

### 更新基础数据

1. 在 `10-基础数据/README.md` 中更新数据表
2. 更新数据来源说明
3. 验证数据准确性

### 文档规范

- 使用清晰的标题层级
- 提供完整的接口定义
- 包含使用示例
- 说明参数含义和范围

---

## 📞 技术支持

算法库已准备就绪，随时可以使用！

如有问题，请参考各模块详细文档或查看使用示例。

---

## 📝 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-02-18 | 初始版本，完成所有基础模块 |
