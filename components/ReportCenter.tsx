import React, { useState, useCallback, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { getEffectiveActiveModules } from '../utils/moduleAggregation';
import { exportProjectReport, exportSimplifiedReport, FinancialSummaryData } from '../utils/excelExport';
import { exportToWord } from '../utils/reportExport';
import OnePageReport from './OnePageReport';
import DetailedReport from './DetailedReport';
import { ESGScoreCard } from './ESGScoreCard';
import { buildCombinedReport, consumeRequestedReportModules, formatWan } from '../shared/reporting';
import { COPYRIGHT_RELEASE_FEATURES } from '../shared/config/productIdentity';

const isCopyrightReleaseModule = (moduleId: string) => {
  if (moduleId === 'retrofit-ai') return COPYRIGHT_RELEASE_FEATURES.artificialIntelligencePlatform;
  if (moduleId === 'retrofit-carbon') return COPYRIGHT_RELEASE_FEATURES.carbonTrading;
  if (moduleId === 'retrofit-vpp') return COPYRIGHT_RELEASE_FEATURES.realtimeVppDispatch;
  return true;
};

const ReportCenter: React.FC = () => {
  const { modules, projectBaseInfo, priceConfig, bills, transformers, exportProjectConfig } = useProject();
  const [isExporting, setIsExporting] = useState(false);
  const reportableModules = useMemo(
    () => getEffectiveActiveModules(modules).filter(module => isCopyrightReleaseModule(module.id)),
    [modules]
  );
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>(() => {
    const requested = consumeRequestedReportModules();
    const activeIds = getEffectiveActiveModules(modules)
      .filter(module => isCopyrightReleaseModule(module.id))
      .map(module => module.id);
    return requested?.length ? requested.filter(isCopyrightReleaseModule) : activeIds;
  });

  // 报告配置状态
  const [reportDetail, setReportDetail] = useState<'simple' | 'full'>('full');
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf' | 'word' | 'json'>('excel');
  const [showOnePage, setShowOnePage] = useState(false);
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const [autoPrintDetailedReport, setAutoPrintDetailedReport] = useState(false);
  const [selectedSections, setSelectedSections] = useState({
    baseInfo: true,
    priceConfig: true,
    modules: true,
    financial: true,
    charts: true,
  });

  const report = useMemo(() => buildCombinedReport({
    selectedModuleIds,
    modules,
    projectBaseInfo,
    priceConfig,
    bills,
    transformers,
    horizonYears: 25
  }), [selectedModuleIds, modules, projectBaseInfo, priceConfig, bills, transformers]);

  const toggleReportModule = useCallback((moduleId: string) => {
    setSelectedModuleIds(current => current.includes(moduleId)
      ? current.filter(id => id !== moduleId)
      : [...current, moduleId]);
  }, []);

  // 导出处理函数
  const handleExportReport = useCallback(() => {
    const activeModules = report.modules;

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
      isActive: true,
      strategy: `${m.strategy || '独立方案'} · ${m.investmentMode}`,
      investment: m.metrics.investment,
      yearlySaving: m.metrics.firstYearNetBenefit,
      roi: m.metrics.investment > 0 ? (m.metrics.firstYearNetBenefit / m.metrics.investment) * 100 : 0,
      irr: m.metrics.irr,
      payback: m.metrics.paybackPeriod,
      npv: m.metrics.npv,
      kpiPrimary: m.technicalMetrics[0] ? `${m.technicalMetrics[0].label}: ${m.technicalMetrics[0].value}` : '-',
      kpiSecondary: `投资方式: ${m.investmentMode}`,
    }));
    const printableModuleData = [
      ...moduleExportData,
      ...report.interactions.map(item => ({
        name: item.label,
        isActive: true,
        strategy: '物理联动增量（反事实场景差额）',
        investment: 0,
        yearlySaving: item.annualValue,
        roi: 0,
        irr: 0,
        payback: 0,
        npv: 0,
        kpiPrimary: '协同收益',
        kpiSecondary: '不作为独立资产重复投资'
      }))
    ];

    // 构建财务汇总数据
    const totalInvestment = report.systemMetrics.investment;
    const totalFirstYearSaving = report.combinedAnnualBenefit;

    let cumulativeCashFlow = 0;
    const annualData = report.systemMetrics.cashFlows.map((net, i) => {
      cumulativeCashFlow += net;
      return { year: i, net, cumulative: Number(cumulativeCashFlow.toFixed(3)) };
    });
    const financialData: FinancialSummaryData = {
      projectName: projectBaseInfo.name,
      projectType: projectBaseInfo.type,
      totalInvestment,
      totalFirstYearSaving,
      npv: report.systemMetrics.npv,
      irr: report.systemMetrics.irr,
      payback: report.systemMetrics.paybackPeriod,
      period: 25,
      discountRate: report.systemMetrics.discountRate * 100,
      modules: moduleExportData,
      annualData,
      interactions: report.interactions.map(item => ({ label: item.label, annualValue: item.annualValue })),
      participants: report.participantLedgers.map(ledger => ({
        name: ledger.name,
        investment: ledger.investment,
        firstYearNetBenefit: ledger.firstYearNetBenefit,
        npv: ledger.metrics.npv,
        irr: ledger.metrics.irr,
        payback: ledger.metrics.paybackPeriod
      })),
      assumptions: [...report.assumptions, ...report.warnings],
      moduleDetails: report.modules.map(item => ({
        moduleId: item.moduleId,
        name: item.name,
        investmentMode: item.investmentMode,
        investment: item.metrics.investment,
        firstYearNetBenefit: item.metrics.firstYearNetBenefit,
        npv: item.metrics.npv,
        irr: item.metrics.irr,
        payback: item.metrics.paybackPeriod,
        cashFlows: item.metrics.cashFlows,
        technicalMetrics: item.technicalMetrics,
        assumptions: item.assumptions,
        warnings: item.warnings,
      }))
    };

    // 根据导出格式执行不同操作
    try {
      switch (exportFormat) {
        case 'excel':
          if (reportDetail === 'simple') {
            exportSimplifiedReport(projectBaseInfo.name, printableModuleData as any, totalInvestment, totalFirstYearSaving);
          } else {
            exportProjectReport({ ...projectBaseInfo, transformers }, financialData, selectedSections as any);
          }
          break;

        case 'pdf':
          setAutoPrintDetailedReport(true);
          setShowDetailedReport(true);
          break;

        case 'word':
          exportToWord({
            projectInfo: projectBaseInfo,
            modules: printableModuleData,
            financial: financialData
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
  }, [report, projectBaseInfo, transformers, reportDetail, selectedSections, exportFormat, exportProjectConfig]);

  return (
    <div className="flex h-full print:h-auto print:block">
      <div className="flex-1 p-8 overflow-y-auto print:overflow-visible print:h-auto print:p-0 bg-slate-50 print:bg-white">
        <div className="max-w-4xl mx-auto space-y-6 print:hidden">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">报告导出中心</h1>
            <p className="text-slate-500">根据当前测算结果生成专业的项目评估报告，支持多种格式。</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-800">选择汇报板块</h2>
                <p className="text-xs text-slate-500 mt-1">单选生成独立板块报告，多选生成联合报告并自动识别物理联动。</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${report.dataQuality === 'measured' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {report.dataQuality === 'measured' ? '实测/精确数据' : '包含估算数据'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {reportableModules.map(module => {
                const checked = selectedModuleIds.includes(module.id);
                const reportModule = report.modules.find(item => item.moduleId === module.id);
                return (
                  <button key={module.id} onClick={() => toggleReportModule(module.id)} className={`text-left p-3 rounded-lg border-2 transition-all ${checked ? 'border-primary bg-primary/5' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-800">{module.name}</span>
                      <span className={`material-icons text-lg ${checked ? 'text-primary' : 'text-slate-300'}`}>{checked ? 'check_circle' : 'radio_button_unchecked'}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">{module.kpiPrimary?.label}: {module.kpiPrimary?.value}</div>
                    {reportModule && <div className="text-[10px] text-primary mt-1 font-medium">{reportModule.investmentMode}</div>}
                  </button>
                );
              })}
            </div>
            {report.relationshipLabels.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                <div className="text-xs font-bold text-indigo-800 mb-2">已识别联动关系</div>
                <div className="flex flex-wrap gap-2">{report.relationshipLabels.map(label => <span key={label} className="text-[11px] text-indigo-700 bg-white border border-indigo-100 px-2.5 py-1 rounded-full">{label}</span>)}</div>
              </div>
            )}
            {report.warnings.map(warning => <div key={warning} className="mt-3 text-xs text-amber-700 flex items-start gap-2"><span className="material-icons text-sm">warning</span><span>{warning}</span></div>)}
          </div>

          {selectedModuleIds.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-[10px] text-slate-400 font-bold uppercase">系统总投资</div><div className="text-lg font-black text-slate-800 mt-1">{formatWan(report.systemMetrics.investment)}</div></div>
              <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-[10px] text-slate-400 font-bold uppercase">独立收益合计</div><div className="text-lg font-black text-slate-800 mt-1">{formatWan(report.standaloneAnnualBenefit)}</div></div>
              <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4"><div className="text-[10px] text-indigo-500 font-bold uppercase">联动增量收益</div><div className={`text-lg font-black mt-1 ${report.interactionAnnualBenefit >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>{formatWan(report.interactionAnnualBenefit)}</div></div>
              <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4"><div className="text-[10px] text-emerald-600 font-bold uppercase">联合首年收益</div><div className="text-lg font-black text-emerald-700 mt-1">{formatWan(report.combinedAnnualBenefit)}</div></div>
            </div>
          )}

          {report.participantLedgers.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-base font-bold text-slate-800">参与方收益账本</h2>
              <p className="text-xs text-slate-500 mt-1 mb-4">内部结算在系统合并账中抵消，下表展示合同分配后的各方回报。</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.participantLedgers.map(ledger => <div key={ledger.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4"><div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-800">{ledger.name}</span><span className="text-xs font-bold text-purple-600">IRR {ledger.metrics.irr.toFixed(2)}%</span></div><div className="grid grid-cols-3 gap-2 mt-3 text-xs"><div><span className="text-slate-400 block">承担投资</span><strong className="text-slate-700">{formatWan(ledger.investment)}</strong></div><div><span className="text-slate-400 block">首年净收益</span><strong className="text-emerald-600">{formatWan(ledger.firstYearNetBenefit)}</strong></div><div><span className="text-slate-400 block">NPV</span><strong className={ledger.metrics.npv >= 0 ? 'text-emerald-600' : 'text-red-500'}>{formatWan(ledger.metrics.npv)}</strong></div></div></div>)}
              </div>
            </div>
          )}

          {/* ESG Dashboard */}
          {COPYRIGHT_RELEASE_FEATURES.carbonTrading && <ESGScoreCard />}

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
                  disabled={isExporting || selectedModuleIds.length === 0}
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
      <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 print:hidden">
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
      {showOnePage && <OnePageReport onClose={() => setShowOnePage(false)} report={report} />}
      {showDetailedReport && <DetailedReport onClose={() => { setShowDetailedReport(false); setAutoPrintDetailedReport(false); }} report={report} autoPrint={autoPrintDetailedReport} />}
    </div>
  );
};

export default ReportCenter;
