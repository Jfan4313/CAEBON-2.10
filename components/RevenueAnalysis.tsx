import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Brush } from 'recharts';
import { View } from '../types';
import { useProject, ModuleData } from '../context/ProjectContext';

interface RevenueAnalysisProps {
  onChangeView?: (view: View) => void;
}

const RevenueAnalysis: React.FC<RevenueAnalysisProps> = ({ onChangeView }) => {
  const { modules, getSummary } = useProject();
  const { totalInvestment, totalSaving, roi } = getSummary();

  const handleModuleClick = (viewName: string) => {
      if (onChangeView) {
          const target = viewName as View;
          onChangeView(target);
      }
  };

  // Generate cash flow data based on total savings and investment
  const cashFlowData = Array.from({ length: 10 }, (_, i) => {
      const year = `Y${i + 1}`;
      // Simple mock model: Year 1 is negative investment, subsequent are positive savings
      // Accumulating logic
      const value = -totalInvestment + (totalSaving * (i + 1));
      return { year, value: parseFloat(value.toFixed(1)) };
  });

  // Filter only active modules for the list
  const activeModuleList = (Object.values(modules) as ModuleData[]).filter(m => m.isActive);

  // Icon mapping helper
  const getIcon = (id: string) => {
      if (id.includes('solar')) return 'wb_sunny';
      if (id.includes('storage')) return 'battery_charging_full';
      if (id.includes('ev')) return 'ev_station';
      if (id.includes('ai')) return 'psychology';
      if (id.includes('hvac')) return 'ac_unit';
      if (id.includes('lighting')) return 'lightbulb';
      return 'build';
  };

  const getColor = (id: string) => {
      if (id.includes('solar')) return 'bg-yellow-100 text-yellow-600';
      if (id.includes('storage')) return 'bg-purple-100 text-purple-600';
      if (id.includes('ev')) return 'bg-green-100 text-green-600';
      return 'bg-blue-100 text-blue-600';
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex justify-between items-center px-8 shrink-0 z-10 sticky top-0">
            <div>
                <h1 className="text-xl font-bold text-slate-900">收益分析看板</h1>
                <p className="text-xs text-slate-500 mt-0.5">苏州工业园区零碳改造项目 - 财务综合评估报告</p>
            </div>
            <div className="flex items-center gap-3">
                <button className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"><span className="material-icons text-[16px] mr-2 text-slate-500">download</span> 导出报表</button>
                <button className="flex items-center px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium shadow-sm hover:bg-primary-hover"><span className="material-icons text-[16px] mr-2">share</span> 分享</button>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth bg-slate-50">
             {/* KPI Cards (Dynamic) */}
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                 {[
                     {title: '总投资额 (CapEx)', val: `¥ ${totalInvestment.toFixed(1)}万`, icon: 'account_balance_wallet', tag: '预估', color: 'bg-blue-50 text-primary'},
                     {title: '年均净收益', val: `¥ ${totalSaving.toFixed(1)}万`, icon: 'savings', tag: '+12.5% YoY', color: 'bg-green-50 text-emerald-600', tagColor: 'bg-emerald-100 text-emerald-700'},
                     {title: '项目内部收益率 (IRR)', val: `${(roi / 2).toFixed(1)}%`, icon: 'trending_up', tag: '优秀', color: 'bg-purple-50 text-purple-600', valColor: 'text-primary'}, // Simple mock
                     {title: '动态投资回收期 (PBP)', val: `${(totalInvestment / (totalSaving || 1)).toFixed(1)} 年`, icon: 'timelapse', tag: '静态测算', color: 'bg-orange-50 text-orange-600'},
                 ].map((k, i) => (
                     <div key={i} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between h-40">
                         <div className="flex justify-between items-start mb-4">
                             <div className={`p-2 rounded-lg ${k.color}`}><span className="material-icons text-xl">{k.icon}</span></div>
                             <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${k.tagColor || 'bg-slate-100 text-slate-600'}`}>{k.tag}</span>
                         </div>
                         <div>
                             <p className="text-sm text-slate-500 mb-1">{k.title}</p>
                             <h3 className={`text-2xl font-bold text-slate-900 ${k.valColor || ''}`}>{k.val}</h3>
                         </div>
                     </div>
                 ))}
             </div>
             
             {/* Waterfall Chart Fixed Structure (Mock Data for Viz, could be dynamic but complex) */}
             <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="text-lg font-bold text-slate-900">项目年度能耗/费用节约路径</h3>
                     <div className="flex items-center gap-2 text-xs text-slate-500">
                         <span className="flex items-center"><span className="w-3 h-3 bg-slate-300 mr-1 rounded-sm"></span> 费用支出</span>
                         <span className="flex items-center"><span className="w-3 h-3 bg-emerald-500 mr-1 rounded-sm"></span> 节约收益</span>
                         <span className="flex items-center"><span className="w-3 h-3 bg-primary mr-1 rounded-sm"></span> 最终净值</span>
                     </div>
                 </div>
                 {/* Flex container for the chart area */}
                 <div className="h-64 w-full flex items-end justify-between gap-6 px-8 border-l border-b border-slate-200">
                      {/* Bar 1 */}
                      <div className="flex flex-col items-center justify-end flex-1 h-full group">
                          <div className="w-full bg-slate-300 rounded-t relative transition-all hover:opacity-90 flex items-start justify-center pt-2 text-xs font-bold text-slate-600" style={{ height: '90%' }}>
                              380w
                          </div>
                          <span className="text-xs text-slate-500 mt-3 font-medium text-center">基准能耗费</span>
                      </div>
                      
                      {/* Dynamic Bars for top 3 savers */}
                      {activeModuleList.slice(0, 3).map((mod, i) => (
                          <div key={i} className="flex flex-col items-center justify-end flex-1 h-full group">
                               <div className="w-full relative flex flex-col justify-end" style={{ height: `${80 - (i * 20)}%` }}>
                                    <div className="w-full bg-emerald-500 rounded relative flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-emerald-500/20" style={{ height: `${(mod.yearlySaving / 10)}%`, minHeight: '20px' }}>
                                        -{mod.yearlySaving}w
                                    </div>
                               </div>
                               <span className="text-xs text-slate-500 mt-3 text-center">{mod.name.substring(0, 4)}</span>
                          </div>
                      ))}

                      {/* Bar 5 */}
                      <div className="flex flex-col items-center justify-end flex-1 h-full group">
                          <div className="w-full bg-primary rounded-t relative transition-all hover:opacity-90 flex items-start justify-center pt-2 text-xs font-bold text-white" style={{ height: '30%' }}>
                              {(380 - totalSaving).toFixed(0)}w
                          </div>
                          <span className="text-xs text-slate-500 mt-3 font-medium text-center">改造后费用</span>
                      </div>
                 </div>
             </div>

             {/* Cash Flow Chart */}
             <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="text-lg font-bold text-slate-900">20年累计现金流预测</h3>
                     <div className="flex items-center gap-4 text-xs text-slate-600">
                         <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-primary mr-2"></div>累计现金流</div>
                     </div>
                 </div>
                 <div className="h-72 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={cashFlowData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                             <defs>
                                 <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                     <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                     <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                 </linearGradient>
                             </defs>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                             <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                             <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                             <Tooltip 
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px'}}
                                itemStyle={{fontSize: '12px', fontWeight: 500, color: '#4f46e5'}}
                                labelStyle={{fontSize: '12px', color: '#64748b', marginBottom: '8px'}}
                             />
                             <Legend iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                             <Area name="累计现金流 (Cumulative Cash Flow)" type="monotone" dataKey="value" stroke="#4f46e5" fillOpacity={1} fill="url(#colorVal)" strokeWidth={3} />
                             <Brush dataKey="year" height={20} stroke="#cbd5e1" travellerWidth={10} tickFormatter={() => ''} />
                         </AreaChart>
                     </ResponsiveContainer>
                 </div>
             </div>
        </div>
      </div>

      <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 z-20 h-screen overflow-y-auto">
           <div className="p-6 border-b border-slate-100">
               <h2 className="font-bold text-slate-900">模块贡献明细 (已启用)</h2>
               <p className="text-xs text-slate-500 mt-1">各子系统投资回报与减碳贡献</p>
           </div>
           <div className="p-4 space-y-4">
               {activeModuleList.length === 0 && (
                   <div className="text-center py-8 text-slate-400 text-sm">暂无启用模块</div>
               )}
               {activeModuleList.map((m, i) => (
                   <div 
                        key={m.id} 
                        onClick={() => handleModuleClick(m.id)}
                        className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-primary/30 hover:bg-white hover:shadow-md transition-all group cursor-pointer"
                   >
                       <div className="flex justify-between items-center mb-3">
                           <div className="flex items-center gap-3">
                               <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getColor(m.id)}`}><span className="material-icons text-sm">{getIcon(m.id)}</span></div>
                               <div><h4 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">{m.name}</h4><span className="text-[10px] text-slate-500">{m.kpiPrimary.label}: {m.kpiPrimary.value}</span></div>
                           </div>
                           <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{m.kpiSecondary.label}: {m.kpiSecondary.value}</span>
                       </div>
                       <div className="space-y-3">
                           <div>
                               <div className="flex justify-between text-xs mb-1 text-slate-500"><span>投资占比</span><span className="font-medium text-slate-700">{totalInvestment > 0 ? ((m.investment / totalInvestment) * 100).toFixed(1) : 0}%</span></div>
                               <div className="w-full bg-slate-200 rounded-full h-1.5"><div className="bg-primary h-1.5 rounded-full" style={{width: `${totalInvestment > 0 ? (m.investment / totalInvestment) * 100 : 0}%`}}></div></div>
                           </div>
                           <div className="flex justify-between items-end border-t border-slate-200 pt-2">
                               <div className="text-xs text-slate-500">年收益贡献</div>
                               <div className="text-sm font-bold text-slate-900">¥ {m.yearlySaving}<span className="text-xs font-normal text-slate-500">万</span></div>
                           </div>
                       </div>
                   </div>
               ))}
               <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                   <h4 className="text-sm font-bold text-primary mb-2 flex items-center"><span className="material-icons text-sm mr-2">insights</span> 综合建议</h4>
                   <p className="text-xs text-slate-600 leading-relaxed">
                       {activeModuleList.length > 3 
                        ? '多模块协同效应显著，整体抗风险能力强。' 
                        : '建议启用更多模块以形成能源微网闭环，提升整体ROI。'}
                   </p>
               </div>
           </div>
      </aside>
    </div>
  );
};

export default RevenueAnalysis;