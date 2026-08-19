import React, { useRef, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ComposedChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, LabelList, ReferenceLine } from 'recharts';
import { useProject } from '../../../context/ProjectContext';
import { useSolarMetrics, calculateSolarMetrics } from '../hooks';
import { SolutionComparison } from './SolutionComparison';
import { MODULE_BRANDS, SolarParamsState, SolarReportAudience, SOLAR_CONSTRUCTION_METHODS, CABLE_BRANDS, INVERTER_BRANDS, buildDefaultSolarMaterialBill } from '../types';
import { getGenerationWeightedTariff } from '../utils/emcTariff';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { PRODUCT_IDENTITY } from '../../../shared/config/productIdentity';

interface SolarReportProps {
    onClose: () => void;
    defaultToPresentationMode?: boolean;
    selfConsumptionRate?: number;
    initialAudience?: SolarReportAudience;
    onAudienceChange?: (audience: SolarReportAudience) => void;
}

type SolarPptVisual = 'rooftop' | 'panel' | 'panelWarm' | 'sunset';

const solarPptVisuals: Record<SolarPptVisual, string> = {
    rooftop: '/solar-ppt/photo-industrial-rooftop.jpg',
    panel: '/solar-ppt/photo-panel-rain.jpg',
    panelWarm: '/solar-ppt/photo-panel-warm.jpg',
    sunset: '/solar-ppt/photo-solar-sunset.jpg'
};

const PhotoBackground: React.FC<{ visual: SolarPptVisual; overlay?: string; className?: string }> = ({
    visual,
    overlay = 'bg-gradient-to-r from-slate-950/82 via-slate-950/45 to-slate-950/18',
    className = ''
}) => (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
        <img src={solarPptVisuals[visual]} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className={`absolute inset-0 ${overlay}`}></div>
    </div>
);

const CleanSlideBackground: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`h-full flex flex-col relative overflow-hidden bg-[#f5f7fb] ${className}`}>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_12%,rgba(37,99,235,.08),transparent_26%),radial-gradient(circle_at_82%_16%,rgba(16,185,129,.10),transparent_28%),linear-gradient(135deg,#ffffff_0%,#f7fafc_48%,#eef5ff_100%)]"></div>
        {children}
    </div>
);

const PremiumSlideHeader: React.FC<{ icon: string; title: React.ReactNode; tone?: 'amber' | 'sky' | 'emerald' | 'violet' | 'slate' }> = ({ icon, title, tone = 'sky' }) => {
    const toneClass = {
        amber: 'text-amber-500 bg-amber-50',
        sky: 'text-sky-500 bg-sky-50',
        emerald: 'text-emerald-500 bg-emerald-50',
        violet: 'text-violet-500 bg-violet-50',
        slate: 'text-slate-600 bg-slate-100'
    }[tone];

    return (
        <div className="relative z-10 px-10 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${toneClass}`}>
                    <span className="material-icons text-3xl">{icon}</span>
                </div>
                <h2 className="text-3xl font-black text-slate-950 leading-tight">{title}</h2>
            </div>
            <div className="flex items-center gap-2 text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
                <span className="material-icons text-amber-500 text-sm">wb_sunny</span>
                <span className="text-xs font-bold">零碳评估</span>
            </div>
        </div>
    );
};

const PremiumSlideFooter: React.FC<{ page: React.ReactNode; total: number }> = ({ page, total }) => (
    <div className="relative z-10 px-8 py-4 flex items-center text-base text-slate-500 bg-white border-t border-slate-200">
        <span className="font-semibold">{page}/{total}</span>
    </div>
);

export default function SolarReport({
    onClose,
    defaultToPresentationMode = true,
    selfConsumptionRate,
    initialAudience = 'owner',
    onAudienceChange
}: SolarReportProps) {
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
    const [showMultipleSolutions, setShowMultipleSolutions] = useState(false);
    const [reportAudience, setReportAudience] = useState<SolarReportAudience>(initialAudience);
    const slideViewportRef = useRef<HTMLDivElement>(null);
    const [presentationScale, setPresentationScale] = useState(1);

    // 所有页面始终按 1280×720 排版，屏幕端仅整体等比缩放，避免字号、图表和换行随窗口尺寸漂移。
    React.useLayoutEffect(() => {
        if (!isPresentationMode || !slideViewportRef.current) return;

        const viewport = slideViewportRef.current;
        const updateScale = () => {
            const nextScale = Math.min(viewport.clientWidth / 1280, viewport.clientHeight / 720, 1);
            setPresentationScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
        };
        updateScale();

        const observer = new ResizeObserver(updateScale);
        observer.observe(viewport);
        return () => observer.disconnect();
    }, [isPresentationMode]);

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
            container.style.fontFamily = "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif";
            document.body.appendChild(container);

            // 等待网页字体完成解析，避免导出时回退字体造成字宽和基线变化。
            if (document.fonts?.ready) {
                await document.fonts.ready;
            }

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
                slideWrapper.style.background = '#f3f6fb';

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

                // 等待 React、图片、字体及图表动画稳定后再截图。
                await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
                const images = Array.from(container.querySelectorAll('img'));
                await Promise.all(images.map(async image => {
                    if (!image.complete) {
                        await new Promise<void>(resolve => {
                            image.addEventListener('load', () => resolve(), { once: true });
                            image.addEventListener('error', () => resolve(), { once: true });
                        });
                    }
                    try { await image.decode?.(); } catch (_) {}
                }));
                if (document.fonts?.ready) await document.fonts.ready;
                await new Promise(resolve => setTimeout(resolve, 1600));

                // Capture this slide as an image
                const canvas = await html2canvas(container, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    allowTaint: true,
                    backgroundColor: '#f3f6fb',
                    width: slideWidth,
                    height: slideHeight,
                    onclone: clonedDocument => {
                        const style = clonedDocument.createElement('style');
                        style.textContent = `
                            * { animation: none !important; transition: none !important; caret-color: transparent !important; }
                            html, body { font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif !important; }
                            .material-icons, .material-icons-round { font-family: 'Material Icons' !important; }
                        `;
                        clonedDocument.head.appendChild(style);
                    }
                });

                // Convert canvas to image data
                const imgData = canvas.toDataURL('image/jpeg', 0.95);

                // Add page to PDF (first page is already created, add new pages for subsequent slides)
                if (index > 0) {
                    pdf.addPage([slideWidth, slideHeight]);
                }

                // Add image to current page
                pdf.addImage(imgData, 'JPEG', 0, 0, slideWidth, slideHeight);

                root.unmount();
                roots.pop();
            }

            document.body.removeChild(container);

            // Generate filename and save
            const now = new Date();
            const localDate = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
            const fileName = `光伏项目收益评估_${projectBaseInfo?.name || '项目'}_${localDate}.pdf`;
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
        setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
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
    // Keep presentation metrics aligned with the live solar form.
    const calculatedSelfConsumption = selfConsumptionRate ?? 85;
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
        const lifecycleYears = Math.max(1, Math.round(Number(params.advParams.projectLifeYears) || 11));
        const totalGeneration = longTermMetrics.yearlyDetails.reduce((sum: number, d: any) => sum + d.generation, 0);
        return {
            co2Reduction: Math.round(totalGeneration * 0.8), // 吨
            treesEquivalent: Math.round(totalGeneration * 10000 * 0.8 / 18 / lifecycleYears), // 棵
            coalSaved: Math.round(totalGeneration * 0.3), // 吨
            totalGeneration: totalGeneration.toFixed(0) // 万度
        };
    };

    const getInvestmentModeLabel = (mode: string) => {
        if (mode === 'epc') return { label: 'EPC总承包', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'engineering' };
        if (mode === 'emc') return { label: 'EMC合同能源管理', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'handshake' };
        if (mode === 'financing') return { label: '融资共建', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: 'account_balance' };
        if (mode === 'co_build') return { label: '股权共建', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', icon: 'group_work' };
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
                    capacity: solution.capacity ?? params.simpleParams.capacity,
                    epcPrice: effectiveEpcPrice,
                    connectionType: solution.connectionType,
                    investmentMode: solution.investmentMode || 'epc',
                    emcSubMode: solution.emcSubMode || params.simpleParams.emcSubMode
                },
                advParams: {
                    ...params.advParams,
                    degradationFirstYear: brandConfig.degradationFirstYear,
                    degradationLinear: brandConfig.degradationLinear,
                    emcOwnerShareRate: solution.emcOwnerShareRate ?? params.advParams.emcOwnerShareRate,
                    emcDiscountPrice: solution.emcDiscountPrice ?? params.advParams.emcDiscountPrice,
                    emcDiscountRate: solution.emcDiscountRate ?? params.advParams.emcDiscountRate,
                    emcFixedPrice: solution.emcFixedPrice ?? params.advParams.emcFixedPrice,
                    emcSouthernAveragePrice: solution.emcSouthernAveragePrice ?? params.advParams.emcSouthernAveragePrice,
                    roofRent: solution.roofRent ?? params.advParams.roofRent,
                    financingRatio: solution.financingRatio ?? params.advParams.financingRatio,
                    financingAnnualRate: solution.financingAnnualRate ?? params.advParams.financingAnnualRate,
                    financingTermYears: solution.financingTermYears ?? params.advParams.financingTermYears,
                    coBuildInvestorShareRate: solution.coBuildInvestorShareRate ?? params.advParams.coBuildInvestorShareRate,
                    coBuildSalePrice: solution.coBuildSalePrice ?? params.advParams.coBuildSalePrice,
                    coBuildTermYears: solution.coBuildTermYears ?? params.advParams.coBuildTermYears
                },
                selectedSolutionId: solution.id,
                solutions
            };

            const investmentMode = solution.investmentMode || 'epc';

            // Calculate metrics for this solution using static function
            const solMetrics = calculateSolarMetrics(solutionParams, calculatedSelfConsumption);
            const ownerPresentationCashFlows = investmentMode === 'emc'
                ? [0, ...solMetrics.yearlyDetails.map((detail: any) => detail.ownerBenefit || 0)]
                : investmentMode === 'co_build'
                    ? solMetrics.ownerCashFlows
                    : solMetrics.cashFlows;

            // Calculate investment
            const capacity = solution.capacity ?? params.simpleParams.capacity;
            const baseInvestment = (capacity * effectiveEpcPrice / 10);
            const voltageUpgradeCost = solution.connectionType === 'high' && solution.voltageUpgradeCost ? solution.voltageUpgradeCost : 0;
            const totalInvestment = baseInvestment + voltageUpgradeCost;
            const emcSubModeLabel = (() => {
                switch (solution.emcSubMode || params.simpleParams.emcSubMode) {
                    case 'sharing':
                        return '收益分成';
                    case 'fixed':
                        return '固定电价';
                    case 'southern_average':
                        return '南网参考价';
                    case 'discount':
                    default:
                        return '折扣电价';
                }
            })();

            return {
                id: solution.id,
                name: solution.name,
                investmentMode,
                investmentModeLabel: investmentMode === 'emc' ? 'EMC' : investmentMode === 'financing' ? '融资共建' : investmentMode === 'co_build' ? '股权共建' : 'EPC',
                emcSubMode: solution.emcSubMode || params.simpleParams.emcSubMode,
                emcSubModeLabel,
                emcOwnerShareRate: solution.emcOwnerShareRate ?? params.advParams.emcOwnerShareRate,
                emcDiscountPrice: solution.emcDiscountPrice ?? params.advParams.emcDiscountPrice,
                emcDiscountRate: solution.emcDiscountRate ?? params.advParams.emcDiscountRate,
                emcFixedPrice: solution.emcFixedPrice ?? params.advParams.emcFixedPrice,
                emcSouthernAveragePrice: solution.emcSouthernAveragePrice ?? params.advParams.emcSouthernAveragePrice,
                financingRatio: solution.financingRatio ?? params.advParams.financingRatio,
                financingAnnualRate: solution.financingAnnualRate ?? params.advParams.financingAnnualRate,
                financingTermYears: solution.financingTermYears ?? params.advParams.financingTermYears,
                coBuildInvestorShareRate: solution.coBuildInvestorShareRate ?? params.advParams.coBuildInvestorShareRate,
                coBuildSalePrice: solution.coBuildSalePrice ?? params.advParams.coBuildSalePrice,
                coBuildTermYears: solution.coBuildTermYears ?? params.advParams.coBuildTermYears,
                capacity,
                connectionType: solution.connectionType === 'high' ? '10kV高压' : '380V低压',
                cableType: solution.cableType === 'copper' ? '铜芯' : '铝芯',
                cableBrand: CABLE_BRANDS[solution.cableBrand || 'generic'].name,
                inverterBrand: INVERTER_BRANDS[solution.inverterBrand || 'generic'].name,
                brand: brandConfig.name,
                constructionMethod: solution.constructionMethod || 'rooftop',
                constructionMethodLabel: SOLAR_CONSTRUCTION_METHODS[solution.constructionMethod || 'rooftop'].name,
                epcPrice: effectiveEpcPrice,
                investment: totalInvestment,
                irr: solMetrics.irr,
                paybackPeriod: solMetrics.paybackPeriod,
                rev25Year: solMetrics.rev25Year || 0,
                ownerBenefit25: solMetrics.totalOwnerBenefit25 || 0,
                ownerBenefitYear1: solMetrics.yearlyDetails?.[0]?.ownerBenefit || 0,
                netIncomeYear1: solMetrics.yearlyDetails?.[0]?.netIncome || 0,
                ownerInitialInvestment: solMetrics.ownerInitialInvestment || 0,
                investorInitialInvestment: solMetrics.investorInitialInvestment || 0,
                presentationCashFlows: ownerPresentationCashFlows,
                yearlyDetails: solMetrics.yearlyDetails,
                genYear1: solMetrics.genYear1
            };
        });
    };

    const solutionComparisonData = calculateSolutionMetrics();
    const bestComparisonPayback = solutionComparisonData.length > 0 ? Math.min(...solutionComparisonData.map(s => s.paybackPeriod)) : 0;
    const bestPaybackSolution = solutionComparisonData.find(s => s.paybackPeriod === bestComparisonPayback);

    const presentationLayoutEntries: Array<{ solution: any; image: string }> = (params.solutions || []).reduce((entries: Array<{ solution: any; image: string }>, solution: any) => {
        const image = solution.useSameLayout
            ? params.solutions?.[0]?.layoutImage
            : solution.layoutImage;

        if (!image || entries.some(entry => entry.image === image)) return entries;
        return [...entries, { solution, image }];
    }, [] as Array<{ solution: any; image: string }>);
    const hasPresentationLayoutImage = presentationLayoutEntries.length > 0;
    const hasSinglePresentationLayoutImage = presentationLayoutEntries.length === 1;
    const normalizeConsumptionRates = (rates?: number[]) => {
        const source = rates && rates.length > 0 ? rates : [50, 60, 70, 80, 90, 100];
        const safeBaseRate = Math.max(0, Math.min(100, Math.round(calculatedSelfConsumption)));
        return Array.from(new Set([
            ...source
                .map(rate => Math.round(rate))
                .filter(rate => Number.isFinite(rate) && rate >= 0 && rate <= 100),
            safeBaseRate
        ])).sort((a, b) => a - b);
    };

    const consumptionScenarioData = normalizeConsumptionRates(params.consumptionRateScenarios).map(rate => {
        const metrics = calculateSolarMetrics(params, rate);
        return {
            rate,
            irr: metrics.irr,
            payback: metrics.paybackPeriod,
            rev25Year: metrics.rev25Year,
            ownerBenefit: metrics.totalOwnerBenefit25,
            isBase: rate === Math.round(calculatedSelfConsumption)
        };
    });
    const baseConsumptionScenario = consumptionScenarioData.find(item => item.isBase) || consumptionScenarioData[0];
    const lowConsumptionScenario = consumptionScenarioData[0];
    const highConsumptionScenario = consumptionScenarioData[consumptionScenarioData.length - 1];
    const paybackRangeDiff = lowConsumptionScenario.payback - highConsumptionScenario.payback;

    // Presentation slides data
    const investMode = getInvestmentModeLabel(params.simpleParams.investmentMode);
    const recommendedSolutionConfig = params.solutions?.find(solution => solution.id === params.selectedSolutionId) || params.solutions?.[0];
    const recommendedComparison = solutionComparisonData.find(solution => solution.id === params.selectedSolutionId)
        || bestPaybackSolution
        || solutionComparisonData[0];
    const detailedAlternativeSolutions = showMultipleSolutions
        ? solutionComparisonData.filter(solution => solution.id !== recommendedComparison?.id)
        : [];
    const additionalSolutionSlidesCount = detailedAlternativeSolutions.length;
    const showMaterialBillSlide = params.showMaterialBillInReport ?? false;
    const showBusinessTermsSlide = params.businessTerms?.showInReport ?? true;
    const materialSlideOffset = showMaterialBillSlide ? 1 : 0;
    const businessTermsSlideOffset = showBusinessTermsSlide ? 1 : 0;
    const showComparisonSlide = solutionComparisonData.length > 1;
    const comparisonSlideOffset = showComparisonSlide ? 1 : 0;
    const projectLifeYears = Math.max(1, Math.min(30, Math.round(Number(params.advParams.projectLifeYears) || 11)));
    const presentationTotalSlides = 10 + comparisonSlideOffset + additionalSolutionSlidesCount + materialSlideOffset + businessTermsSlideOffset;
    const recommendationModeLabel = recommendedComparison?.investmentModeLabel || investMode.label;
    const isReportEmcMode = (recommendedComparison?.investmentMode || params.simpleParams.investmentMode) === 'emc';
    const isReportFinancingMode = (recommendedComparison?.investmentMode || params.simpleParams.investmentMode) === 'financing';
    const isReportCoBuildMode = (recommendedComparison?.investmentMode || params.simpleParams.investmentMode) === 'co_build';
    const safeNumber = (value: unknown, fallback = 0) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    };
    const formatSafe = (value: unknown, digits = 1, fallback = 0) => safeNumber(value, fallback).toFixed(digits);
    const effectiveInvestment = safeNumber(solarModule.investment, recommendedComparison?.investment || params.simpleParams.capacity * params.simpleParams.epcPrice / 10);
    const effectiveYearOneIncome = safeNumber(solarModule.yearlySaving, longTermMetrics.yearlyDetails?.[0]?.netIncome ?? 0);
    const effectivePaybackPeriod = safeNumber(longTermMetrics.paybackPeriod, projectLifeYears);
    const effectiveIrr = safeNumber(longTermMetrics.irr, 0);
    const effectiveRev25Year = safeNumber(longTermMetrics.rev25Year, 0);
    const effectiveInvestorInvestment = safeNumber(longTermMetrics.investorInitialInvestment, effectiveInvestment);
    const effectiveGenYear1 = safeNumber(longTermMetrics.genYear1, 0);
    const firstYearOwnerBenefit = safeNumber(longTermMetrics.yearlyDetails?.[0]?.ownerBenefit, 0);
    const ownerTotalBenefit25 = safeNumber(longTermMetrics.totalOwnerBenefit25, 0);
    const ownerBenefitDuringTerm = safeNumber(longTermMetrics.ownerBenefitDuringTerm, 0);
    const ownerBenefitAfterTerm = safeNumber(longTermMetrics.ownerBenefitAfterTerm, 0);
    const ownerBenefitFirstYearAfterTerm = safeNumber(longTermMetrics.ownerBenefitFirstYearAfterTerm, 0);
    const ownerInitialInvestment = safeNumber(longTermMetrics.ownerInitialInvestment, 0);
    const coBuildTermYears = Math.min(projectLifeYears, Math.max(1, Math.round(safeNumber(params.advParams.coBuildTermYears, 11))));
    const supportsAudienceSelection = isReportEmcMode || isReportCoBuildMode;
    const isOwnerFocusedReport = supportsAudienceSelection && reportAudience === 'owner';
    const inferredLocation = (() => {
        const name = projectBaseInfo?.name || '';
        if (name.includes('浦东')) return '上海市 浦东新区';
        if (name.includes('上海')) return '上海市';
        if (name.includes('中山')) return '广东省 中山市';
        if (name.includes('广州')) return '广东省 广州市';
        if (name.includes('深圳')) return '广东省 深圳市';
        return '';
    })();
    const configuredLocation = [projectBaseInfo?.province, projectBaseInfo?.city].filter(Boolean).join(' ');
    const projectLocationDisplay = inferredLocation || configuredLocation || '项目地点待确认';
    const recommendedSolutionName = recommendedComparison?.name || recommendedSolutionConfig?.name || '当前推荐方案';
    const currentCapacityText = `${formatSafe(params.simpleParams.capacity, 2)} kWp`;
    const shouldShowCashFlowYear = (index: number) => (
        projectLifeYears <= 12 || index < 5 || (index >= 7 && (index - 7) % 3 === 0) || index === projectLifeYears - 1
    );
    const cashFlowChartData = longTermMetrics.yearlyDetails.reduce((acc: any[], detail: any, index: number) => {
        const previous = index > 0 ? acc[index - 1]?.cumulativeCashFlow ?? -safeNumber(longTermMetrics.investorInitialInvestment, effectiveInvestment) : -safeNumber(longTermMetrics.investorInitialInvestment, effectiveInvestment);
        acc.push({ ...detail, cumulativeCashFlow: previous + safeNumber(detail.netIncome, 0) });
        return acc;
    }, []).filter((_: any, index: number) => shouldShowCashFlowYear(index));
    const getEmcSettlementParts = (solution?: any) => {
        const subMode = solution?.emcSubModeLabel || (() => {
            switch (params.simpleParams.emcSubMode) {
                case 'sharing': return '收益分成';
                case 'fixed': return '固定电价';
                case 'southern_average': return '南网参考价';
                case 'discount':
                default: return '折扣电价';
            }
        })();
        const rawMode = solution?.emcSubMode || recommendedSolutionConfig?.emcSubMode || params.simpleParams.emcSubMode;
        if ((solution?.investmentMode || params.simpleParams.investmentMode) !== 'emc') {
            return { modeText: '-', detailText: '-', savingText: '-', primaryText: '-', secondaryText: '-', isSharing: false };
        }
        if (rawMode === 'sharing') {
            const ownerShare = solution?.emcOwnerShareRate ?? recommendedSolutionConfig?.emcOwnerShareRate ?? params.advParams.emcOwnerShareRate;
            return {
                modeText: '收益分成',
                detailText: `业主分成 ${formatSafe(ownerShare, 0)}%`,
                savingText: `业主分成 ${formatSafe(ownerShare, 0)}%`,
                primaryText: `业主分成 ${formatSafe(ownerShare, 0)}%`,
                secondaryText: `投资方分成 ${formatSafe(100 - ownerShare, 0)}%`,
                isSharing: true
            };
        }

        const benchmarkPrice = rawMode === 'discount'
            ? getGenerationWeightedTariff(
                params.advParams.emcMonthlyTariffs || [],
                'benchmarkPrice',
                params.advParams.emcSouthernAveragePrice ?? params.advParams.electricityPrice,
            )
            : solution?.emcSouthernAveragePrice ?? recommendedSolutionConfig?.emcSouthernAveragePrice ?? params.advParams.emcSouthernAveragePrice ?? params.advParams.electricityPrice;
        const discountRate = solution?.emcDiscountRate
            ?? recommendedSolutionConfig?.emcDiscountRate
            ?? params.advParams.emcDiscountRate;
        const salePrice = rawMode === 'fixed'
            ? (solution?.emcFixedPrice ?? recommendedSolutionConfig?.emcFixedPrice ?? params.advParams.emcFixedPrice)
            : benchmarkPrice * Math.min(100, Math.max(0, discountRate)) / 100;
        const perKwhSaving = Math.max(0, benchmarkPrice - salePrice);
        return {
            modeText: subMode,
            detailText: rawMode === 'discount'
                ? `南网月度加权价 × ${formatSafe(discountRate, 0)}%`
                : `省 ${formatSafe(perKwhSaving, 3)} 元/度`,
            savingText: `${formatSafe(perKwhSaving, 3)} 元/度`,
            primaryText: rawMode === 'fixed'
                ? `${formatSafe(salePrice, 2)} 元/度`
                : rawMode === 'discount'
                    ? `${formatSafe(discountRate, 0)} 折`
                    : `${formatSafe(salePrice, 2)} 元/度`,
            secondaryText: rawMode === 'fixed'
                ? `固定电价结算，业主每度约省 ${formatSafe(perKwhSaving, 3)} 元`
                : `按南网月度加权参考价折扣结算，业主每度约省 ${formatSafe(perKwhSaving, 3)} 元`,
            isSharing: false
        };
    };
    const assumptions = [
        { label: '年有效日照', value: `${formatSafe(params.advParams.dailySunHours, 2)} h`, note: '按项目地址或人工确认值' },
        { label: '系统效率 PR', value: `${formatSafe(params.advParams.prValue, 1)}%`, note: '逆变、线损、温升综合效率' },
        { label: '综合电价', value: `${formatSafe(params.advParams.electricityPrice, 4)} 元/kWh`, note: '用于自发自用收益测算' },
        { label: '上网电价', value: params.simpleParams.operationMode === 'off_grid' ? '不适用' : `${formatSafe(params.advParams.feedInTariff, 4)} 元/kWh`, note: params.simpleParams.operationMode === 'off_grid' ? '离网模式余电不出售' : '余电上网收入口径' },
        { label: '首年衰减', value: `${formatSafe(params.advParams.degradationFirstYear, 2)}%`, note: '组件首年性能衰减' },
        { label: '线性衰减', value: `${formatSafe(params.advParams.degradationLinear, 2)}%/年`, note: '第二年起年度衰减' },
        { label: '运维成本', value: `${formatSafe(params.advParams.omCost, 3)} 元/W/年`, note: '清洗、巡检、监控与维护' },
        { label: '保险费率', value: `${formatSafe(params.advParams.insuranceRate, 2)}%`, note: '按投资额年度估算' }
    ];

    const compactComparisonData = solutionComparisonData.slice(0, 6);
    const hasAnyEmcComparison = compactComparisonData.some(solution => solution.investmentMode === 'emc');
    const recommendedEmcSettlement = getEmcSettlementParts(recommendedComparison);
    const isReportSharingEmcMode = isReportEmcMode && recommendedEmcSettlement.isSharing;
    const ownerBenefitChartData = longTermMetrics.yearlyDetails.reduce((acc: any[], detail: any, index: number) => {
        const previousTotal = index > 0 ? acc[index - 1]?.cumulativeOwnerBenefit || 0 : 0;
        const ownerBenefit = safeNumber(detail.ownerBenefit, 0);
        acc.push({
            ...detail,
            ownerBenefit,
            cumulativeOwnerBenefit: previousTotal + ownerBenefit
        });
        return acc;
    }, []).filter((_: any, index: number) => shouldShowCashFlowYear(index));

    const proposalStatCards = isReportEmcMode && isOwnerFocusedReport
        ? [
            { label: '业主投入', value: '¥0', tone: 'text-slate-950' },
            { label: '首年综合收益', value: `¥${formatSafe(firstYearOwnerBenefit, 1)}万`, tone: 'text-emerald-600' },
            { label: `${projectLifeYears}年综合收益`, value: `¥${formatSafe(ownerTotalBenefit25, 1)}万`, tone: 'text-emerald-600' },
            {
                label: recommendedEmcSettlement.isSharing ? '收益分成' : '每度节省',
                value: recommendedEmcSettlement.isSharing ? recommendedEmcSettlement.detailText : recommendedEmcSettlement.savingText,
                tone: 'text-blue-600'
            }
        ]
        : isReportCoBuildMode && isOwnerFocusedReport ? [
            { label: '业主初始投入（40%）', value: `¥${formatSafe(ownerInitialInvestment, 1)}万`, tone: 'text-slate-950' },
            { label: `前${coBuildTermYears}年累计收益`, value: `¥${formatSafe(ownerBenefitDuringTerm, 1)}万`, tone: 'text-emerald-600' },
            { label: '项目周期', value: `${projectLifeYears}年`, tone: 'text-cyan-700' },
            { label: `${projectLifeYears}年累计收益`, value: `¥${formatSafe(ownerTotalBenefit25, 1)}万`, tone: 'text-blue-600' }
        ]
        : [
            { label: isReportFinancingMode ? '业主初始投入' : isReportCoBuildMode ? '我方初始投入' : '总投资', value: `¥${formatSafe(isReportFinancingMode || isReportCoBuildMode ? longTermMetrics.investorInitialInvestment : effectiveInvestment, 1)}万`, tone: 'text-slate-950' },
            { label: '首年净收益', value: `¥${formatSafe(effectiveYearOneIncome, 1)}万`, tone: 'text-emerald-600' },
            { label: 'IRR', value: `${formatSafe(effectiveIrr, 2)}%`, tone: 'text-blue-600' },
            { label: `${projectLifeYears}年净收益`, value: `¥${formatSafe(effectiveRev25Year, 1)}万`, tone: 'text-emerald-600' }
        ];

    const solutionFacts = isReportEmcMode
        ? [
            ['合作模式', 'EMC合同能源管理'],
            ['结算方式', recommendedEmcSettlement.modeText],
            [recommendedEmcSettlement.isSharing ? '分成口径' : '每度节省', recommendedEmcSettlement.isSharing ? recommendedEmcSettlement.detailText : recommendedEmcSettlement.savingText],
            ['铺设容量', `${formatSafe(recommendedComparison?.capacity ?? params.simpleParams.capacity, 2)} kWp`],
            ['建设 / 接入', `${recommendedComparison?.constructionMethodLabel || SOLAR_CONSTRUCTION_METHODS[recommendedSolutionConfig?.constructionMethod || 'rooftop'].shortName} · ${recommendedComparison?.connectionType || '380V低压'}`],
            ['组件品牌', recommendedComparison?.brand || '通用组件'],
            ['电缆配置', `${recommendedComparison?.cableBrand || '国标电缆'} · ${recommendedComparison?.cableType || '铝芯'}`],
            ['逆变器品牌', recommendedComparison?.inverterBrand || '通用逆变器']
        ]
        : isReportCoBuildMode ? [
            ['合作模式', '股权共建（同股同酬）'],
            ['我方 / 业主持股', `${formatSafe(params.advParams.coBuildInvestorShareRate, 0)}% / ${formatSafe(100 - params.advParams.coBuildInvestorShareRate, 0)}%`],
            ['合作售电价', `${formatSafe(params.advParams.coBuildSalePrice, 2)} 元/kWh`],
            ['合作期限', `${formatSafe(params.advParams.coBuildTermYears, 0)}年`],
            ['铺设容量', `${formatSafe(recommendedComparison?.capacity ?? params.simpleParams.capacity, 2)} kWp`],
            ['建设方式', recommendedComparison?.constructionMethodLabel || '彩钢瓦屋顶光伏'],
            ['组件 / 逆变器', `${recommendedComparison?.brand || '通用组件'} / ${recommendedComparison?.inverterBrand || '通用逆变器'}`],
            ['电缆配置', `${recommendedComparison?.cableBrand || '国标电缆'} · ${recommendedComparison?.cableType || '铝芯'}`]
        ] : isReportFinancingMode ? [
            ['合作模式', '融资共建'],
            ['融资比例', `${formatSafe(params.advParams.financingRatio, 0)}%`],
            ['利率 / 期限', `${formatSafe(params.advParams.financingAnnualRate, 2)}% / ${formatSafe(params.advParams.financingTermYears, 0)}年`],
            ['铺设容量', `${formatSafe(recommendedComparison?.capacity ?? params.simpleParams.capacity, 2)} kWp`],
            ['建造单价', `¥${formatSafe(recommendedComparison?.epcPrice ?? params.simpleParams.epcPrice, 2)}/Wp`],
            ['建设方式', recommendedComparison?.constructionMethodLabel || '彩钢瓦屋顶光伏'],
            ['组件 / 逆变器', `${recommendedComparison?.brand || '通用组件'} / ${recommendedComparison?.inverterBrand || '通用逆变器'}`],
            ['电缆配置', `${recommendedComparison?.cableBrand || '国标电缆'} · ${recommendedComparison?.cableType || '铝芯'}`]
        ] : [
            ['合作模式', 'EPC总承包'],
            ['铺设容量', `${formatSafe(recommendedComparison?.capacity ?? params.simpleParams.capacity, 2)} kWp`],
            ['建造单价', `¥${formatSafe(recommendedComparison?.epcPrice ?? params.simpleParams.epcPrice, 2)}/Wp`],
            ['建设方式', recommendedComparison?.constructionMethodLabel || '彩钢瓦屋顶光伏'],
            ['接入方式', recommendedComparison?.connectionType || (params.simpleParams.connectionType === 'high' ? '10kV高压' : '380V低压')],
            ['组件品牌', recommendedComparison?.brand || '通用组件'],
            ['电缆配置', `${recommendedComparison?.cableBrand || '国标电缆'} · ${recommendedComparison?.cableType || '铝芯'}`],
            ['逆变器品牌', recommendedComparison?.inverterBrand || '通用逆变器']
        ];

    const maxPayback = Math.max(...consumptionScenarioData.map(item => safeNumber(item.payback, 0)), 1);
    const maxScenarioRevenue = Math.max(...consumptionScenarioData.map(item => safeNumber(item.rev25Year, 0)), 1);
    const maxOwnerBenefit = Math.max(...consumptionScenarioData.map(item => safeNumber(item.ownerBenefit, 0)), 1);
    const layoutFootnote = '收益测算以平台当前配置容量为准';
    const revenueLabel = isOwnerFocusedReport
        ? `业主${projectLifeYears}年收益`
        : `${isReportEmcMode ? '投资方' : '项目'}${projectLifeYears}年净收益`;
    const recommendedConstruction = SOLAR_CONSTRUCTION_METHODS[recommendedComparison?.constructionMethod || recommendedSolutionConfig?.constructionMethod || 'rooftop'];
    const isCanopyConstruction = ['color_steel_canopy', 'bipv_canopy', 'daylighting_canopy'].includes(
        recommendedComparison?.constructionMethod || recommendedSolutionConfig?.constructionMethod || 'rooftop'
    );
    const hasCanopyOverheightResponsibility = isCanopyConstruction && (params.canopyOverheightOwnerResponsibility ?? false);
    const businessConditionCards: string[][] = [];
    const businessTerms = params.businessTerms;
    const specialBusinessTerms = [
        businessTerms?.specialTerms,
        hasCanopyOverheightResponsibility ? (params.canopyOverheightResponsibilityNote || '因本项目光伏棚架存在超高情况，需由业主对报批合规、违建认定、整改及相关责任进行兜底。') : ''
    ].filter(Boolean).join('\n');
    const materialBillItems = params.materialBillItems?.length
        ? params.materialBillItems
        : buildDefaultSolarMaterialBill(
            recommendedSolutionConfig?.connectionType || params.simpleParams.connectionType,
            recommendedComparison?.constructionMethod || recommendedSolutionConfig?.constructionMethod || 'rooftop',
        );
    const materialPriorityNames = ['光伏组件', '逆变器', '直流电缆', '主线电缆', '并网计量柜', '棚架主体', '支撑系统', '彩钢瓦屋面', '排水与收边'];
    const materialPreviewItems = materialBillItems
        .filter(item => materialPriorityNames.some(keyword => item.name.includes(keyword)))
        .slice(0, 10);
    const displayMaterialItems = materialPreviewItems.length >= 6
        ? materialPreviewItems
        : materialBillItems.slice(0, 10);
    const materialSections = Array.from(new Set(materialBillItems.map(item => item.section).filter(Boolean)));
    const generationChartData = (longTermMetrics.yearlyDetails || []).map((detail: any, index: number) => ({
        year: index + 1,
        generation: safeNumber(detail.generation, 0)
    }));
    const lifecycleGeneration = safeNumber(
        longTermMetrics.totalGenerationLifecycle,
        generationChartData.reduce((sum: number, item: { generation: number }) => sum + item.generation, 0)
    );
    const averageAnnualGeneration = projectLifeYears > 0 ? lifecycleGeneration / projectLifeYears : 0;
    const finalYearGeneration = generationChartData[generationChartData.length - 1]?.generation || 0;
    const generationValues = generationChartData.map((item: { generation: number }) => item.generation);
    const generationAxisMin = Math.max(0, Math.floor((generationValues.length ? Math.min(...generationValues) : 0) - 1));
    const generationAxisMax = Math.ceil((generationValues.length ? Math.max(...generationValues) : 1) + 1);

    const additionalSolutionSlides = detailedAlternativeSolutions.map((solution, index) => {
        const isEmc = solution.investmentMode === 'emc';
        const isFinancing = solution.investmentMode === 'financing';
        const isCoBuild = solution.investmentMode === 'co_build';
        const modeStyle = getInvestmentModeLabel(solution.investmentMode);
        const settlement = isEmc ? getEmcSettlementParts(solution) : null;
        const ownerInvestment = isEmc
            ? 0
            : isCoBuild
                ? solution.ownerInitialInvestment
                : isFinancing
                    ? solution.investorInitialInvestment
                    : solution.investment;
        const ownerCashFlows = solution.presentationCashFlows || [];
        let cumulativeCashFlow = ownerCashFlows[0] || 0;
        const ownerCashFlowChartData = ownerCashFlows.slice(1).map((cashFlow: number, yearIndex: number) => {
            cumulativeCashFlow += cashFlow;
            const year = yearIndex + 1;
            return {
                year,
                annualBenefit: cashFlow,
                cumulativeCashFlow,
                cumulativeLabel: projectLifeYears <= 12 || yearIndex % 3 === 0 || year === projectLifeYears
                    ? parseFloat(cumulativeCashFlow.toFixed(1))
                    : null
            };
        });
        const ownerYearOne = ownerCashFlows[1] ?? (isEmc || isCoBuild ? solution.ownerBenefitYear1 : solution.netIncomeYear1);
        const ownerBenefit25 = ownerCashFlows.slice(1).reduce((sum: number, cashFlow: number) => sum + cashFlow, 0);
        const ownerPaybackText = isEmc ? '业主零投入' : `${formatSafe(solution.paybackPeriod, 2)}年`;
        const overviewPanelClass = isCoBuild
            ? 'bg-gradient-to-br from-cyan-50 via-white to-emerald-50 text-slate-950 border border-cyan-200'
            : 'bg-slate-950 text-white';
        const overviewSubtextClass = isCoBuild ? 'text-slate-600' : 'text-slate-300';
        const cooperationFacts = isEmc
            ? [
                ['结算方式', settlement?.modeText || '-'],
                ['业主收益口径', settlement?.detailText || '-']
            ]
            : isCoBuild
                ? [
                    ['持股结构', `我方 ${formatSafe(solution.coBuildInvestorShareRate, 0)}% / 业主 ${formatSafe(100 - solution.coBuildInvestorShareRate, 0)}%`],
                    ['售电与期限', `${formatSafe(solution.coBuildSalePrice, 2)} 元/度 · ${formatSafe(solution.coBuildTermYears, 0)}年`]
                ]
                : isFinancing
                    ? [
                        ['融资比例', `${formatSafe(solution.financingRatio, 0)}%`],
                        ['利率与期限', `${formatSafe(solution.financingAnnualRate, 2)}% · ${formatSafe(solution.financingTermYears, 0)}年`]
                    ]
                    : [
                        ['收益归属', '业主获得项目全部净收益'],
                        ['投资口径', '业主承担项目全部初始投资']
                    ];

        return {
            title: `备选方案详述：${solution.name}`,
            content: (
                <CleanSlideBackground>
                    <PremiumSlideHeader
                        icon="fact_check"
                        title={`备选方案 ${index + 1}：${solution.name}`}
                        tone="violet"
                    />
                    <div className="relative z-10 flex-1 px-10 pb-6 grid grid-cols-[0.72fr_1.28fr] gap-6 min-h-0">
                        <div className={`rounded-[32px] p-7 shadow-[0_30px_90px_rgba(15,23,42,0.16)] flex flex-col justify-between min-h-0 ${overviewPanelClass}`}>
                            <div>
                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black ${modeStyle.bg} ${modeStyle.text}`}>
                                    <span className="material-icons text-base">{modeStyle.icon}</span>
                                    {modeStyle.label}
                                </div>
                                <h3 className="text-4xl font-black leading-tight mt-5">{solution.name}</h3>
                                <p className={`text-sm font-semibold mt-3 ${overviewSubtextClass}`}>{solution.constructionMethodLabel} · {solution.connectionType}</p>
                                <p className={`text-xs font-semibold mt-1 ${overviewSubtextClass}`}>{solution.brand}组件 · {solution.cableBrand}{solution.cableType}电缆 · {solution.inverterBrand}逆变器</p>
                            </div>
                            <div className="space-y-3 mt-5">
                                <div className="rounded-[22px] bg-amber-200 border border-amber-300 p-5 text-slate-950 shadow-[0_14px_35px_rgba(245,158,11,0.18)]">
                                    <p className="text-sm font-bold text-amber-900">业主回本周期</p>
                                    <p className="text-4xl font-black mt-1">{ownerPaybackText}</p>
                                </div>
                                <div className="rounded-2xl bg-white border border-slate-100 px-4 py-3 text-slate-950">
                                    <p className="text-xs font-bold text-slate-500">业主初始投入</p>
                                    <p className="text-2xl font-black mt-1">{ownerInvestment === 0 ? '¥0' : `¥${formatSafe(ownerInvestment, 1)}万`}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl bg-emerald-300 p-3.5 text-slate-950">
                                        <p className="text-xs font-bold text-emerald-900">业主首年收益</p>
                                        <p className="text-xl font-black mt-1">¥{formatSafe(ownerYearOne, 1)}万</p>
                                    </div>
                                    <div className="rounded-2xl bg-sky-300 p-3.5 text-slate-950">
                                        <p className="text-xs font-bold text-sky-900">业主{projectLifeYears}年收益</p>
                                        <p className="text-xl font-black mt-1">¥{formatSafe(ownerBenefit25, 1)}万</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-[32px] bg-white border border-slate-200 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.07)] flex flex-col min-h-0">
                            <div className="flex items-end justify-between mb-2">
                                <div>
                                    <h3 className="text-xl font-black text-slate-950">业主收益与累计现金流</h3>
                                    <p className="text-xs font-semibold text-slate-500 mt-1">柱形为年度收益，折线为含初始投入的累计现金流（万元）</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-slate-500">回本 / IRR</p>
                                    <p className="text-base font-black text-slate-950">{isEmc ? '业主零投入' : `${formatSafe(solution.paybackPeriod, 2)}年 / ${formatSafe(solution.irr, 2)}%`}</p>
                                </div>
                            </div>
                            <div className="flex-1 min-h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={ownerCashFlowChartData} margin={{ top: 12, right: 4, left: -18, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748b' }} interval={2} tickLine={false} axisLine={false} />
                                        <YAxis yAxisId="annual" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                        <YAxis yAxisId="cumulative" orientation="right" tick={{ fontSize: 10, fill: '#2563eb' }} tickLine={false} axisLine={false} />
                                        <Tooltip formatter={(value: number, name: string) => [`${formatSafe(value, 1)} 万元`, name === 'annualBenefit' ? '年度收益' : '累计现金流']} labelFormatter={(year) => `第 ${year} 年`} />
                                        <ReferenceLine yAxisId="cumulative" y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                                        <Bar yAxisId="annual" dataKey="annualBenefit" name="年度收益" radius={[4, 4, 0, 0]} maxBarSize={18}>
                                            {ownerCashFlowChartData.map((item: { annualBenefit: number }, itemIndex: number) => (
                                                <Cell key={itemIndex} fill={item.annualBenefit >= 0 ? '#10b981' : '#fb7185'} />
                                            ))}
                                        </Bar>
                                        <Line yAxisId="cumulative" type="monotone" dataKey="cumulativeCashFlow" name="累计现金流" stroke="#2563eb" strokeWidth={3} dot={false}>
                                            <LabelList
                                                dataKey="cumulativeLabel"
                                                position="top"
                                                offset={9}
                                                formatter={(value: number) => value == null ? '' : `${formatSafe(value, 0)}万`}
                                                fontSize={10}
                                                fontWeight={800}
                                                fill="#2563eb"
                                            />
                                        </Line>
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-4 gap-2 mt-2">
                                {[
                                    ['建设方式', solution.constructionMethodLabel],
                                    ['组件品牌', solution.brand],
                                    ['电缆配置', `${solution.cableBrand} · ${solution.cableType}`],
                                    ['逆变器品牌', solution.inverterBrand],
                                    ['装机容量', `${formatSafe(solution.capacity, 0)} kWp`],
                                    ['建造单价', `¥${formatSafe(solution.epcPrice, 2)}/Wp`],
                                    ...cooperationFacts
                                ].map(([label, value]) => (
                                    <div key={label} className="rounded-xl bg-slate-50 border border-slate-100 p-3 min-w-0">
                                        <p className="text-[10px] font-bold text-slate-500">{label}</p>
                                        <p className="text-xs font-black text-slate-950 mt-1 leading-tight break-words">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <PremiumSlideFooter page={8 + businessTermsSlideOffset + index} total={presentationTotalSlides} />
                </CleanSlideBackground>
            )
        };
    });

    const slidesInContentOrder = [
        {
            title: '封面',
            content: (
                <div className="h-full relative overflow-hidden bg-slate-950 text-white">
                    <PhotoBackground visual="rooftop" overlay="bg-gradient-to-r from-slate-950/90 via-slate-950/58 to-slate-950/18" />
                    <div className="relative z-10 h-full px-16 py-12 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3 text-white/85">
                                <span className="material-icons text-amber-300">wb_sunny</span>
                                <span className="font-bold tracking-[0.18em] uppercase text-sm">Solar Investment Proposal</span>
                            </div>
                            <div className="text-right text-white/70 text-sm">
                                <p>{projectLocationDisplay}</p>
                                <p>{new Date().toLocaleDateString('zh-CN')}</p>
                            </div>
                        </div>

                        <div className="max-w-4xl">
                            <p className="text-lg font-bold text-emerald-300 mb-5">光伏收益评估与推荐方案</p>
                            <h1 className="text-7xl font-black leading-tight tracking-tight">
                                {projectBaseInfo?.name || '分布式光伏项目'}
                            </h1>
                        </div>

                        <div className="grid grid-cols-[1fr_360px] gap-8 items-end">
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    ['装机容量', currentCapacityText],
                                    ['推荐方案', recommendedSolutionName],
                                    ['合作模式', recommendationModeLabel]
                                ].map(([label, value]) => (
                                    <div key={label} className="rounded-3xl bg-white text-slate-950 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
                                        <p className="text-sm font-bold text-slate-500">{label}</p>
                                        <p className="text-2xl font-black mt-3 leading-tight">{value}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="rounded-[36px] bg-[#050816] border border-white/12 p-7 shadow-[0_28px_90px_rgba(0,0,0,0.34)]">
                                <p className="text-sm font-black tracking-[0.28em] text-amber-300 uppercase">{isOwnerFocusedReport ? 'Owner Benefit' : 'Payback'}</p>
                                {isOwnerFocusedReport ? (
                                    <>
                                        <div className="mt-4 flex items-center gap-3">
                                            <span className="text-[76px] leading-[1.12] font-black tabular-nums text-emerald-300">{formatSafe(firstYearOwnerBenefit, 1)}</span>
                                            <span className="text-3xl leading-none font-black">万/年</span>
                                        </div>
                                        <p className="text-2xl font-black mt-2">业主首年综合收益</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="mt-4 flex items-center gap-3">
                                            <span className="text-[88px] leading-[1.12] font-black tabular-nums text-amber-300">{formatSafe(effectivePaybackPeriod, 2)}</span>
                                            <span className="text-3xl leading-none font-black">年</span>
                                        </div>
                                        <p className="text-2xl font-black mt-2">预计回本</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '核心结论',
            content: (
                <CleanSlideBackground>
                    <PremiumSlideHeader
                        icon="verified"
                        title={isOwnerFocusedReport ? `核心结论：业主首年综合收益约 ${formatSafe(firstYearOwnerBenefit, 1)} 万元` : `核心结论：预计 ${formatSafe(effectivePaybackPeriod, 2)} 年回本`}
                        tone="emerald"
                    />
                    <div className="relative z-10 flex-1 px-12 pb-8 grid grid-cols-[0.92fr_1.08fr] gap-8">
                        <div className="rounded-[38px] bg-[#050816] text-white p-9 shadow-[0_32px_100px_rgba(15,23,42,0.20)] flex flex-col justify-between">
                            <div>
                                <p className="text-sm font-black tracking-[0.28em] text-emerald-300 uppercase">Main Takeaway</p>
                                <div className={`inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full text-sm font-black ${isReportEmcMode ? 'bg-amber-300 text-slate-950' : 'bg-blue-500 text-white'}`}>
                                    <span className="material-icons text-base">{isReportEmcMode ? 'handshake' : 'engineering'}</span>
                                    {isReportEmcMode ? 'EMC合同能源管理' : isReportFinancingMode ? '融资共建' : isReportCoBuildMode ? '股权共建' : 'EPC总承包'}
                                </div>
                                <h3 className="text-5xl font-black leading-tight mt-6">推荐推进<br />{recommendedSolutionName}</h3>
                            </div>
                            <div className={`rounded-[28px] ${isReportEmcMode ? 'bg-emerald-300' : 'bg-amber-300'} text-slate-950 px-6 py-5 overflow-hidden`}>
                                <p className="text-base font-black uppercase tracking-[0.22em]">{isOwnerFocusedReport ? 'Owner Benefit' : 'Payback'}</p>
                                {isOwnerFocusedReport ? (
                                    <>
                                        <div className="mt-2 flex items-center gap-3">
                                            <span className="text-[76px] leading-[1.12] font-black tabular-nums">{formatSafe(ownerTotalBenefit25, 1)}</span>
                                            <span className="text-4xl leading-none font-black">万</span>
                                        </div>
                                        <p className="text-2xl font-black mt-2">业主{projectLifeYears}年综合收益</p>
                                    </>
                                ) : (
                                    <div className="mt-2 flex items-center gap-3">
                                        <span className="text-[96px] leading-[1.12] font-black tabular-nums">{formatSafe(effectivePaybackPeriod, 2)}</span>
                                        <span className="text-4xl leading-none font-black">年</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-5 content-center">
                            {proposalStatCards.map(card => (
                                <div key={card.label} className="rounded-[30px] bg-white border border-slate-200 p-7 shadow-[0_20px_70px_rgba(15,23,42,0.07)] min-h-[168px]">
                                    <p className="text-base font-bold text-slate-500">{card.label}</p>
                                    <p className={`${card.label === '每度节省' ? 'text-4xl' : 'text-5xl'} font-black mt-5 tracking-tight leading-tight ${card.tone}`}>{card.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <PremiumSlideFooter page={2} total={presentationTotalSlides} />
                </CleanSlideBackground>
            )
        },
        {
            title: '光伏铺设图',
            content: (
                <div className="h-full flex flex-col bg-[#f4f6f8] relative overflow-hidden">
                    <div className="relative z-10 px-9 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-icons text-emerald-500 text-3xl">map</span>
                            <div>
                                <h2 className="text-3xl font-black text-slate-950">三、光伏铺设图</h2>
                            </div>
                        </div>
                        <div className="rounded-full bg-slate-950 text-white px-4 py-2 text-xs font-bold">{layoutFootnote}</div>
                    </div>
                    <div className="flex-1 min-h-0 p-5">
                        {hasPresentationLayoutImage ? (
                            hasSinglePresentationLayoutImage ? (
                                <div className="w-full h-full bg-white border border-slate-200 rounded-[26px] shadow-[0_22px_80px_rgba(15,23,42,0.10)] flex items-center justify-center p-4 overflow-hidden">
                                    <img
                                        src={presentationLayoutEntries[0].image}
                                        alt="光伏铺设图"
                                        className="block max-w-full max-h-full w-auto h-auto object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-5 h-full">
                                    {presentationLayoutEntries.slice(0, 4).map(({ solution, image }) => (
                                        <div key={solution.id} className="bg-white border border-slate-200 rounded-[24px] p-4 flex flex-col min-h-0 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-lg font-black text-slate-900">{solution.name}</p>
                                                <span className="text-xs font-bold text-slate-500">{solution.connectionType === 'high' ? '10kV高压' : '380V低压'}</span>
                                            </div>
                                            <div className="flex-1 min-h-0 flex items-center justify-center">
                                                <img src={image} alt={`${solution.name}铺设图`} className="block max-w-full max-h-full w-auto h-auto object-contain" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : (
                            <div className="w-full h-full bg-white border border-dashed border-slate-300 rounded-[26px] flex flex-col items-center justify-center text-slate-400">
                                <span className="material-icons text-6xl mb-4">image_search</span>
                                <p className="text-2xl font-black">暂未上传铺设图</p>
                            </div>
                        )}
                    </div>
                    <PremiumSlideFooter page={3} total={presentationTotalSlides} />
                </div>
            )
        },
        {
            title: '建设效果图',
            content: (
                <div className="h-full flex flex-col bg-slate-950 text-white relative overflow-hidden">
                    <img src={recommendedConstruction.image} alt={recommendedConstruction.name} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/94 via-slate-950/64 to-slate-950/18"></div>
                    <div className="relative z-10 flex-1 px-12 py-9 flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-8">
                            <div>
                                <p className="text-sm font-black tracking-[0.24em] text-cyan-300 uppercase">Construction Preview</p>
                                <h2 className="text-5xl font-black mt-3">四、建设效果图</h2>
                                <p className="text-2xl font-bold text-white/85 mt-3">{recommendedConstruction.name}</p>
                            </div>
                            <span className="rounded-full bg-white/15 border border-white/20 backdrop-blur px-4 py-2 text-sm font-bold">方案参考效果 · 以深化设计为准</span>
                        </div>
                        <div className="grid grid-cols-[1.15fr_0.85fr] gap-6 items-end">
                            <div className="rounded-[30px] bg-slate-950/78 border border-white/15 backdrop-blur p-6">
                                <p className="text-3xl font-black">{recommendedSolutionName}</p>
                                <p className="text-base text-white/70 mt-3 leading-relaxed">{recommendedConstruction.description}</p>
                                <p className="text-xs text-white/45 mt-5">图片来源：{recommendedConstruction.imageSource || '项目通用屋顶光伏资料图'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    ['装机容量', `${formatSafe(recommendedComparison?.capacity ?? params.simpleParams.capacity, 0)} kWp`],
                                    ['建设方式', recommendedConstruction.shortName],
                                    ['组件品牌', recommendedComparison?.brand || '通用组件'],
                                    ['电缆配置', `${recommendedComparison?.cableBrand || '国标电缆'} · ${recommendedComparison?.cableType || '铝芯'}`],
                                    ['逆变器品牌', recommendedComparison?.inverterBrand || '通用逆变器'],
                                    ['接入方式', recommendedComparison?.connectionType || '380V低压']
                                ].map(([label, value]) => (
                                    <div key={label} className="rounded-2xl bg-white text-slate-950 p-3 min-h-[74px]">
                                        <p className="text-xs font-bold text-slate-500">{label}</p>
                                        <p className="text-base font-black mt-1.5 leading-tight">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <PremiumSlideFooter page={4} total={presentationTotalSlides} />
                </div>
            )
        },
        {
            title: '发电能力',
            content: (
                <CleanSlideBackground>
                    <PremiumSlideHeader icon="bolt" title={`五、发电能力：按项目剩余 ${projectLifeYears} 年测算`} tone="amber" />
                    <div className="relative z-10 flex-1 min-h-0 px-10 pb-6 grid grid-cols-[0.72fr_1.28fr] gap-6">
                        <div className="grid grid-cols-2 gap-4 content-start">
                            {[
                                ['首年发电量', `${formatSafe(effectiveGenYear1, 2)} 万度`, 'bg-amber-300'],
                                [`${projectLifeYears}年累计发电`, `${formatSafe(lifecycleGeneration, 2)} 万度`, 'bg-emerald-300'],
                                ['年均发电量', `${formatSafe(averageAnnualGeneration, 2)} 万度`, 'bg-sky-200'],
                                [`第${projectLifeYears}年发电量`, `${formatSafe(finalYearGeneration, 2)} 万度`, 'bg-violet-200']
                            ].map(([label, value, tone]) => (
                                <div key={label} className={`rounded-[26px] p-5 min-h-[138px] ${tone} text-slate-950`}>
                                    <p className="text-sm font-black">{label}</p>
                                    <p className="text-[27px] font-black mt-4 leading-tight whitespace-nowrap">{value}</p>
                                </div>
                            ))}
                            <div className="col-span-2 rounded-[24px] bg-white border border-slate-200 p-4 text-sm text-slate-600 leading-relaxed">
                                首年衰减 {formatSafe(params.advParams.degradationFirstYear, 2)}%，第二年起每年衰减 {formatSafe(params.advParams.degradationLinear, 2)}%。本页不外推到 25 年。
                            </div>
                        </div>
                        <div className="rounded-[30px] bg-white border border-slate-200 shadow-[0_22px_70px_rgba(15,23,42,0.08)] p-5 flex flex-col min-h-0">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-950">逐年发电量</h3>
                                    <p className="text-xs font-bold text-slate-500 mt-1">单位：万度</p>
                                </div>
                                <span className="rounded-full bg-amber-50 text-amber-700 px-3 py-1.5 text-xs font-black">装机 {formatSafe(recommendedComparison?.capacity ?? params.simpleParams.capacity, 0)} kWp</span>
                            </div>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={generationChartData} margin={{ top: 22, right: 18, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                                        <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(value) => `第${value}年`} interval={0} />
                                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[generationAxisMin, generationAxisMax]} />
                                        <Tooltip formatter={(value: number) => [`${formatSafe(value, 2)} 万度`, '发电量']} labelFormatter={(label) => `第 ${label} 年`} />
                                        <Bar dataKey="generation" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={34}>
                                            <LabelList dataKey="generation" position="top" formatter={(value: number) => formatSafe(value, 1)} fontSize={10} fontWeight={800} fill="#047857" />
                                        </Bar>
                                        <Line type="monotone" dataKey="generation" stroke="#2563eb" strokeWidth={3} dot={{ r: 3, fill: '#2563eb' }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                    <PremiumSlideFooter page={5} total={presentationTotalSlides} />
                </CleanSlideBackground>
            )
        },
        {
            title: '推荐方案',
            content: (
                <CleanSlideBackground className="bg-white">
                    <PremiumSlideHeader icon="recommend" title="推荐方案：把投资、容量和接入条件一次讲清" tone="sky" />
                    <div className="relative z-10 flex-1 min-h-0 px-12 pb-6 grid grid-cols-[0.95fr_1.05fr] gap-6">
                        <div className="rounded-[38px] overflow-hidden bg-slate-950 text-white shadow-[0_30px_100px_rgba(15,23,42,0.18)] relative">
                            <PhotoBackground visual="panelWarm" overlay="bg-gradient-to-t from-slate-950 via-slate-950/72 to-slate-950/10" />
                            <div className="relative z-10 h-full p-7 flex flex-col justify-end">
                                <p className="text-sm font-black tracking-[0.28em] text-emerald-300 uppercase">Recommended</p>
                                <div className={`inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full text-sm font-black w-fit ${isReportEmcMode ? 'bg-amber-300 text-slate-950' : isReportFinancingMode ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white'}`}>
                                    <span className="material-icons text-base">{isReportEmcMode ? 'handshake' : isReportFinancingMode ? 'account_balance' : 'engineering'}</span>
                                    {isReportEmcMode ? 'EMC合同能源管理' : isReportFinancingMode ? '融资共建' : isReportCoBuildMode ? '股权共建' : 'EPC总承包'}
                                </div>
                                <h3 className="text-6xl font-black leading-tight mt-5">{recommendedSolutionName}</h3>
                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl bg-white p-4 text-slate-950">
                                        <p className="text-sm font-bold text-slate-500">
                                            {isOwnerFocusedReport
                                                ? (isReportEmcMode ? '业主投入' : '业主投入（40%）')
                                                : (isReportEmcMode ? '投资方初始投入' : '回本周期')}
                                        </p>
                                        <p className={`text-4xl font-black mt-2 ${isOwnerFocusedReport ? 'text-slate-950' : 'text-orange-600'}`}>
                                            {isOwnerFocusedReport
                                                ? (isReportEmcMode ? '¥0' : `¥${formatSafe(ownerInitialInvestment, 1)}万`)
                                                : (isReportEmcMode ? `¥${formatSafe(effectiveInvestorInvestment, 1)}万` : `${formatSafe(recommendedComparison?.paybackPeriod ?? effectivePaybackPeriod, 2)}年`)}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-white p-4 text-slate-950">
                                        <p className="text-sm font-bold text-slate-500">{isOwnerFocusedReport ? '首年综合收益' : `${projectLifeYears}年净收益`}</p>
                                        <p className="text-4xl font-black text-emerald-600 mt-2">
                                            ¥{isOwnerFocusedReport ? formatSafe(firstYearOwnerBenefit, 1) : formatSafe(recommendedComparison?.rev25Year ?? effectiveRev25Year, 1)}万
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="min-h-0 flex flex-col justify-center gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                {solutionFacts.slice(0, businessConditionCards.length ? 6 : 8).map(([label, value]) => (
                                    <div key={label} className="rounded-[24px] bg-white border border-slate-200 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.07)] min-h-[96px]">
                                        <p className="text-sm font-bold text-slate-500">{label}</p>
                                        <p className="text-[22px] font-black text-slate-950 mt-2 leading-tight break-words">{value}</p>
                                    </div>
                                ))}
                            </div>
                            {businessConditionCards.length > 0 && (
                                <div className="rounded-[26px] bg-amber-50 border border-amber-200 p-4">
                                    <p className="text-sm font-black text-amber-700 mb-3">商务方案专项约定</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {businessConditionCards.map(([label, value]) => (
                                            <div key={label} className="rounded-2xl bg-white/80 border border-amber-100 p-3">
                                                <p className="text-xs font-black text-slate-700">{label}</p>
                                                <p className="text-[12px] font-semibold text-slate-500 leading-relaxed mt-1">{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <PremiumSlideFooter page={6} total={presentationTotalSlides} />
                </CleanSlideBackground>
            )
        },
        ...additionalSolutionSlides,
        ...(showComparisonSlide ? [{
            title: '方案对比',
            content: (
                <CleanSlideBackground>
                    <PremiumSlideHeader
                        icon="compare_arrows"
                        title="方案对比：合作模式也是方案差异的一部分"
                        tone="slate"
                    />
                    <div className="relative z-10 flex-1 px-10 pb-8">
                        {compactComparisonData.length > 0 ? (
                            <div className="h-full min-h-0 rounded-[32px] bg-white border border-slate-200 shadow-[0_24px_80px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col">
                                <div className="grid grid-cols-[1.58fr_0.72fr_0.66fr_0.78fr_0.86fr_0.88fr_0.9fr_0.78fr_0.58fr] bg-slate-950 text-white text-[13px] font-black">
                                    {['方案配置', '合作模式', '容量', '业主投入', '业主首年收益', `业主${projectLifeYears}年收益`, '收益方式', '回本/IRR', '推荐'].map(header => (
                                        <div key={header} className="px-3 py-4">{header}</div>
                                    ))}
                                </div>
                                <div className="flex-1 min-h-0 divide-y divide-slate-100 overflow-hidden">
                                    {compactComparisonData.map(solution => {
                                        const rowIsEmc = solution.investmentMode === 'emc';
                                        const rowIsFinancing = solution.investmentMode === 'financing';
                                        const rowIsCoBuild = solution.investmentMode === 'co_build';
                                        const isRecommended = solution.id === recommendedComparison?.id;
                                        const ownerInvestment = rowIsEmc ? 0 : rowIsCoBuild ? solution.ownerInitialInvestment : rowIsFinancing ? solution.investorInitialInvestment : solution.investment;
                                        const ownerYearOne = rowIsEmc || rowIsCoBuild ? solution.ownerBenefitYear1 : solution.netIncomeYear1;
                                        const ownerYear25 = rowIsEmc || rowIsCoBuild ? solution.ownerBenefit25 : solution.rev25Year;
                                        const settlement = rowIsEmc ? getEmcSettlementParts(solution) : null;
                                        return (
                                            <div
                                                key={solution.id}
                                                className={`grid grid-cols-[1.58fr_0.72fr_0.66fr_0.78fr_0.86fr_0.88fr_0.9fr_0.78fr_0.58fr] items-center text-[13px] ${isRecommended ? 'bg-emerald-50/75' : 'bg-white'}`}
                                            >
                                                <div className="px-3 py-3 min-w-0">
                                                    <p className="font-black text-slate-950 text-sm leading-tight">{solution.name}</p>
                                                    <p className="text-[11px] text-slate-500 mt-1 leading-tight">{solution.constructionMethodLabel}</p>
                                                    <p className="text-[11px] text-slate-500 leading-tight">组件：{solution.brand} · 逆变：{solution.inverterBrand}</p>
                                                    <p className="text-[11px] text-slate-500 leading-tight">电缆：{solution.cableBrand} · {solution.cableType}</p>
                                                </div>
                                                <div className="px-3 py-3 min-w-0">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-black ${rowIsEmc ? 'bg-amber-100 text-amber-700' : rowIsFinancing ? 'bg-purple-100 text-purple-700' : rowIsCoBuild ? 'bg-cyan-100 text-cyan-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {rowIsEmc ? 'EMC' : rowIsFinancing ? '融资共建' : rowIsCoBuild ? '股权共建' : 'EPC'}
                                                    </span>
                                                </div>
                                                <div className="px-3 py-3 min-w-0 font-black text-slate-800">{formatSafe(solution.capacity, 0)}kWp</div>
                                                <div className="px-3 py-3 min-w-0 font-black text-slate-900">{ownerInvestment === 0 ? '¥0' : `¥${formatSafe(ownerInvestment, 1)}万`}</div>
                                                <div className="px-3 py-3 min-w-0 font-black text-emerald-700">¥{formatSafe(ownerYearOne, 1)}万</div>
                                                <div className="px-3 py-3 min-w-0 font-black text-emerald-700">¥{formatSafe(ownerYear25, 1)}万</div>
                                                <div className="px-3 py-3 min-w-0">
                                                    <p className="font-black text-slate-800 leading-tight">{rowIsEmc ? settlement?.modeText : rowIsFinancing ? '融资后业主收益' : rowIsCoBuild ? '同股同酬分红' : '项目自投收益'}</p>
                                                    <p className="text-[11px] font-bold text-slate-500 mt-1">{rowIsEmc ? settlement?.detailText : rowIsFinancing ? `融资${formatSafe(solution.financingRatio, 0)}% · ${formatSafe(solution.financingTermYears, 0)}年` : rowIsCoBuild ? `${formatSafe(solution.coBuildInvestorShareRate, 0)}/${formatSafe(100 - solution.coBuildInvestorShareRate, 0)}持股 · ${formatSafe(solution.coBuildSalePrice, 2)}元/度` : '按项目净收益测算'}</p>
                                                </div>
                                                <div className="px-3 py-3 min-w-0">
                                                    {rowIsEmc ? (
                                                        <p className="font-black text-slate-400">不适用</p>
                                                    ) : (
                                                        <>
                                                            <p className="font-black text-orange-600">{formatSafe(solution.paybackPeriod, 2)}年</p>
                                                            <p className="text-[11px] font-bold text-blue-600 mt-1">IRR {formatSafe(solution.irr, 2)}%</p>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="px-3 py-3 min-w-0">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-black ${isRecommended ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                        {isRecommended ? '推荐' : '备选'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs font-semibold text-slate-500">
                                    {hasAnyEmcComparison
                                        ? 'EMC 方案仅展示业主投入与业主收益；EPC 方案按项目投资口径展示回本与 IRR。'
                                        : 'EPC 方案按项目投资口径展示，收益为项目净收益。'}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full rounded-[32px] bg-white border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                                <p className="text-2xl font-black">暂无可对比方案</p>
                            </div>
                        )}
                    </div>
                    <PremiumSlideFooter page={8 + businessTermsSlideOffset + additionalSolutionSlidesCount} total={presentationTotalSlides} />
                </CleanSlideBackground>
            )
        }] : []),
        ...(showBusinessTermsSlide ? [{
            title: '商务条件',
            content: (
                <CleanSlideBackground>
                    <PremiumSlideHeader icon="contract" title="商务条件：签约年限、结算方式与责任边界" tone="amber" />
                    <div className="relative z-10 flex-1 min-h-0 px-10 pb-6 grid grid-cols-[0.76fr_1.24fr] gap-6">
                        <div className="rounded-[30px] bg-slate-950 text-white p-7 shadow-[0_24px_80px_rgba(15,23,42,0.16)] flex flex-col justify-between min-h-0">
                            <div>
                                <p className="text-sm font-black tracking-[0.24em] text-amber-300 uppercase">Commercial Terms</p>
                                <h3 className="text-5xl font-black leading-tight mt-4">{recommendationModeLabel}</h3>
                            </div>
                            <div className="space-y-4 mt-6">
                                <div className="rounded-[28px] bg-amber-300 text-slate-950 px-6 py-5">
                                    <p className="text-sm font-black tracking-[0.18em] uppercase">结算电价</p>
                                    <p className="text-5xl font-black mt-2 leading-none">{isReportEmcMode ? recommendedEmcSettlement.primaryText : '按合同约定'}</p>
                                    <p className="text-base font-black mt-3 leading-snug">
                                        {isReportEmcMode ? recommendedEmcSettlement.secondaryText : (businessTerms?.settlementTerms || '按当前合作模式执行电费结算、租金或收益分配。')}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3">
                                        <p className="text-xs font-bold text-slate-400">签约年限</p>
                                        <p className="text-2xl font-black mt-1 leading-tight">{businessTerms?.contractYears || `${projectLifeYears}年`}</p>
                                    </div>
                                    <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3">
                                        <p className="text-xs font-bold text-slate-400">推荐方案</p>
                                        <p className="text-2xl font-black mt-1 leading-tight">{recommendedSolutionName}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-rows-[0.82fr_0.82fr_1fr] gap-4 min-h-0">
                            {[
                                ['业主责任', businessTerms?.ownerResponsibilities || '业主提供屋顶资源，协助办理发改备案、电网接入、现场协调及必要资料盖章。', 'domain'],
                                ['我方/投资方责任', businessTerms?.investorResponsibilities || '投资方负责方案设计、投资建设、设备采购、施工组织、运维管理及发电监控。', 'engineering'],
                                ['特殊条款与兜底责任', specialBusinessTerms || '涉及屋面结构、消防、规划、违建认定或属地审批事项的，以现场复核和政府主管部门口径为准。', 'gavel']
                            ].map(([label, value, icon]) => (
                                <div key={label} className={`rounded-[28px] bg-white border p-5 shadow-[0_18px_60px_rgba(15,23,42,0.07)] overflow-hidden ${label === '特殊条款与兜底责任' && hasCanopyOverheightResponsibility ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className={`material-icons text-[28px] ${label === '特殊条款与兜底责任' && hasCanopyOverheightResponsibility ? 'text-amber-600' : 'text-blue-600'}`}>{icon}</span>
                                        <h3 className="text-2xl font-black text-slate-950">{label}</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {String(value).split('\n').filter(Boolean).map((line, index) => (
                                            <p key={index} className="text-[17px] font-bold text-slate-600 leading-snug">{line}</p>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <PremiumSlideFooter page={7} total={presentationTotalSlides} />
                </CleanSlideBackground>
            )
        }] : []),
        ...(showMaterialBillSlide ? [{
            title: '材料清单',
            content: (
                <CleanSlideBackground>
                    <PremiumSlideHeader icon="inventory_2" title="基本材料清单：当前方案核心材料范围" tone="slate" />
                    <div className="relative z-10 flex-1 min-h-0 px-10 pb-6 grid grid-cols-[0.68fr_1.32fr] gap-6">
                        <div className="rounded-[30px] bg-slate-950 text-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.16)] flex flex-col justify-between">
                            <div>
                                <p className="text-sm font-black tracking-[0.24em] text-emerald-300 uppercase">Material Bill</p>
                                <h3 className="text-4xl font-black leading-tight mt-4">{recommendedSolutionName}</h3>
                                <p className="text-sm font-semibold text-slate-300 mt-4 leading-relaxed">
                                    本页只展示商务汇报所需的核心材料范围，详细施工明细可在配置页继续维护。
                                </p>
                            </div>
                            <div className="space-y-3 mt-5">
                                {[
                                    ['装机容量', `${formatSafe(recommendedComparison?.capacity ?? params.simpleParams.capacity, 2)} kWp`],
                                    ['建设方式', recommendedConstruction.shortName],
                                    ['清单范围', `${displayMaterialItems.length} 项核心材料`]
                                ].map(([label, value]) => (
                                    <div key={label} className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3">
                                        <p className="text-xs font-bold text-slate-400">{label}</p>
                                        <p className="text-xl font-black mt-1 leading-tight">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-[30px] bg-white border border-slate-200 shadow-[0_24px_80px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col min-h-0">
                            <div className="grid grid-cols-[1.25fr_0.82fr_0.76fr_1.55fr_0.45fr_0.45fr] bg-slate-950 text-white text-[12px] font-black">
                                {['名称', '材质', '品牌', '规格型号', '单位', '数量'].map(header => (
                                    <div key={header} className="px-3 py-2.5">{header}</div>
                                ))}
                            </div>
                            <div className="flex-1 min-h-0 overflow-hidden">
                                {displayMaterialItems.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className={`grid grid-cols-[1.25fr_0.82fr_0.76fr_1.55fr_0.45fr_0.45fr] text-[12px] font-bold border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                                    >
                                        <div className="px-3 py-2 text-slate-950 truncate">{item.name || '-'}</div>
                                        <div className="px-3 py-2 text-slate-600 truncate">{item.material || '-'}</div>
                                        <div className="px-3 py-2 text-slate-600 truncate">{item.brand || '-'}</div>
                                        <div className="px-3 py-2 text-slate-600 truncate">{item.specification || '-'}</div>
                                        <div className="px-3 py-2 text-slate-600 truncate">{item.unit || '-'}</div>
                                        <div className="px-3 py-2 text-slate-600 truncate">{item.quantity || '-'}</div>
                                    </div>
                                ))}
                            </div>
                            {materialBillItems.length > displayMaterialItems.length && (
                                <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-500">
                                    本页展示核心材料 {displayMaterialItems.length} 项，完整清单共 {materialBillItems.length} 项。
                                </div>
                            )}
                        </div>
                    </div>
                    <PremiumSlideFooter page={8 + businessTermsSlideOffset + additionalSolutionSlidesCount + comparisonSlideOffset} total={presentationTotalSlides} />
                </CleanSlideBackground>
            )
        }] : []),
        {
            title: '投资回报',
            content: (
                <CleanSlideBackground>
                    <PremiumSlideHeader
                        icon="timer"
                        title={isOwnerFocusedReport ? '业主收益趋势：重点看合作期内与移交后的收益变化' : '投资回报：回本周期是核心决策指标'}
                        tone="amber"
                    />
                    <div className="relative z-10 flex-1 px-12 pb-8 grid grid-cols-[0.78fr_1.22fr] gap-8">
                        <div className="rounded-[38px] bg-[#050816] text-white p-8 shadow-[0_32px_100px_rgba(15,23,42,0.20)] flex flex-col justify-between">
                            <div>
                                <p className="text-sm font-black tracking-[0.26em] text-amber-300 uppercase">{isOwnerFocusedReport ? 'Owner Benefit' : 'Payback'}</p>
                                {isOwnerFocusedReport ? (
                                    <>
                                        <div className="mt-8 flex items-center gap-3">
                                            <span className="text-[96px] leading-[1.12] font-black tabular-nums text-emerald-300">{formatSafe(firstYearOwnerBenefit, 1)}</span>
                                            <span className="text-4xl leading-none font-black">万/年</span>
                                        </div>
                                        <p className="text-2xl font-black text-white mt-4">业主首年综合收益</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="mt-8 flex items-center gap-3">
                                            <span className="text-[104px] leading-[1.12] font-black tabular-nums text-amber-300">{formatSafe(effectivePaybackPeriod, 2)}</span>
                                            <span className="text-4xl leading-none font-black">年</span>
                                        </div>
                                        <p className="text-2xl font-black text-white mt-4">预计回本周期</p>
                                    </>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-2xl bg-white p-5 text-slate-950">
                                    <p className="text-sm font-bold text-slate-500">{isOwnerFocusedReport ? `${projectLifeYears}年综合收益` : 'IRR'}</p>
                                    <p className="text-3xl font-black text-blue-600 mt-2">{isOwnerFocusedReport ? `¥${formatSafe(ownerTotalBenefit25, 1)}万` : `${formatSafe(effectiveIrr, 2)}%`}</p>
                                </div>
                                <div className="rounded-2xl bg-white p-5 text-slate-950">
                                    <p className="text-sm font-bold text-slate-500">{isOwnerFocusedReport ? '收益方式' : '首年净收益'}</p>
                                    <p className="text-3xl font-black text-emerald-600 mt-2 leading-tight">
                                        {isOwnerFocusedReport
                                            ? (isReportEmcMode ? recommendedEmcSettlement.modeText : '电价优惠 + 40%分红')
                                            : `¥${formatSafe(effectiveYearOneIncome, 1)}万`}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-[34px] bg-white border border-slate-200 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                            <div className="flex items-start justify-between mb-5">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900">{isOwnerFocusedReport ? '业主年度收益与累计收益' : '年度收益与累计现金流'}</h3>
                                    <p className="text-sm font-semibold text-slate-500 mt-1">{isOwnerFocusedReport ? '柱形为业主年度收益，折线为业主累计收益；合作期满后按资产移交口径测算' : '柱形为年度净收益，折线为累计现金流'}</p>
                                </div>
                                <span className={`rounded-full px-4 py-2 text-sm font-black ${isOwnerFocusedReport ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                    {isOwnerFocusedReport ? `${projectLifeYears}年约 ${formatSafe(ownerTotalBenefit25, 1)} 万元` : `第 ${formatSafe(effectivePaybackPeriod, 2)} 年附近回本`}
                                </span>
                            </div>
                            <ResponsiveContainer width="100%" height={390}>
                                <ComposedChart data={isOwnerFocusedReport ? ownerBenefitChartData : cashFlowChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="year" tick={{fontSize: 13}} />
                                    <YAxis yAxisId="left" tick={{fontSize: 13}} />
                                    <YAxis yAxisId="right" orientation="right" tick={{fontSize: 13}} />
                                    {!isOwnerFocusedReport && <ReferenceLine yAxisId="right" y={0} stroke="#f97316" strokeDasharray="5 5" />}
                                    <Bar yAxisId="left" dataKey={isOwnerFocusedReport ? 'ownerBenefit' : 'netIncome'} fill="#10b981" radius={[8, 8, 0, 0]} name={isOwnerFocusedReport ? '业主年度收益' : '年度净收益'}>
                                        <LabelList
                                            dataKey={isOwnerFocusedReport ? 'ownerBenefit' : 'netIncome'}
                                            position="top"
                                            formatter={(value: number) => `${Number(value).toFixed(0)}万`}
                                            fontSize={11}
                                            fill="#047857"
                                        />
                                    </Bar>
                                    <Line yAxisId="right" type="monotone" dataKey={isOwnerFocusedReport ? 'cumulativeOwnerBenefit' : 'cumulativeCashFlow'} stroke="#2563eb" strokeWidth={4} dot={{ r: 4 }} name={isOwnerFocusedReport ? '业主累计收益' : '累计现金流'} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <PremiumSlideFooter page={7 + businessTermsSlideOffset} total={presentationTotalSlides} />
                </CleanSlideBackground>
            )
        },
        {
            title: '消纳率敏感性',
            content: (
                <CleanSlideBackground className="bg-[#f8fbff]">
                    <PremiumSlideHeader
                        icon="timeline"
                        title={isOwnerFocusedReport ? '消纳率敏感性：重点观察业主收益变化' : '消纳率敏感性：消纳越高，回本通常越快'}
                        tone="sky"
                    />
                    <div className="relative z-10 flex-1 min-h-0 px-12 pb-6 grid grid-cols-[0.84fr_1.16fr] gap-6">
                        <div className="min-h-0 overflow-hidden rounded-[30px] bg-white border border-slate-200 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                            <p className="text-base font-bold text-slate-500">当前消纳率</p>
                            <p className="text-6xl font-black text-blue-600 mt-2">{baseConsumptionScenario.rate}%</p>
                            <div className="mt-5 space-y-3">
                                {(isReportEmcMode
                                    ? [
                                        [`当前业主${projectLifeYears}年收益`, `¥${formatSafe(baseConsumptionScenario.ownerBenefit, 1)}万`, 'bg-emerald-50 text-emerald-700'],
                                        ['高消纳业主收益', `¥${formatSafe(highConsumptionScenario.ownerBenefit, 1)}万`, 'bg-blue-50 text-blue-700'],
                                        ['收益提升空间', `¥${formatSafe(Math.max(0, safeNumber(highConsumptionScenario.ownerBenefit) - safeNumber(lowConsumptionScenario.ownerBenefit)), 1)}万`, 'bg-amber-50 text-amber-700']
                                    ]
                                    : [
                                        ['当前回本', `${formatSafe(baseConsumptionScenario.payback, 2)} 年`, 'bg-blue-50 text-blue-700'],
                                        ['高消纳回本', `${formatSafe(highConsumptionScenario.payback, 2)} 年`, 'bg-emerald-50 text-emerald-700'],
                                        ['高低档差值', `${formatSafe(Math.max(0, safeNumber(paybackRangeDiff)), 2)} 年`, 'bg-amber-50 text-amber-700']
                                    ]
                                ).map(([label, value, cls]) => (
                                    <div key={label} className={`rounded-2xl p-3.5 ${cls}`}>
                                        <p className="text-xs font-bold opacity-80">{label}</p>
                                        <p className="text-2xl font-black mt-1">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className={`min-h-0 grid ${isReportEmcMode && !isReportSharingEmcMode ? 'grid-rows-1' : 'grid-rows-[1fr_1fr]'} gap-3`}>
                            <div className="min-h-0 overflow-hidden rounded-[30px] bg-white border border-slate-200 p-4 shadow-[0_20px_70px_rgba(15,23,42,0.07)]">
                                <h3 className="text-lg font-black text-slate-900 mb-3">{isOwnerFocusedReport ? `业主${projectLifeYears}年收益变化` : '回本周期变化'}</h3>
                                <div className={`${isReportEmcMode && !isReportSharingEmcMode ? 'space-y-4 mt-5' : 'space-y-2'}`}>
                                    {consumptionScenarioData.map(item => (
                                        <div key={item.rate} className="grid grid-cols-[54px_1fr_82px] items-center gap-3">
                                            <span className="text-xs font-black text-slate-500">{item.rate}%</span>
                                            <div className={`${isReportEmcMode && !isReportSharingEmcMode ? 'h-4' : 'h-3'} rounded-full bg-slate-100 overflow-hidden`}>
                                                <div
                                                    className={`h-full rounded-full ${isOwnerFocusedReport ? 'bg-emerald-500' : 'bg-orange-500'}`}
                                                    style={{ width: `${Math.max(6, ((isOwnerFocusedReport ? safeNumber(item.ownerBenefit) / maxOwnerBenefit : safeNumber(item.payback) / maxPayback)) * 100)}%` }}
                                                ></div>
                                            </div>
                                            <span className={`text-sm font-black text-right ${isOwnerFocusedReport ? 'text-emerald-600' : 'text-orange-600'}`}>
                                                {isOwnerFocusedReport ? `¥${formatSafe(item.ownerBenefit, 0)}万` : `${formatSafe(item.payback, 2)}年`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {!(isReportEmcMode && !isReportSharingEmcMode) && (
                            <div className="min-h-0 overflow-hidden rounded-[30px] bg-white border border-slate-200 p-4 shadow-[0_20px_70px_rgba(15,23,42,0.07)]">
                                <h3 className="text-lg font-black text-slate-900 mb-3">
                                    {isReportSharingEmcMode ? '分成模式收益结构' : (isOwnerFocusedReport ? '业主收益变化' : '项目净收益')}
                                </h3>
                                <div className="space-y-2">
                                    {consumptionScenarioData.map(item => (
                                        <div
                                            key={item.rate}
                                            className={`grid ${isReportSharingEmcMode ? 'grid-cols-[54px_1fr_1fr_86px]' : 'grid-cols-[54px_1fr_86px]'} items-center gap-3`}
                                        >
                                            <span className="text-xs font-black text-slate-500">{item.rate}%</span>
                                            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-blue-600"
                                                    style={{ width: `${Math.max(6, (safeNumber(item.rev25Year) / maxScenarioRevenue) * 100)}%` }}
                                                ></div>
                                            </div>
                                            {isReportSharingEmcMode && (
                                                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                                                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(6, (safeNumber(item.ownerBenefit) / maxOwnerBenefit) * 100)}%` }}></div>
                                                </div>
                                            )}
                                            <span className="text-xs font-black text-slate-700 text-right">¥{formatSafe(item.rev25Year, 0)}万</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 flex items-center gap-5 text-[11px] font-bold text-slate-500">
                                    <span className="flex items-center gap-2"><i className="w-4 h-2 rounded-full bg-blue-600"></i>{revenueLabel}</span>
                                    {isReportSharingEmcMode && <span className="flex items-center gap-2"><i className="w-4 h-2 rounded-full bg-emerald-500"></i>业主{projectLifeYears}年收益</span>}
                                </div>
                            </div>
                            )}
                        </div>
                    </div>
                    <PremiumSlideFooter page={8 + additionalSolutionSlidesCount + businessTermsSlideOffset + comparisonSlideOffset + materialSlideOffset} total={presentationTotalSlides} />
                </CleanSlideBackground>
            )
        },
        {
            title: '测算依据与风险控制',
            content: (
                <CleanSlideBackground>
                    <PremiumSlideHeader icon="shield" title="测算依据与风险控制：让收益更可解释" tone="slate" />
                    <div className="relative z-10 flex-1 px-12 pb-8 grid grid-cols-[1.08fr_0.92fr] gap-8">
                        <div className="rounded-[34px] bg-white border border-slate-200 p-7 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                            <h3 className="text-2xl font-black text-slate-950 mb-5">关键测算假设</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {assumptions.slice(0, 8).map(item => (
                                    <div key={item.label} className="rounded-2xl bg-slate-50 border border-slate-200 p-4 min-h-[92px]">
                                        <p className="text-sm font-bold text-slate-500">{item.label}</p>
                                        <p className="text-2xl font-black text-slate-950 mt-2">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-5">
                            {[
                                ['每季度清洁一次', '降低积灰损失，稳定发电效率', 'cleaning_services'],
                                ['月度电气巡检', '排查接线、热斑和绝缘风险', 'electric_bolt'],
                                ['逆变器与监控', '异常告警、发电量追踪、远程诊断', 'monitor_heart'],
                                ['保险与备件', '覆盖自然灾害、设备故障与停机风险', 'verified_user']
                            ].map(([title, desc, icon]) => (
                                <div key={title} className="rounded-[26px] bg-white border border-slate-200 p-5 shadow-[0_16px_55px_rgba(15,23,42,0.06)] flex gap-4 items-start">
                                    <span className="material-icons text-3xl text-blue-600">{icon}</span>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-950">{title}</h3>
                                        <p className="text-base font-semibold text-slate-500 mt-2">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <PremiumSlideFooter page={9 + additionalSolutionSlidesCount + businessTermsSlideOffset + comparisonSlideOffset + materialSlideOffset} total={presentationTotalSlides} />
                </CleanSlideBackground>
            )
        },
        {
            title: '结束页',
            content: (
                <div className="h-full relative overflow-hidden bg-slate-950 text-white">
                    <PhotoBackground visual="panelWarm" overlay="bg-gradient-to-r from-slate-950/92 via-slate-950/62 to-slate-950/24" />
                    <div className="relative z-10 h-full px-16 py-12 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-white/75">
                            <div className="flex items-center gap-3">
                                <span className="material-icons text-amber-300">wb_sunny</span>
                                <span className="text-sm font-black tracking-[0.22em] uppercase">Solar Proposal</span>
                            </div>
                            <span className="text-sm font-bold">{projectLocationDisplay}</span>
                        </div>

                        <div className="max-w-4xl">
                            <p className="text-xl font-bold text-emerald-300 mb-6">{projectBaseInfo?.name || '分布式光伏项目'}</p>
                            <h2 className="text-[86px] leading-none font-black tracking-tight">感谢观看</h2>
                            <p className="text-3xl font-black text-white/90 mt-8">
                                推荐推进：{recommendedSolutionName}
                            </p>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                            {[
                                ['合作模式', isReportEmcMode ? 'EMC' : isReportFinancingMode ? '融资共建' : isReportCoBuildMode ? '股权共建' : 'EPC'],
                                ['装机容量', currentCapacityText],
                                [isOwnerFocusedReport ? '业主首年收益' : '预计回本', isOwnerFocusedReport ? `¥${formatSafe(firstYearOwnerBenefit, 1)}万` : `${formatSafe(effectivePaybackPeriod, 2)}年`],
                                [isOwnerFocusedReport ? `业主${projectLifeYears}年收益` : `${projectLifeYears}年净收益`, isOwnerFocusedReport ? `¥${formatSafe(ownerTotalBenefit25, 1)}万` : `¥${formatSafe(effectiveRev25Year, 1)}万`]
                            ].map(([label, value]) => (
                                <div key={label} className="rounded-3xl bg-white text-slate-950 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
                                    <p className="text-sm font-bold text-slate-500">{label}</p>
                                    <p className="text-3xl font-black mt-3 leading-tight">{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="absolute bottom-5 left-8 right-8 z-10 flex justify-between text-white/60 text-base font-semibold">
                        <span>{10 + additionalSolutionSlidesCount + businessTermsSlideOffset + comparisonSlideOffset + materialSlideOffset}/{presentationTotalSlides}</span>
                    </div>
                </div>
            )
        }
    ];

    // 对业主先讲清推荐方案和商务条件，再展开投资回报与后续分析。
    const investmentReturnSlideIndex = slidesInContentOrder.findIndex(slide => slide.title === '投资回报');
    const recommendationSlideIndex = slidesInContentOrder.findIndex(slide => slide.title === '推荐方案');
    const businessTermsSlideIndex = slidesInContentOrder.findIndex(slide => slide.title === '商务条件');
    const promotedIndexes = new Set([recommendationSlideIndex, businessTermsSlideIndex, investmentReturnSlideIndex].filter(index => index >= 0));
    const slides = investmentReturnSlideIndex < 0 || recommendationSlideIndex < 0
        ? slidesInContentOrder
        : [
            ...slidesInContentOrder.slice(0, recommendationSlideIndex + 1),
            ...(businessTermsSlideIndex >= 0 ? [slidesInContentOrder[businessTermsSlideIndex]] : []),
            slidesInContentOrder[investmentReturnSlideIndex],
            ...slidesInContentOrder.filter((_, index) => index > recommendationSlideIndex && !promotedIndexes.has(index))
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
                        {supportsAudienceSelection && (
                            <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/70 p-1" aria-label="汇报对象">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setReportAudience('owner');
                                        onAudienceChange?.('owner');
                                        setCurrentSlide(0);
                                    }}
                                    className={`rounded-lg px-3 py-2 text-xs font-bold transition-all ${reportAudience === 'owner' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
                                >
                                    对业主汇报
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setReportAudience('investor');
                                        onAudienceChange?.('investor');
                                        setCurrentSlide(0);
                                    }}
                                    className={`rounded-lg px-3 py-2 text-xs font-bold transition-all ${reportAudience === 'investor' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'}`}
                                >
                                    对投资方汇报
                                </button>
                            </div>
                        )}
                        <div className="flex items-center gap-1 bg-slate-900/70 border border-slate-700 rounded-xl p-1" aria-label="方案展示方式">
                            <button
                                onClick={() => {
                                    setShowMultipleSolutions(false);
                                    setCurrentSlide(0);
                                }}
                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${!showMultipleSolutions ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'}`}
                            >
                                单方案重点
                            </button>
                            <button
                                onClick={() => {
                                    setShowMultipleSolutions(true);
                                    setCurrentSlide(0);
                                }}
                                disabled={solutionComparisonData.length <= 1}
                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${showMultipleSolutions ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'} disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                                多方案详述
                            </button>
                        </div>
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
                <div className="flex-1 min-h-0 p-6 bg-slate-900 overflow-hidden">
                    <div ref={slideViewportRef} className="w-full h-full flex items-center justify-center overflow-hidden">
                        <div
                            className="relative flex-none"
                            style={{ width: 1280 * presentationScale, height: 720 * presentationScale }}
                        >
                            <div
                                className="absolute left-0 top-0 w-[1280px] h-[720px] bg-white rounded-lg shadow-2xl overflow-hidden origin-top-left"
                                style={{ transform: `scale(${presentationScale})` }}
                            >
                                {slides[currentSlide]?.content}
                            </div>
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
                            <div className="text-base font-medium text-slate-800">{MODULE_BRANDS[currentSolution?.brand || 'generic'].name}</div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">电缆配置</p>
                            <div className="text-base font-medium text-slate-800">{CABLE_BRANDS[currentSolution?.cableBrand || 'generic'].name} · {currentSolution?.cableType === 'copper' ? '铜芯' : '铝芯'}</div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">逆变器品牌</p>
                            <div className="text-base font-medium text-slate-800">{INVERTER_BRANDS[currentSolution?.inverterBrand || 'generic'].name}</div>
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
                            <p className="text-sm text-slate-500 mb-1">建造成本单价</p>
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
                            <div className="text-2xl font-bold text-purple-700">{formatSafe(effectiveIrr, 2)}%</div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 text-center">
                            <div className="text-xs text-orange-600 mb-1">回本周期</div>
                            <div className="text-2xl font-bold text-orange-700">{formatSafe(effectivePaybackPeriod, 2)}年</div>
                        </div>
                    </div>
                </section>

                {/* 5. Consumption Rate Scenario Analysis */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <span className="material-icons text-blue-600">timeline</span>
                        五、多消纳率回本周期分析
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
                            <div className="text-xs text-blue-600 mb-1">当前消纳率</div>
                            <div className="text-2xl font-bold text-blue-700">{Math.round(calculatedSelfConsumption)}%</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4 text-center border border-slate-200">
                            <div className="text-xs text-slate-500 mb-1">当前回本周期</div>
                            <div className="text-2xl font-bold text-slate-800">{formatSafe(baseConsumptionScenario?.payback, 2)}年</div>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-4 text-center border border-emerald-100">
                            <div className="text-xs text-emerald-600 mb-1">高消纳回本</div>
                            <div className="text-2xl font-bold text-emerald-700">{formatSafe(highConsumptionScenario?.payback, 2)}年</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-4 text-center border border-amber-100">
                            <div className="text-xs text-amber-600 mb-1">高低档回本差</div>
                            <div className="text-2xl font-bold text-amber-700">{paybackRangeDiff.toFixed(2)}年</div>
                        </div>
                    </div>
                    <div className="h-64 mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={consumptionScenarioData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="rate" tickFormatter={(value) => `${value}%`} />
                                <YAxis yAxisId="left" tick={{ fill: '#2563eb' }} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b' }} />
                                <Tooltip formatter={(value: number, name: string) => [
                                    name === 'payback' ? `${value.toFixed(2)} 年` : `${value.toFixed(2)}%`,
                                    name === 'payback' ? '回本周期' : 'IRR'
                                ]} />
                                <Line yAxisId="left" type="monotone" dataKey="payback" name="回本周期" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                                <Line yAxisId="right" type="monotone" dataKey="irr" name="IRR" stroke="#94a3b8" strokeWidth={2} dot={{ r: 3 }} />
                                <Legend />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 text-left font-semibold text-slate-700">消纳率</th>
                                    <th className="px-4 py-3 text-right font-semibold text-slate-700">回本周期</th>
                                    <th className="px-4 py-3 text-right font-semibold text-slate-700">IRR</th>
                                    <th className="px-4 py-3 text-right font-semibold text-slate-700">
                                        {isReportSharingEmcMode ? `${projectLifeYears}年投资方收益` : (isOwnerFocusedReport ? `业主${projectLifeYears}年收益` : `${projectLifeYears}年项目净收益`)}
                                    </th>
                                    {isReportSharingEmcMode && <th className="px-4 py-3 text-right font-semibold text-slate-700">业主{projectLifeYears}年收益</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {consumptionScenarioData.map((item) => (
                                    <tr key={item.rate} className={`border-b border-slate-100 ${item.isBase ? 'bg-blue-50' : ''}`}>
                                        <td className="px-4 py-3 font-medium text-slate-800">{item.rate}%</td>
                                        <td className="px-4 py-3 text-right font-bold text-blue-700">{item.payback.toFixed(2)} 年</td>
                                        <td className="px-4 py-3 text-right text-slate-700">{item.irr.toFixed(2)}%</td>
                                        <td className="px-4 py-3 text-right text-emerald-700">
                                            {formatSafe(isReportEmcMode && !isReportSharingEmcMode ? item.ownerBenefit : item.rev25Year, 2)} 万元
                                        </td>
                                        {isReportSharingEmcMode && <td className="px-4 py-3 text-right text-blue-700">{item.ownerBenefit.toFixed(2)} 万元</td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 6. Solution Comparison */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <span className="material-icons text-blue-600">compare</span>
                        六、方案对比分析
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
                        七、月度发电量分布
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
                        八、{projectLifeYears}年现金流趋势
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
                                    <td className="px-3 py-2 text-center text-slate-800" colSpan={2}>{projectLifeYears}年合计</td>
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
                        九、投资收益汇总表
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
                                    <td className="px-4 py-3 text-slate-600 bg-slate-50 font-medium">{projectLifeYears}年累计收益</td>
                                    <td className="px-4 py-3 text-green-700 font-medium">¥{longTermMetrics.rev25Year.toFixed(2)} 万元</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <td className="px-4 py-3 text-slate-600 bg-slate-50 font-medium">内部收益率 (IRR)</td>
                                    <td className="px-4 py-3 text-slate-800 font-medium">{formatSafe(effectiveIrr, 2)}%</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <td className="px-4 py-3 text-slate-600 bg-slate-50 font-medium">投资回本周期</td>
                                    <td className="px-4 py-3 text-slate-800 font-medium">{formatSafe(effectivePaybackPeriod, 2)} 年</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <td className="px-4 py-3 text-slate-600 bg-slate-50 font-medium">{projectLifeYears}年总净现值</td>
                                    <td className="px-4 py-3 text-blue-700 font-bold">¥{longTermMetrics.cashFlows.slice(1).reduce((sum, val) => sum + val, 0).toFixed(2)} 万元</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Footer */}
                <div className="text-center text-sm text-slate-400 mt-8 pt-4 border-t border-slate-200 print:hidden">
                    <p>本报告由{PRODUCT_IDENTITY.fullName}{PRODUCT_IDENTITY.version}自动生成</p>
                    <p>生成时间：{new Date().toLocaleString('zh-CN')}</p>
                </div>
            </div>
        );
            </div>
        );
    }
