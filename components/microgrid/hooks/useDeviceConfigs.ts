import { useState, useEffect } from 'react';
import { PanelState, DeviceImageConfig } from '../../../types';
import { DEFAULT_DEVICE_CONFIGS } from '../constants/defaultConfigs';
import { saveToStorage, loadFromStorage } from '../../../utils/deviceConfigUtils';

/**
 * 配置管理 Hook
 *
 * 提供配置面板的状态管理功能，包括：
 * - 面板开关状态
 * - 选中配置项
 * - 配置列表
 * - 添加/更新/删除配置
 * - 保存/加载/重置配置
 */
export const useDeviceConfigs = () => {
    const [panelState, setPanelState] = useState<PanelState>({
        isOpen: false,
        selectedConfigId: null,
        configs: DEFAULT_DEVICE_CONFIGS,
        isDirty: false
    });

    // 加载保存的配置
    useEffect(() => {
        const loaded = loadFromStorage();
        if (loaded && loaded.length > 0) {
            setPanelState(prev => ({ ...prev, configs: loaded }));
        }
    }, [loadFromStorage]);

    /**
     * 添加新配置
     */
    const addConfig = (config: DeviceImageConfig) => {
        setPanelState(prev => ({
            ...prev,
            configs: [...prev.configs, { ...config, id: `custom-${Date.now()}` }],
            isDirty: true,
            selectedConfigId: config.id
        }));
    };

    /**
     * 更新配置
     */
    const updateConfig = (id: string, updates: Partial<DeviceImageConfig>) => {
        setPanelState(prev => ({
            ...prev,
            configs: prev.configs.map(c => c.id === id ? { ...c, ...updates } : c),
            isDirty: true
        }));
    };

    /**
     * 删除配置
     */
    const deleteConfig = (id: string) => {
        setPanelState(prev => ({
            ...prev,
            configs: prev.configs.filter(c => c.id !== id),
            selectedConfigId: prev.selectedConfigId === id ? null : prev.selectedConfigId,
            isDirty: true
        }));
    };

    /**
     * 保存配置到 localStorage
     */
    const saveConfigs = () => {
        saveToStorage(panelState.configs);
        setPanelState(prev => ({ ...prev, isDirty: false }));
    };

    /**
     * 重置为默认配置
     */
    const resetConfigs = () => {
        setPanelState({
            isOpen: false,
            selectedConfigId: null,
            configs: DEFAULT_DEVICE_CONFIGS,
            isDirty: false
        });
    };

    /**
     * 从 localStorage 加载配置并返回
     */
    const loadConfigs = () => {
        const loaded = loadFromStorage();
        return loaded || DEFAULT_DEVICE_CONFIGS;
    };

    /**
     * 选择配置项进行编辑
     */
    const selectConfig = (id: string) => {
        setPanelState(prev => ({ ...prev, selectedConfigId: id }));
    };

    /**
     * 切换面板状态
     */
    const togglePanel = () => {
        setPanelState(prev => ({ ...prev, isOpen: !prev.isOpen }));
    };

    return {
        panelState,
        setPanelState,
        addConfig,
        updateConfig,
        deleteConfig,
        saveConfigs,
        loadConfigs,
        resetConfigs,
        selectConfig,
        togglePanel
    };
};
