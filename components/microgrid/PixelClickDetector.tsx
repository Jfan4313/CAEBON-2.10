import React, { useRef, useEffect, useState } from 'react';

/**
 * 像素级点击检测器
 *
 * 使用 Canvas 检测点击位置的像素透明度
 * 如果像素完全透明（Alpha = 0），则让事件穿透到下层
 * 如果像素不透明，则阻止事件传播
 *
 * @param {HTMLImageElement} imageElement - 需要检测的图片元素
 * @param {React.RefObject} containerRef - 容器引用
 * @param {Function} onClick - 点击回调
 * @returns {{ clear: () => void }} - 返回清理函数
 */
export const usePixelClickDetector = (
    imageElement: HTMLImageElement | null,
    containerRef: React.RefObject<HTMLDivElement> | null,
    onClick?: (x: number, y: number) => void
) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageDataRef = useRef<ImageData | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // 初始化 Canvas
    useEffect(() => {
        if (!imageElement || !containerRef?.current || isInitialized) return;

        const canvas = document.createElement('canvas');
        canvasRef.current = canvas;
        setIsInitialized(true);

        const ctx = canvas.getContext('2d');

        // 设置 Canvas 尺寸与图片一致
        const setupCanvas = async () => {
            if (!imageElement.complete) {
                await new Promise(resolve => imageElement.onload = resolve);
            }

            canvas.width = imageElement.naturalWidth;
            canvas.height = imageElement.naturalHeight;

            // 绘制图片到 Canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imageElement, 0, 0);

            // 获取像素数据
            imageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        };

        setupCanvas();

        // 清理函数
        return () => {
            if (canvasRef.current) {
                canvasRef.current = null;
                imageDataRef.current = null;
                setIsInitialized(false);
            }
        };
    }, [imageElement, containerRef, isInitialized]);

    // 处理点击事件
    useEffect(() => {
        if (!imageElement || !canvasRef.current || !imageDataRef.current || !containerRef?.current) return;

        const canvas = canvasRef.current;
        const imageData = imageDataRef.current;
        const element = containerRef.current;

        const handleClick = (event: MouseEvent) => {
            if (!imageElement || !canvas || !imageData) return;

            const rect = imageElement.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            // 获取点击位置相对于图片
            const clickX = (event.clientX - rect.left) * scaleX;
            const clickY = (event.clientY - rect.top) * scaleY;

            // 检查点击位置的像素透明度
            const pixelIndex = Math.floor(clickY) * canvas.width + Math.floor(clickX);
            const alphaIndex = (pixelIndex * 4) + 3; // Alpha 通道

            const alpha = imageData.data[alphaIndex];

            // 如果像素完全透明，让事件穿透
            if (alpha === 0) {
                // 移除图片，让事件传播到下层
                imageElement.style.display = 'none';

                // 通知上层有事件穿透
                if (containerRef.current) {
                    const lowerEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        clientX: event.clientX,
                        clientY: event.clientY
                    });

                    containerRef.current.dispatchEvent(lowerEvent);

                    // 恢复图片显示
                    setTimeout(() => {
                        imageElement.style.display = '';
                    }, 10);
                }

                // 执行点击回调
                if (onClick) {
                    onClick(Math.floor(clickX), Math.floor(clickY));
                }
            } else {
                // 像素不透明，阻止事件传播
                event.stopPropagation();
                event.preventDefault();

                // 执行点击回调
                if (onClick) {
                    onClick(Math.floor(clickX), Math.floor(clickY));
                }
            }
        };

        // 添加点击事件监听
        element.addEventListener('click', handleClick, true);

        return () => {
            element.removeEventListener('click', handleClick);
        };
    }, [imageElement, containerRef, canvasRef, imageDataRef, onClick]);

    // 返回清理函数（用于手动清理）
    const clear = () => {
        if (canvasRef.current) {
            canvasRef.current = null;
            imageDataRef.current = null;
            setIsInitialized(false);
        }
    };

    return { clear };
};

/**
 * 像素级点击检测组件
 *
 * 这是一个独立的检测组件，可以包装任何图片元素
 * 自动检测点击位置是否为透明像素
 */
interface PixelClickDetectorProps {
    children: React.ReactNode;
    onClick?: (x: number, y: number) => void;
    className?: string;
}

const PixelClickDetector: React.FC<PixelClickDetectorProps> = ({
    children,
    onClick,
    className = ''
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { clear } = usePixelClickDetector(containerRef.current, onClick);

    useEffect(() => {
        return clear;
    }, [clear]);

    return (
        <div
            ref={containerRef}
            className={`pixel-click-detector ${className}`}
            style={{ position: 'relative', display: 'inline-block' }}
        >
            {children}
        </div>
    );
};

export default PixelClickDetector;
