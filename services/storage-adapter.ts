// 检测运行环境
const isElectron = () => {
    return typeof window !== 'undefined' && 'electronAPI' in window;
};

export interface StorageAdapter {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
}

const STORAGE_MODE_KEY = 'carbon_storage_mode';

// Electron 存储适配器
class ElectronStorageAdapter implements StorageAdapter {
    async getItem(key: string): Promise<string | null> {
        return await (window as any).electronAPI.getData(key);
    }

    async setItem(key: string, value: string): Promise<void> {
        await (window as any).electronAPI.setData(key, value);
    }

    async removeItem(key: string): Promise<void> {
        await (window as any).electronAPI.removeData(key);
    }
}

// 浏览器 localStorage 适配器
class BrowserStorageAdapter implements StorageAdapter {
    async getItem(key: string): Promise<string | null> {
        return localStorage.getItem(key);
    }

    async setItem(key: string, value: string): Promise<void> {
        localStorage.setItem(key, value);
    }

    async removeItem(key: string): Promise<void> {
        localStorage.removeItem(key);
    }
}

const localStorageAdapter: StorageAdapter = isElectron()
    ? new ElectronStorageAdapter()
    : new BrowserStorageAdapter();

function shouldUseCloudStorage(): boolean {
    return !isElectron() && localStorage.getItem(STORAGE_MODE_KEY) === 'cloud';
}

export const storage: StorageAdapter = {
    async getItem(key) {
        if (shouldUseCloudStorage()) {
            const { aliyunStorage } = await import('./aliyun-storage-adapter');
            return aliyunStorage.getItem(key);
        }
        return localStorageAdapter.getItem(key);
    },
    async setItem(key, value) {
        if (shouldUseCloudStorage()) {
            const { aliyunStorage } = await import('./aliyun-storage-adapter');
            return aliyunStorage.setItem(key, value);
        }
        return localStorageAdapter.setItem(key, value);
    },
    async removeItem(key) {
        if (shouldUseCloudStorage()) {
            const { aliyunStorage } = await import('./aliyun-storage-adapter');
            return aliyunStorage.removeItem(key);
        }
        return localStorageAdapter.removeItem(key);
    }
};

// IndexedDB 适配器
export class IndexedDBAdapter {
    private dbName: string;

    constructor(dbName: string) {
        this.dbName = dbName;
    }

    async open() {
        if (isElectron()) {
            await (window as any).electronAPI.idb.open(this.dbName);
        }
        // 浏览器环境的 IndexedDB 在 memory.ts 中已处理
    }

    async get(storeName: string, key: string) {
        if (isElectron()) {
            return await (window as any).electronAPI.idb.get(this.dbName, storeName, key);
        }
        return null;
    }

    async put(storeName: string, key: string, value: any) {
        if (isElectron()) {
            await (window as any).electronAPI.idb.put(this.dbName, storeName, key, value);
        }
    }

    async getAll(storeName: string) {
        if (isElectron()) {
            return await (window as any).electronAPI.idb.getAll(this.dbName, storeName);
        }
        return [];
    }

    async delete(storeName: string, key: string) {
        if (isElectron()) {
            await (window as any).electronAPI.idb.delete(this.dbName, storeName, key);
        }
    }

    async clear(storeName: string) {
        if (isElectron()) {
            await (window as any).electronAPI.idb.clear(this.dbName, storeName);
        }
    }
}

// 导出环境检测
export const isDesktopApp = isElectron();

// 导出 getStorage 和 getIndexedDB 函数供外部使用
export function getStorage(mode: 'local' | 'cloud'): StorageAdapter {
    if (mode === 'cloud') {
        return storage;
    }
    return localStorageAdapter;
}

export function getIndexedDB(): IndexedDBAdapter {
    return new IndexedDBAdapter('ZeroCarbonDB');
}
