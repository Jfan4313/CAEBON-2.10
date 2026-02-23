import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DeviceImageConfig } from '../../types';

interface CanvasHotspotLayerProps {
    configs: DeviceImageConfig[];
    onDeviceClick?: (deviceId: string) => void;
    children: React.ReactNode;  // 实际显示的图片（用于点击时切换透明度）
    width?: number;
    height?: number;
}

/**
 * 基于像素的 Canvas 热区层
 *
 * 核心原理：
 * 1. 在内存 Canvas 中绘制每一层图片
 * 2. 通过 getImageData 获取鼠标位置的像素 Alpha 值
 * 3. 只有当 Alpha > 阈值时才认为鼠标"指在"该组件上
 * 4. 使用透明度控制显示/隐藏，而不是 CSS hover
 */
const CanvasHotspotLayer: React.FC<CanvasHotspotLayerProps> = ({
    configs,
    onDeviceClick,
    children,
    width = 800,
    height = 600
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement>(null);
    const [activeDevice, setActiveDevice] = useState<string | null>(null);
    const [hoveredDevice, setHoveredDevice] = useState<string | null>(null);
    const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map());

    // 预加载所有可见图片
    useEffect(() => {
        const visibleConfigs = configs.filter(c => c.visible);
        const imageMap = new Map<string, HTMLImageElement>();
        let loadedCount = 0;
        const totalImages = visibleConfigs.length;

        visibleConfigs.forEach(config => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = config.imageSrc;

            img.onload = () => {
                imageMap.set(config.id, img);
                loadedCount++;
                if (loadedCount === totalImages) {
                    setLoadedImages(imageMap);
                }
            };

            img.onerror = () => {
                console.warn(`Failed to load image: ${config.imageSrc}`);
                loadedCount++;
                if (loadedCount === totalImages) {
                    setLoadedImages(imageMap);
                }
            };
        });

        return () => {
            imageMap.clear();
        };
    }, [configs]);

    // 绘制 Canvas
    useEffect(() => {
        if (!canvasRef.current || loadedImages.size === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 设置画布尺寸
        canvas.width = width;
        canvas.height = height;

        // 清空画布
        ctx.clearRect(0, 0, width, height);

        // 绘制所有层（按照 zIndex 排序）
        const sortedConfigs = [...configs].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

        sortedConfigs.forEach(config => {
            const img = loadedImages.get(config.id);
            if (!img) return;

            // 底图始终可见，其他层根据状态决定可见性
            const isBaseLayer = ['sceneBackground', 'decorative'].includes(config.id);
            const isActive = config.id === activeDevice;
            const isHovered = config.id === hoveredDevice;

            let alpha = 0;
            if (isBaseLayer) {
                alpha = 1.0;
            } else if (isActive) {
                alpha = 1.0;
            } else if (isHovered) {
                alpha = 0.8;
            } else {
                alpha = 0.0;  // 默认隐藏
            }

            ctx.globalAlpha = alpha;
            ctx.drawImage(img, 0, 0, width, height);

            // 激活时添加发光效果
            if (isActive) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#00ffff';
                ctx.drawImage(img, 0, 0, width, height);
                ctx.shadowBlur = 0;
            }
        });
    }, [loadedImages, activeDevice, hoveredDevice, configs, width, height]);

    // 处理鼠标移动
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!offscreenCanvasRef.current || loadedImages.size === 0) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const osCtx = offscreenCanvasRef.current.getContext('2d');
        if (!osCtx) return;

        // 按照 zIndex 从高到低检测（从最上层开始）
        const sortedConfigs = [...configs]
            .filter(c => !['sceneBackground', 'decorative'].includes(c.id))
            .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

        let foundDevice: string | null = null;

        for (const config of sortedConfigs) {
            const img = loadedImages.get(config.id);
            if (!img) continue;

            // 在离屏 Canvas 上绘制这一层
            osCtx.clearRect(0, 0, width, height);
            osCtx.drawImage(img, 0, 0, width, height);

            // 获取鼠标位置的像素
            const pixel = osCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
            const alpha = pixel[3];  // Alpha 值

            // Alpha > 10 认为是"有内容"的像素（避免边缘杂色）
            if (alpha > 10) {
                foundDevice = config.id;
                break;  // 找到最上层有内容的层就停止
            }
        }

        setHoveredDevice(foundDevice);
        canvas.style.cursor = foundDevice ? 'pointer' : 'default';
    }, [loadedImages, configs, width, height]);

    // 处理点击
    const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const osCtx = offscreenCanvasRef.current?.getContext('2d');
        if (!osCtx || loadedImages.size === 0) return;

        // 按照 zIndex 从高到低检测
        const sortedConfigs = [...configs]
            .filter(c => !['sceneBackground', 'decorative'].includes(c.id))
            .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

        for (const config of sortedConfigs) {
            const img = loadedImages.get(config.id);
            if (!img) continue;

            osCtx.clearRect(0, 0, width, height);
            osCtx.drawImage(img, 0, 0, width, height);

            const pixel = osCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
            const alpha = pixel[3];

            if (alpha > 10) {
                // 点击已激活的设备则取消激活
                if (activeDevice === config.id) {
                    setActiveDevice(null);
                } else {
                    setActiveDevice(config.id);
                }

                // 调用回调
                if (onDeviceClick && config.linkedDevice) {
                    onDeviceClick(config.linkedDevice);
                }
                return;
            }
        }

        // 点击空白处取消激活
        setActiveDevice(null);
    }, [loadedImages, configs, activeDevice, onDeviceClick, width, height]);

    // 获取激活设备的信息
    const activeConfig = configs.find(c => c.id === activeDevice);
    const hoveredConfig = configs.find(c => c.id === hoveredDevice);

    return (
        <div className="relative w-full h-full">
            {/* 离屏 Canvas 用于像素检测 */}
            <canvas
                ref={offscreenCanvasRef}
                width={width}
                height={height}
                style={{ display: 'none' }}
            />

            {/* 主 Canvas 显示 */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                onMouseMove={handleMouseMove}
                onClick={handleClick}
                onMouseLeave={() => {
                    setHoveredDevice(null);
                    const canvas = canvasRef.current;
                    if (canvas) canvas.style.cursor = 'default';
                }}
            />

            {/* 悬停提示 */}
            {hoveredDevice && hoveredConfig && (
                <div
                    className="absolute pointer-events-none bg-slate-900/90 text-white text-xs px-2 py-1 rounded shadow-lg backdrop-blur-sm z-40"
                    style={{
                        left: `${((hoveredConfig.position.left || 50) + (hoveredConfig.size.width || 10) / 2)}%`,
                        top: `${(hoveredConfig.position.top || 50) - 2}%`,
                        transform: 'translateX(-50%)',
                        transition: 'opacity 200ms'
                    }}
                >
                    {hoveredConfig.name}
                </div>
            )}

            {/* 激活提示框 */}
            {activeDevice && activeConfig && (
                <div className="absolute pointer-events-none z-50">
                    <div
                        className="bg-slate-900/90 text-white text-xs px-2 py-1 rounded shadow-lg backdrop-blur-sm"
                        style={{
                            left: `${((activeConfig.position.left || 50) + (activeConfig.size.width || 10) / 2)}%`,
                            top: `${(activeConfig.position.top || 50) - 2}%`,
                            transform: 'translateX(-50%)'
                        }}
                    >
                        {activeConfig.name}
                    </div>
                </div>
            )}

            {/* 关闭按钮 */}
            {activeDevice && (
                <button
                    className="absolute top-4 right-4 z-50 bg-slate-700/80 hover:bg-slate-600 text-white text-xs px-3 py-1 rounded transition-colors"
                    onClick={() => setActiveDevice(null)}
                >
                    关闭
                </button>
            )}

            {/* 子元素（用于 CSS 样式和设备状态动画） */}
            <div style={{ opacity: 0, pointerEvents: 'none' }}>
                {children}
            </div>
        </div>
    );
};

export default CanvasHotspotLayer;
