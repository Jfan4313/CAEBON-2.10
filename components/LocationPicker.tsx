import React, { useState, useCallback } from 'react';
import { Map, Marker } from 'pigeon-maps';

interface LocationPickerProps {
    latitude?: number;
    longitude?: number;
    address?: string;
    onLocationChange: (lat: number, lon: number, address: string) => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
    latitude = 39.9042, // 默认北京
    longitude = 116.4074,
    address = '',
    onLocationChange
}) => {
    const [mapCenter, setMapCenter] = useState<[number, number]>([latitude, longitude]);
    const [markerPosition, setMarkerPosition] = useState<[number, number]>([latitude, longitude]);
    const [zoom, setZoom] = useState(12);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');

    // 地图点击事件
    const handleMapClick = useCallback(({ latLng }: { latLng: [number, number] }) => {
        const [lat, lng] = latLng;
        setMarkerPosition([lat, lng]);
        onLocationChange(lat, lng, address || `位置: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }, [address, onLocationChange]);

    // 地址搜索 (使用 Nominatim API)
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setSearchError('');

        try {
            // 使用 Nominatim API 搜索地址
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
                {
                    headers: {
                        'User-Agent': 'ZeroCarbon-Valuation-App/1.0' // Nominatim 要求
                    }
                }
            );

            if (!response.ok) {
                throw new Error('搜索失败');
            }

            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lon = parseFloat(result.lon);
                const displayName = result.display_name;

                setMarkerPosition([lat, lon]);
                setMapCenter([lat, lon]);
                setZoom(14);

                onLocationChange(lat, lon, displayName);
            } else {
                setSearchError('未找到该地址，请尝试其他关键词');
            }
        } catch (err) {
            setSearchError('搜索失败，请稍后重试');
            console.error('Geocoding error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="space-y-3">
            {/* 地址搜索栏 */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="搜索地址 (如: 上海市浦东新区)"
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
                <button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                    {isSearching ? (
                        <>
                            <span className="material-icons text-[16px] animate-spin">autorenew</span>
                            搜索中
                        </>
                    ) : (
                        <>
                            <span className="material-icons text-[16px]">search</span>
                            搜索
                        </>
                    )}
                </button>
            </div>

            {searchError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                    <span className="material-icons text-[12px]">error_outline</span>
                    {searchError}
                </p>
            )}

            {/* 地图容器 */}
            <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: '300px' }}>
                <Map
                    center={mapCenter}
                    zoom={zoom}
                    onBoundsChanged={({ center, zoom }) => {
                        setMapCenter(center as [number, number]);
                        setZoom(zoom);
                    }}
                    onClick={handleMapClick}
                    provider={(x, y, z) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`}
                    attribution={false}
                    boxClassname="w-full h-full"
                >
                    <Marker
                        width={40}
                        height={40}
                        anchor={markerPosition}
                    >
                        <span className="material-icons text-red-500 text-[32px]" style={{ transform: 'translate(-50%, -100%)' }}>
                            location_on
                        </span>
                    </Marker>
                </Map>

                {/* 地图提示 */}
                <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] text-slate-500 shadow">
                    点击地图选择位置
                </div>
            </div>

            {/* 已选位置信息 */}
            <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">已选坐标</span>
                    <span className="text-xs font-mono font-medium text-slate-700">
                        {markerPosition[0].toFixed(4)}, {markerPosition[1].toFixed(4)}
                    </span>
                </div>
                {address && (
                    <div className="flex items-start gap-1.5">
                        <span className="material-icons text-[12px] text-slate-400 mt-0.5">place</span>
                        <span className="text-xs text-slate-600 flex-1 break-words">{address}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
