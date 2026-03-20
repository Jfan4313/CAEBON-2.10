/**
 * 基于过去20年全国主要地区光伏日均等效满载小时数 (Equivalent Full Load Hours - EFLH / 365)
 * 单位: 小时/天
 */

import { fetchNasaSolarData } from './nasaPower';

export const CITY_SUNLIGHT_HOURS: Record<string, number> = {
    // 华北地区
    '北京市': 3.6, '天津市': 3.5, '石家庄市': 3.4, '太原市': 4.1, '呼和浩特市': 4.8, '包头市': 5.0,

    // 东北地区
    '沈阳市': 3.8, '大连市': 3.9, '长春市': 4.0, '哈尔滨市': 3.7,

    // 华东地区
    '上海市': 3.1, '南京市': 3.2, '杭州市': 3.0, '合肥市': 3.1, '福州市': 3.2, '南昌市': 3.0, '济南市': 3.5, '青岛市': 3.7, '苏州市': 3.1, '无锡市': 3.1, '宁波市': 3.1, '温州市': 3.0,

    // 华中地区
    '郑州市': 3.3, '武汉市': 3.1, '长沙市': 2.8,

    // 华南地区
    '广州市': 3.1, '深圳市': 3.2, '南宁市': 3.1, '海口市': 3.8, '三亚市': 4.2, '佛山市': 3.1, '东莞市': 3.2,

    // 西南地区
    '重庆市': 2.2, '成都市': 2.5, '贵阳市': 2.4, '昆明市': 4.5, '拉萨市': 5.5, '攀枝花市': 3.8, '丽江市': 4.2, '日喀则市': 5.0, '阿里地区': 5.1,

    // 西北地区
    '西安市': 3.3, '兰州市': 4.3, '西宁市': 4.7, '银川市': 4.9, '乌鲁木齐市': 4.1, '哈密市': 5.2, '酒泉市': 4.5, '嘉峪关市': 4.6, '吐鲁番市': 4.4
};

/**
 * 城市坐标映射（用于NASA POWER API）
 * 单位: 纬度, 经度
 */
export const CITY_COORDINATES: Record<string, { lat: number; lon: number }> = {
    // 华北地区
    '北京市': { lat: 39.9042, lon: 116.4074 },
    '天津市': { lat: 39.0842, lon: 117.2009 },
    '石家庄市': { lat: 38.0428, lon: 114.5149 },
    '太原市': { lat: 37.8706, lon: 112.5489 },
    '呼和浩特市': { lat: 40.8414, lon: 111.7519 },
    '包头市': { lat: 40.6574, lon: 109.8403 },

    // 东北地区
    '沈阳市': { lat: 41.8057, lon: 123.4315 },
    '大连市': { lat: 38.9140, lon: 121.6147 },
    '长春市': { lat: 43.8171, lon: 125.3235 },
    '哈尔滨市': { lat: 45.8038, lon: 126.5340 },

    // 华东地区
    '上海市': { lat: 31.2304, lon: 121.4737 },
    '南京市': { lat: 32.0603, lon: 118.7969 },
    '杭州市': { lat: 30.2741, lon: 120.1551 },
    '合肥市': { lat: 31.8206, lon: 117.2272 },
    '福州市': { lat: 26.0745, lon: 119.2965 },
    '南昌市': { lat: 28.6829, lon: 115.8579 },
    '济南市': { lat: 36.6512, lon: 117.1201 },
    '青岛市': { lat: 36.0671, lon: 120.3826 },
    '苏州市': { lat: 31.2989, lon: 120.5853 },
    '无锡市': { lat: 31.4912, lon: 120.3119 },
    '宁波市': { lat: 29.8683, lon: 121.5440 },
    '温州市': { lat: 28.0002, lon: 120.6719 },

    // 华中地区
    '郑州市': { lat: 34.7466, lon: 113.6253 },
    '武汉市': { lat: 30.5928, lon: 114.3055 },
    '长沙市': { lat: 28.2282, lon: 112.9388 },

    // 华南地区
    '广州市': { lat: 23.1291, lon: 113.2644 },
    '深圳市': { lat: 22.5431, lon: 114.0579 },
    '南宁市': { lat: 22.8170, lon: 108.3665 },
    '海口市': { lat: 20.0440, lon: 110.1999 },
    '三亚市': { lat: 18.2524, lon: 109.5117 },
    '佛山市': { lat: 23.0218, lon: 113.1219 },
    '东莞市': { lat: 23.0205, lon: 113.7518 },

    // 西南地区
    '重庆市': { lat: 29.5627, lon: 106.5528 },
    '成都市': { lat: 30.5728, lon: 104.0668 },
    '贵阳市': { lat: 26.6470, lon: 106.6302 },
    '昆明市': { lat: 25.0389, lon: 102.7183 },
    '拉萨市': { lat: 29.6500, lon: 91.1000 },
    '攀枝花市': { lat: 26.5820, lon: 101.7059 },
    '丽江市': { lat: 26.8556, lon: 100.2276 },
    '日喀则市': { lat: 29.2675, lon: 88.8810 },
    '阿里地区': { lat: 32.5000, lon: 80.1057 },

    // 西北地区
    '西安市': { lat: 34.3416, lon: 108.9398 },
    '兰州市': { lat: 36.0611, lon: 103.8343 },
    '西宁市': { lat: 36.6171, lon: 101.7782 },
    '银川市': { lat: 38.4681, lon: 106.2731 },
    '乌鲁木齐市': { lat: 43.8256, lon: 87.6168 },
    '哈密市': { lat: 42.8333, lon: 93.5147 },
    '酒泉市': { lat: 39.7413, lon: 98.4942 },
    '嘉峪关市': { lat: 39.7727, lon: 98.2773 },
    '吐鲁番市': { lat: 42.9513, lon: 89.1895 },
};

/**
 * 根据省市获取对应的光伏日均有效日照时长
 */
export const getSunHours = (province: string, city?: string): number => {
    // 1. 直辖市或明确定义的城市匹配
    if (city && CITY_SUNLIGHT_HOURS[city]) {
        return CITY_SUNLIGHT_HOURS[city];
    }

    // 2. 如果没匹配到，返回该省会城市或近似全省均值兜底
    switch (province) {
        case '北京': return 3.6;
        case '天津': return 3.5;
        case '上海': return 3.1;
        case '重庆': return 2.2;
        case '河北': return 3.6;
        case '山西': return 4.1;
        case '内蒙古': return 4.8;
        case '辽宁': return 3.8;
        case '吉林': return 4.0;
        case '黑龙江': return 3.7;
        case '江苏': return 3.1;
        case '浙江': return 3.0;
        case '安徽': return 3.1;
        case '福建': return 3.2;
        case '江西': return 3.0;
        case '山东': return 3.5;
        case '河南': return 3.3;
        case '湖北': return 3.1;
        case '湖南': return 2.8;
        case '广东': return 3.1;
        case '广西': return 3.1;
        case '海南': return 3.9;
        case '四川': return 2.5;
        case '贵州': return 2.4;
        case '云南': return 4.2;
        case '西藏': return 5.5;
        case '陕西': return 3.3;
        case '甘肃': return 4.3;
        case '青海': return 4.7;
        case '宁夏': return 4.9;
        case '新疆': return 4.5;
        default: return 3.2; // 全国平均兜底
    }
};

/**
 * 根据省市获取对应的光伏日均有效日照时长（优先使用NASA数据）
 * @param province 省份
 * @param city 城市
 * @returns Promise<number> 日均日照时长
 */
export const getSunHoursWithNASA = async (province: string, city?: string): Promise<number> => {
    // 首先尝试使用NASA数据（需要城市坐标）
    if (city && CITY_COORDINATES[city]) {
        try {
            const coords = CITY_COORDINATES[city];
            const nasaData = await fetchNasaSolarData(coords.lat, coords.lon);
            return nasaData.annualAverage;
        } catch (error) {
            console.warn('NASA API调用失败，使用本地数据:', error);
            // 降级到本地数据
        }
    }

    // 降级方案：使用本地静态数据
    return getSunHours(province, city);
};

/**
 * 根据省市获取对应的坐标（用于NASA API）
 */
export const getCityCoordinates = (province: string, city?: string): { lat: number; lon: number } | null => {
    if (city && CITY_COORDINATES[city]) {
        return CITY_COORDINATES[city];
    }

    // 根据省份返回省会城市坐标
    const provinceCapitals: Record<string, string> = {
        '北京': '北京市', '天津': '天津市', '上海': '上海市', '重庆': '重庆市',
        '河北': '石家庄市', '山西': '太原市', '内蒙古': '呼和浩特市',
        '辽宁': '沈阳市', '吉林': '长春市', '黑龙江': '哈尔滨市',
        '江苏': '南京市', '浙江': '杭州市', '安徽': '合肥市', '福建': '福州市',
        '江西': '南昌市', '山东': '济南市', '河南': '郑州市', '湖北': '武汉市',
        '湖南': '长沙市', '广东': '广州市', '广西': '南宁市', '海南': '海口市',
        '四川': '成都市', '贵州': '贵阳市', '云南': '昆明市', '西藏': '拉萨市',
        '陕西': '西安市', '甘肃': '兰州市', '青海': '西宁市', '宁夏': '银川市',
        '新疆': '乌鲁木齐市'
    };

    const capital = provinceCapitals[province];
    return capital && CITY_COORDINATES[capital] ? CITY_COORDINATES[capital] : null;
};
