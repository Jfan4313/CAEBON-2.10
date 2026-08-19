import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bill, useProject } from '../../context/ProjectContext';
import { estimateAnnualLoad, parseBillMonth } from '../../shared/utils/monthlyLoadEstimation';
import { getProjectTypeLabel } from '../../shared/utils/projectLoadProfiles';

type BillDraft = {
    month: string;
    billingMode: 'tou' | 'fixed';
    totalKwh: string;
    fixedUnitPrice: string;
    reactiveKvarh: string;
    sharpPeakKwh: string;
    peakKwh: string;
    flatKwh: string;
    valleyKwh: string;
    sharpPeakPrice: string;
    peakPrice: string;
    flatPrice: string;
    valleyPrice: string;
    cost: string;
};

const defaultBillingMode = (projectType?: string): BillDraft['billingMode'] => (
    projectType === 'office' || projectType === 'commercial' ? 'fixed' : 'tou'
);

const emptyDraft = (billingMode: BillDraft['billingMode'] = 'tou'): BillDraft => ({
    month: new Date().toISOString().slice(0, 7),
    billingMode, totalKwh: '', fixedUnitPrice: '', reactiveKvarh: '',
    sharpPeakKwh: '', peakKwh: '', flatKwh: '', valleyKwh: '', cost: '',
    sharpPeakPrice: '', peakPrice: '', flatPrice: '', valleyPrice: '',
});

const numberFrom = (value: unknown): number => {
    const result = Number(String(value ?? '').replace(/,/g, '').trim());
    return Number.isFinite(result) ? Math.max(0, result) : 0;
};

const readValue = (item: Record<string, unknown>, keys: string[]) => {
    const matchedKey = Object.keys(item).find(key => keys.some(candidate => key.trim().toLowerCase() === candidate.toLowerCase()));
    return matchedKey ? item[matchedKey] : undefined;
};

const normalizeImportedBill = (item: Record<string, unknown>, id: number): Bill | null => {
    const month = String(readValue(item, ['month', '月份', '日期']) ?? '').trim();
    if (!month || !parseBillMonth(month)) return null;
    const sharpPeakKwh = numberFrom(readValue(item, ['sharpPeakKwh', '尖峰', '尖峰电量', '尖峰电量(kWh)']));
    const peakKwh = numberFrom(readValue(item, ['peakKwh', '峰', '峰电量', '峰电量(kWh)']));
    const flatKwh = numberFrom(readValue(item, ['flatKwh', '平', '平电量', '平电量(kWh)']));
    const valleyKwh = numberFrom(readValue(item, ['valleyKwh', '谷', '谷电量', '谷电量(kWh)']));
    const touTotal = sharpPeakKwh + peakKwh + flatKwh + valleyKwh;
    const kwh = touTotal || numberFrom(readValue(item, [
        'kwh', '用电量', '总电量', '用电量(kWh)', '正向有功总', '正向有功', '正向有功总(kWh)',
    ]));
    if (kwh <= 0) return null;
    const fixedUnitPrice = numberFrom(readValue(item, ['fixedUnitPrice', '固定单价', '固定电价', '单价(元/kWh)']));
    const sharpPeakPrice = numberFrom(readValue(item, ['sharpPeakPrice', '尖峰电价', '尖峰单价', '尖峰电价(元/kWh)']));
    const peakPrice = numberFrom(readValue(item, ['peakPrice', '峰电价', '高峰电价', '峰单价', '峰电价(元/kWh)']));
    const flatPrice = numberFrom(readValue(item, ['flatPrice', '平电价', '平段电价', '平单价', '平电价(元/kWh)']));
    const valleyPrice = numberFrom(readValue(item, ['valleyPrice', '谷电价', '低谷电价', '谷单价', '谷电价(元/kWh)']));
    const reactiveKvarh = numberFrom(readValue(item, ['reactiveKvarh', '正向无功总', '正向无功', '无功电量', '无功电量(kvarh)']));
    return {
        id, month, kwh,
        cost: numberFrom(readValue(item, ['cost', '电费', '总电费', '电费(元)'])),
        sharpPeakKwh, peakKwh, flatKwh, valleyKwh,
        sharpPeakPrice: sharpPeakPrice || undefined,
        peakPrice: peakPrice || undefined,
        flatPrice: flatPrice || undefined,
        valleyPrice: valleyPrice || undefined,
        billingMode: touTotal > 0 ? 'tou' : 'fixed',
        fixedUnitPrice: fixedUnitPrice || undefined,
        reactiveKvarh,
    };
};

const formatKwh = (value: number) => Math.round(Number(value || 0)).toLocaleString('zh-CN');

export const BillImport: React.FC = () => {
    const { bills, setBills, projectBaseInfo, setProjectBaseInfo } = useProject();
    const [draft, setDraft] = useState<BillDraft>(() => emptyDraft(defaultBillingMode(projectBaseInfo.type)));
    const [isImporting, setIsImporting] = useState(false);
    const [importFileName, setImportFileName] = useState('');
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const actualBills = useMemo(() => bills.filter(bill => Number(bill.kwh || 0) > 0), [bills]);
    const estimation = useMemo(() => estimateAnnualLoad(actualBills, {
        projectType: projectBaseInfo.type,
        province: projectBaseInfo.province,
        hasAirConditioning: projectBaseInfo.hasAirConditioning,
    }), [actualBills, projectBaseInfo.type, projectBaseInfo.province, projectBaseInfo.hasAirConditioning]);
    const averagePrice = useMemo(() => {
        const energy = actualBills.reduce((total, bill) => total + Number(bill.kwh || 0), 0);
        const cost = actualBills.reduce((total, bill) => total + Number(bill.cost || 0), 0);
        return energy > 0 ? cost / energy : 0;
    }, [actualBills]);

    useEffect(() => {
        setDraft(previous => {
            const hasEnteredBillData = (Object.keys(previous) as Array<keyof BillDraft>)
                .some(field => !['month', 'billingMode'].includes(field) && previous[field].trim() !== '');
            return hasEnteredBillData
                ? previous
                : { ...previous, billingMode: defaultBillingMode(projectBaseInfo.type) };
        });
    }, [projectBaseInfo.type]);

    const setDraftValue = (field: keyof BillDraft, value: string) => setDraft(previous => ({ ...previous, [field]: value }));

    const handleAddBill = () => {
        const monthNumber = parseBillMonth(draft.month);
        const sharpPeakKwh = numberFrom(draft.sharpPeakKwh);
        const peakKwh = numberFrom(draft.peakKwh);
        const flatKwh = numberFrom(draft.flatKwh);
        const valleyKwh = numberFrom(draft.valleyKwh);
        const fixedUnitPrice = numberFrom(draft.fixedUnitPrice);
        const reactiveKvarh = numberFrom(draft.reactiveKvarh);
        const sharpPeakPrice = numberFrom(draft.sharpPeakPrice);
        const peakPrice = numberFrom(draft.peakPrice);
        const flatPrice = numberFrom(draft.flatPrice);
        const valleyPrice = numberFrom(draft.valleyPrice);
        const kwh = draft.billingMode === 'fixed'
            ? numberFrom(draft.totalKwh)
            : sharpPeakKwh + peakKwh + flatKwh + valleyKwh;
        if (!monthNumber || kwh <= 0) {
            setError(draft.billingMode === 'fixed' ? '请选择月份并填写本月总电量。' : '请选择月份，并至少填写一项尖峰平谷电量。');
            return;
        }
        const enteredCost = numberFrom(draft.cost);
        const nextBill: Bill = {
            id: Date.now(), month: draft.month, kwh,
            cost: enteredCost || (draft.billingMode === 'fixed' ? kwh * fixedUnitPrice : 0),
            sharpPeakKwh: draft.billingMode === 'tou' ? sharpPeakKwh : 0,
            peakKwh: draft.billingMode === 'tou' ? peakKwh : 0,
            flatKwh: draft.billingMode === 'tou' ? flatKwh : 0,
            valleyKwh: draft.billingMode === 'tou' ? valleyKwh : 0,
            sharpPeakPrice: draft.billingMode === 'tou' ? sharpPeakPrice || undefined : undefined,
            peakPrice: draft.billingMode === 'tou' ? peakPrice || undefined : undefined,
            flatPrice: draft.billingMode === 'tou' ? flatPrice || undefined : undefined,
            valleyPrice: draft.billingMode === 'tou' ? valleyPrice || undefined : undefined,
            billingMode: draft.billingMode,
            fixedUnitPrice: draft.billingMode === 'fixed' ? fixedUnitPrice : undefined,
            reactiveKvarh,
        };
        setBills([...bills.filter(bill => parseBillMonth(bill.month) !== monthNumber), nextBill]);
        setDraft(previous => ({ ...emptyDraft(previous.billingMode), month: previous.month }));
        setError('');
        setImportFileName('');
    };

    const handleDeleteBill = (month: number) => setBills(bills.filter(bill => parseBillMonth(bill.month) !== month));

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        setError('');
        try {
            let rows: Record<string, unknown>[] = [];
            if (file.name.endsWith('.json')) {
                const parsed = JSON.parse(await file.text());
                if (Array.isArray(parsed)) rows = parsed;
            } else if (file.name.endsWith('.csv')) {
                const lines = (await file.text()).split(/\r?\n/).filter(line => line.trim());
                const headers = lines[0]?.split(/[,，]/).map(value => value.trim()) || [];
                rows = lines.slice(1).map(line => Object.fromEntries(
                    line.split(/[,，]/).map((value, index) => [headers[index], value.trim()]),
                ));
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                const XLSX = await import('xlsx');
                const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
                rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as Record<string, unknown>[];
            } else {
                throw new Error('仅支持 CSV、JSON、XLSX 或 XLS 文件。');
            }
            const imported = rows.map((row, index) => normalizeImportedBill(row, Date.now() + index)).filter((bill): bill is Bill => Boolean(bill));
            if (imported.length === 0) throw new Error('未识别到有效数据，请检查月份及用电量列名。');
            const importedMonths = new Set(imported.map(bill => parseBillMonth(bill.month)));
            setBills([...bills.filter(bill => !importedMonths.has(parseBillMonth(bill.month))), ...imported]);
            setImportFileName(file.name);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : '文件解析失败。');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const hasActualData = estimation.actualMonthCount > 0;
    const estimatedAnnualWanKwh = estimation.annualizedKwh / 10000;

    return (
        <div className="space-y-4 min-w-0">
            <div className="flex justify-between items-center px-1 gap-3">
                <div>
                    <label className="text-sm font-semibold text-slate-700">电费单在线录入</label>
                    <p className="text-[10px] text-slate-400 mt-0.5">支持只录一个月，系统按建筑类型与季节补齐全年</p>
                </div>
                <button onClick={() => fileInputRef.current?.click()} disabled={isImporting}
                    className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20 disabled:text-slate-400">
                    <span className="material-symbols-outlined text-[16px]">upload_file</span>
                    {isImporting ? '解析中...' : '导入文件'}
                </button>
                <input ref={fileInputRef} type="file" accept=".csv,.json,.xlsx,.xls" onChange={handleFileSelect} className="hidden" />
            </div>

            <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-indigo-100">
                    <span className="text-[10px] text-slate-500">季节模型：{getProjectTypeLabel(projectBaseInfo.type)} · {projectBaseInfo.province || '未选择地区'}</span>
                    <label className="text-[10px] text-slate-500 flex items-center gap-2">空调季节修正
                        <select value={projectBaseInfo.hasAirConditioning === undefined ? 'auto' : String(projectBaseInfo.hasAirConditioning)}
                            onChange={event => setProjectBaseInfo(previous => ({
                                ...previous,
                                hasAirConditioning: event.target.value === 'auto' ? undefined : event.target.value === 'true',
                            }))}
                            className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700">
                            <option value="auto">按建筑类型自动判断</option>
                            <option value="true">有空调</option>
                            <option value="false">无空调</option>
                        </select>
                    </label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <label className="text-[10px] font-medium text-slate-500">账单月份
                        <input type="month" value={draft.month} onChange={event => setDraftValue('month', event.target.value)}
                            className="mt-1 w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700" />
                    </label>
                    <label className="text-[10px] font-medium text-slate-500">计费方式
                        <select value={draft.billingMode} onChange={event => setDraftValue('billingMode', event.target.value)}
                            className="mt-1 w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700">
                            <option value="tou">尖峰平谷分时电价</option>
                            <option value="fixed">不分时（单一电价）</option>
                        </select>
                    </label>
                    {((draft.billingMode === 'tou' ? [
                        ['sharpPeakKwh', '尖峰电量'], ['peakKwh', '峰电量'], ['flatKwh', '平电量'], ['valleyKwh', '谷电量'],
                    ] : [
                        ['totalKwh', '正向有功总'], ['fixedUnitPrice', '单一电价'],
                    ]) as Array<[keyof BillDraft, string]>).map(([field, label]) => (
                        <label key={field} className="text-[10px] font-medium text-slate-500">{label}（{field === 'fixedUnitPrice' ? '元/kWh，选填' : 'kWh'}）
                            <input type="number" min="0" value={draft[field]} onChange={event => setDraftValue(field, event.target.value)} placeholder="0"
                                className="mt-1 w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700" />
                        </label>
                    ))}
                    {draft.billingMode === 'tou' && ([
                        ['sharpPeakPrice', '尖峰电价'], ['peakPrice', '峰电价'],
                        ['flatPrice', '平电价'], ['valleyPrice', '谷电价'],
                    ] as Array<[keyof BillDraft, string]>).map(([field, label]) => (
                        <label key={field} className="text-[10px] font-medium text-slate-500">{label}（元/kWh，选填）
                            <input type="number" min="0" step="0.0001" value={draft[field]} onChange={event => setDraftValue(field, event.target.value)}
                                placeholder="留空使用电价配置"
                                className="mt-1 w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700" />
                        </label>
                    ))}
                    <label className="text-[10px] font-medium text-slate-500">正向无功总（kvarh，选填）
                        <input type="number" min="0" value={draft.reactiveKvarh} onChange={event => setDraftValue('reactiveKvarh', event.target.value)} placeholder="0"
                            className="mt-1 w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700" />
                    </label>
                    <label className="text-[10px] font-medium text-slate-500">总电费（元）
                        <input type="number" min="0" value={draft.cost} onChange={event => setDraftValue('cost', event.target.value)}
                            placeholder={draft.billingMode === 'fixed' ? '留空则按电量×单价计算' : '0'}
                            className="mt-1 w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700" />
                    </label>
                </div>
                <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] text-slate-500">{draft.billingMode === 'tou' ? '正向有功总自动汇总；分时电价将用于EMC每月折扣售电价，留空则采用项目电价配置' : `${projectBaseInfo.type === 'office' || projectBaseInfo.type === 'commercial' ? '商办电费单默认不拆分尖峰平谷；' : ''}总电费留空时按有功电量×单一电价计算`}</span>
                    <button onClick={handleAddBill} className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover">保存本月账单</button>
                </div>
            </div>

            {(error || importFileName) && (
                <div className={`px-3 py-2 rounded-lg text-xs ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {error || `已导入 ${importFileName}`}
                </div>
            )}

            {hasActualData && (
                <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-lg bg-slate-50"><p className="text-[10px] text-slate-400">真实月份</p><p className="text-sm font-bold text-slate-700">{estimation.actualMonthCount}个月</p></div>
                    <div className="p-2.5 rounded-lg bg-amber-50"><p className="text-[10px] text-amber-600">估算月份</p><p className="text-sm font-bold text-amber-700">{estimation.estimatedMonthCount}个月</p></div>
                    <div className="p-2.5 rounded-lg bg-emerald-50"><p className="text-[10px] text-emerald-600">估算年用电</p><p className="text-sm font-bold text-emerald-700">{estimatedAnnualWanKwh.toFixed(1)}万kWh</p></div>
                </div>
            )}

            <div className="border border-slate-200 rounded-xl overflow-auto shadow-sm max-h-[360px]">
                <table className="w-full min-w-[860px] text-left">
                    <thead className="bg-slate-50 text-[10px] text-slate-500 font-semibold sticky top-0 z-10">
                        <tr><th className="px-3 py-2">月份/数据</th><th className="px-3 py-2">尖峰</th><th className="px-3 py-2">峰</th><th className="px-3 py-2">平</th><th className="px-3 py-2">谷</th><th className="px-3 py-2">正向有功总</th><th className="px-3 py-2">正向无功总</th><th className="px-3 py-2">功率因数</th><th className="px-3 py-2">总电费</th><th className="px-2 py-2" /></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                        {!hasActualData ? (
                            <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">录入任意月份的分时或不分时账单后，将自动生成全年用电估算</td></tr>
                        ) : estimation.months.map(row => (
                            <tr key={row.month} className={row.source === 'estimated' ? 'bg-amber-50/35 text-slate-500' : 'bg-white text-slate-700'}>
                                <td className="px-3 py-2 font-medium whitespace-nowrap">{row.month}月 <span className={`ml-1 px-1.5 py-0.5 rounded ${row.source === 'actual' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{row.source === 'actual' ? '真实' : '估算'}</span><span className="ml-1 text-[9px] text-slate-400">{row.billingMode === 'fixed' ? '不分时' : '分时价'}</span></td>
                                <td className="px-3 py-2">{row.billingMode === 'fixed' ? '—' : formatKwh(row.sharpPeakKwh)}</td><td className="px-3 py-2">{row.billingMode === 'fixed' ? '—' : formatKwh(row.peakKwh)}</td><td className="px-3 py-2">{row.billingMode === 'fixed' ? '—' : formatKwh(row.flatKwh)}</td><td className="px-3 py-2">{row.billingMode === 'fixed' ? '—' : formatKwh(row.valleyKwh)}</td>
                                <td className="px-3 py-2 font-semibold">{formatKwh(row.kwh)}</td>
                                <td className="px-3 py-2">{row.reactiveKvarh > 0 ? formatKwh(row.reactiveKvarh) : '—'}</td>
                                <td className={`px-3 py-2 font-semibold ${row.powerFactor !== undefined && row.powerFactor < 0.9 ? 'text-red-600' : 'text-slate-600'}`}>{row.powerFactor !== undefined ? row.powerFactor.toFixed(3) : '—'}</td>
                                <td className="px-3 py-2">{row.source === 'actual' ? `¥${formatKwh(actualBills.find(bill => parseBillMonth(bill.month) === row.month)?.cost || 0)}` : (averagePrice > 0 ? `约¥${formatKwh(row.kwh * averagePrice)}` : '—')}</td>
                                <td className="px-2 py-2">{row.source === 'actual' && <button onClick={() => handleDeleteBill(row.month)} title="删除真实账单" className="text-slate-300 hover:text-red-500"><span className="material-symbols-outlined text-[16px]">delete</span></button>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {hasActualData && <p className="text-[10px] text-slate-400 leading-relaxed">估算依据：{projectBaseInfo.type === 'restaurant' ? '饭店酒楼全年营业及夏季制冷负荷' : projectBaseInfo.type === 'school' ? '学校教学日、寒暑假及空调负荷' : projectBaseInfo.type === 'office' ? '办公工作日及夏季空调负荷' : projectBaseInfo.type === 'villa' ? '别墅早晚居家双峰、日间基础负荷及夏季空调负荷' : '工业生产基荷及季节性空调负荷'}。正向有功用于光伏、储能测算；正向无功仅用于功率因数分析，两者不会相加。真实月份优先，黄色月份仅用于方案测算。</p>}
        </div>
    );
};
