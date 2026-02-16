import React, { useState, useEffect, useMemo } from 'react';
import { useProject, Transformer, Bill } from '../context/ProjectContext';

// --- Types ---

interface EquipmentItem {
    id: number;
    name: string;
    type?: string; // For HVAC/Water categories
    health?: string; // New: For HVAC health/age
    cop?: number;    // New: For HVAC COP
    power: number; // kW (or W for lighting)
    count: number;
    param?: number; // Extra param like hours or area coverage
}

interface Building {
    id: number;
    name: string;
    type: string;
    area: number;
    systems: {
        lighting: { 
            enabled: boolean; 
            mode: 'density' | 'list'; 
            density: number; // W/m2
            items: EquipmentItem[]; 
        };
        hvac: { 
            enabled: boolean; 
            items: EquipmentItem[]; 
        };
        water: { 
            enabled: boolean; 
            items: EquipmentItem[]; 
        };
        production: { 
            enabled: boolean; 
            items: EquipmentItem[]; 
        };
    };
}

const defaultBuildings: Building[] = [
    { 
        id: 1, 
        name: '1号生产车间', 
        type: '工厂 (Factory)', 
        area: 12500,
        systems: {
            lighting: { 
                enabled: true, 
                mode: 'density', 
                density: 12, 
                items: [
                    { id: 1, name: '金卤灯 (High Bay)', power: 250, count: 200 },
                    { id: 2, name: 'T8 荧光灯管', power: 36, count: 500 }
                ] 
            },
            hvac: { 
                enabled: true, 
                items: [
                    { id: 1, name: '1# 离心冷水机组', type: '水冷冷水机组 (Chiller)', health: '良 (5-10年)', cop: 5.2, power: 450, count: 2 },
                    { id: 2, name: '组合式空调箱 (AHU)', type: '风冷模块机组', health: '优 (1-5年)', power: 45, count: 8 }
                ]
            },
            water: { 
                enabled: false, 
                items: [
                    { id: 1, name: '燃气热水锅炉', type: 'Boiler', power: 200, count: 1 }
                ] 
            },
            production: { 
                enabled: true, 
                items: [
                    { id: 1, name: 'SMT 贴片产线', power: 350, count: 4 },
                    { id: 2, name: '空压机组', power: 132, count: 3 }
                ]
            }
        }
    },
    { 
        id: 2, 
        name: '研发中心大楼', 
        type: '办公楼 (Office)', 
        area: 4800,
        systems: {
            lighting: { 
                enabled: true, 
                mode: 'density', 
                density: 9, 
                items: [] 
            },
            hvac: { 
                enabled: true, 
                items: [
                    { id: 1, name: 'VRV 多联机外机', type: '多联机 (VRF)', health: '优 (1-5年)', power: 25, count: 20 }
                ] 
            },
            water: { 
                enabled: true, 
                items: [
                    { id: 1, name: '容积式电热水器', type: 'Heater', power: 15, count: 4 }
                ] 
            },
            production: { 
                enabled: false, 
                items: [] 
            }
        } 
    },
];

const ProjectEntry: React.FC = () => {
  const { transformers, setTransformers, bills, setBills, saveProject, projectBaseInfo, setProjectBaseInfo } = useProject();

  // Region State (Hydrate from Context)
  const [projectName, setProjectName] = useState(projectBaseInfo.name);
  const [province, setProvince] = useState(projectBaseInfo.province);
  const [city, setCity] = useState(projectBaseInfo.city);
  const [projectType, setProjectType] = useState(projectBaseInfo.type);

  // Building State (Hydrate from Context)
  const [buildings, setBuildings] = useState<Building[]>(
      (projectBaseInfo.buildings && projectBaseInfo.buildings.length > 0) 
      ? projectBaseInfo.buildings 
      : defaultBuildings
  );
  
  const [targetBuildingId, setTargetBuildingId] = useState<number>(buildings.length > 0 ? buildings[0].id : 0);

  // Estimation Mode State
  const [estimationMode, setEstimationMode] = useState<'auto' | 'manual'>('manual');
  const [isScanning, setIsScanning] = useState(false);

  // System Config Tab State
  const [activeSystemTab, setActiveSystemTab] = useState<'lighting' | 'hvac' | 'water' | 'production'>('lighting');

  // Transformer & Bill Local State
  const [isImporting, setIsImporting] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [showImportError, setShowImportError] = useState(false);
  const [importErrorMsg, setImportErrorMsg] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sync target building if buildings change
  useEffect(() => {
    if (buildings.length > 0 && !buildings.find(b => b.id === targetBuildingId)) {
      setTargetBuildingId(buildings[0].id);
    }
  }, [buildings, targetBuildingId]);

  // Sync to Global Context whenever local state changes
  useEffect(() => {
      setProjectBaseInfo({
          name: projectName,
          type: projectType,
          province,
          city,
          buildings
      });
  }, [projectName, projectType, province, city, buildings, setProjectBaseInfo]);

  // --- Handlers ---

  const handleAddBuilding = () => {
    const newId = buildings.length > 0 ? Math.max(...buildings.map(b => b.id)) + 1 : 1;
    const newBuilding: Building = {
        id: newId,
        name: `新建建筑 ${newId}`,
        type: '未定义',
        area: 1000,
        systems: {
            lighting: { enabled: true, mode: 'density', density: 10, items: [] },
            hvac: { enabled: true, items: [] },
            water: { enabled: false, items: [] },
            production: { enabled: false, items: [] }
        }
    };
    setBuildings([...buildings, newBuilding]);
    setTargetBuildingId(newId);
  };

  const handleDeleteBuilding = (id: number) => {
    setBuildings(buildings.filter(b => b.id !== id));
    if (targetBuildingId === id && buildings.length > 1) {
        setTargetBuildingId(buildings[0].id === id ? buildings[1].id : buildings[0].id);
    }
  };

  const handleBuildingChange = (id: number, field: string, value: string | number) => {
    setBuildings(buildings.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  // -- Deep Update Handlers --

  const toggleSystemEnabled = (buildingId: number, systemKey: keyof Building['systems']) => {
      setBuildings(prev => prev.map(b => {
          if (b.id !== buildingId) return b;
          return {
              ...b,
              systems: {
                  ...b.systems,
                  [systemKey]: {
                      ...b.systems[systemKey],
                      enabled: !b.systems[systemKey].enabled
                  }
              }
          };
      }));
  };

  const updateLightingMode = (buildingId: number, mode: 'density' | 'list') => {
      setBuildings(prev => prev.map(b => {
          if (b.id !== buildingId) return b;
          return {
              ...b,
              systems: { ...b.systems, lighting: { ...b.systems.lighting, mode } }
          };
      }));
  };

  const updateLightingDensity = (buildingId: number, density: number) => {
      setBuildings(prev => prev.map(b => {
          if (b.id !== buildingId) return b;
          return {
              ...b,
              systems: { ...b.systems, lighting: { ...b.systems.lighting, density } }
          };
      }));
  };

  // Generic Item Handlers (Add/Remove/Update) for arrays
  const addSystemItem = (buildingId: number, systemKey: keyof Building['systems']) => {
      setBuildings(prev => prev.map(b => {
          if (b.id !== buildingId) return b;
          const currentItems = b.systems[systemKey].items;
          const newId = currentItems.length > 0 ? Math.max(...currentItems.map(i => i.id)) + 1 : 1;
          
          let newItem: EquipmentItem = { 
              id: newId, 
              name: '新设备', 
              power: 10, 
              count: 1 
          };

          if (systemKey === 'hvac') {
              newItem = { ...newItem, type: '多联机 (VRF)', health: '优 (1-5年)', power: 25 };
          } else if (systemKey === 'lighting') {
              newItem = { ...newItem, power: 20 };
          } else {
              newItem = { ...newItem, type: 'Type A' };
          }
          
          return {
              ...b,
              systems: {
                  ...b.systems,
                  [systemKey]: {
                      ...b.systems[systemKey],
                      items: [...currentItems, newItem]
                  }
              }
          };
      }));
  };

  const removeSystemItem = (buildingId: number, systemKey: keyof Building['systems'], itemId: number) => {
      setBuildings(prev => prev.map(b => {
          if (b.id !== buildingId) return b;
          return {
              ...b,
              systems: {
                  ...b.systems,
                  [systemKey]: {
                      ...b.systems[systemKey],
                      items: b.systems[systemKey].items.filter(i => i.id !== itemId)
                  }
              }
          };
      }));
  };

  const updateSystemItem = (buildingId: number, systemKey: keyof Building['systems'], itemId: number, field: keyof EquipmentItem, value: any) => {
      setBuildings(prev => prev.map(b => {
          if (b.id !== buildingId) return b;
          return {
              ...b,
              systems: {
                  ...b.systems,
                  [systemKey]: {
                      ...b.systems[systemKey],
                      items: b.systems[systemKey].items.map(i => i.id === itemId ? { ...i, [field]: value } : i)
                  }
              }
          };
      }));
  };


  const handleModeChange = (mode: 'auto' | 'manual') => {
      setEstimationMode(mode);
      if (mode === 'auto') {
          setIsScanning(true);
          setTimeout(() => setIsScanning(false), 2000); 
      }
  };

  const handleAddTransformer = () => {
      const newId = transformers.length > 0 ? Math.max(...transformers.map(t => t.id)) + 1 : 1;
      setTransformers([...transformers, { id: newId, name: `#${newId} 变压器`, capacity: 1000, voltageLevel: '10kV' }]);
  };

  const handleTransformerChange = (id: number, field: keyof Transformer, value: any) => {
      setTransformers(transformers.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleDeleteTransformer = (id: number) => {
      setTransformers(transformers.filter(t => t.id !== id));
  };

  const handleSmartImportBills = () => {
      fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsImporting(true);
      setShowImportError(false);
      setImportFileName(file.name);

      try {
          const text = await file.text();
          let importedBills: Bill[] = [];

          if (file.name.endsWith('.csv')) {
              // CSV Parsing
              const lines = text.split('\n').filter(line => line.trim());
              // Check if first line is header
              const startIndex = lines[0].toLowerCase().includes('month') || lines[0].toLowerCase().includes('月份') ? 1 : 0;

              for (let i = startIndex; i < lines.length; i++) {
                  const parts = lines[i].split(/[,，]/).map(p => p.trim());
                  if (parts.length >= 3) {
                      const month = parts[0].trim();
                      const kwh = parseFloat(parts[1]);
                      const cost = parseFloat(parts[2]);
                      if (!isNaN(kwh) && !isNaN(cost)) {
                          importedBills.push({
                              id: i - startIndex + 1,
                              month: month,
                              kwh: kwh,
                              cost: cost
                          });
                      }
                  }
              }
          } else if (file.name.endsWith('.json')) {
              // JSON Parsing
              const data = JSON.parse(text);
              if (Array.isArray(data)) {
                  importedBills = data.map((item: any, index: number) => ({
                      id: index + 1,
                      month: item.month ?? item.月份 ?? item.Month ?? item.date ?? item.日期 ?? '',
                      kwh: parseFloat(item.kwh ?? item.用电量 ?? item.kWh ?? item.energy ?? 0),
                      cost: parseFloat(item.cost ?? item.电费 ?? item.amount ?? 0)
                  })).filter(b => !isNaN(b.kwh) && !isNaN(b.cost) && b.month);
              }
          } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
              // For Excel files, we need to read as ArrayBuffer and parse
              const arrayBuffer = await file.arrayBuffer();
              // Note: This requires xlsx library, if not available, use fallback
              try {
                  const XLSX = await import('xlsx');
                  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                  const sheetName = workbook.SheetNames[0];
                  const worksheet = workbook.Sheets[sheetName];
                  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                  // Find header row
                  let headerIndex = 0;
                  if (jsonData.length > 0) {
                      const firstRow = jsonData[0] as string[];
                      if (firstRow.some((cell: string) =>
                          (cell && cell.toLowerCase().includes('month')) ||
                          (cell && cell.includes('月份'))
                      )) {
                          headerIndex = 1;
                      }
                  }

                  for (let i = headerIndex; i < jsonData.length; i++) {
                      const row = jsonData[i];
                      if (row && row.length >= 3) {
                          const month = String(row[0] || '').trim();
                          const kwh = parseFloat(row[1]);
                          const cost = parseFloat(row[2]);
                          if (!isNaN(kwh) && !isNaN(cost) && month) {
                              importedBills.push({
                                  id: i - headerIndex + 1,
                                  month: month,
                                  kwh: kwh,
                                  cost: cost
                              });
                          }
                      }
                  }
              } catch (excelError) {
                  throw new Error('Excel文件解析失败，请确保文件格式正确');
              }
          } else {
              throw new Error('不支持的文件格式，请上传 .csv、.json 或 .xlsx 文件');
          }

          if (importedBills.length === 0) {
              throw new Error('未找到有效的电费数据，请检查文件格式');
          }

          setBills(importedBills);
          setIsImporting(false);
      } catch (error) {
          setIsImporting(false);
          setShowImportError(true);
          setImportErrorMsg(error instanceof Error ? error.message : '文件解析失败');
      }

      // Reset file input
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  };

  const handleClearImport = () => {
      setBills([]);
      setImportFileName('');
      setShowImportError(false);
  };

  const systemsMenu = [
      { id: 'lighting', label: '照明系统', icon: 'lightbulb' },
      { id: 'hvac', label: '暖通空调', icon: 'ac_unit' },
      { id: 'water', label: '热水系统', icon: 'water_drop' },
      { id: 'production', label: '生产系统', icon: 'precision_manufacturing' },
  ];
  
  // Get current active building object
  const currentBuilding = buildings.find(b => b.id === targetBuildingId) || buildings[0];
  const currentSystemConfig = currentBuilding ? currentBuilding.systems[activeSystemTab] : null;

  // --- Calculations ---
  // Helper to calculate building load (KW)
  const calculateBuildingLoad = (b: Building) => {
      let totalKW = 0;
      
      // 1. Lighting
      if (b.systems.lighting.enabled) {
          if (b.systems.lighting.mode === 'density') {
              totalKW += (b.systems.lighting.density * b.area) / 1000;
          } else {
              const listSumW = b.systems.lighting.items.reduce((acc, item) => acc + (item.power * item.count), 0);
              totalKW += listSumW / 1000; // Lighting items stored in Watts usually
          }
      }

      // 2. HVAC (stored in kW)
      if (b.systems.hvac.enabled) {
          totalKW += b.systems.hvac.items.reduce((acc, item) => acc + (item.power * item.count), 0);
      }

      // 3. Water (stored in kW)
      if (b.systems.water.enabled) {
          totalKW += b.systems.water.items.reduce((acc, item) => acc + (item.power * item.count), 0);
      }

      // 4. Production (stored in kW)
      if (b.systems.production.enabled) {
          totalKW += b.systems.production.items.reduce((acc, item) => acc + (item.power * item.count), 0);
      }

      return totalKW;
  };

  // Aggregated Load Calculation across all buildings and enabled systems
  const totalLoadMW = useMemo(() => {
      let totalKW = 0;
      buildings.forEach(b => {
          totalKW += calculateBuildingLoad(b);
      });
      return (totalKW / 1000).toFixed(2); // Convert to MW
  }, [buildings]);

  // Render Helper for List Tables
  const renderItemTable = (
      systemKey: keyof Building['systems'], 
      items: EquipmentItem[], 
      powerUnitLabel: string, 
      showType: boolean
    ) => (
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-xs text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                      <th className="px-4 py-3">设备/灯具名称</th>
                      
                      {systemKey === 'hvac' ? (
                          <>
                            <th className="px-4 py-3">类型型号形式</th>
                            <th className="px-4 py-3">系统健康度/年限</th>
                            <th className="px-4 py-3">COP (可选)</th>
                          </>
                      ) : (
                          showType && <th className="px-4 py-3">类型/型号</th>
                      )}

                      <th className="px-4 py-3">单台功率 ({powerUnitLabel})</th>
                      <th className="px-4 py-3">数量</th>
                      <th className="px-4 py-3 text-right">合计功率</th>
                      <th className="px-4 py-3 w-10"></th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item) => (
                      <tr key={item.id} className="group hover:bg-slate-50">
                          <td className="px-4 py-2">
                              <input 
                                  value={item.name} 
                                  onChange={(e) => updateSystemItem(currentBuilding.id, systemKey, item.id, 'name', e.target.value)}
                                  className="w-full min-w-[120px] bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary text-slate-700 font-medium"
                                  placeholder="输入名称"
                              />
                          </td>
                          
                          {systemKey === 'hvac' ? (
                              <>
                                <td className="px-4 py-2">
                                    <select
                                        value={item.type || '多联机 (VRF)'}
                                        onChange={(e) => updateSystemItem(currentBuilding.id, systemKey, item.id, 'type', e.target.value)}
                                        className="w-[160px] bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary text-slate-600 appearance-none cursor-pointer"
                                    >
                                        <option>多联机 (VRF)</option>
                                        <option>水冷冷水机组 (Chiller)</option>
                                        <option>风冷模块机组</option>
                                        <option>分体空调 (Split AC)</option>
                                    </select>
                                </td>
                                <td className="px-4 py-2">
                                    <select
                                        value={item.health || '良 (5-10年)'}
                                        onChange={(e) => updateSystemItem(currentBuilding.id, systemKey, item.id, 'health', e.target.value)}
                                        className={`w-[130px] bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary text-xs font-medium appearance-none cursor-pointer
                                            ${item.health?.includes('优') ? 'text-green-600' : item.health?.includes('差') ? 'text-red-500' : 'text-slate-600'}
                                        `}
                                    >
                                        <option>优 (1-5年)</option>
                                        <option>良 (5-10年)</option>
                                        <option>差 (10年以上)</option>
                                    </select>
                                </td>
                                <td className="px-4 py-2">
                                    <input 
                                        type="number"
                                        step="0.1"
                                        value={item.cop || ''}
                                        onChange={(e) => updateSystemItem(currentBuilding.id, systemKey, item.id, 'cop', parseFloat(e.target.value))}
                                        className="w-16 bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary text-slate-600 text-center"
                                        placeholder="-"
                                    />
                                </td>
                              </>
                          ) : (
                              showType && (
                                <td className="px-4 py-2">
                                    <input 
                                        value={item.type || ''} 
                                        onChange={(e) => updateSystemItem(currentBuilding.id, systemKey, item.id, 'type', e.target.value)}
                                        className="w-full min-w-[100px] bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary text-slate-600"
                                        placeholder="输入类型"
                                    />
                                </td>
                              )
                          )}

                          <td className="px-4 py-2">
                              <input 
                                  type="number"
                                  value={item.power} 
                                  onChange={(e) => updateSystemItem(currentBuilding.id, systemKey, item.id, 'power', parseFloat(e.target.value))}
                                  className="w-24 bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary text-slate-600"
                              />
                          </td>
                          <td className="px-4 py-2">
                              <input 
                                  type="number"
                                  value={item.count} 
                                  onChange={(e) => updateSystemItem(currentBuilding.id, systemKey, item.id, 'count', parseFloat(e.target.value))}
                                  className="w-20 bg-white outline-none border border-slate-200 rounded px-2 py-1 focus:border-primary text-slate-600"
                              />
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-slate-700">
                              {(item.power * item.count).toLocaleString()} {powerUnitLabel}
                          </td>
                          <td className="px-4 py-2 text-center">
                              <button 
                                  onClick={() => removeSystemItem(currentBuilding.id, systemKey, item.id)}
                                  className="text-slate-300 hover:text-red-500 transition-colors"
                              >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                          </td>
                      </tr>
                  ))}
                  {items.length === 0 && (
                      <tr>
                          <td colSpan={systemKey === 'hvac' ? 8 : (showType ? 6 : 5)} className="px-4 py-8 text-center text-slate-400 text-xs">暂无设备，请添加</td>
                      </tr>
                  )}
              </tbody>
          </table>
          <div className="bg-slate-50/50 p-2 border-t border-slate-200">
              <button 
                  onClick={() => addSystemItem(currentBuilding.id, systemKey)}
                  className="w-full py-2 text-xs font-medium text-slate-500 hover:text-primary hover:bg-white border border-dashed border-slate-300 hover:border-primary/50 rounded-lg transition-all flex items-center justify-center gap-1"
              >
                  <span className="material-symbols-outlined text-[16px]">add</span> 添加一行
              </button>
          </div>
      </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="flex-1 overflow-y-auto p-8 pb-32 scroll-smooth">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="mb-8">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-3 font-medium">
                <span className="hover:text-primary transition-colors cursor-pointer">项目概览</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-slate-600">项目信息录入</span>
                </div>
                <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">项目信息录入</h2>
                <p className="text-sm text-slate-500 mt-2">请填写项目详细参数以进行后续碳减排及价值评估</p>
                </div>
            </div>

            {/* Basic Info */}
            <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">apartment</span>
                    </div>
                    <div>
                    <h3 className="text-lg font-bold text-slate-800">基础信息</h3>
                    <p className="text-xs text-slate-500">填写项目的基本位置与属性</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 ml-1">项目名称 <span className="text-red-500">*</span></label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm text-slate-700 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" 
                            placeholder="请输入项目名称" 
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 ml-1">项目类型 <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <select 
                                value={projectType}
                                onChange={(e) => {
                                    setProjectType(e.target.value);
                                    setActiveSystemTab('lighting'); // Reset tab on type change
                                }}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm text-slate-700 appearance-none cursor-pointer focus:bg-white focus:border-primary"
                            >
                                <option value="factory">零碳工厂 (Factory)</option>
                                <option value="school">零碳学校 (School)</option>
                                <option value="office">零碳商办 (Office)</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400 pointer-events-none text-[20px]">expand_more</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 ml-1">所在地区 <span className="text-red-500">*</span></label>
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <select 
                                value={province}
                                onChange={(e) => { setProvince(e.target.value); setCity(''); }}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm text-slate-700 appearance-none cursor-pointer focus:bg-white focus:border-primary"
                            >
                                <option value="" disabled>选择省份</option>
                                <option value="Shanghai">上海市</option>
                                <option value="Jiangsu">江苏省</option>
                                <option value="Zhejiang">浙江省</option>
                                <option value="Guangdong">广东省</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400 pointer-events-none text-[20px]">expand_more</span>
                        </div>
                        <div className="relative flex-1">
                            <select 
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm text-slate-700 appearance-none cursor-pointer focus:bg-white focus:border-primary"
                            >
                                <option value="" disabled>选择城市/区</option>
                                {province === 'Shanghai' && <option value="Pudong">浦东新区</option>}
                                {province === 'Shanghai' && <option value="Minhang">闵行区</option>}
                                {province === 'Jiangsu' && <option value="Suzhou">苏州市</option>}
                                {province === 'Jiangsu' && <option value="Nanjing">南京市</option>}
                                {province === 'Zhejiang' && <option value="Hangzhou">杭州市</option>}
                                {province === 'Guangdong' && <option value="Shenzhen">深圳市</option>}
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400 pointer-events-none text-[20px]">expand_more</span>
                        </div>
                    </div>
                    </div>
                </div>

                {/* Building List Table */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <label className="text-sm font-semibold text-slate-700">建筑列表</label>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">共 {buildings.length} 栋建筑</span>
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-xs text-slate-500 font-semibold border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 w-1/3">建筑名称</th>
                                    <th className="px-6 py-4 w-1/4">建筑类型</th>
                                    <th className="px-6 py-4 w-1/4">总建筑面积 (㎡)</th>
                                    <th className="px-6 py-4 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {buildings.map((b) => (
                                    <tr key={b.id} className="group hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3">
                                            <input 
                                                value={b.name} 
                                                onChange={(e) => handleBuildingChange(b.id, 'name', e.target.value)}
                                                className="bg-white w-full outline-none font-medium border border-slate-200 rounded px-2 py-1 focus:border-primary" 
                                            />
                                        </td>
                                        <td className="px-6 py-3">
                                            <select 
                                                value={b.type}
                                                onChange={(e) => handleBuildingChange(b.id, 'type', e.target.value)}
                                                className="bg-white w-full outline-none text-slate-600 appearance-none cursor-pointer border border-slate-200 rounded px-2 py-1 focus:border-primary"
                                            >
                                                <option>工厂 (Factory)</option>
                                                <option>办公楼 (Office)</option>
                                                <option>仓库 (Warehouse)</option>
                                                <option>商业 (Retail)</option>
                                                <option>未定义</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-3">
                                            <input 
                                                type="number"
                                                value={b.area}
                                                onChange={(e) => handleBuildingChange(b.id, 'area', parseFloat(e.target.value))}
                                                className="bg-white w-full outline-none text-slate-600 border border-slate-200 rounded px-2 py-1 focus:border-primary"
                                            />
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <button 
                                                onClick={() => handleDeleteBuilding(b.id)}
                                                className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                                                title="删除"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {buildings.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm">暂无建筑，请点击下方按钮添加</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <div className="bg-slate-50/50 p-2 border-t border-slate-100">
                            <button 
                                onClick={handleAddBuilding}
                                className="w-full py-2.5 text-sm font-medium text-slate-600 hover:text-primary hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                                新增建筑条目
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ... Rest of the component (Power Distribution, Energy Consumption) ... */}
            {/* Keeping existing structure but implicitly they use context now for saving */}
            {/* Power Distribution & Bills */}
            <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-fade-in">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">electric_meter</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">配电与电费</h3>
                        <p className="text-xs text-slate-500">录入变压器信息与历史电费账单</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Transformers */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-sm font-semibold text-slate-700">变压器信息</label>
                            <button 
                                onClick={handleAddTransformer}
                                className="text-xs font-medium text-primary hover:text-primary-hover flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[16px]">add</span> 添加变压器
                            </button>
                        </div>
                        <div className="space-y-3">
                            {transformers.map((t) => (
                                <div key={t.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-3 relative group">
                                    <button 
                                        onClick={() => handleDeleteTransformer(t.id)}
                                        className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                    </button>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] text-slate-400 block mb-1">名称/编号</label>
                                            <input 
                                                value={t.name}
                                                onChange={(e) => handleTransformerChange(t.id, 'name', e.target.value)}
                                                className="w-full text-sm bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-primary" 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400 block mb-1">电压等级</label>
                                            <select 
                                                value={t.voltageLevel}
                                                onChange={(e) => handleTransformerChange(t.id, 'voltageLevel', e.target.value)}
                                                className="w-full text-sm bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-primary"
                                            >
                                                <option>10kV</option>
                                                <option>20kV</option>
                                                <option>35kV</option>
                                                <option>110kV</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400 block mb-1">额定容量 (kVA)</label>
                                            <input 
                                                type="number"
                                                value={t.capacity}
                                                onChange={(e) => handleTransformerChange(t.id, 'capacity', parseInt(e.target.value))}
                                                className="w-full text-sm bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-primary" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {transformers.length === 0 && (
                                <div className="p-6 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                                    暂无变压器信息，请添加
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bills */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-sm font-semibold text-slate-700">电费单录入</label>
                            <div className="flex items-center gap-2">
                                {importFileName && (
                                    <button
                                        onClick={handleClearImport}
                                        className="text-xs font-medium text-slate-500 hover:text-red-500 transition-colors flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">delete</span> 清除
                                    </button>
                                )}
                                <button
                                    onClick={handleSmartImportBills}
                                    disabled={isImporting}
                                    className={`text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${isImporting ? 'bg-slate-100 text-slate-400' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                                >
                                    {isImporting ? (
                                        <><span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span> 解析中...</>
                                    ) : (
                                        <><span className="material-symbols-outlined text-[16px]">upload_file</span> 导入文件</>
                                    )}
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.json,.xlsx,.xls"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </div>
                        </div>
                        {/* Import Status */}
                        {importFileName && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-lg text-xs">
                                <span className="material-symbols-outlined text-green-600 text-[16px]">check_circle</span>
                                <span className="text-green-700">已导入: {importFileName} ({bills.length} 条记录)</span>
                            </div>
                        )}
                        {showImportError && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs">
                                <span className="material-symbols-outlined text-red-600 text-[16px]">error</span>
                                <span className="text-red-700">{importErrorMsg}</span>
                            </div>
                        )}
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-[300px] overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-xs text-slate-500 font-semibold sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-2">月份</th>
                                        <th className="px-4 py-2">用电量 (kWh)</th>
                                        <th className="px-4 py-2 text-right">总电费 (元)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {bills.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                                                可手动填写或上传 CSV/JSON/Excel 文件导入电费数据
                                                <div className="text-[10px] mt-1 text-slate-300">
                                                    支持 CSV: 月份,用电量(kWh),电费(元) | JSON: [{month, kwh, cost}]
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        bills.map((bill) => (
                                            <tr key={bill.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-2 text-slate-700 font-medium">{bill.month}</td>
                                                <td className="px-4 py-2 text-slate-600">{bill.kwh.toLocaleString()}</td>
                                                <td className="px-4 py-2 text-right text-slate-600">¥ {bill.cost.toLocaleString()}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>

            {/* Energy Consumption - Estimation & Manual Config (This part reused activeSystemTab and currentBuilding, which rely on state we already persisted) */}
            {/* The rest of the component uses the building state which is now persisted in context */}
            <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">settings_suggest</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">能耗详情配置</h3>
                        <p className="text-xs text-slate-500">配置各建筑分项能耗数据</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl mb-8 max-w-lg mx-auto">
                    <button 
                        onClick={() => handleModeChange('auto')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${estimationMode === 'auto' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        智能估算 (Auto)
                    </button>
                    <button 
                        onClick={() => handleModeChange('manual')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${estimationMode === 'manual' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        手动录入 (Manual)
                    </button>
                </div>

                {estimationMode === 'auto' ? (
                        <div className="text-center py-12 px-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                            {isScanning ? (
                                <div className="flex flex-col items-center">
                                    <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
                                    <h4 className="text-lg font-bold text-slate-800">正在进行 AI 建筑能耗建模...</h4>
                                    <p className="text-sm text-slate-500 mt-2">基于地理位置、建筑类型与面积匹配历史数据库</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center animate-fade-in">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                        <span className="material-symbols-outlined text-[32px]">check_circle</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-800">智能估算已完成</h4>
                                    <p className="text-sm text-slate-500 mt-2 mb-6">已自动匹配 <span className="font-bold text-slate-900">4</span> 个相似工业园区模型</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mb-6">
                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                            <p className="text-xs text-slate-500">年总用电量预估</p>
                                            <p className="text-xl font-bold text-slate-900 mt-1">145.2 <span className="text-xs font-normal">万kWh</span></p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                            <p className="text-xs text-slate-500">主要能耗来源</p>
                                            <p className="text-xl font-bold text-slate-900 mt-1">
                                                {projectType === 'factory' ? '生产设备' : '暖通空调'} 
                                                <span className="text-xs font-normal"> 65%</span>
                                            </p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                            <p className="text-xs text-slate-500">节能潜力等级</p>
                                            <p className="text-xl font-bold text-green-600 mt-1">High <span className="text-xs font-normal text-slate-400">A级</span></p>
                                        </div>
                                    </div>
                                    
                                    <button className="text-primary text-sm font-medium hover:underline" onClick={() => handleModeChange('manual')}>查看或修正详细数据 &rarr;</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Manual Entry Content */
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                                    分项能耗详情 (按建筑独立配置)
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">当前配置建筑:</span>
                                    <div className="relative">
                                        <select 
                                            value={targetBuildingId}
                                            onChange={(e) => setTargetBuildingId(Number(e.target.value))}
                                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-primary pr-8 appearance-none cursor-pointer shadow-sm"
                                        >
                                            {buildings.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-2 top-1.5 text-slate-400 pointer-events-none text-[16px]">expand_more</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-100 pb-2">
                                {systemsMenu.map(sys => (
                                    <button 
                                        key={sys.id}
                                        onClick={() => setActiveSystemTab(sys.id as any)}
                                        className={`px-5 py-2.5 rounded-t-xl text-sm font-medium flex items-center gap-2 transition-all relative top-[1px] ${activeSystemTab === sys.id ? 'bg-primary text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">{sys.icon}</span> {sys.label}
                                    </button>
                                ))}
                            </div>

                            <div className={`p-8 rounded-2xl border transition-all relative overflow-hidden min-h-[300px] ${currentSystemConfig?.enabled ? 'border-primary/20 bg-primary/5' : 'border-slate-200 bg-slate-50'}`}>
                                {activeSystemTab === 'lighting' && currentBuilding && (
                                    <div className="animate-fade-in">
                                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/50">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl shadow-sm flex items-center justify-center transition-colors ${currentBuilding.systems.lighting.enabled ? 'bg-white text-yellow-500' : 'bg-slate-200 text-slate-400'}`}>
                                                    <span className="material-symbols-outlined text-[24px]">lightbulb</span>
                                                </div>
                                                <div>
                                                    <h4 className={`font-bold text-lg ${currentBuilding.systems.lighting.enabled ? 'text-slate-800' : 'text-slate-500'}`}>照明系统配置</h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">配置 {currentBuilding.name} 的灯具功率与控制</p>
                                                </div>
                                            </div>
                                            <label className="flex items-center cursor-pointer gap-3">
                                                <span className={`text-sm font-medium ${currentBuilding.systems.lighting.enabled ? 'text-primary' : 'text-slate-400'}`}>
                                                    {currentBuilding.systems.lighting.enabled ? '已启用' : '未启用'}
                                                </span>
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer"
                                                    checked={currentBuilding.systems.lighting.enabled}
                                                    onChange={(e) => toggleSystemEnabled(currentBuilding.id, 'lighting')}
                                                />
                                                <div className="relative w-12 h-6 bg-slate-300 peer-checked:bg-primary rounded-full transition-colors">
                                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${currentBuilding.systems.lighting.enabled ? 'translate-x-6' : ''}`}></div>
                                                </div>
                                            </label>
                                        </div>

                                        <div className={`transition-opacity ${currentBuilding.systems.lighting.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                            {/* Mode Selector */}
                                            <div className="flex items-center gap-4 mb-6">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="radio" 
                                                        name="lightingMode" 
                                                        className="accent-primary"
                                                        checked={currentBuilding.systems.lighting.mode === 'density'}
                                                        onChange={() => updateLightingMode(currentBuilding.id, 'density')}
                                                    />
                                                    <span className="text-sm font-medium text-slate-700">智能估算 (功率密度)</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="radio" 
                                                        name="lightingMode" 
                                                        className="accent-primary"
                                                        checked={currentBuilding.systems.lighting.mode === 'list'}
                                                        onChange={() => updateLightingMode(currentBuilding.id, 'list')}
                                                    />
                                                    <span className="text-sm font-medium text-slate-700">手动清单 (灯具列表)</span>
                                                </label>
                                            </div>

                                            {currentBuilding.systems.lighting.mode === 'density' ? (
                                                <div className="space-y-4 max-w-md bg-white p-6 rounded-xl border border-slate-200">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-semibold text-slate-700 flex justify-between">
                                                            功率密度 (W/㎡) <span className="text-xs text-slate-400 font-normal">建议值: 8-12</span>
                                                        </label>
                                                        <div className="relative">
                                                            <input 
                                                                type="number" 
                                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm focus:border-primary" 
                                                                value={currentBuilding.systems.lighting.density}
                                                                onChange={(e) => updateLightingDensity(currentBuilding.id, parseFloat(e.target.value))}
                                                            />
                                                            <span className="absolute right-4 top-3 text-xs text-slate-400 font-medium">W/㎡</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 pt-1">
                                                            预估总负荷: <span className="font-bold text-primary">{((currentBuilding.systems.lighting.density * currentBuilding.area) / 1000).toFixed(1)} kW</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                renderItemTable('lighting', currentBuilding.systems.lighting.items, 'W', false)
                                            )}
                                        </div>
                                    </div>
                                )}
                                {/* Other tabs logic is same as before, essentially rendering based on currentBuilding state which is now persisted */}
                                {/* ... (HVAC, Water, Production render blocks - identical to previous file but using persisted state) ... */}
                                {activeSystemTab === 'hvac' && currentBuilding && (
                                    <div className="animate-fade-in">
                                         {/* ... HVAC Render Logic ... */}
                                         <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/50">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl shadow-sm flex items-center justify-center transition-colors ${currentBuilding.systems.hvac.enabled ? 'bg-white text-blue-500' : 'bg-slate-200 text-slate-400'}`}>
                                                    <span className="material-symbols-outlined text-[24px]">ac_unit</span>
                                                </div>
                                                <div>
                                                    <h4 className={`font-bold text-lg ${currentBuilding.systems.hvac.enabled ? 'text-slate-800' : 'text-slate-500'}`}>暖通空调配置</h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">配置 {currentBuilding.name} 的制冷/制热设备</p>
                                                </div>
                                            </div>
                                            <label className="flex items-center cursor-pointer gap-3">
                                                <span className={`text-sm font-medium ${currentBuilding.systems.hvac.enabled ? 'text-primary' : 'text-slate-400'}`}>
                                                    {currentBuilding.systems.hvac.enabled ? '已启用' : '未启用'}
                                                </span>
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer"
                                                    checked={currentBuilding.systems.hvac.enabled}
                                                    onChange={(e) => toggleSystemEnabled(currentBuilding.id, 'hvac')}
                                                />
                                                <div className="relative w-12 h-6 bg-slate-300 peer-checked:bg-primary rounded-full transition-colors">
                                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${currentBuilding.systems.hvac.enabled ? 'translate-x-6' : ''}`}></div>
                                                </div>
                                            </label>
                                        </div>
                                        <div className={`transition-opacity ${currentBuilding.systems.hvac.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                            {renderItemTable('hvac', currentBuilding.systems.hvac.items, 'kW', true)}
                                        </div>
                                    </div>
                                )}

                                {activeSystemTab === 'water' && currentBuilding && (
                                    <div className="animate-fade-in">
                                        {/* ... Water Render Logic ... */}
                                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/50">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl shadow-sm flex items-center justify-center transition-colors ${currentBuilding.systems.water.enabled ? 'bg-white text-cyan-500' : 'bg-slate-200 text-slate-400'}`}>
                                                    <span className="material-symbols-outlined text-[24px]">water_drop</span>
                                                </div>
                                                <div>
                                                    <h4 className={`font-bold text-lg ${currentBuilding.systems.water.enabled ? 'text-slate-800' : 'text-slate-500'}`}>热水系统配置</h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">配置 {currentBuilding.name} 的生活/工艺热水</p>
                                                </div>
                                            </div>
                                            <label className="flex items-center cursor-pointer gap-3">
                                                <span className={`text-sm font-medium ${currentBuilding.systems.water.enabled ? 'text-primary' : 'text-slate-400'}`}>
                                                    {currentBuilding.systems.water.enabled ? '已启用' : '未启用'}
                                                </span>
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer"
                                                    checked={currentBuilding.systems.water.enabled}
                                                    onChange={(e) => toggleSystemEnabled(currentBuilding.id, 'water')}
                                                />
                                                <div className="relative w-12 h-6 bg-slate-300 peer-checked:bg-primary rounded-full transition-colors">
                                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${currentBuilding.systems.water.enabled ? 'translate-x-6' : ''}`}></div>
                                                </div>
                                            </label>
                                        </div>
                                        <div className={`transition-opacity ${currentBuilding.systems.water.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                            {renderItemTable('water', currentBuilding.systems.water.items, 'kW', true)}
                                        </div>
                                    </div>
                                )}

                                {activeSystemTab === 'production' && currentBuilding && (
                                    <div className="animate-fade-in">
                                        {/* ... Production Render Logic ... */}
                                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/50">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl shadow-sm flex items-center justify-center transition-colors ${currentBuilding.systems.production.enabled ? 'bg-white text-purple-500' : 'bg-slate-200 text-slate-400'}`}>
                                                    <span className="material-symbols-outlined text-[24px]">precision_manufacturing</span>
                                                </div>
                                                <div>
                                                    <h4 className={`font-bold text-lg ${currentBuilding.systems.production.enabled ? 'text-slate-800' : 'text-slate-500'}`}>生产设备配置</h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">配置 {currentBuilding.name} 的产线与动力设备</p>
                                                </div>
                                            </div>
                                            <label className="flex items-center cursor-pointer gap-3">
                                                <span className={`text-sm font-medium ${currentBuilding.systems.production.enabled ? 'text-primary' : 'text-slate-400'}`}>
                                                    {currentBuilding.systems.production.enabled ? '已启用' : '未启用'}
                                                </span>
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer"
                                                    checked={currentBuilding.systems.production.enabled}
                                                    onChange={(e) => toggleSystemEnabled(currentBuilding.id, 'production')}
                                                />
                                                <div className="relative w-12 h-6 bg-slate-300 peer-checked:bg-primary rounded-full transition-colors">
                                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${currentBuilding.systems.production.enabled ? 'translate-x-6' : ''}`}></div>
                                                </div>
                                            </label>
                                        </div>
                                        <div className={`transition-opacity ${currentBuilding.systems.production.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                            {renderItemTable('production', currentBuilding.systems.production.items, 'kW', false)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Summary Section */}
                            <div className="mt-8 bg-slate-100 rounded-2xl p-6 border border-slate-200 animate-fade-in">
                                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-[18px]">fact_check</span>
                                    配置汇总与校核
                                </h4>
                                <div className="grid grid-cols-1 gap-4">
                                    {buildings.map(b => {
                                        const load = calculateBuildingLoad(b);
                                        return (
                                            <div key={b.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6">
                                                {/* Building Info */}
                                                <div className="w-full md:w-1/4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="material-symbols-outlined text-slate-400 text-[20px]">domain</span>
                                                        <span className="font-bold text-slate-800">{b.name}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 pl-7">
                                                        {b.type} | {b.area.toLocaleString()} ㎡
                                                    </div>
                                                </div>

                                                {/* Systems Status */}
                                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                                                    {/* Lighting */}
                                                    <div className={`flex items-center gap-2 p-2 rounded-lg border ${b.systems.lighting.enabled ? 'bg-yellow-50 border-yellow-100' : 'bg-slate-50 border-transparent opacity-50'}`}>
                                                        <span className={`material-symbols-outlined text-[18px] ${b.systems.lighting.enabled ? 'text-yellow-600' : 'text-slate-400'}`}>lightbulb</span>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-slate-500">照明</span>
                                                            <span className="text-xs font-bold text-slate-700">
                                                                {b.systems.lighting.enabled 
                                                                    ? (b.systems.lighting.mode === 'density' ? `${b.systems.lighting.density} W/㎡` : `${b.systems.lighting.items.length} 种设备`) 
                                                                    : '停用'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {/* HVAC */}
                                                    <div className={`flex items-center gap-2 p-2 rounded-lg border ${b.systems.hvac.enabled ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-transparent opacity-50'}`}>
                                                        <span className={`material-symbols-outlined text-[18px] ${b.systems.hvac.enabled ? 'text-blue-600' : 'text-slate-400'}`}>ac_unit</span>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-slate-500">暖通空调</span>
                                                            <span className="text-xs font-bold text-slate-700">{b.systems.hvac.enabled ? `${b.systems.hvac.items.length} 种设备` : '停用'}</span>
                                                        </div>
                                                    </div>
                                                    {/* Water */}
                                                    <div className={`flex items-center gap-2 p-2 rounded-lg border ${b.systems.water.enabled ? 'bg-cyan-50 border-cyan-100' : 'bg-slate-50 border-transparent opacity-50'}`}>
                                                        <span className={`material-symbols-outlined text-[18px] ${b.systems.water.enabled ? 'text-cyan-600' : 'text-slate-400'}`}>water_drop</span>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-slate-500">热水</span>
                                                            <span className="text-xs font-bold text-slate-700">{b.systems.water.enabled ? `${b.systems.water.items.length} 种设备` : '停用'}</span>
                                                        </div>
                                                    </div>
                                                    {/* Production */}
                                                    <div className={`flex items-center gap-2 p-2 rounded-lg border ${b.systems.production.enabled ? 'bg-purple-50 border-purple-100' : 'bg-slate-50 border-transparent opacity-50'}`}>
                                                        <span className={`material-symbols-outlined text-[18px] ${b.systems.production.enabled ? 'text-purple-600' : 'text-slate-400'}`}>precision_manufacturing</span>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-slate-500">生产</span>
                                                            <span className="text-xs font-bold text-slate-700">{b.systems.production.enabled ? `${b.systems.production.items.length} 种设备` : '停用'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Load Summary */}
                                                <div className="w-full md:w-auto min-w-[120px] text-right border-l border-slate-200 pl-6 hidden md:block">
                                                    <span className="text-[10px] text-slate-400 uppercase font-medium">预估负荷</span>
                                                    <div className="text-lg font-bold text-primary">{load.toFixed(1)} <span className="text-xs font-normal text-slate-500">kW</span></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
            </section>
          </div>
      </div>
      
      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-64 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 px-8 z-40 flex flex-col gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
           {/* Summary Info */}
           <div className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 mb-1">
               <div className="flex gap-8">
                   <div className="flex flex-col">
                       <span className="text-[10px] text-slate-400 uppercase font-medium">建筑总数</span>
                       <span className="text-sm font-bold text-slate-700">{buildings.length} <span className="text-[10px] font-normal">栋</span></span>
                   </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] text-slate-400 uppercase font-medium">变压器</span>
                       <span className="text-sm font-bold text-slate-700">{transformers.length} <span className="text-[10px] font-normal">台</span></span>
                   </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] text-slate-400 uppercase font-medium">预估总负荷 (所有建筑)</span>
                       <span className="text-sm font-bold text-primary">{totalLoadMW} <span className="text-[10px] font-normal">MW</span></span>
                   </div>
               </div>
               <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                   <span className="text-xs text-slate-500">数据实时同步中</span>
               </div>
           </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center border border-green-100">
                    <span className="material-symbols-outlined text-[18px] text-green-600">cloud_done</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">自动保存成功</span>
                    <span className="text-[10px] text-slate-400 font-medium">14:20:05</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button className="px-6 py-2.5 text-sm font-semibold rounded-xl text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all">清空重置</button>
                <button 
                    onClick={saveProject}
                    className="px-8 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all flex items-center gap-2"
                >
                    保存并下一步 <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
            </div>
          </div>
      </div>
    </div>
  );
};

export default ProjectEntry;