const electronStore = new Map<string, string>();
const localStore = new Map<string, string>();

const localStorageMock = {
  get length() { return localStore.size; },
  key(index: number) { return [...localStore.keys()][index] ?? null; },
  getItem(key: string) { return localStore.get(key) ?? null; },
  setItem(key: string, value: string) { localStore.set(key, String(value)); },
  removeItem(key: string) { localStore.delete(key); },
  clear() { localStore.clear(); },
};

Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
Object.assign(globalThis, {
  localStorage: localStorageMock,
  window: {
    addEventListener: () => undefined,
    electronAPI: {
      getData: async (key: string) => electronStore.get(key) ?? null,
      setData: async (key: string, value: string) => { electronStore.set(key, value); },
      removeData: async (key: string) => { electronStore.delete(key); },
      idb: {
        open: async () => true, get: async () => null, put: async () => true,
        getAll: async () => [], delete: async () => true, clear: async () => true,
      },
    },
  },
});

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const { projectStorageService } = await import('../services/projectStorage');
const { memoryService } = await import('../services/memory');

await projectStorageService.init();
const initialList = await projectStorageService.getProjectList();
assert(initialList.some(item => item.id === 'template-default'), '默认模板未初始化');

const projectData: any = {
  projectBaseInfo: { name: '广东工业园标准项目（匿名）', type: 'factory', province: 'Guangdong', city: 'Guangzhou', buildings: [] },
  modules: { 'retrofit-solar': { id: 'retrofit-solar', name: '分布式光伏', isActive: true } },
  transformers: [{ id: 1, name: '1号变压器', capacity: 4000 }],
  bills: [{ id: 1, month: '2026-01', kwh: 300000, cost: 246000 }],
  priceConfig: { mode: 'fixed', fixedPrice: 0.82, touSegments: [], spotPrices: [] },
  version: '1.0.0',
};

const saved = await projectStorageService.quickSaveProject(projectData, '广东工业园标准项目（匿名）', '持久化回归');
const loaded = await projectStorageService.loadProjectData(saved.id);
assert(loaded?.projectBaseInfo.name === projectData.projectBaseInfo.name, '保存后加载项目名称不一致');
assert(loaded?.bills?.[0]?.kwh === 300000, '保存后加载账单不一致');

const renamed = await projectStorageService.renameProject(saved.id, '广东工业园标准项目（匿名）-修订');
assert(renamed, '项目重命名失败');
const renamedItem = (await projectStorageService.getProjectList()).find(item => item.id === saved.id);
assert(renamedItem?.name === '广东工业园标准项目（匿名）-修订', '列表未恢复修改后的名称');

const savedAgain = await projectStorageService.quickSaveProject({ ...projectData, bills: [{ ...projectData.bills[0], kwh: 320000 }] }, '广东工业园标准项目（匿名）-修订');
assert(savedAgain.id === saved.id, '同名再次保存产生重复项目');
assert((await projectStorageService.loadProjectData(saved.id))?.bills?.[0]?.kwh === 320000, '再次保存未覆盖最新账单');

memoryService.setPreference('defaultRegion', '广东省');
memoryService.setPreference('defaultBuildingType', 'factory');
memoryService.setPreference('calculationMode', 'advanced');
await memoryService.addRecentProject(saved.id, savedAgain.name);
assert(memoryService.getPreference('calculationMode') === 'advanced', '计算模式偏好未恢复');
assert(memoryService.getLastAccessedProject() === saved.id, '最后访问项目未恢复');
assert(memoryService.getRecentProjects()[0] === saved.id, '最近项目未恢复');

await memoryService.deleteProject(saved.id);
assert(!memoryService.getRecentProjects().includes(saved.id), '从记忆删除后最近项目仍残留');
assert(memoryService.getLastAccessedProject() === null, '从记忆删除后最后访问项目仍残留');

const deleted = await projectStorageService.deleteProject(saved.id);
assert(deleted, '普通项目删除失败');
assert(await projectStorageService.loadProjectData(saved.id) === null, '删除后项目数据仍存在');
assert(!(await projectStorageService.deleteProject('template-default')), '默认模板不应允许删除');

console.log(JSON.stringify({
  status: 'ok',
  checks: 15,
  storageMode: 'Electron API in-memory isolation',
  defaultTemplate: true,
  saveLoad: true,
  rename: true,
  overwriteSameName: true,
  preferences: true,
  recentAndLastProject: true,
  deleteAndTemplateProtection: true,
}, null, 2));
