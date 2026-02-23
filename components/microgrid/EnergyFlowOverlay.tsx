import React from 'react';
import { TimeOfDay, EnergyFlow } from '../../types';

interface EnergyFlowOverlayProps {
    energyFlow: {
        [EnergyFlow.FROM_GRID]: number;
        [EnergyFlow.TO_GRID]: number;
        [EnergyFlow.FROM_PV]: number;
        [EnergyFlow.TO_STORAGE]: number;
        [EnergyFlow.FROM_STORAGE]: number;
    };
    timeOfDay: TimeOfDay;
}

/**
 * 能源流动 SVG 覆盖层组件
 *
 * 使用 SVG + `<animate>` 标签实现能源流动画
 * 参考现有 RetrofitAI.tsx 第973-984行实现模式
 */
const EnergyFlowOverlay: React.FC<EnergyFlowOverlayProps> = ({ energyFlow, timeOfDay }) => {
    const isNight = timeOfDay === 'night';

    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
                {/* 定义渐变色 */}
                <linearGradient id="gridFlowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="pvFlowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="storageFlowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                </linearGradient>

                {/* 定义箭头标记 */}
                <marker id="arrowHead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
                </marker>
            </defs>

            {/* ==================== 电网 <-> 微电网 连接线 ==================== */}
            {energyFlow[EnergyFlow.FROM_GRID] > 0 && (
                <g className="energy-flow-active">
                    <line
                        x1="95" y1="10"
                        x2="50" y2="30"
                        stroke="url(#gridFlowGradient)"
                        strokeWidth="0.8"
                        strokeDasharray="3,2"
                        markerEnd="url(#arrowHead)"
                        opacity="0.7"
                    >
                        <animate attributeName="strokeDashoffset" values="0;-100" dur="1s" repeatCount="indefinite" />
                    </line>
                    <circle cx="72" cy="18" r="1.5" fill="#ef4444">
                        <animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" />
                    </circle>
                </g>
            )}

            {energyFlow[EnergyFlow.TO_GRID] > 0 && (
                <g className="energy-flow-active">
                    <line
                        x1="50" y1="30"
                        x2="95" y2="10"
                        stroke="url(#gridFlowGradient)"
                        strokeWidth="0.8"
                        strokeDasharray="3,2"
                        markerEnd="url(#arrowHead)"
                        opacity="0.7"
                    >
                        <animate attributeName="strokeDashoffset" values="0;-100" dur="1s" repeatCount="indefinite" />
                    </line>
                    <circle cx="72" cy="18" r="1.5" fill="#22c55e">
                        <animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" />
                    </circle>
                </g>
            )}

            {/* ==================== 光伏 -> 储能/负荷 连接线 ==================== */}
            {!isNight && energyFlow[EnergyFlow.FROM_PV] > 0 && (
                <g className="energy-flow-active">
                    <line
                        x1="30" y1="20"
                        x2="45" y2="35"
                        stroke="url(#pvFlowGradient)"
                        strokeWidth="0.8"
                        strokeDasharray="3,2"
                        markerEnd="url(#arrowHead)"
                        opacity={0.5 + (energyFlow[EnergyFlow.FROM_PV] / 450) * 0.5}
                    >
                        <animate attributeName="strokeDashoffset" values="0;-100" dur="0.8s" repeatCount="indefinite" />
                    </line>
                    <circle cx="38" cy="28" r="1.2" fill="#fbbf24">
                        <animate attributeName="opacity" values="1;0.4;1" dur="0.6s" repeatCount="indefinite" />
                    </circle>
                </g>
            )}

            {/* ==================== 储能充放电动画 ==================== */}
            {energyFlow[EnergyFlow.TO_STORAGE] > 0 && (
                <g className="energy-flow-active">
                    {/* 储能充电指示圆环 */}
                    <circle cx="45" cy="35" r="3" fill="none" stroke="#3b82f6" strokeWidth="0.5" opacity="0.6">
                        <animate attributeName="r" values="3;6;3" dur="1.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.6;0;0.6" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    <text x="45" y="38" fontSize="3" fill="#3b82f6" textAnchor="middle" fontWeight="bold">
                        <animate attributeName="opacity" values="0.7;1;0.7" dur="1s" repeatCount="indefinite" />
                        充
                    </text>
                </g>
            )}

            {energyFlow[EnergyFlow.FROM_STORAGE] > 0 && (
                <g className="energy-flow-active">
                    {/* 储能放电指示圆环 */}
                    <circle cx="45" cy="35" r="3" fill="none" stroke="#f97316" strokeWidth="0.5" opacity="0.6">
                        <animate attributeName="r" values="3;6;3" dur="1.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.6;0;0.6" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    <text x="45" y="38" fontSize="3" fill="#f97316" textAnchor="middle" fontWeight="bold">
                        <animate attributeName="opacity" values="0.7;1;0.7" dur="1s" repeatCount="indefinite" />
                        放
                    </text>
                </g>
            )}

            {/* ==================== 充电桩能源指示 ==================== */}
            <g>
                {/* 充电桩1位置指示 */}
                <circle cx="12" cy="82" r="2" fill="none" stroke="#3b82f6" strokeWidth="0.4" opacity="0.4">
                    <animate attributeName="r" values="2;3;2" dur="2s" repeatCount="indefinite" />
                </circle>
                {/* 充电桩2位置指示 */}
                <circle cx="28" cy="82" r="2" fill="none" stroke="#3b82f6" strokeWidth="0.4" opacity="0.4">
                    <animate attributeName="r" values="2;3;2" dur="2s" repeatCount="indefinite" begin="0.5s" />
                </circle>
            </g>

            {/* ==================== 能源流动统计标签（可选）==================== */}
            {Object.values(energyFlow).some(v => v > 0) && (
                <g className="animate-fade-in">
                    <rect x="2" y="2" width="20" height="14" rx="1" fill="rgba(0,0,0,0.6)" />
                    <text x="3" y="5" fontSize="2.5" fill="white" fontWeight="bold">能源流向</text>
                    {energyFlow[EnergyFlow.FROM_PV] > 0 && (
                        <text x="3" y="8" fontSize="2" fill="#fbbf24">
                            光伏: {energyFlow[EnergyFlow.FROM_PV]}kW
                        </text>
                    )}
                    {energyFlow[EnergyFlow.FROM_GRID] > 0 && (
                        <text x="3" y="10.5" fontSize="2" fill="#ef4444">
                            取电: {energyFlow[EnergyFlow.FROM_GRID]}kW
                        </text>
                    )}
                    {energyFlow[EnergyFlow.TO_GRID] > 0 && (
                        <text x="3" y="10.5" fontSize="2" fill="#22c55e">
                            售电: {energyFlow[EnergyFlow.TO_GRID]}kW
                        </text>
                    )}
                    {energyFlow[EnergyFlow.TO_STORAGE] > 0 && (
                        <text x="3" y="13" fontSize="2" fill="#3b82f6">
                            充电: {energyFlow[EnergyFlow.TO_STORAGE]}kW
                        </text>
                    )}
                    {energyFlow[EnergyFlow.FROM_STORAGE] > 0 && (
                        <text x="3" y="13" fontSize="2" fill="#f97316">
                            放电: {energyFlow[EnergyFlow.FROM_STORAGE]}kW
                        </text>
                    )}
                </g>
            )}
        </svg>
    );
};

export default EnergyFlowOverlay;
