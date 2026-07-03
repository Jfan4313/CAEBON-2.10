import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View } from '../types';
import { useStorage } from '../context/StorageContext';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const [isRetrofitOpen, setIsRetrofitOpen] = useState(true);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { mode, isCloudEnabled, toggleMode } = useStorage();
  const { currentUser, isAuthenticated, logout } = useAuth();

  // 管理员默认密码
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

  useEffect(() => {
    // 检查会话中是否已验证
    const authenticated = sessionStorage.getItem('admin_authenticated') === 'true';
    setIsAdminAuthenticated(authenticated);
  }, []);

  const handleLogout = async () => {
    if (confirm('确定要退出登录吗？')) {
      await logout();
      // 如果当前是云端模式，切换回本地模式
      if (mode === 'cloud') {
        toggleMode();
      }
    }
  };

  const handleToggleMode = () => {
    // 如果尝试切换到云端模式但未登录，显示登录提示
    if (mode === 'local' && !isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    toggleMode();
  };

  const handleAdminClick = () => {
    if (isAdminAuthenticated) {
      // 已验证，直接进入
      onChangeView('formula-admin');
    } else {
      // 显示密码输入对话框
      setShowAdminPassword(true);
    }
  };

  const verifyPassword = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('admin_authenticated', 'true');
      setShowAdminPassword(false);
      onChangeView('formula-admin');
      setAdminPassword('');
    } else {
      alert('密码错误，请重试');
    }
  };

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

        <div
          className={navItemClass(currentView === 'retrofit-energy-sales')}
          onClick={() => onChangeView('retrofit-energy-sales')}
        >
          <span className={iconClass(currentView === 'retrofit-energy-sales')}>receipt_long</span>
          <span className="font-medium text-sm">售电服务</span>
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

        {/* Cloud Storage Toggle */}
        <div className="px-4 py-3">
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-slate-600">cloud_sync</span>
                <span className="text-xs font-semibold text-slate-700">云存储</span>
              </div>
              {mode === 'cloud' && (
                <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                  已启用
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleMode}
                disabled={mode === 'cloud' && !isAuthenticated}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                  mode === 'local'
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                本地存储
              </button>
              <button
                onClick={handleToggleMode}
                disabled={!isCloudEnabled || (mode === 'local' && !isAuthenticated)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                  mode === 'cloud'
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : isCloudEnabled
                      ? 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-transparent'
                }`}
              >
                云端存储
              </button>
            </div>
            {!isCloudEnabled && mode === 'local' && (
              <p className="text-[10px] text-slate-400 mt-2">
                云存储未配置，请参考 SUPABASE_SETUP.md
              </p>
            )}
            {isCloudEnabled && mode === 'local' && !isAuthenticated && (
              <p className="text-[10px] text-slate-400 mt-2">
                云端存储需要先登录
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 my-2"></div>

        <div
          className={navItemClass(currentView === 'formula-admin')}
          onClick={handleAdminClick}
        >
          <span className={iconClass(currentView === 'formula-admin')}>settings</span>
          <span className="font-medium text-sm">算法管理</span>
          {isAdminAuthenticated && (
            <span className="material-symbols-outlined text-[12px] text-emerald-500 ml-auto">check_circle</span>
          )}
        </div>
      </nav>

      {/* Admin Password Dialog */}
      {showAdminPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[24px] text-primary">lock</span>
              <h3 className="text-lg font-bold text-slate-800">管理员验证</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">请输入管理员密码以访问算法管理</p>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
              placeholder="请输入密码"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAdminPassword(false);
                  setAdminPassword('');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={verifyPassword}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-slate-100">
        {isAuthenticated && currentUser ? (
          // Logged in user
          <div className="bg-slate-50 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white shadow-md">
                <span className="text-xs font-bold">
                  {currentUser.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {currentUser.userMetadata?.full_name || '用户'}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{currentUser.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-2 px-3 rounded-lg text-xs font-medium text-slate-600 hover:bg-white hover:text-red-500 transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">logout</span>
              退出登录
            </button>
          </div>
        ) : (
          // Not logged in
          <button
            onClick={() => setShowAuthModal(true)}
            className="w-full bg-gradient-to-r from-primary to-primary-light rounded-2xl p-4 flex items-center justify-center gap-2 text-white hover:shadow-lg hover:shadow-primary/20 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            <span className="text-sm font-semibold">登录 / 注册</span>
          </button>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </aside>
  );
};

export default Sidebar;
