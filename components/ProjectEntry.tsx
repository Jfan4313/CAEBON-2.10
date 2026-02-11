import React, { useState, useEffect } from 'react';

const ProjectEntry: React.FC = () => {
  // Region State
  const [province, setProvince] = useState('Shanghai');
  const [city, setCity] = useState('Pudong');
  const [projectType, setProjectType] = useState('factory'); // factory, school, office

  // Building State
  const [buildings, setBuildings] = useState([
    { id: 1, name: '1号生产车间', type: '工厂 (Factory)', area: 12500 },
    { id: 2, name: '研发中心大楼', type: '办公楼 (Office)', area: 4800 },
  ]);
  const [targetBuildingId, setTargetBuildingId] = useState<number>(1);

  // Estimation Mode State
  const [estimationMode, setEstimationMode] = useState<'auto' | 'manual'>('manual');
  const [isScanning, setIsScanning] = useState(false);

  // System Config State
  const [activeSystem, setActiveSystem] = useState('lighting');

  // Sync target building if buildings change
  useEffect(() => {
    if (buildings.length > 0 && !buildings.find(b => b.id === targetBuildingId)) {
      setTargetBuildingId(buildings[0].id);
    }
  }, [buildings, targetBuildingId]);

  const handleAddBuilding = () => {
    const newId = buildings.length > 0 ? Math.max(...buildings.map(b => b.id)) + 1 : 1;
    setBuildings([
      ...buildings,
      { id: newId, name: `新建建筑 ${newId}`, type: '未定义', area: 0 }
    ]);
  };

  const handleDeleteBuilding = (id: number) => {
    setBuildings(buildings.filter(b => b.id !== id));
  };

  const handleBuildingChange = (id: number, field: string, value: string | number) => {
    setBuildings(buildings.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const handleModeChange = (mode: 'auto' | 'manual') => {
      setEstimationMode(mode);
      if (mode === 'auto') {
          setIsScanning(true);
          setTimeout(() => setIsScanning(false), 2000); // Mock scanning
      }
  };

  // Dynamic Systems based on Project Type
  const getSystems = () => {
      const base = [
          { id: 'lighting', label: '照明系统', icon: 'lightbulb' },
          { id: 'hvac', label: '空调系统', icon: 'ac_unit' },
          { id: 'water', label: '热水系统', icon: 'water_drop' },
      ];
      if (projectType === 'factory') {
          base.push({ id: 'production', label: '生产系统', icon: 'precision_manufacturing' });
      }
      return base;
  };

  const systems = getSystems();
  const currentBuilding = buildings.find(b => b.id === targetBuildingId);

  // Summary Calculation
  const totalArea = buildings.reduce((acc, curr) => acc + (curr.area || 0), 0);
  const estimatedLoad = (totalArea * (projectType === 'factory' ? 0.15 : 0.08)).toFixed(1); // Mock calculation

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="flex-1 overflow-y-auto p-8 pb-32 scroll-smooth">
          <div className="max-w-6xl mx-auto">
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

            <div className="space-y-6">
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
                        <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" placeholder="请输入项目名称" defaultValue="上海浦东新区工业园节能改造项目" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 ml-1">项目类型 <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <select 
                                value={projectType}
                                onChange={(e) => {
                                    setProjectType(e.target.value);
                                    setActiveSystem('lighting'); // Reset tab on type change
                                }}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700 appearance-none cursor-pointer focus:bg-white focus:border-primary"
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
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700 appearance-none cursor-pointer focus:bg-white focus:border-primary"
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
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700 appearance-none cursor-pointer focus:bg-white focus:border-primary"
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
                                                className="bg-transparent w-full outline-none font-medium focus:border-b focus:border-primary" 
                                            />
                                        </td>
                                        <td className="px-6 py-3">
                                            <select 
                                                value={b.type}
                                                onChange={(e) => handleBuildingChange(b.id, 'type', e.target.value)}
                                                className="bg-transparent w-full outline-none text-slate-600 appearance-none cursor-pointer"
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
                                                className="bg-transparent w-full outline-none text-slate-600 focus:border-b focus:border-primary"
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

                {/* Energy Consumption */}
                <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined">settings_suggest</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">能耗配置</h3>
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
                                    分项能耗详情
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">配置建筑:</span>
                                    <div className="relative">
                                        <select 
                                            value={targetBuildingId}
                                            onChange={(e) => setTargetBuildingId(Number(e.target.value))}
                                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-primary pr-8 appearance-none cursor-pointer"
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
                                {systems.map(sys => (
                                    <button 
                                        key={sys.id}
                                        onClick={() => setActiveSystem(sys.id)}
                                        className={`px-5 py-2.5 rounded-t-xl text-sm font-medium flex items-center gap-2 transition-all relative top-[1px] ${activeSystem === sys.id ? 'bg-primary text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">{sys.icon}</span> {sys.label}
                                    </button>
                                ))}
                            </div>

                            <div className="p-8 rounded-2xl border border-primary/20 bg-primary/5 relative overflow-hidden min-h-[300px]">
                                {activeSystem === 'lighting' && (
                                    <div className="animate-fade-in">
                                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/50">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-yellow-500">
                                                    <span className="material-symbols-outlined text-[24px]">lightbulb</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-lg">照明系统配置</h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">配置 {currentBuilding?.name} 的灯具功率与控制</p>
                                                </div>
                                            </div>
                                            <label className="flex items-center cursor-pointer gap-3">
                                                <span className="text-sm font-medium text-primary">启用此系统</span>
                                                <div className="relative w-12 h-6 bg-primary rounded-full">
                                                    <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                                </div>
                                            </label>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700 flex justify-between">
                                                    功率密度 (W/㎡) <span className="text-xs text-slate-400 font-normal">建议值: 8-12</span>
                                                </label>
                                                <div className="relative">
                                                    <input type="number" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm focus:border-primary" defaultValue="8.5" />
                                                    <span className="absolute right-4 top-3 text-xs text-slate-400 font-medium">W/㎡</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700 flex justify-between">
                                                    灯具总数 <span className="text-xs text-slate-400 font-normal">当前楼层预估</span>
                                                </label>
                                                <div className="relative">
                                                    <input type="number" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm focus:border-primary" defaultValue="240" />
                                                    <span className="absolute right-4 top-3 text-xs text-slate-400 font-medium">个</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {activeSystem === 'hvac' && (
                                    <div className="animate-fade-in">
                                         <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/50">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-500">
                                                    <span className="material-symbols-outlined text-[24px]">ac_unit</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-lg">暖通空调配置</h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">配置 {currentBuilding?.name} 的制冷/制热设备</p>
                                                </div>
                                            </div>
                                            <label className="flex items-center cursor-pointer gap-3">
                                                <span className="text-sm font-medium text-primary">启用此系统</span>
                                                <div className="relative w-12 h-6 bg-primary rounded-full">
                                                    <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                                </div>
                                            </label>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">冷机类型</label>
                                                <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm focus:border-primary">
                                                    <option>水冷螺杆机组</option>
                                                    <option>风冷模块机组</option>
                                                    <option>离心式冷水机组</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">制冷量 (kW)</label>
                                                <input type="number" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm focus:border-primary" defaultValue="1200" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSystem === 'water' && (
                                    <div className="animate-fade-in">
                                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/50">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-cyan-500">
                                                    <span className="material-symbols-outlined text-[24px]">water_drop</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-lg">热水系统配置</h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">配置 {currentBuilding?.name} 的生活/工艺热水</p>
                                                </div>
                                            </div>
                                            <label className="flex items-center cursor-pointer gap-3">
                                                <span className="text-sm font-medium text-slate-400">未启用</span>
                                                <div className="relative w-12 h-6 bg-slate-300 rounded-full">
                                                    <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                                </div>
                                            </label>
                                        </div>
                                        <div className="text-center py-10 text-slate-400">
                                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">block</span>
                                            <p className="text-sm">该系统当前处于禁用状态</p>
                                        </div>
                                    </div>
                                )}

                                {activeSystem === 'production' && (
                                    <div className="animate-fade-in">
                                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/50">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-purple-500">
                                                    <span className="material-symbols-outlined text-[24px]">precision_manufacturing</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-lg">生产设备配置</h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">配置 {currentBuilding?.name} 的产线与动力设备</p>
                                                </div>
                                            </div>
                                            <label className="flex items-center cursor-pointer gap-3">
                                                <span className="text-sm font-medium text-primary">启用此系统</span>
                                                <div className="relative w-12 h-6 bg-primary rounded-full">
                                                    <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                                </div>
                                            </label>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">主要产线数量</label>
                                                <input type="number" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm focus:border-primary" defaultValue="4" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">年运行小时数</label>
                                                <input type="number" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm focus:border-primary" defaultValue="6000" />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-sm font-semibold text-slate-700">装机总功率 (kW)</label>
                                                <input type="number" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm focus:border-primary" defaultValue="2500" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </div>
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
                       <span className="text-[10px] text-slate-400 uppercase font-medium">总面积</span>
                       <span className="text-sm font-bold text-slate-700">{totalArea.toLocaleString()} <span className="text-[10px] font-normal">㎡</span></span>
                   </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] text-slate-400 uppercase font-medium">预估总负荷</span>
                       <span className="text-sm font-bold text-primary">{estimatedLoad} <span className="text-[10px] font-normal">MW</span></span>
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
                <button className="px-8 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all flex items-center gap-2">
                    保存并下一步 <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
            </div>
          </div>
      </div>
    </div>
  );
};

export default ProjectEntry;