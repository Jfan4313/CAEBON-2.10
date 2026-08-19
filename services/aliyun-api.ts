const viteEnv = import.meta.env;

export const ALIYUN_API_BASE_URL =
  (viteEnv.VITE_ALIYUN_API_BASE_URL || '/cloud-api').replace(/\/+$/, '');

export const ALIYUN_AUTH_TOKEN_KEY = 'zero-carbon-aliyun-auth-token';
export const ALIYUN_AUTH_USER_KEY = 'zero-carbon-aliyun-auth-user';
export const ALIYUN_AUTH_EXPIRY_KEY = 'zero-carbon-aliyun-auth-expiry';

export interface AliyunUser {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  permissions: string[];
  mustChangePassword: boolean;
  lastLoginAt?: string | null;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export class AliyunApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'AliyunApiError';
  }
}

function getClientId(): string {
  const key = 'zero-carbon-client-id';
  let clientId = localStorage.getItem(key);
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem(key, clientId);
  }
  return clientId;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('X-Client-Id', getClientId());

  const token = localStorage.getItem(ALIYUN_AUTH_TOKEN_KEY);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${ALIYUN_API_BASE_URL}${path}`, {
      ...options,
      headers,
      body,
    });
  } catch {
    throw new AliyunApiError('无法连接阿里云服务，请检查网络后重试', 0, 'network_error');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = String(payload?.error || response.statusText || 'request_failed');
    throw new AliyunApiError(code, response.status, code);
  }
  return payload as T;
}

export const aliyunApi = {
  login(username: string, password: string) {
    return request<{ token: string; expiresAt: string; user: AliyunUser }>('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
  },

  register(payload: { username: string; password: string; name: string; phone?: string }) {
    return request<{ token: string; expiresAt: string; user: AliyunUser }>('/auth/register', {
      method: 'POST',
      body: payload,
    });
  },

  getCurrentUser() {
    return request<{ user: AliyunUser }>('/auth/me');
  },

  logout() {
    return request<{ ok: boolean }>('/auth/logout', { method: 'POST' });
  },

  getAppData<T>(key: string) {
    return request<{ key: string; value: T; updatedAt: string; version: number }>(
      `/app-data/${encodeURIComponent(key)}`
    );
  },

  putAppData<T>(key: string, value: T) {
    return request<{ key: string; value: T; updatedAt: string; version: number }>(
      `/app-data/${encodeURIComponent(key)}`,
      { method: 'PUT', body: { value } }
    );
  },
};

export function clearAliyunSession(): void {
  localStorage.removeItem(ALIYUN_AUTH_TOKEN_KEY);
  localStorage.removeItem(ALIYUN_AUTH_USER_KEY);
  localStorage.removeItem(ALIYUN_AUTH_EXPIRY_KEY);
}
