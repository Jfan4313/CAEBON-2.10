import type React from 'react';
import type { ModuleData } from '../../../context/ModuleContext';
import type { ProjectBaseInfo } from '../../../context/ProjectContext';
import type { CombinedReportResult, ModuleReportResult } from '../types';

export interface ModuleReportChapterProps {
  module: ModuleData;
  result: ModuleReportResult;
  report: CombinedReportResult;
  projectBaseInfo: ProjectBaseInfo;
}

export interface ModuleReportChapterDefinition {
  moduleId: string;
  title: string;
  component: React.ComponentType<ModuleReportChapterProps>;
}
