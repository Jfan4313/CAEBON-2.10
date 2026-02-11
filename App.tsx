import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProjectEntry from './components/ProjectEntry';
import PriceConfig from './components/PriceConfig';
import RetrofitSolar from './components/RetrofitSolar';
import RetrofitStorage from './components/RetrofitStorage';
import RetrofitEV from './components/RetrofitEV';
import RetrofitMicrogrid from './components/RetrofitMicrogrid';
import RetrofitVPP from './components/RetrofitVPP';
import RetrofitAI from './components/RetrofitAI';
import RetrofitCarbon from './components/RetrofitCarbon';
import RetrofitHVAC from './components/RetrofitHVAC';
import RetrofitLighting from './components/RetrofitLighting';
import RetrofitWater from './components/RetrofitWater';
import RevenueAnalysis from './components/RevenueAnalysis';
import ReportCenter from './components/ReportCenter';
import { View } from './types';
import { ProjectProvider } from './context/ProjectContext';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');

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
      default:
        return <Dashboard />;
    }
  };

  return (
    <ProjectProvider>
      <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
        <Sidebar currentView={currentView} onChangeView={setCurrentView} />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            <div className="flex-1 h-full overflow-hidden">
              {renderView()}
            </div>
        </main>
      </div>
    </ProjectProvider>
  );
};

export default App;