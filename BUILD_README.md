# 零碳项目收益评估软件 - macOS桌面应用

## 构建说明

### 前置要求
- Node.js >= 18
- npm >= 9

### 构建步骤

#### 1. 安装依赖
```bash
cd ~/Desktop/code/项目/零碳项目收益评估软件前端
npm install
```

#### 2. 构建前端
```bash
npm run build
```

#### 3. 打包macOS应用
```bash
npm run electron:build:mac
```

构建完成后，应用包将位于 `dist-electron/` 目录：
- `零碳项目收益评估软件-1.0.0-arm64.dmg` (Apple Silicon)
- `零碳项目收益评估软件-1.0.0.dmg` (Intel)

### 开发模式运行

#### 启动开发服务器
```bash
cd ~/Desktop/code/项目/零碳项目收益评估软件前端
npm run electron:dev
```

### 安装和运行

#### 方法1: 直接安装DMG
1. 打开 `dist-electron` 目录
2. 双击 `零碳项目收益评估软件-1.0.0.dmg` 文件
3. 将应用拖拽到 Applications 文件夹

#### 方法2: 命令行安装
```bash
# 安装 DMG
hdiutil attach dist-electron/零碳项目收益评估软件-1.0.0.dmg
cp -R "/Volumes/零碳项目收益评估软件/零碳项目收益评估软件.app" /Applications/
hdiutil detach "/Volumes/零碳项目收益评估软件"

# 或使用 installer
sudo installer -store -pkg dist-electron/零碳项目收益评估软件-1.0.0-arm64.dmg
```

### 启动应用

安装后，在 Launchpad 或 Applications 文件夹中找到并启动：
- **零碳项目收益评估软件**

### 功能特性

- ✅ 光伏系统投资收益分析
- ✅ 储能系统套利计算
- ✅ 空调节能收益分析
- ✅ 照明节能改造评估
- ✅ 充电桩运营收益分析
- ✅ 微电网系统可视化
- ✅ VPP虚拟电厂分析
- ✅ AI平台收益评估
- ✅ 项目数据持久化存储
- ✅ Excel报告导出

### 技术栈

- **前端**: React + TypeScript + Vite
- **桌面框架**: Electron
- **UI组件**: TailwindCSS + 自定义组件
- **图表库**: Recharts
- **数据存储**: IndexedDB (via idb)
- **后端集成**: FastAPI (可选)

### 系统要求

- macOS 10.15 或更高版本
- 100MB 硬盘空间

### 故障排除

#### 应用无法启动
- 检查 macOS 安全设置：系统设置 > 隐私与安全性 > 允许从以下位置下载的应用
- 右键点击 .dmg 文件 > 打开

#### 数据文件位置
应用数据存储在：`~/Library/Application Support/零碳项目收益评估软件/data/`

#### 开发者工具
安装的应用如果需要调试：
1. 右键点击应用图标
2. 选择"显示包内容"
3. 右键点击应用 > 显示简介
4. 在"共享文件夹"位置中输入 `/usr/bin/log stream`
5. 重启应用，然后可以通过 Chrome 调试：`chrome://inspect`

## 许可证

MIT License

## 作者

Zero Carbon Project Team
