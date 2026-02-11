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
  | 'report-center';

export interface SidebarItemProps {
  icon: string;
  label: string;
  view: View;
  isActive: boolean;
  onClick: (view: View) => void;
  hasSubmenu?: boolean;
}