import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { memoryService, MemoryData } from '../services/memory';
import { calculationService } from '../services/api';
import { storage } from '../services/storage-adapter';

export interface Notification {
    message: string;
    type: 'success' | 'error';
}

interface AppContextType {
    notification: Notification | null;
    setNotification: (n: Notification | null) => void;
    isCalculating: boolean;
    setIsCalculating: (b: boolean) => void;
    apiAvailable: boolean;
    memory: MemoryData | null;
    loadMemory: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notification, setNotification] = useState<Notification | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [apiAvailable, setApiAvailable] = useState(true);
    const [memory, setMemory] = useState<MemoryData | null>(null);

    // 初始化记忆服务
    useEffect(() => {
        const initMemory = async () => {
            try {
                await memoryService.init();
                setMemory(memoryService.getQuickMemory());
            } catch (e) {
                console.error("Failed to initialize memory service:", e);
            }
        };
        initMemory();
    }, []);

    // 检查API可用性
    useEffect(() => {
        const checkAPI = async () => {
            try {
                const apiCheckCacheKey = 'ZERO_CARBON_API_CACHE';
                const CACHE_DURATION = 5 * 60 * 1000;

                const cachedData = await storage.getItem(apiCheckCacheKey);
                if (cachedData) {
                    const { available, timestamp } = JSON.parse(cachedData);
                    if (Date.now() - timestamp < CACHE_DURATION) {
                        setApiAvailable(available);
                        return;
                    }
                }

                const available = await calculationService.checkHealth();
                setApiAvailable(available);
                await storage.setItem(apiCheckCacheKey, JSON.stringify({ available, timestamp: Date.now() }));

                if (!available) {
                    setNotification({ message: '后端 API 不可用，已切换到离线模式。', type: 'error' });
                    setTimeout(() => setNotification(null), 3000);
                }
            } catch (e) {
                setApiAvailable(false);
            }
        };
        checkAPI();
    }, []);

    const loadMemory = useCallback(async () => {
        try {
            await memoryService.init();
            setMemory(memoryService.getQuickMemory());
        } catch (error) {
            console.error('Failed to load memory:', error);
        }
    }, []);

    return (
        <AppContext.Provider value={{
            notification, setNotification,
            isCalculating, setIsCalculating,
            apiAvailable,
            memory, loadMemory
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within an AppProvider');
    return context;
};
