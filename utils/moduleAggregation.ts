import type { ModuleData } from '../context/ModuleContext';

export const isIntegratedEnergyTakeoverActive = (modules: Record<string, ModuleData>): boolean => {
  const microgrid = modules['retrofit-microgrid'];
  return Boolean(microgrid?.isActive && microgrid.params?.integratedEnergy?.enabled);
};

export const getTakenOverModuleIds = (modules: Record<string, ModuleData>): string[] => {
  if (!isIntegratedEnergyTakeoverActive(modules)) return [];
  return modules['retrofit-microgrid']?.params?.integratedEnergy?.takeoverModuleIds || [
    'retrofit-solar',
    'retrofit-storage',
    'retrofit-vpp',
    'retrofit-energy-sales'
  ];
};

export const getEffectiveActiveModules = (modules: Record<string, ModuleData>): ModuleData[] => {
  const excludedIds = new Set(getTakenOverModuleIds(modules));
  return Object.values(modules).filter(module => module.isActive && !excludedIds.has(module.id));
};

export const isModuleTakenOver = (moduleId: string, modules: Record<string, ModuleData>): boolean => {
  return getTakenOverModuleIds(modules).includes(moduleId);
};
