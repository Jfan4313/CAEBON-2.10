// 项目入口模块类型定义

export interface ProjectEntryData {
  // 项目基础信息
  projectName: string;
  projectType: string;
  location: string;
  contact: string;
  phone: string;

  // 项目规模
  area: number;
  annualElectricity: number;
  peakLoad: number;

  // 项目状态
  status: 'planning' | 'designing' | 'constructing' | 'operating';
}

export const initialProjectEntryData: ProjectEntryData = {
  projectName: '',
  projectType: '',
  location: '',
  contact: '',
  phone: '',

  area: 0,
  annualElectricity: 0,
  peakLoad: 0,

  status: 'planning'
};
