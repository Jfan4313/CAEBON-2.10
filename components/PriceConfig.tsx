import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, ResponsiveContainer, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Brush } from 'recharts';
import { useProject } from '../context/ProjectContext';

type PriceMode = 'tou' | 'fixed' | 'spot';

const PriceConfig: React.FC = () => {
  const { priceConfig, setPriceConfig, saveProject } = useProject();
  
  // Only UI state remains local
  const [configType, setConfigType] = useState<'template' | 'manual'>('manual');

  // Helpers to update context directly
  const handlePriceModeChange = (mode: PriceMode) => {
      setPriceConfig({ ...priceConfig, mode });
  };

  const handleFixedPriceChange = (val: number) => {
      setPriceConfig({ ...priceConfig, fixedPrice: val });
  };

  const handleTouChange = (idx: number, field: string, val: any) => {
      const newSegs = [...priceConfig.touSegments];
      newSegs[idx] = { ...newSegs[idx], [field]: val };
      setPriceConfig({ ...priceConfig, touSegments: newSegs });
  };

  const handleSpotChange = (idx: number, val: string) => {
      const numVal = parseFloat(val) || 0;
      const newSpots = [...(priceConfig.spotPrices || Array(24).fill(0.5))];
      newSpots[idx] = numVal;
      setPriceConfig({ ...priceConfig, spotPrices: newSpots });
  };

  const generateRandomSpot = () => {
      const randoms = Array.from({length: 24}, () => parseFloat((Math.random() * 1.5 + 0.2).toFixed(2)));
      setPriceConfig({ ...priceConfig, spotPrices: randoms });
  };

  // Memoize chart data to avoid recalculation on every render unless data changes
  const chartData = useMemo(() => {
    if (configType === 'template') {
        // Template Preview (Visual only, doesn't change actual config)
        return Array.from({ length: 24 }, (_, i) => {
            let type = 'valley';
            let price = 0.32;
            if (i >= 8 && i <= 10) { type = 'flat'; price = 0.68; }
            else if (i >= 11 && i <= 13) { type = 'peak'; price = 1.15; }
            else if (i >= 14 && i <= 16) { type = 'tip'; price = 1.62; }
            else if (i >= 17 && i <= 18) { type = 'peak'; price = 1.15; }
            else if (i >= 19 && i <= 21) { type = 'flat'; price = 0.68; }
            return { hour: i, price, type };
        });
    } else {
        if (priceConfig.mode === 'fixed') {
            return Array.from({ length: 24 }, (_, i) => ({ hour: i, price: priceConfig.fixedPrice, type: 'flat' }));
        } else if (priceConfig.mode === 'tou') {
            return Array.from({ length: 24 }, (_, i) => {
                const seg = priceConfig.touSegments.find(s => i >= s.start && i < s.end);
                return { hour: i, price: seg ? seg.price : 0.5, type: seg ? seg.type : 'flat' };
            });
        } else if (priceConfig.mode === 'spot') {
            return (priceConfig.spotPrices || Array(24).fill(0.5)).map((v, i) => ({ hour: i, price: v, type: 'spot' }));
        }
    }
    return [];
  }, [configType, priceConfig]);

  const getBarColor = (type: string) => {
    switch(type) {
        case 'tip': return '#ef4444'; // red
        case 'peak': return '#f97316'; // orange
        case 'flat': return '#3b82f6'; // blue
        case 'valley': return '#22c55e'; // green
        case 'spot': return '#8b5cf6'; // purple
        default: return '#cbd5e1';
    }
  }

  return (
    <div className="flex h-full flex-col relative bg-slate-50">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col p-6 overflow-y-auto pb-32">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">电价策略配置</h1>
                    <p className="text-sm text-slate-500 mt-1">设置项目所在地的峰谷平电价模型</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => { 
                            setConfigType('template'); 
                            handlePriceModeChange('tou'); 
                        }}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        重置配置
                    </button>
                </div>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col p-6">
                {/* Toolbar */}
                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div className="inline-flex bg-slate-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setConfigType('template')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${configType === 'template' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                内置模板
                            </button>
                            <button 
                                onClick={() => setConfigType('manual')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${configType === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                手动自定义
                            </button>
                        </div>
                        
                        {configType === 'template' && (
                            <div className="relative w-full md:w-80">
                                <span className="material-icons absolute left-3 top-2.5 text-slate-400 text-[20px]">search</span>
                                <input className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary/20 outline-none" defaultValue="广东省 - 珠三角五市 - 大工业用电" />
                                <span className="material-icons absolute right-3 top-2.5 text-slate-400 text-[20px]">expand_more</span>
                            </div>
                        )}
                    </div>

                    {/* Manual Mode Type Selector */}
                    {configType === 'manual' && (
                        <div className="flex gap-4 border-b border-slate-100 pb-4">
                            {[
                                {id: 'tou', label: '阶段性电价 (TOU)'},
                                {id: 'fixed', label: '固定电价'},
                                {id: 'spot', label: '市场化动态电价'}
                            ].map(mode => (
                                <label key={mode.id} className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="priceMode" 
                                        checked={priceConfig.mode === mode.id} 
                                        onChange={() => handlePriceModeChange(mode.id as PriceMode)}
                                        className="accent-primary w-4 h-4"
                                    />
                                    <span className={`text-sm font-medium ${priceConfig.mode === mode.id ? 'text-primary' : 'text-slate-600'}`}>{mode.label}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Chart & Input Area */}
                <div className="flex flex-col lg:flex-row gap-8 flex-1">
                    {/* Left: Chart */}
                    <div className="flex-1 flex flex-col">
                        {/* Legend */}
                        <div className="flex items-center gap-6 mb-4 text-sm flex-wrap">
                            {priceConfig.mode === 'tou' || configType === 'template' ? (
                                <>
                                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span><span className="text-slate-600">尖峰 (Tip)</span></div>
                                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500"></span><span className="text-slate-600">高峰 (Peak)</span></div>
                                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span><span className="text-slate-600">平段 (Flat)</span></div>
                                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span><span className="text-slate-600">低谷 (Valley)</span></div>
                                </>
                            ) : priceConfig.mode === 'spot' ? (
                                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500"></span><span className="text-slate-600">实时电价 (Spot)</span></div>
                            ) : (
                                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span><span className="text-slate-600">固定电价 (Fixed)</span></div>
                            )}
                        </div>

                        <div className="flex-1 min-h-[300px] w-full bg-slate-50 rounded-lg p-6 border border-slate-100 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} barGap={2} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                    <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        cursor={{fill: 'rgba(0,0,0,0.05)'}}
                                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                                    />
                                    <Bar dataKey="price" radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={getBarColor(entry.type)} />
                                        ))}
                                    </Bar>
                                    <Brush dataKey="hour" height={20} stroke="#cbd5e1" travellerWidth={10} tickFormatter={() => ''} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Right: Inputs (Visible only in Manual) */}
                    {configType === 'manual' && (
                        <div className="w-full lg:w-80 bg-slate-50 rounded-xl border border-slate-200 p-4 overflow-y-auto max-h-[500px]">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="material-icons text-base text-slate-400">edit</span> 参数配置
                            </h3>
                            
                            {priceConfig.mode === 'fixed' && (
                                <div className="space-y-4">
                                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">统一电价 (元/kWh)</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={priceConfig.fixedPrice}
                                            onChange={(e) => handleFixedPriceChange(parseFloat(e.target.value))}
                                            className="w-full text-lg font-bold text-slate-800 outline-none border-b border-slate-200 focus:border-primary py-1 bg-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {priceConfig.mode === 'tou' && (
                                <div className="space-y-3">
                                    {priceConfig.touSegments.map((seg, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium text-slate-700">{seg.start}:00 - {seg.end}:00</span>
                                                <select 
                                                    value={seg.type}
                                                    onChange={(e) => handleTouChange(idx, 'type', e.target.value)}
                                                    className="bg-white border border-slate-200 rounded px-1 py-0.5 outline-none focus:border-primary"
                                                >
                                                    <option value="valley">低谷</option>
                                                    <option value="flat">平段</option>
                                                    <option value="peak">高峰</option>
                                                    <option value="tip">尖峰</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400">价格:</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    value={seg.price}
                                                    onChange={(e) => handleTouChange(idx, 'price', parseFloat(e.target.value))}
                                                    className="w-16 border border-slate-200 rounded px-2 py-1 outline-none focus:border-primary bg-white"
                                                />
                                                <span className="text-slate-400">元</span>
                                            </div>
                                        </div>
                                    ))}
                                    <button className="w-full py-2 text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg hover:border-primary hover:text-primary">
                                        + 添加时段 (演示固定)
                                    </button>
                                </div>
                            )}

                            {priceConfig.mode === 'spot' && (
                                <div className="space-y-3">
                                    <button 
                                        onClick={generateRandomSpot}
                                        className="w-full py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 mb-2"
                                    >
                                        随机生成模拟数据
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(priceConfig.spotPrices || []).map((val, i) => (
                                            <div key={i} className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200">
                                                <span className="text-[10px] text-slate-400 w-8">{i}:00</span>
                                                <input 
                                                    type="number"
                                                    step="0.01"
                                                    value={val}
                                                    onChange={(e) => handleSpotChange(i, e.target.value)}
                                                    className="w-full text-xs font-medium outline-none text-right bg-white"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col p-6 overflow-y-auto shrink-0 pb-32">
            <h2 className="text-lg font-bold text-slate-900 mb-6">配置分析预览</h2>
            <div className="space-y-4">
                <div className="bg-gradient-to-br from-white to-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <p className="text-xs font-medium text-slate-500 uppercase">平均电价预估</p>
                    <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-slate-800">
                            {(chartData.reduce((acc, curr) => acc + Number(curr.price), 0) / 24).toFixed(3)}
                        </span>
                        <span className="text-sm text-slate-500">元/kWh</span>
                    </div>
                    <div className="mt-2 flex items-center text-xs text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
                        <span className="material-icons text-[14px] mr-1">trending_down</span>
                        <span>自定义配置生效中</span>
                    </div>
                </div>
                
                {priceConfig.mode !== 'fixed' && (
                    <div className="bg-gradient-to-br from-white to-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <p className="text-xs font-medium text-slate-500 uppercase">峰谷/最大价差</p>
                        <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-primary">
                                {(Math.max(...chartData.map(d => d.price)) - Math.min(...chartData.map(d => d.price))).toFixed(2)}
                            </span>
                            <span className="text-sm text-slate-500">元</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">最大套利空间</p>
                    </div>
                )}
            </div>
            
            <div className="mt-auto pt-6 border-t border-slate-100">
                <button className="w-full bg-white border border-slate-200 text-slate-600 py-3 rounded-lg font-medium hover:bg-slate-50">另存为模板</button>
            </div>
        </div>
      </div>
      
      {/* Unified Sticky Footer */}
      <div className="fixed bottom-0 left-64 right-80 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 px-8 z-40 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400">
                    <span className="material-icons text-[18px]">history</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">上次配置</span>
                    <span className="text-[10px] text-slate-400 font-medium">3天前</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button className="px-6 py-2.5 text-sm font-semibold rounded-xl text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all">重置</button>
                <button 
                    onClick={saveProject}
                    className="px-8 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all flex items-center gap-2"
                >
                    应用并保存 <span className="material-icons text-[18px]">save</span>
                </button>
            </div>
        </div>
    </div>
  );
};

export default PriceConfig;