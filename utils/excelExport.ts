/**
 * Excel导出工具函数
 * 用于导出财务测算表和项目报告
 */

import * as XLSX from 'xlsx';

function formatLocalDateCompact(date = new Date()): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('');
}

// ==================== 类型定义 ====================

export interface FinancialSummaryData {
  projectName: string;
  projectType: string;
  totalInvestment: number;
  totalFirstYearSaving: number;
  npv: number;
  irr: number;
  payback: number;
  period: number;
  discountRate: number;
  modules: ModuleExportData[];
  annualData: AnnualCashFlowData[];
  interactions?: Array<{ label: string; annualValue: number }>;
  participants?: Array<{ name: string; investment: number; firstYearNetBenefit: number; npv: number; irr: number; payback: number }>;
  assumptions?: string[];
  moduleDetails?: Array<{
    moduleId: string;
    name: string;
    investmentMode: string;
    investment: number;
    firstYearNetBenefit: number;
    npv: number;
    irr: number;
    payback: number;
    cashFlows: number[];
    technicalMetrics: Array<{ label: string; value: string }>;
    assumptions: string[];
    warnings: string[];
  }>;
}

export interface ModuleExportData {
  name: string;
  isActive: boolean;
  strategy: string;
  investment: number;
  yearlySaving: number;
  roi: number;
  irr: number;
  payback: number;
  npv: number;
  kpiPrimary: string;
  kpiSecondary: string;
}

export interface AnnualCashFlowData {
  year: number;
  net: number;
  cumulative: number;
}

export interface ProjectExportOptions {
  includeBaseInfo?: boolean;
  includePriceConfig?: boolean;
  includeModules?: boolean;
  includeFinancial?: boolean;
  includeCharts?: boolean;
}

// ==================== Excel导出核心函数 ====================

/**
 * 导出财务测算表（标准格式）
 */
export function exportFinancialSheet(data: FinancialSummaryData, filename: string = '财务测算表') {
  const wb = XLSX.utils.book_new();

  // 工作表1: 项目概览
  const overviewData: any[][] = [
    ['项目概览'],
    ['项目名称', data.projectName],
    ['项目类型', data.projectType],
    ['测算周期', `${data.period} 年`],
    [''],
    ['核心财务指标 (精度: 0.001)'],
    ['初始总投资 (CAPEX)', `${data.totalInvestment.toFixed(3)} 万元`],
    ['联合首年净收益', `${data.totalFirstYearSaving.toFixed(3)} 万元`],
    ['净现值 (NPV)', `${data.npv.toFixed(3)} 万元`],
    ['内部收益率 (IRR)', `${data.irr.toFixed(3)} %`],
    ['动态回本周期', `${data.payback > data.period ? `>${data.period}` : data.payback.toFixed(3)} 年`],
    ['折现率', `${data.discountRate} %`],
  ];
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(wb, wsOverview, '项目概览');

  // 工作表2: 分项投资明细
  const modulesData: any[][] = [
    ['分项投资明细'],
    ['序号', '模块名称', '状态', '测算模式', '投资额(万元)', '年收益(万元)', '收益率(%)', 'IRR(%)', '回本周期(年)', '主要指标'],
  ];

  data.modules.forEach((mod, index) => {
    modulesData.push([
      index + 1,
      mod.name,
      mod.isActive ? '启用' : '禁用',
      mod.strategy || '',
      mod.investment.toFixed(3),
      mod.yearlySaving.toFixed(3),
      mod.roi.toFixed(3),
      mod.irr.toFixed(3),
      mod.payback.toFixed(3),
      `${mod.kpiPrimary || ''}: ${mod.kpiSecondary || ''}`,
    ]);
  });

  const wsModules = XLSX.utils.aoa_to_sheet(modulesData);
  XLSX.utils.book_append_sheet(wb, wsModules, '分项投资明细');

  // 工作表3: 全生命周期现金流
  const cashflowData: any[][] = [
    ['全生命周期现金流分析'],
    ['年份', '年度净现金流(万元)', '累计现金流(万元)'],
  ];

  data.annualData.forEach(row => {
    cashflowData.push([
      row.year,
      row.net.toFixed(3),
      row.cumulative.toFixed(3),
    ]);
  });

  const wsCashflow = XLSX.utils.aoa_to_sheet(cashflowData);
  XLSX.utils.book_append_sheet(wb, wsCashflow, '全周期现金流');

  // 设置列宽
  setColumnWidths(wsOverview, [{ wch: 25 }, { wch: 35 }]);
  setColumnWidths(wsModules, [
    { wch: 6 }, { wch: 20 }, { wch: 10 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 35 }
  ]);
  setColumnWidths(wsCashflow, [{ wch: 12 }, { wch: 25 }, { wch: 25 }]);

  const dateStr = formatLocalDateCompact();
  XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`);
}

/**
 * 导出完整项目报告
 */
export function exportProjectReport(
  projectData: any,
  financialData: FinancialSummaryData,
  options: ProjectExportOptions = {}
) {
  const wb = XLSX.utils.book_new();
  const opts = {
    includeBaseInfo: true,
    includePriceConfig: true,
    includeModules: true,
    includeFinancial: true,
    ...options
  };

  // 1. 封面
  const coverData: any[][] = [
    ['零碳项目收益估值报告'],
    [''],
    ['项目名称', projectData.name || ''],
    ['项目所在地', (projectData.province || '') + ' ' + (projectData.city || '')],
    ['项目类型', projectData.type === 'school' ? '校园/教育' : '工业/商业'],
    ['生成时间', new Date().toLocaleString('zh-CN')],
    ['报告状态', '正式测算结果'],
    [''],
    ['声明: 本报告所有数据基于录入参数模拟生成，仅供投资决策参考。'],
  ];
  const wsCover = XLSX.utils.aoa_to_sheet(coverData);
  XLSX.utils.book_append_sheet(wb, wsCover, '报告封面');

  // 2. 基础配置信息
  if (opts.includeBaseInfo) {
    const baseInfoData: any[][] = [['项目基础概况']];
    baseInfoData.push(['项目基本项', '数值/内容']);
    baseInfoData.push(['项目名称', projectData.name || '']);
    baseInfoData.push(['变压器总容量', (projectData.transformers || []).reduce((s: number, t: any) => s + (t.kva || 0), 0) + ' kVA']);
    baseInfoData.push(['年用电量规模', financialData.annualData.length > 0 ? '详细见测算页' : '未关联']);

    // 楼栋信息（独立区域）
    if (projectData.buildings && projectData.buildings.length > 0) {
      baseInfoData.push(['', '', '']);
      baseInfoData.push(['楼栋列表', '面积(㎡)', '状态']);
      projectData.buildings.forEach((b: any) => {
        baseInfoData.push([b.name || '', b.area || '', b.active ? '参与改造' : '不参与']);
      });
    }
    const wsBaseInfo = XLSX.utils.aoa_to_sheet(baseInfoData);
    XLSX.utils.book_append_sheet(wb, wsBaseInfo, '项目基础概况');
  }

  // 3. 财务核心结果
  if (opts.includeFinancial) {
    const financialRows: any[][] = [
      ['综合财务评估'],
      ['指标名称', '数值', '单位', '备注'],
      ['初始总投资', financialData.totalInvestment.toFixed(3), '万元', 'CapEx'],
      ['联合首年净收益', financialData.totalFirstYearSaving.toFixed(3), '万元', '含反事实场景识别的协同增量'],
      ['内部收益率(IRR)', financialData.irr.toFixed(3), '%', '全投资内部收益率'],
      ['动态回本周期', financialData.payback.toFixed(3), '年', 'Discounted Payback'],
      ['净现值(NPV)', financialData.npv.toFixed(3), '万元', '折现收益'],
    ];

    const wsFinancial = XLSX.utils.aoa_to_sheet(financialRows);
    XLSX.utils.book_append_sheet(wb, wsFinancial, '整体财务评估');

    // 4. 年度现金流
    const cashflowData: any[][] = [
      ['25年生命周期现金流明细'],
      ['年份', '年度净收入(万元)', '累计净现金流(万元)'],
    ];
    financialData.annualData.forEach(row => {
      cashflowData.push([`第 ${row.year} 年`, row.net.toFixed(3), row.cumulative.toFixed(3)]);
    });
    const wsCashflow = XLSX.utils.aoa_to_sheet(cashflowData);
    XLSX.utils.book_append_sheet(wb, wsCashflow, '年度现金流明细');

    if (financialData.interactions?.length) {
      const interactionRows: any[][] = [
        ['板块协同收益分析'],
        ['协同项目', '年增量价值(万元)'],
        ...financialData.interactions.map(item => [item.label, item.annualValue.toFixed(3)])
      ];
      const wsInteractions = XLSX.utils.aoa_to_sheet(interactionRows);
      setColumnWidths(wsInteractions, [{ wch: 38 }, { wch: 20 }]);
      XLSX.utils.book_append_sheet(wb, wsInteractions, '协同收益');
    }

    if (financialData.participants?.length) {
      const participantRows: any[][] = [
        ['参与方财务账本'],
        ['参与方', '承担投资(万元)', '首年净收益(万元)', 'NPV(万元)', 'IRR(%)', '回收期(年)'],
        ...financialData.participants.map(item => [item.name, item.investment.toFixed(3), item.firstYearNetBenefit.toFixed(3), item.npv.toFixed(3), item.irr.toFixed(3), item.payback.toFixed(3)])
      ];
      const wsParticipants = XLSX.utils.aoa_to_sheet(participantRows);
      setColumnWidths(wsParticipants, [{ wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 16 }]);
      XLSX.utils.book_append_sheet(wb, wsParticipants, '参与方账本');
    }

    financialData.moduleDetails?.filter(item => ['retrofit-solar', 'retrofit-storage'].includes(item.moduleId)).forEach(item => {
      let cumulative = 0;
      const rows: any[][] = [
        [`${item.name}完整方案`],
        ['投资方式', item.investmentMode],
        ['专项投资(万元)', item.investment.toFixed(3)],
        ['独立首年净收益(万元)', item.firstYearNetBenefit.toFixed(3)],
        ['NPV(万元)', item.npv.toFixed(3)],
        ['IRR(%)', item.irr.toFixed(3)],
        ['动态回收期(年)', item.payback.toFixed(3)],
        [],
        ['技术参数', '数值'],
        ...item.technicalMetrics.map(metric => [metric.label, metric.value]),
        [],
        ['年份', '年度净现金流(万元)', '累计现金流(万元)'],
        ...item.cashFlows.map((value, year) => {
          cumulative += value;
          return [year, value.toFixed(3), cumulative.toFixed(3)];
        }),
        [],
        ['假设与风险'],
        ...[...item.assumptions, ...item.warnings].map((text, index) => [index + 1, text]),
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      setColumnWidths(worksheet, [{ wch: 28 }, { wch: 70 }, { wch: 24 }]);
      XLSX.utils.book_append_sheet(wb, worksheet, item.moduleId === 'retrofit-solar' ? '光伏完整方案' : '储能完整方案');
    });

    if (financialData.assumptions?.length) {
      const assumptionRows: any[][] = [['计算假设与口径'], ['序号', '假设说明'], ...financialData.assumptions.map((item, index) => [index + 1, item])];
      const wsAssumptions = XLSX.utils.aoa_to_sheet(assumptionRows);
      setColumnWidths(wsAssumptions, [{ wch: 8 }, { wch: 90 }]);
      XLSX.utils.book_append_sheet(wb, wsAssumptions, '计算假设');
    }
  }

  const safeProjectName = (projectData.name || '项目').replace(/[\\/:*?"<>|]/g, '_');
  const dateStr = formatLocalDateCompact();
  XLSX.writeFile(wb, `${safeProjectName}_详细评估报告_${dateStr}.xlsx`);
}

export function exportSimplifiedReport(
  projectName: string,
  modules: ModuleExportData[],
  totalInvestment: number,
  totalSaving: number
) {
  const wb = XLSX.utils.book_new();

  const data: any[][] = [
    [`${projectName} - 快速估值概览`],
    [''],
    ['改造模块', '投资估算(万元)', '首年节省(万元)', '静态ROI(%)'],
  ];

  modules.forEach(mod => {
    data.push([mod.name, mod.investment.toFixed(3), mod.yearlySaving.toFixed(3), mod.roi.toFixed(3)]);
  });

  data.push(['', '', '', '']);
  data.push(['【合计】', totalInvestment.toFixed(3), totalSaving.toFixed(3), totalInvestment > 0 ? (totalSaving / totalInvestment * 100).toFixed(3) : '0.000']);

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, '概览报告');

  const dateStr = formatLocalDateCompact();
  XLSX.writeFile(wb, `${projectName}_快速概览_${dateStr}.xlsx`);
}

function setColumnWidths(ws: XLSX.WorkSheet, widths: { wch: number }[]) {
  ws['!cols'] = widths;
}
