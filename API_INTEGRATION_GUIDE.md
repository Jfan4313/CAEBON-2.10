# API集成指南 - 改造模块

## 概述

本指南说明如何将API计算服务集成到现有的改造模块组件中。

## 步骤1: 导入API方法

在组件顶部添加API方法的导入：

```typescript
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useProject } from '../context/ProjectContext';
import { calculationService, SolarParams } from '../services/api';
```

## 步骤2: 使用useProject获取API方法

```typescript
const {
  modules,
  toggleModule,
  updateModule,
  saveProject,
  calculateSolar,  // 新增: API计算方法
  isCalculating,    // 新增: 计算状态
  apiAvailable      // 新增: API可用性
} = useProject();
```

## 步骤3: 添加API计算函数

```typescript
// 在组件中添加API计算函数
const handleApiCalculate = async () => {
  try {
    // 准备API参数
    const params: SolarParams = {
      capacity: params.simpleParams.capacity,
      yieldHours: params.advParams?.dailySunHours || 1100,
      selfUseRatio: calculatedSelfConsumption / 100,
      buyPrice: params.advParams?.electricityPrice || 0.8,
      sellPrice: params.advParams?.feedInTariff || 0.35,
      costPerW: params.simpleParams?.epcPrice || 3.0,
      includeHourly: true,
    };

    // 调用API计算
    const result = await calculateSolar(params);

    // 显示成功提示
    console.log('计算完成:', result);
  } catch (error) {
    console.error('计算失败:', error);
  }
};
```

## 步骤4: 添加计算按钮

在UI中添加计算按钮，支持API和本地两种模式：

```typescript
{/* 在计算按钮区域添加 */}
<button
  onClick={handleApiCalculate}
  disabled={isCalculating || !currentModule.isActive}
  className="px-8 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all flex items-center gap-2"
>
  {isCalculating ? (
    <>
      <span className="material-icons animate-spin">refresh</span>
      计算中...
    </>
  ) : (
    <>
      <span className="material-icons text-[18px]">calculate</span>
      {apiAvailable ? 'API计算' : '本地计算'}
    </>
  )}
</button>

{/* 添加API状态指示 */}
{!apiAvailable && (
  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
    <span className="material-icons text-[14px]">warning</span>
    后端API未连接，使用本地计算
  </div>
)}
```

## 步骤5: 使用API返回的结果

API计算后会自动更新模块数据，可以在右侧栏显示：

```typescript
{/* 在右侧栏添加 */}
{currentModule.params?.calculationResult && (
  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
    <h4 className="text-xs font-bold text-slate-700 mb-3">API计算结果</h4>
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>投资:</span>
        <span className="font-bold">{currentModule.params.calculationResult.investment} 万元</span>
      </div>
      <div className="flex justify-between text-sm">
        <span>年收益:</span>
        <span className="font-bold text-green-600">{currentModule.params.calculationResult.annual_saving} 万元</span>
      </div>
      <div className="flex justify-between text-sm">
        <span>IRR:</span>
        <span className="font-bold">{currentModule.params.calculationResult.irr}%</span>
      </div>
      <div className="flex justify-between text-sm">
        <span>碳减排:</span>
        <span className="font-bold">{currentModule.params.calculationResult.carbon_reduction} 吨</span>
      </div>
    </div>
  </div>
)}
```

## 完整的示例组件

以下是一个简化的RetrofitSolar组件，展示完整的API集成：

```typescript
import React, { useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { calculationService, SolarParams } from '../services/api';

const DEFAULTS = {
  mode: 'simple',
  simpleParams: { capacity: 400, epcPrice: 3.5 },
  advParams: { dailySunHours: 3.8, feedInTariff: 0.35, electricityPrice: 0.85 }
};

const RetrofitSolar: React.FC = () => {
  const {
    modules,
    toggleModule,
    updateModule,
    saveProject,
    calculateSolar,
    isCalculating,
    apiAvailable
  } = useProject();

  const currentModule = modules['retrofit-solar'];
  const [calculatedSelfConsumption, setCalculatedSelfConsumption] = useState(85);
  const [showApiResult, setShowApiResult] = useState(false);

  const params = {
    mode: currentModule.params?.mode || DEFAULTS.mode,
    simpleParams: { ...DEFAULTS.simpleParams, ...currentModule.params?.simpleParams },
    advParams: { ...DEFAULTS.advParams, ...currentModule.params?.advParams }
  };

  // API计算
  const handleApiCalculate = async () => {
    try {
      const apiParams: SolarParams = {
        capacity: params.simpleParams.capacity,
        yieldHours: params.advParams?.dailySunHours || 1100,
        selfUseRatio: calculatedSelfConsumption / 100,
        buyPrice: params.advParams?.electricityPrice || 0.8,
        sellPrice: params.advParams?.feedInTariff || 0.35,
        costPerW: params.simpleParams?.epcPrice || 3.0,
        includeHourly: true,
      };

      await calculateSolar(apiParams);
      setShowApiResult(true);
    } catch (error) {
      console.error('计算失败:', error);
      alert('计算失败: ' + error);
    }
  };

  // 本地计算（原有逻辑）
  const handleLocalUpdate = (newParamsPart: any) => {
    const newParams = { ...params, ...newParamsPart };
    const capacity = newParams.simpleParams.capacity;
    const investment = parseFloat((capacity * newParams.simpleParams.epcPrice / 10).toFixed(1));

    updateModule('retrofit-solar', {
      investment,
      yearlySaving: 38.8,
      kpiPrimary: { label: '装机容量', value: `${capacity} kW` },
      kpiSecondary: { label: 'ROI', value: '23.5%' },
      params: newParams
    });
  };

  if (!currentModule) return null;

  return (
    <div className="flex h-full bg-slate-50">
      {/* 主内容区域 - 保持原有UI不变 */}
      <div className="flex-1 p-8">
        {/* ... 原有的UI代码 ... */}

        {/* 添加API计算按钮 */}
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleApiCalculate}
            disabled={isCalculating || !currentModule.isActive}
            className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white shadow-lg hover:bg-primary-hover transition-all flex items-center gap-2"
          >
            {isCalculating ? (
              <>
                <span className="material-icons animate-spin">refresh</span>
                计算中...
              </>
            ) : (
              <>
                <span className="material-icons text-[18px]">calculate</span>
                {apiAvailable ? 'API计算' : '本地计算'}
              </>
            )}
          </button>

          {!apiAvailable && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
              <span className="material-icons text-[14px]">warning</span>
              后端API未连接
            </div>
          )}
        </div>
      </div>

      {/* 右侧栏 - 显示API计算结果 */}
      <aside className="w-[340px] bg-white border-l border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 mb-4">计算结果</h3>

        {/* 基础KPI */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
          <div className="text-xs font-semibold text-slate-500 mb-2">装机容量</div>
          <div className="text-3xl font-bold text-slate-900">{currentModule.kpiPrimary.value}</div>
        </div>

        {/* API结果详情 */}
        {showApiResult && currentModule.params?.calculationResult && (
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h4 className="text-xs font-bold text-slate-700 mb-3">API计算结果</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>投资:</span>
                <span className="font-bold">{currentModule.params.calculationResult.investment} 万元</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>年收益:</span>
                <span className="font-bold text-green-600">{currentModule.params.calculationResult.annual_saving} 万元</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>IRR:</span>
                <span className="font-bold">{currentModule.params.calculationResult.irr}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>回收期:</span>
                <span className="font-bold">{currentModule.params.calculationResult.payback_period} 年</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>碳减排:</span>
                <span className="font-bold">{currentModule.params.calculationResult.carbon_reduction} 吨</span>
              </div>
            </div>
          </div>
        )}

        {/* 保存按钮 */}
        <button
          onClick={saveProject}
          className="mt-4 w-full px-6 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white shadow-lg hover:bg-primary-hover transition-all"
        >
          保存配置
        </button>
      </aside>
    </div>
  );
};

export default RetrofitSolar;
```

## 其他改造模块的集成

相同的模式适用于其他改造模块：

### 储能模块 (RetrofitStorage.tsx)
```typescript
const { calculateStorage } = useProject();

const handleApiCalculate = async () => {
  const params: StorageParams = {
    capacity: params.simpleParams.capacity,
    power: params.simpleParams.power,
    efficiency: params.advParams?.efficiency || 0.9,
    cyclesPerDay: params.advParams?.cyclesPerDay || 2,
    gridFee: params.advParams?.gridFee || 0.2,
    aiEnabled: params.advParams?.aiEnabled || false,
  };

  await calculateStorage(params);
};
```

### 空调模块 (RetrofitHVAC.tsx)
```typescript
const { calculateHVAC } = useProject();

const handleApiCalculate = async () => {
  const params: HVACParams = {
    buildings: params.buildings,
    electricityPrice: params.advParams?.electricityPrice || 0.85,
    currentAvgCOP: params.advParams?.currentAvgCOP || 3.2,
    targetCOP: params.advParams?.targetCOP || 4.5,
    aiEnabled: params.advParams?.aiEnabled || false,
  };

  await calculateHVAC(params);
};
```

### 照明模块 (RetrofitLighting.tsx)
```typescript
const { calculateLighting } = useProject();

const handleApiCalculate = async () => {
  const params: LightingParams = {
    areas: params.areas,
    electricityPrice: params.advParams?.electricityPrice || 0.85,
    aiEnabled: params.advParams?.aiEnabled || false,
  };

  await calculateLighting(params);
};
```

### 充电桩模块 (RetrofitEV.tsx)
```typescript
const { calculateEV } = useProject();

const handleApiCalculate = async () => {
  const params: EVParams = {
    chargerCount: params.chargerCount,
    powerPerChargerKw: params.advParams?.powerPerChargerKw || 7.0,
    dailyUtilHours: params.advParams?.dailyUtilHours || 4.0,
    serviceFeePerKwh: params.advParams?.serviceFeePerKwh || 0.5,
  };

  await calculateEV(params);
};
```

## 注意事项

1. **保持UI风格不变**: API集成不应改变现有的UI布局和样式
2. **降级支持**: 当API不可用时，自动降级到本地计算
3. **状态管理**: 使用`updateModule`方法更新模块数据，确保状态正确同步
4. **用户反馈**: 显示计算状态和结果，提供清晰的用户体验

## 测试

1. 启动后端API服务: `python api/main.py`
2. 启动前端开发服务器: `npm run dev`
3. 访问光伏模块页面，点击"API计算"按钮
4. 验证计算结果正确显示在右侧栏
5. 测试API不可用时的降级行为
