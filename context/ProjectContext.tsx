import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { storage } from '../services/storage-adapter';
import { ProjectFullData } from '../types/projectStorage';
import { AppProvider, useApp } from './AppContext';
import { ModuleProvider, useModule } from './ModuleContext';
import { ConfigProvider, useConfig } from './ConfigContext';
import { initialProjectBaseInfo } from './initialData';

// Re-export types for backward compatibility
export type { Transformer, Bill, PriceConfigState } from './ConfigContext';
export type { ModuleData } from './ModuleContext';
export type { Notification } from './AppContext';

export interface ProjectBaseInfo {
    name: string;
    type: string;
    schoolType?: 'primary_middle' | 'high_school' | 'university' | 'vocational' | 'training';
    hasAirConditioning?: boolean;
    storageCapacity?: number;
    province: string;
    city: string;
    buildings: any[];
    // Financial & Risk parameters
    omRate?: number; // Annual Operations & Maintenance rate (% of CAPEX)
    taxRate?: number; // Corporate tax rate (%)
    discountRate?: number; // Discount rate for NPV (%)
    spvConfig?: {
        debtRatio: number; // 贷款比例 (%)
        loanInterest: number; // 贷款年利率 (%)
        loanTerm: number; // 贷款年限
        shareholderARate: number; // 资方A持股比例 (%)
    };
}

interface ProjectContextType {
    // From Core (ProjectContext itself)
    projectBaseInfo: ProjectBaseInfo;
    setProjectBaseInfo: (info: ProjectBaseInfo) => void;
    saveProject: () => Promise<void>;

    // Delegated from AppContext
    notification: any;
    isCalculating: any;
    apiAvailable: any;
    memory: any;
    loadMemory: any;

    // Delegated from ModuleContext
    modules: any;
    updateModule: any;
    toggleModule: any;
    getSummary: any;
    calculateSolar: any;
    calculateStorage: any;
    calculateHVAC: any;
    calculateLighting: any;
    calculateEV: any;

    // Delegated from ConfigContext
    transformers: any;
    setTransformers: any;
    bills: any;
    setBills: any;
    priceConfig: any;
    setPriceConfig: any;
    importProjectConfig: (data: ProjectFullData) => void;
    exportProjectConfig: (filename?: string) => void;
    quickSaveProject: (name?: string, description?: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Core implementation that will be wrapped by all providers
const ProjectCoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [projectBaseInfo, setProjectBaseInfo] = useState<ProjectBaseInfo>(initialProjectBaseInfo);

    const app = useApp();
    const mod = useModule();
    const conf = useConfig();

    // Load from Storage
    useEffect(() => {
        const loadFromStorage = async () => {
            const savedData = await storage.getItem('ZERO_CARBON_PROJECT_DATA');
            if (savedData) {
                try {
                    const parsed = JSON.parse(savedData);
                    if (parsed.projectBaseInfo) setProjectBaseInfo(parsed.projectBaseInfo);
                    if (parsed.modules) mod.setModules(parsed.modules);
                    if (parsed.transformers) conf.setTransformers(parsed.transformers);
                    if (parsed.bills) conf.setBills(parsed.bills);
                    if (parsed.priceConfig) conf.setPriceConfig(parsed.priceConfig);
                } catch (e) {
                    console.error("Failed to load project data", e);
                }
            }
        };
        loadFromStorage();
    }, []);

    const dataToSave = useMemo(() => ({
        modules: mod.modules,
        transformers: conf.transformers,
        bills: conf.bills,
        priceConfig: conf.priceConfig,
        projectBaseInfo,
        lastSaved: new Date().toISOString()
    }), [mod.modules, conf.transformers, conf.bills, conf.priceConfig, projectBaseInfo]);

    const saveProject = useCallback(async () => {
        try {
            await storage.setItem('ZERO_CARBON_PROJECT_DATA', JSON.stringify(dataToSave));
            app.setNotification({ message: '项目配置已成功保存', type: 'success' });
            setTimeout(() => app.setNotification(null), 3000);
        } catch (e) {
            app.setNotification({ message: '保存失败，请检查存储设置', type: 'error' });
        }
    }, [dataToSave, app]);

    const value: ProjectContextType = {
        projectBaseInfo, setProjectBaseInfo, saveProject,
        ...app,
        ...mod,
        ...conf,
        importProjectConfig: (data) => conf.importProjectConfig(data, { setProjectBaseInfo, setModules: mod.setModules }),
        exportProjectConfig: (filename) => conf.exportProjectConfig({ ...dataToSave, version: '1.0.0' }, filename),
        quickSaveProject: (name, desc) => conf.quickSaveProject({ ...dataToSave, version: '1.0.0' }, name, desc)
    };

    return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

// Final exported Provider that wraps everything in order
export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AppProvider>
        <ConfigProvider>
            <ModuleProvider>
                <ProjectCoreProvider>
                    {children}
                </ProjectCoreProvider>
            </ModuleProvider>
        </ConfigProvider>
    </AppProvider>
);

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (!context) throw new Error('useProject must be used within a ProjectProvider');
    return context;
};