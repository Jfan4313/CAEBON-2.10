import React, { useState, useCallback, useMemo, memo } from 'react';
import { useProject } from '../context/ProjectContext';
import { projectStorageService } from '../services/projectStorage';
import { ProjectFullData } from '../types/projectStorage';
import ProjectManager from './ProjectManager';

const data = [
  { name: '1月', base: 60, current: 40 },
  { name: '2月', base: 70, current: 55 },
  { name: '3月', base: 50, current: 35 },
  { name: '4月', base: 85, current: 70 },
  { name: '5月', base: 60, current: 45 },
  { name: '6月', base: 90, current: 80 },
  { name: '7月', base: 80, current: 65 },
  { name: '8月', base: 75, current: 60 },
  { name: '9月', base: 65, current: 50 },
  { name: '10月', base: 80, current: 65 },
  { name: '11月', base: 85, current: 70 },
  { name: '12月', base: 90, current: 75 },
];

const Dashboard: React.FC = () => {
  const { projectBaseInfo, importProjectConfig, exportProjectConfig, quickSaveProject, notification } = useProject();
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({ base: true, current: true });
  const [showQuickSaveDialog, setShowQuickSaveDialog] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState('');
  const [projectDescriptionInput, setProjectDescriptionInput] = useState('');
  const [isQuickSaving, setIsQuickSaving] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const toggleSeries = useCallback((dataKey: 'base' | 'current') => {
    setVisibleSeries(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  }, []);

  // 导入项目配置
  const handleImportProject = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await projectStorageService.importProjectConfig(file);

    if (result.valid && result.data) {
      importProjectConfig(result.data);
    } else {
      alert('导入失败：' + result.errors.join('\n'));
      if (result.warnings.length > 0) {
        console.warn('导入警告：', result.warnings);
      }
    }

    // 重置文件输入
    e.target.value = '';
  }, [importProjectConfig]);

  // 快速保存项目
  const handleQuickSave = useCallback(() => {
    setProjectNameInput(projectBaseInfo.name || '未命名项目');
    setProjectDescriptionInput('');
    setShowQuickSaveDialog(true);
  }, [projectBaseInfo.name]);

  const handleQuickSaveConfirm = useCallback(async () => {
    const name = projectNameInput.trim() || '未命名项目';
    setIsQuickSaving(true);
    try {
      await quickSaveProject(name, projectDescriptionInput.trim() || undefined);
      setShowQuickSaveDialog(false);
    } catch {
      // 保存失败时保留弹窗和用户输入，便于直接重试。
    } finally {
      setIsQuickSaving(false);
    }
  }, [projectNameInput, projectDescriptionInput, quickSaveProject]);

  // Memoize metrics data to prevent recreation on each render
  const metricsData = useMemo(() => [
    {
      title: '内部收益率 (IRR)',
      value: '12.4%',
      icon: 'trending_up',
      change: '+2.1%',
      sub: '较基准值',
      color: 'text-slate-800',
    },
    {
      title: 'ROI (10年)',
      value: '145%',
      icon: 'verified',
      change: '+3.4%',
      sub: '优于平均',
      color: 'text-slate-800',
    },
    {
      title: '预估总投资额',
      value: '¥120万',
      icon: 'account_balance_wallet',
      sub: '自有资金 80%',
      color: 'text-slate-800',
      extra: (
         <div className="relative w-10 h-10 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4"></path>
              <path className="text-amber-400" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="currentColor" strokeDasharray="80, 100" strokeWidth="4"></path>
            </svg>
         </div>
      )
    },
    {
      title: '预估碳减排量 (吨/年)',
      value: '450',
      icon: 'forest',
      sub: '目标达成 90%',
      color: 'text-slate-800',
      extra: (
          <div className="relative w-10 h-10 flex items-center justify-center">
             <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
               <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4"></path>
               <path className="text-primary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="currentColor" strokeDasharray="90, 100" strokeWidth="4"></path>
             </svg>
          </div>
       )
    },
  ], []);

  // Memoize table data to prevent recreation on each render
  const tableData = useMemo(() => [
    {type: '光伏组件', code: 'PV', codeColor: 'bg-green-100 text-green-600', loc: '1号厂房屋顶', date: '2026.08', status: '已测算', statusColor: 'bg-green-100 text-green-700', save: '￥2,100'},
    {type: '储能系统', code: 'ES', codeColor: 'bg-purple-100 text-purple-600', loc: '配电房', date: '2026.08', status: '已测算', statusColor: 'bg-green-100 text-green-700', save: '￥900'},
    {type: '照明改造', code: 'L', codeColor: 'bg-yellow-100 text-yellow-600', loc: '园区公共区', date: '2026.08', status: '已测算', statusColor: 'bg-green-100 text-green-700', save: '￥540'},
    {type: '空调优化', code: 'AC', codeColor: 'bg-cyan-100 text-cyan-600', loc: '综合办公楼', date: '2026.08', status: '已测算', statusColor: 'bg-green-100 text-green-700', save: '￥1,200'},
    {type: '充电设施', code: 'EV', codeColor: 'bg-blue-100 text-blue-600', loc: '园区停车区', date: '2026.08', status: '已测算', statusColor: 'bg-green-100 text-green-700', save: '￥680'},
  ], []);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* 项目导入导出工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-800">仪表盘</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProjectManager(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium"
            title="管理已保存的项目"
          >
            <span className="material-symbols-outlined text-[18px]">folder</span>
            项目管理
          </button>
          <button
            onClick={handleQuickSave}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            快速保存
          </button>
          <button
            onClick={() => exportProjectConfig()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            导出配置
          </button>
          <button
            onClick={handleImportProject}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            <span className="material-symbols-outlined text-[18px]">upload</span>
            导入配置
          </button>
        </div>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* 快速保存对话框 */}
      {showQuickSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-4">保存项目</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">项目名称</label>
                <input
                  type="text"
                  value={projectNameInput}
                  onChange={(e) => setProjectNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="输入项目名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">项目描述（可选）</label>
                <textarea
                  value={projectDescriptionInput}
                  onChange={(e) => setProjectDescriptionInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 h-20 resize-none"
                  placeholder="输入项目描述..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowQuickSaveDialog(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleQuickSaveConfirm}
                disabled={isQuickSaving}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isQuickSaving ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricsData.map((item, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start z-10">
              <div>
                <p className="text-xs font-medium text-slate-500">{item.title}</p>
                <h3 className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</h3>
              </div>
              {!item.extra ? (
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  </div>
              ) : item.extra}
            </div>
            <div className="flex items-center gap-2 mt-4 z-10">
              {item.change && (
                <span className="flex items-center text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md">
                  <span className="material-symbols-outlined text-[12px] mr-0.5">north</span>
                  {item.change}
                </span>
              )}
               {item.sub && <span className="text-[10px] text-slate-400">{item.sub}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Main Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-96">
        <div className="lg:col-span-2 min-w-0 min-h-0 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
             <div>
                 <h3 className="text-base font-bold text-slate-800">能源节省预测分析</h3>
                 <p className="text-xs text-slate-400">点击图例可隐藏或显示系列</p>
             </div>
             <button className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg text-xs font-medium text-slate-600">
                年度 <span className="material-symbols-outlined text-[14px]">expand_more</span>
             </button>
          </div>
          <div className="flex items-center justify-center gap-5 mb-3 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => toggleSeries('base')}
              className={`flex items-center gap-1.5 ${visibleSeries.base ? 'text-slate-600' : 'text-slate-300'}`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              基准能耗 (Baseline)
            </button>
            <button
              type="button"
              onClick={() => toggleSeries('current')}
              className={`flex items-center gap-1.5 ${visibleSeries.current ? 'text-slate-600' : 'text-slate-300'}`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              改造后能耗 (Predicted)
            </button>
          </div>
          <div className="relative flex-1 w-full min-w-0 min-h-[220px] border-b border-slate-200">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[100, 75, 50, 25, 0].map(value => (
                <div key={value} className="flex items-center gap-2">
                  <span className="w-6 text-right text-[9px] text-slate-400">{value}</span>
                  <span className="flex-1 border-t border-dashed border-slate-100" />
                </div>
              ))}
            </div>
            <div className="absolute inset-y-0 left-8 right-0 flex items-end justify-around gap-1 pt-3">
              {data.map(item => (
                <div key={item.name} className="group flex-1 h-full min-w-0 flex flex-col items-center justify-end">
                  <div className="relative flex-1 w-full flex items-end justify-center gap-0.5">
                    {visibleSeries.base && (
                      <div
                        className="w-[34%] max-w-4 rounded-t bg-slate-300 transition-all"
                        style={{ height: `${item.base}%` }}
                        title={`${item.name} 基准能耗：${item.base}`}
                      />
                    )}
                    {visibleSeries.current && (
                      <div
                        className="w-[34%] max-w-4 rounded-t bg-indigo-500 transition-all"
                        style={{ height: `${item.current}%` }}
                        title={`${item.name} 改造后能耗：${item.current}`}
                      />
                    )}
                  </div>
                  <span className="h-5 mt-1 text-[9px] text-slate-400 whitespace-nowrap">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 h-full overflow-y-auto">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center flex-1">
                <div className="flex justify-between items-start mb-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                        <span className="material-symbols-outlined text-[24px]">savings</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full border border-purple-200 text-purple-600 text-[10px] font-bold">+12%</span>
                </div>
                <p className="text-xs text-slate-500">预计年化收益</p>
                <h3 className="text-xl font-bold text-slate-800 mt-1">¥45,000.00</h3>
                <p className="text-[10px] text-slate-400 mt-1">基于保守模型</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center flex-1">
                <div className="flex justify-between items-start mb-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                        <span className="material-symbols-outlined text-[24px]">calculate</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full border border-green-200 text-green-600 text-[10px] font-bold">NP</span>
                </div>
                <p className="text-xs text-slate-500">净现值 (NPV)</p>
                <h3 className="text-xl font-bold text-slate-800 mt-1">¥185,256.00</h3>
                <p className="text-[10px] text-slate-400 mt-1">折现率 5%</p>
            </div>
        </div>
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mt-6">
         <div className="flex justify-between items-center mb-4">
             <h3 className="text-base font-bold text-slate-800">改造模块效益明细</h3>
             <button className="text-slate-400 hover:text-primary"><span className="material-symbols-outlined">refresh</span></button>
         </div>
         <div className="overflow-x-auto">
             <table className="w-full text-left text-xs">
                 <thead>
                     <tr className="text-slate-400 border-b border-slate-100">
                         <th className="font-medium py-2">技术类型</th>
                         <th className="font-medium py-2">实施地点</th>
                         <th className="font-medium py-2">预估完工</th>
                         <th className="font-medium py-2">评估状态</th>
                         <th className="font-medium py-2 text-right">预估节省 (月)</th>
                     </tr>
                 </thead>
                 <tbody className="text-slate-700">
                     {tableData.map((row, i) => (
                         <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                             <td className="py-3 flex items-center gap-2">
                                 <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${row.codeColor}`}>{row.code}</div>
                                 <span className="font-medium">{row.type}</span>
                             </td>
                             <td className="py-3 text-slate-500">{row.loc}</td>
                             <td className="py-3 text-slate-500">{row.date}</td>
                             <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${row.statusColor}`}>{row.status}</span></td>
                             <td className="py-3 text-right font-medium">{row.save}</td>
                         </tr>
                     ))}
                 </tbody>
             </table>
         </div>
      </div>

      {/* 项目管理对话框 */}
      {showProjectManager && (
        <ProjectManager onClose={() => setShowProjectManager(false)} />
      )}
    </div>
  );
};

export default Dashboard;
