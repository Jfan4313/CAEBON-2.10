/**
 * Supabase 云存储适配器
 * 用于项目的云端保存、加载和同步
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Supabase 项目数据接口
interface SupabaseProject {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  data: any;
  created_at: string;
  updated_at: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Supabase 存储适配器
class SupabaseStorageAdapter implements StorageAdapter {
  private client: SupabaseClient | null = null;
  private userId: string | null = null;
  private enabled: boolean = false;

  constructor(config?: SupabaseConfig) {
    if (config && config.url && config.anonKey) {
      try {
        this.client = createClient(config.url, config.anonKey);
        this.enabled = true;
      } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        this.enabled = false;
      }
    }
  }

  /**
   * 检查是否已启用
   */
  isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }

  /**
   * 获取项目列表
   */
  async getProjectList(): Promise<SupabaseProject[]> {
    if (!this.client || !this.userId) {
      return [];
    }

    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('user_id', this.userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch projects from Supabase:', error);
      return [];
    }

    return data || [];
  }

  /**
   * 保存项目到云端
   */
  async saveProject(project: Omit<SupabaseProject, 'created_at' | 'updated_at'>): Promise<SupabaseProject | null> {
    if (!this.client || !this.userId) {
      console.error('Supabase client not initialized or user not authenticated');
      return null;
    }

    const now = new Date().toISOString();

    // 尝试更新现有项目
    const { data: existingData } = await this.client
      .from('projects')
      .select('id')
      .eq('id', project.id)
      .eq('user_id', this.userId)
      .single();

    let result;

    if (existingData) {
      // 更新现有项目
      const { data, error } = await this.client
        .from('projects')
        .update({
          name: project.name,
          description: project.description,
          data: project.data,
          updated_at: now
        })
        .eq('id', project.id)
        .eq('user_id', this.userId)
        .select()
        .single();

      if (error) {
        console.error('Failed to update project in Supabase:', error);
        return null;
      }
      result = data;
    } else {
      // 创建新项目
      const { data, error } = await this.client
        .from('projects')
        .insert({
          id: project.id,
          user_id: this.userId,
          name: project.name,
          description: project.description,
          data: project.data,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to save project to Supabase:', error);
        return null;
      }
      result = data;
    }

    return result;
  }

  /**
   * 从云端加载项目
   */
  async loadProject(id: string): Promise<SupabaseProject | null> {
    if (!this.client || !this.userId) {
      return null;
    }

    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.userId)
      .single();

    if (error) {
      console.error('Failed to load project from Supabase:', error);
      return null;
    }

    return data;
  }

  /**
   * 删除云端项目
   */
  async deleteProject(id: string): Promise<boolean> {
    if (!this.client || !this.userId) {
      return false;
    }

    const { error } = await this.client
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);

    if (error) {
      console.error('Failed to delete project from Supabase:', error);
      return false;
    }

    return true;
  }

  /**
   * 存储适配器接口方法
   * 用于向后兼容 localStorage 接口
   */
  async getItem(key: string): Promise<string | null> {
    if (!this.client || !this.userId) {
      return null;
    }

    const { data, error } = await this.client
      .from('storage')
      .select('value')
      .eq('key', key)
      .eq('user_id', this.userId)
      .single();

    if (error) {
      return null;
    }

    return data?.value || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!this.client || !this.userId) {
      throw new Error('Supabase client not initialized or user not authenticated');
    }

    const { error } = await this.client
      .from('storage')
      .upsert({
        key,
        value,
        user_id: this.userId,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to set item in Supabase:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!this.client || !this.userId) {
      return;
    }

    const { error } = await this.client
      .from('storage')
      .delete()
      .eq('key', key)
      .eq('user_id', this.userId);

    if (error) {
      console.error('Failed to remove item from Supabase:', error);
    }
  }

  /**
   * 设置用户ID
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * 获取当前用户ID
   */
  getUserId(): string | null {
    return this.userId;
  }
}

// 创建 Supabase 适配器实例
let supabaseAdapterInstance: SupabaseStorageAdapter | null = null;

/**
 * 获取 Supabase 适配器实例
 */
export function getSupabaseAdapter(config?: SupabaseConfig): SupabaseStorageAdapter {
  if (!supabaseAdapterInstance) {
    if (config && config.url && config.anonKey) {
      supabaseAdapterInstance = new SupabaseStorageAdapter(config);
    } else {
      // 尝试从环境变量加载配置
      const url = import.meta.env.VITE_SUPABASE_URL || '';
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

      if (url && anonKey) {
        supabaseAdapterInstance = new SupabaseStorageAdapter({ url, anonKey });
      } else {
        supabaseAdapterInstance = new SupabaseStorageAdapter();
      }
    }
  }
  return supabaseAdapterInstance;
}

/**
 * 检查 Supabase 是否已配置
 */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return !!(url && anonKey);
}

export default SupabaseStorageAdapter;
