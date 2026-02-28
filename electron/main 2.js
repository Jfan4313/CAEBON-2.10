const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// IndexedDB 文件系统模拟
const idbStores = new Map();

// 获取数据路径的辅助函数
function getUserDataPath() {
    return path.join(app.getPath('userData'), 'data');
}

// 创建窗口函数
function createWindow() {
    // 存储数据目录
    const userDataPath = getUserDataPath();
    if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
    }

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true
        },
        title: '零碳项目收益评估软件'
    });

    // 开发模式加载 Vite 服务器，生产模式加载打包文件
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:3001');
        // 开发模式下打开开发者工具
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

// 应用就绪时创建窗口
app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC 处理程序 - 用于存储
ipcMain.handle('get-data', async (event, key) => {
    const filePath = path.join(getUserDataPath(), `${key}.json`);
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    return null;
});

ipcMain.handle('set-data', async (event, key, value) => {
    const filePath = path.join(getUserDataPath(), `${key}.json`);
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
    return true;
});

ipcMain.handle('remove-data', async (event, key) => {
    const filePath = path.join(getUserDataPath(), `${key}.json`);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
    return true;
});

ipcMain.handle('idb-open', async (event, dbName) => {
    if (!idbStores.has(dbName)) {
        idbStores.set(dbName, new Map());
    }
    return true;
});

ipcMain.handle('idb-get', async (event, dbName, storeName, key) => {
    const db = idbStores.get(dbName);
    return db?.get(storeName)?.get(key);
});

ipcMain.handle('idb-put', async (event, dbName, storeName, key, value) => {
    const db = idbStores.get(dbName);
    if (!db.has(storeName)) {
        db.set(storeName, new Map());
    }
    db.get(storeName).set(key, value);
    return true;
});

ipcMain.handle('idb-getAll', async (event, dbName, storeName) => {
    const db = idbStores.get(dbName);
    const store = db?.get(storeName);
    return store ? Array.from(store.entries()) : [];
});

ipcMain.handle('idb-delete', async (event, dbName, storeName, key) => {
    const db = idbStores.get(dbName);
    db?.get(storeName)?.delete(key);
    return true;
});

ipcMain.handle('idb-clear', async (event, dbName, storeName) => {
    const db = idbStores.get(dbName);
    if (db?.has(storeName)) {
        db.set(storeName, new Map());
    }
    return true;
});

ipcMain.handle('get-app-version', async () => {
    return app.getVersion();
});

ipcMain.handle('get-user-data-path', async () => {
    return getUserDataPath();
});
