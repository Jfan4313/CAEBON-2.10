import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useProject, Bill } from '../../context/ProjectContext';

export const BillImport: React.FC = () => {
    const { bills, setBills } = useProject();
    const [isImporting, setIsImporting] = useState(false);
    const [importFileName, setImportFileName] = useState('');
    const [showImportError, setShowImportError] = useState(false);
    const [importErrorMsg, setImportErrorMsg] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validBills = useMemo(() => {
        return bills.filter(bill =>
            bill.id !== undefined &&
            bill.month !== undefined &&
            !isNaN(bill.kwh) &&
            !isNaN(bill.cost)
        );
    }, [bills]);

    const handleSmartImportBills = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleClearImport = useCallback(() => {
        setBills([]);
        setImportFileName('');
        setShowImportError(false);
    }, [setBills]);

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
                const lines = text.split('\n').filter(line => line.trim());
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
                const arrayBuffer = await file.arrayBuffer();
                try {
                    const XLSX = await import('xlsx');
                    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

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

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
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
                    <span className="text-green-700">已导入: {importFileName} ({validBills.length} 条记录)</span>
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
                        {validBills.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                                    可手动填写或上传 CSV/JSON/Excel 文件导入电费数据
                                    <div className="text-[10px] mt-1 text-slate-300">
                                        支持 CSV: 月份,用电量(kWh),电费(元) | JSON: 数组格式
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            validBills.map((bill) => (
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
    );
};
