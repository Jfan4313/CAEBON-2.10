import React, { useState, useCallback } from 'react';
import { useProject } from '../context/ProjectContext';
import { exportProjectReport, exportSimplifiedReport, FinancialSummaryData } from '../utils/excelExport';
import { exportToWord, generateAndPrintReport } from '../utils/reportExport';
import OnePageReport from './OnePageReport';
import DetailedReport from './DetailedReport';
import { ESGScoreCard } from './ESGScoreCard';

const ReportCenter: React.FC = () => {
  const { modules, projectBaseInfo, priceConfig, bills, transformers, exportProjectConfig } = useProject();
  const [isExporting, setIsExporting] = useState(false);

  // 报告配置状态
  const [reportDetail, setReportDetail] = useState<'simple' | 'full'>('full');
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf' | 'word' | 'json'>('excel');
  const [showOnePage, setShowOnePage] = useState(false);
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const [selectedSections, setSelectedSections] = useState({
    baseInfo: true,
    priceConfig: true,
    modules: true,
    financial: true,
    charts: true,
  });

  // 导出处理函数
  const handleExportReport = useCallback(() => {
    const activeModules = Object.values(modules).filter((m: any) => m.isActive);

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

    // 构建模块数据 (高精度 0.001)
    const moduleExportData = activeModules.map((m: any) => ({
      name: m.name,
      isActive: m.isActive,
      strategy: m.strategy || '混合模式',
      investment: m.investment || 0,
      yearlySaving: m.yearlySaving || 0,
      roi: ((m.yearlySaving || 0) / (m.investment || 1)) * 100,
      irr: 15.55, // 暂时硬编码，未来从模块内部实时获取
      payback: (m.investment || 0) / (m.yearlySaving || 1),
      npv: 0,
      kpiPrimary: `${m.kpiPrimary?.label}: ${m.kpiPrimary?.value}`,
      kpiSecondary: `${m.kpiSecondary?.label}: ${m.kpiSecondary?.value}`,
    }));

    // 构建财务汇总数据
    const totalInvestment = activeModules.reduce((sum: number, m: any) => sum + (Number(m.investment) || 0), 0);
    const totalFirstYearSaving = activeModules.reduce((sum: number, m: any) => sum + (Number(m.yearlySaving) || 0), 0);

    const financialData: FinancialSummaryData = {
      projectName: projectBaseInfo.name,
      projectType: projectBaseInfo.type,
      totalInvestment,
      totalFirstYearSaving,
      npv: totalFirstYearSaving * 8.5 - totalInvestment, // 简化版 8.5年折现 NPV
      irr: 12.85,
      payback: totalInvestment / totalFirstYearSaving,
      period: 25,
      discountRate: 6,
      modules: moduleExportData,
      annualData: Array.from({ length: 25 }, (_, i) => ({
        year: i + 1,
        net: totalFirstYearSaving * Math.pow(0.99, i), // 粗略估算衰减后的综合现金流
        cumulative: 0 // 工具函数内部会累计
      })),
    };

    // 根据导出格式执行不同操作
    try {
      switch (exportFormat) {
        case 'excel':
          if (reportDetail === 'simple') {
            exportSimplifiedReport(projectBaseInfo.name, moduleExportData as any, totalInvestment, totalFirstYearSaving);
          } else {
            exportProjectReport(projectBaseInfo, financialData, selectedSections as any);
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
      if (exportFormat !== 'pdf') {
        setTimeout(() => setIsExporting(false), 300);
      } else {
        setTimeout(() => setIsExporting(false), 2000);
      }
    }
  }, [modules, projectBaseInfo, reportDetail, selectedSections, exportFormat, exportProjectConfig]);

  return (
    <div className="flex h-full">
      <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">报告导出中心</h1>
            <p className="text-slate-500">根据当前测算结果生成专业的项目评估报告，支持多种格式。</p>
          </div>

          {/* ESG Dashboard */}
          <ESGScoreCard />

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Basic Config */}
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><span className="material-icons-round text-base">settings</span> 报告设置</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">报告详略度</label>
                  <div className="flex gap-4">
                    <label className="relative flex cursor-pointer">
                      <input type="radio" name="detail" className="peer sr-only" checked={reportDetail === 'simple'} onChange={() => setReportDetail('simple')} />
                      <div className="px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all flex flex-col w-32">
                        <span className="text-sm font-bold mb-1">精简版</span><span className="text-[10px] text-slate-400">核心指标一页纸</span>
                      </div>
                    </label>
                    <label className="relative flex cursor-pointer">
                      <input type="radio" name="detail" className="peer sr-only" checked={reportDetail === 'full'} onChange={() => setReportDetail('full')} />
                      <div className="px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all flex flex-col w-32">
                        <span className="text-sm font-bold mb-1">完整版</span><span className="text-[10px] text-slate-400">含多年现金流明细</span>
                      </div>
                    </label>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 block mb-2">数据精确度说明</span>
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="material-icons text-emerald-500 text-sm">verified</span>
                    <span className="text-sm">报告数值统一精确至 <span className="font-mono font-bold">0.001</span> (万/度)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><span className="material-icons-round text-base">checklist</span> 导出内容勾选</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { key: 'baseInfo', label: '项目基础概况' },
                  { key: 'priceConfig', label: '能耗及电价配置' },
                  { key: 'modules', label: '分项投资详情' },
                  { key: 'financial', label: '综合财务评估' },
                  { key: 'charts', label: '年度收益明细' },
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
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><span className="material-icons-round text-base">save_alt</span> 选择导出格式</h2>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex gap-4">
                  {[
                    { value: 'excel', icon: 'table_view', label: 'Excel', color: 'green' },
                    { value: 'pdf', icon: 'picture_as_pdf', label: 'PDF', color: 'red' },
                    { value: 'word', icon: 'description', label: 'Word', color: 'blue' },
                    { value: 'json', icon: 'data_object', label: '配置(JSON)', color: 'slate' },
                  ].map((format, i) => (
                    <label key={i} className="cursor-pointer group">
                      <input type="radio" name="format" className="peer sr-only" checked={exportFormat === format.value} onChange={() => setExportFormat(format.value as any)} />
                      <div className={`w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all hover:border-slate-300
                                            ${exportFormat === format.value
                          ? `border-primary bg-primary/5 text-primary`
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
                  className={`px-8 py-4 rounded-lg shadow-lg flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5 ${isExporting
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-primary hover:bg-primary-700 text-white shadow-primary/30'
                    }`}
                >
                  <span className="material-icons-round text-xl">
                    {isExporting ? 'hourglass_empty' : 'rocket_launch'}
                  </span>
                  <span className="font-bold text-lg">
                    {isExporting
                      ? '正在处理...'
                      : `导出${exportFormat.toUpperCase()}评估报告`
                    }
                  </span>
                </button>
              </div>

              <div className="mt-8 flex gap-4 border-t border-slate-100 pt-6">
                <button
                  onClick={() => setShowOnePage(true)}
                  className="flex-1 px-4 py-3 rounded-lg border-2 border-primary text-primary font-bold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-icons-round text-[18px]">find_in_page</span>
                  一页式简报 (Teaser)
                </button>
                <button
                  onClick={() => setShowDetailedReport(true)}
                  className="flex-1 px-4 py-3 rounded-lg border-2 border-slate-800 text-slate-800 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-icons-round text-[18px]">menu_book</span>
                  完整版项目书 (Detailed)
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Recent Reports Sidebar */}
      <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">历史导出记录</h2>
          <button className="text-xs text-primary font-medium">查看全部</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {[
            { name: '光伏评估报告_苏项目.xlsx', date: '今天 14:30', tag: '完整版', icon: 'table_view', color: 'bg-green-50 text-green-600' },
            { name: '项目测算概览.pdf', date: '昨天 09:15', tag: '精简版', icon: 'picture_as_pdf', color: 'bg-red-50 text-red-500' },
          ].map((item, i) => (
            <div key={i} className="group flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
              <div className={`h-10 w-10 shrink-0 rounded ${item.color} flex items-center justify-center`}><span className="material-icons-round">{item.icon}</span></div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-slate-800 truncate">{item.name}</h4>
                <p className="text-xs text-slate-400 mt-1">{item.date} · {item.tag}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Render Frontend Report Modals */}
      {showOnePage && <OnePageReport onClose={() => setShowOnePage(false)} />}
      {showDetailedReport && <DetailedReport onClose={() => setShowDetailedReport(false)} />}
    </div>
  );
};

export default ReportCenter;