import { useState, useCallback, useMemo } from 'react';
import type { MicrogridProjectData } from './types';

/**
 * 微电网项目业务逻辑 Hook
 */
export function useMicrogrid() {
  const [projectData, setProjectData] = useState<MicrogridProjectData>({
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
  });

  const updateProjectData = useCallback((key: keyof MicrogridProjectData, value: any) => {
    setProjectData(prev => ({ ...prev, [key]: value }));
  }, []);

  const calculateROI = useMemo(() => {
    const { investment, annualRevenue, operationCost, maintenanceCost } = projectData;
    const totalCost = investment + operationCost + maintenanceCost;
    const netProfit = annualRevenue - operationCost - maintenanceCost;
    return totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  }, [projectData]);

  const calculatePaybackPeriod = useMemo(() => {
    const { investment, annualRevenue, operationCost, maintenanceCost } = projectData;
    const netAnnualRevenue = annualRevenue - operationCost - maintenanceCost;
    return netAnnualRevenue > 0 ? investment / netAnnualRevenue : 0;
  }, [projectData]);

  return {
    projectData,
    updateProjectData,
    calculateROI,
    calculatePaybackPeriod
  };
}
