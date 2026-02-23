import { useState, useCallback } from 'react';
import { HourlyData } from '../../../types';

/**
 * 模拟数据 Hook（预留接口）
 *
 * 用于生成24小时微电网仿真数据，后续可根据需求扩展自动播放功能
 */
export const useSimulationData = () => {
    const [simulationData, setSimulationData] = useState<HourlyData[] | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);

    /**
     * 生成24小时模拟数据
     *
     * 模拟内容包括：
     * - 光伏发电曲线（6:00-18:00，正弦波形）
     * - 负荷曲线（商业建筑典型曲线）
     * - 储能充放电策略（白天充电、傍晚放电）
     * - 电网交互（净负荷为正时取电，为负时售电）
     */
    const generateSimulationData = useCallback((): HourlyData[] => {
        const data: HourlyData[] = [];
        for (let hour = 0; hour < 24; hour++) {
            // 光伏发电曲线（6:00-18:00）
            const pvGeneration = (hour >= 6 && hour <= 18)
                ? Math.round(450 * Math.sin(((hour - 6) / 12) * Math.PI))
                : 0;

            // 负荷曲线（商业建筑典型）
            let load = 100 + Math.sin((hour - 8) / 16 * Math.PI) * 80 + Math.random() * 20;
            if (hour > 22 || hour < 6) load *= 0.6; // 夜间负荷降低
            load = Math.max(50, Math.round(load));

            // 储能充放电策略
            let storageCharge = 0;
            let storageDischarge = 0;
            if (hour >= 8 && hour <= 16) {
                storageCharge = 100; // 白天充电（利用光伏）
            } else if (hour >= 18 && hour <= 22) {
                storageDischarge = 100; // 晚上放电（削峰）
            }

            // 电网交互计算
            const netLoad = load - pvGeneration + (storageDischarge - storageCharge);
            const gridImport = netLoad > 0 ? netLoad : 0;
            const gridExport = netLoad < 0 ? Math.abs(netLoad) : 0;

            data.push({
                hour,
                pvGeneration,
                gridImport,
                gridExport,
                storageCharge,
                storageDischarge,
                load
            });
        }
        return data;
    }, []);

    /**
     * 开始模拟
     */
    const startSimulation = useCallback(() => {
        setIsSimulating(true);
        const data = generateSimulationData();
        setSimulationData(data);
        // TODO: 后续可添加定时器实现自动播放功能
        console.log('模拟数据已生成:', data);
    }, [generateSimulationData]);

    /**
     * 停止模拟
     */
    const stopSimulation = useCallback(() => {
        setIsSimulating(false);
        // TODO: 清理定时器
    }, []);

    return {
        simulationData,
        isSimulating,
        startSimulation,
        stopSimulation
    };
};
