import SolarReportChapter from '../../../modules/solar/reporting/SolarReportChapter';
import StorageReportChapter from '../../../modules/storage/reporting/StorageReportChapter';
import type { ModuleReportChapterDefinition } from './types';

const chapterDefinitions: ModuleReportChapterDefinition[] = [
  { moduleId: 'retrofit-solar', title: '分布式光伏完整方案', component: SolarReportChapter },
  { moduleId: 'retrofit-storage', title: '工商业储能完整方案', component: StorageReportChapter },
];

export const moduleReportChapterRegistry = new Map(chapterDefinitions.map(definition => [definition.moduleId, definition]));

export const getModuleReportChapter = (moduleId: string) => moduleReportChapterRegistry.get(moduleId);
