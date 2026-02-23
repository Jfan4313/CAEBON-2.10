import React from 'react';
import { TimeOfDay } from '../../types';

interface SceneBackgroundProps {
    timeOfDay: TimeOfDay;
}

/**
 * 场景背景组件
 *
 * 显示微电网场景底图，支持昼夜切换效果
 */
const SceneBackground: React.FC<SceneBackgroundProps> = ({ timeOfDay }) => {
    const isNight = timeOfDay === TimeOfDay.NIGHT;

    return (
        <div className="absolute inset-0 transition-all duration-1000">
            {/* 场景底图 */}
            <img
                src="/assets/microgrid/基础底图_0005_Gemini_Generated_Image_1w1c5g1w1c5g1w1c.png"
                className={`w-full h-full object-cover transition-all duration-1000 ${isNight ? 'night-mode' : ''}`}
                alt="微电网场景底图"
            />

            {/* 夜晚覆盖层 */}
            {isNight && (
                <div className="absolute inset-0 bg-slate-900/30 pointer-events-none transition-opacity duration-1000" />
            )}
        </div>
    );
};

export default SceneBackground;
