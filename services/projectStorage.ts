/**
 * 项目存储服务
 * 提供项目的保存、加载、导出、导入功能
 */

import { storage } from './storage-adapter';
import {
  ProjectTemplate,
  ProjectFullData,
  ImportValidationResult,
  ProjectListOptions,
  ExportOptions
} from '../types/projectStorage';

const PROJECT_LIST_KEY = 'ZERO_CARBON_PROJECT_LIST';
const PROJECT_PREFIX = 'ZERO_CARBON_PROJECT_';
const CURRENT_VERSION = '1.0.0';

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
  async getProjectList(options?: ProjectListOptions): Promise<ProjectTemplate[]> {
    const listJson = await storage.getItem(PROJECT_LIST_KEY);
    if (!listJson) return [];

    let list: ProjectTemplate[] = JSON.parse(listJson);

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
    // 保存项目数据
    const projectKey = `${PROJECT_PREFIX}${project.id}`;
    await storage.setItem(projectKey, JSON.stringify(project));

    // 更新项目列表
    await this.updateProjectList(project);
  }

  /**
   * 加载项目数据
   */
  async loadProjectData(id: string): Promise<ProjectFullData | null> {
    const projectKey = `${PROJECT_PREFIX}${id}`;
    const projectJson = await storage.getItem(projectKey);

    if (!projectJson) return null;

    const project: ProjectTemplate = JSON.parse(projectJson);
    return project.data;
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
    await storage.setItem(PROJECT_LIST_KEY, JSON.stringify(newList));

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

    const projectWithTimestamp = {
      ...project,
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

    await storage.setItem(PROJECT_LIST_KEY, JSON.stringify(list));
  }

  /**
   * 快速保存项目
   */
  async quickSaveProject(
    data: ProjectFullData,
    name?: string,
    description?: string
  ): Promise<ProjectTemplate> {
    const id = name ?
      `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` :
      `autosave_${Date.now()}`;

    const project: ProjectTemplate = {
      id,
      name: name || data.projectBaseInfo.name || '未命名项目',
      description,
      data: {
        ...data,
        lastSaved: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
