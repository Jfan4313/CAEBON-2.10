import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useProject, Transformer } from '../context/ProjectContext';
import { Building, EquipmentItem } from './project-entry/types';
import { BuildingList } from './project-entry/BuildingList';
import { SystemConfigTable } from './project-entry/SystemConfigTable';
import { BillImport } from './project-entry/BillImport';
// --- 省份城市数据 ---
const PROVINCE_CITIES: Record<string, string[]> = {
    // 直辖市
    'Beijing': ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区', '通州区', '顺义区', '昌平区', '大兴区'],
    'Shanghai': ['浦东新区', '闵行区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '黄浦区', '宝山区', '嘉定区', '松江区', '青浦区', '奉贤区', '金山区'],
    'Tianjin': ['和平区', '河东区', '河西区', '南开区', '河北区', '红桥区', '东丽区', '西青区', '津南区', '北辰区', '武清区', '滨海新区'],
    'Chongqing': ['渝中区', '江北区', '南岸区', '九龙坡区', '沙坪坝区', '大渡口区', '渝北区', '巴南区', '北碚区', '万州区', '涪陵区'],

    // 华东地区
    'Jiangsu': ['南京市', '苏州市', '无锡市', '常州市', '南通市', '扬州市', '徐州市', '盐城市', '镇江市', '泰州市', '淮安市', '连云港市', '宿迁市'],
    'Zhejiang': ['杭州市', '宁波市', '温州市', '嘉兴市', '湖州市', '绍兴市', '金华市', '衢州市', '舟山市', '台州市', '丽水市'],
    'Shandong': ['济南市', '青岛市', '烟台市', '潍坊市', '临沂市', '淄博市', '济宁市', '泰安市', '威海市', '德州市', '东营市', '日照市', '枣庄市', '莱芜市', '聊城市', '滨州市', '菏泽市'],
    'Anhui': ['合肥市', '芜湖市', '蚌埠市', '淮南市', '马鞍山市', '淮北市', '铜陵市', '安庆市', '黄山市', '滁州市', '阜阳市', '宿州市', '六安市', '亳州市', '池州市', '宣城市'],
    'Fujian': ['福州市', '厦门市', '泉州市', '漳州市', '莆田市', '三明市', '南平市', '龙岩市', '宁德市'],
    'Jiangxi': ['南昌市', '赣州市', '宜春市', '吉安市', '上饶市', '抚州市', '九江市', '景德镇市', '萍乡市', '新余市', '鹰潭市'],

    // 华南地区
    'Guangdong': ['广州市', '深圳市', '佛山市', '东莞市', '珠海市', '中山市', '惠州市', '江门市', '汕头市', '湛江市', '茂名市', '肇庆市', '梅州市', '清远市', '阳江市', '韶关市', '河源市', '云浮市', '汕尾市', '潮州市', '揭阳市'],
    'Guangxi': ['南宁市', '柳州市', '桂林市', '梧州市', '北海市', '防城港市', '钦州市', '贵港市', '玉林市', '百色市', '贺州市', '河池市', '来宾市', '崇左市'],
    'Hainan': ['海口市', '三亚市', '三沙市', '儋州市', '五指山市', '琼海市', '文昌市', '万宁市', '东方市'],

    // 华中地区
    'Henan': ['郑州市', '洛阳市', '开封市', '南阳市', '许昌市', '平顶山市', '安阳市', '鹤壁市', '新乡市', '焦作市', '濮阳市', '漯河市', '三门峡市', '商丘市', '周口市', '驻马店市', '信阳市'],
    'Hubei': ['武汉市', '宜昌市', '襄阳市', '荆州市', '十堰市', '黄石市', '孝感市', '荆门市', '鄂州市', '黄冈市', '咸宁市', '随州市', '恩施州'],
    'Hunan': ['长沙市', '株洲市', '湘潭市', '衡阳市', '邵阳市', '岳阳市', '常德市', '张家界市', '益阳市', '郴州市', '永州市', '怀化市', '娄底市', '湘西州'],

    // 华北地区
    'Hebei': ['石家庄市', '唐山市', '秦皇岛市', '邯郸市', '邢台市', '保定市', '张家口市', '承德市', '沧州市', '廊坊市', '衡水市'],
    'Shanxi': ['太原市', '大同市', '阳泉市', '长治市', '晋城市', '朔州市', '晋中市', '运城市', '忻州市', '临汾市', '吕梁市'],
    'Neimenggu': ['呼和浩特市', '包头市', '乌海市', '赤峰市', '通辽市', '鄂尔多斯市', '呼伦贝尔市', '巴彦淖尔市', '乌兰察布市', '兴安盟', '锡林郭勒盟', '阿拉善盟'],

    // 东北地区
    'Liaoning': ['沈阳市', '大连市', '鞍山市', '抚顺市', '本溪市', '丹东市', '锦州市', '营口市', '阜新市', '辽阳市', '盘锦市', '铁岭市', '朝阳市', '葫芦岛市'],
    'Jilin': ['长春市', '吉林市', '四平市', '辽源市', '通化市', '白山市', '松原市', '白城市', '延边州'],
    'Heilongjiang': ['哈尔滨市', '齐齐哈尔市', '鸡西市', '鹤岗市', '双鸭山市', '大庆市', '伊春市', '佳木斯市', '七台河市', '牡丹江市', '黑河市', '绥化市', '大兴安岭地区'],

    // 西北地区
    'Shaanxi': ['西安市', '铜川市', '宝鸡市', '咸阳市', '渭南市', '延安市', '汉中市', '榆林市', '安康市', '商洛市'],
    'Gansu': ['兰州市', '嘉峪关市', '金昌市', '白银市', '天水市', '武威市', '张掖市', '平凉市', '酒泉市', '庆阳市', '定西市', '陇南市', '临夏州', '甘南州'],
    'Qinghai': ['西宁市', '海东市', '海北州', '黄南州', '海南州', '果洛州', '玉树州', '海西州'],
    'Ningxia': ['银川市', '石嘴山市', '吴忠市', '固原市', '中卫市'],
    'Xinjiang': ['乌鲁木齐市', '克拉玛依市', '吐鲁番市', '哈密市', '昌吉州', '博尔塔拉州', '巴音郭楞州', '阿克苏地区', '克孜勒苏州', '喀什地区', '和田地区', '伊犁州', '塔城地区', '阿勒泰地区'],

    // 西南地区
    'Sichuan': ['成都市', '绵阳市', '自贡市', '攀枝花市', '泸州市', '德阳市', '广元市', '遂宁市', '内江市', '乐山市', '南充市', '眉山市', '宜宾市', '广安市', '达州市', '雅安市', '巴中市', '资阳市', '阿坝州', '甘孜州', '凉山州'],
    'Guizhou': ['贵阳市', '六盘水市', '遵义市', '安顺市', '毕节市', '铜仁市', '黔西南州', '黔东南州', '黔南州'],
    'Yunnan': ['昆明市', '曲靖市', '玉溪市', '保山市', '昭通市', '丽江市', '普洱市', '临沧市', '楚雄州', '红河州', '文山州', '西双版纳州', '大理州', '德宏州', '怒江州', '迪庆州'],
    'Xizang': ['拉萨市', '日喀则市', '昌都市', '林芝市', '山南市', '那曲市', '阿里地区']
};

const PROVINCE_NAMES: Record<string, string> = {
    // 直辖市
    'Beijing': '北京市',
    'Shanghai': '上海市',
    'Tianjin': '天津市',
    'Chongqing': '重庆市',
    // 华东地区
    'Jiangsu': '江苏省',
    'Zhejiang': '浙江省',
    'Shandong': '山东省',
    'Anhui': '安徽省',
    'Fujian': '福建省',
    'Jiangxi': '江西省',
    // 华南地区
    'Guangdong': '广东省',
    'Guangxi': '广西壮族自治区',
    'Hainan': '海南省',
    // 华中地区
    'Henan': '河南省',
    'Hubei': '湖北省',
    'Hunan': '湖南省',
    // 华北地区
    'Hebei': '河北省',
    'Shanxi': '山西省',
    'Neimenggu': '内蒙古自治区',
    // 东北地区
    'Liaoning': '辽宁省',
    'Jilin': '吉林省',
    'Heilongjiang': '黑龙江省',
    // 西北地区
    'Shaanxi': '陕西省',
    'Gansu': '甘肃省',
    'Qinghai': '青海省',
    'Ningxia': '宁夏回族自治区',
    'Xinjiang': '新疆维吾尔自治区',
    // 西南地区
    'Sichuan': '四川省',
    'Guizhou': '贵州省',
    'Yunnan': '云南省',
    'Xizang': '西藏自治区'
};

// 省份到地区的映射（用于学校类型判断寒暑假天数）
const PROVINCE_REGION: Record<string, 'south' | 'central' | 'north'> = {
    // 南方地区（寒暑假较短）
    'Shanghai': 'south',
    'Zhejiang': 'south',
    'Fujian': 'south',
    'Jiangxi': 'south',
    'Guangdong': 'south',
    'Guangxi': 'south',
    'Hainan': 'south',
    'Chongqing': 'south',
    'Sichuan': 'south',
    'Guizhou': 'south',
    'Yunnan': 'south',
    'Hunan': 'south',
    // 中部地区
    'Jiangsu': 'central',
    'Anhui': 'central',
    'Hubei': 'central',
    'Henan': 'central',
    'Shaanxi': 'central',
    // 北方地区（寒假较长）
    'Beijing': 'north',
    'Tianjin': 'north',
    'Hebei': 'north',
    'Shanxi': 'north',
    'Neimenggu': 'north',
    'Liaoning': 'north',
    'Jilin': 'north',
    'Heilongjiang': 'north',
    'Shandong': 'north',
    'Gansu': 'north',
    'Qinghai': 'north',
    'Ningxia': 'north',
    'Xinjiang': 'north',
    'Xizang': 'north'
};

const defaultBuildings: Building[] = [
    {
        id: 1,
        name: '1号生产车间',
        type: '工厂 (Factory)',
        area: 12500,
        systems: {
            lighting: {
                enabled: true,
                mode: 'density',
                density: 12,
                items: [
                    { id: 1, name: '金卤灯 (High Bay)', power: 250, count: 200 },
                    { id: 2, name: 'T8 荧光灯管', power: 36, count: 500 }
                ]
            },
            hvac: {
                enabled: true,
                items: [
                    { id: 1, name: '1# 离心冷水机组', type: '水冷冷水机组 (Chiller)', health: '良 (5-10年)', cop: 5.2, power: 450, count: 2 },
                    { id: 2, name: '组合式空调箱 (AHU)', type: '风冷模块机组', health: '优 (1-5年)', power: 45, count: 8 }
                ]
            },
            water: {
                enabled: false,
                items: [
                    { id: 1, name: '燃气热水锅炉', type: 'Boiler', power: 200, count: 1 }
                ]
            },
            production: {
                enabled: true,
                items: [
                    { id: 1, name: 'SMT 贴片产线', power: 350, count: 4 },
                    { id: 2, name: '空压机组', power: 132, count: 3 }
                ]
            }
        }
    },
    {
        id: 2,
        name: '研发中心大楼',
        type: '办公楼 (Office)',
        area: 4800,
        systems: {
            lighting: {
                enabled: true,
                mode: 'density',
                density: 9,
                items: []
            },
            hvac: {
                enabled: true,
                items: [
                    { id: 1, name: 'VRV 多联机外机', type: '多联机 (VRF)', health: '优 (1-5年)', power: 25, count: 20 }
                ]
            },
            water: {
                enabled: true,
                items: [
                    { id: 1, name: '容积式电热水器', type: 'Heater', power: 15, count: 4 }
                ]
            },
            production: {
                enabled: false,
                items: []
            }
        }
    },
];

const ProjectEntry: React.FC = () => {
    const { transformers, setTransformers, saveProject, projectBaseInfo, setProjectBaseInfo } = useProject();

    // Region State (Hydrate from Context)
    const [projectName, setProjectName] = useState(projectBaseInfo.name);
    const [province, setProvince] = useState(projectBaseInfo.province);
    const [city, setCity] = useState(projectBaseInfo.city);
    const [projectType, setProjectType] = useState(projectBaseInfo.type);

    // Building State (Hydrate from Context)
    const [buildings, setBuildings] = useState<Building[]>(
        (projectBaseInfo.buildings && projectBaseInfo.buildings.length > 0)
            ? projectBaseInfo.buildings
            : defaultBuildings
    );

    const [targetBuildingId, setTargetBuildingId] = useState<number>(buildings.length > 0 ? buildings[0].id : 0);

    // Estimation Mode State
    const [estimationMode, setEstimationMode] = useState<'auto' | 'manual'>('manual');
    const [isScanning, setIsScanning] = useState(false);

    // System Config Tab State
    const [activeSystemTab, setActiveSystemTab] = useState<'lighting' | 'hvac' | 'water' | 'production'>('lighting');

    // Sync target building if buildings change
    useEffect(() => {
        if (buildings.length > 0 && !buildings.find(b => b.id === targetBuildingId)) {
            setTargetBuildingId(buildings[0].id);
        }
    }, [buildings, targetBuildingId]);

    // Sync to Global Context whenever local state changes
    useEffect(() => {
        setProjectBaseInfo({
            name: projectName,
            type: projectType,
            province,
            city,
            buildings
        });
    }, [projectName, projectType, province, city, buildings, setProjectBaseInfo]);

    // --- Handlers ---

    const handleAddBuilding = useCallback(() => {
        setBuildings(prev => {
            const newId = prev.length > 0 ? Math.max(...prev.map(b => b.id)) + 1 : 1;
            const newBuilding: Building = {
                id: newId,
                name: `新建建筑 ${newId}`,
                type: '未定义',
                area: 1000,
                systems: {
                    lighting: { enabled: true, mode: 'density', density: 10, items: [] },
                    hvac: { enabled: true, items: [] },
                    water: { enabled: false, items: [] },
                    production: { enabled: false, items: [] }
                }
            };
            return [...prev, newBuilding];
        });
    }, []);

    const handleDeleteBuilding = useCallback((id: number) => {
        setBuildings(prev => {
            const newBuildings = prev.filter(b => b.id !== id);
            if (targetBuildingId === id && newBuildings.length > 1) {
                setTargetBuildingId(newBuildings[0].id);
            }
            return newBuildings;
        });
    }, [targetBuildingId]);

    const handleBuildingChange = useCallback((id: number, field: string, value: string | number) => {
        setBuildings(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    }, []);

    // -- Deep Update Handlers --

    const toggleSystemEnabled = useCallback((buildingId: number, systemKey: keyof Building['systems']) => {
        setBuildings(prev => prev.map(b => {
            if (b.id !== buildingId) return b;
            return {
                ...b,
                systems: {
                    ...b.systems,
                    [systemKey]: {
                        ...b.systems[systemKey],
                        enabled: !b.systems[systemKey].enabled
                    }
                }
            };
        }));
    }, []);

    const updateLightingMode = useCallback((buildingId: number, mode: 'density' | 'list') => {
        setBuildings(prev => prev.map(b => {
            if (b.id !== buildingId) return b;
            return {
                ...b,
                systems: { ...b.systems, lighting: { ...b.systems.lighting, mode } }
            };
        }));
    }, []);

    const updateLightingDensity = useCallback((buildingId: number, density: number) => {
        setBuildings(prev => prev.map(b => {
            if (b.id !== buildingId) return b;
            return {
                ...b,
                systems: { ...b.systems, lighting: { ...b.systems.lighting, density } }
            };
        }));
    }, []);

    // Generic Item Handlers (Add/Remove/Update) for arrays
    const addSystemItem = useCallback((buildingId: number, systemKey: keyof Building['systems']) => {
        setBuildings(prev => prev.map(b => {
            if (b.id !== buildingId) return b;
            const currentItems = b.systems[systemKey].items;
            const newId = currentItems.length > 0 ? Math.max(...currentItems.map(i => i.id)) + 1 : 1;

            let newItem: EquipmentItem = {
                id: newId,
                name: '新设备',
                power: 10,
                count: 1
            };

            if (systemKey === 'hvac') {
                newItem = { ...newItem, type: '多联机 (VRF)', health: '优 (1-5年)', power: 25 };
            } else if (systemKey === 'lighting') {
                newItem = { ...newItem, power: 20 };
            } else {
                newItem = { ...newItem, type: 'Type A' };
            }

            return {
                ...b,
                systems: {
                    ...b.systems,
                    [systemKey]: {
                        ...b.systems[systemKey],
                        items: [...currentItems, newItem]
                    }
                }
            };
        }));
    }, []);

    const removeSystemItem = useCallback((buildingId: number, systemKey: keyof Building['systems'], itemId: number) => {
        setBuildings(prev => prev.map(b => {
            if (b.id !== buildingId) return b;
            return {
                ...b,
                systems: {
                    ...b.systems,
                    [systemKey]: {
                        ...b.systems[systemKey],
                        items: b.systems[systemKey].items.filter(i => i.id !== itemId)
                    }
                }
            };
        }));
    }, []);

    const updateSystemItem = useCallback((buildingId: number, systemKey: keyof Building['systems'], itemId: number, field: keyof EquipmentItem, value: any) => {
        setBuildings(prev => prev.map(b => {
            if (b.id !== buildingId) return b;
            return {
                ...b,
                systems: {
                    ...b.systems,
                    [systemKey]: {
                        ...b.systems[systemKey],
                        items: b.systems[systemKey].items.map(i => i.id === itemId ? { ...i, [field]: value } : i)
                    }
                }
            };
        }));
    }, []);


    const handleModeChange = useCallback((mode: 'auto' | 'manual') => {
        setEstimationMode(mode);
        if (mode === 'auto') {
            setIsScanning(true);
            setTimeout(() => setIsScanning(false), 2000);
        }
    }, []);

    const handleAddTransformer = useCallback(() => {
        const newId = transformers.length > 0 ? Math.max(...transformers.map(t => t.id)) + 1 : 1;
        setTransformers([...transformers, { id: newId, name: `#${newId} 变压器`, capacity: 1000, voltageLevel: '10kV' }]);
    }, [transformers, setTransformers]);

    const handleTransformerChange = useCallback((id: number, field: keyof Transformer, value: any) => {
        setTransformers(transformers.map(t => t.id === id ? { ...t, [field]: value } : t));
    }, [transformers, setTransformers]);

    const handleDeleteTransformer = useCallback((id: number) => {
        setTransformers(transformers.filter(t => t.id !== id));
    }, [transformers, setTransformers]);

    const systemsMenu = [
        { id: 'lighting', label: '照明系统', icon: 'lightbulb' },
        { id: 'hvac', label: '暖通空调', icon: 'ac_unit' },
        { id: 'water', label: '热水系统', icon: 'water_drop' },
        { id: 'production', label: '生产设备', icon: 'precision_manufacturing' }
    ];

    // Get current active building object
    const currentBuilding = buildings.find(b => b.id === targetBuildingId) || buildings[0];
    const currentSystemConfig = currentBuilding ? currentBuilding.systems[activeSystemTab] : null;

    // --- Calculations ---

    // Helper to calculate building load (KW) - Pure function
    const calculateBuildingLoad = useCallback((b: Building) => {
        let totalKW = 0;

        // 1. Lighting
        if (b.systems.lighting.enabled) {
            if (b.systems.lighting.mode === 'density') {
                totalKW += (b.systems.lighting.density * b.area) / 1000;
            } else {
                const listSumW = b.systems.lighting.items.reduce((acc, item) => acc + (item.power * item.count), 0);
                totalKW += listSumW / 1000; // Lighting items stored in Watts usually
            }
        }

        // 2. HVAC (stored in kW)
        if (b.systems.hvac.enabled) {
            totalKW += b.systems.hvac.items.reduce((acc, item) => acc + (item.power * item.count), 0);
        }

        // 3. Water (stored in kW)
        if (b.systems.water.enabled) {
            totalKW += b.systems.water.items.reduce((acc, item) => acc + (item.power * item.count), 0);
        }

        // 4. Production (stored in kW)
        if (b.systems.production.enabled) {
            totalKW += b.systems.production.items.reduce((acc, item) => acc + (item.power * item.count), 0);
        }

        return totalKW;
    }, []);

    // Aggregated Load Calculation across all buildings and enabled systems
    const totalLoadMW = useMemo(() => {
        let totalKW = 0;
        buildings.forEach(b => {
            totalKW += calculateBuildingLoad(b);
        });
        return (totalKW / 1000).toFixed(2); // Convert to MW
    }, [buildings, calculateBuildingLoad]);

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            <div className="flex-1 overflow-y-auto p-8 pb-32 scroll-smooth">
                <div className="max-w-6xl mx-auto space-y-6">
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
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm text-slate-700 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="请输入项目名称"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 ml-1">项目类型 <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <select
                                        value={projectType}
                                        onChange={(e) => {
                                            setProjectType(e.target.value);
                                            setActiveSystemTab('lighting'); // Reset tab on type change
                                        }}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm text-slate-700 appearance-none cursor-pointer focus:bg-white focus:border-primary"
                                    >
                                        <option value="factory">零碳工厂 (Factory)</option>
                                        <option value="school">零碳学校 (School)</option>
                                        <option value="office">零碳商办 (Office)</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400 pointer-events-none text-[20px]">expand_more</span>
                                </div>
                            </div>

                            {/* 学校类型详细选择（仅当选择学校时显示） */}
                            {projectType === 'school' && (
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                        <span className="material-icons text-blue-500">school</span>
                                        学校详细信息（用于消纳率预估）
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* 学校类型 */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-600">学校类型</label>
                                            <select
                                                value={projectBaseInfo.schoolType || 'university'}
                                                onChange={(e) => setProjectBaseInfo({ ...projectBaseInfo, schoolType: e.target.value as any })}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary"
                                            >
                                                <option value="primary_middle">小学 / 初中</option>
                                                <option value="high_school">高中</option>
                                                <option value="university">大学 / 学院</option>
                                                <option value="vocational">职业院校</option>
                                                <option value="training">培训机构</option>
                                            </select>
                                        </div>

                                        {/* 空调系统 */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-600">空调系统</label>
                                            <select
                                                value={projectBaseInfo.hasAirConditioning ? 'true' : 'false'}
                                                onChange={(e) => setProjectBaseInfo({ ...projectBaseInfo, hasAirConditioning: e.target.value === 'true' })}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary"
                                            >
                                                <option value="true">有空调系统</option>
                                                <option value="false">无空调系统</option>
                                            </select>
                                        </div>

                                        {/* 地区（影响寒暑假天数，根据省份自动判断） */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-600">地区（根据省份自动判断）</label>
                                            <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-600">
                                                {PROVINCE_REGION[province] === 'south' && '南方地区（寒暑假较短）'}
                                                {PROVINCE_REGION[province] === 'central' && '中部地区'}
                                                {PROVINCE_REGION[province] === 'north' && '北方地区（寒假较长）'}
                                                {!province && '请先选择省份'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 说明文字 */}
                                    <div className="mt-3 p-3 bg-white/60 rounded-lg">
                                        <p className="text-xs text-slate-600 flex items-start gap-2">
                                            <span className="material-icons text-blue-500 text-base">info</span>
                                            <span>学校类型和空调配置将用于自动估算光伏消纳率。不同学校类型在用电时段、寒暑假天数上存在差异，影响自发自用比例。</span>
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 ml-1">所在地区 <span className="text-red-500">*</span></label>
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <select
                                            value={province}
                                            onChange={(e) => { setProvince(e.target.value); setCity(''); }}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm text-slate-700 appearance-none cursor-pointer focus:bg-white focus:border-primary"
                                        >
                                            <option value="" disabled>选择省份</option>
                                            {Object.entries(PROVINCE_NAMES).map(([code, name]) => (
                                                <option key={code} value={code}>{name}</option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400 pointer-events-none text-[20px]">expand_more</span>
                                    </div>
                                    <div className="relative flex-1">
                                        <select
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm text-slate-700 appearance-none cursor-pointer focus:bg-white focus:border-primary"
                                        >
                                            <option value="" disabled>选择城市/区</option>
                                            {province && PROVINCE_CITIES[province]?.map((cityName) => (
                                                <option key={cityName} value={cityName}>{cityName}</option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400 pointer-events-none text-[20px]">expand_more</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Collapsible Advanced Parameters */}
                        <details className="mt-8 group border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                            <summary className="cursor-pointer px-6 py-4 bg-slate-50 flex items-center justify-between outline-none">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                        <span className="material-symbols-outlined text-[18px]">tune</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-800">高级配置 / 进阶测算假设</h4>
                                        <p className="text-[10px] text-slate-500">包含运维费率、税率、SPV 带有杠杆的财务与股权核算配置</p>
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
                            </summary>

                            <div className="p-6 border-t border-slate-100 animate-fade-in bg-white space-y-8">
                                {/* Global Financial Parameters */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 ml-1 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px] text-orange-500">build_circle</span>
                                            全局运维费率 (O&M Rate)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={projectBaseInfo.omRate ?? 1.5}
                                                onChange={(e) => setProjectBaseInfo({ ...projectBaseInfo, omRate: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700 focus:bg-white focus:border-primary transition-all"
                                                placeholder="1.5"
                                            />
                                            <span className="absolute right-4 top-3 text-sm text-slate-400 font-medium">%</span>
                                            <p className="text-[10px] text-slate-400 mt-1 absolute -bottom-5 left-1">占初始投资(CAPEX)的百分比，每年扣除</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 ml-1 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px] text-green-500">account_balance</span>
                                            企业所得税率 (Tax Rate)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={projectBaseInfo.taxRate ?? 25.0}
                                                onChange={(e) => setProjectBaseInfo({ ...projectBaseInfo, taxRate: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700 focus:bg-white focus:border-primary transition-all"
                                                placeholder="25.0"
                                            />
                                            <span className="absolute right-4 top-3 text-sm text-slate-400 font-medium">%</span>
                                            <p className="text-[10px] text-slate-400 mt-1 absolute -bottom-5 left-1">高新企业可选15%，一般企业25%</p>
                                        </div>
                                    </div>
                                </div>

                                {/* SPV Financial & Equity Structuring */}
                                <div className="mt-8 pt-6 border-t border-slate-100">
                                    <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px] text-indigo-500">pie_chart</span>
                                        SPV 财务核算与股权架构配置
                                    </h4>
                                    <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {/* Leverage (Debt Ratio) */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-600">外部贷款比例 (Leverage)</label>
                                            <div className="relative">
                                                <input
                                                    type="number" step="1"
                                                    value={projectBaseInfo.spvConfig?.debtRatio ?? 70}
                                                    onChange={(e) => setProjectBaseInfo({
                                                        ...projectBaseInfo,
                                                        spvConfig: { ...(projectBaseInfo.spvConfig || { loanInterest: 4.5, loanTerm: 10, shareholderARate: 51 }), debtRatio: parseFloat(e.target.value) || 0 }
                                                    })}
                                                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm text-slate-700 focus:border-indigo-400 outline-none"
                                                />
                                                <span className="absolute right-3 top-2 text-xs text-slate-400">%</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400">剩余部分为项目资本金(Equity)</p>
                                        </div>

                                        {/* Loan Interest Rate */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-600">贷款年利率</label>
                                            <div className="relative">
                                                <input
                                                    type="number" step="0.1"
                                                    value={projectBaseInfo.spvConfig?.loanInterest ?? 4.5}
                                                    onChange={(e) => setProjectBaseInfo({
                                                        ...projectBaseInfo,
                                                        spvConfig: { ...(projectBaseInfo.spvConfig || { debtRatio: 70, loanTerm: 10, shareholderARate: 51 }), loanInterest: parseFloat(e.target.value) || 0 }
                                                    })}
                                                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm text-slate-700 focus:border-indigo-400 outline-none"
                                                />
                                                <span className="absolute right-3 top-2 text-xs text-slate-400">%</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400">主要影响当期利息支出摊销</p>
                                        </div>

                                        {/* Loan Term */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-600">贷款期限</label>
                                            <div className="relative">
                                                <input
                                                    type="number" step="1"
                                                    value={projectBaseInfo.spvConfig?.loanTerm ?? 10}
                                                    onChange={(e) => setProjectBaseInfo({
                                                        ...projectBaseInfo,
                                                        spvConfig: { ...(projectBaseInfo.spvConfig || { debtRatio: 70, loanInterest: 4.5, shareholderARate: 51 }), loanTerm: parseInt(e.target.value) || 0 }
                                                    })}
                                                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm text-slate-700 focus:border-indigo-400 outline-none"
                                                />
                                                <span className="absolute right-3 top-2 text-xs text-slate-400">年</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400">按等额本息/本金计算还款</p>
                                        </div>

                                        {/* Equity Distribution */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-600">资方A 股权比例</label>
                                            <div className="relative flex items-center">
                                                <input
                                                    type="number" step="1" max="100" min="0"
                                                    value={projectBaseInfo.spvConfig?.shareholderARate ?? 51}
                                                    onChange={(e) => setProjectBaseInfo({
                                                        ...projectBaseInfo,
                                                        spvConfig: { ...(projectBaseInfo.spvConfig || { debtRatio: 70, loanInterest: 4.5, loanTerm: 10 }), shareholderARate: parseFloat(e.target.value) || 0 }
                                                    })}
                                                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm text-slate-700 focus:border-indigo-400 outline-none"
                                                />
                                                <span className="absolute right-3 top-2 text-xs text-slate-400">%</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400">
                                                资方B (跟投/业主) 持股: <span className="font-bold">{100 - (projectBaseInfo.spvConfig?.shareholderARate ?? 51)}%</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </details>

                        <div className="mt-8 border-t border-slate-100 pt-8" />
                        <BuildingList
                            buildings={buildings}
                            handleBuildingChange={handleBuildingChange}
                            handleDeleteBuilding={handleDeleteBuilding}
                            handleAddBuilding={handleAddBuilding}
                        />
                    </section>

                    {/* ... Rest of the component (Power Distribution, Energy Consumption) ... */}
                    {/* Keeping existing structure but implicitly they use context now for saving */}
                    {/* Power Distribution & Bills */}
                    <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-fade-in">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined">electric_meter</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">配电与电费</h3>
                                <p className="text-xs text-slate-500">录入变压器信息与历史电费账单</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Transformers */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-sm font-semibold text-slate-700">变压器信息</label>
                                    <button
                                        onClick={handleAddTransformer}
                                        className="text-xs font-medium text-primary hover:text-primary-hover flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">add</span> 添加变压器
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {transformers.map((t) => (
                                        <div key={t.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-3 relative group">
                                            <button
                                                onClick={() => handleDeleteTransformer(t.id)}
                                                className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">close</span>
                                            </button>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] text-slate-400 block mb-1">名称/编号</label>
                                                    <input
                                                        value={t.name}
                                                        onChange={(e) => handleTransformerChange(t.id, 'name', e.target.value)}
                                                        className="w-full text-sm bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-primary"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-400 block mb-1">电压等级</label>
                                                    <select
                                                        value={t.voltageLevel}
                                                        onChange={(e) => handleTransformerChange(t.id, 'voltageLevel', e.target.value)}
                                                        className="w-full text-sm bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-primary"
                                                    >
                                                        <option>10kV</option>
                                                        <option>20kV</option>
                                                        <option>35kV</option>
                                                        <option>110kV</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-400 block mb-1">额定容量 (kVA)</label>
                                                    <input
                                                        type="number"
                                                        value={t.capacity}
                                                        onChange={(e) => handleTransformerChange(t.id, 'capacity', parseInt(e.target.value))}
                                                        className="w-full text-sm bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-primary"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {transformers.length === 0 && (
                                        <div className="p-6 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                                            暂无变压器信息，请添加
                                        </div>
                                    )}
                                </div>
                            </div>

                            <BillImport />
                        </div>
                    </section>

                    {/* Energy Consumption - Estimation & Manual Config (This part reused activeSystemTab and currentBuilding, which rely on state we already persisted) */}
                    {/* The rest of the component uses the building state which is now persisted in context */}
                    <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined">settings_suggest</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">能耗详情配置</h3>
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
                                        分项能耗详情 (按建筑独立配置)
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">当前配置建筑:</span>
                                        <div className="relative">
                                            <select
                                                value={targetBuildingId}
                                                onChange={(e) => setTargetBuildingId(Number(e.target.value))}
                                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-primary pr-8 appearance-none cursor-pointer shadow-sm"
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
                                    {systemsMenu.map(sys => (
                                        <button
                                            key={sys.id}
                                            onClick={() => setActiveSystemTab(sys.id as any)}
                                            className={`px-5 py-2.5 rounded-t-xl text-sm font-medium flex items-center gap-2 transition-all relative top-[1px] ${activeSystemTab === sys.id ? 'bg-primary text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">{sys.icon}</span> {sys.label}
                                        </button>
                                    ))}
                                </div>

                                <div className={`p-8 rounded-2xl border transition-all relative overflow-hidden min-h-[300px] ${currentSystemConfig?.enabled ? 'border-primary/20 bg-primary/5' : 'border-slate-200 bg-slate-50'}`}>
                                    {activeSystemTab === 'lighting' && currentBuilding && (
                                        <div className="animate-fade-in">
                                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/50">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl shadow-sm flex items-center justify-center transition-colors ${currentBuilding.systems.lighting.enabled ? 'bg-white text-yellow-500' : 'bg-slate-200 text-slate-400'}`}>
                                                        <span className="material-symbols-outlined text-[24px]">lightbulb</span>
                                                    </div>
                                                    <div>
                                                        <h4 className={`font-bold text-lg ${currentBuilding.systems.lighting.enabled ? 'text-slate-800' : 'text-slate-500'}`}>照明系统配置</h4>
                                                        <p className="text-xs text-slate-500 mt-0.5">配置 {currentBuilding.name} 的灯具功率与控制</p>
                                                    </div>
                                                </div>
                                                <label className="flex items-center cursor-pointer gap-3">
                                                    <span className={`text-sm font-medium ${currentBuilding.systems.lighting.enabled ? 'text-primary' : 'text-slate-400'}`}>
                                                        {currentBuilding.systems.lighting.enabled ? '已启用' : '未启用'}
                                                    </span>
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={currentBuilding.systems.lighting.enabled}
                                                        onChange={(e) => toggleSystemEnabled(currentBuilding.id, 'lighting')}
                                                    />
                                                    <div className="relative w-12 h-6 bg-slate-300 peer-checked:bg-primary rounded-full transition-colors">
                                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${currentBuilding.systems.lighting.enabled ? 'translate-x-6' : ''}`}></div>
                                                    </div>
                                                </label>
                                            </div>

                                            <div className={`transition-opacity ${currentBuilding.systems.lighting.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                                {/* Mode Selector */}
                                                <div className="flex items-center gap-4 mb-6">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="lightingMode"
                                                            className="accent-primary"
                                                            checked={currentBuilding.systems.lighting.mode === 'density'}
                                                            onChange={() => updateLightingMode(currentBuilding.id, 'density')}
                                                        />
                                                        <span className="text-sm font-medium text-slate-700">智能估算 (功率密度)</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="lightingMode"
                                                            className="accent-primary"
                                                            checked={currentBuilding.systems.lighting.mode === 'list'}
                                                            onChange={() => updateLightingMode(currentBuilding.id, 'list')}
                                                        />
                                                        <span className="text-sm font-medium text-slate-700">手动清单 (灯具列表)</span>
                                                    </label>
                                                </div>

                                                {currentBuilding.systems.lighting.mode === 'density' ? (
                                                    <div className="space-y-4 max-w-md bg-white p-6 rounded-xl border border-slate-200">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-semibold text-slate-700 flex justify-between">
                                                                功率密度 (W/㎡) <span className="text-xs text-slate-400 font-normal">建议值: 8-12</span>
                                                            </label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm focus:border-primary"
                                                                    value={currentBuilding.systems.lighting.density}
                                                                    onChange={(e) => updateLightingDensity(currentBuilding.id, parseFloat(e.target.value))}
                                                                />
                                                                <span className="absolute right-4 top-3 text-xs text-slate-400 font-medium">W/㎡</span>
                                                            </div>
                                                            <p className="text-xs text-slate-500 pt-1">
                                                                预估总负荷: <span className="font-bold text-primary">{((currentBuilding.systems.lighting.density * currentBuilding.area) / 1000).toFixed(1)} kW</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <SystemConfigTable
                                                        systemKey="lighting"
                                                        items={currentBuilding.systems.lighting.items}
                                                        powerUnitLabel="W"
                                                        showType={false}
                                                        currentBuildingId={currentBuilding.id}
                                                        updateSystemItem={updateSystemItem}
                                                        addSystemItem={addSystemItem}
                                                        removeSystemItem={removeSystemItem}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {/* Other tabs logic is same as before, essentially rendering based on currentBuilding state which is now persisted */}
                                    {/* ... (HVAC, Water, Production render blocks - identical to previous file but using persisted state) ... */}
                                    {activeSystemTab === 'hvac' && currentBuilding && (
                                        <div className="animate-fade-in">
                                            {/* ... HVAC Render Logic ... */}
                                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/50">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl shadow-sm flex items-center justify-center transition-colors ${currentBuilding.systems.hvac.enabled ? 'bg-white text-blue-500' : 'bg-slate-200 text-slate-400'}`}>
                                                        <span className="material-symbols-outlined text-[24px]">ac_unit</span>
                                                    </div>
                                                    <div>
                                                        <h4 className={`font-bold text-lg ${currentBuilding.systems.hvac.enabled ? 'text-slate-800' : 'text-slate-500'}`}>暖通空调配置</h4>
                                                        <p className="text-xs text-slate-500 mt-0.5">配置 {currentBuilding.name} 的制冷/制热设备</p>
                                                    </div>
                                                </div>
                                                <label className="flex items-center cursor-pointer gap-3">
                                                    <span className={`text-sm font-medium ${currentBuilding.systems.hvac.enabled ? 'text-primary' : 'text-slate-400'}`}>
                                                        {currentBuilding.systems.hvac.enabled ? '已启用' : '未启用'}
                                                    </span>
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={currentBuilding.systems.hvac.enabled}
                                                        onChange={(e) => toggleSystemEnabled(currentBuilding.id, 'hvac')}
                                                    />
                                                    <div className="relative w-12 h-6 bg-slate-300 peer-checked:bg-primary rounded-full transition-colors">
                                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${currentBuilding.systems.hvac.enabled ? 'translate-x-6' : ''}`}></div>
                                                    </div>
                                                </label>
                                            </div>
                                            <div className={`transition-opacity ${currentBuilding.systems.hvac.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                                <SystemConfigTable
                                                    systemKey="hvac"
                                                    items={currentBuilding.systems.hvac.items}
                                                    powerUnitLabel="kW"
                                                    showType={true}
                                                    currentBuildingId={currentBuilding.id}
                                                    updateSystemItem={updateSystemItem}
                                                    addSystemItem={addSystemItem}
                                                    removeSystemItem={removeSystemItem}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeSystemTab === 'water' && currentBuilding && (
                                        <div className="animate-fade-in">
                                            {/* ... Water Render Logic ... */}
                                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/50">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl shadow-sm flex items-center justify-center transition-colors ${currentBuilding.systems.water.enabled ? 'bg-white text-cyan-500' : 'bg-slate-200 text-slate-400'}`}>
                                                        <span className="material-symbols-outlined text-[24px]">water_drop</span>
                                                    </div>
                                                    <div>
                                                        <h4 className={`font-bold text-lg ${currentBuilding.systems.water.enabled ? 'text-slate-800' : 'text-slate-500'}`}>热水系统配置</h4>
                                                        <p className="text-xs text-slate-500 mt-0.5">配置 {currentBuilding.name} 的生活/工艺热水</p>
                                                    </div>
                                                </div>
                                                <label className="flex items-center cursor-pointer gap-3">
                                                    <span className={`text-sm font-medium ${currentBuilding.systems.water.enabled ? 'text-primary' : 'text-slate-400'}`}>
                                                        {currentBuilding.systems.water.enabled ? '已启用' : '未启用'}
                                                    </span>
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={currentBuilding.systems.water.enabled}
                                                        onChange={(e) => toggleSystemEnabled(currentBuilding.id, 'water')}
                                                    />
                                                    <div className="relative w-12 h-6 bg-slate-300 peer-checked:bg-primary rounded-full transition-colors">
                                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${currentBuilding.systems.water.enabled ? 'translate-x-6' : ''}`}></div>
                                                    </div>
                                                </label>
                                            </div>
                                            <div className={`transition-opacity ${currentBuilding.systems.water.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                                <SystemConfigTable
                                                    systemKey="water"
                                                    items={currentBuilding.systems.water.items}
                                                    powerUnitLabel="kW"
                                                    showType={true}
                                                    currentBuildingId={currentBuilding.id}
                                                    updateSystemItem={updateSystemItem}
                                                    addSystemItem={addSystemItem}
                                                    removeSystemItem={removeSystemItem}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeSystemTab === 'production' && currentBuilding && (
                                        <div className="animate-fade-in">
                                            {/* ... Production Render Logic ... */}
                                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/50">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl shadow-sm flex items-center justify-center transition-colors ${currentBuilding.systems.production.enabled ? 'bg-white text-purple-500' : 'bg-slate-200 text-slate-400'}`}>
                                                        <span className="material-symbols-outlined text-[24px]">precision_manufacturing</span>
                                                    </div>
                                                    <div>
                                                        <h4 className={`font-bold text-lg ${currentBuilding.systems.production.enabled ? 'text-slate-800' : 'text-slate-500'}`}>生产设备配置</h4>
                                                        <p className="text-xs text-slate-500 mt-0.5">配置 {currentBuilding.name} 的产线与动力设备</p>
                                                    </div>
                                                </div>
                                                <label className="flex items-center cursor-pointer gap-3">
                                                    <span className={`text-sm font-medium ${currentBuilding.systems.production.enabled ? 'text-primary' : 'text-slate-400'}`}>
                                                        {currentBuilding.systems.production.enabled ? '已启用' : '未启用'}
                                                    </span>
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={currentBuilding.systems.production.enabled}
                                                        onChange={(e) => toggleSystemEnabled(currentBuilding.id, 'production')}
                                                    />
                                                    <div className="relative w-12 h-6 bg-slate-300 peer-checked:bg-primary rounded-full transition-colors">
                                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${currentBuilding.systems.production.enabled ? 'translate-x-6' : ''}`}></div>
                                                    </div>
                                                </label>
                                            </div>
                                            <div className={`transition-opacity ${currentBuilding.systems.production.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                                <SystemConfigTable
                                                    systemKey="production"
                                                    items={currentBuilding.systems.production.items}
                                                    powerUnitLabel="kW"
                                                    showType={false}
                                                    currentBuildingId={currentBuilding.id}
                                                    updateSystemItem={updateSystemItem}
                                                    addSystemItem={addSystemItem}
                                                    removeSystemItem={removeSystemItem}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Summary Section */}
                                <div className="mt-8 bg-slate-100 rounded-2xl p-6 border border-slate-200 animate-fade-in">
                                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                                        <span className="material-symbols-outlined text-[18px]">fact_check</span>
                                        配置汇总与校核
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        {buildings.map(b => {
                                            const load = calculateBuildingLoad(b);
                                            return (
                                                <div key={b.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6">
                                                    {/* Building Info */}
                                                    <div className="w-full md:w-1/4">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="material-symbols-outlined text-slate-400 text-[20px]">domain</span>
                                                            <span className="font-bold text-slate-800">{b.name}</span>
                                                        </div>
                                                        <div className="text-xs text-slate-500 pl-7">
                                                            {b.type} | {b.area.toLocaleString()} ㎡
                                                        </div>
                                                    </div>

                                                    {/* Systems Status */}
                                                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                                                        {/* Lighting */}
                                                        <div className={`flex items-center gap-2 p-2 rounded-lg border ${b.systems.lighting.enabled ? 'bg-yellow-50 border-yellow-100' : 'bg-slate-50 border-transparent opacity-50'}`}>
                                                            <span className={`material-symbols-outlined text-[18px] ${b.systems.lighting.enabled ? 'text-yellow-600' : 'text-slate-400'}`}>lightbulb</span>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] text-slate-500">照明</span>
                                                                <span className="text-xs font-bold text-slate-700">
                                                                    {b.systems.lighting.enabled
                                                                        ? (b.systems.lighting.mode === 'density' ? `${b.systems.lighting.density} W/㎡` : `${b.systems.lighting.items.length} 种设备`)
                                                                        : '停用'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {/* HVAC */}
                                                        <div className={`flex items-center gap-2 p-2 rounded-lg border ${b.systems.hvac.enabled ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-transparent opacity-50'}`}>
                                                            <span className={`material-symbols-outlined text-[18px] ${b.systems.hvac.enabled ? 'text-blue-600' : 'text-slate-400'}`}>ac_unit</span>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] text-slate-500">暖通空调</span>
                                                                <span className="text-xs font-bold text-slate-700">{b.systems.hvac.enabled ? `${b.systems.hvac.items.length} 种设备` : '停用'}</span>
                                                            </div>
                                                        </div>
                                                        {/* Water */}
                                                        <div className={`flex items-center gap-2 p-2 rounded-lg border ${b.systems.water.enabled ? 'bg-cyan-50 border-cyan-100' : 'bg-slate-50 border-transparent opacity-50'}`}>
                                                            <span className={`material-symbols-outlined text-[18px] ${b.systems.water.enabled ? 'text-cyan-600' : 'text-slate-400'}`}>water_drop</span>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] text-slate-500">热水</span>
                                                                <span className="text-xs font-bold text-slate-700">{b.systems.water.enabled ? `${b.systems.water.items.length} 种设备` : '停用'}</span>
                                                            </div>
                                                        </div>
                                                        {/* Production */}
                                                        <div className={`flex items-center gap-2 p-2 rounded-lg border ${b.systems.production.enabled ? 'bg-purple-50 border-purple-100' : 'bg-slate-50 border-transparent opacity-50'}`}>
                                                            <span className={`material-symbols-outlined text-[18px] ${b.systems.production.enabled ? 'text-purple-600' : 'text-slate-400'}`}>precision_manufacturing</span>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] text-slate-500">生产</span>
                                                                <span className="text-xs font-bold text-slate-700">{b.systems.production.enabled ? `${b.systems.production.items.length} 种设备` : '停用'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Load Summary */}
                                                    <div className="w-full md:w-auto min-w-[120px] text-right border-l border-slate-200 pl-6 hidden md:block">
                                                        <span className="text-[10px] text-slate-400 uppercase font-medium">预估负荷</span>
                                                        <div className="text-lg font-bold text-primary">{load.toFixed(1)} <span className="text-xs font-normal text-slate-500">kW</span></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div >

            {/* Sticky Footer */}
            < div className="fixed bottom-0 left-64 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 px-8 z-40 flex flex-col gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]" >
                {/* Summary Info */}
                < div className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 mb-1" >
                    <div className="flex gap-8">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-medium">建筑总数</span>
                            <span className="text-sm font-bold text-slate-700">{buildings.length} <span className="text-[10px] font-normal">栋</span></span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-medium">变压器</span>
                            <span className="text-sm font-bold text-slate-700">{transformers.length} <span className="text-[10px] font-normal">台</span></span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-medium">预估总负荷 (所有建筑)</span>
                            <span className="text-sm font-bold text-primary">{totalLoadMW} <span className="text-[10px] font-normal">MW</span></span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs text-slate-500">数据实时同步中</span>
                    </div>
                </div >

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
                        <button
                            onClick={saveProject}
                            className="px-8 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all flex items-center gap-2"
                        >
                            保存并下一步 <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div >
        </div >
    );
};

export default ProjectEntry;