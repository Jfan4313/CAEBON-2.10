import React, { useState, lazy, Suspense, memo, useMemo, useCallback } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import { View } from './types';
import { useProject } from './context/ProjectContext';

// Lazy load components for code splitting
const Dashboard = lazy(() => import('./components/Dashboard'));
const ProjectEntry = lazy(() => import('./components/ProjectEntry'));
const PriceConfig = lazy(() => import('./components/PriceConfig'));
const RetrofitSolar = lazy(() => import('./modules/solar'));
const RetrofitStorage = lazy(() => import('./components/RetrofitStorage'));
const RetrofitEV = lazy(() => import('./components/RetrofitEV'));
const RetrofitMicrogrid = lazy(() => import('./components/RetrofitMicrogrid'));
const RetrofitVPP = lazy(() => import('./components/RetrofitVPP'));
const RetrofitAI = lazy(() => import('./components/RetrofitAI'));
const RetrofitCarbon = lazy(() => import('./components/RetrofitCarbon'));
const RetrofitHVAC = lazy(() => import('./components/RetrofitHVAC'));
const RetrofitLighting = lazy(() => import('./components/RetrofitLighting'));
const RetrofitWater = lazy(() => import('./components/RetrofitWater'));
const RevenueAnalysis = lazy(() => import('./components/RevenueAnalysis'));
const ReportCenter = lazy(() => import('./components/ReportCenter'));
const FormulaAdmin = lazy(() => import('./components/FormulaAdmin'));
const VisualAnalysis = lazy(() => import('./components/VisualAnalysis'));

// Loading fallback component
const LoadingFallback = memo(() => (
  <div className="flex items-center justify-center h-full">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-slate-500">加载中...</span>
    </div>
  </div>
));

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const { notification } = useProject();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'project-entry':
        return <ProjectEntry />;
      case 'price-config':
        return <PriceConfig />;
      case 'retrofit-solar':
        return <RetrofitSolar />;
      case 'retrofit-storage':
        return <RetrofitStorage />;
      case 'retrofit-hvac':
        return <RetrofitHVAC />;
      case 'retrofit-lighting':
        return <RetrofitLighting />;
      case 'retrofit-water':
        return <RetrofitWater />;
      case 'retrofit-ev':
        return <RetrofitEV />;
      case 'retrofit-microgrid':
        return <RetrofitMicrogrid />;
      case 'retrofit-vpp':
        return <RetrofitVPP />;
      case 'retrofit-ai':
        return <RetrofitAI />;
      case 'retrofit-carbon':
        return <RetrofitCarbon />;
      case 'revenue-analysis':
        return <RevenueAnalysis onChangeView={setCurrentView} />;
      case 'report-center':
        return <ReportCenter />;
      case 'formula-admin':
        return <FormulaAdmin />;
      case 'visual-analysis':
        return <VisualAnalysis />;
      default:
        return <Dashboard />;
    }
  };

  // Memoize the render result to prevent unnecessary recreations
  const renderContent = useMemo(() => {
    return renderView();
  }, [currentView]);

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-slate-50 font-sans text-slate-900 relative">
        <Sidebar currentView={currentView} onChangeView={setCurrentView} />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <div className="flex-1 h-full overflow-hidden">
            <Suspense fallback={<LoadingFallback />}>
              {renderContent}
            </Suspense>
          </div>
        </main>

        {/* Global Toast Notification */}
        {notification && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-[slideIn_0.3s_ease-out] border ${notification.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${notification.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>
              <span className="material-icons text-[16px]">{notification.type === 'success' ? 'check' : 'priority_high'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">{notification.type === 'success' ? '操作成功' : '操作失败'}</span>
              <span className="text-xs opacity-80">{notification.message}</span>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
