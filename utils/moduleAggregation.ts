import type { ModuleData } from '../context/ModuleContext';
import { COPYRIGHT_RELEASE_FEATURES } from '../shared/config/productIdentity';

const isIncludedInCopyrightRelease = (moduleId: string): boolean => {
  if (moduleId === 'retrofit-ai') return COPYRIGHT_RELEASE_FEATURES.artificialIntelligencePlatform;
  if (moduleId === 'retrofit-carbon') return COPYRIGHT_RELEASE_FEATURES.carbonTrading;
  if (moduleId === 'retrofit-vpp') return COPYRIGHT_RELEASE_FEATURES.realtimeVppDispatch;
  if (moduleId === 'retrofit-microgrid') return COPYRIGHT_RELEASE_FEATURES.realtimeIotControl;
  return true;
};

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
  return Object.values(modules).filter(
    module => module.isActive && !excludedIds.has(module.id) && isIncludedInCopyrightRelease(module.id)
  );
};

export const isModuleTakenOver = (moduleId: string, modules: Record<string, ModuleData>): boolean => {
  return getTakenOverModuleIds(modules).includes(moduleId);
};
