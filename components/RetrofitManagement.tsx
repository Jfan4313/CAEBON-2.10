import React, { useState, useEffect, useCallback } from 'react';
import { useProject } from '../context/ProjectContext';

const RetrofitManagement: React.FC = () => {
    const { modules, updateModule, saveProject } = useProject();
    const currentModule = modules['retrofit-management'] || {};
    const params = currentModule.params || { extraOmCost: 5.0, platformFeeRate: 0, mode: 'fixed' };

    const [localExtraOm, setLocalExtraOm] = useState(params.extraOmCost);
    const [localFeeRate, setLocalFeeRate] = useState(params.platformFeeRate);

    const handleSync = useCallback((newOm: number, newRate: number) => {
        // yearlySaving is negative as it represents an extra expense
        const moduleList = Object.values(modules) as any[];
        const baseSavings = moduleList.reduce((sum, m) =>
            sum + (m.isActive && m.id !== 'retrofit-management' ? (Number(m.yearlySaving) || 0) : 0), 0);

        const platformFee = baseSavings * (newRate / 100);
        const yearlyExpense = newOm + platformFee;

        updateModule('retrofit-management', {
            yearlySaving: -yearlyExpense,
            kpiPrimary: { label: '额外支出', value: `${yearlyExpense.toFixed(2)} 万元/年` },
            kpiSecondary: { label: '管理模式', value: '综合托管' },
            params: { extraOmCost: newOm, platformFeeRate: newRate, mode: 'fixed' }
        });
    }, [modules, updateModule]);

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">综合能源管理</h2>
                    <p className="text-slate-500 mt-1">配置全局性的运维额外支出、平台服务费及第三方托管成本</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => saveProject()}
                        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                    >
                        <span className="material-symbols-outlined text-[20px]">save</span>
                        保存配置
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Configuration Card */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <span className="material-symbols-outlined">settings_suggest</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">支出项配置</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 block">额外年度运维费 (万元/年)</label>
                            <p className="text-xs text-slate-400 mb-2">指不属于特定设备（如光伏、暖通）的整体物业运维、人工巡检或第三方托管费用</p>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="0"
                                    max="50"
                                    step="0.5"
                                    value={localExtraOm}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setLocalExtraOm(val);
                                        handleSync(val, localFeeRate);
                                    }}
                                    className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <input
                                    type="number"
                                    value={localExtraOm}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setLocalExtraOm(val);
                                        handleSync(val, localFeeRate);
                                    }}
                                    className="w-20 px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                        </div>

                        <div className="h-px bg-slate-100 w-full"></div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 block">平台服务费率 (%)</label>
                            <p className="text-xs text-slate-400 mb-2">基于项目总节能量（毛利）提取的管理费比例（如 AI 智控 SaaS 服务费）</p>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="0"
                                    max="10"
                                    step="0.1"
                                    value={localFeeRate}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setLocalFeeRate(val);
                                        handleSync(localExtraOm, val);
                                    }}
                                    className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={localFeeRate}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            setLocalFeeRate(val);
                                            handleSync(localExtraOm, val);
                                        }}
                                        className="w-20 px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none pr-6"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary / Impact Card */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">analytics</span>
                            财务影响摘要
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                <p className="text-xs text-white/50 mb-1">年度管理总支出</p>
                                <p className="text-2xl font-bold text-red-400">-{Math.abs(currentModule.yearlySaving || 0).toFixed(2)} <span className="text-xs font-normal opacity-70">万元</span></p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                <p className="text-xs text-white/50 mb-1">占项目总收益比</p>
                                <p className="text-2xl font-bold">
                                    {Math.abs(((currentModule.yearlySaving || 0) / ((Object.values(modules) as any[]).reduce((s, m) => s + (m.isActive && m.id !== 'retrofit-management' ? (Number(m.yearlySaving) || 0) : 0), 0) || 1) * 100)).toFixed(2)}%
                                </p>
                            </div>
                        </div>
                        <p className="text-[10px] text-white/40 mt-6 leading-relaxed">
                            注：本模块填写的支出将作为减项进入项目 IRR 测算模型，用于平摊整体托管成本。
                        </p>
                    </div>

                    <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-200">
                                <span className="material-symbols-outlined">verified</span>
                            </div>
                            <div>
                                <h4 className="text-emerald-800 font-bold text-sm">专家建议</h4>
                                <p className="text-emerald-700/70 text-xs mt-1 leading-relaxed">
                                    综合能源管理支出通常控制在项目总节能量的 5%~10% 以内。过高的管理成本会显著拉长项目回收期。建议优先将运维预算分配给光伏清洁和暖通滤网更换等核心增效环节。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RetrofitManagement;
