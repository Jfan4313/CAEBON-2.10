import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { DeviceImageConfig } from '../../types';

interface CanvasHotspotLayerProps {
    configs: DeviceImageConfig[];
    onDeviceClick?: (deviceId: string) => void;
    children: React.ReactNode;
    width?: number;
    height?: number;
}

/**
 * 基于像素的 Canvas 热区层（性能优化版）
 *
 * 性能优化策略：
 * 1. 预计算 Alpha 映射：图片加载时一次性计算所有像素的 Alpha 值，存储为 Uint8Array
 * 2. 使用 requestAnimationFrame 节流：避免每帧都进行昂贵操作
 * 3. 缓存排序后的配置：避免每次鼠标移动都重新排序
 * 4. 鼠标移动防抖：只在移动超过阈值时才重新检测
 */
const CanvasHotspotLayer: React.FC<CanvasHotspotLayerProps> = ({
    configs,
    onDeviceClick,
    children,
    width = 1920,
    height = 1080
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement>(null);
    const [activeDevice, setActiveDevice] = useState<string | null>(null);
    const [hoveredDevice, setHoveredDevice] = useState<string | null>(null);

    // 存储已加载的图片和预计算的 Alpha 映射
    const [layerData, setLayerData] = useState<Map<string, {
        img: HTMLImageElement;
        alphaMap: Uint8Array;
    }>>(new Map());

    // 鼠标位置跟踪，用于防抖
    const lastMousePosRef = useRef<{ x: number; y: number }>({ x: -1, y: -1 });
    const rafIdRef = useRef<number>();

    // 缓存排序后的配置（从高到低 z-index）
    const sortedConfigs = useMemo(() => {
        return [...configs]
            .filter(c => c.visible && !['sceneBackground', 'decorative'].includes(c.id))
            .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    }, [configs]);

    // 预计算每个层的 Alpha 映射
    useEffect(() => {
        const visibleConfigs = configs.filter(c => c.visible);
        const layerMap = new Map<string, { img: HTMLImageElement; alphaMap: Uint8Array }>();
        let loadedCount = 0;
        const totalImages = visibleConfigs.length;

        // 创建临时 Canvas 用于计算 Alpha 值
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        tempCanvas.width = width;
        tempCanvas.height = height;

        visibleConfigs.forEach(config => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = config.imageSrc;

            img.onload = () => {
                // 绘制到临时 Canvas
                tempCtx.clearRect(0, 0, width, height);
                tempCtx.drawImage(img, 0, 0, width, height);

                // 预计算所有像素的 Alpha 值
                const imageData = tempCtx.getImageData(0, 0, width, height);
                const alphaMap = new Uint8Array(width * height);

                // 只存储 Alpha 值（每个像素取第4个字节）
                for (let i = 0; i < width * height; i++) {
                    alphaMap[i] = imageData.data[i * 4 + 3];
                }

                layerMap.set(config.id, { img, alphaMap });
                loadedCount++;

                if (loadedCount === totalImages) {
                    setLayerData(layerMap);
                }
            };

            img.onerror = () => {
                console.warn(`Failed to load image: ${config.imageSrc}`);
                loadedCount++;
                if (loadedCount === totalImages) {
                    setLayerData(layerMap);
                }
            };
        });

        return () => {
            layerMap.clear();
        };
    }, [configs, width, height]);

    // 绘制主 Canvas
    useEffect(() => {
        if (!canvasRef.current || layerData.size === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);

        // 按照 zIndex 排序
        const sortedConfigs = [...configs].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

        sortedConfigs.forEach(config => {
            if (!config.visible) return;

            const data = layerData.get(config.id);
            if (!data) return;

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
                alpha = 0.0;
            }

            ctx.globalAlpha = alpha;
            ctx.drawImage(data.img, 0, 0, width, height);

            if (isActive) {
                ctx.save();
                ctx.globalAlpha = 1.0;
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#00ffff';
                ctx.drawImage(data.img, 0, 0, width, height);
                ctx.restore();
            }
        });
    }, [layerData, activeDevice, hoveredDevice, configs, width, height]);

    // 检测指定位置的设备（使用预计算的 Alpha 映射）
    const detectDeviceAt = useCallback((x: number, y: number): string | null => {
        if (layerData.size === 0) return null;

        const px = Math.floor(x);
        const py = Math.floor(y);

        // 边界检查
        if (px < 0 || px >= width || py < 0 || py >= height) return null;

        const index = py * width + px;

        // 从最上层开始检测
        for (const config of sortedConfigs) {
            const data = layerData.get(config.id);
            if (!data) continue;

            // 直接查表获取 Alpha 值
            const alpha = data.alphaMap[index];

            if (alpha > 10) {
                return config.id;
            }
        }

        return null;
    }, [layerData, sortedConfigs, width, height]);

    // 使用 requestAnimationFrame 节流的鼠标移动处理
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || layerData.size === 0) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const px = Math.floor(x);
        const py = Math.floor(y);

        // 防抖：只在移动超过 2 像素时才重新检测
        const lastX = lastMousePosRef.current.x;
        const lastY = lastMousePosRef.current.y;

        if (Math.abs(px - lastX) < 2 && Math.abs(py - lastY) < 2) {
            return;
        }

        lastMousePosRef.current = { x: px, y: py };

        // 取消之前的 RAF
        if (rafIdRef.current !== undefined) {
            cancelAnimationFrame(rafIdRef.current);
        }

        // 使用 requestAnimationFrame 延迟执行
        rafIdRef.current = requestAnimationFrame(() => {
            const foundDevice = detectDeviceAt(x, y);
            setHoveredDevice(foundDevice);
            canvas.style.cursor = foundDevice ? 'pointer' : 'default';
        });
    }, [detectDeviceAt, layerData]);

    // 点击处理
    const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const foundId = detectDeviceAt(x, y);

        if (foundId) {
            const config = configs.find(c => c.id === foundId);
            if (config) {
                if (activeDevice === foundId) {
                    setActiveDevice(null);
                } else {
                    setActiveDevice(foundId);
                }

                if (onDeviceClick && config.linkedDevice) {
                    onDeviceClick(config.linkedDevice);
                }
            }
        } else {
            setActiveDevice(null);
        }
    }, [detectDeviceAt, configs, activeDevice, onDeviceClick]);

    // 鼠标离开处理
    const handleMouseLeave = useCallback(() => {
        setHoveredDevice(null);
        const canvas = canvasRef.current;
        if (canvas) canvas.style.cursor = 'default';
        lastMousePosRef.current = { x: -1, y: -1 };
    }, []);

    // 清理 RAF
    useEffect(() => {
        return () => {
            if (rafIdRef.current !== undefined) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, []);

    const activeConfig = configs.find(c => c.id === activeDevice);
    const hoveredConfig = configs.find(c => c.id === hoveredDevice);

    return (
        <div className="relative w-full h-full">
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                onMouseMove={handleMouseMove}
                onClick={handleClick}
                onMouseLeave={handleMouseLeave}
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
