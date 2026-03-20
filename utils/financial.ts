/**
 * 零碳项目统一财务工具
 * 提供标准 IRR (内部收益率) 计算及现金流推演逻辑
 */

/**
 * 标准 IRR 计算 (牛顿迭代法)
 * @param cashFlows 现金流数组 [第0年投资(负数), 第1年收益, ..., 第N年收益]
 * @param guess 初始推测值 (默认 0.1)
 * @returns 内部收益率 (百分比)
 */
export function calculateIRR(cashFlows: number[], guess: number = 0.1): number {
    if (cashFlows.length < 2) return 0;

    // 检查是否有投资(负数)和收益(正数)
    const hasNegative = cashFlows.some(v => v < 0);
    const hasPositive = cashFlows.some(v => v > 0);
    if (!hasNegative || !hasPositive) return 0;

    let period = cashFlows.length;
    let rate = guess;

    for (let i = 0; i < 50; i++) {
        let npv = 0;
        let dnpv = 0;

        for (let t = 0; t < period; t++) {
            const factor = Math.pow(1 + rate, t);
            npv += cashFlows[t] / factor;
            if (t > 0) {
                dnpv -= t * cashFlows[t] / (factor * (1 + rate));
            }
        }

        if (Math.abs(npv) < 1e-4) return rate * 100;
        if (Math.abs(dnpv) < 1e-10) break; // 防止除以 0

        const newRate = rate - npv / dnpv;
        if (Math.abs(newRate - rate) < 1e-6) return newRate * 100;

        rate = newRate;

        // 边界检查：防止 IRR 跑飞到非理性区间
        if (rate > 5 || rate < -0.99) break;
    }

    // 如果牛顿法失败，尝试二分法兜底
    return calculateIRRBisection(cashFlows);
}

function calculateIRRBisection(cashFlows: number[]): number {
    let low = -0.99;
    let high = 5.0;

    for (let i = 0; i < 40; i++) {
        let mid = (low + high) / 2;
        let npv = 0;
        for (let t = 0; t < cashFlows.length; t++) {
            npv += cashFlows[t] / Math.pow(1 + mid, t);
        }

        if (Math.abs(npv) < 1e-4) return mid * 100;
        if (npv > 0) low = mid;
        else high = mid;
    }
    return low * 100;
}

/**
 * 生成标准 25 年现金流
 * 完全贴合“增值税留抵结转”及“附加税减半”小微企业模型
 */
export function generateStandardCashFlows(params: {
    totalInvestment: number,
    totalGrossSaving: number, // 每年毛收益 (含税)
    omRate: number,           // 年度常规运维费率 (%)
    insuranceRate?: number,   // 保险费率 (%)
    taxRate: number,          // 企业所得税率 (%) (小微默认5%)
    vatRate?: number,         // 增值税率 (%) (默认13%)
    vatExtraRate?: number,    // 附加税费率 (%) (城建税7%+教育附加3%+地方教育附加2% = 12%，小微减半后为6%)
    degradationLinear?: number, // 发电量每年线性衰减率 (%)
    degradationFirstYear?: number, // 首年衰减 (%)
    period?: number            // 计算年限，默认 25
}): number[] {
    const {
        totalInvestment,
        totalGrossSaving,
        omRate,
        insuranceRate = 0,
        taxRate,
        vatRate = 13.0,
        vatExtraRate = 6.0,   // 贴合小微企业“六税两费”减半政策，默认为6%
        degradationLinear = 0.45,
        degradationFirstYear = 1.0,
        period = 25
    } = params;

    const cashFlows: number[] = [-totalInvestment];

    // 运维、保险总费用 (含税)
    const totalOpexRate = omRate + insuranceRate;
    const annualOpexGross = totalInvestment * (totalOpexRate / 100);
    // 运维费进项税抵扣 (由于电站运维常含人工及其他服务，假设综合抵扣率为5%并倒算，或者直接假设运维包含对应进项)
    // 根据提供的表格，“运维、保险等进项税”约占固定值。此处为保证逻辑完备，假设运维费用含6%进项税。
    const opexVatRate = 0.05; // 参考图片的进项率
    const opexInputVat = annualOpexGross / (1 + opexVatRate) * opexVatRate;
    const annualOpexNet = annualOpexGross - opexInputVat;

    // 初始投资进项税一次性留抵 (固定资产抵扣)
    const investmentNet = totalInvestment / (1 + vatRate / 100);
    let vatCarryForward = totalInvestment - investmentNet; // 第一期建站产生的进项税总额

    let accumulatedDepreciation = 0;

    for (let year = 1; year <= period; year++) {
        // 计算产量衰减
        let degradationFactor = 1.0;
        if (year === 1) {
            degradationFactor = 1 - (degradationFirstYear / 100);
        } else {
            degradationFactor = (1 - (degradationFirstYear / 100)) * Math.pow(1 - (degradationLinear / 100), year - 1);
        }

        // 年度发电含税收入
        const currentYearSavingGross = totalGrossSaving * degradationFactor;

        // 1. 增值税计算 (应交增值税 = 销项税 - 进项税 - 上期留抵)
        const revenueNet = currentYearSavingGross / (1 + vatRate / 100);
        const outputVat = currentYearSavingGross - revenueNet;

        // 增值税额推演 (允许负数留抵)
        let vatPayable = outputVat - opexInputVat - vatCarryForward;

        if (vatPayable < 0) {
            vatCarryForward = -vatPayable; // 转入下期留抵
            vatPayable = 0;                // 本期无需缴纳增值税
        } else {
            vatCarryForward = 0;           // 留抵扣完
        }

        // 2. 税金及附加 (基于本期实际缴纳的增值税额计算，享有减半优惠则为6%)
        const vatSurcharge = vatPayable * (vatExtraRate / 100);

        // 3. 企业所得税 (利润额 = 不含税收入 - 不含税运维 - 折旧 - 附加税费)
        // 10年双倍余额递减法折旧 (Double Declining Balance)
        let currentYearDepreciation = 0;
        if (year <= 8) {
            currentYearDepreciation = (investmentNet - accumulatedDepreciation) * (2 / 10);
            accumulatedDepreciation += currentYearDepreciation;
        } else if (year === 9 || year === 10) {
            const remainingForYear8 = investmentNet - accumulatedDepreciation;
            currentYearDepreciation = remainingForYear8 / 2; // 平摊剩余净值
            // 不再累加，避免第10年结束后不等于总额（实则第10年提完已是全额）
        }

        const taxableIncome = revenueNet - annualOpexNet - currentYearDepreciation - vatSurcharge;

        // 所得税抵扣
        const incomeTax = taxableIncome > 0 ? taxableIncome * (taxRate / 100) : 0;

        // 4. 当年净现金流 (含税收入 - 含税支出 - 交纳增值税 - 附加税 - 所得税)
        const netCashFlow = currentYearSavingGross - annualOpexGross - vatPayable - vatSurcharge - incomeTax;

        cashFlows.push(parseFloat(netCashFlow.toFixed(4)));
    }

    return cashFlows;
}

/**
 * 计算静态/动态回本周期
 * @param cashFlows 现金流数组 [第0年投资(负数), 第1年收益, ..., 第N年收益]
 * @returns 回本年数 (带小数)
 */
export function calculatePaybackPeriod(cashFlows: number[]): number {
    if (cashFlows.length === 0 || cashFlows[0] >= 0) return 0;

    let cumulative = cashFlows[0];
    for (let i = 1; i < cashFlows.length; i++) {
        const prevCumulative = cumulative;
        cumulative += cashFlows[i];

        if (cumulative >= 0) {
            // 线性插值计算具体月份
            return (i - 1) + (Math.abs(prevCumulative) / cashFlows[i]);
        }
    }

    return cashFlows.length - 1; // 未回本返回总年限
}
