const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // localStorage 替代
    getData: (key) => ipcRenderer.invoke('get-data', key),
    setData: (key, value) => ipcRenderer.invoke('set-data', key, value),
    removeData: (key) => ipcRenderer.invoke('remove-data', key),

    // IndexedDB 替代（简化版）
    idb: {
        open: (dbName) => ipcRenderer.invoke('idb-open', dbName),
        get: (dbName, storeName, key) => ipcRenderer.invoke('idb-get', dbName, storeName, key),
        put: (dbName, storeName, key, value) => ipcRenderer.invoke('idb-put', dbName, storeName, key, value),
        getAll: (dbName, storeName) => ipcRenderer.invoke('idb-getAll', dbName, storeName),
        delete: (dbName, storeName, key) => ipcRenderer.invoke('idb-delete', dbName, storeName, key),
        clear: (dbName, storeName) => ipcRenderer.invoke('idb-clear', dbName, storeName)
    },

    // 应用信息
    getVersion: () => ipcRenderer.invoke('get-app-version'),
    getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),

    // 网络状态
    onOnline: (callback) => {
        const handler = () => callback(true);
        window.addEventListener('online', handler);
        return () => window.removeEventListener('online', handler);
    },
    onOffline: (callback) => {
        const handler = () => callback(false);
        window.addEventListener('offline', handler);
        return () => window.removeEventListener('offline', handler);
    }
});
