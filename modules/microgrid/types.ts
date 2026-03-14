// 微电网模块类型定义

export interface MicrogridProjectData {
  // 基础信息
  projectName: string;
  projectType: 'campus' | 'factory' | 'community';

  // 容量配置
  totalCapacity: number;
  renewableCapacity: number;
  storageCapacity: number;
  loadCapacity: number;

  // 电价信息
  electricityPrice: number;
  peakPrice: number;
  valleyPrice: number;

  // 财务参数
  investment: number;
  operationCost: number;
  maintenanceCost: number;
  electricitySavings: number;
  annualRevenue: number;
}

export const initialMicrogridData: MicrogridProjectData = {
  projectName: '',
  projectType: 'campus',

  totalCapacity: 1000,
  renewableCapacity: 500,
  storageCapacity: 200,
  loadCapacity: 300,

  electricityPrice: 0.8,
  peakPrice: 1.2,
  valleyPrice: 0.4,

  investment: 5000000,
  operationCost: 100000,
  maintenanceCost: 50000,
  electricitySavings: 2000000,
  annualRevenue: 1800000
};
