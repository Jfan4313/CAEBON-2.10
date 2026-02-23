# 像素级点击检测器 - 解决全尺寸透明图层点击问题

## 问题背景

当使用"全尺寸透明图层"时（如微电网可视化），所有图片都是和画布一样大的"透明大板子"，叠在一起。最上面的即便大部分是透明的，也会"挡住"下面所有图片的鼠标点击或触摸事件。

## 解决方案

### 方案选择对比

| 方案 | 优点 | 缺点 |
|------|------|--------|
| CSS `pointer-events: none` | 最简单实现 | 不能区分透明/不透明区域 |
| 事件冒泡控制 | 可编程控制 | 仍然有事件层级问题 |
| **Canvas 像素级检测** | 精准判断点击位置 | 实现稍复杂 |

### Canvas 像素级检测方案

#### 核心原理

```typescript
// 1. 创建隐藏的 Canvas
const canvas = document.createElement('canvas');
canvas.width = image.naturalWidth;
canvas.height = image.naturalHeight;
ctx.drawImage(image, 0, 0);

// 2. 获取像素数据
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

// 3. 检测点击位置的 Alpha 值
const pixelIndex = (y * width + x) * 4 + 3;  // Alpha 通道
const alpha = imageData.data[pixelIndex];

// 4. 根据透明度决定事件处理
if (alpha === 0) {
    // 完全透明：让事件穿透
    image.style.display = 'none';
    // 事件继续传递到下层
} else {
    // 不透明：在当前层处理
    event.stopPropagation();
    // 执行点击逻辑
}
```

#### 实现文件

```
components/microgrid/
├── pixelClickDetector.tsx      # 核心检测 Hook
└── pixelClickDetectorDemo.tsx    # 使用示例和演示
└── PIXEL_CLICK_DETECTOR_README.md  # 本文档
```

## 使用方法

### 基础用法

```typescript
import React from 'react';
import PixelClickDetector from './pixelClickDetector';

const MyComponent = () => {
    const handleDeviceClick = (x: number, y: number, deviceName: string) => {
        console.log(\`点击设备: \${deviceName}\`);
        // 处理设备点击逻辑
    };

    return (
        <PixelClickDetector
            onClick={handleDeviceClick}
        >
            <img
                src="/microgrid/储能.png"
                alt="储能系统"
                className="w-full h-auto"
            />
        </PixelClickDetector>
    );
};
```

### 设备命名传递

`onClick` 回调接收两个参数：
- `x: number` - 点击位置的 X 坐标（相对于图片左上角，0-100范围）
- `y: number` - 点击位置的 Y 坐标（相对于图片左上角，0-100范围）

### 工作流程

```
用户点击图片
    ↓
PixelClickDetector 检测点击位置
    ↓
读取 Canvas 像素数据
    ↓
检查 Alpha 通道值
    ↓
if Alpha = 0 ?
    ├─ 临时隐藏图片
    ├─ 事件穿透到下层
    ├─ 恢复图片显示
    └─ 调用 onClick(x, y)
else :
    ├─ 阻止事件传播 (stopPropagation)
    ├─ 调用 onClick(x, y)
    └─ 处理当前层点击逻辑
```

## 在微电网可视化中的应用

### 当前结构问题

```
Container (600px 高)
├─ SceneBackground (底图) ← 始终可见
├─ DeviceLayer (所有设备) ← 叠在一起
│   └─ pvPanel1 (透明) ← 挡住了下面的点击
│   └─ hvacOutdoor1 (透明)
│   └── ...
└── 用户点击 pvPanel1 位置
        ↓ 事件被 pvPanel1 捕获
        ↓ 无法传递到下层
```

### 推荐的架构

```
┌─────────────────────────────────────────────────────┐
│  背景层（背景）                         │
│   - 始终可见                              │
│   - 用户可以点击切换昼夜                 │
│                                            │
│  交互层（设备切片）                   │
│   - 只渲染需要交互的设备               │
│   - 每个设备独立检测                   │
│   - 精准点击定位                       │
│   - 点击穿透到场景层                     │
│                                            │
│   场景层（背景）                         │
│   - 完整的静态图（所有设备）          │
│   - 接收来自交互层的点击事件          │
└─────────────────────────────────────────────────────┘
```

### 优点

1. **精准交互** - 只有点击到实际设备像素时才触发
2. **视觉反馈** - 可添加点击高亮、缩放等反馈
3. **性能友好** - Canvas 检测开销很小
4. **易于扩展** - 可支持多设备和复杂交互逻辑
5. **无副作用** - 不影响布局和 CSS 样式

### 注意事项

1. Canvas 检测需要在图片加载完成后进行
2. 建议在组件挂载时初始化，避免重复创建 Canvas
3. 点击坐标是相对于图片尺寸的百分比（0-100）
4. 对于动态生成的图片，需要重新初始化检测

## 与其他方案对比

| 特性 | Canvas 检测 | CSS pointer-events | Event Bubbling |
|------|--------------|-------------------|----------------|
| 精准度 | 像素级 | 图片级 | DOM 事件级 |
| 性能 | 良好 | 最好 | 较好 |
| 复杂度 | 中等 | 最简单 | 简单 |
| 可控性 | 高 | 低 | 低 |
| 适用场景 | 复杂交互 | 简单场景 | 简单场景 |

## 总结

Canvas 像素级检测是解决"全尺寸透明图层点击问题"的最专业方案。通过检测点击位置的像素透明度，可以精确判断点击意图，并在需要时让事件穿透到下层。

对于你的微电网可视化项目，建议：
1. 使用 PixelClickDetector 包装需要交互的设备组件
2. 保持场景底图始终可见作为接收层
3. 每个设备独立检测，实现精准的交互体验
