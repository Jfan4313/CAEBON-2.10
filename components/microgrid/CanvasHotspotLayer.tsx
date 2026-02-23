import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { DeviceImageConfig } from '../../types';

interface CanvasHotspotLayerProps {
    configs: DeviceImageConfig[];
    onDeviceClick?: (deviceId: string) => void;
    children: React.ReactNode;
    width?: number;
    height?: number;
}

const CanvasHotspotLayer: React.FC<CanvasHotspotLayerProps> = ({
    configs,
    onDeviceClick,
    children,
    width = 1920,
    height = 1080
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [activeDevice, setActiveDevice] = useState<string | null>(null);
    const [hoveredDevice, setHoveredDevice] = useState<string | null>(null);
    const [layerData, setLayerData] = useState<Map<string, {
        img: HTMLImageElement;
        alphaMap: Uint8Array;
    }>>(new Map());
    const lastMousePosRef = useRef<{ x: number; y: number }>({ x: -1, y: -1 });
    const rafIdRef = useRef<number>();

    const sortedConfigs = useMemo(() => {
        return [...configs]
            .filter(c => c.visible && !['sceneBackground', 'decorative'].includes(c.id))
            .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    }, [configs]);

    const clickableConfigs = useMemo(() => {
        return configs.filter(c => c.visible && c.linkedDevice);
    }, [configs]);

    useEffect(() => {
        if (clickableConfigs.length === 0) return;

        const layerMap = new Map<string, { img: HTMLImageElement; alphaMap: Uint8Array }>();
        let loadedCount = 0;
        const totalImages = clickableConfigs.length;
        let targetWidth = 0;
        let targetHeight = 0;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        clickableConfigs.forEach((config, index) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = config.imageSrc;

            img.onload = () => {
                if (index === 0) {
                    targetWidth = img.naturalWidth || width;
                    targetHeight = img.naturalHeight || height;
                }

                tempCanvas.width = targetWidth;
                tempCanvas.height = targetHeight;

                tempCtx.clearRect(0, 0, targetWidth, targetHeight);
                tempCtx.drawImage(img, 0, 0, targetWidth, targetHeight);

                const imageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);
                const alphaMap = new Uint8Array(targetWidth * targetHeight);

                for (let i = 0; i < targetWidth * targetHeight; i++) {
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
    }, [clickableConfigs, width, height]);

    useEffect(() => {
        if (!canvasRef.current || layerData.size === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const firstImage = layerData.values().next();
        canvas.width = firstImage?.img.naturalWidth || width;
        canvas.height = firstImage?.img.naturalHeight || height;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const sortedConfigs = [...configs].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

        sortedConfigs.forEach(config => {
            if (!config.visible) return;

            const data = layerData.get(config.id);
            if (!data) return;

            const isBaseLayer = ['sceneBackground', 'decorative'].includes(config.id);
            const isActive = config.id === activeDevice;
            const isHovered = config.id === hoveredDevice;

            if (isBaseLayer) {
                ctx.globalAlpha = 1.0;
                ctx.drawImage(data.img, 0, 0, canvas.width, canvas.height);
            } else {
                const isClickable = clickableConfigs.some(c => c.id === config.id);
                if (isClickable) {
                    const sourceCanvas = document.createElement('canvas');
                    sourceCanvas.width = canvas.width;
                    sourceCanvas.height = canvas.height;
                    const sourceCtx = sourceCanvas.getContext('2d');
                    sourceCtx.putImageData(data.img, 0, 0, targetWidth, targetHeight);

                    ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
                } else {
                    ctx.globalAlpha = config.id === activeDevice ? 1.0 : (config.id === hoveredDevice ? 0.8 : 0.0);
                    ctx.drawImage(data.img, 0, 0, canvas.width, canvas.height);
                }
            }

            if (config.id === activeDevice) {
                ctx.save();
                ctx.globalAlpha = 0.3;
                ctx.shadowBlur = 8;
                ctx.shadowColor = 'rgba(0, 255, 255, 0.3)';
                ctx.drawImage(data.img, 0, 0, canvas.width, canvas.height);
                ctx.restore();
            }
        });
    }, [layerData, activeDevice, hoveredDevice, configs]);

    const detectDeviceAt = useCallback((x: number, y: number): string | null => {
        if (layerData.size === 0) return null;

        const px = Math.floor(x);
        const py = Math.floor(y);

        if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) return null;

        const index = py * canvas.width + px;

        for (const config of sortedConfigs) {
            if (['sceneBackground', 'decorative'].includes(config.id)) continue;

            const data = layerData.get(config.id);
            if (!data) continue;

            const isClickable = clickableConfigs.some(c => c.id === config.id);
            if (!isClickable) continue;

            const alpha = data.alphaMap[index];

            if (alpha > 10) {
                return config.id;
            }
        }

        return null;
    }, [layerData, sortedConfigs, canvas.width, height]);

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

        const lastX = lastMousePosRef.current.x;
        const lastY = lastMousePosRef.current.y;

        if (Math.abs(px - lastX) < 3 && Math.abs(py - lastY) < 3) {
            return;
        }

        lastMousePosRef.current = { x: px, y: py };

        if (rafIdRef.current !== undefined) {
            cancelAnimationFrame(rafIdRef.current);
        }

        rafIdRef.current = requestAnimationFrame(() => {
            const foundDevice = detectDeviceAt(x, y);
            setHoveredDevice(foundDevice);
            canvas.style.cursor = foundDevice ? 'pointer' : 'default';
        });
    }, [detectDeviceAt, layerData]);

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

    const handleMouseLeave = useCallback(() => {
        setHoveredDevice(null);
        const canvas = canvasRef.current;
        if (canvas) canvas.style.cursor = 'default';
        lastMousePosRef.current = { x: -1, y: -1 };
    }, []);

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
                style={{ imageRendering: 'optimizeSpeed', willChange: 'auto' }}
                onMouseMove={handleMouseMove}
                onClick={handleClick}
                onMouseLeave={handleMouseLeave}
            />

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

            {activeDevice && (
                <button
                    className="absolute top-4 right-4 z-50 bg-slate-700/80 hover:bg-slate-600 text-white text-xs px-3 py-1 rounded transition-colors"
                    onClick={() => setActiveDevice(null)}
                >
                    关闭
                </button>
            )}

            <div style={{ opacity: 0, pointerEvents: 'none' }}>
                {children}
            </div>
        </div>
    );
};

export default CanvasHotspotLayer;
