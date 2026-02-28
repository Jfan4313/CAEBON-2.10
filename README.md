# 零碳项目收益评估软件

> Electron + React 桌面应用，用于零碳项目的投资收益评估和分析

## 项目概述

零碳项目收益评估软件是一款专业的桌面应用程序，帮助用户评估光伏、储能、空调、照明、充电桩、微电网等零碳项目的投资收益。软件支持多种计算模型、可视化分析和报告导出。

**项目状态**: 基本功能完成，部分高级功能待完善

**当前版本**: 1.0.0

---

## 架构与扩展规范 (Architecture & Expansion Guide)

本项目将随业务增长不断扩展新的零碳板块（如风储、地热等）。为避免代码成为巨无霸，后续的组件与功能开发**必须**严格遵循**基于业务板块拆分 (Feature-Based / Domain-Driven)** 的原则：

1. **按板块组织代码**：未来的所有新板块不应再将所有的组件、Hook、UI 杂糅在 `components/` 根目录中。请一律向 `src/modules/{feature-name}/` 目录结构靠拢。内部应包含各自的 `components/`, `hooks.ts`, `types.ts`。
2. **Context 解耦**：全局的 `ProjectContext` 现已拆解为 `AppContext`, `ModuleContext`, `ConfigContext`。局部状态请在板块内部（Local State）内聚，避免污染全局刷新和引发性能问题。
3. **AI 开发准则参考**：更多详细架构约束和提供给 AI（Claude/GPT）的系统级 Prompt 要求，请务必参考根目录下的 [`claude.md`](./claude.md)。

---

## 已完成功能

### 核心模块 (100% 完成)

| 模块 | 功能 | 文件位置 |
|------|------|----------|
| **Dashboard** | 项目概览、关键指标展示 | `components/Dashboard.tsx` |
| **ProjectEntry** | 项目基础信息录入、建筑设备清单 | `components/ProjectEntry.tsx` |
| **PriceConfig** | 电价配置（分时/固定/动态） | `components/PriceConfig.tsx` |
| **RetrofitSolar** | 光伏系统投资收益分析 (已重构) | `modules/solar/` |
| **RetrofitStorage** | 储能系统套利计算 | `components/RetrofitStorage.tsx` |
| **RetrofitHVAC** | 暖通空调节能收益分析 | `components/RetrofitHVAC.tsx` |
| **RetrofitLighting** | 智能照明节能改造评估 | `components/RetrofitLighting.tsx` |
| **RetrofitWater** | 热水系统节能评估 | `components/RetrofitWater.tsx` |
| **RetrofitEV** | 充电桩运营收益分析 | `components/RetrofitEV.tsx` |
| **RetrofitMicrogrid** | 微电网可视化（Canvas交互） | `components/RetrofitMicrogrid.tsx` |
| **RetrofitVPP** | 虚拟电厂分析 | `components/RetrofitVPP.tsx` |
| **RetrofitAI** | AI智控平台收益评估 | `components/RetrofitAI.tsx` |
| **RetrofitCarbon** | 碳资产管理 | `components/RetrofitCarbon.tsx` |
| **RevenueAnalysis** | 综合收益分析 | `components/RevenueAnalysis.tsx` |
| **ReportCenter** | 报告中心（UI完成） | `components/ReportCenter.tsx` |
| **FormulaAdmin** | 公式管理 | `components/FormulaAdmin.tsx` |
| **VisualAnalysis** | 可视化分析 | `components/VisualAnalysis.tsx` |

### 微电网可视化 (90% 完成)

- `MicrogridVisual.tsx` - 主可视化组件
- `DeviceLayer.tsx` - 设备图层
- `CanvasHotspotLayer.tsx` - 交互热点层
- `SceneBackground.tsx` - 场景背景
- `SidePanel.tsx` - 控制面板
- `CanvasDetection.tsx` - Canvas元素检测

### 高级功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 数据持久化 | ✅ 完成 | IndexedDB + localStorage |
| 离线降级计算 | ✅ 完成 | API不可用时使用本地算法 |
| 代码分割/懒加载 | ✅ 完成 | React.lazy + Suspense |
| 性能优化 | ✅ 完成 | useMemo/useCallback缓存 |
| Electron桌面应用 | ✅ 完成 | macOS支持完整 |
| 24小时仿真数据 | ✅ 完成 | 支持电价导入 |

### 新增组件 (近期完成)

- `MicrogridDashboard.tsx` - 微电网综合仪表盘
- `FinancialAnalysisView.tsx` - 投资收益对比视图
- `CanvasDetection.tsx` - Canvas元素检测
- `useSimulationHooks.ts` - 仿真数据共享Hook
- `useLayerInteraction.ts` - 图层交互Hook
- `storage-adapter.ts` - Electron/浏览器统一存储适配器

---

## 已完成功能更新

### 新增：光伏模块增强与报告精益化 (2026-02-27)

- **光伏板块模块化**：完全迁移至 `modules/solar/`，实现逻辑与视图深度分离。
- **EMC/EPC 模式**：内置完整的合同能源管理（分成/折扣/租金）与总包模式测算引擎。
- **全生命周期预测**：考虑首年及逐年衰减的 25 年发电量/现金流模型。
- **三位小数精度**：所有核心财务与工程指标统一精确至 `0.001` 级别。
- **报告中心汉化**：移除所有冗余英文标签，优化导出文件的中文化编排与数据注入。

### 新增：多格式报告导出 (2026-02-26)

| 功能 | 格式 | 说明 |
|------|------|------|
| **Excel导出** | .xlsx | 财务测算表、项目报告（完整版/简化版） |
| **PDF导出** | .pdf | 完整汇报报告，支持打印 |
| **Word导出** | .doc | Word格式报告，方便编辑 |

**导出功能特性**：
- 支持精简版/完整版报告切换
- 可自定义导出内容（建筑信息、分项投资、财务分析等）
- 自动生成日期戳文件名
- 包含完整的财务分析指标（NPV、IRR、回本周期等）

## 待完成功能

### 高优先级

| 功能 | 完成度 | 预估工作量 | 说明 |
|------|--------|------------|------|
| **后端API集成** | 80% | 5-7天 | 接口定义完整，需启动FastAPI后端 |

**后端API详细计划**：
- 后端代码已存在于：`../零碳项目收益分析软件/zero_carbon_valuation/api/`
  - `main.py` - FastAPI主应用
  - `routers/calculation.py` - 计算接口
  - `routers/simulation.py` - 8760小时模拟接口
  - `routers/persistence.py` - 持久化接口
  - `routers/export.py` - 导出接口

### 中优先级

| 功能 | 完成度 | 预估工作量 | 说明 |
|------|--------|------------|------|
| **碳资产交易** | 70% | 3-4天 | 需连接真实碳交易市场API |
| **AI模型调用** | 10% | 4-5天 | 需实现GLM模型真实调用 |

### 低优先级

| 功能 | 完成度 | 预估工作量 | 说明 |
|------|--------|------------|------|
| **微电网实时数据** | 20% | 5-6天 | 需接入物联网设备数据流 |
| **微电网配置面板** | 60% | 4-5天 | 设备参数配置UI待完善 |

---

## 技术栈

### 前端
- React 19.2.4 + TypeScript 5.8.2
- Vite 6.2.0
- TailwindCSS (CDN)
- Recharts 3.7.0
- Axios 1.13.5
- xlsx 0.18.5 - Excel导出
- idb 8.0.3 - IndexedDB封装

### 桌面框架
- Electron 40.6.1
- electron-builder 26.8.1

---

## 快速开始

### 安装依赖

\`\`\`bash
cd ~/Desktop/code/项目/零碳项目收益评估软件前端
npm install
\`\`\`

### 开发模式

\`\`\`bash
npm run electron:dev
\`\`\`

### 构建桌面应用

\`\`\`bash
npm run build
npm run electron:build:mac
\`\`\`

---

## NPM 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动Vite开发服务器 (端口3001) |
| `npm run build` | 构建前端 |
| `npm run electron:dev` | 同时启动Vite和Electron |
| `npm run electron:build:mac` | 构建macOS应用 |

---

## 系统要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- macOS 10.15+ (Catalina)

---

## 许可证

MIT License

---

## 未来演进方向 (视角洞察建议)

基于当前版本，针对未来深入优化的方向提出三大视角的完善建议：

### 1. 零碳园区专家视角：功能深度与广度拓展
- **碳资产闭环协同**：将碳排功能从简单的“折算”演进为与 CCER 签发挂钩的持续性碳盘查监测，并补全“碳抵消方案”和产品全生命周期“碳足迹追踪”业务逻辑。
- **微电网 VPP 级交互**：不再局限于自发的“源网荷储”，应增加园区与省级虚拟电厂 (VPP) 平台之间的需求响应 (Demand Response) 调节策略仿真。
- **冷热电三联供耦合计算**：将空调 (制冷/供暖)、热水、热泵等单向模块打包为热力管网系统，实现 CCHP（多能互补综合能源网络）的系统级效率最优化仿真。

### 2. 园区业主/高管视角：风险防范与财务精炼
- **敏感性与抗造压力测试**：财务计算必须加上 Tornado (龙卷风图) 分析或盈亏平衡分析模块，衡量电价波动、建设成本超支对投资 IRR 的敏感影响。
- **动态合同能源管理 (Dynamic EMC)**：现实中的 EMC 往往对赌阶梯化的节能分成模式而非静态百分比，且涉及退场结算，需在财务引擎中支持阶梯式投资及灵活分成。
- **细化 O&M 流水模型**：在收益流中补全后续的设备运维费、保险、更换（如储能电芯替换资金）的扣除，使得最终的净现流更加贴合实际。

### 3. 前线销售/市场视角：成单利器与表现形式
- **“一页纸” 商业通览表 (Teaser)**：在复杂的后台仪表盘之外，亟需一个核心的图文混排一页式简报功能（突出 Capex, Payback 和降本比例），方便 PDF 打印极速递交。
- **竞品/基准对标工具**：报告中缺少客户原耗能与同行业标杆的横向对标差异，增加此类渲染图表最容易引发客户的危机感和改造冲动。
- **现场可调的三维交互沙盘**：使用 WebGL 或前端互动动画，辅助前线员工在移动设备上现场拉动如屋顶比例、储能柜堆叠等参数即可获得即时视觉与数字反馈，增强转化。
