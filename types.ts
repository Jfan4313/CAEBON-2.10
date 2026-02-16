export type View =
  | 'dashboard'
  | 'project-entry'
  | 'price-config'
  | 'retrofit-solar'
  | 'retrofit-storage'
  | 'retrofit-hvac'
  | 'retrofit-lighting'
  | 'retrofit-water'
  | 'retrofit-ev'
  | 'retrofit-microgrid'
  | 'retrofit-vpp'
  | 'retrofit-ai'
  | 'retrofit-carbon'
  | 'revenue-analysis'
  | 'report-center'
  | 'formula-admin'
  | 'visual-analysis';

// Module type definitions for better type safety
export type ModuleType =
  | 'solar'
  | 'storage'
  | 'hvac'
  | 'lighting'
  | 'water'
  | 'ev'
  | 'microgrid'
  | 'vpp'
  | 'ai'
  | 'carbon';

// Strategy type definitions
export type StrategyType =
  | 'rooftop'
  | 'arbitrage'
  | 'replace'
  | 'smart'
  | 'grid-tied'
  | 'dr'
  | 'ai'
  | 'trade';

// KPI Metric interface
export interface KPIMetric {
  label: string;
  value: string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
}
  | 'dashboard'
  | 'project-entry'
  | 'price-config'
  | 'retrofit-solar'
  | 'retrofit-storage'
  | 'retrofit-hvac'
  | 'retrofit-lighting'
  | 'retrofit-water'
  | 'retrofit-ev'
  | 'retrofit-microgrid'
  | 'retrofit-vpp'
  | 'retrofit-ai'
  | 'retrofit-carbon'
  | 'revenue-analysis'
  | 'report-center'
  | 'formula-admin'
  | 'visual-analysis';

export interface SidebarItemProps {
  icon: string;
  label: string;
  view: View;
  isActive: boolean;
  onClick: (view: View) => void;
  hasSubmenu?: boolean;
}

// 管理员模式类型定义
export interface FormulaParam {
  key: string;
  label: string;
  defaultValue: number;
  unit: string;
  editable: boolean;
}

export interface FormulaItem {
  formula: string;
  description: string;
}

export interface ModuleFormula {
  id: string;
  name: string;
  formulas: FormulaItem[];
  params: FormulaParam[];
  testResult?: {
    investment?: number;
    annual_saving?: number;
    roi?: number;
    irr?: number;
    payback_period?: number;
    npv?: number;
    carbon_reduction?: number;
    [key: string]: number | undefined;
  };
}