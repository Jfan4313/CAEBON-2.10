import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  ALIYUN_AUTH_EXPIRY_KEY,
  ALIYUN_AUTH_TOKEN_KEY,
  ALIYUN_AUTH_USER_KEY,
  AliyunApiError,
  type AliyunUser,
  aliyunApi,
  clearAliyunSession,
} from '../services/aliyun-api';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  permissions: string[];
  userMetadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<AuthResult>;
  register: (phone: string, password: string, fullName?: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  forgotPassword: (identifier: string) => Promise<AuthResult>;
  resetPassword: (password: string) => Promise<AuthResult>;
  supabaseClient: null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function transformUser(user: AliyunUser): AuthUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email || undefined,
    phone: user.phone || undefined,
    role: user.role,
    permissions: user.permissions,
    userMetadata: { full_name: user.name },
  };
}

function readCachedUser(): AuthUser | null {
  try {
    const user = JSON.parse(localStorage.getItem(ALIYUN_AUTH_USER_KEY) || 'null') as AliyunUser | null;
    return user ? transformUser(user) : null;
  } catch {
    return null;
  }
}

function storeSession(token: string, expiresAt: string, user: AliyunUser): void {
  localStorage.setItem(ALIYUN_AUTH_TOKEN_KEY, token);
  localStorage.setItem(ALIYUN_AUTH_EXPIRY_KEY, expiresAt);
  localStorage.setItem(ALIYUN_AUTH_USER_KEY, JSON.stringify(user));
}

function friendlyAuthError(error: unknown): string {
  if (!(error instanceof AliyunApiError)) return '操作失败，请重试';

  const messages: Record<string, string> = {
    invalid_credentials: '手机号（用户名）或密码错误',
    authentication_required: '登录状态已失效，请重新登录',
    username_exists: '该手机号已注册',
    invalid_username: '请输入有效的中国大陆手机号',
    invalid_name: '请输入姓名',
    weak_password: '密码需为 8–64 位，并同时包含字母和数字',
    network_error: '无法连接阿里云服务，请检查网络后重试',
  };
  return messages[error.code] || error.message || '操作失败，请重试';
}

function normalizePhone(value: string): string | null {
  const compact = value.trim().replace(/[\s-]/g, '').replace(/^\+86/, '');
  return /^1[3-9]\d{9}$/.test(compact) ? compact : null;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => readCachedUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(ALIYUN_AUTH_TOKEN_KEY);
    const expiresAt = localStorage.getItem(ALIYUN_AUTH_EXPIRY_KEY);
    if (!token || (expiresAt && new Date(expiresAt).getTime() <= Date.now())) {
      clearAliyunSession();
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    aliyunApi.getCurrentUser()
      .then(({ user }) => {
        localStorage.setItem(ALIYUN_AUTH_USER_KEY, JSON.stringify(user));
        setCurrentUser(transformUser(user));
      })
      .catch((error) => {
        if (error instanceof AliyunApiError && error.status === 401) {
          clearAliyunSession();
          setCurrentUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (identifier: string, password: string): Promise<AuthResult> => {
    const username = identifier.trim().replace(/[\s-]/g, '').replace(/^\+86/, '');
    if (!username) return { success: false, error: '请输入手机号或用户名' };

    try {
      const response = await aliyunApi.login(username, password);
      storeSession(response.token, response.expiresAt, response.user);
      setCurrentUser(transformUser(response.user));
      return { success: true };
    } catch (error) {
      return { success: false, error: friendlyAuthError(error) };
    }
  };

  const register = async (phoneInput: string, password: string, fullName?: string): Promise<AuthResult> => {
    const phone = normalizePhone(phoneInput);
    if (!phone) return { success: false, error: '请输入有效的中国大陆手机号' };
    if (!fullName?.trim()) return { success: false, error: '请输入姓名' };

    try {
      const response = await aliyunApi.register({
        username: phone,
        phone,
        password,
        name: fullName.trim(),
      });
      storeSession(response.token, response.expiresAt, response.user);
      setCurrentUser(transformUser(response.user));
      return { success: true };
    } catch (error) {
      return { success: false, error: friendlyAuthError(error) };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await aliyunApi.logout();
    } catch {
      // 即使网络中断，也应清除此设备上的会话。
    } finally {
      clearAliyunSession();
      localStorage.setItem('carbon_storage_mode', 'local');
      setCurrentUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticated: currentUser !== null,
      loading,
      login,
      register,
      logout,
      forgotPassword: async () => ({ success: false, error: '请联系管理员重置密码' }),
      resetPassword: async () => ({ success: false, error: '请联系管理员重置密码' }),
      supabaseClient: null,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
