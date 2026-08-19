# 园区综合能源项目投资收益测算与辅助决策系统 V2.14 - macOS 构建说明

## 环境要求

- Node.js 18 或更高版本
- npm 9 或更高版本
- macOS 10.15 或更高版本

## 构建步骤

在仓库根目录执行：

```bash
npm install
npm run build
npm run electron:build
```

安装包生成在 `dist-electron/`。产品名称为“园区综合能源项目投资收益测算与辅助决策系统”，版本为 2.14.0。

## 开发运行

```bash
npm run electron:dev
```

## 数据位置

桌面应用的数据目录由 Electron 的 `userData` 路径确定，并在其中使用 `data/` 子目录。浏览器模式使用 IndexedDB 或 localStorage。正式申报归档不得包含该目录中的用户项目数据。

## 申报构建注意事项

- 构建前确认 `VITE_COPYRIGHT_HOLDER` 与最终申请人一致；未确认时界面显示“待权利人确认”。
- `.env`、`.env.development`、`outputs/`、`tmp/`、`dist/`、`dist-electron/` 和用户数据不得进入自主源程序归档。
- React、Electron、Recharts、Supabase SDK 等第三方依赖不得作为自主源程序提交。
- 正式安装包应保存构建日志和 SHA256 校验值，并在干净环境验证启动。

## 许可与权属

本仓库未随附面向公众的开源许可证。第三方依赖遵循各自许可证；V2.14 自有业务代码的权属及授权状态以最终权利人书面确认为准。
