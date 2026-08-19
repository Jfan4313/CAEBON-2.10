const STORAGE_KEY = 'ZERO_CARBON_REPORT_SELECTION';

export const requestReportForModules = (moduleIds: string[]) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(moduleIds));
  window.dispatchEvent(new CustomEvent('zero-carbon:open-report', { detail: { moduleIds } }));
};

export const consumeRequestedReportModules = (): string[] | null => {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(item => typeof item === 'string') : null;
  } catch {
    return null;
  }
};
