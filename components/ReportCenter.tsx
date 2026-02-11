import React from 'react';

const ReportCenter: React.FC = () => {
  return (
    <div className="flex h-full">
        <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">报告生成中心</h1>
                    <p className="text-slate-500">定制并生成项目估值报告，支持多种格式与详细程度配置。</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Basic Config */}
                    <div className="p-6 border-b border-slate-100">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><span className="material-icons-round text-base">tune</span> 基础配置</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-3">报告语言</label>
                                <div className="flex p-1 bg-slate-100 rounded-lg w-full max-w-xs">
                                    <button className="flex-1 px-4 py-2 rounded-md bg-white text-primary shadow-sm text-sm font-medium">中文 (Chinese)</button>
                                    <button className="flex-1 px-4 py-2 rounded-md text-slate-500 hover:text-slate-700 text-sm font-medium">英文 (English)</button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-3">报告详略</label>
                                <div className="flex gap-4">
                                    <label className="relative flex cursor-pointer">
                                        <input type="radio" name="detail" className="peer sr-only" defaultChecked />
                                        <div className="px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all flex flex-col w-32">
                                            <span className="text-sm font-bold mb-1">精简版</span><span className="text-xs text-slate-400">核心指标概览</span>
                                        </div>
                                    </label>
                                    <label className="relative flex cursor-pointer">
                                        <input type="radio" name="detail" className="peer sr-only" />
                                        <div className="px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all flex flex-col w-32">
                                            <span className="text-sm font-bold mb-1">完整版</span><span className="text-xs text-slate-400">全量数据分析</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Checkboxes */}
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><span className="material-icons-round text-base">checklist</span> 导出内容勾选</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {['建筑基本信息', '基准能耗分析', '电价模型参数', '光伏发电系统', '储能系统配置', 'AI 智能控制'].map((label, i) => (
                                <label key={i} className="flex items-center p-3 rounded-lg border border-slate-200 bg-white cursor-pointer hover:border-primary/50 transition-colors">
                                    <input type="checkbox" defaultChecked className="form-checkbox h-5 w-5 text-primary rounded border-slate-300 focus:ring-primary/20" />
                                    <span className="ml-3 text-sm text-slate-700">{label}</span>
                                </label>
                            ))}
                            <label className="flex items-center p-3 rounded-lg border border-slate-200 bg-white cursor-pointer hover:border-primary/50 transition-colors col-span-2">
                                <input type="checkbox" defaultChecked className="form-checkbox h-5 w-5 text-primary rounded border-slate-300 focus:ring-primary/20" />
                                <span className="ml-3 text-sm text-slate-700 font-medium">全周期财务收益分析 (ROI/IRR)</span>
                            </label>
                        </div>
                    </div>

                    {/* Export Format */}
                    <div className="p-6 bg-white">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><span className="material-icons-round text-base">save_alt</span> 导出格式</h2>
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex gap-4">
                                {['table_view', 'picture_as_pdf', 'slideshow'].map((icon, i) => (
                                    <label key={i} className="cursor-pointer group">
                                        <input type="radio" name="format" className="peer sr-only" defaultChecked={i===0} />
                                        <div className={`w-16 h-16 rounded-lg border-2 border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-500 peer-checked:border-${i===0?'green':i===1?'red':'orange'}-500 peer-checked:bg-${i===0?'green':i===1?'red':'orange'}-50 peer-checked:text-${i===0?'green':i===1?'red':'orange'}-600 transition-all hover:border-slate-300`}>
                                            <span className="material-icons-round text-2xl">{icon}</span>
                                            <span className="text-[10px] font-bold">{i===0?'Excel':i===1?'PDF':'PPT'}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <button className="px-8 py-4 bg-primary hover:bg-primary-700 text-white rounded-lg shadow-lg shadow-primary/30 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5">
                                <span className="material-icons-round text-xl">auto_fix_high</span>
                                <span className="font-bold text-lg">生成并下载报告</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Recent Reports Sidebar */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <h2 className="font-bold text-slate-800">最近生成的报告</h2>
                <button className="text-xs text-primary font-medium">查看全部</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {[
                    {name: '上海中心_估值报告_V3.pdf', date: '今天 14:30', tag: '完整版', icon: 'picture_as_pdf', color: 'bg-red-50 text-red-500'},
                    {name: '财务测算表_20231024.xlsx', date: '昨天 09:15', tag: '财务专用', icon: 'table_view', color: 'bg-green-50 text-green-600'},
                    {name: '项目汇报PPT_初稿.pptx', date: '10月22日', tag: '演示用', icon: 'slideshow', color: 'bg-orange-50 text-orange-500'},
                ].map((item, i) => (
                    <div key={i} className="group flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                        <div className={`h-10 w-10 shrink-0 rounded ${item.color} flex items-center justify-center`}><span className="material-icons-round">{item.icon}</span></div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-slate-800 truncate">{item.name}</h4>
                            <p className="text-xs text-slate-400 mt-1">{item.date} · {item.tag}</p>
                        </div>
                        <button className="text-slate-400 hover:text-primary opacity-0 group-hover:opacity-100"><span className="material-icons-round">download</span></button>
                    </div>
                ))}
            </div>
            <div className="p-4 mt-auto">
                 <div className="bg-gradient-to-br from-primary to-blue-600 rounded-xl p-4 text-white relative overflow-hidden group cursor-pointer">
                     <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full group-hover:scale-125 transition-transform duration-500"></div>
                     <div className="relative z-10">
                         <div className="flex items-center gap-2 mb-2"><span className="material-icons-round text-lg">cloud_sync</span><span className="text-sm font-bold">云端存档</span></div>
                         <p className="text-xs text-blue-100 leading-relaxed mb-3">所有报告已自动备份至企业云盘，可随时追溯历史版本。</p>
                         <div className="w-full bg-blue-900/30 h-1.5 rounded-full overflow-hidden"><div className="bg-white/80 h-full w-3/4 rounded-full"></div></div>
                         <p className="text-[10px] text-blue-200 mt-1 text-right">已使用 75% 空间</p>
                     </div>
                 </div>
            </div>
        </div>
    </div>
  );
};

export default ReportCenter;