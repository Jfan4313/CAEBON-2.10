/**
 * 项目存储服务
 * 提供项目的保存、加载、导出、导入功能
 */

import { storage } from './storage-adapter';
import {
  ProjectTemplate,
  ProjectListItem,
  ProjectFullData,
  ImportValidationResult,
  ProjectListOptions,
  ExportOptions
} from '../types/projectStorage';

const PROJECT_LIST_KEY = 'ZERO_CARBON_PROJECT_LIST';
const PROJECT_PREFIX = 'ZERO_CARBON_PROJECT_';
const CURRENT_VERSION = '1.0.0';

type LegacyProjectListEntry = Omit<ProjectTemplate, 'data'> & {
  data?: ProjectFullData;
  activeModuleCount?: number;
};

// 默认项目模板
const DEFAULT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'template-default',
    name: '默认项目模板',
    description: '包含常用改造模块的默认配置',
    data: {
      projectBaseInfo: {
        name: '零碳项目',
        type: 'factory',
        province: 'Shanghai',
        city: 'Shanghai',
        buildings: []
      },
      modules: {},
      transformers: [],
      bills: [],
      priceConfig: {
        mode: 'tou',
        fixedPrice: 0.85,
        touSegments: [
          { start: 0, end: 8, price: 0.32, type: 'valley' },
          { start: 8, end: 11, price: 0.68, type: 'flat' },
          { start: 11, end: 14, price: 1.15, type: 'peak' },
          { start: 14, end: 17, price: 1.62, type: 'tip' },
          { start: 17, end: 19, price: 1.15, type: 'peak' },
          { start: 19, end: 22, price: 0.68, type: 'flat' },
          { start: 22, end: 24, price: 0.32, type: 'valley' }
        ],
        spotPrices: Array(24).fill(0.5)
      },
      version: CURRENT_VERSION
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isTemplate: true
  }
];

class ProjectStorageService {
  /**
   * 项目列表只保存轻量索引，完整数据单独存储，避免同一项目被重复保存两次。
   */
  private toProjectListEntry(project: ProjectTemplate): ProjectListItem {
    const { data: _data, ...entry } = project;
    return {
      ...entry,
      activeModuleCount: Object.values(project.data.modules ?? {}).filter(module => module.isActive).length
    };
  }

  private async persistProjectList(list: ProjectListItem[]): Promise<void> {
    await storage.setItem(PROJECT_LIST_KEY, JSON.stringify(list));
  }

  /**
   * 兼容旧版把完整项目塞进列表的格式，并在保存前主动释放这部分空间。
   */
  private async compactStoredProjectList(): Promise<void> {
    const listJson = await storage.getItem(PROJECT_LIST_KEY);
    if (!listJson) return;

    const entries: LegacyProjectListEntry[] = JSON.parse(listJson);
    const compactEntries: ProjectListItem[] = entries.map(entry => {
      const { data: _data, ...metadata } = entry;
      return {
        ...metadata,
        activeModuleCount: entry.activeModuleCount ??
          Object.values(entry.data?.modules ?? {}).filter(module => module.isActive).length
      };
    });
    await storage.setItem(PROJECT_LIST_KEY, JSON.stringify(compactEntries));
  }

  private async loadProjectTemplate(id: string): Promise<ProjectTemplate | null> {
    const projectJson = await storage.getItem(`${PROJECT_PREFIX}${id}`);
    return projectJson ? JSON.parse(projectJson) as ProjectTemplate : null;
  }

  /**
   * 初始化服务，加载默认模板（如果不存在）
   */
  async init(): Promise<void> {
    const list = await this.getProjectList();
    if (list.length === 0) {
      // 保存默认模板
      for (const template of DEFAULT_TEMPLATES) {
        await this.saveProjectToStorage(template);
      }
    }
  }

  /**
   * 获取项目列表
   */
  async getProjectList(options?: ProjectListOptions): Promise<ProjectListItem[]> {
    const listJson = await storage.getItem(PROJECT_LIST_KEY);
    if (!listJson) return [];

    const entries: LegacyProjectListEntry[] = JSON.parse(listJson);
    let list: ProjectListItem[] = entries.map(entry => {
      const { data: _data, ...metadata } = entry;
      return {
        ...metadata,
        activeModuleCount: entry.activeModuleCount ??
          Object.values(entry.data?.modules ?? {}).filter(module => module.isActive).length
      };
    });

    // 过滤模板
    if (options?.templatesOnly) {
      list = list.filter(p => p.isTemplate);
    }

    // 排序
    const sortBy = options?.sortBy || 'updatedAt';
    const sortOrder = options?.sortOrder || 'desc';

    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'updatedAt') {
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  }

  /**
   * 保存项目到存储
   */
  async saveProjectToStorage(project: ProjectTemplate): Promise<void> {
    const projectKey = `${PROJECT_PREFIX}${project.id}`;
    const previousProject = await storage.getItem(projectKey);

    try {
      // 先迁移旧列表，通常可立即释放一半以上的项目存储空间。
      await this.compactStoredProjectList();
      await storage.setItem(projectKey, JSON.stringify(project));
      await this.updateProjectList(project);
    } catch (error) {
      // 避免列表更新失败后留下不可见的孤立项目，占用更多空间。
      if (previousProject) {
        await storage.setItem(projectKey, previousProject);
      } else {
        await storage.removeItem(projectKey);
      }
      throw error;
    }
  }

  /**
   * 加载项目数据
   */
  async loadProjectData(id: string): Promise<ProjectFullData | null> {
    const project = await this.loadProjectTemplate(id);
    return project?.data ?? null;
  }

  /**
   * 删除项目
   */
  async deleteProject(id: string): Promise<boolean> {
    const projectKey = `${PROJECT_PREFIX}${id}`;

    // 检查是否是模板
    const list = await this.getProjectList();
    const project = list.find(p => p.id === id);
    if (project?.isTemplate) {
      return false; // 模板不能删除
    }

    // 删除项目数据
    await storage.removeItem(projectKey);

    // 从列表中移除
    const newList = list.filter(p => p.id !== id);
    await this.persistProjectList(newList);

    return true;
  }

  /**
   * 更新项目名称，不需要把完整项目数据加载到列表组件中。
   */
  async renameProject(id: string, name: string): Promise<boolean> {
    const project = await this.loadProjectTemplate(id);
    if (!project || project.isTemplate) return false;

    await this.saveProjectToStorage({
      ...project,
      name,
      updatedAt: new Date().toISOString()
    });
    return true;
  }

  /**
   * 导出项目配置为 JSON 文件
   */
  exportProjectConfig(data: ProjectFullData, options?: ExportOptions): void {
    // 添加版本信息和导出时间
    const exportData = {
      ...data,
      version: data.version || CURRENT_VERSION,
      exportedAt: new Date().toISOString()
    };

    const formatted = options?.formatted !== false;
    const json = JSON.stringify(exportData, null, formatted ? 2 : 0);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const filename = options?.filename ||
      `${data.projectBaseInfo.name || '零碳项目'}_config_${new Date().toISOString().slice(0, 10)}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * 从 JSON 文件导入项目配置
   */
  importProjectConfig(file: File): Promise<ImportValidationResult> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const json = e.target?.result as string;
          const data = JSON.parse(json);

          // 验证数据
          const validation = this.validateProjectData(data);
          if (validation.valid) {
            resolve({
              valid: true,
              errors: [],
              warnings: validation.warnings,
              data: data as ProjectFullData
            });
          } else {
            resolve({
              valid: false,
              errors: validation.errors,
              warnings: validation.warnings
            });
          }
        } catch (error) {
          resolve({
            valid: false,
            errors: ['JSON 格式解析失败，请检查文件格式'],
            warnings: []
          });
        }
      };

      reader.onerror = () => {
        resolve({
          valid: false,
          errors: ['文件读取失败，请重试'],
          warnings: []
        });
      };

      reader.readAsText(file);
    });
  }

  /**
   * 验证项目数据
   */
  private validateProjectData(data: any): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 必填字段检查
    if (!data.projectBaseInfo) {
      errors.push('缺少 projectBaseInfo 字段');
    } else if (!data.projectBaseInfo.name) {
      errors.push('项目名称 (projectBaseInfo.name) 不能为空');
    }

    if (!data.modules) {
      errors.push('缺少 modules 字段');
    } else if (typeof data.modules !== 'object') {
      errors.push('modules 必须是对象');
    }

    // 可选字段检查
    if (!data.transformers) {
      warnings.push('缺少 transformers 字段，将使用空数组');
      data.transformers = [];
    }

    if (!data.bills) {
      warnings.push('缺少 bills 字段，将使用空数组');
      data.bills = [];
    }

    if (!data.priceConfig) {
      warnings.push('缺少 priceConfig 字段，将使用默认电价配置');
    }

    // 版本兼容性检查
    if (data.version && data.version !== CURRENT_VERSION) {
      warnings.push(`项目版本 ${data.version} 与当前版本 ${CURRENT_VERSION} 可能存在差异，部分数据可能需要手动调整`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 更新项目列表
   */
  private async updateProjectList(project: ProjectTemplate): Promise<void> {
    const list = await this.getProjectList();
    const existingIndex = list.findIndex(p => p.id === project.id);

    const projectWithTimestamp: ProjectListItem = {
      ...this.toProjectListEntry(project),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      // 更新现有项目
      list[existingIndex] = projectWithTimestamp;
    } else {
      // 添加新项目
      if (!project.createdAt) {
        projectWithTimestamp.createdAt = new Date().toISOString();
      }
      list.push(projectWithTimestamp);
    }

    await this.persistProjectList(list);
  }

  /**
   * 快速保存项目
   */
  async quickSaveProject(
    data: ProjectFullData,
    name?: string,
    description?: string
  ): Promise<ProjectTemplate> {
    const normalizedName = name?.trim();
    const existingProject = normalizedName
      ? (await this.getProjectList()).find(project =>
          !project.isTemplate && project.name.trim() === normalizedName
        )
      : undefined;
    const now = new Date().toISOString();
    const id = existingProject?.id ?? (normalizedName
      ? `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      : `autosave_${Date.now()}`);

    const project: ProjectTemplate = {
      id,
      name: normalizedName || data.projectBaseInfo.name || '未命名项目',
      description,
      data: {
        ...data,
        lastSaved: now
      },
      createdAt: existingProject?.createdAt ?? now,
      updatedAt: now,
      isTemplate: false
    };

    await this.saveProjectToStorage(project);
    return project;
  }

  /**
   * 生成新项目ID
   */
  generateProjectId(): string {
    return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 导出单例
export const projectStorageService = new ProjectStorageService();
