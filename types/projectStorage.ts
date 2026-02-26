/**
 * 项目存储相关类型定义
 */

import { ModuleData, Transformer, Bill, PriceConfigState, ProjectBaseInfo } from '../context/ProjectContext';

/**
 * 项目完整数据结构
 * 包含所有需要保存和恢复的项目数据
 */
export interface ProjectFullData {
  /** 项目基础信息 */
  projectBaseInfo: ProjectBaseInfo;
  /** 各改造模块数据 */
  modules: Record<string, ModuleData>;
  /** 变压器数据 */
  transformers: Transformer[];
  /** 电费账单 */
  bills: Bill[];
  /** 电价配置 */
  priceConfig: PriceConfigState;
  /** 数据版本号，用于兼容性处理 */
  version?: string;
  /** 保存时间戳 */
  lastSaved?: string;
}

/**
 * 项目模板/保存项目
 * 用于本地项目列表管理
 */
export interface ProjectTemplate {
  /** 项目唯一ID */
  id: string;
  /** 项目名称 */
  name: string;
  /** 项目描述 */
  description?: string;
  /** 项目完整数据 */
  data: ProjectFullData;
  /** 创建时间 */
  createdAt: string;
  /** 最后更新时间 */
  updatedAt: string;
  /** 是否为模板（不可删除） */
  isTemplate?: boolean;
}

/**
 * 导入验证结果
 */
export interface ImportValidationResult {
  /** 是否验证通过 */
  valid: boolean;
  /** 错误信息 */
  errors: string[];
  /** 警告信息 */
  warnings: string[];
  /** 解析后的数据（如果验证通过） */
  data?: ProjectFullData;
}

/**
 * 项目列表配置
 */
export interface ProjectListOptions {
  /** 排序方式 */
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 是否只显示模板 */
  templatesOnly?: boolean;
}

/**
 * 导出选项
 */
export interface ExportOptions {
  /** 是否包含格式化（缩进） */
  formatted?: boolean;
  /** 自定义文件名（不含扩展名） */
  filename?: string;
}
