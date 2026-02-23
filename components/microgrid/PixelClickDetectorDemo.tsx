import React from 'react';
import PixelClickDetector from './pixelClickDetector';

/**
 * 像素级点击检测使用示例
 *
 * 演示如何使用 PixelClickDetector 解决全尺寸透明图层点击问题
 */
const PixelClickDetectorDemo: React.FC = () => {
    const [clickLog, setClickLog] = useState<string[]>([]);

    const handleDeviceClick = (x: number, y: number, deviceName: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setClickLog(prev => [`[${timestamp}] ${deviceName}: 点击坐标 (${x}, ${y})`, ...prev]);
    };

    const clearLog = () => {
        setClickLog([]);
    };

    return (
        <div className="p-6 bg-slate-50 rounded-lg">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">
                像素级点击检测 Demo
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* 说明区域 */}
                <div className="md:col-span-2 bg-white rounded-lg p-6 shadow-md">
                    <h2 className="text-lg font-bold text-slate-700 mb-4">问题说明</h2>
                    <p className="text-sm text-slate-600 mb-4">
                        当图片全尺寸覆盖时，透明的区域会"挡住"下层元素的点击事件。
                        这是因为鼠标事件首先捕获在顶层透明的元素上。
                    </p>
                    <div className="bg-amber-50 rounded-lg p-4 mb-4">
                        <h3 className="text-sm font-bold text-amber-800 mb-2">解决方案：像素级检测</h3>
                        <p className="text-xs text-amber-900 mb-2">
                            检测点击位置像素的 Alpha 通道值
                            如果 Alpha = 0（完全透明），则让事件穿透到下层
                            如果 Alpha &gt; 0（不透明），则在当前层处理点击
                        </p>
                    </div>
                </div>

                {/* 使用示例 */}
                <div className="md:col-span-2 bg-white rounded-lg p-6 shadow-md">
                    <h2 className="text-lg font-bold text-slate-700 mb-4">使用方法</h2>
                    <pre className="text-xs bg-slate-800 p-4 rounded overflow-x-auto">
{`import React from 'react';
import PixelClickDetector from './pixelClickDetector';

const MyComponent = () => {
    return (
        <PixelClickDetector
            onClick={(x, y) => {
                console.log(\`点击坐标: (\${x}, \${y})\`);
                // 处理你的点击逻辑
            }}
        >
            <img
                src="/microgrid/储能.png"
                alt="储能系统"
                className="w-full h-auto"
            />
        </PixelClickDetector>
    );
};

export default MyComponent;`}
                    </pre>
                </div>

                {/* 实际演示 */}
                <div className="bg-slate-100 rounded-lg p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">实际演示</h2>

                    {/* 场景底图 - 应该始终可点击 */}
                    <div className="mb-6 border-2 border-dashed border-slate-300 rounded-lg p-4">
                        <h3 className="text-sm font-bold text-slate-700 mb-3">场景底图（始终可见）</h3>
                        <PixelClickDetector
                            onClick={handleDeviceClick}
                        >
                            <img
                                src="/microgrid/基础底图_0005_Gemini_Generated_Image_1w1c5g1w1c5g1w1c.png"
                                alt="场景底图"
                                className="w-full h-[200px] object-contain"
                            />
                        </PixelClickDetector>
                        <p className="text-xs text-slate-500 mt-2">
                            场景底图应该始终能点击，因为它在底层
                        </p>
                    </div>

                    {/* 设备图片 - 透明区域不应拦截点击 */}
                    <div className="mb-6 border-2 border-dashed border-slate-300 rounded-lg p-4">
                        <h3 className="text-sm font-bold text-slate-700 mb-3">小组件（透明区域检测）</h3>
                        <PixelClickDetector
                            onClick={(x, y) => handleDeviceClick(x, y, '小组件')}
                        >
                            <img
                                src="/microgrid/基础底图_0000s_0001_储能.png"
                                alt="储能系统"
                                className="w-full h-[150px] object-contain"
                            />
                        </PixelClickDetector>
                        <p className="text-xs text-slate-500 mt-2">
                            当点击到透明区域时，检测 Alpha 值
                            如果完全透明则穿透，否则处理点击
                        </p>
                    </div>

                    {/* 点击日志 */}
                    <div className="bg-slate-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-white">点击日志</h3>
                            <button
                                onClick={clearLog}
                                className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors"
                            >
                                清空日志
                            </button>
                        </div>
                        <div className="max-h-40 overflow-y-auto text-xs font-mono text-slate-300 space-y-1">
                            {clickLog.length === 0 && (
                                <p className="text-slate-500">暂无点击记录...</p>
                            )}
                            {clickLog.map((log, index) => (
                                <p key={index} className="border-l border-slate-700 px-2 py-1 rounded">
                                    {log}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PixelClickDetectorDemo;
