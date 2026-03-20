import React, { useRef, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ComposedChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, LabelList } from 'recharts';
import { useProject } from '../../../context/ProjectContext';
import { useSolarMetrics, calculateSolarMetrics } from '../hooks';
import { SolutionComparison } from './SolutionComparison';
import { MODULE_BRANDS, SolarParamsState } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface SolarReportProps {
    onClose: () => void;
    defaultToPresentationMode?: boolean;
}

export default function SolarReport({ onClose, defaultToPresentationMode = true }: SolarReportProps) {
    const printRef = useRef<HTMLDivElement>(null);
    const { projectBaseInfo, modules } = useProject();
    const solarModule = modules['retrofit-solar'];

    // Presentation mode state - start in presentation mode if defaultToPresentationMode is true
    const [isPresentationMode, setIsPresentationMode] = useState(defaultToPresentationMode);

    // When exiting presentation mode (not in presentation mode anymore), immediately close
    useEffect(() => {
        if (!isPresentationMode) {
            onClose();
        }
    }, [isPresentationMode, onClose]);

    // Auto-enter presentation mode when prop is set
    useEffect(() => {
        if (defaultToPresentationMode && !isPresentationMode) {
            setIsPresentationMode(true);
        }
    }, [defaultToPresentationMode]);
    const [currentSlide, setCurrentSlide] = useState(0);

    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = async () => {
        // Show loading state
        const exportButton = document.querySelector('[data-pdf-export]') as HTMLButtonElement;
        if (exportButton) {
            exportButton.disabled = true;
            exportButton.innerHTML = '<span class="material-icons text-sm animate-spin">autorenew</span> 生成中...';
        }

        // Store roots for cleanup
        const roots: any[] = [];
        const slideWidth = 1280;
        const slideHeight = 720;

        try {
            // Create PDF document (landscape, dimensions in points)
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [slideWidth, slideHeight]
            });

            // Create a visible container for rendering slides
            const container = document.createElement('div');
            container.id = 'pdf-export-container';
            container.style.position = 'fixed';
            container.style.top = '10px';
            container.style.right = '10px';
            container.style.width = `${slideWidth}px`;
            container.style.height = `${slideHeight}px`;
            container.style.background = 'white';
            container.style.zIndex = '99999';
            container.style.overflow = 'hidden';
            container.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';

            // Process each slide
            for (let index = 0; index < slides.length; index++) {
                const slide = slides[index];

                // Clear and setup container for this slide
                container.innerHTML = '';

                const slideWrapper = document.createElement('div');
                slideWrapper.style.width = '100%';
                slideWrapper.style.height = '100%';
                slideWrapper.style.position = 'relative';
                slideWrapper.style.overflow = 'hidden';
                slideWrapper.style.background = index === 0 ? '#1e293b' : 'white';

                const slideContent = document.createElement('div');
                slideContent.style.width = '100%';
                slideContent.style.height = '100%';
                slideContent.style.position = 'relative';
                slideWrapper.appendChild(slideContent);
                container.appendChild(slideWrapper);

                // Render the slide
                const root = createRoot(slideContent);
                root.render(slide.content);
                roots.push(root);

                document.body.appendChild(container);

                // Wait for charts and animations to complete
                await new Promise(resolve => setTimeout(resolve, 1200));

                // Capture this slide as an image
                const canvas = await html2canvas(container, {
                    scale: 1.5,
                    useCORS: true,
                    logging: false,
                    allowTaint: true,
                    backgroundColor: index === 0 ? '#1e293b' : '#ffffff',
                    width: slideWidth,
                    height: slideHeight
                });

                // Convert canvas to image data
                const imgData = canvas.toDataURL('image/jpeg', 0.95);

                // Add page to PDF (first page is already created, add new pages for subsequent slides)
                if (index > 0) {
                    pdf.addPage([slideWidth, slideHeight]);
                }

                // Add image to current page
                pdf.addImage(imgData, 'JPEG', 0, 0, slideWidth, slideHeight);

                // Remove from DOM
                document.body.removeChild(container);
            }

            // Generate filename and save
            const fileName = `光伏项目收益评估_${projectBaseInfo?.name || '项目'}_${new Date().toISOString().slice(0, 10)}.pdf`;
            pdf.save(fileName);

            // Cleanup
            roots.forEach(root => {
                try { root.unmount(); } catch (e) {}
            });

        } catch (error) {
            console.error('PDF generation failed:', error);
            alert('PDF生成失败: ' + (error as Error).message);
        } finally {
            // Cleanup
            roots.forEach(root => {
                try { root.unmount(); } catch (e) {}
            });

            // Remove container if still exists
            const existingContainer = document.getElementById('pdf-export-container');
            if (existingContainer) {
                document.body.removeChild(existingContainer);
            }

            if (exportButton) {
                exportButton.disabled = false;
                exportButton.innerHTML = '<span class="material-icons text-sm">picture_as_pdf</span> 导出PDF';
            }
        }
    };

    const handlePrevSlide = () => {
        if (currentSlide > 0) setCurrentSlide(currentSlide - 1);
    };

    const handleNextSlide = () => {
        setCurrentSlide(currentSlide + 1);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight' || e.key === ' ') handleNextSlide();
        if (e.key === 'ArrowLeft') handlePrevSlide();
        if (e.key === 'Escape') setIsPresentationMode(false);
    };

    React.useEffect(() => {
        if (isPresentationMode) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isPresentationMode, currentSlide]);

    if (!solarModule?.params) {
        return (
            <div className="fixed inset-0 bg-slate-100 z-50 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
                    <span className="material-icons text-5xl text-slate-300 mb-4">warning</span>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">暂无光伏方案数据</h3>
                    <p className="text-slate-500 mb-6">请先配置光伏参数并保存项目</p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90"
                    >
                        返回配置
                    </button>
                </div>
            </div>
        );
    }

    const params = solarModule.params;
    // Use a fallback for calculatedSelfConsumption since it's not stored in the module state
    const calculatedSelfConsumption = 85;
    const { longTermMetrics, chartData } = useSolarMetrics(params, calculatedSelfConsumption);
    const currentSolution = params.selectedSolutionId
        ? (params.solutions || []).find(s => s.id === params.selectedSolutionId)
        : null;

    const printStyle = `
        @media print {
            html, body {
                height: auto !important;
                overflow: visible !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .fixed {
                position: static !important;
                height: auto !important;
                overflow: visible !important;
            }
            .overflow-y-auto {
                overflow: visible !important;
                height: auto !important;
                display: block;
            }
            .print-container {
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                box-shadow: none !important;
            }
            .page-break {
                page-break-after: always !important;
                break-after: page !important;
                display: block;
                height: 0;
                clear: both;
            }
            section {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
            }
            tr, .page-break-inside-avoid {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                display: table-row;
            }
            table {
                page-break-inside: auto !important;
            }
            /* Hide non-printable elements */
            .print-hidden {
                display: none !important;
            }
            /* Ensure charts render properly */
            .recharts-wrapper {
                page-break-inside: avoid !important;
            }
        }

        /* PDF export specific styles */
        .print-container section {
            page-break-after: always;
            padding: 20px;
            min-height: 297mm;
        }
        .print-container section:last-child {
            page-break-after: auto;
        }
    `;

    // Professional color scheme (no animations, corporate style)
    const COLORS = {
        primary: '#1e3a5f',      // 深蓝 - 主标题
        secondary: '#3b82f6',    // 蓝色 - 强调
        accent: '#0ea5e9',       // 天蓝 - 辅助
        text: '#1e293b',         // 深灰 - 正文
        textLight: '#64748b',    // 浅灰 - 次要文字
        border: '#e2e8f0',       // 边框
        bgLight: '#f8fafc',      // 浅色背景
        success: '#10b981',      // 绿色 - 正向指标
        warning: '#f59e0b',      // 橙色 - 警告
        danger: '#ef4444'        // 红色 - 负向指标
    };

    // Helper functions for presentation data
    const calculateEnvironmentalImpact = () => {
        const totalGen25 = longTermMetrics.yearlyDetails.reduce((sum: number, d: any) => sum + d.generation, 0);
        return {
            co2Reduction: Math.round(totalGen25 * 0.8), // 吨
            treesEquivalent: Math.round(totalGen25 * 10000 * 0.8 / 18 / 25), // 棵
            coalSaved: Math.round(totalGen25 * 0.3), // 吨
            totalGeneration: totalGen25.toFixed(0) // 万度
        };
    };

    const calculateSeasonalGeneration = () => {
        const seasonMap: Record<string, string> = { spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季' };
        const seasonIcons: Record<string, string> = { spring: 'local_florist', summer: 'wb_sunny', autumn: 'park', winter: 'ac_unit' };
        const seasons = { spring: [2, 3, 4], summer: [5, 6, 7], autumn: [8, 9, 10], winter: [11, 0, 1] };
        return Object.entries(seasons).map(([season, months]) => ({
            season: seasonMap[season],
            icon: seasonIcons[season],
            value: months.reduce((sum: number, m: number) => sum + (chartData[m]?.retrofit || 0), 0) / 100
        }));
    };

    const getIRRRating = (irr: number) => {
        if (irr >= 15) return { label: '优秀', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
        if (irr >= 10) return { label: '良好', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
        return { label: '一般', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    };

    const getInvestmentModeLabel = (mode: string) => {
        if (mode === 'epc') return { label: 'EPC总承包', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'engineering' };
        if (mode === 'emc') return { label: 'EMC合同能源管理', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'handshake' };
        return { label: '自投模式', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', icon: 'account_balance' };
    };

    // Smart unit formatter - automatically select the most appropriate unit
    const formatPower = (valueKw: number) => {
        if (valueKw >= 1000) {
            return { value: (valueKw / 1000).toFixed(2), unit: 'MWp' };
        }
        return { value: valueKw.toFixed(2), unit: 'kWp' };
    };

    const formatEnergy = (valueWanDu: number) => {
        // valueWanDu is in "万度" (10,000 kWh)
        if (valueWanDu < 1) {
            return { value: (valueWanDu * 10000).toFixed(0), unit: '度' };
        }
        if (valueWanDu < 10) {
            return { value: valueWanDu.toFixed(2), unit: '万度' };
        }
        return { value: valueWanDu.toFixed(2), unit: '万度' };
    };

    const formatMoney = (valueWan: number) => {
        // valueWan is in "万元" (10,000 yuan)
        if (valueWan < 1) {
            return { value: (valueWan * 10000).toFixed(0), unit: '元' };
        }
        if (valueWan < 100) {
            return { value: valueWan.toFixed(2), unit: '万元' };
        }
        return { value: valueWan.toFixed(2), unit: '万元' };
    };

    const formatArea = (valueSqm: number) => {
        // valueSqm is in square meters
        if (valueSqm >= 10000) {
            return { value: (valueSqm / 10000).toFixed(2), unit: '万㎡' };
        }
        return { value: valueSqm.toFixed(0), unit: '㎡' };
    };

    // Calculate metrics for each solution for comparison
    const calculateSolutionMetrics = () => {
        const solutions = params.solutions || [];
        if (solutions.length <= 1) return [];

        return solutions.map(solution => {
            // Create params for this solution
            const brandConfig = MODULE_BRANDS[solution.brand];
            // Use current EPC price if this is the selected solution, otherwise use solution's stored price
            const effectiveEpcPrice = solution.id === params.selectedSolutionId
                ? params.simpleParams.epcPrice
                : solution.epcPrice;

            const solutionParams: SolarParamsState = {
                ...params,
                simpleParams: {
                    ...params.simpleParams,
                    epcPrice: effectiveEpcPrice
                },
                advParams: {
                    ...params.advParams,
                    degradationFirstYear: brandConfig.degradationFirstYear,
                    degradationLinear: brandConfig.degradationLinear
                }
            };

            // Calculate metrics for this solution using static function
            const solMetrics = calculateSolarMetrics(solutionParams, calculatedSelfConsumption);

            // Calculate investment
            const capacity = params.simpleParams.capacity;
            const baseInvestment = (capacity * effectiveEpcPrice / 10);
            const voltageUpgradeCost = solution.connectionType === 'high' && solution.voltageUpgradeCost ? solution.voltageUpgradeCost : 0;
            const totalInvestment = baseInvestment + voltageUpgradeCost;

            return {
                id: solution.id,
                name: solution.name,
                connectionType: solution.connectionType === 'high' ? '10kV高压' : '380V低压',
                cableType: solution.cableType === 'copper' ? '铜芯' : '铝芯',
                brand: brandConfig.name,
                epcPrice: effectiveEpcPrice,
                investment: totalInvestment,
                irr: solMetrics.irr,
                paybackPeriod: solMetrics.paybackPeriod,
                rev25Year: solMetrics.rev25Year || 0,
                genYear1: solMetrics.genYear1
            };
        });
    };

    const solutionComparisonData = calculateSolutionMetrics();

    // Get buildings for presentation (need to get from hook or props)
    const presentationBuildings = params.buildings || [];

    // Presentation slides data
    const envImpact = calculateEnvironmentalImpact();
    const seasonalData = calculateSeasonalGeneration();
    const irrRating = getIRRRating(longTermMetrics.irr);
    const investMode = getInvestmentModeLabel(params.simpleParams.investmentMode);

    const slides = [
        // Slide 0: Cover
        {
            title: '封面',
            content: (
                <div className="h-full flex flex-col justify-center items-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-white relative overflow-hidden">
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10">
                        <div className="absolute top-10 left-10 w-64 h-64 bg-blue-500 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-10 right-10 w-80 h-80 bg-yellow-500 rounded-full blur-3xl"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500 rounded-full blur-3xl"></div>
                    </div>

                    {/* Logo Badge - Top Right */}
                    <div className="absolute top-6 right-6 flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                        <span className="material-icons text-yellow-400">wb_sunny</span>
                        <span className="text-sm font-semibold">零碳评估</span>
                    </div>

                    <div className="text-center relative z-10">
                        {/* Main Icon */}
                        <div className="mb-8">
                            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-6 shadow-2xl shadow-orange-500/50">
                                <span className="material-icons text-6xl text-white">solar_power</span>
                            </div>
                        </div>

                        {/* Report Title */}
                        <div className="inline-block bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-4">
                            <span className="text-xs font-bold tracking-widest uppercase">Professional Assessment Report</span>
                        </div>

                        <h1 className="text-5xl font-bold mb-4 tracking-tight">分布式光伏发电项目</h1>
                        <h2 className="text-4xl font-light text-blue-300 mb-16">收益评估报告</h2>

                        {/* Divider */}
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent to-blue-400"></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <div className="w-32 h-0.5 bg-blue-400"></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <div className="w-16 h-0.5 bg-gradient-to-l from-transparent to-blue-400"></div>
                        </div>

                        {/* Project Info */}
                        <div className="space-y-3">
                            <p className="text-2xl font-medium">{projectBaseInfo?.name || '-'}</p>
                            <p className="text-lg text-slate-300">
                                {projectBaseInfo?.province || ''} {projectBaseInfo?.city || ''}
                            </p>
                            <p className="text-base text-slate-400">{new Date().toLocaleDateString('zh-CN')}</p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="absolute bottom-8 left-0 right-0 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <span className="material-icons text-yellow-400 text-sm">wb_sunny</span>
                            <p className="text-sm font-semibold">零碳项目收益评估软件</p>
                        </div>
                        <p className="text-xs text-slate-500">Professional Carbon-Neutral Project Assessment Platform</p>
                    </div>
                </div>
            )
        },
        // Slide 1: Project Overview
        {
            title: '一、项目概况',
            content: (
                <div className="h-full flex flex-col bg-white">
                    <div className="bg-slate-800 text-white px-8 py-3 rounded-t-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-icons text-yellow-400 text-3xl">assessment</span>
                            <h2 className="text-3xl font-bold">一、项目概况</h2>
                        </div>
                        <div className="flex items-center gap-2 opacity-50">
                            <span className="material-icons text-sm">wb_sunny</span>
                            <span className="text-xs">零碳评估</span>
                        </div>
                    </div>

                    <div className="flex-1 p-6 flex flex-col justify-center">
                        {/* Main Content - Centered Grid */}
                        <div className="w-full grid grid-cols-2 gap-8">
                            {/* Left Column - Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b-2 border-blue-200">
                                    <span className="material-icons text-blue-500 text-2xl">business</span>
                                    项目基本信息
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border-2 border-slate-200 hover:border-blue-300 transition-all">
                                        <span className="text-sm font-medium text-slate-600">项目名称</span>
                                        <span className="text-lg font-bold text-slate-800">{projectBaseInfo?.name || '-'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border-2 border-slate-200 hover:border-blue-300 transition-all">
                                        <span className="text-sm font-medium text-slate-600">所在地区</span>
                                        <span className="text-lg font-bold text-slate-800">{projectBaseInfo?.province || ''} {projectBaseInfo?.city || ''}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border-2 border-slate-200 hover:border-blue-300 transition-all">
                                        <span className="text-sm font-medium text-slate-600">项目类型</span>
                                        <span className="text-lg font-bold text-slate-800">{projectBaseInfo?.type || '-'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-blue-50 to-white rounded-xl border-2 border-blue-300">
                                        <span className="text-sm font-semibold text-blue-700">建筑数量</span>
                                        <span className="text-3xl font-black text-blue-600">{projectBaseInfo?.buildings?.length || 0} <span className="text-base text-blue-600 ml-1">栋</span></span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Key Metrics */}
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b-2 border-green-200">
                                    <span className="material-icons text-green-500 text-2xl">solar_power</span>
                                    系统核心指标
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all">
                                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                                            <span className="material-icons text-white text-2xl">bolt</span>
                                        </div>
                                        <p className="text-xs text-blue-600 font-semibold mb-1">装机容量</p>
                                        <p className="text-3xl font-black text-blue-700">{formatPower(params.simpleParams.capacity).value}</p>
                                        <p className="text-sm text-blue-600 font-medium">{formatPower(params.simpleParams.capacity).unit}</p>
                                    </div>
                                    <div className="border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all">
                                        <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                                            <span className="material-icons text-white text-2xl">square_foot</span>
                                        </div>
                                        <p className="text-xs text-emerald-600 font-semibold mb-1">安装面积</p>
                                        <p className="text-3xl font-black text-emerald-700">{formatArea(params.simpleParams.area).value}</p>
                                        <p className="text-sm text-emerald-600 font-medium">{formatArea(params.simpleParams.area).unit}</p>
                                    </div>
                                    <div className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all">
                                        <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                                            <span className="material-icons text-white text-2xl">wb_sunny</span>
                                        </div>
                                        <p className="text-xs text-amber-600 font-semibold mb-1">首年发电量</p>
                                        <p className="text-3xl font-black text-amber-700">{formatEnergy(longTermMetrics.genYear1).value}</p>
                                        <p className="text-sm text-amber-600 font-medium">{formatEnergy(longTermMetrics.genYear1).unit}</p>
                                    </div>
                                    <div className={`border-2 bg-gradient-to-br from-white rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all ${investMode.border} ${investMode.bg}`}>
                                        <div className={`w-12 h-12 ${investMode.bg.replace('/50', '-600')} rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                                            <span className="material-icons text-white text-2xl">{investMode.icon}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 font-semibold mb-1">投资模式</p>
                                        <p className="text-xl font-black text-slate-800">{investMode.label}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-4 border-t border-slate-200 flex justify-between items-center text-base text-slate-500 bg-slate-50">
                        <span className="font-semibold">1/10</span>
                        <span>零碳项目收益评估软件</span>
                    </div>
                </div>
            )
        },
        // Slide 2: Technical Solution
        {
            title: '二、技术方案',
            content: (
                <div className="h-full flex flex-col bg-white">
                    <div className="bg-slate-800 text-white px-8 py-3 rounded-t-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-icons text-blue-400 text-3xl">settings</span>
                            <h2 className="text-3xl font-bold">二、技术方案</h2>
                        </div>
                        <div className="flex items-center gap-2 opacity-50">
                            <span className="material-icons text-sm">wb_sunny</span>
                            <span className="text-xs">零碳评估</span>
                        </div>
                    </div>

                    <div className="flex-1 p-6 flex flex-col">
                        {/* Technical Parameters Grid */}
                        <div className="grid grid-cols-3 gap-4 mb-5">
                            {/* Connection Scheme Card */}
                            <div className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white rounded-2xl p-4 hover:shadow-xl transition-all">
                                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-blue-200">
                                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <span className="material-icons text-white text-xl">electrical_services</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">接入方案</h3>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center py-2 px-3 bg-white rounded-xl border-2 border-slate-200">
                                        <span className="text-sm font-medium text-slate-600">接入方式</span>
                                        <span className="text-base font-bold text-blue-700">{currentSolution?.connectionType === 'high' ? '10kV 高压' : '380V 低压'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 px-3 bg-white rounded-xl border-2 border-slate-200">
                                        <span className="text-sm font-medium text-slate-600">线缆类型</span>
                                        <span className="text-base font-bold text-orange-700">{currentSolution?.cableType === 'copper' ? '铜缆' : '铝缆'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 px-3 bg-white rounded-xl border-2 border-slate-200">
                                        <span className="text-sm font-medium text-slate-600">组件品牌</span>
                                        <span className="text-base font-bold text-purple-700">{currentSolution?.brand === 'longi' ? '隆基' : currentSolution?.brand === 'tongwei' ? '通威' : '通用'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Degradation Card */}
                            <div className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-4 hover:shadow-xl transition-all">
                                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-emerald-200">
                                    <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <span className="material-icons text-white text-xl">trending_down</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">组件衰减</h3>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center py-2 px-3 bg-white rounded-xl border-2 border-slate-200">
                                        <span className="text-sm font-medium text-slate-600">首年衰减率</span>
                                        <span className="text-base font-bold text-emerald-700">{params.advParams.degradationFirstYear}%</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 px-3 bg-white rounded-xl border-2 border-slate-200">
                                        <span className="text-sm font-medium text-slate-600">次年开始衰减</span>
                                        <span className="text-base font-bold text-emerald-700">{params.advParams.degradationLinear}%/年</span>
                                    </div>
                                </div>
                            </div>

                            {/* System Parameters Card */}
                            <div className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white rounded-2xl p-4 hover:shadow-xl transition-all">
                                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-purple-200">
                                    <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <span className="material-icons text-white text-xl">tune</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">系统参数</h3>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center py-2 px-3 bg-white rounded-xl border-2 border-slate-200">
                                        <span className="text-sm font-medium text-slate-600">系统效率(PR)</span>
                                        <span className="text-base font-bold text-purple-700">{params.advParams.prValue}%</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 px-3 bg-white rounded-xl border-2 border-slate-200">
                                        <span className="text-sm font-medium text-slate-600">方位角效率</span>
                                        <span className="text-base font-bold text-purple-700">{params.advParams.azimuthEfficiency}%</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 px-3 bg-white rounded-xl border-2 border-slate-200">
                                        <span className="text-sm font-medium text-slate-600">年发电天数</span>
                                        <span className="text-base font-bold text-purple-700">{params.advParams.generationDays}天</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Economic Parameters with Visual Display */}
                        <div className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-200">
                                <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <span className="material-icons text-white text-xl">payments</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">经济参数</h3>
                            </div>
                            <div className="grid grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl border-2 border-blue-300 shadow-lg">
                                    <p className="text-xs text-blue-700 font-semibold mb-1">上网电价</p>
                                    <p className="text-2xl font-black text-blue-800">¥{params.advParams.feedInTariff}</p>
                                    <p className="text-xs text-blue-600 mt-1">/度</p>
                                </div>
                                <div className="text-center p-4 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl border-2 border-emerald-300 shadow-lg">
                                    <p className="text-xs text-emerald-700 font-semibold mb-1">用电电价</p>
                                    <p className="text-2xl font-black text-emerald-800">¥{params.advParams.electricityPrice}</p>
                                    <p className="text-xs text-emerald-600 mt-1">/度</p>
                                </div>
                                <div className="text-center p-4 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl border-2 border-orange-300 shadow-lg">
                                    <p className="text-xs text-orange-700 font-semibold mb-1">运维成本</p>
                                    <p className="text-2xl font-black text-orange-800">{params.advParams.omCost}</p>
                                    <p className="text-xs text-orange-600 mt-1">分/W/年</p>
                                </div>
                                <div className="text-center p-4 bg-gradient-to-br from-pink-100 to-pink-50 rounded-2xl border-2 border-pink-300 shadow-lg">
                                    <p className="text-xs text-pink-700 font-semibold mb-1">保险费率</p>
                                    <p className="text-2xl font-black text-pink-800">{params.advParams.insuranceRate}%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-4 border-t border-slate-200 flex justify-between items-center text-base text-slate-500 bg-slate-50">
                        <span className="font-semibold">2/10</span>
                        <span>零碳项目收益评估软件</span>
                    </div>
                </div>
            )
        },
        // Slide 3: Building Details
        {
            title: '三、建筑明细',
            content: (
                <div className="h-full flex flex-col bg-white">
                    <div className="bg-slate-800 text-white px-8 py-3 rounded-t-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-icons text-emerald-400 text-3xl">apartment</span>
                            <h2 className="text-3xl font-bold">三、建筑明细</h2>
                        </div>
                        <div className="flex items-center gap-2 opacity-50">
                            <span className="material-icons text-sm">wb_sunny</span>
                            <span className="text-xs">零碳评估</span>
                        </div>
                    </div>

                    <div className="flex-1 p-10 flex flex-col">
                        {presentationBuildings.length > 0 ? (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-4 border-slate-300">
                                        <th className="px-6 py-4 text-left text-lg font-bold text-slate-700">建筑名称</th>
                                        <th className="px-6 py-4 text-right text-lg font-bold text-slate-700">屋顶面积 (㎡)</th>
                                        <th className="px-6 py-4 text-right text-lg font-bold text-slate-700">装机容量 (kWp)</th>
                                        <th className="px-6 py-4 text-right text-lg font-bold text-slate-700">容量占比</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {presentationBuildings.map((building: any, index: number) => {
                                        const totalCapacity = presentationBuildings.reduce((sum: number, b: any) => sum + (b.manualCapacity || 0), 0);
                                        const percentage = totalCapacity > 0 ? ((building.manualCapacity || 0) / totalCapacity * 100).toFixed(1) : 0;
                                        return (
                                            <tr key={index} className="border-b-2 border-slate-200 hover:bg-blue-50 transition-colors">
                                                <td className="px-6 py-4 text-lg font-medium text-slate-800">{building.name}</td>
                                                <td className="px-6 py-4 text-right text-lg text-slate-700">{building.area?.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right text-xl font-bold text-blue-700">{building.manualCapacity}</td>
                                                <td className="px-6 py-4 text-right text-lg text-slate-600">{percentage}%</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-24 text-slate-500">
                                <span className="material-icons text-7xl text-slate-300 mb-4">domain</span>
                                <p className="text-xl">暂无建筑明细数据</p>
                            </div>
                        )}
                    </div>

                    <div className="px-8 py-4 border-t border-slate-200 flex justify-between items-center text-base text-slate-500 bg-slate-50">
                        <span className="font-semibold">3/10</span>
                        <span>零碳项目收益评估软件</span>
                    </div>
                </div>
            )
        },
        // Slide 4: Generation & Environmental Analysis (Merged)
        {
            title: '四、发电量与环境效益',
            content: (
                <div className="h-full flex flex-col bg-white">
                    <div className="bg-slate-800 text-white px-8 py-3 rounded-t-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-icons text-green-400 text-3xl">eco</span>
                            <h2 className="text-3xl font-bold">四、发电量与环境效益</h2>
                        </div>
                        <div className="flex items-center gap-2 opacity-50">
                            <span className="material-icons text-sm">wb_sunny</span>
                            <span className="text-xs">零碳评估</span>
                        </div>
                    </div>

                    <div className="flex-1 p-5 flex flex-col">
                        {/* Top Section - Generation Analysis */}
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2 pb-2 border-b-2 border-amber-200">
                                <span className="material-icons text-amber-500 text-xl">bolt</span>
                                发电量分析
                            </h3>
                            {/* Generation Summary Cards */}
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white rounded-2xl p-3 shadow-lg">
                                    <p className="text-xs text-blue-700 font-semibold mb-1">首年总发电量</p>
                                    <p className="text-2xl font-black text-blue-800">{formatEnergy(longTermMetrics.genYear1).value} <span className="text-sm text-blue-600">{formatEnergy(longTermMetrics.genYear1).unit}</span></p>
                                </div>
                                <div className="border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-3 shadow-lg">
                                    <p className="text-xs text-emerald-700 font-semibold mb-1">25年累计发电</p>
                                    <p className="text-2xl font-black text-emerald-800">{formatEnergy(parseFloat(envImpact.totalGeneration)).value} <span className="text-sm text-emerald-600">{formatEnergy(parseFloat(envImpact.totalGeneration)).unit}</span></p>
                                </div>
                            </div>
                            {/* Monthly Chart */}
                            <div className="border-2 border-slate-200 rounded-2xl p-2 bg-slate-50">
                                <div className="h-28">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} barSize={28} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} height={30} />
                                            <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={(value) => formatEnergy(value / 100).value} />
                                            <Bar dataKey="retrofit" fill="#3b82f6" radius={[2, 2, 0, 0]}>
                                                <LabelList dataKey="retrofit" position="top" formatter={(value: number) => formatEnergy(value / 100).value} fontSize={8} fill="#1e3a5f" />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Section - Environmental Impact */}
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2 pb-2 border-b-2 border-green-200">
                                <span className="material-icons text-green-500 text-xl">nature</span>
                                环境效益
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-4 text-center shadow-xl">
                                    <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xl">
                                        <span className="material-icons text-white text-2xl">cloud</span>
                                    </div>
                                    <p className="text-xs text-emerald-700 font-semibold mb-1">CO2减排量</p>
                                    <p className="text-3xl font-black text-emerald-800">{envImpact.co2Reduction}</p>
                                    <p className="text-sm text-emerald-600 font-bold mt-1">吨</p>
                                </div>
                                <div className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-white rounded-2xl p-4 text-center shadow-xl">
                                    <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xl">
                                        <span className="material-icons text-white text-2xl">park</span>
                                    </div>
                                    <p className="text-xs text-green-700 font-semibold mb-1">等效植树</p>
                                    <p className="text-3xl font-black text-green-800">{envImpact.treesEquivalent}</p>
                                    <p className="text-sm text-green-600 font-bold mt-1">棵</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-4 border-t border-slate-200 flex justify-between items-center text-base text-slate-500 bg-slate-50">
                        <span className="font-semibold">4/10</span>
                        <span>零碳项目收益评估软件</span>
                    </div>
                </div>
            )
        },
        // Slide 5: Investment Analysis
        {
            title: '五、投资收益分析',
            content: (
                <div className="h-full flex flex-col bg-white">
                    <div className="bg-slate-800 text-white px-8 py-3 rounded-t-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-icons text-purple-400 text-3xl">trending_up</span>
                            <h2 className="text-3xl font-bold">五、投资收益分析</h2>
                        </div>
                        <div className="flex items-center gap-2 opacity-50">
                            <span className="material-icons text-sm">wb_sunny</span>
                            <span className="text-xs">零碳评估</span>
                        </div>
                    </div>

                    <div className="flex-1 p-10 flex flex-col justify-center">
                        {/* Key Metrics with Visual Enhancement */}
                        <div className="grid grid-cols-2 gap-10 mb-10">
                            <div className="border-2 border-slate-300 bg-gradient-to-br from-slate-50 to-white rounded-2xl p-8 hover:shadow-2xl transition-all">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-20 h-20 bg-slate-700 rounded-2xl flex items-center justify-center shadow-xl">
                                        <span className="material-icons text-white text-4xl">account_balance_wallet</span>
                                    </div>
                                    <div>
                                        <p className="text-lg text-slate-600 font-bold">初始总投资</p>
                                        <p className="text-sm text-slate-400">Initial Investment</p>
                                    </div>
                                </div>
                                <p className="text-6xl font-black text-slate-800">¥{solarModule.investment?.toFixed(2)}</p>
                                <p className="text-xl text-slate-600 font-bold mt-3">万元</p>
                            </div>
                            <div className="border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-8 hover:shadow-2xl transition-all">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-xl">
                                        <span className="material-icons text-white text-4xl">payments</span>
                                    </div>
                                    <div>
                                        <p className="text-lg text-emerald-700 font-bold">首年税后收益</p>
                                        <p className="text-sm text-slate-500">Year 1 Net Income</p>
                                    </div>
                                </div>
                                <p className="text-6xl font-black text-emerald-700">¥{solarModule.yearlySaving?.toFixed(2)}</p>
                                <p className="text-xl text-emerald-600 font-bold mt-3">万元</p>
                            </div>
                        </div>

                        {/* IRR and Payback with Enhanced Styling */}
                        <div className="grid grid-cols-2 gap-10">
                            <div className={`border-2 ${irrRating.border} ${irrRating.bg} rounded-2xl p-8 hover:shadow-2xl transition-all`}>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-16 h-16 ${irrRating.bg.replace('/50', '-600')} rounded-2xl flex items-center justify-center shadow-lg`}>
                                            <span className="material-icons text-white text-3xl">show_chart</span>
                                        </div>
                                        <div>
                                            <p className="text-lg text-slate-700 font-bold">内部收益率 IRR</p>
                                            <p className="text-sm text-slate-500">Internal Rate of Return</p>
                                        </div>
                                    </div>
                                    <span className={`px-5 py-3 rounded-full text-lg font-bold ${irrRating.bg} ${irrRating.text} border-2 ${irrRating.border}`}>{irrRating.label}</span>
                                </div>
                                <div className="flex items-baseline gap-3">
                                    <p className="text-6xl font-black text-slate-800">{longTermMetrics.irr.toFixed(2)}</p>
                                    <p className="text-3xl text-slate-600 font-bold">%</p>
                                </div>
                            </div>
                            <div className="border-2 border-purple-400 bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8 hover:shadow-2xl transition-all">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                                        <span className="material-icons text-white text-3xl">schedule</span>
                                    </div>
                                    <div>
                                        <p className="text-lg text-purple-700 font-bold">投资回本周期</p>
                                        <p className="text-sm text-slate-500">Payback Period</p>
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-3">
                                    <p className="text-6xl font-black text-purple-800">{longTermMetrics.paybackPeriod.toFixed(2)}</p>
                                    <p className="text-3xl text-purple-600 font-bold">年</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-4 border-t border-slate-200 flex justify-between items-center text-base text-slate-500 bg-slate-50">
                        <span className="font-semibold">5/10</span>
                        <span>零碳项目收益评估软件</span>
                    </div>
                </div>
            )
        },
        // Slide 6: 25-Year Cash Flow & Lifecycle (Merged)
        {
            title: '六、25年现金流与生命周期',
            content: (
                <div className="h-full flex flex-col bg-white">
                    <div className="bg-slate-800 text-white px-8 py-3 rounded-t-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-icons text-cyan-400 text-3xl">show_chart</span>
                            <h2 className="text-3xl font-bold">六、25年现金流与生命周期</h2>
                        </div>
                        <div className="flex items-center gap-2 opacity-50">
                            <span className="material-icons text-sm">wb_sunny</span>
                            <span className="text-xs">零碳评估</span>
                        </div>
                    </div>

                    <div className="flex-1 p-10 flex flex-col">
                        {/* Cash Flow Chart - 55% */}
                        <div className="mb-6" style={{height: '52%'}}>
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={longTermMetrics.yearlyDetails}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="year" tickFormatter={(value) => `${value}年`} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <YAxis tickFormatter={(value) => `¥${value}`} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <Bar dataKey="netIncome" fill="#3b82f6" name="净收益" radius={[3, 3, 0, 0]}>
                                        <LabelList dataKey="netIncome" position="top" formatter={(value: number) => value >= 0 ? `¥${value.toFixed(0)}` : ''} fontSize={10} fill="#1e3a5f" />
                                    </Bar>
                                    <Line type="monotone" dataKey={(d) => longTermMetrics.cashFlows.slice(0, d.year + 1).reduce((a, b) => a + b, 0)} stroke="#10b981" strokeWidth={3} dot={false} name="累计净现值" />
                                    <Tooltip formatter={(value, name) => [`¥${Number(value).toFixed(2)}万`, name === 'netIncome' ? '净收益' : '累计净现值']} contentStyle={{ backgroundColor: '#1e293b', borderRadius: '4px', border: 'none' }} labelStyle={{ color: '#f1f5f9' }} />
                                    <Legend />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Key Years Cards - 45% */}
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b-2 border-blue-200">
                                <span className="material-icons text-blue-500">calendar_today</span>
                                关键年度财务指标
                            </h3>
                            <div className="grid grid-cols-6 gap-4">
                                {[1, 5, 10, 15, 20, 25].map((year) => {
                                    const item = longTermMetrics.yearlyDetails.find(d => d.year === year);
                                    if (!item) return null;
                                    const cumulativeNPV = longTermMetrics.cashFlows.slice(0, year + 1).reduce((sum, val) => sum + val, 0);
                                    const isPaybackYear = cumulativeNPV >= 0 && longTermMetrics.cashFlows.slice(0, year).reduce((sum, val) => sum + val, 0) < 0;
                                    return (
                                        <div key={year} className={`border-2 rounded-xl p-3 text-center shadow-md ${isPaybackYear ? 'border-emerald-500 bg-emerald-100 shadow-emerald-200' : 'border-slate-300 bg-white hover:shadow-lg transition-all'}`}>
                                            <p className="text-xs text-slate-700 font-bold mb-2">第{year}年</p>
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-[10px] text-slate-500">发电量</p>
                                                    <p className="text-sm font-bold text-slate-800">{(item.generation || 0).toFixed(1)}万度</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-500">净收益</p>
                                                    <p className={`text-sm font-bold ${(item.netIncome || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>¥{(item.netIncome || 0).toFixed(1)}万</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-500">累计NPV</p>
                                                    <p className={`text-sm font-bold ${cumulativeNPV >= 0 ? 'text-blue-700' : 'text-red-700'}`}>¥{cumulativeNPV.toFixed(1)}万</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-4 border-t border-slate-200 flex justify-between items-center text-base text-slate-500 bg-slate-50">
                        <span className="font-semibold">6/10</span>
                        <span>零碳项目收益评估软件</span>
                    </div>
                </div>
            )
        },
        // Slide 10: Investment Summary
        {
            title: '七、投资收益汇总',
            content: (
                <div className="h-full flex flex-col bg-white">
                    <div className="bg-slate-800 text-white px-8 py-3 rounded-t-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-icons text-pink-400 text-3xl">summarize</span>
                            <h2 className="text-3xl font-bold">七、投资收益汇总</h2>
                        </div>
                        <div className="flex items-center gap-2 opacity-50">
                            <span className="material-icons text-sm">wb_sunny</span>
                            <span className="text-xs">零碳评估</span>
                        </div>
                    </div>

                    <div className="flex-1 p-8 flex flex-col">
                        {/* Summary Table */}
                        <table className="w-full mb-8">
                            <tbody>
                                <tr className="border-b border-slate-200">
                                    <td className="py-3 text-slate-600">装机容量</td>
                                    <td className="py-3 text-right font-medium text-slate-800">{formatPower(params.simpleParams.capacity).value} {formatPower(params.simpleParams.capacity).unit}</td>
                                </tr>
                                <tr className="border-b border-slate-200 bg-slate-50">
                                    <td className="py-3 text-slate-600">初始总投资</td>
                                    <td className="py-3 text-right font-medium text-slate-800">¥{solarModule.investment?.toFixed(2)} 万元</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <td className="py-3 text-slate-600">内部收益率 IRR</td>
                                    <td className="py-3 text-right font-medium text-slate-800">{longTermMetrics.irr.toFixed(2)}%</td>
                                </tr>
                                <tr className="border-b border-slate-200 bg-slate-50">
                                    <td className="py-3 text-slate-600">投资回本周期</td>
                                    <td className="py-3 text-right font-medium text-slate-800">{longTermMetrics.paybackPeriod.toFixed(2)} 年</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <td className="py-3 text-slate-600">25年累计收益</td>
                                    <td className="py-3 text-right font-medium text-emerald-700">¥{longTermMetrics.rev25Year?.toFixed(2) || '-'} 万元</td>
                                </tr>
                                <tr>
                                    <td className="py-3 text-slate-600">25年总净现值</td>
                                    <td className="py-3 text-right font-medium text-blue-700">¥{longTermMetrics.cashFlows.slice(1).reduce((sum, val) => sum + val, 0).toFixed(2)} 万元</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Key Takeaway */}
                        <div className="mt-auto p-5 bg-slate-800 text-white rounded-lg">
                            <h3 className="font-bold mb-3 flex items-center gap-2">
                                <span className="material-icons">insights</span>
                                投资建议
                            </h3>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <p>• 项目内部收益率 <span className="font-semibold text-emerald-400">{longTermMetrics.irr.toFixed(2)}%</span></p>
                                <p>• 预计 <span className="font-semibold text-amber-400">{longTermMetrics.paybackPeriod.toFixed(2)}年</span> 回本</p>
                                <p>• 25年累计净收益 <span className="font-semibold text-blue-400">¥{longTermMetrics.cashFlows.slice(1).reduce((sum, val) => sum + val, 0).toFixed(2)}万</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-4 border-t border-slate-200 flex justify-between items-center text-base text-slate-500 bg-slate-50">
                        <span className="font-semibold">7/10</span>
                        <span>零碳项目收益评估软件</span>
                    </div>
                </div>
            )
        },
        // Slide 11: Solution Comparison (only show if multiple solutions exist)
        ...(solutionComparisonData.length > 1 ? [{
            title: '八、方案对比分析',
            content: (
                <div className="h-full flex flex-col bg-white">
                    <div className="bg-slate-800 text-white px-8 py-3 rounded-t-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-icons text-indigo-400 text-3xl">compare</span>
                            <h2 className="text-3xl font-bold">八、方案对比分析</h2>
                        </div>
                        <div className="flex items-center gap-2 opacity-50">
                            <span className="material-icons text-sm">wb_sunny</span>
                            <span className="text-xs">零碳评估</span>
                        </div>
                    </div>

                    <div className="flex-1 p-8 flex flex-col">
                        {/* Solution Comparison Table */}
                        <div className="border-2 border-slate-200 rounded-xl overflow-hidden mb-6">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-100">
                                        <th className="px-4 py-3 text-left font-bold text-slate-800">方案名称</th>
                                        <th className="px-4 py-3 text-center font-bold text-slate-800">接入方式</th>
                                        <th className="px-4 py-3 text-center font-bold text-slate-800">组件品牌</th>
                                        <th className="px-4 py-3 text-right font-bold text-slate-800">EPC单价</th>
                                        <th className="px-4 py-3 text-right font-bold text-slate-800">总投资</th>
                                        <th className="px-4 py-3 text-right font-bold text-slate-800">IRR</th>
                                        <th className="px-4 py-3 text-right font-bold text-slate-800">回本周期</th>
                                        <th className="px-4 py-3 text-right font-bold text-slate-800">25年收益</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {solutionComparisonData.map((solution, index) => {
                                        const isBestIRR = solution.irr === Math.max(...solutionComparisonData.map(s => s.irr));
                                        const isBestPayback = solution.paybackPeriod === Math.min(...solutionComparisonData.map(s => s.paybackPeriod));
                                        const isSelected = solution.id === params.selectedSolutionId;
                                        return (
                                            <tr key={solution.id} className={`border-b border-slate-100 ${isSelected ? 'bg-blue-50 font-semibold' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {isSelected && <span className="material-icons text-blue-600 text-sm">check_circle</span>}
                                                        <span className={isSelected ? 'text-blue-800' : 'text-slate-800'}>{solution.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center text-slate-700">{solution.connectionType}</td>
                                                <td className="px-4 py-3 text-center text-slate-700">{solution.brand}</td>
                                                <td className="px-4 py-3 text-right text-slate-700">¥{solution.epcPrice.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right text-slate-700">¥{solution.investment.toFixed(2)}万</td>
                                                <td className={`px-4 py-3 text-right ${isBestIRR ? 'text-emerald-700 font-bold' : 'text-slate-700'}`}>
                                                    {solution.irr.toFixed(2)}%
                                                    {isBestIRR && <span className="material-icons text-emerald-500 text-xs align-middle ml-1">star</span>}
                                                </td>
                                                <td className={`px-4 py-3 text-right ${isBestPayback ? 'text-emerald-700 font-bold' : 'text-slate-700'}`}>
                                                    {solution.paybackPeriod.toFixed(2)}年
                                                    {isBestPayback && <span className="material-icons text-emerald-500 text-xs align-middle ml-1">star</span>}
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-700">¥{solution.rev25Year.toFixed(2)}万</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Key Metrics Cards */}
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            <div className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white rounded-xl p-4 text-center">
                                <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <span className="material-icons text-white text-lg">show_chart</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-1">最高IRR</p>
                                <p className="text-lg font-bold text-emerald-700">{Math.max(...solutionComparisonData.map(s => s.irr)).toFixed(2)}%</p>
                            </div>
                            <div className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white rounded-xl p-4 text-center">
                                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <span className="material-icons text-white text-lg">schedule</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-1">最短回本</p>
                                <p className="text-lg font-bold text-blue-700">{Math.min(...solutionComparisonData.map(s => s.paybackPeriod)).toFixed(2)}年</p>
                            </div>
                            <div className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white rounded-xl p-4 text-center">
                                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <span className="material-icons text-white text-lg">account_balance_wallet</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-1">最低投资</p>
                                <p className="text-lg font-bold text-purple-700">¥{Math.min(...solutionComparisonData.map(s => s.investment)).toFixed(2)}万</p>
                            </div>
                            <div className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white rounded-xl p-4 text-center">
                                <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <span className="material-icons text-white text-lg">trending_up</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-1">最高收益</p>
                                <p className="text-lg font-bold text-amber-700">¥{Math.max(...solutionComparisonData.map(s => s.rev25Year)).toFixed(2)}万</p>
                            </div>
                        </div>

                        {/* Recommendation */}
                        <div className="mt-auto p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl">
                            <div className="flex items-center gap-3">
                                <span className="material-icons text-indigo-600 text-2xl">lightbulb</span>
                                <div>
                                    <p className="text-sm font-bold text-indigo-800">方案建议</p>
                                    <p className="text-xs text-indigo-700">根据IRR和回本周期综合评估，推荐选择IRR最高或回本周期最短的方案</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-4 border-t border-slate-200 flex justify-between items-center text-base text-slate-500 bg-slate-50">
                        <span className="font-semibold">8/10</span>
                        <span>零碳项目收益评估软件</span>
                    </div>
                </div>
            )
        }] : []),
        // Slide 11/12: O&M Maintenance Plan
        {
            title: solutionComparisonData.length > 1 ? '九、光伏运维计划' : '九、光伏运维计划',
            content: (
                <div className="h-full flex flex-col bg-white">
                    <div className="bg-slate-800 text-white px-8 py-3 rounded-t-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-icons text-cyan-400 text-3xl">build</span>
                            <h2 className="text-3xl font-bold">九、光伏运维计划</h2>
                        </div>
                        <div className="flex items-center gap-2 opacity-50">
                            <span className="material-icons text-sm">wb_sunny</span>
                            <span className="text-xs">零碳评估</span>
                        </div>
                    </div>

                    <div className="flex-1 p-8 flex flex-col">
                        {/* Maintenance Plan Cards */}
                        <div className="grid grid-cols-3 gap-6 mb-8">
                            <div className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white rounded-xl p-6 hover:shadow-lg transition-all">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                                        <span className="material-icons text-white text-2xl">today</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-blue-800">日常巡检</h3>
                                </div>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3">
                                        <span className="material-icons text-blue-500 text-lg mt-0.5">check_circle</span>
                                        <span className="text-slate-700">每日监控发电数据</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="material-icons text-blue-500 text-lg mt-0.5">check_circle</span>
                                        <span className="text-slate-700">每月清洁组件表面</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="material-icons text-blue-500 text-lg mt-0.5">check_circle</span>
                                        <span className="text-slate-700">每月检查电气连接</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white rounded-xl p-6 hover:shadow-lg transition-all">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                                        <span className="material-icons text-white text-2xl">event_repeat</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-amber-800">季度维护</h3>
                                </div>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3">
                                        <span className="material-icons text-amber-500 text-lg mt-0.5">check_circle</span>
                                        <span className="text-slate-700">逆变器性能检测</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="material-icons text-amber-500 text-lg mt-0.5">check_circle</span>
                                        <span className="text-slate-700">电缆线路检查</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="material-icons text-amber-500 text-lg mt-0.5">check_circle</span>
                                        <span className="text-slate-700">支架结构紧固</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white rounded-xl p-6 hover:shadow-lg transition-all">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                                        <span className="material-icons text-white text-2xl">calendar_month</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-emerald-800">年度检修</h3>
                                </div>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3">
                                        <span className="material-icons text-emerald-500 text-lg mt-0.5">check_circle</span>
                                        <span className="text-slate-700">系统效率全面评估</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="material-icons text-emerald-500 text-lg mt-0.5">check_circle</span>
                                        <span className="text-slate-700">设备预防性试验</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="material-icons text-emerald-500 text-lg mt-0.5">check_circle</span>
                                        <span className="text-slate-700">发电量衰减分析</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Key Metrics */}
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            <div className="border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white rounded-lg p-4 text-center">
                                <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <span className="material-icons text-white text-lg">cleaning_services</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-1">清洁频率</p>
                                <p className="text-lg font-bold text-slate-800">每月</p>
                            </div>
                            <div className="border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white rounded-lg p-4 text-center">
                                <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <span className="material-icons text-white text-lg">electric_bolt</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-1">电气检测</p>
                                <p className="text-lg font-bold text-slate-800">每月</p>
                            </div>
                            <div className="border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white rounded-lg p-4 text-center">
                                <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <span className="material-icons text-white text-lg">settings</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-1">设备维护</p>
                                <p className="text-lg font-bold text-slate-800">每季</p>
                            </div>
                            <div className="border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white rounded-lg p-4 text-center">
                                <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <span className="material-icons text-white text-lg">assessment</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-1">系统评估</p>
                                <p className="text-lg font-bold text-slate-800">每年</p>
                            </div>
                        </div>

                        {/* Footer Note */}
                        <div className="mt-auto p-4 bg-cyan-50 border-2 border-cyan-200 rounded-xl">
                            <div className="flex items-center gap-3">
                                <span className="material-icons text-cyan-600 text-2xl">info</span>
                                <div>
                                    <p className="text-sm font-bold text-cyan-800">运维保障</p>
                                    <p className="text-xs text-cyan-700">定期维护可确保系统稳定运行，最大化发电收益，延长设备使用寿命</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-4 border-t border-slate-200 flex justify-between items-center text-base text-slate-500 bg-slate-50">
                        <span className="font-semibold">{solutionComparisonData.length > 1 ? '10/10' : '9/9'}</span>
                        <span>零碳项目收益评估软件</span>
                    </div>
                </div>
            )
        }
    ];

    // Presentation Mode
    if (isPresentationMode) {
        return (
            <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
                {/* Top Bar */}
                <div className="bg-slate-800 px-6 py-4 flex justify-between items-center border-b border-slate-700">
                    <div className="flex items-center gap-4">
                        <div>
                            <p className="text-white font-semibold">{projectBaseInfo?.name || '-'}</p>
                            <p className="text-slate-400 text-sm">{slides[currentSlide]?.title}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-white text-lg font-bold">{currentSlide + 1} <span className="text-slate-500">/ {slides.length}</span></p>
                            {/* Progress bar */}
                            <div className="w-32 bg-slate-700 rounded-full h-1.5 mt-1">
                                <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{width: `${((currentSlide + 1) / slides.length) * 100}%`}}></div>
                            </div>
                        </div>
                        <button
                            onClick={handleExportPDF}
                            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 flex items-center gap-2 transition-colors mr-2"
                        >
                            <span className="material-icons text-sm">picture_as_pdf</span>
                            导出PDF
                        </button>
                        <button
                            onClick={() => setIsPresentationMode(false)}
                            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 transition-colors"
                        >
                            <span className="material-icons text-sm">close</span>
                            退出
                        </button>
                    </div>
                </div>

                {/* Slide Content - 16:9 Aspect Ratio */}
                <div className="flex-1 flex items-center justify-center p-6 bg-slate-900">
                    <div className="relative" style={{width: '100%', maxWidth: '1280px', aspectRatio: '16/9'}}>
                        <div className="w-full h-full bg-white rounded-lg shadow-2xl overflow-hidden">
                            {slides[currentSlide]?.content}
                        </div>
                    </div>
                </div>

                {/* Navigation Bar */}
                <div className="bg-slate-800 px-6 py-4 flex justify-center items-center gap-6 border-t border-slate-700">
                    <button
                        onClick={handlePrevSlide}
                        disabled={currentSlide === 0}
                        className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-all ${currentSlide === 0 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-800 hover:bg-slate-100'}`}
                    >
                        <span className="material-icons">arrow_back</span>
                        上一页
                    </button>
                    <div className="flex gap-2 items-center">
                        {slides.map((slide, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={`transition-all ${index === currentSlide ? 'bg-blue-500 w-8 h-2 rounded-full' : 'bg-slate-600 hover:bg-slate-500 w-2 h-2 rounded-full'}`}
                                title={slide.title}
                            />
                        ))}
                    </div>
                    <button
                        onClick={handleNextSlide}
                        disabled={currentSlide === slides.length - 1}
                        className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-all ${currentSlide === slides.length - 1 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-800 hover:bg-slate-100'}`}
                    >
                        下一页
                        <span className="material-icons">arrow_forward</span>
                    </button>
                </div>

                {/* Keyboard Hints */}
                <div className="absolute bottom-28 right-6 text-slate-500 text-xs bg-slate-800/80 px-3 py-2 rounded-lg">
                    <p className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><kbd className="px-2 py-1 bg-slate-700 rounded">←</kbd><kbd className="px-2 py-1 bg-slate-700 rounded">→</kbd> 切换</span>
                        <span className="flex items-center gap-1"><kbd className="px-2 py-1 bg-slate-700 rounded">空格</kbd> 下一页</span>
                        <span className="flex items-center gap-1"><kbd className="px-2 py-1 bg-slate-700 rounded">ESC</kbd> 退出</span>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-100 overflow-y-auto z-50">
            <style>{printStyle}</style>
            <div ref={printRef} className="print-container max-w-5xl mx-auto bg-white min-h-screen p-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 print:hidden">
                    <h1 className="text-2xl font-bold text-slate-900">分布式光伏发电项目收益评估报告</h1>
                    <p className="text-slate-500">{projectBaseInfo?.name || '-'}</p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsPresentationMode(!isPresentationMode)}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 flex items-center gap-2"
                        >
                            <span className="material-icons">slideshow</span>
                            {isPresentationMode ? '退出演示' : 'PPT演示'}
                        </button>
                        <button
                            onClick={handleExportPDF}
                            data-pdf-export
                            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 flex items-center gap-2"
                        >
                            <span className="material-icons">picture_as_pdf</span>
                            导出PDF
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
                        >
                            <span className="material-icons">print</span>
                            打印报告
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 flex items-center gap-2"
                        >
                            <span className="material-icons">close</span>
                            关闭
                        </button>
                    </div>
                </div>

                {/* Report Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl p-8 mb-8">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="material-icons">assessment</span>
                        分布式光伏发电项目收益评估报告
                    </h2>
                    <div className="flex items-center gap-4 text-blue-100">
                        <div>
                            <p className="text-sm font-medium">项目名称：</p>
                            <p className="text-lg font-bold">{projectBaseInfo?.name || '-'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium">项目地点：</p>
                            <p className="text-lg font-bold">{projectBaseInfo?.province || ''} {projectBaseInfo?.city || ''}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium">生成时间：</p>
                            <p className="text-lg font-bold">{new Date().toLocaleString('zh-CN')}</p>
                        </div>
                    </div>
                </div>

                {/* 1. Project Basic Info */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <span className="material-icons text-blue-600">info</span>
                        一、项目基本信息
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">项目名称</p>
                            <div className="text-base font-medium text-slate-800">{projectBaseInfo?.name || '-'}</div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">项目类型</p>
                            <div className="text-base font-medium text-slate-800">分布式光伏发电</div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">所在地区</p>
                            <div className="text-base font-medium text-slate-800">{projectBaseInfo?.province || ''} {projectBaseInfo?.city || ''}</div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">建筑数量</p>
                            <div className="text-base font-medium text-slate-800">{projectBaseInfo?.buildings?.length || 0} 栋</div>
                        </div>
                    </div>
                </section>

                {/* 2. Solution Configuration */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <span className="material-icons text-blue-600">settings</span>
                        二、方案配置
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">接入方式</p>
                            <div className="text-base font-medium text-slate-800">
                                {currentSolution?.connectionType === 'high' ? '10kV 高压并网' : '380V 低压并网'}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">组件品牌</p>
                            <div className="text-base font-medium text-slate-800">{currentSolution?.brand || '通用组件'}</div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">首年衰减率</p>
                            <div className="text-base font-medium text-slate-800">{params.advParams.degradationFirstYear}%</div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">次年开始衰减率</p>
                            <div className="text-base font-medium text-slate-800">{params.advParams.degradationLinear}%/年</div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">EPC 合同单价</p>
                            <div className="text-base font-medium text-slate-800">¥{params.simpleParams.epcPrice.toFixed(2)} 元/Wp</div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">总投资额</p>
                            <div className="text-base font-medium text-slate-800">¥{solarModule.investment?.toFixed(2)} 万</div>
                        </div>
                    </div>
                </section>

                {/* 3. Technical Parameters */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <span className="material-icons text-blue-600">tune</span>
                        三、技术参数
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">安装面积</p>
                            <div className="text-base font-medium text-slate-800">{formatArea(params.simpleParams.area).value} {formatArea(params.simpleParams.area).unit}</div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">拟装机容量</p>
                            <div className="text-base font-medium text-slate-800">{formatPower(params.simpleParams.capacity).value} {formatPower(params.simpleParams.capacity).unit}</div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">日均日照时数</p>
                            <div className="text-base font-medium text-slate-800">{params.advParams.dailySunHours} 小时</div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">系统效率 PR</p>
                            <div className="text-base font-medium text-slate-800">{params.advParams.prValue}%</div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">方位角效率</p>
                            <div className="text-base font-medium text-slate-800">{params.advParams.azimuthEfficiency}%</div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">年发电天数</p>
                            <div className="text-base font-medium text-slate-800">{params.advParams.generationDays} 天</div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">首年发电量</p>
                            <div className="text-base font-medium text-slate-800">{longTermMetrics.genYear1.toFixed(2)} 万度</div>
                        </div>
                    </div>
                </section>

                {/* 4. Income Details - Renamed from Financial Analysis */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <span className="material-icons text-blue-600">account_balance</span>
                        四、收益详细分析
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center">
                            <div className="text-xs text-blue-600 mb-1">初始总投资</div>
                            <div className="text-2xl font-bold text-blue-700">¥{solarModule.investment?.toFixed(2)}万</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center">
                            <div className="text-xs text-green-600 mb-1">首年收益（税后）</div>
                            <div className="text-2xl font-bold text-green-700">¥{solarModule.yearlySaving?.toFixed(2)}万</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 text-center">
                            <div className="text-xs text-purple-600 mb-1">内部收益率 IRR</div>
                            <div className="text-2xl font-bold text-purple-700">{longTermMetrics.irr.toFixed(2)}%</div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 text-center">
                            <div className="text-xs text-orange-600 mb-1">回本周期</div>
                            <div className="text-2xl font-bold text-orange-700">{longTermMetrics.paybackPeriod.toFixed(2)}年</div>
                        </div>
                    </div>
                </section>

                {/* 6. Solution Comparison */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <span className="material-icons text-blue-600">compare</span>
                        五、方案对比分析
                    </h3>
                    <SolutionComparison
                        solutions={params.solutions || []}
                        params={params}
                        selfConsumptionRate={calculatedSelfConsumption}
                    />
                </section>

                {/* 7. Monthly Generation Distribution */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <span className="material-icons text-blue-600">bar_chart</span>
                        六、月度发电量分布
                    </h3>
                    <div className="h-64 mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickFormatter={(value) => `${value}`} />
                                <YAxis tickFormatter={(value) => `${(value / 100).toFixed(0)}`} />
                                <Bar dataKey="retrofit" fill="url(#gradient1)">
                                    <LabelList dataKey="retrofit" position="top" formatter={(value: number) => `${(value / 100).toFixed(2)}`} fontSize={10} fill="#1e3a5f" />
                                </Bar>
                                <Tooltip
                                    formatter={(value, name, props) => {
                                        if (name === 'retrofit') {
                                            return `${props.payload.name}: ${(value / 100).toFixed(2)}万度`;
                                        }
                                        return null;
                                    }}
                                />
                                <Legend />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Monthly Data Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 text-left font-semibold text-slate-700">月份</th>
                                    <th className="px-4 py-3 text-right font-semibold text-slate-700">发电量 (万度)</th>
                                    <th className="px-4 py-3 text-right font-semibold text-slate-700">占比 (%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {chartData.map((item, index) => {
                                    const totalYear = chartData.reduce((sum, d) => sum + d.retrofit, 0);
                                    const percentage = ((item.retrofit / totalYear) * 100).toFixed(1);
                                    return (
                                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 page-break-inside-avoid">
                                            <td className="px-4 py-3 text-slate-800">{item.name}</td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-700">{(item.retrofit / 100).toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-700">{percentage}%</td>
                                        </tr>
                                    );
                                })}
                                <tr className="bg-blue-50 font-bold border-t-2 border-slate-300">
                                    <td className="px-4 py-3 text-slate-800">合计</td>
                                    <td className="px-4 py-3 text-right font-mono text-blue-700">
                                        {(chartData.reduce((sum, d) => sum + d.retrofit, 0) / 100).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-blue-700">100%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 8. 25-Year Cash Flow Trend */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <span className="material-icons text-blue-600">show_chart</span>
                        七、25年现金流趋势
                    </h3>
                    <div className="h-64 mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={longTermMetrics.yearlyDetails}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="year" tickFormatter={(value) => `第${value}年`} />
                                <YAxis tickFormatter={(value) => `¥${(value / 100).toFixed(0)}`} />
                                <Bar dataKey="netIncome" fill="#4f46e5">
                                    <LabelList dataKey="netIncome" position="top" formatter={(value: number) => value >= 0 ? `¥${value.toFixed(1)}` : ''} fontSize={9} fill="#1e3a5f" />
                                </Bar>
                                <Bar dataKey="revenue" fill="#10b981">
                                    <LabelList dataKey="revenue" position="top" formatter={(value: number) => `¥${value.toFixed(1)}`} fontSize={9} fill="#10b981" />
                                </Bar>
                                <Tooltip
                                    formatter={(value, name, props) => {
                                        if (name === 'netIncome') {
                                            return `第${props.payload.year}年净收益: ¥${value.toFixed(2)}万`;
                                        }
                                        if (name === 'revenue') {
                                            return `第${props.payload.year}年毛收益: ¥${value.toFixed(2)}万`;
                                        }
                                        return null;
                                    }}
                                />
                                <Legend />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    {/* 25-Year Cash Flow Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b-2 border-slate-300">
                                    <th className="px-3 py-2 text-center font-semibold text-slate-700">年份</th>
                                    <th className="px-3 py-2 text-right font-semibold text-slate-700">发电量<br/>(万度)</th>
                                    <th className="px-3 py-2 text-right font-semibold text-slate-700">毛收益<br/>(万元)</th>
                                    <th className="px-3 py-2 text-right font-semibold text-slate-700">运维+保险<br/>(万元)</th>
                                    <th className="px-3 py-2 text-right font-semibold text-slate-700">税金<br/>(万元)</th>
                                    <th className="px-3 py-2 text-right font-semibold text-slate-700">净收益<br/>(万元)</th>
                                    <th className="px-3 py-2 text-right font-semibold text-slate-700">累计净现值<br/>(万元)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {longTermMetrics.yearlyDetails.map((item, index) => {
                                    const cumulativeNPV = longTermMetrics.cashFlows.slice(0, index + 2).reduce((sum, val) => sum + val, 0);
                                    const isPaybackYear = Math.abs(cumulativeNPV) < Math.abs(longTermMetrics.yearlyDetails[index]?.netIncome || 0);
                                    return (
                                        <tr key={index} className={`border-b border-slate-100 hover:bg-slate-50 page-break-inside-avoid ${isPaybackYear ? 'bg-green-50 font-bold' : ''}`}>
                                            <td className="px-3 py-2 text-center text-slate-800">第{item.year}年</td>
                                            <td className="px-3 py-2 text-right font-mono text-slate-700">{item.generation.toFixed(2)}</td>
                                            <td className="px-3 py-2 text-right font-mono text-green-700">{item.revenue.toFixed(2)}</td>
                                            <td className="px-3 py-2 text-right font-mono text-slate-700">{(item.opex).toFixed(2)}</td>
                                            <td className="px-3 py-2 text-right font-mono text-slate-700">{item.tax.toFixed(2)}</td>
                                            <td className={`px-3 py-2 text-right font-mono ${item.netIncome >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{item.netIncome.toFixed(2)}</td>
                                            <td className={`px-3 py-2 text-right font-mono ${cumulativeNPV >= 0 ? 'text-green-700' : 'text-red-600'}`}>{cumulativeNPV.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                                <tr className="bg-blue-50 font-bold border-t-2 border-slate-300">
                                    <td className="px-3 py-2 text-center text-slate-800" colSpan={2}>25年合计</td>
                                    <td className="px-3 py-2 text-right font-mono text-green-700">
                                        {longTermMetrics.yearlyDetails.reduce((sum, d) => sum + d.revenue, 0).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-slate-700">
                                        {longTermMetrics.yearlyDetails.reduce((sum, d) => sum + d.opex + d.tax, 0).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-slate-700">
                                        {longTermMetrics.yearlyDetails.reduce((sum, d) => sum + d.tax, 0).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-blue-700">
                                        {longTermMetrics.rev25Year?.toFixed(2) || '0'}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-green-700">
                                        {longTermMetrics.cashFlows.slice(1).reduce((sum, val) => sum + val, 0).toFixed(2)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-sm text-amber-800">
                            <span className="font-semibold">回本周期说明：</span>
                            项目预计在第 <span className="font-bold text-amber-900">{Math.floor(longTermMetrics.paybackPeriod)}</span> 年
                            {Math.floor(longTermMetrics.paybackPeriod) < longTermMetrics.paybackPeriod && ` 第 ${Math.round((longTermMetrics.paybackPeriod % 1) * 12)} 个月`}
                            左右实现投资回本（累计净现值转正）。
                        </p>
                    </div>
                </section>

                {/* 9. Investment Summary Table */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <span className="material-icons text-blue-600">summarize</span>
                        八、投资收益汇总表
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <tbody>
                                <tr className="border-b border-slate-200">
                                    <td className="px-4 py-3 text-slate-600 bg-slate-50 font-medium w-1/3">装机容量</td>
                                    <td className="px-4 py-3 text-slate-800 font-medium">{formatPower(params.simpleParams.capacity).value} {formatPower(params.simpleParams.capacity).unit}</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <td className="px-4 py-3 text-slate-600 bg-slate-50 font-medium">初始总投资</td>
                                    <td className="px-4 py-3 text-slate-800 font-medium">¥{solarModule.investment?.toFixed(2)} 万元</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <td className="px-4 py-3 text-slate-600 bg-slate-50 font-medium">首年发电量</td>
                                    <td className="px-4 py-3 text-slate-800 font-medium">{longTermMetrics.genYear1.toFixed(2)} 万度</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <td className="px-4 py-3 text-slate-600 bg-slate-50 font-medium">首年税后收益</td>
                                    <td className="px-4 py-3 text-green-700 font-medium">¥{solarModule.yearlySaving?.toFixed(2)} 万元</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <td className="px-4 py-3 text-slate-600 bg-slate-50 font-medium">25年累计收益</td>
                                    <td className="px-4 py-3 text-green-700 font-medium">¥{longTermMetrics.rev25Year.toFixed(2)} 万元</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <td className="px-4 py-3 text-slate-600 bg-slate-50 font-medium">内部收益率 (IRR)</td>
                                    <td className="px-4 py-3 text-slate-800 font-medium">{longTermMetrics.irr.toFixed(2)}%</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <td className="px-4 py-3 text-slate-600 bg-slate-50 font-medium">投资回本周期</td>
                                    <td className="px-4 py-3 text-slate-800 font-medium">{longTermMetrics.paybackPeriod.toFixed(2)} 年</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <td className="px-4 py-3 text-slate-600 bg-slate-50 font-medium">25年总净现值</td>
                                    <td className="px-4 py-3 text-blue-700 font-bold">¥{longTermMetrics.cashFlows.slice(1).reduce((sum, val) => sum + val, 0).toFixed(2)} 万元</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Footer */}
                <div className="text-center text-sm text-slate-400 mt-8 pt-4 border-t border-slate-200 print:hidden">
                    <p>本报告由零碳项目收益评估软件自动生成</p>
                    <p>生成时间：{new Date().toLocaleString('zh-CN')}</p>
                </div>
            </div>
        );
            </div>
        );
    }
