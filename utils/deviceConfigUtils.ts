export const STORAGE_KEY = 'microgrid-device-configs';

export const saveToStorage = (configs: any[]): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
};

export const loadFromStorage = (): any[] | null => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
};

export const validatePosition = (pos: number): number => Math.max(0, Math.min(100, pos));
export const validateSize = (size: number): number => Math.max(1, Math.min(100, size));
