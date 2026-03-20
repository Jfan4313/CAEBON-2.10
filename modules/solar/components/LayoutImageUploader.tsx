import React, { useRef, useState } from 'react';

interface LayoutImageUploaderProps {
    currentImage?: string;
    onImageChange: (imageData: string | undefined) => void;
    canUseSameLayout?: boolean;
    usingSameLayout?: boolean;
    onToggleSameLayout?: (useSame: boolean) => void;
    disabled?: boolean;
}

export const LayoutImageUploader: React.FC<LayoutImageUploaderProps> = ({
    currentImage,
    onImageChange,
    canUseSameLayout = false,
    usingSameLayout = false,
    onToggleSameLayout,
    disabled = false
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentImage);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = (file: File | null) => {
        if (!file) return;

        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }

        // 验证文件大小（限制为 5MB）
        if (file.size > 5 * 1024 * 1024) {
            alert('图片大小不能超过 5MB');
            return;
        }

        // 读取文件并转换为 Base64
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            setPreviewUrl(result);
            onImageChange(result);
        };
        reader.readAsDataURL(file);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        handleFileSelect(file);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0] || null;
        handleFileSelect(file);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleRemove = () => {
        setPreviewUrl(undefined);
        onImageChange(undefined);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClick = () => {
        if (!disabled && !usingSameLayout) {
            fileInputRef.current?.click();
        }
    };

    if (usingSameLayout) {
        return (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                <span className="material-icons text-lg">check_circle</span>
                <span>使用与方案一相同的铺设图</span>
                {onToggleSameLayout && (
                    <button
                        onClick={() => onToggleSameLayout(false)}
                        className="ml-auto text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                        修改
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="hidden"
                disabled={disabled}
            />

            {canUseSameLayout && onToggleSameLayout && (
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={usingSameLayout}
                        onChange={(e) => onToggleSameLayout(e.target.checked)}
                        className="rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <span>使用与方案一相同的铺设图</span>
                </label>
            )}

            {previewUrl ? (
                <div className="relative group">
                    <div className="border-2 border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        <img
                            src={previewUrl}
                            alt="铺设图预览"
                            className="w-full h-auto max-h-64 object-contain"
                        />
                    </div>
                    {!disabled && (
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={handleClick}
                                className="px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                            >
                                更换图片
                            </button>
                            <button
                                onClick={handleRemove}
                                className="px-3 py-1.5 bg-red-500 rounded-lg text-sm font-medium text-white hover:bg-red-600"
                            >
                                删除
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div
                    onClick={handleClick}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`
                        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                        ${isDragging ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary'}
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    <span className="material-icons text-4xl text-slate-400 mb-2">add_photo_alternate</span>
                    <p className="text-sm text-slate-600 font-medium">
                        {disabled ? '暂无铺设图' : '点击或拖拽上传铺设图'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">支持 JPG、PNG 格式，最大 5MB</p>
                </div>
            )}
        </div>
    );
};
