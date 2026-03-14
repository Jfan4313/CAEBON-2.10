import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient, SupabaseClient, User, Session, AuthError } from '@supabase/supabase-js';

// 用户信息接口
export interface AuthUser {
  id: string;
  email: string;
  emailVerified?: boolean;
  userMetadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

// 认证上下文接口
interface AuthContextType {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  supabaseClient: SupabaseClient | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Supabase 客户端实例
let supabaseClientInstance: SupabaseClient | null = null;

/**
 * 获取 Supabase 客户端
 */
function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseClientInstance) {
    const url = import.meta.env.VITE_SUPABASE_URL || '';
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    if (url && anonKey) {
      try {
        supabaseClientInstance = createClient(url, anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
      } catch (error) {
        console.error('Failed to initialize Supabase auth client:', error);
      }
    }
  }
  return supabaseClientInstance;
}

/**
 * 转换 Supabase User 到 AuthUser
 */
function transformUser(user: User | null): AuthUser | null {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email || '',
    emailVerified: user.email_confirmed_at != null,
    userMetadata: user.user_metadata as AuthUser['userMetadata'],
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // 初始化：检查现有会话
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        }

        const user = transformUser(session?.user || null);
        setCurrentUser(user);

        // 同步用户 ID 到 SupabaseStorageAdapter
        if (user) {
          // 从 storage-adapter 导入并设置用户 ID
          const { getSupabaseAdapter } = await import('../services/supabase-adapter');
          const adapter = getSupabaseAdapter();
          adapter.setUserId(user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);

        const user = transformUser(session?.user || null);
        setCurrentUser(user);

        // 同步用户 ID 到 SupabaseStorageAdapter
        if (user) {
          const { getSupabaseAdapter } = await import('../services/supabase-adapter');
          const adapter = getSupabaseAdapter();
          adapter.setUserId(user.id);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  /**
   * 用户登录
   */
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) {
      return { success: false, error: '云存储未配置' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // 友好的错误消息
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: '邮箱或密码错误' };
        }
        return { success: false, error: error.message };
      }

      if (data.user) {
        return { success: true };
      }

      return { success: false, error: '登录失败，请重试' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: '登录失败，请重试' };
    }
  };

  /**
   * 用户注册
   */
  const register = async (
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) {
      return { success: false, error: '云存储未配置' };
    }

    // 验证密码强度
    if (password.length < 6) {
      return { success: false, error: '密码长度至少为 6 位' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || '',
          },
          emailConfirm: true, // 自动验证邮箱，用户注册后可直接登录
        },
      });

      if (error) {
        // 友好的错误消息
        if (error.message.includes('User already registered')) {
          return { success: false, error: '该邮箱已被注册' };
        }
        if (error.message.includes('Password should be')) {
          return { success: false, error: '密码强度不足' };
        }
        return { success: false, error: error.message };
      }

      if (data.user) {
        // 检查是否需要邮箱验证
        if (data.session === null && !error) {
          // 邮箱需要验证
          return {
            success: true,
            error: '注册成功！请检查您的邮箱以验证账户'
          };
        }
        return { success: true };
      }

      return { success: false, error: '注册失败，请重试' };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: '注册失败，请重试' };
    }
  };

  /**
   * 用户登出
   */
  const logout = async (): Promise<void> => {
    if (!supabase) return;

    try {
      await supabase.auth.signOut();

      // 清除 SupabaseStorageAdapter 的用户 ID
      const { getSupabaseAdapter } = await import('../services/supabase-adapter');
      const adapter = getSupabaseAdapter();
      adapter.setUserId('');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  /**
   * 忘记密码 - 发送重置邮件
   */
  const forgotPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) {
      return { success: false, error: '云存储未配置' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Forgot password error:', error);
      return { success: false, error: '发送重置邮件失败，请重试' };
    }
  };

  /**
   * 重置密码
   */
  const resetPassword = async (password: string): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) {
      return { success: false, error: '云存储未配置' };
    }

    // 验证密码强度
    if (password.length < 6) {
      return { success: false, error: '密码长度至少为 6 位' };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: '密码重置失败，请重试' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: currentUser !== null,
        loading,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        supabaseClient: supabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 使用认证上下文
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
