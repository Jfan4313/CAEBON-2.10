# 更新日志 (CHANGELOG)

## [2.10.0] - 2026-03-14

### 新增功能 (New Features)

#### 云存储集成 (Cloud Storage Integration)
- 添加 Supabase 云存储支持，实现数据同步功能
- 新增 `services/supabase-adapter.ts` - Supabase 存储适配器
- 添加完整的 Supabase 设置文档 (`SUPABASE_SETUP.md`)
- 提供 SQL 脚本用于数据库初始化和维护：
  - `supabase-setup.sql` - 数据库表结构创建
  - `supabase-update.sql` - 数据库更新脚本
  - `supabase-cleanup.sql` - 数据库清理脚本
- 新增 `@supabase/supabase-js@2.99.0` 依赖

#### 新增模块 (New Modules)
- **modules/carbon/** - 碳资产管理模块
  - 碳配额管理功能
  - 碳交易计算

- **modules/ev/** - 电动汽车充电桩模块
  - 充电桩配置管理
  - 充电负荷预测

- **modules/lighting/** - 智能照明模块
  - LED 照明改造方案
  - 能耗优化计算

- **modules/microgrid/** - 微电网模块
  - 微电网运行仿真
  - 多能源协同管理
  - 包含 hooks.ts 和 types.ts

- **modules/project-entry/** - 项目信息录入模块
  - 标准化项目数据录入
  - 项目信息管理
  - 包含 hooks.ts 和 types.ts

- **modules/vpp/** - 虚拟电厂模块
  - VPP 聚合调度
  - 辅助服务收益计算

- **modules/water/** - 热水系统模块
  - 热泵/太阳能热水
  - 热水负荷分析

#### 部署配置 (Deployment Configuration)
- 新增 `vercel.json` 配置文件
  - 配置项目名称为 `CAEBON-2.10`
  - 设置安全响应头
  - API 路由重写规则

### 技术改进 (Technical Improvements)
- 更新项目版本至 2.10.0
- 优化 .gitignore 配置

### 依赖更新 (Dependencies)
- 新增 `@supabase/supabase-js@2.99.0`

---

## [1.0.0] - 初始版本

### 核心功能
- 分布式光伏 (RetrofitSolar)
- 储能系统 (RetrofitStorage)
- 暖通空调 (RetrofitHVAC)
- 智能照明 (RetrofitLighting)
- 热水系统 (RetrofitWater)
- 电动汽车充电桩 (RetrofitEV)
- 微电网 (RetrofitMicrogrid)
- 虚拟电厂 (RetrofitVPP)
- AI 管理平台 (RetrofitAI)
- 碳资产管理 (RetrofitCarbon)

### 基础设施
- 项目总览仪表盘 (Dashboard)
- 价格配置 (PriceConfig)
- 财务分析 (RevenueAnalysis)
- 报告中心 (ReportCenter)
- 可视化分析 (VisualAnalysis)
- 公式管理 (FormulaAdmin)

### 数据管理
- 项目数据本地存储
- IndexedDB 大容量数据存储
- Electron 桌面应用支持
