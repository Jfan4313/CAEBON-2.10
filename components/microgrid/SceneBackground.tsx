import React, { useState, useCallback } from 'react';
import { TimeOfDay } from '../../types';

interface SceneBackgroundProps {
    timeOfDay: TimeOfDay;
    onImageLoad?: (width: number, height: number) => void;
}

/**
 * 场景背景组件
 *
 * 显示微电网场景背景，支持昼夜切换效果
 * 白天：蓝色渐变背景
 * 夜晚：使用指定的底图
 */
const SceneBackground: React.FC<SceneBackgroundProps> = ({ timeOfDay, onImageLoad }) => {
    const isNight = timeOfDay === TimeOfDay.NIGHT;

    const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        if (onImageLoad) {
            onImageLoad(img.naturalWidth, img.naturalHeight);
        }
    }, [onImageLoad]);

    return (
        <div className="absolute inset-0 transition-all duration-1000">
            {/* 白天渐变背景 */}
            {!isNight && (
                <div className="absolute inset-0 w-full h-full transition-all duration-1000" style={{
                    background: 'linear-gradient(135deg, #e0f2fe 0%, #a5f3fc 50%)'
                }}>
                    {/* 太阳图标 */}
                    <svg viewBox="0 0 100 100" className="absolute top-8 left-8" style={{ color: '#f59e0b' }}>
                        <circle cx="50" cy="30" r="15" fill="#f59e0b">
                            <animate attributeName="opacity" values="1;0.5;0.8;1" dur="4s" repeatCount="indefinite" />
                        </circle>
                    </svg>
                </div>
            )}

            {/* 夜晚背景 */}
            {isNight && (
                <img
                    src="/微电网展示效果图/基础底图/黑夜底图.png"
                    className="absolute inset-0 w-full h-full object-cover"
                    alt="微电网夜景底图"
                    onLoad={handleImageLoad}
                />
            )}

        </div>
    );
};

export default SceneBackground;
