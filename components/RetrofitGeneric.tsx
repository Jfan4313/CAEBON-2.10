import React from 'react';

interface RetrofitGenericProps {
  title: string;
  icon: string;
  description: string;
}

const RetrofitGeneric: React.FC<RetrofitGenericProps> = ({ title, icon, description }) => {
  return (
    <div className="flex h-full flex-col bg-slate-50 relative">
      <div className="flex-1 overflow-y-auto pb-32">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shrink-0">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <span className="material-symbols-outlined">{icon}</span>
                </div>
                {title}
            </h2>
        </header>
        
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[calc(100vh-8rem)]">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl text-slate-400">{icon}</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">{title} 模块配置</h3>
            <p className="text-slate-500 max-w-md mb-8">{description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-start hover:shadow-md transition-shadow cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-primary flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined">auto_fix_high</span>
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1">智能方案生成</h4>
                    <p className="text-sm text-slate-500 text-left">根据项目基准能耗数据，自动匹配最佳{title}设备与策略。</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-start hover:shadow-md transition-shadow cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined">tune</span>
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1">手动参数配置</h4>
                    <p className="text-sm text-slate-500 text-left">自定义设备型号、数量、运行策略与投资成本参数。</p>
                </div>
            </div>
            
            <div className="mt-12 p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-700 flex items-center gap-2">
                <span className="material-symbols-outlined">engineering</span>
                <span>该模块功能正在开发中，当前仅提供演示预览。</span>
            </div>
        </div>
      </div>

      {/* Unified Sticky Footer */}
      <div className="fixed bottom-0 left-64 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 px-8 z-40 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400">
                    <span className="material-symbols-outlined text-[18px]">history</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">上次保存</span>
                    <span className="text-[10px] text-slate-400 font-medium">--</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button className="px-6 py-2.5 text-sm font-semibold rounded-xl text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all">重置</button>
                <button className="px-8 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all flex items-center gap-2">
                    保存配置 <span className="material-symbols-outlined text-[18px]">save</span>
                </button>
            </div>
        </div>
    </div>
  );
};

export default RetrofitGeneric;