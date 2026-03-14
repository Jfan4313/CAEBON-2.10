import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isSupabaseConfigured } from '../services/supabase-adapter';

export type StorageMode = 'local' | 'cloud';

interface StorageContextType {
  mode: StorageMode;
  isCloudEnabled: boolean;
  toggleMode: () => void;
  setCloudEnabled: (enabled: boolean) => void;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

interface StorageProviderProps {
  children: ReactNode;
}

const STORAGE_MODE_KEY = 'carbon_storage_mode';

export const StorageProvider: React.FC<StorageProviderProps> = ({ children }) => {
  const [mode, setModeState] = useState<StorageMode>('local');
  const [isCloudEnabled, setIsCloudEnabled] = useState(false);

  useEffect(() => {
    // 从 localStorage 加载存储模式偏好
    const savedMode = localStorage.getItem(STORAGE_MODE_KEY) as StorageMode;
    if (savedMode && (savedMode === 'local' || savedMode === 'cloud')) {
      setModeState(savedMode);
    }

    // 检查 Supabase 是否已配置
    const configured = isSupabaseConfigured();
    setIsCloudEnabled(configured);

    // 如果 Supabase 未配置，强制使用本地模式
    if (!configured) {
      setModeState('local');
      localStorage.setItem(STORAGE_MODE_KEY, 'local');
    }
  }, []);

  const toggleMode = () => {
    const newMode: StorageMode = mode === 'local' ? 'cloud' : 'local';

    // 如果切换到云端但未配置，阻止切换
    if (newMode === 'cloud' && !isCloudEnabled) {
      alert('云存储未配置。请设置 Supabase 环境变量后再试。');
      return;
    }

    setModeState(newMode);
    localStorage.setItem(STORAGE_MODE_KEY, newMode);
  };

  const setCloudEnabled = (enabled: boolean) => {
    setIsCloudEnabled(enabled);

    // 如果禁用云端模式，切换回本地
    if (!enabled && mode === 'cloud') {
      setModeState('local');
      localStorage.setItem(STORAGE_MODE_KEY, 'local');
    }
  };

  return (
    <StorageContext.Provider value={{ mode, isCloudEnabled, toggleMode, setCloudEnabled }}>
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = (): StorageContextType => {
  const context = useContext(StorageContext);
  if (context === undefined) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
};
