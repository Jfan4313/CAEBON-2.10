import {
  ALIYUN_AUTH_TOKEN_KEY,
  ALIYUN_AUTH_USER_KEY,
  AliyunApiError,
  type AliyunUser,
  aliyunApi,
} from './aliyun-api';

const CLOUD_NAMESPACE = 'zero-carbon-analysis';

function getCurrentUser(): AliyunUser | null {
  try {
    return JSON.parse(localStorage.getItem(ALIYUN_AUTH_USER_KEY) || 'null');
  } catch {
    return null;
  }
}

function getCloudKey(key: string): string {
  const user = getCurrentUser();
  if (!user?.id || !localStorage.getItem(ALIYUN_AUTH_TOKEN_KEY)) {
    throw new AliyunApiError('请先登录阿里云账号', 401, 'authentication_required');
  }
  return `${CLOUD_NAMESPACE}:${user.id}:${key}`;
}

export class AliyunStorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      const response = await aliyunApi.getAppData<string | null>(getCloudKey(key));
      return typeof response.value === 'string' ? response.value : null;
    } catch (error) {
      if (error instanceof AliyunApiError && error.status === 404) return null;
      throw error;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    await aliyunApi.putAppData(getCloudKey(key), value);
  }

  async removeItem(key: string): Promise<void> {
    await aliyunApi.putAppData<string | null>(getCloudKey(key), null);
  }
}

export const aliyunStorage = new AliyunStorageAdapter();
