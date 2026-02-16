import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { calculationService, CalculationResult, SolarParams, StorageParams, HVACParams, LightingParams, EVParams } from '../services/api';
import { memoryService, MemoryData } from '../services/memory';

// Define the shape of data for each module
export interface ModuleData {
  id: string;
  name: string;
  isActive: boolean;
  strategy: string;
  investment: number; // in 万元
  yearlySaving: number; // in 万元 or carbon tons converted to value
  kpiPrimary: { label: string; value: string }; // e.g., "1.2 MWp"
  kpiSecondary: { label: string; value: string }; // e.g., "ROI 12%"
  params?: any; // Generic container for module-specific state persistence
}

export interface Transformer {
  id: number;
  name: string;
  capacity: number; // kVA
  voltageLevel: string; // e.g., "10kV"
}

export interface Bill {
  id: number;
  month: string;
  kwh: number;
  cost: number;
  transformerId?: number;
}

// Global Price Config State
export interface PriceConfigState {
    mode: 'tou' | 'fixed' | 'spot';
    fixedPrice: number;
    touSegments: { start: number; end: number; price: number; type: string }[];
    spotPrices: number[]; // Added for spot price persistence
}

// Project Base Info (from Project Entry)
export interface ProjectBaseInfo {
    name: string;
    type: string;
    province: string;
    city: string;
    buildings: any[]; // Store complex building objects
}

export interface Notification {
    message: string;
    type: 'success' | 'error';
}

// Initial state for all modules
const initialModules: Record<string, ModuleData> = {
  'retrofit-solar': {
    id: 'retrofit-solar',
    name: '分布式光伏',
    isActive: true,
    strategy: 'rooftop',
    investment: 165.0,
    yearlySaving: 38.8,
    kpiPrimary: { label: '装机容量', value: '450 kW' },
    kpiSecondary: { label: 'ROI', value: '23.5%' }
  },
  'retrofit-storage': {
    id: 'retrofit-storage',
    name: '工商业储能',
    isActive: true,
    strategy: 'arbitrage',
    investment: 300.0,
    yearlySaving: 88.5,
    kpiPrimary: { label: '配置容量', value: '2 MWh' },
    kpiSecondary: { label: '回收期', value: '3.4 年' }
  },
  'retrofit-hvac': {
    id: 'retrofit-hvac',
    name: '暖通空调',
    isActive: true,
    strategy: 'replace',
    investment: 325.0,
    yearlySaving: 28.5,
    kpiPrimary: { label: '年节电', value: '34.2 万kWh' },
    kpiSecondary: { label: '节能率', value: '18.5%' }
  },
  'retrofit-lighting': {
    id: 'retrofit-lighting',
    name: '智能照明',
    isActive: true,
    strategy: 'smart',
    investment: 45.0,
    yearlySaving: 13.2,
    kpiPrimary: { label: '灯具数量', value: '2500 盏' },
    kpiSecondary: { label: '节电率', value: '60.5%' }
  },
  'retrofit-water': {
    id: 'retrofit-water',
    name: '热水系统',
    isActive: false,
    strategy: 'heatpump',
    investment: 85.0,
    yearlySaving: 18.8,
    kpiPrimary: { label: '日供水', value: '120 吨' },
    kpiSecondary: { label: '节能率', value: '65%' }
  },
  'retrofit-ev': {
    id: 'retrofit-ev',
    name: '充电桩设施',
    isActive: false,
    strategy: 'smart',
    investment: 45.0,
    yearlySaving: 43.8,
    kpiPrimary: { label: '桩体数量', value: '12 个' },
    kpiSecondary: { label: '年服务费', value: '43.8 万' }
  },
  'retrofit-microgrid': {
    id: 'retrofit-microgrid',
    name: '微电网',
    isActive: false,
    strategy: 'grid-tied',
    investment: 40.0,
    yearlySaving: 0, // Usually indirect benefits
    kpiPrimary: { label: 'PCC容量', value: '2500 kVA' },
    kpiSecondary: { label: '可靠性', value: '99.9%' }
  },
  'retrofit-vpp': {
    id: 'retrofit-vpp',
    name: '虚拟电厂',
    isActive: false,
    strategy: 'dr',
    investment: 10.0,
    yearlySaving: 13.5,
    kpiPrimary: { label: '调节容量', value: '500 kW' },
    kpiSecondary: { label: '响应时间', value: '分钟级' }
  },
  'retrofit-ai': {
    id: 'retrofit-ai',
    name: 'AI 智控平台',
    isActive: true,
    strategy: 'ai',
    investment: 35.0,
    yearlySaving: 20.0, // Assumed indirect
    kpiPrimary: { label: '接入点位', value: '2000 个' },
    kpiSecondary: { label: '额外节能', value: '8.5%' }
  },
  'retrofit-carbon': {
    id: 'retrofit-carbon',
    name: '碳资产管理',
    isActive: true,
    strategy: 'trade',
    investment: 0, // Service fee usually
    yearlySaving: 4.9,
    kpiPrimary: { label: '年减排', value: '580 t' },
    kpiSecondary: { label: '碳价', value: '85 元/t' }
  }
};

const initialPriceConfig: PriceConfigState = {
    mode: 'tou',
    fixedPrice: 0.85,
    touSegments: [
      { start: 0, end: 8, price: 0.32, type: 'valley' },
      { start: 8, end: 11, price: 0.68, type: 'flat' },
      { start: 11, end: 14, price: 1.15, type: 'peak' },
      { start: 14, end: 17, price: 1.62, type: 'tip' },
      { start: 17, end: 19, price: 1.15, type: 'peak' },
      { start: 19, end: 22, price: 0.68, type: 'flat' },
      { start: 22, end: 24, price: 0.32, type: 'valley' },
    ],
    spotPrices: Array(24).fill(0.5) // Default spot prices
};

const initialProjectBaseInfo: ProjectBaseInfo = {
    name: '上海浦东新区工业园节能改造项目',
    type: 'factory',
    province: 'Shanghai',
    city: 'Pudong',
    buildings: [] // Will be populated by default in component if empty
};

interface ProjectContextType {
  modules: Record<string, ModuleData>;
  updateModule: (id: string, data: Partial<ModuleData>) => void;
  toggleModule: (id: string) => void;
  getSummary: () => { totalInvestment: number; totalSaving: number; roi: number };
  transformers: Transformer[];
  setTransformers: (data: Transformer[]) => void;
  bills: Bill[];
  setBills: (data: Bill[]) => void;
  priceConfig: PriceConfigState;
  setPriceConfig: (config: PriceConfigState) => void;
  projectBaseInfo: ProjectBaseInfo;
  setProjectBaseInfo: (info: ProjectBaseInfo) => void;
  saveProject: () => void;
  notification: Notification | null;
  // 新增: API计算方法
  calculateSolar: (params: SolarParams) => Promise<CalculationResult>;
  calculateStorage: (params: StorageParams) => Promise<CalculationResult>;
  calculateHVAC: (params: HVACParams) => Promise<CalculationResult>;
  calculateLighting: (params: LightingParams) => Promise<CalculationResult>;
  calculateEV: (params: EVParams) => Promise<CalculationResult>;
  // 新增: 记忆和项目管理
  memory: MemoryData | null;
  loadMemory: () => Promise<void>;
  isCalculating: boolean;
  apiAvailable: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modules, setModules] = useState<Record<string, ModuleData>>(initialModules);
  const [transformers, setTransformers] = useState<Transformer[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [priceConfig, setPriceConfig] = useState<PriceConfigState>(initialPriceConfig);
  const [projectBaseInfo, setProjectBaseInfo] = useState<ProjectBaseInfo>(initialProjectBaseInfo);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [memory, setMemory] = useState<MemoryData | null>(null);

  // Load from LocalStorage
  useEffect(() => {
      const savedData = localStorage.getItem('ZERO_CARBON_PROJECT_DATA');
      if (savedData) {
          try {
              const parsed = JSON.parse(savedData);
              if (parsed.modules) setModules(parsed.modules);
              if (parsed.transformers) setTransformers(parsed.transformers);
              if (parsed.bills) setBills(parsed.bills);
              if (parsed.priceConfig) setPriceConfig(parsed.priceConfig);
              if (parsed.projectBaseInfo) setProjectBaseInfo(parsed.projectBaseInfo);
          } catch (e) {
              console.error("Failed to load project data", e);
          }
      }
  }, []);

  // 初始化记忆服务
  useEffect(() => {
      const initMemory = async () => {
          try {
              await memoryService.init();
              const mem = memoryService.getQuickMemory();
              setMemory(mem);
          } catch (e) {
              console.error("Failed to initialize memory service:", e);
          }
      };
      initMemory();
  }, []);

  // 检查API可用性
  useEffect(() => {
      const checkAPI = async () => {
          const available = await calculationService.checkHealth();
          setApiAvailable(available);
          if (!available) {
              console.warn('Backend API is not available, using offline mode');
              setNotification({
                  message: '后端 API 不可用，已切换到离线模式。部分功能可能受限。',
                  type: 'error'
              });
              // 3秒后自动清除通知
              setTimeout(() => {
                  setNotification(null);
              }, 3000);
          }
      };
      checkAPI();
  }, []);

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

    Object.values(modules).forEach((mod: ModuleData) => {
      if (mod.isActive) {
        totalInvestment += mod.investment;
        totalSaving += mod.yearlySaving;
      }
    });

    const roi = totalInvestment > 0 ? (totalSaving / totalInvestment) * 100 : 0;

    return { totalInvestment, totalSaving, roi };
  }, [modules]);

  const saveProject = useCallback(() => {
      const dataToSave = {
          modules,
          transformers,
          bills,
          priceConfig,
          projectBaseInfo,
          lastSaved: new Date().toISOString()
      };
      try {
          localStorage.setItem('ZERO_CARBON_PROJECT_DATA', JSON.stringify(dataToSave));
          setNotification({ message: '项目配置已成功保存', type: 'success' });
          setTimeout(() => setNotification(null), 3000);
      } catch (e) {
          setNotification({ message: '保存失败，请检查浏览器存储设置', type: 'error' });
      }
  }, [modules, transformers, bills, priceConfig, projectBaseInfo]);

  // ========== API计算方法 ==========

  const calculateSolar = useCallback(async (params: SolarParams): Promise<CalculationResult> => {
      setIsCalculating(true);
      try {
          const result = apiAvailable
              ? await calculationService.calculateSolar(params)
              : await calculationService.calculateSolarOffline(params);

          // 更新模块数据
          updateModule('retrofit-solar', {
              investment: result.investment,
              yearlySaving: result.annual_saving,
              kpiPrimary: { label: '装机容量', value: `${params.capacity} kW` },
              kpiSecondary: { label: 'IRR', value: `${result.irr.toFixed(1)}%` },
              params: { ...params, calculationResult: result }
          });

          return result;
      } catch (error) {
          console.error('Solar calculation failed:', error);
          throw error;
      } finally {
          setIsCalculating(false);
      }
  }, [apiAvailable]);

  const calculateStorage = useCallback(async (params: StorageParams): Promise<CalculationResult> => {
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
      } catch (error) {
          console.error('Storage calculation failed:', error);
          throw error;
      } finally {
          setIsCalculating(false);
      }
  }, []);

  const calculateHVAC = useCallback(async (params: HVACParams): Promise<CalculationResult> => {
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
      } catch (error) {
          console.error('HVAC calculation failed:', error);
          throw error;
      } finally {
          setIsCalculating(false);
      }
  }, []);

  const calculateLighting = useCallback(async (params: LightingParams): Promise<CalculationResult> => {
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
      } catch (error) {
          console.error('Lighting calculation failed:', error);
          throw error;
      } finally {
          setIsCalculating(false);
      }
  }, []);

  const calculateEV = useCallback(async (params: EVParams): Promise<CalculationResult> => {
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
      } catch (error) {
          console.error('EV calculation failed:', error);
          throw error;
      } finally {
          setIsCalculating(false);
      }
  }, []);

  // ========== 记忆管理方法 ==========

  const loadMemory = useCallback(async () => {
      try {
          await memoryService.init();
          const mem = memoryService.getQuickMemory();
          setMemory(mem);

          // 应用记忆中的偏好设置
          if (mem.preferences.defaultRegion) {
              setProjectBaseInfo(prev => ({ ...prev, province: mem.preferences.defaultRegion }));
          }
      } catch (error) {
          console.error('Failed to load memory:', error);
      }
  }, []);

  return (
    <ProjectContext.Provider value={{
        modules, updateModule, toggleModule, getSummary,
        transformers, setTransformers,
        bills, setBills,
        priceConfig, setPriceConfig,
        projectBaseInfo, setProjectBaseInfo,
        saveProject, notification,
        calculateSolar, calculateStorage, calculateHVAC, calculateLighting, calculateEV,
        memory, loadMemory,
        isCalculating, apiAvailable
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};