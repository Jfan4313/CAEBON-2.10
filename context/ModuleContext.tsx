import React, { createContext, useContext, useState, useCallback } from 'react';
import { calculationService, CalculationResult, SolarParams, StorageParams, HVACParams, LightingParams, EVParams } from '../services/api';
import { initialModules } from './initialData';
import { useApp } from './AppContext';

export interface ModuleData {
    id: string;
    name: string;
    isActive: boolean;
    strategy: string;
    investment: number;
    yearlySaving: number;
    kpiPrimary: { label: string; value: string };
    kpiSecondary: { label: string; value: string };
    params?: any;
}

interface ModuleContextType {
    modules: Record<string, ModuleData>;
    setModules: (m: Record<string, ModuleData>) => void;
    updateModule: (id: string, data: Partial<ModuleData>) => void;
    toggleModule: (id: string) => void;
    getSummary: () => { totalInvestment: number; totalSaving: number; roi: number };
    calculateSolar: (params: SolarParams) => Promise<CalculationResult>;
    calculateStorage: (params: StorageParams) => Promise<CalculationResult>;
    calculateHVAC: (params: HVACParams) => Promise<CalculationResult>;
    calculateLighting: (params: LightingParams) => Promise<CalculationResult>;
    calculateEV: (params: EVParams) => Promise<CalculationResult>;
}

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

export const ModuleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [modules, setModules] = useState<Record<string, ModuleData>>(initialModules);
    const { apiAvailable, setIsCalculating } = useApp();

    const updateModule = useCallback((id: string, data: Partial<ModuleData>) => {
        setModules(prev => ({
            ...prev,
            [id]: { ...prev[id], ...data }
        }));
    }, []);

    const toggleModule = useCallback((id: string) => {
        setModules(prev => ({
            ...prev,
            [id]: { ...prev[id], isActive: !prev[id].isActive }
        }));
    }, []);

    const getSummary = useCallback(() => {
        let totalInvestment = 0;
        let totalSaving = 0;
        Object.values(modules).forEach(mod => {
            if (mod.isActive) {
                totalInvestment += mod.investment;
                totalSaving += mod.yearlySaving;
            }
        });
        const roi = totalInvestment > 0 ? (totalSaving / totalInvestment) * 100 : 0;
        return { totalInvestment, totalSaving, roi };
    }, [modules]);

    const calculateSolar = useCallback(async (params: SolarParams) => {
        setIsCalculating(true);
        try {
            const result = apiAvailable
                ? await calculationService.calculateSolar(params)
                : await calculationService.calculateSolarOffline(params);
            updateModule('retrofit-solar', {
                investment: result.investment,
                yearlySaving: result.annual_saving,
                kpiPrimary: { label: '装机容量', value: `${params.capacity} kW` },
                kpiSecondary: { label: 'IRR', value: `${result.irr.toFixed(1)}%` },
                params: { ...params, calculationResult: result }
            });
            return result;
        } finally {
            setIsCalculating(false);
        }
    }, [apiAvailable, setIsCalculating, updateModule]);

    const calculateStorage = useCallback(async (params: StorageParams) => {
        setIsCalculating(true);
        try {
            const result = await calculationService.calculateStorage(params);
            updateModule('retrofit-storage', {
                investment: result.investment,
                yearlySaving: result.annual_saving,
                kpiPrimary: { label: '配置容量', value: `${params.capacity} kWh` },
                kpiSecondary: { label: 'IRR', value: `${result.irr.toFixed(1)}%` },
                params: { ...params, calculationResult: result }
            });
            return result;
        } finally {
            setIsCalculating(false);
        }
    }, [setIsCalculating, updateModule]);

    const calculateHVAC = useCallback(async (params: HVACParams) => {
        setIsCalculating(true);
        try {
            const result = await calculationService.calculateHVAC(params);
            updateModule('retrofit-hvac', {
                investment: result.investment,
                yearlySaving: result.annual_saving,
                kpiPrimary: { label: '年节电', value: `${(result.annual_saving * 10000 / 0.85).toFixed(0)} kWh` },
                kpiSecondary: { label: 'IRR', value: `${result.irr.toFixed(1)}%` },
                params: { ...params, calculationResult: result }
            });
            return result;
        } finally {
            setIsCalculating(false);
        }
    }, [setIsCalculating, updateModule]);

    const calculateLighting = useCallback(async (params: LightingParams) => {
        setIsCalculating(true);
        try {
            const result = await calculationService.calculateLighting(params);
            updateModule('retrofit-lighting', {
                investment: result.investment,
                yearlySaving: result.annual_saving,
                kpiPrimary: { label: '节电率', value: `${(result.carbon_reduction * 1000 / 100).toFixed(1)}%` },
                kpiSecondary: { label: 'IRR', value: `${result.irr.toFixed(1)}%` },
                params: { ...params, calculationResult: result }
            });
            return result;
        } finally {
            setIsCalculating(false);
        }
    }, [setIsCalculating, updateModule]);

    const calculateEV = useCallback(async (params: EVParams) => {
        setIsCalculating(true);
        try {
            const result = await calculationService.calculateEV(params);
            updateModule('retrofit-ev', {
                investment: result.investment,
                yearlySaving: result.annual_saving,
                kpiPrimary: { label: '桩体数量', value: `${params.chargerCount} 个` },
                kpiSecondary: { label: 'IRR', value: `${result.irr.toFixed(1)}%` },
                params: { ...params, calculationResult: result }
            });
            return result;
        } finally {
            setIsCalculating(false);
        }
    }, [setIsCalculating, updateModule]);

    return (
        <ModuleContext.Provider value={{
            modules, setModules, updateModule, toggleModule, getSummary,
            calculateSolar, calculateStorage, calculateHVAC, calculateLighting, calculateEV
        }}>
            {children}
        </ModuleContext.Provider>
    );
};

export const useModule = () => {
    const context = useContext(ModuleContext);
    if (!context) throw new Error('useModule must be used within a ModuleProvider');
    return context;
};
