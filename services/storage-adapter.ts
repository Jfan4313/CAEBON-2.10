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
    private readonly databaseName = 'ZeroCarbonStorage';
    private readonly storeName = 'keyValue';
    private readonly largeValueThreshold = 128 * 1024;
    private databasePromise: Promise<IDBDatabase> | null = null;

    private openDatabase(): Promise<IDBDatabase> {
        if (this.databasePromise) return this.databasePromise;

        this.databasePromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.databaseName, 1);

            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(this.storeName)) {
                    database.createObjectStore(this.storeName);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        return this.databasePromise;
    }

    private async getLargeValue(key: string): Promise<string | null> {
        const database = await this.openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(this.storeName, 'readonly');
            const request = transaction.objectStore(this.storeName).get(key);
            request.onsuccess = () => resolve((request.result as string | undefined) ?? null);
            request.onerror = () => reject(request.error);
        });
    }

    private async setLargeValue(key: string, value: string): Promise<void> {
        const database = await this.openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(this.storeName, 'readwrite');
            transaction.objectStore(this.storeName).put(value, key);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }

    private async removeLargeValue(key: string): Promise<void> {
        const database = await this.openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(this.storeName, 'readwrite');
            transaction.objectStore(this.storeName).delete(key);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }

    async getItem(key: string): Promise<string | null> {
        const localValue = localStorage.getItem(key);
        if (localValue !== null) return localValue;
        return this.getLargeValue(key);
    }

    async setItem(key: string, value: string): Promise<void> {
        if (value.length >= this.largeValueThreshold) {
            await this.setLargeValue(key, value);
            localStorage.removeItem(key);
            return;
        }

        try {
            localStorage.setItem(key, value);
            await this.removeLargeValue(key);
        } catch (error) {
            if (!(error instanceof DOMException) || error.name !== 'QuotaExceededError') {
                throw error;
            }

            await this.setLargeValue(key, value);
            localStorage.removeItem(key);
        }
    }

    async removeItem(key: string): Promise<void> {
        localStorage.removeItem(key);
        await this.removeLargeValue(key);
    }
}

const localStorageAdapter: StorageAdapter = isElectron()
    ? new ElectronStorageAdapter()
    : new BrowserStorageAdapter();

function shouldUseCloudStorage(): boolean {
    return !isElectron() && localStorage.getItem(STORAGE_MODE_KEY) === 'cloud';
}

// 每次操作时解析存储模式，确保登录后切换云端可以立即生效。
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
