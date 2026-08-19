/**
 * PDF和Word报告导出工具函数
 * 用于生成完整的汇报报告
 */

import { PRODUCT_IDENTITY } from '../shared/config/productIdentity';

const REPORT_GENERATOR = `${PRODUCT_IDENTITY.fullName}${PRODUCT_IDENTITY.version}`;

function formatLocalDateCompact(date = new Date()): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('');
}

// ==================== PDF导出功能 ====================

/**
 * 打印/导出为PDF
 * 使用浏览器原生打印功能，用户可以选择"保存为PDF"
 */
export function exportToPDF(options?: {
  title?: string;
  filename?: string;
}) {
  // 保存原始标题
  const originalTitle = document.title;

  // 设置打印标题
  if (options?.title) {
    document.title = options.title;
  }

  // 调用打印对话框
  window.print();

  // 恢复原始标题
  setTimeout(() => {
    document.title = originalTitle;
  }, 100);
}

/**
 * 生成打印样式的HTML内容
 */
export function generatePrintableHTML(content: {
  projectInfo: any;
  modules: any[];
  financial: any;
  charts?: any[];
}): string {
  const { projectInfo, modules, financial, charts } = content;
  const activeInvestment = modules.filter(m => m.isActive).reduce((sum, module) => sum + module.investment, 0);
  const activeAnnualBenefit = modules.filter(m => m.isActive).reduce((sum, module) => sum + module.yearlySaving, 0);
  const horizonYears = financial.period ?? 25;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${projectInfo.name} - 项目估值报告</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 1.5cm;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      @page {
        margin: 1.5cm;
        size: A4 portrait;
      }
      /* 允许内容在需要时自动分页 */
      * {
        page-break-inside: auto !important;
        page-break-after: auto !important;
        page-break-before: auto !important;
      }
      /* 表格行在需要时可以跨页 */
      tr, td, th {
        page-break-inside: auto !important;
      }
    }

    body {
      font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
      line-height: 1.4;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 0;
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #4f46e5;
      padding-bottom: 10px;
    }

    .header h1 {
      font-size: 22px;
      margin: 0 0 6px 0;
      color: #4f46e5;
    }

    .header p {
      margin: 3px 0;
      color: #666;
      font-size: 12px;
    }

    .section {
      margin-top: 30px;
      margin-bottom: 20px;
      padding-top: 15px;
    }

    .section h2 {
      font-size: 16px;
      color: #1e293b;
      border-left: 3px solid #4f46e5;
      padding-left: 10px;
      margin-bottom: 10px;
      margin-top: 0;
    }

    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }

    .info-table th,
    .info-table td {
      border: 1px solid #e2e8f0;
      padding: 6px 8px;
      text-align: left;
      font-size: 12px;
    }

    .info-table th {
      background-color: #f8fafc;
      font-weight: 600;
      width: 30%;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }

    .data-table th,
    .data-table td {
      border: 1px solid #e2e8f0;
      padding: 5px 6px;
      text-align: center;
      font-size: 11px;
    }

    .data-table th {
      background-color: #4f46e5;
      color: white;
      font-weight: 600;
      font-size: 11px;
    }

    .data-table tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .data-table .active {
      background-color: #ecfdf5 !important;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }

    .kpi-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px;
      border-radius: 6px;
      text-align: center;
      min-height: 80px;
    }

    .kpi-card .label {
      font-size: 10px;
      opacity: 0.9;
      margin-bottom: 5px;
    }

    .kpi-card .value {
      font-size: 18px;
      font-weight: bold;
    }

    .chart-placeholder {
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      padding: 30px;
      text-align: center;
      color: #64748b;
    }

    .footer {
      text-align: center;
      margin-top: 25px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <!-- 封面 -->
  <div class="header">
    <h1>零碳项目收益估值报告</h1>
    <p><strong>项目名称：</strong>${projectInfo.name}</p>
    <p><strong>项目类型：</strong>${projectInfo.type}</p>
    <p><strong>生成时间：</strong>${new Date().toLocaleString('zh-CN')}</p>
  </div>

  <!-- 项目基本信息 -->
  <div class="section">
    <h2>一、项目基本信息</h2>
    <table class="info-table">
      <tr><th>项目名称</th><td>${projectInfo.name}</td></tr>
      <tr><th>项目类型</th><td>${projectInfo.type}</td></tr>
      <tr><th>所在地区</th><td>${projectInfo.province} ${projectInfo.city}</td></tr>
      <tr><th>建筑数量</th><td>${projectInfo.buildings?.length || 0} 栋</td></tr>
    </table>
  </div>

  <!-- 改造方案概览 -->
  <div class="section">
    <h2>二、改造方案概览</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>序号</th>
          <th>模块名称</th>
          <th>状态</th>
          <th>策略</th>
          <th>投资额(万元)</th>
          <th>年收益(万元)</th>
          <th>ROI(%)</th>
        </tr>
      </thead>
      <tbody>
        ${modules.map((m, i) => `
          <tr class="${m.isActive ? 'active' : ''}">
            <td>${i + 1}</td>
            <td>${m.name}</td>
            <td>${m.isActive ? '✓ 启用' : '✗ 禁用'}</td>
            <td>${m.strategy}</td>
            <td>${m.investment.toFixed(2)}</td>
            <td>${m.yearlySaving.toFixed(2)}</td>
            <td>${m.investment > 0 ? `${((m.yearlySaving / m.investment) * 100).toFixed(1)}%` : '协同增量'}</td>
          </tr>
        `).join('')}
        <tr style="font-weight: bold; background-color: #e0e7ff;">
          <td colspan="4">合计</td>
          <td>${activeInvestment.toFixed(2)}</td>
          <td>${activeAnnualBenefit.toFixed(2)}</td>
          <td>${activeInvestment > 0 ? `${((activeAnnualBenefit / activeInvestment) * 100).toFixed(1)}%` : '-'}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- 财务分析 -->
  <div class="section">
    <h2>三、财务综合分析</h2>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">初始总投资</div>
        <div class="value">¥${financial.totalInvestment.toFixed(1)}万</div>
      </div>
      <div class="kpi-card">
        <div class="label">净现值 (NPV)</div>
        <div class="value">¥${financial.npv.toFixed(1)}万</div>
      </div>
      <div class="kpi-card">
        <div class="label">内部收益率 (IRR)</div>
        <div class="value">${financial.irr.toFixed(2)}%</div>
      </div>
      <div class="kpi-card">
        <div class="label">回本周期</div>
        <div class="value">${financial.payback > horizonYears ? `>${horizonYears}` : financial.payback.toFixed(1)}年</div>
      </div>
    </div>
  </div>

  ${financial.participants?.length ? `
  <div class="section">
    <h2>四、参与方财务账本</h2>
    <table class="data-table">
      <thead><tr><th>参与方</th><th>承担投资(万元)</th><th>首年净收益(万元)</th><th>NPV(万元)</th><th>IRR</th><th>回收期</th></tr></thead>
      <tbody>${financial.participants.map((p: any) => `<tr><td>${p.name}</td><td>${p.investment.toFixed(3)}</td><td>${p.firstYearNetBenefit.toFixed(3)}</td><td>${p.npv.toFixed(3)}</td><td>${p.irr.toFixed(2)}%</td><td>${p.payback.toFixed(2)}年</td></tr>`).join('')}</tbody>
    </table>
  </div>` : ''}

  <!-- 页脚 -->
  <div class="footer">
    <p>本报告由${REPORT_GENERATOR}自动生成</p>
    <p>生成时间：${new Date().toLocaleString('zh-CN')}</p>
  </div>
</body>
</html>
  `;
}

/**
 * 生成可打印的HTML文档并导出
 */
export function generateAndPrintReport(content: {
  projectInfo: any;
  modules: any[];
  financial: any;
}): void {
  const html = generatePrintableHTML(content);

  // 创建新窗口
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('请允许弹窗以打印报告');
    return;
  }

  // 写入HTML内容
  printWindow.document.write(html);
  printWindow.document.close();

  // 等待内容加载后打印
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 500);
}

// ==================== Word导出功能 ====================

/**
 * 生成Word文档并下载
 * 使用HTML格式，Word可以直接打开
 */
export function exportToWord(content: {
  projectInfo: any;
  modules: any[];
  financial: any;
  options?: {
    includeCharts?: boolean;
  };
}): void {
  const { projectInfo, modules, financial, options = {} } = content;
  const horizonYears = financial.period ?? 25;
  const moduleChapterHtml = (financial.moduleDetails || []).filter((item: any) => ['retrofit-solar', 'retrofit-storage'].includes(item.moduleId)).map((item: any) => {
    let cumulative = 0;
    return `
      <div style="page-break-before: always;"></div>
      <h2>${item.name}完整方案</h2>
      <div class="kpi-box"><div class="kpi-value">¥${item.investment.toFixed(2)}万</div><div class="kpi-label">专项投资</div></div>
      <div class="kpi-box"><div class="kpi-value">¥${item.firstYearNetBenefit.toFixed(2)}万</div><div class="kpi-label">独立首年收益</div></div>
      <div class="kpi-box"><div class="kpi-value">${item.irr.toFixed(2)}%</div><div class="kpi-label">板块IRR</div></div>
      <div class="kpi-box"><div class="kpi-value">${item.payback.toFixed(2)}年</div><div class="kpi-label">动态回收期</div></div>
      <h3>方案与技术参数</h3>
      <table><tr><th>参数</th><th>数值</th></tr>${item.technicalMetrics.map((metric: any) => `<tr><td>${metric.label}</td><td>${metric.value}</td></tr>`).join('')}</table>
      <h3>25年独立现金流</h3>
      <table><tr><th>年份</th><th>年度净现金流(万元)</th><th>累计现金流(万元)</th></tr>${item.cashFlows.map((value: number, year: number) => { cumulative += value; return `<tr><td>${year}</td><td>${value.toFixed(3)}</td><td>${cumulative.toFixed(3)}</td></tr>`; }).join('')}</table>
      <h3>假设与风险</h3>
      <ul>${[...item.assumptions, ...item.warnings].map((text: string) => `<li>${text}</li>`).join('')}</ul>
    `;
  }).join('');

  const wordContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
  <meta charset="utf-8">
  <title>${projectInfo.name} - 项目估值报告</title>
  <style>
    body { font-family: "Microsoft YaHei", sans-serif; line-height: 1.6; margin: 40px; }
    h1 { color: #4f46e5; border-bottom: 3px solid #4f46e5; padding-bottom: 10px; }
    h2 { color: #1e293b; border-left: 4px solid #4f46e5; padding-left: 12px; margin-top: 30px; }
    h3 { color: #334155; margin-top: 22px; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: center; }
    th { background-color: #4f46e5; color: white; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .info-row { margin: 10px 0; }
    .info-label { font-weight: bold; display: inline-block; width: 120px; }
    .kpi-box { background: #f0f9ff; padding: 15px; margin: 10px; display: inline-block; width: 180px; text-align: center; }
    .kpi-value { font-size: 24px; font-weight: bold; color: #4f46e5; }
    .kpi-label { font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <h1>零碳项目收益估值报告</h1>

  <h2>一、项目基本信息</h2>
  <div class="info-row"><span class="info-label">项目名称：</span>${projectInfo.name}</div>
  <div class="info-row"><span class="info-label">项目类型：</span>${projectInfo.type}</div>
  <div class="info-row"><span class="info-label">所在地区：</span>${projectInfo.province} ${projectInfo.city}</div>
  <div class="info-row"><span class="info-label">生成时间：</span>${new Date().toLocaleString('zh-CN')}</div>

  <h2>二、改造方案概览</h2>
  <table>
    <tr><th>序号</th><th>模块名称</th><th>状态</th><th>投资额(万元)</th><th>年收益(万元)</th><th>ROI(%)</th></tr>
    ${modules.map((m, i) => `
      <tr style="${m.isActive ? 'background-color: #ecfdf5;' : ''}">
        <td>${i + 1}</td>
        <td>${m.name}</td>
        <td>${m.isActive ? '启用' : '禁用'}</td>
        <td>${m.investment.toFixed(2)}</td>
        <td>${m.yearlySaving.toFixed(2)}</td>
        <td>${m.investment > 0 ? `${((m.yearlySaving / m.investment) * 100).toFixed(1)}%` : '协同增量'}</td>
      </tr>
    `).join('')}
  </table>

  ${moduleChapterHtml}

  <div style="page-break-before: always;"></div>
  <h2>光储联合与系统财务汇总</h2>
  <div class="kpi-box"><div class="kpi-value">¥${financial.totalInvestment.toFixed(1)}万</div><div class="kpi-label">初始总投资</div></div>
  <div class="kpi-box"><div class="kpi-value">¥${financial.npv.toFixed(1)}万</div><div class="kpi-label">净现值 (NPV)</div></div>
  <div class="kpi-box"><div class="kpi-value">${financial.irr.toFixed(2)}%</div><div class="kpi-label">内部收益率 (IRR)</div></div>
  <div class="kpi-box"><div class="kpi-value">${financial.payback > horizonYears ? `>${horizonYears}` : financial.payback.toFixed(1)}年</div><div class="kpi-label">动态回本周期</div></div>

  ${financial.interactions?.length ? `<h3>板块协同收益</h3><table><tr><th>协同项目</th><th>年增量价值(万元)</th></tr>${financial.interactions.map((item: any) => `<tr><td>${item.label}</td><td>${item.annualValue.toFixed(3)}</td></tr>`).join('')}</table>` : ''}

  ${financial.annualData?.length ? `<h3>系统25年现金流</h3><table><tr><th>年份</th><th>年度净现金流(万元)</th><th>累计现金流(万元)</th></tr>${financial.annualData.map((item: any) => `<tr><td>${item.year}</td><td>${item.net.toFixed(3)}</td><td>${item.cumulative.toFixed(3)}</td></tr>`).join('')}</table>` : ''}

  ${financial.participants?.length ? `
  <h2>四、参与方财务账本</h2>
  <table>
    <tr><th>参与方</th><th>承担投资(万元)</th><th>首年净收益(万元)</th><th>NPV(万元)</th><th>IRR</th><th>回收期</th></tr>
    ${financial.participants.map((p: any) => `<tr><td>${p.name}</td><td>${p.investment.toFixed(3)}</td><td>${p.firstYearNetBenefit.toFixed(3)}</td><td>${p.npv.toFixed(3)}</td><td>${p.irr.toFixed(2)}%</td><td>${p.payback.toFixed(2)}年</td></tr>`).join('')}
  </table>` : ''}

  ${financial.assumptions?.length ? `<h3>统一测算依据与风险提示</h3><ul>${financial.assumptions.map((item: string) => `<li>${item}</li>`).join('')}</ul>` : ''}

  <p style="margin-top: 50px; color: #64748b; font-size: 12px; text-align: center;">
    本报告由${REPORT_GENERATOR}自动生成<br/>
    生成时间：${new Date().toLocaleString('zh-CN')}
  </p>
</body>
</html>
  `;

  // 创建Blob并下载
  const blob = new Blob(['\ufeff', wordContent], {
    type: 'application/msword'
  });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const dateStr = formatLocalDateCompact();
  const safeName = projectInfo.name.replace(/[\\/:*?"<>|]/g, '_');

  link.href = url;
  link.download = `${safeName}_估值报告_${dateStr}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 生成Markdown格式的报告
 */
export function exportToMarkdown(content: {
  projectInfo: any;
  modules: any[];
  financial: any;
}): string {
  const { projectInfo, modules, financial } = content;
  const activeInvestment = modules.filter(m => m.isActive).reduce((sum, module) => sum + module.investment, 0);
  const activeAnnualBenefit = modules.filter(m => m.isActive).reduce((sum, module) => sum + module.yearlySaving, 0);
  const horizonYears = financial.period ?? 25;

  return `# 零碳项目收益估值报告

## 项目基本信息

| 项目 | 内容 |
|------|------|
| 项目名称 | ${projectInfo.name} |
| 项目类型 | ${projectInfo.type} |
| 所在地区 | ${projectInfo.province} ${projectInfo.city} |
| 生成时间 | ${new Date().toLocaleString('zh-CN')} |

## 改造方案概览

| 序号 | 模块名称 | 状态 | 投资额(万元) | 年收益(万元) | ROI(%) |
|------|----------|------|---------------|---------------|--------|
${modules.map((m, i) => `
| ${i + 1} | ${m.name} | ${m.isActive ? '✓' : '✗'} | ${m.investment.toFixed(2)} | ${m.yearlySaving.toFixed(2)} | ${m.investment > 0 ? `${((m.yearlySaving / m.investment) * 100).toFixed(1)}%` : '协同增量'} |`).join('')}
| | **合计** | | ${activeInvestment.toFixed(2)} | ${activeAnnualBenefit.toFixed(2)} | ${activeInvestment > 0 ? `${((activeAnnualBenefit / activeInvestment) * 100).toFixed(1)}%` : '-'} |

## 财务综合分析

### 核心指标

- **初始总投资**: ¥${financial.totalInvestment.toFixed(1)}万
- **净现值 (NPV)**: ¥${financial.npv.toFixed(1)}万
- **内部收益率 (IRR)**: ${financial.irr.toFixed(2)}%
- **动态回本周期**: ${financial.payback > horizonYears ? `>${horizonYears}` : financial.payback.toFixed(1)}年

---

*本报告由${REPORT_GENERATOR}自动生成*
`;
}

/**
 * 导出Markdown报告
 */
export function exportMarkdownReport(content: {
  projectInfo: any;
  modules: any[];
  financial: any;
}): void {
  const markdown = exportToMarkdown(content);

  const blob = new Blob([markdown], {
    type: 'text/markdown;charset=utf-8'
  });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const dateStr = formatLocalDateCompact();
  const safeName = content.projectInfo.name.replace(/[\\/:*?"<>|]/g, '_');

  link.href = url;
  link.download = `${safeName}_估值报告_${dateStr}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
