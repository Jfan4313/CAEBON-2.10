/**
 * PDF和Word报告导出工具函数
 * 用于生成完整的汇报报告
 */

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

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${projectInfo.name} - 项目估值报告</title>
  <style>
    @media print {
      @page { margin: 2cm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page-break { page-break-after: always; }
      .no-break { page-break-inside: avoid; }
    }

    body {
      font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 3px solid #4f46e5;
      padding-bottom: 20px;
    }

    .header h1 {
      font-size: 28px;
      margin: 0 0 10px 0;
      color: #4f46e5;
    }

    .header p {
      margin: 5px 0;
      color: #666;
    }

    .section {
      margin-bottom: 30px;
    }

    .section h2 {
      font-size: 20px;
      color: #1e293b;
      border-left: 4px solid #4f46e5;
      padding-left: 12px;
      margin-bottom: 15px;
    }

    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .info-table th,
    .info-table td {
      border: 1px solid #e2e8f0;
      padding: 10px 12px;
      text-align: left;
    }

    .info-table th {
      background-color: #f8fafc;
      font-weight: 600;
      width: 30%;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .data-table th,
    .data-table td {
      border: 1px solid #e2e8f0;
      padding: 8px 10px;
      text-align: center;
      font-size: 13px;
    }

    .data-table th {
      background-color: #4f46e5;
      color: white;
      font-weight: 600;
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
      gap: 15px;
      margin-bottom: 20px;
    }

    .kpi-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }

    .kpi-card .label {
      font-size: 12px;
      opacity: 0.9;
      margin-bottom: 8px;
    }

    .kpi-card .value {
      font-size: 24px;
      font-weight: bold;
    }

    .chart-placeholder {
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      color: #64748b;
    }

    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 12px;
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

  <!-- 页面分隔符 -->
  <div class="page-break"></div>

  <!-- 项目基本信息 -->
  <div class="section no-break">
    <h2>一、项目基本信息</h2>
    <table class="info-table">
      <tr><th>项目名称</th><td>${projectInfo.name}</td></tr>
      <tr><th>项目类型</th><td>${projectInfo.type}</td></tr>
      <tr><th>所在地区</th><td>${projectInfo.province} ${projectInfo.city}</td></tr>
      <tr><th>建筑数量</th><td>${projectInfo.buildings?.length || 0} 栋</td></tr>
    </table>
  </div>

  <!-- 改造方案概览 -->
  <div class="section no-break page-break">
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
            <td>${((m.yearlySaving / m.investment) * 100).toFixed(1)}%</td>
          </tr>
        `).join('')}
        <tr style="font-weight: bold; background-color: #e0e7ff;">
          <td colspan="4">合计</td>
          <td>${modules.filter(m => m.isActive).reduce((s, m) => s + m.investment, 0).toFixed(2)}</td>
          <td>${modules.filter(m => m.isActive).reduce((s, m) => s + m.yearlySaving, 0).toFixed(2)}</td>
          <td>${((modules.filter(m => m.isActive).reduce((s, m) => s + m.yearlySaving, 0) / modules.filter(m => m.isActive).reduce((s, m) => s + m.investment, 1)) * 100).toFixed(1)}%</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- 财务分析 -->
  <div class="section no-break page-break">
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
        <div class="value">${financial.payback > 20 ? '>20' : financial.payback.toFixed(1)}年</div>
      </div>
    </div>
  </div>

  <!-- 页脚 -->
  <div class="footer">
    <p>本报告由零碳项目收益评估软件自动生成</p>
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

  const wordContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
  <meta charset="utf-8">
  <title>${projectInfo.name} - 项目估值报告</title>
  <style>
    body { font-family: "Microsoft YaHei", sans-serif; line-height: 1.6; margin: 40px; }
    h1 { color: #4f46e5; border-bottom: 3px solid #4f46e5; padding-bottom: 10px; }
    h2 { color: #1e293b; border-left: 4px solid #4f46e5; padding-left: 12px; margin-top: 30px; }
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
        <td>${((m.yearlySaving / m.investment) * 100).toFixed(1)}%</td>
      </tr>
    `).join('')}
  </table>

  <h2>三、财务综合分析</h2>
  <div class="kpi-box"><div class="kpi-value">¥${financial.totalInvestment.toFixed(1)}万</div><div class="kpi-label">初始总投资</div></div>
  <div class="kpi-box"><div class="kpi-value">¥${financial.npv.toFixed(1)}万</div><div class="kpi-label">净现值 (NPV)</div></div>
  <div class="kpi-box"><div class="kpi-value">${financial.irr.toFixed(2)}%</div><div class="kpi-label">内部收益率 (IRR)</div></div>
  <div class="kpi-box"><div class="kpi-value">${financial.payback > 20 ? '>20' : financial.payback.toFixed(1)}年</div><div class="kpi-label">回本周期</div></div>

  <p style="margin-top: 50px; color: #64748b; font-size: 12px; text-align: center;">
    本报告由零碳项目收益评估软件自动生成<br/>
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
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
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
| ${i + 1} | ${m.name} | ${m.isActive ? '✓' : '✗'} | ${m.investment.toFixed(2)} | ${m.yearlySaving.toFixed(2)} | ${((m.yearlySaving / m.investment) * 100).toFixed(1)}% |`).join('')}
| | **合计** | | ${modules.filter(m => m.isActive).reduce((s, m) => s + m.investment, 0).toFixed(2)} | ${modules.filter(m => m.isActive).reduce((s, m) => s + m.yearlySaving, 0).toFixed(2)} | ${((modules.filter(m => m.isActive).reduce((s, m) => s + m.yearlySaving, 0) / modules.filter(m => m.isActive).reduce((s, m) => s + m.investment, 1)) * 100).toFixed(1)}% |

## 财务综合分析

### 核心指标

- **初始总投资**: ¥${financial.totalInvestment.toFixed(1)}万
- **净现值 (NPV)**: ¥${financial.npv.toFixed(1)}万
- **内部收益率 (IRR)**: ${financial.irr.toFixed(2)}%
- **回本周期**: ${financial.payback > 20 ? '>20' : financial.payback.toFixed(1)}年

---

*本报告由零碳项目收益评估软件自动生成*
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
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeName = content.projectInfo.name.replace(/[\\/:*?"<>|]/g, '_');

  link.href = url;
  link.download = `${safeName}_估值报告_${dateStr}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
