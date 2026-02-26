import React, { useState, useMemo, useCallback } from 'react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const [isRetrofitOpen, setIsRetrofitOpen] = useState(true);

  // Memoize CSS class functions to prevent recreation on each render
  const navItemClass = useCallback((isActive: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer group ${
      isActive
        ? 'bg-primary text-white shadow-lg shadow-primary/30'
        : 'text-slate-500 hover:bg-slate-100 hover:text-primary'
    }`,
  []);

  const iconClass = useCallback((isActive: boolean) =>
    `material-symbols-outlined text-[20px] transition-transform ${isActive ? '' : 'group-hover:scale-110'}`,
  []);

  // Memoize retrofit items to prevent recreation
  const retrofitItems = useMemo(() => [
    { id: 'retrofit-lighting' as View, label: '智能照明', icon: 'lightbulb' },
    { id: 'retrofit-water' as View, label: '热水系统', icon: 'water_drop' },
    { id: 'retrofit-hvac' as View, label: '暖通空调', icon: 'ac_unit' },
    { id: 'retrofit-solar' as View, label: '分布式光伏', icon: 'solar_power' },
    { id: 'retrofit-storage' as View, label: '储能系统', icon: 'battery_charging_full' },
    { id: 'retrofit-ev' as View, label: '充电桩设施', icon: 'ev_station' },
    { id: 'retrofit-microgrid' as View, label: '微电网', icon: 'grid_4x4' },
    { id: 'retrofit-vpp' as View, label: '虚拟电厂', icon: 'hub' },
    { id: 'retrofit-ai' as View, label: 'AI 管理平台', icon: 'psychology' },
    { id: 'retrofit-carbon' as View, label: '碳资产管理', icon: 'co2' },
  ], []);

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 z-30">
      <div className="h-16 flex items-center px-6 border-b border-transparent">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <span className="material-symbols-outlined text-[20px]">eco</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-800">
            ZeroCarbon
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-1 scrollbar-hide">
        <div
          className={navItemClass(currentView === 'dashboard')}
          onClick={() => onChangeView('dashboard')}
        >
          <span className={iconClass(currentView === 'dashboard')}>dashboard</span>
          <span className="font-medium text-sm">项目汇总</span>
        </div>

        <div
          className={navItemClass(currentView === 'project-entry')}
          onClick={() => onChangeView('project-entry')}
        >
          <span className={iconClass(currentView === 'project-entry')}>edit_note</span>
          <span className="font-medium text-sm">项目信息录入</span>
        </div>

        <div
          className={navItemClass(currentView === 'price-config')}
          onClick={() => onChangeView('price-config')}
        >
          <span className={iconClass(currentView === 'price-config')}>currency_yen</span>
          <span className="font-medium text-sm">电价模型配置</span>
        </div>

        {/* Retrofit Submenu */}
        <div className="space-y-1 pt-1">
          <div
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer text-slate-500 hover:bg-slate-50 hover:text-primary`}
            onClick={() => setIsRetrofitOpen(!isRetrofitOpen)}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px]">build</span>
              <span className="font-medium text-sm">改造方案</span>
            </div>
            <span className={`material-symbols-outlined text-[16px] transition-transform ${isRetrofitOpen ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </div>

          {isRetrofitOpen && (
            <div className="pl-4 space-y-1 border-l-2 border-slate-50 ml-4 my-1">
              {retrofitItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    currentView === item.id
                      ? 'bg-blue-50 text-primary'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  onClick={() => onChangeView(item.id)}
                >
                  <span className="material-symbols-outlined text-[16px] opacity-70">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className={navItemClass(currentView === 'revenue-analysis')}
          onClick={() => onChangeView('revenue-analysis')}
        >
          <span className={iconClass(currentView === 'revenue-analysis')}>trending_up</span>
          <span className="font-medium text-sm">收益分析</span>
        </div>

        <div
          className={navItemClass(currentView === 'report-center')}
          onClick={() => onChangeView('report-center')}
        >
          <span className={iconClass(currentView === 'report-center')}>description</span>
          <span className="font-medium text-sm">报告中心</span>
        </div>

        <div className="border-t border-slate-200 my-2"></div>

        <div
          className={navItemClass(currentView === 'formula-admin')}
          onClick={() => onChangeView('formula-admin')}
        >
          <span className={iconClass(currentView === 'formula-admin')}>settings</span>
          <span className="font-medium text-sm">算法管理</span>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
          <img
            src="https://picsum.photos/40/40"
            alt="User"
            className="w-8 h-8 rounded-full"
          />
          <div>
            <p className="text-xs font-bold text-slate-800">王工程师</p>
            <p className="text-[10px] text-slate-500">项目经理</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
