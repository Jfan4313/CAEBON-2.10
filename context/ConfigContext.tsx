import React, { createContext, useContext, useState, useCallback } from 'react';
import { initialPriceConfig } from './initialData';
import { projectStorageService } from '../services/projectStorage';
import { ProjectFullData } from '../types/projectStorage';
import { useApp } from './AppContext';

export interface Transformer {
    id: number;
    name: string;
    capacity: number;
    voltageLevel: string;
}

export interface Bill {
    id: number;
    month: string;
    kwh: number;
    cost: number;
    transformerId?: number;
    /** 分时电量，均为可选字段，兼容历史项目的总电量账单。 */
    sharpPeakKwh?: number;
    peakKwh?: number;
    flatKwh?: number;
    valleyKwh?: number;
    /** 当月电费单列示的分时电价；未填写时使用项目电价配置。 */
    sharpPeakPrice?: number;
    peakPrice?: number;
    flatPrice?: number;
    valleyPrice?: number;
    billingMode?: 'tou' | 'fixed';
    fixedUnitPrice?: number;
    /** 正向无功总电量，仅用于功率因数与无功补偿分析，不计入有功用电量。 */
    reactiveKvarh?: number;
}

export interface PriceConfigState {
    mode: 'tou' | 'fixed' | 'spot';
    fixedPrice: number;
    touSegments: { start: number; end: number; price: number; type: string }[];
    spotPrices: number[];
}

interface ConfigContextType {
    transformers: Transformer[];
    setTransformers: (data: Transformer[]) => void;
    bills: Bill[];
    setBills: (data: Bill[]) => void;
    priceConfig: PriceConfigState;
    setPriceConfig: (config: PriceConfigState) => void;
    importProjectConfig: (data: ProjectFullData, setters: any) => void;
    exportProjectConfig: (data: ProjectFullData, filename?: string) => void;
    quickSaveProject: (data: ProjectFullData, name?: string, description?: string) => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [transformers, setTransformers] = useState<Transformer[]>([]);
    const [bills, setBills] = useState<Bill[]>([]);
    const [priceConfig, setPriceConfig] = useState<PriceConfigState>(initialPriceConfig);
    const { setNotification } = useApp();

    const importProjectConfig = useCallback((data: ProjectFullData, setters: any) => {
        if (data.transformers) setTransformers(data.transformers);
        if (data.bills) setBills(data.bills);
        if (data.priceConfig) setPriceConfig(data.priceConfig);

        // Call other setters passed from parent (ProjectContext)
        if (data.projectBaseInfo && setters.setProjectBaseInfo) setters.setProjectBaseInfo(data.projectBaseInfo);
        if (data.modules && setters.setModules) setters.setModules(data.modules);

        setNotification({ message: '项目配置已成功导入', type: 'success' });
        setTimeout(() => setNotification(null), 3000);
    }, [setNotification]);

    const exportProjectConfig = useCallback((data: ProjectFullData, filename?: string) => {
        projectStorageService.exportProjectConfig(data, { filename });
        setNotification({ message: '项目配置已成功导出', type: 'success' });
        setTimeout(() => setNotification(null), 3000);
    }, [setNotification]);

    const quickSaveProject = useCallback(async (data: ProjectFullData, name?: string, description?: string) => {
        try {
            await projectStorageService.quickSaveProject(data, name, description);
            setNotification({ message: '项目已成功保存到本地列表', type: 'success' });
            setTimeout(() => setNotification(null), 3000);
        } catch (error) {
            console.error('Failed to save project:', error);
            const isStorageFull = error instanceof DOMException &&
                (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
            setNotification({
                message: isStorageFull ? '本地存储空间不足，项目保存失败' : '保存失败，请重试',
                type: 'error'
            });
            setTimeout(() => setNotification(null), 3000);
            throw error;
        }
    }, [setNotification]);

    return (
        <ConfigContext.Provider value={{
            transformers, setTransformers,
            bills, setBills,
            priceConfig, setPriceConfig,
            importProjectConfig, exportProjectConfig, quickSaveProject
        }}>
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = () => {
    const context = useContext(ConfigContext);
    if (!context) throw new Error('useConfig must be used within a ConfigProvider');
    return context;
};
