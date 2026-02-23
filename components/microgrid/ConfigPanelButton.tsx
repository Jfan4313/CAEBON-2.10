import React from 'react';

interface ConfigPanelButtonProps {
    onClick: () => void;
    hasUnsavedChanges: boolean;
}

/**
 * 配置面板浮动按钮
 * 显示在右上角，点击可打开/关闭配置面板
 * 有未保存更改时显示红色圆点提示
 */
const ConfigPanelButton: React.FC<ConfigPanelButtonProps> = ({ onClick, hasUnsavedChanges }) => {
    return (
        <button
            onClick={onClick}
            className="fixed top-4 right-20 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-slate-200 p-2 hover:bg-slate-50 transition-all relative group"
            title="打开图片配置面板"
        >
            <span className="material-icons text-xl text-slate-600">settings</span>
            <span className="material-icons text-xl text-slate-600">tune</span>
            {hasUnsavedChanges && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="w-2 h-2 bg-red-500 rounded-full flex items-center justify-center text-white">
                        <span className="material-icons text-sm">priority_high</span>
                    </span>
                </span>
            )}
        </button>
    );
};

export default ConfigPanelButton;
