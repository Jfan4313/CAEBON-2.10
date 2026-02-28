import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import MicrogridDashboard from './MicrogridDashboard';
import FinancialAnalysisView from './FinancialAnalysisView';

type TabType = 'dashboard' | 'financial';

export default function RetrofitAI() {
    const { modules } = useProject();
    const currentModule = modules['retrofit-ai'];
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');

    if (!currentModule) return null;

    return (
        <div className="flex h-full flex-col bg-slate-50 relative overflow-hidden">
            {/* Header */}
            <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <span className="material-icons text-indigo-600">psychology</span>
                        AI 智控管理平台
                    </h2>
                </div>
            </header>

            {/* Tabs */}
            <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-6">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <span className="material-icons text-lg">dashboard</span> 综合仪表盘
                </button>
                <button
                    onClick={() => setActiveTab('financial')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === 'financial' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <span className="material-icons text-lg">savings</span> 投资收益分析
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'dashboard' ? <MicrogridDashboard /> : <FinancialAnalysisView />}
            </div>
        </div>
    );
}
