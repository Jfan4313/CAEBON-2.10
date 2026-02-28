import React, { useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export const ESGScoreCard: React.FC = () => {
    const { modules } = useProject();

    const esgData = useMemo(() => {
        let carbonScore = 40;
        let renewableScore = 30;
        let efficiencyScore = 50;
        let innovationScore = 40; // VPP, AI
        let socialScore = 60; // EV, public amenities

        // Dynamic points based on active modules
        if (modules['retrofit-solar']?.isActive) renewableScore += 40;
        if (modules['retrofit-storage']?.isActive) renewableScore += 20;

        if (modules['retrofit-carbon']?.isActive) carbonScore += 40;
        if (modules['retrofit-hvac']?.isActive) efficiencyScore += 25;
        if (modules['retrofit-lighting']?.isActive) efficiencyScore += 15;
        if (modules['retrofit-water']?.isActive) efficiencyScore += 15;

        if (modules['retrofit-ai']?.isActive) innovationScore += 30;
        if (modules['retrofit-vpp']?.isActive) innovationScore += 30;

        if (modules['retrofit-ev']?.isActive) socialScore += 35;

        // Cap scores at 100 max
        carbonScore = Math.min(100, carbonScore);
        renewableScore = Math.min(100, renewableScore);
        efficiencyScore = Math.min(100, efficiencyScore);
        innovationScore = Math.min(100, innovationScore);
        socialScore = Math.min(100, socialScore);

        // Weighted total
        const totalScore = Math.round(
            (carbonScore * 0.30) +
            (renewableScore * 0.25) +
            (efficiencyScore * 0.25) +
            (innovationScore * 0.10) +
            (socialScore * 0.10)
        );

        return {
            carbonScore,
            renewableScore,
            efficiencyScore,
            innovationScore,
            socialScore,
            totalScore,
            isGreenFactory: totalScore >= 80,
            radarData: [
                { subject: '碳减排表现', A: carbonScore, fullMark: 100 },
                { subject: '绿电渗透率', A: renewableScore, fullMark: 100 },
                { subject: '社会环境友好', A: socialScore, fullMark: 100 },
                { subject: '数智化创新', A: innovationScore, fullMark: 100 },
                { subject: '综合能效评估', A: efficiencyScore, fullMark: 100 },
            ]
        };
    }, [modules]);

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 mb-8 animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
            <div className="flex-1 relative z-10">
                <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <span className="material-icons text-green-500">eco</span>
                    ESG 与绿色名录政策适配性评估
                </h3>
                <p className="text-xs text-slate-500 mb-6">基于现有的项目配置，自动仿真评估项目符合地市级 / 省级“绿色工厂”、“低碳名录”的潜力指标。</p>

                <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full border-[6px] flex items-center justify-center flex-col shrink-0 shadow-inner bg-slate-50 relative"
                        style={{ borderColor: esgData.totalScore >= 80 ? '#10B981' : esgData.totalScore >= 60 ? '#F59E0B' : '#64748B' }}>
                        <span className="text-3xl font-black text-slate-800 tracking-tighter" style={{ color: esgData.totalScore >= 80 ? '#10B981' : esgData.totalScore >= 60 ? '#F59E0B' : '#64748B' }}>{esgData.totalScore}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">SCORE</span>
                    </div>
                    <div>
                        <div className={`text-[13px] font-bold px-4 py-2 rounded-full inline-block mb-2 shadow-sm ${esgData.isGreenFactory ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
                            {esgData.isGreenFactory ? '✓ 高潜力入选绿色工厂名录 (ESG 优质)' : '! 需深化改造以符合绿色申报标准'}
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mt-1">
                            入选各地“绿色工厂”或“碳达峰试点工程”不仅能带来极大的品牌美誉度，更核心的是能获取可观的<span className="text-slate-700 font-semibold">政府专项财政补贴</span>与更为低廉的<span className="text-slate-700 font-semibold">绿色信贷支持</span>。
                        </p>
                    </div>
                </div>
            </div>
            <div className="w-full md:w-80 h-[220px] bg-slate-50/50 rounded-xl border border-slate-100 relative z-10 flex shrink-0 justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="60%" data={esgData.radarData}>
                        <PolarGrid stroke="#E2E8F0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="项目评分" dataKey="A" stroke="#10B981" strokeWidth={2} fill="#10B981" fillOpacity={0.35} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
