/**
 * 基于过去20年全国主要地区光伏日均等效满载小时数 (Equivalent Full Load Hours - EFLH / 365)
 * 单位: 小时/天
 */

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
