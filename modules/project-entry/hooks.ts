import { useState, useCallback } from 'react';
import type { ProjectEntryData } from './types';

/**
 * 项目入口模块业务逻辑 Hook
 */
export function useProjectEntry() {
  const [projectData, setProjectData] = useState<ProjectEntryData>({
    projectName: '',
    projectType: '',
    location: '',
    contact: '',
    phone: '',
    area: 0,
    annualElectricity: 0,
    peakLoad: 0,
    status: 'planning'
  });

  const updateProjectData = useCallback((key: keyof ProjectEntryData, value: any) => {
    setProjectData(prev => ({ ...prev, [key]: value }));
  }, []);

  const saveProject = useCallback(() => {
    // TODO: 实现项目保存逻辑
    console.log('Saving project:', projectData);
    return Promise.resolve(true);
  }, [projectData]);

  const loadProject = useCallback(async (projectId: string) => {
    // TODO: 实现项目加载逻辑
    console.log('Loading project:', projectId);
    return true;
  }, []);

  return {
    projectData,
    updateProjectData,
    saveProject,
    loadProject
  };
}
