/**
 * 记忆管理服务
 * 管理全局记忆、项目历史、用户偏好等
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ProjectSummary } from './api';

// ========== IndexedDB Schema ==========

interface ZeroCarbonMemoryDB extends DBSchema {
  projects: {
    key: string;
    value: ProjectSummary;
    indexes: { 'by-timestamp': string };
  };
  preferences: {
    key: string;
    value: Record<string, any>;
  };
  templates: {
    key: string;
    value: Record<string, any>;
  };
  learnings: {
    key: string;
    value: Record<string, any>;
  };
}

// ========== 类型定义 ==========

export interface MemoryData {
  lastAccessedProject: string | null;
  recentProjects: string[];
  preferences: {
    defaultRegion: string;
    defaultBuildingType: string;
    calculationMode: 'simple' | 'advanced';
    autoSaveInterval: number;
  };
  templates: {
    regionFactors: Record<string, RegionFactor>;
  };
  learnings: Record<string, any>;
}

export interface RegionFactor {
  region: string;
  climate: {
    avgTemp: number;
    tempAmplitude: number;
    dailyAmplitude: number;
  };
  energyPrice: {
    touTemplate: PriceSegment[];
    spotPriceTrend: number[];
  };
}

export interface PriceSegment {
  start: number;
  end: number;
  price: number;
  type: string;
}

// ========== localStorage 封装 ==========

const STORAGE_PREFIX = 'zce_memory_';

function get(key: string): string | null {
  return localStorage.getItem(STORAGE_PREFIX + key);
}

function set(key: string, value: string): void {
  localStorage.setItem(STORAGE_PREFIX + key, value);
}

function remove(key: string): void {
  localStorage.removeItem(STORAGE_PREFIX + key);
}

// ========== 记忆服务类 ==========

class MemoryService {
  private db: IDBPDatabase<ZeroCarbonMemoryDB> | null = null;
  private dbName = 'ZeroCarbonMemory';
  private dbVersion = 1;
  private isOnline = navigator.onLine;

  constructor() {
    // 监听网络状态
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingData();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // ========== 初始化 ==========

  async init(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await openDB<ZeroCarbonMemoryDB>(this.dbName, this.dbVersion, {
        upgrade(db) {
          // 创建项目存储
          const projectStore = db.createObjectStore('projects', {
            keyPath: 'projectId',
          });
          projectStore.createIndex('by-timestamp', 'timestamp');

          // 创建偏好设置存储
          db.createObjectStore('preferences', {
            keyPath: 'id',
          });

          // 创建模板存储
          db.createObjectStore('templates', {
            keyPath: 'id',
          });

          // 创建学习数据存储
          db.createObjectStore('learnings', {
            keyPath: 'id',
          });
        },
      });
      console.log('IndexedDB initialized successfully');
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      // 降级到localStorage
    }
  }

  // ========== 快速记忆 (localStorage) ==========

  getQuickMemory(): MemoryData {
    return {
      lastAccessedProject: get('lastAccessedProject'),
      recentProjects: JSON.parse(get('recentProjects') || '[]'),
      preferences: {
        defaultRegion: get('defaultRegion') || '广东省',
        defaultBuildingType: get('defaultBuildingType') || 'factory',
        calculationMode: (get('calculationMode') as 'simple' | 'advanced') || 'simple',
        autoSaveInterval: parseInt(get('autoSaveInterval') || '300', 10),
      },
      templates: {
        regionFactors: JSON.parse(get('regionFactors') || '{}'),
      },
      learnings: JSON.parse(get('learnings') || '{}'),
    };
  }

  setQuickMemory(key: keyof MemoryData, value: any): void {
    const memory = this.getQuickMemory();
    memory[key] = value;
    set('memory', JSON.stringify(memory));
  }

  // ========== 项目管理 ==========

  async saveProject(project: ProjectSummary): Promise<void> {
    // 保存到IndexedDB
    if (this.db) {
      const tx = this.db.transaction('projects', 'readwrite');
      await tx.store.put({
        ...project,
        savedAt: new Date().toISOString(),
      });
    }

    // 更新最近项目列表
    await this.addRecentProject(project.projectId, project.projectName);
  }

  async getProject(projectId: string): Promise<ProjectSummary | null> {
    if (!this.db) return null;

    const tx = this.db.transaction('projects', 'readonly');
    return await tx.store.get(projectId);
  }

  async getAllProjects(): Promise<ProjectSummary[]> {
    if (!this.db) return [];

    const tx = this.db.transaction('projects', 'readonly');
    return await tx.store.getAll();
  }

  async deleteProject(projectId: string): Promise<void> {
    // 从IndexedDB删除
    if (this.db) {
      const tx = this.db.transaction('projects', 'readwrite');
      await tx.store.delete(projectId);
    }

    // 从最近列表中移除
    const memory = this.getQuickMemory();
    memory.recentProjects = memory.recentProjects.filter(id => id !== projectId);
    this.setQuickMemory('recentProjects', memory.recentProjects);

    // 如果是当前项目，清空
    if (memory.lastAccessedProject === projectId) {
      set('lastAccessedProject', '');
    }
  }

  // ========== 最近项目 ==========

  async addRecentProject(projectId: string, projectName: string): Promise<void> {
    const memory = this.getQuickMemory();
    const recent = memory.recentProjects.filter(id => id !== projectId);
    recent.unshift(projectId);
    memory.recentProjects = recent.slice(0, 10); // 最多10个
    memory.lastAccessedProject = projectId;

    set('recentProjects', JSON.stringify(memory.recentProjects));
    set('lastAccessedProject', projectId);
    set('memory', JSON.stringify(memory));
  }

  getRecentProjects(): string[] {
    return this.getQuickMemory().recentProjects;
  }

  getLastAccessedProject(): string | null {
    return get('lastAccessedProject');
  }

  // ========== 用户偏好 ==========

  setPreference(key: string, value: any): void {
    const memory = this.getQuickMemory();
    memory.preferences[key] = value;
    set('memory', JSON.stringify(memory));

    // 单独存储以便快速访问
    set(`pref_${key}`, JSON.stringify(value));
  }

  getPreference<T>(key: string): T | null {
    const memory = this.getQuickMemory();
    const value = memory.preferences[key];
    if (value !== undefined) return value as T;

    // 从单独存储读取
    const stored = get(`pref_${key}`);
    return stored ? JSON.parse(stored) : null;
  }

  // ========== 区域知识库 ==========

  getRegionFactors(): Record<string, RegionFactor> {
    return this.getQuickMemory().templates.regionFactors;
  }

  getRegionFactor(region: string): RegionFactor | null {
    const factors = this.getRegionFactors();
    return factors[region] || null;
  }

  async saveRegionFactor(region: string, factor: RegionFactor): Promise<void> {
    const memory = this.getQuickMemory();
    memory.templates.regionFactors[region] = factor;
    set('regionFactors', JSON.stringify(memory.templates.regionFactors));
    set('memory', JSON.stringify(memory));

    // 同时保存到IndexedDB
    if (this.db) {
      const tx = this.db.transaction('templates', 'readwrite');
      await tx.store.put({ id: `region_${region}`, data: factor });
    }
  }

  // ========== 学习数据 ==========

  async updateLearnings(data: Record<string, any>): Promise<void> {
    const memory = this.getQuickMemory();
    memory.learnings = { ...memory.learnings, ...data };
    set('learnings', JSON.stringify(memory.learnings));
    set('memory', JSON.stringify(memory));

    // 同时保存到IndexedDB
    if (this.db) {
      const tx = this.db.transaction('learnings', 'readwrite');
      for (const [key, value] of Object.entries(data)) {
        await tx.store.put({ id: key, data: value });
      }
    }
  }

  getLearnings(): Record<string, any> {
    return this.getQuickMemory().learnings;
  }

  // ========== 智能建议 ==========

  getSmartSuggestions(currentProject: any): Array<{
    type: string;
    module: string;
    message: string;
  }> {
    const suggestions: Array<{ type: string; module: string; message: string }> = [];
    const learnings = this.getLearnings();
    const memory = this.getQuickMemory();

    // 基于区域特征的建议
    const region = currentProject?.projectBaseInfo?.province;
    if (region) {
      const regionFactor = this.getRegionFactor(region);
      if (regionFactor) {
        // 检查是否需要应用电价模板
        if (!memory.preferences.defaultRegion || memory.preferences.defaultRegion !== region) {
          suggestions.push({
            type: 'configuration',
            module: 'price',
            message: `检测到${region}地区，已应用对应的电价模板`,
          });
        }
      }
    }

    // 基于历史项目的建议
    const recent = memory.recentProjects.slice(0, 5);
    if (recent.length > 0) {
      // 检查储能配置
      const currentStorageRatio =
        currentProject?.modules?.['retrofit-storage']?.investment /
        (currentProject?.totalInvestment || 1);
      if (currentStorageRatio < 0.15) {
        suggestions.push({
          type: 'investment',
          module: 'storage',
          message: '储能配置偏低，建议配置15%以上容量以提高峰谷套利收益',
        });
      }
    }

    return suggestions;
  }

  // ========== 清理 ==========

  async clearOldProjects(daysOld: number = 90): Promise<void> {
    if (!this.db) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const tx = this.db.transaction('projects', 'readwrite');
    const projects = await tx.store.getAll();
    const idsToDelete = projects
      .filter(p => new Date(p.timestamp) < cutoffDate)
      .map(p => p.projectId);

    for (const id of idsToDelete) {
      await tx.store.delete(id);
    }

    console.log(`Cleared ${idsToDelete.length} old projects`);
  }

  async clearAllData(): Promise<void> {
    // 清空localStorage
    Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_PREFIX))
      .forEach(key => localStorage.removeItem(key));

    // 清空IndexedDB
    if (this.db) {
      const stores = ['projects', 'preferences', 'templates', 'learnings'];
      for (const storeName of stores) {
        const tx = this.db.transaction(storeName, 'readwrite');
        await tx.store.clear();
      }
    }
  }

  // ========== 同步 ==========

  private async syncPendingData(): Promise<void> {
    // 重新上线时同步数据
    console.log('Syncing pending data...');
    // 这里可以实现与后端的数据同步逻辑
  }

  // ========== 工具方法 ==========

  getStorageUsage(): { used: number; total: number } {
    // 计算localStorage使用量
    let used = 0;
    Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_PREFIX))
      .forEach(key => {
        used += localStorage.getItem(key)?.length || 0;
      });

    return {
      used,
      total: 5 * 1024 * 1024, // 约5MB
    };
  }
}

// 导出单例
export const memoryService = new MemoryService();
