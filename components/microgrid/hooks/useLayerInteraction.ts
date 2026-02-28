import { useState, useCallback, useRef } from 'react';

export interface Layer {
  id: string;
  imgRef: React.RefObject<HTMLImageElement>;
  name: string;
}

/**
 * 图层交互 Hook
 *
 * 解决两个核心问题：
 * 1. 防止死循环：只有当鼠标真正从一个组件移动到另一个组件时，才会触发 setState
 * 2. 像素级穿透：即使图层重叠，也能精准识别鼠标下方的非透明像素
 */
export const useLayerInteraction = (layers: Layer[]) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const detectLayer = useCallback((clientX: number, clientY: number, containerRef: React.RefObject<HTMLDivElement>) => {
    if (!containerRef.current) return;

    // 1. 获取鼠标相对于容器的精确坐标
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // 2. 初始化离屏 Canvas（只需初始化一次）
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const canvas = offscreenCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let foundId: string | null = null;

    // 3. 从最上层向下遍历所有图层进行像素检测
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      const img = layer.imgRef.current;
      if (!img) continue;

      // 确保 Canvas 尺寸与图片显示尺寸一致
      canvas.width = img.clientWidth;
      canvas.height = img.clientHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 获取鼠标点位的 Alpha 通道值
      const alpha = ctx.getImageData(x, y, 1, 1).data[3];

      if (alpha > 10) { // 阈值 10 可过滤边缘杂色
        foundId = layer.id;
        break;
      }
    }

    // 4. 【关键】防止死循环：只有 ID 变化时才更新状态
    setHoveredId(prev => (prev === foundId ? prev : foundId));
  }, [layers]);

  return { hoveredId, detectLayer };
};
