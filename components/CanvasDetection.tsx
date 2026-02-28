import React, { useRef, useEffect, useCallback, useState } from 'react';

export interface CanvasElement {
  id: string;
  type: 'image' | 'text' | 'shape' | 'custom';
  x: number;
  y: number;
  width: number;
  height: number;
  visible?: boolean;
  src?: string;
  opacity?: number;
  data?: any;
}

interface CanvasDetectionProps {
  width?: number;
  height?: number;
  onElementClick?: (element: CanvasElement) => void;
  onElementHover?: (element: CanvasElement | null) => void;
  className?: string;
  showDebug?: boolean;
}

/**
 * Canvas 元素检测组件
 * 用于在 Canvas 上检测和交互图像、文本、形状等元素
 */
const CanvasDetection: React.FC<CanvasDetectionProps> = ({
  width = 800,
  height = 600,
  onElementClick,
  onElementHover,
  className = '',
  showDebug = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [hoveredElement, setHoveredElement] = useState<CanvasElement | null>(null);

  // 模拟图层元素（可以从 localStorage 读取或从父组件传入）
  useEffect(() => {
    const loadLayers = () => {
      try {
        const saved = localStorage.getItem('MICROGRID_IMAGE_LAYERS');
        if (saved) {
          const layers = JSON.parse(saved);
          setElements(layers.map((layer: any, index: number) => ({
            id: layer.id,
            type: 'image',
            x: layer.x,
            y: layer.y,
            width: 200 * layer.scale,
            height: 200 * layer.scale,
            data: layer,
          })));
        }
      } catch (e) {
        console.error('Failed to load image layers:', e);
      }
    };

    loadLayers();

    // 监听图层变化
    const handleStorageChange = () => {
      loadLayers();
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Canvas 渲染
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制所有元素
    elements.forEach(element => {
      if (!element.visible) return;

      ctx.save();

      // 绘制图片
      if (element.type === 'image' && element.src) {
        const img = new Image();
        img.onload = () => {
          ctx.globalAlpha = element.opacity !== undefined ? element.opacity : 1;
          ctx.drawImage(img, element.x, element.y, element.width, element.height);

          // 绘制选中边框
          if (hoveredElement?.id === element.id) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.strokeRect(element.x - 2, element.y - 2, element.width + 4, element.height + 4);
          }

          // 绘制调试信息
          if (showDebug) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.font = '10px Arial';
            ctx.fillText(`${element.type}: ${element.id}`, element.x, element.y + element.height + 15);
          }
        };
        img.src = element.src;
      }

      ctx.restore();
    });
  }, [elements, hoveredElement, showDebug]);

  // 获取 Canvas 位置坐标
  const getCanvasCoordinates = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, []);

  // 检测点击
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(event);
    const canvas = canvasRef.current;

    if (!canvas) return;

    // 从后往前检测元素（z-index 越大的越在上层）
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      if (!element.visible) continue;

      const ex = element.x;
      const ey = element.y;
      const ew = ex + element.width;
      const eh = ey + element.height;

      if (x >= ex && x <= ew && y >= ey && y <= eh) {
        onElementClick?.(element);
        return; // 找到最上层的被点击元素
      }
    }
  }, [elements, getCanvasCoordinates, onElementClick]);

  // 检测悬停
  const handleCanvasHover = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(event);
    const canvas = canvasRef.current;

    if (!canvas) return;

    let found: CanvasElement | null = null;

    // 从后往前检测（z-index 越大的越在上层）
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      if (!element.visible) continue;

      const ex = element.x;
      const ey = element.y;
      const ew = ex + element.width;
      const eh = ey + element.height;

      if (x >= ex && x <= ew && y >= ey && y <= eh) {
        found = element;
        break;
      }
    }

    setHoveredElement(found);
    onElementHover?.(found);

    // 改变光标
    if (found) {
      canvas.style.cursor = 'pointer';
    } else {
      canvas.style.cursor = 'default';
    }
  }, [elements, getCanvasCoordinates, onElementHover]);

  // 更新元素可见性
  const toggleElementVisibility = useCallback((id: string) => {
    setElements(prev => prev.map(el =>
      el.id === id ? { ...el, visible: !el.visible } : el
    ));
  }, []);

  // 更新元素位置
  const updateElementPosition = useCallback((id: string, x: number, y: number) => {
    setElements(prev => prev.map(el =>
      el.id === id ? { ...el, x, y } : el
    ));
  }, []);

  // 更新元素缩放
  const updateElementScale = useCallback((id: string, scale: number) => {
    setElements(prev => prev.map(el => {
      if (el.id === id && el.type === 'image') {
        const baseSize = 200;
        return {
          ...el,
          width: baseSize * scale,
          height: baseSize * scale,
          data: {
            ...el.data,
            scale,
          },
        };
      }
      return el;
    }));
  }, []);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasHover}
        onMouseLeave={() => {
          setHoveredElement(null);
          onElementHover?.(null);
          if (canvasRef.current) {
            canvasRef.current!.style.cursor = 'default';
          }
        }}
        className="border border-slate-200 rounded-lg shadow-sm bg-white"
        style={{ cursor: hoveredElement ? 'pointer' : 'default' }}
      />

      {/* 调试信息 */}
      {showDebug && (
        <div className="absolute top-2 left-2 bg-slate-800 text-white text-xs p-2 rounded shadow-lg max-w-xs">
          <div>元素数量: {elements.length}</div>
          <div>鼠标位置: {hoveredElement ? `${hoveredElement.x}, ${hoveredElement.y}` : 'N/A'}</div>
        </div>
      )}

      {/* 元素列表控制面板 */}
      <div className="absolute bottom-2 left-2 bg-white rounded-lg shadow-lg border border-slate-200 p-3 max-w-xs">
        <h4 className="text-sm font-bold text-slate-800 mb-2">元素列表</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {elements.map(element => (
            <div
              key={element.id}
              className={`flex items-center justify-between p-2 rounded-lg ${
                hoveredElement?.id === element.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'
              }`}
              onClick={() => onElementClick?.(element)}
            >
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded ${
                  element.type === 'image' ? 'bg-blue-100' :
                  element.type === 'text' ? 'bg-green-100' :
                  element.type === 'shape' ? 'bg-purple-100' : 'bg-slate-100'
                }`}>
                  {element.type === 'image' && '🖼️'}
                  {element.type === 'text' && '📝'}
                  {element.type === 'shape' && '⬛️'}
                </span>
                <span className="text-xs font-medium text-slate-700 truncate max-w-[100px]">
                  {element.id}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleElementVisibility(element.id)}
                  className={`p-1 rounded hover:bg-slate-200 ${
                    element.visible ? 'text-slate-700' : 'text-slate-300'
                  }`}
                  title={element.visible ? '隐藏' : '显示'}
                >
                  <span className="material-icons text-sm">
                    {element.visible ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
                <button
                  onClick={() => updateElementScale(element.id, (element.data?.scale || 1) + 0.1)}
                  className="p-1 rounded hover:bg-slate-200 text-slate-500"
                  title="放大"
                >
                  <span className="material-icons text-sm">zoom_in</span>
                </button>
                <button
                  onClick={() => updateElementScale(element.id, Math.max(0.5, (element.data?.scale ?? 1) - 0.1))}
                  className="p-1 rounded hover:bg-slate-200 text-slate-500"
                  title="缩小"
                >
                  <span className="material-icons text-sm">zoom_out</span>
                </button>
                <button
                  onClick={() => {
                    // 计算移动距离
                    const newX = Math.max(0, Math.min(width - element.width, element.x + 20));
                    updateElementPosition(element.id, newX, element.y);
                  }}
                  className="p-1 rounded hover:bg-slate-200 text-slate-500"
                  title="向右移动"
                >
                  <span className="material-icons text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CanvasDetection;

// 导出类型以供其他组件使用
export type { CanvasElement };
