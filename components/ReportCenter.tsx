import React, { useState, useCallback } from 'react';
import { useProject } from '../context/ProjectContext';
import { exportProjectReport, exportSimplifiedReport, FinancialSummaryData } from '../utils/excelExport';
import { exportToWord, generateAndPrintReport } from '../utils/reportExport';

const ReportCenter: React.FC = () => {
  const { modules, projectBaseInfo, priceConfig, bills, transformers, exportProjectConfig } = useProject();
  const [isExporting, setIsExporting] = useState(false);

  // 报告配置状态
  const [reportLanguage, setReportLanguage] = useState<'zh' | 'en'>('zh');
  const [reportDetail, setReportDetail] = useState<'simple' | 'full'>('simple');
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf' | 'ppt' | 'json'>('excel');
  const [selectedSections, setSelectedSections] = useState({
    baseInfo: true,
    priceConfig: true,
    modules: true,
    financial: true,
    charts: true,
  });

  // 导出处理函数
  const handleExportReport = useCallback(() => {
    const activeModules = Object.values(modules).filter(m => m.isActive);

    // 边界条件检查
    if (activeModules.length === 0) {
      alert('请先启用至少一个改造模块');
      return;
    }

    setIsExporting(true);

    // 特殊处理：JSON 导出（直接导出完整配置）
    if (exportFormat === 'json') {
      try {
        exportProjectConfig(`${projectBaseInfo.name}_config`);
      } catch (error) {
        console.error('JSON 导出失败:', error);
        alert('JSON 导出失败，请重试');
      } finally {
        setTimeout(() => setIsExporting(false), 100);
      }
      return;
    }

    // 构建模块数据
    const moduleExportData = activeModules.map(m => ({
      name: m.name,
      isActive: m.isActive,
      strategy: m.strategy,
      investment: m.investment,
      yearlySaving: m.yearlySaving,
      roi: (m.yearlySaving / m.investment) * 100,
      irr: 15,
      payback: m.investment / m.yearlySaving,
      npv: 0,
      kpiPrimary: `${m.kpiPrimary.label}: ${m.kpiPrimary.value}`,
      kpiSecondary: `${m.kpiSecondary.label}: ${m.kpiSecondary.value}`,
    }));

    // 构建财务汇总数据
    const totalInvestment = activeModules.reduce((sum, m) => sum + m.investment, 0);
    const totalFirstYearSaving = activeModules.reduce((sum, m) => sum + m.yearlySaving, 0);

    const financialData: FinancialSummaryData = {
      projectName: projectBaseInfo.name,
      projectType: projectBaseInfo.type,
      totalInvestment,
      totalFirstYearSaving,
      npv: totalFirstYearSaving * 10 - totalInvestment, // 简化计算
      irr: 15,
      payback: totalInvestment / totalFirstYearSaving,
      period: 20,
      discountRate: 5,
      modules: moduleExportData,
      annualData: [],
    };

    // 根据导出格式执行不同操作
    try {
      switch (exportFormat) {
        case 'excel':
          if (reportDetail === 'simple') {
            exportSimplifiedReport(projectBaseInfo.name, moduleExportData, totalInvestment, totalFirstYearSaving);
          } else {
            exportProjectReport(projectBaseInfo, financialData, selectedSections);
          }
          break;

        case 'pdf':
          generateAndPrintReport({
            projectInfo: projectBaseInfo,
            modules: moduleExportData,
            financial: {
              totalInvestment: financialData.totalInvestment,
              npv: financialData.npv,
              irr: financialData.irr,
              payback: financialData.payback,
            }
          });
          break;

        case 'word':
          exportToWord({
            projectInfo: projectBaseInfo,
            modules: moduleExportData,
            financial: {
              totalInvestment: financialData.totalInvestment,
              npv: financialData.npv,
              irr: financialData.irr,
              payback: financialData.payback,
            }
          });
          break;
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      // 对于同步的导出操作，立即重置状态
      // 对于PDF（打印），需要在用户关闭对话框后重置
      if (exportFormat !== 'pdf') {
        setTimeout(() => setIsExporting(false), 100);
      } else {
        // PDF打印需要等待用户操作
        setTimeout(() => setIsExporting(false), 2000);
      }
    }
  }, [modules, projectBaseInfo, reportDetail, selectedSections, exportFormat, exportProjectConfig]);
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
                                    <button
                                        onClick={() => setReportLanguage('zh')}
                                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${reportLanguage === 'zh' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        中文 (Chinese)
                                    </button>
                                    <button
                                        onClick={() => setReportLanguage('en')}
                                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${reportLanguage === 'en' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        英文 (English)
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-3">报告详略</label>
                                <div className="flex gap-4">
                                    <label className="relative flex cursor-pointer">
                                        <input type="radio" name="detail" className="peer sr-only" checked={reportDetail === 'simple'} onChange={() => setReportDetail('simple')} />
                                        <div className="px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all flex flex-col w-32">
                                            <span className="text-sm font-bold mb-1">精简版</span><span className="text-xs text-slate-400">核心指标概览</span>
                                        </div>
                                    </label>
                                    <label className="relative flex cursor-pointer">
                                        <input type="radio" name="detail" className="peer sr-only" checked={reportDetail === 'full'} onChange={() => setReportDetail('full')} />
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
                            {[
                                { key: 'baseInfo', label: '建筑基本信息' },
                                { key: 'priceConfig', label: '基准能耗分析' },
                                { key: 'modules', label: '电价模型参数' },
                                { key: 'financial', label: '光伏发电系统' },
                                { key: 'charts', label: '储能系统配置' },
                            ].map((item, i) => (
                                <label key={i} className="flex items-center p-3 rounded-lg border border-slate-200 bg-white cursor-pointer hover:border-primary/50 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selectedSections[item.key as keyof typeof selectedSections]}
                                        onChange={(e) => setSelectedSections(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                        className="form-checkbox h-5 w-5 text-primary rounded border-slate-300 focus:ring-primary/20"
                                    />
                                    <span className="ml-3 text-sm text-slate-700">{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Export Format */}
                    <div className="p-6 bg-white">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><span className="material-icons-round text-base">save_alt</span> 导出格式</h2>
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex gap-4">
                                {[
                                    { value: 'excel', icon: 'table_view', label: 'Excel', color: 'green' },
                                    { value: 'pdf', icon: 'picture_as_pdf', label: 'PDF', color: 'red' },
                                    { value: 'word', icon: 'description', label: 'Word', color: 'blue' },
                                    { value: 'json', icon: 'data_object', label: 'JSON', color: 'orange' },
                                ].map((format, i) => (
                                    <label key={i} className="cursor-pointer group">
                                        <input type="radio" name="format" className="peer sr-only" checked={exportFormat === format.value} onChange={() => setExportFormat(format.value as any)} />
                                        <div className={`w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all hover:border-slate-300
                                            ${exportFormat === format.value
                                                ? `border-${format.color}-500 bg-${format.color}-50 text-${format.color}-600`
                                                : 'border-slate-200 text-slate-500'}`}>
                                            <span className="material-icons-round text-2xl">{format.icon}</span>
                                            <span className="text-[10px] font-bold">{format.label}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <button
                                onClick={handleExportReport}
                                disabled={isExporting}
                                className={`px-8 py-4 rounded-lg shadow-lg flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5 ${
                                    isExporting
                                        ? 'bg-slate-400 cursor-not-allowed'
                                        : 'bg-primary hover:bg-primary-700 text-white shadow-primary/30'
                                }`}
                            >
                                <span className="material-icons-round text-xl">
                                    {isExporting ? 'hourglass_empty' : 'auto_fix_high'}
                                </span>
                                <span className="font-bold text-lg">
                                    {isExporting
                                        ? '正在生成...'
                                        : exportFormat === 'json'
                                            ? '导出项目配置'
                                            : `生成${exportFormat === 'excel' ? '并下载' : exportFormat === 'pdf' ? '并打印' : '并下载'}${exportFormat.toUpperCase()}报告`
                                    }
                                </span>
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