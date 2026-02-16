import React, { useState } from 'react';
import { ModuleFormula, FormulaParam } from '../types';

// 各模块计算公式配置
const FORMULAS: Record<string, ModuleFormula> = {
  'solar': {
    id: 'solar',
    name: '分布式光伏',
    formulas: [
      {
        formula: '总发电量 = 装机容量 × 年利用小时数',
        description: '计算光伏系统全年发电量'
      },
      {
        formula: '自用电量 = 总发电量 × 自用比例',
        description: '计算用户直接使用的发电量'
      },
      {
        formula: '上网电量 = 总发电量 × (1 - 自用比例)',
        description: '计算输入电网的发电量'
      },
      {
        formula: '年收益 = 自用电量 × 购电价格 + 上网电量 × 上网电价',
        description: '计算年发电收益（元）'
      },
      {
        formula: '投资 = 装机容量 × 1000 × 单价 / 10000',
        description: '计算系统投资成本（万元）'
      },
      {
        formula: '年维护费 = 投资 × 1%',
        description: '计算年运维费用（万元）'
      },
      {
        formula: '年净现金流 = (年收益 / 10000) - 年维护费',
        description: '计算年净现金流（万元）'
      },
      {
        formula: 'NPV = -投资 + Σ(年净现金流 / (1 + 贴现率)^年)',
        description: '计算净现值（万元），贴现率=5%，计算10年'
      },
      {
        formula: '碳减排 = 总发电量 × 排放因子 / 1000',
        description: '计算年碳减排量（吨）'
      }
    ],
    params: [
      { key: 'capacity_kw', label: '装机容量', defaultValue: 100, unit: 'kW', editable: true },
      { key: 'yield_hours', label: '年利用小时数', defaultValue: 1100, unit: '小时', editable: true },
      { key: 'self_use_ratio', label: '自用比例', defaultValue: 0.8, unit: '%', editable: true },
      { key: 'buy_price', label: '购电价格', defaultValue: 0.8, unit: '元/kWh', editable: true },
      { key: 'sell_price', label: '上网电价', defaultValue: 0.35, unit: '元/kWh', editable: true },
      { key: 'cost_per_w', label: '单位投资', defaultValue: 3.0, unit: '元/W', editable: true },
      { key: 'emission_factor', label: '碳排放因子', defaultValue: 0.5703, unit: 'tCO2/MWh', editable: true },
      { key: 'maintenance_rate', label: '年维护费率', defaultValue: 1, unit: '%', editable: true },
      { key: 'discount_rate', label: '贴现率', defaultValue: 5, unit: '%', editable: false }
    ]
  },
  'storage': {
    id: 'storage',
    name: '储能系统',
    formulas: [
      {
        formula: '平均充电电价 = 充电时段平均电价 + 过网费',
        description: '计算储能充电平均电价'
      },
      {
        formula: '平均放电电价 = 放电时段平均电价',
        description: '计算储能放电平均电价'
      },
      {
        formula: '单次循环收益 = 容量 × 效率 × 放电电价 - 容量 × 充电电价',
        description: '计算单次充放电循环收益（元）'
      },
      {
        formula: '年收益 = 单次循环收益 × 循环次数/天 × 365 / 10000',
        description: '计算年收益（万元）'
      },
      {
        formula: '投资 = 容量 × 1300 / 10000',
        description: '计算系统投资成本（万元）'
      },
      {
        formula: '年维护费 = 投资 × 3%',
        description: '计算年运维费用（万元）'
      },
      {
        formula: '年净现金流 = 年收益 - 年维护费',
        description: '计算年净现金流（万元）'
      },
      {
        formula: '回本周期 = 投资 / 年净现金流',
        description: '计算投资回收期（年）'
      }
    ],
    params: [
      { key: 'capacity_kwh', label: '储能容量', defaultValue: 2000, unit: 'kWh', editable: true },
      { key: 'power_kw', label: '充放功率', defaultValue: 500, unit: 'kW', editable: true },
      { key: 'efficiency', label: '往返效率', defaultValue: 0.9, unit: '', editable: true },
      { key: 'cycles_per_day', label: '每日循环次数', defaultValue: 2, unit: '次', editable: true },
      { key: 'grid_fee', label: '过网费', defaultValue: 0.2, unit: '元/kWh', editable: true },
      { key: 'charge_price', label: '充电电价', defaultValue: 0.52, unit: '元/kWh', editable: true },
      { key: 'discharge_price', label: '放电电价', defaultValue: 1.62, unit: '元/kWh', editable: true },
      { key: 'unit_cost', label: '单位成本', defaultValue: 1300, unit: '元/kWh', editable: true },
      { key: 'maintenance_rate', label: '年维护费率', defaultValue: 3, unit: '%', editable: true }
    ]
  },
  'hvac': {
    id: 'hvac',
    name: '暖通空调',
    formulas: [
      {
        formula: '年制冷需求 = 建筑面积 × 单位制冷负荷 × 1000',
        description: '计算全年制冷需求量（kWh）'
      },
      {
        formula: '旧系统耗电 = 年制冷需求 / 旧COP',
        description: '计算旧系统年耗电量（kWh）'
      },
      {
        formula: '新系统耗电 = 年制冷需求 / 新COP',
        description: '计算新系统年耗电量（kWh）'
      },
      {
        formula: '硬件节电 = 旧系统耗电 - 新系统耗电',
        description: '计算硬件替换节电量（kWh）'
      },
      {
        formula: 'AI预冷节电 = 新系统耗电 × AI优化率',
        description: '计算AI预冷节电量（kWh）'
      },
      {
        formula: '总节电 = 硬件节电 + AI节电',
        description: '计算总节电量（kWh）'
      },
      {
        formula: '年节省 = 总节电 × 电价 / 10000',
        description: '计算年节省金额（万元）'
      },
      {
        formula: '投资 = 建筑面积 × 200 / 10000',
        description: '计算系统投资成本（万元）'
      },
      {
        formula: '碳减排 = 总节电 × 排放因子 / 1000',
        description: '计算年碳减排量（吨）'
      }
    ],
    params: [
      { key: 'building_area', label: '建筑面积', defaultValue: 5000, unit: 'm²', editable: true },
      { key: 'cooling_load', label: '单位制冷负荷', defaultValue: 100, unit: 'W/m²', editable: true },
      { key: 'current_cop', label: '当前平均COP', defaultValue: 3.2, unit: '', editable: true },
      { key: 'target_cop', label: '目标COP', defaultValue: 4.5, unit: '', editable: true },
      { key: 'electricity_price', label: '电价', defaultValue: 0.85, unit: '元/kWh', editable: true },
      { key: 'ai_saving_rate', label: 'AI优化率', defaultValue: 0.08, unit: '%', editable: true },
      { key: 'emission_factor', label: '碳排放因子', defaultValue: 0.5703, unit: 'tCO2/MWh', editable: true },
      { key: 'unit_cost', label: '改造成本', defaultValue: 200, unit: '元/m²', editable: true }
    ]
  },
  'lighting': {
    id: 'lighting',
    name: '智能照明',
    formulas: [
      {
        formula: '硬件节电 = (旧功率 - 新功率) × 灯具数量 × 日用时长 × 365 / 1000',
        description: '计算硬件替换节电量（kWh）'
      },
      {
        formula: '硬件后耗电 = 新功率 × 灯具数量 × 日用时长 × 365 / 1000',
        description: '计算替换后耗电量（kWh）'
      },
      {
        formula: 'AI调光节电 = 硬件后耗电 × AI调光节省率',
        description: '计算AI调光节电量（kWh）'
      },
      {
        formula: '总节电 = 硬件节电 + AI节电',
        description: '计算总节电量（kWh）'
      },
      {
        formula: '年节省 = 总节电 × 电价 / 10000',
        description: '计算年节省金额（万元）'
      },
      {
        formula: '投资 = 灯具数量 × 100',
        description: '计算投资成本（元）'
      },
      {
        formula: '碳减排 = 总节电 × 排放因子 / 1000',
        description: '计算年碳减排量（吨）'
      }
    ],
    params: [
      { key: 'lamp_count', label: '灯具数量', defaultValue: 100, unit: '盏', editable: true },
      { key: 'old_power', label: '旧功率', defaultValue: 40, unit: 'W', editable: true },
      { key: 'new_power', label: '新功率', defaultValue: 15, unit: 'W', editable: true },
      { key: 'daily_hours', label: '日用时长', defaultValue: 10, unit: '小时', editable: true },
      { key: 'electricity_price', label: '电价', defaultValue: 0.85, unit: '元/kWh', editable: true },
      { key: 'ai_dimming_rate', label: 'AI调光节省率', defaultValue: 0.15, unit: '%', editable: true },
      { key: 'emission_factor', label: '碳排放因子', defaultValue: 0.5703, unit: 'tCO2/MWh', editable: true },
      { key: 'unit_cost', label: '单灯成本', defaultValue: 100, unit: '元/盏', editable: true }
    ]
  },
  'ev': {
    id: 'ev',
    name: '充电桩设施',
    formulas: [
      {
        formula: '日充电量 = 充电桩数量 × 单桩功率 × 日均利用小时',
        description: '计算日充电量（kWh）'
      },
      {
        formula: '年充电量 = 日充电量 × 365',
        description: '计算年充电量（kWh）'
      },
      {
        formula: '年服务费收入 = 年充电量 × 服务费 / 10000',
        description: '计算年服务费收入（万元）'
      },
      {
        formula: '投资 = 充电桩数量 × 单桩投资 / 10000',
        description: '计算投资成本（万元）'
      },
      {
        formula: '年维护费 = 投资 × 3%',
        description: '计算年运维费用（万元）'
      },
      {
        formula: '年净现金流 = 年服务费收入 - 年维护费',
        description: '计算年净现金流（万元）'
      }
    ],
    params: [
      { key: 'charger_count', label: '充电桩数量', defaultValue: 10, unit: '个', editable: true },
      { key: 'power_per_charger', label: '单桩功率', defaultValue: 7, unit: 'kW', editable: true },
      { key: 'daily_util_hours', label: '日均利用小时', defaultValue: 4, unit: '小时', editable: true },
      { key: 'service_fee', label: '服务费', defaultValue: 0.5, unit: '元/kWh', editable: true },
      { key: 'investment_per_charger', label: '单桩投资', defaultValue: 3000, unit: '元', editable: true }
    ]
  }
};

const FormulaAdmin: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<string>('solar');
  const [params, setParams] = useState<Record<string, number>>({});
  const [testResult, setTestResult] = useState<ModuleFormula['testResult']>(undefined);
  const [isTesting, setIsTesting] = useState(false);

  const currentFormula = FORMULAS[selectedModule];

  // 初始化参数值
  useState(() => {
    const initialParams: Record<string, number> = {};
    currentFormula.params.forEach(p => {
      initialParams[p.key] = p.defaultValue;
    });
    setParams(initialParams);
  }, [currentFormula]);

  // 更新参数
  const handleParamChange = (key: string, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  // 执行测试计算
  const runTest = () => {
    setIsTesting(true);
    setTestResult(undefined);

    setTimeout(() => {
      try {
        const result = calculate(selectedModule, params);
        setTestResult(result);
      } catch (error) {
        console.error('计算错误:', error);
      } finally {
        setIsTesting(false);
      }
    }, 500);
  };

  // 简单的计算函数（仅用于演示）
  const calculate = (moduleId: string, paramValues: Record<string, number>): ModuleFormula['testResult'] => {
    const p = paramValues;

    switch (moduleId) {
      case 'solar': {
        const capacity = p.capacity_kw || 0;
        const yieldHours = p.yield_hours || 0;
        const selfUseRatio = p.self_use_ratio || 0;
        const buyPrice = p.buy_price || 0;
        const sellPrice = p.sell_price || 0;
        const costPerW = p.cost_per_w || 0;
        const emissionFactor = p.emission_factor || 0;

        const totalGeneration = capacity * yieldHours;
        const selfUse = totalGeneration * selfUseRatio;
        const feedIn = totalGeneration * (1 - selfUseRatio);
        const annualRevenue = selfUse * buyPrice + feedIn * sellPrice;
        const investment = capacity * 1000 * costPerW / 10000;
        const maintenanceRate = (p.maintenance_rate || 1) / 100;
        const annualMaintenance = investment * maintenanceRate;
        const netCashflow = annualRevenue / 10000 - annualMaintenance;
        const carbonReduction = totalGeneration * emissionFactor / 1000;

        // NPV计算
        const discountRate = (p.discount_rate || 5) / 100;
        let npv = -investment;
        for (let year = 1; year <= 10; year++) {
          npv += netCashflow / Math.pow(1 + discountRate, year);
        }

        const roi = (netCashflow * 10 - investment) / investment * 100;
        const paybackPeriod = netCashflow > 0 ? investment / netCashflow : 0;

        return {
          investment: Number(investment.toFixed(2)),
          annual_saving: Number(netCashflow.toFixed(2)),
          roi: Number(roi.toFixed(2)),
          npv: Number(npv.toFixed(2)),
          payback_period: Number(paybackPeriod.toFixed(2)),
          carbon_reduction: Number(carbonReduction.toFixed(2))
        };
      }

      case 'storage': {
        const capacity = p.capacity_kwh || 0;
        const power = p.power_kw || 0;
        const efficiency = p.efficiency || 0;
        const cycles = p.cycles_per_day || 0;
        const gridFee = p.grid_fee || 0;
        const chargePrice = p.charge_price || 0;
        const dischargePrice = p.discharge_price || 0;
        const unitCost = p.unit_cost || 0;

        const avgChargePrice = chargePrice + gridFee;
        const cycleBenefit = capacity * efficiency * dischargePrice - capacity * avgChargePrice;
        const annualRevenue = cycleBenefit * cycles * 365 / 10000;
        const investment = capacity * unitCost / 10000;
        const maintenanceRate = (p.maintenance_rate || 3) / 100;
        const annualMaintenance = investment * maintenanceRate;
        const netCashflow = annualRevenue - annualMaintenance;

        const roi = netCashflow > 0 ? (netCashflow * 10 - investment) / investment * 100 : 0;
        const paybackPeriod = netCashflow > 0 ? investment / netCashflow : 0;

        return {
          investment: Number(investment.toFixed(2)),
          annual_saving: Number(annualRevenue.toFixed(2)),
          roi: Number(roi.toFixed(2)),
          payback_period: Number(paybackPeriod.toFixed(2))
        };
      }

      case 'hvac': {
        const area = p.building_area || 0;
        const coolingLoad = p.cooling_load || 0;
        const currentCOP = p.current_cop || 0;
        const targetCOP = p.target_cop || 0;
        const electricityPrice = p.electricity_price || 0;
        const aiRate = p.ai_saving_rate || 0;
        const emissionFactor = p.emission_factor || 0;
        const unitCost = p.unit_cost || 0;

        const annualCoolingDemand = area * coolingLoad * 1000;
        const oldConsumption = annualCoolingDemand / currentCOP;
        const newConsumption = annualCoolingDemand / targetCOP;
        const hardwareSaving = oldConsumption - newConsumption;
        const aiSaving = newConsumption * aiRate;
        const totalSaving = hardwareSaving + aiSaving;
        const annualSaving = totalSaving * electricityPrice / 10000;
        const investment = area * unitCost / 10000;
        const carbonReduction = totalSaving * emissionFactor / 1000;

        return {
          investment: Number(investment.toFixed(2)),
          annual_saving: Number(annualSaving.toFixed(2)),
          carbon_reduction: Number(carbonReduction.toFixed(2))
        };
      }

      case 'lighting': {
        const count = p.lamp_count || 0;
        const oldPower = p.old_power || 0;
        const newPower = p.new_power || 0;
        const dailyHours = p.daily_hours || 0;
        const electricityPrice = p.electricity_price || 0;
        const aiRate = p.ai_dimming_rate || 0;
        const emissionFactor = p.emission_factor || 0;
        const unitCost = p.unit_cost || 0;

        const hardwareSaving = (oldPower - newPower) * count * dailyHours * 365 / 1000;
        const newConsumption = newPower * count * dailyHours * 365 / 1000;
        const aiSaving = newConsumption * aiRate;
        const totalSaving = hardwareSaving + aiSaving;
        const annualSaving = totalSaving * electricityPrice / 10000;
        const investment = count * unitCost;
        const carbonReduction = totalSaving * emissionFactor / 1000;

        return {
          investment: Number(investment.toFixed(2)),
          annual_saving: Number(annualSaving.toFixed(2)),
          carbon_reduction: Number(carbonReduction.toFixed(2))
        };
      }

      case 'ev': {
        const count = p.charger_count || 0;
        const power = p.power_per_charger || 0;
        const hours = p.daily_util_hours || 0;
        const serviceFee = p.service_fee || 0;
        const unitCost = p.investment_per_charger || 0;

        const dailyCharge = count * power * hours;
        const annualCharge = dailyCharge * 365;
        const annualRevenue = annualCharge * serviceFee / 10000;
        const investment = count * unitCost / 10000;
        const maintenanceRate = (p.maintenance_rate || 3) / 100;
        const annualMaintenance = investment * maintenanceRate;
        const netCashflow = annualRevenue - annualMaintenance;

        return {
          investment: Number(investment.toFixed(2)),
          annual_saving: Number(netCashflow.toFixed(2))
        };
      }

      default:
        return undefined;
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">算法公式管理</h1>
          <p className="text-slate-500">查看和修改各模块的计算公式及参数</p>
        </div>

        {/* 模块选择器 */}
        <div className="flex gap-2 mb-8 p-1 bg-white rounded-xl border border-slate-200 overflow-x-auto">
          {Object.values(FORMULAS).map(module => (
            <button
              key={module.id}
              onClick={() => setSelectedModule(module.id)}
              className={`px-6 py-3 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                selectedModule === module.id
                  ? 'bg-primary text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {module.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：公式展示 */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">functions</span>
                {currentFormula.name} - 计算公式
              </h2>
              <div className="space-y-4">
                {currentFormula.formulas.map((item, index) => (
                  <div key={index} className="border-l-4 border-slate-200 pl-4 py-2">
                    <div className="font-mono text-sm text-slate-800 bg-slate-50 px-3 py-2 rounded-lg mb-1">
                      {item.formula}
                    </div>
                    <p className="text-sm text-slate-500">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：参数编辑和测试 */}
          <div className="space-y-6">
            {/* 参数编辑 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">tune</span>
                参数配置
              </h2>
              <div className="space-y-3">
                {currentFormula.params.map(param => (
                  <div key={param.key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {param.label}
                      {param.editable && <span className="text-red-500 ml-1">* 可编辑</span>}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        disabled={!param.editable}
                        value={params[param.key] ?? param.defaultValue}
                        onChange={(e) => handleParamChange(param.key, parseFloat(e.target.value))}
                        className={`flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm transition-colors ${
                          param.editable
                            ? 'focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white'
                            : 'bg-slate-50 text-slate-500 cursor-not-allowed'
                        }`}
                      />
                      <span className="text-sm text-slate-500 w-12">{param.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 测试按钮和结果 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">play_circle</span>
                测试计算
              </h2>
              <button
                onClick={runTest}
                disabled={isTesting}
                className={`w-full py-3 rounded-xl font-medium text-sm transition-all ${
                  isTesting
                    ? 'bg-slate-400 text-white cursor-wait'
                    : 'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/30 hover:shadow-xl'
                }`}
              >
                {isTesting ? '计算中...' : '执行测试计算'}
              </button>

              {testResult && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">check_circle</span>
                    计算结果
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {testResult.investment !== undefined && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-xs text-slate-500 mb-1">投资</div>
                        <div className="text-lg font-bold text-slate-900">
                          {testResult.investment} <span className="text-sm font-normal text-slate-500 ml-1">万元</span>
                        </div>
                      </div>
                    )}
                    {testResult.annual_saving !== undefined && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-xs text-slate-500 mb-1">年收益/节省</div>
                        <div className="text-lg font-bold text-slate-900">
                          {testResult.annual_saving} <span className="text-sm font-normal text-slate-500 ml-1">万元</span>
                        </div>
                      </div>
                    )}
                    {testResult.roi !== undefined && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-xs text-slate-500 mb-1">ROI</div>
                        <div className="text-lg font-bold text-slate-900">
                          {testResult.roi} <span className="text-sm font-normal text-slate-500 ml-1">%</span>
                        </div>
                      </div>
                    )}
                    {testResult.irr !== undefined && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-xs text-slate-500 mb-1">IRR</div>
                        <div className="text-lg font-bold text-slate-900">
                          {testResult.irr} <span className="text-sm font-normal text-slate-500 ml-1">%</span>
                        </div>
                      </div>
                    )}
                    {testResult.payback_period !== undefined && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-xs text-slate-500 mb-1">回本周期</div>
                        <div className="text-lg font-bold text-slate-900">
                          {testResult.payback_period} <span className="text-sm font-normal text-slate-500 ml-1">年</span>
                        </div>
                      </div>
                    )}
                    {testResult.npv !== undefined && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-xs text-slate-500 mb-1">NPV</div>
                        <div className="text-lg font-bold text-slate-900">
                          {testResult.npv} <span className="text-sm font-normal text-slate-500 ml-1">万元</span>
                        </div>
                      </div>
                    )}
                    {testResult.carbon_reduction !== undefined && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-xs text-slate-500 mb-1">碳减排</div>
                        <div className="text-lg font-bold text-slate-900">
                          {testResult.carbon_reduction} <span className="text-sm font-normal text-slate-500 ml-1">吨</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormulaAdmin;
