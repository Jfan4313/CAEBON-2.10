export interface PriceTemplate {
    id: string;
    province: string;
    name: string;
    touSegments: { start: number; end: number; price: number; type: string }[];
    hasSummer: boolean;
    summerMonths?: number[]; // 1-12
    summerTouSegments?: { start: number; end: number; price: number; type: string }[];
}

export const REGIONAL_PRICE_TEMPLATES: PriceTemplate[] = [
    {
        id: 'shanghai_10kv',
        province: 'Shanghai',
        name: '上海市 - 10kV 大工业用电',
        hasSummer: true,
        summerMonths: [7, 8, 9],
        touSegments: [
            { start: 0, end: 6, price: 0.32, type: 'valley' },
            { start: 6, end: 8, price: 0.68, type: 'flat' },
            { start: 8, end: 11, price: 1.15, type: 'peak' },
            { start: 11, end: 13, price: 0.68, type: 'flat' },
            { start: 13, end: 15, price: 1.15, type: 'peak' },
            { start: 15, end: 18, price: 0.68, type: 'flat' },
            { start: 18, end: 21, price: 1.15, type: 'peak' },
            { start: 21, end: 22, price: 0.68, type: 'flat' },
            { start: 22, end: 24, price: 0.32, type: 'valley' }
        ],
        summerTouSegments: [
            { start: 0, end: 6, price: 0.35, type: 'valley' },
            { start: 6, end: 8, price: 0.72, type: 'flat' },
            { start: 8, end: 11, price: 1.25, type: 'peak' },
            { start: 11, end: 12, price: 0.72, type: 'flat' },
            { start: 12, end: 14, price: 1.75, type: 'tip' }, // 夏季尖峰
            { start: 14, end: 15, price: 1.25, type: 'peak' },
            { start: 15, end: 18, price: 0.72, type: 'flat' },
            { start: 18, end: 21, price: 1.25, type: 'peak' },
            { start: 21, end: 22, price: 0.72, type: 'flat' },
            { start: 22, end: 24, price: 0.35, type: 'valley' }
        ]
    },
    {
        id: 'jiangsu_10kv',
        province: 'Jiangsu',
        name: '江苏省 - 10kV 大工业用电',
        hasSummer: true,
        summerMonths: [7, 8],
        touSegments: [
            { start: 0, end: 8, price: 0.31, type: 'valley' },
            { start: 8, end: 12, price: 1.12, type: 'peak' },
            { start: 12, end: 17, price: 0.67, type: 'flat' },
            { start: 17, end: 21, price: 1.12, type: 'peak' },
            { start: 21, end: 24, price: 0.67, type: 'flat' }
        ],
        summerTouSegments: [
            { start: 0, end: 8, price: 0.31, type: 'valley' },
            { start: 8, end: 10, price: 1.12, type: 'peak' },
            { start: 10, end: 11, price: 1.45, type: 'tip' }, // 尖峰
            { start: 11, end: 12, price: 1.12, type: 'peak' },
            { start: 12, end: 14, price: 0.67, type: 'flat' },
            { start: 14, end: 15, price: 1.45, type: 'tip' }, // 尖峰
            { start: 15, end: 17, price: 0.67, type: 'flat' },
            { start: 17, end: 21, price: 1.12, type: 'peak' },
            { start: 21, end: 24, price: 0.67, type: 'flat' }
        ]
    },
    {
        id: 'guangdong_10kv',
        province: 'Guangdong',
        name: '广东省 (珠三角) - 10kV 大工业',
        hasSummer: true,
        summerMonths: [7, 8, 9],
        touSegments: [
            { start: 0, end: 8, price: 0.28, type: 'valley' },
            { start: 8, end: 10, price: 0.65, type: 'flat' },
            { start: 10, end: 12, price: 1.05, type: 'peak' },
            { start: 12, end: 14, price: 0.65, type: 'flat' },
            { start: 14, end: 19, price: 1.05, type: 'peak' },
            { start: 19, end: 24, price: 0.65, type: 'flat' }
        ],
        summerTouSegments: [
            { start: 0, end: 8, price: 0.28, type: 'valley' },
            { start: 8, end: 10, price: 0.65, type: 'flat' },
            { start: 10, end: 11, price: 1.05, type: 'peak' },
            { start: 11, end: 12, price: 1.35, type: 'tip' }, // 尖峰
            { start: 12, end: 14, price: 0.65, type: 'flat' },
            { start: 14, end: 15, price: 1.05, type: 'peak' },
            { start: 15, end: 17, price: 1.35, type: 'tip' }, // 尖峰
            { start: 17, end: 19, price: 1.05, type: 'peak' },
            { start: 19, end: 24, price: 0.65, type: 'flat' }
        ]
    },
    {
        id: 'default',
        province: 'Default',
        name: '通用默认模板',
        hasSummer: false,
        touSegments: [
            { start: 0, end: 8, price: 0.32, type: 'valley' },
            { start: 8, end: 12, price: 1.15, type: 'peak' },
            { start: 12, end: 17, price: 0.68, type: 'flat' },
            { start: 17, end: 21, price: 1.15, type: 'peak' },
            { start: 21, end: 24, price: 0.32, type: 'valley' }
        ]
    }
];

export const getTemplateById = (templateId: string): PriceTemplate | undefined => {
    return REGIONAL_PRICE_TEMPLATES.find(t => t.id === templateId);
};
