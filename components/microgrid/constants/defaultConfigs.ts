import { DeviceImageConfig } from '../../../types';

export const DEFAULT_DEVICE_CONFIGS: DeviceImageConfig[] = [
    // 场景底图 - 使用指定的 Gemini 生成图
    {
        id: 'sceneBackground',
        name: '场景底图',
        imageSrc: '/microgrid/基础底图_0005_Gemini_Generated_Image_1w1c5g1w1c5g1w1c.png',
        position: { top: 0, left: 0 },
        size: { width: 100, height: 'auto' },
        zIndex: 0,
        visible: true
    },
    // 建筑主体 - 使用带 _0000s_ 的图作为底层
    {
        id: 'background-main',
        name: '建筑主体',
        imageSrc: '/microgrid/基础底图_0000s_0014_建筑主体.png',
        position: { top: 0, left: 0 },
        size: { width: 100, height: 'auto' },
        zIndex: 1,
        visible: false
    },
    // 装饰图层 - 使用带 _0000s_ 的图
    {
        id: 'decorative',
        name: '装饰图层',
        imageSrc: '/microgrid/基础底图_0000s_0013_图层-3.png',
        position: { top: 0, left: 0 },
        size: { width: 100, height: 'auto' },
        zIndex: 2,
        visible: true
    },
    // 以下是透明组件 - 使用 _0000s_ 开头的图
    {
        id: 'pvPanel1',
        name: '光伏组件1',
        imageSrc: '/microgrid/基础底图_0000s_0000_组件1.png',
        position: { top: 0, left: 0 },
        size: {},
        zIndex: 10,
        visible: true,
        linkedDevice: 'pvPanels'
    },
    {
        id: 'pvPanel2',
        name: '光伏组件2',
        imageSrc: '/microgrid/基础底图_0000s_0005_组件2.png',
        position: { top: 0, left: 0 },
        size: {},
        zIndex: 10,
        visible: true,
        linkedDevice: 'pvPanels'
    },
    {
        id: 'hvacOutdoor1',
        name: '空调外机1',
        imageSrc: '/microgrid/基础底图_0000s_0002_空调外机1.png',
        position: { top: 0, left: 0 },
        size: {},
        zIndex: 10,
        visible: true,
        linkedDevice: 'hvacOutdoor1'
    },
    {
        id: 'hvacOutdoor2',
        name: '空调外机2',
        imageSrc: '/microgrid/基础底图_0000s_0003_空调外机2.png',
        position: { top: 0, left: 0 },
        size: {},
        zIndex: 10,
        visible: true,
        linkedDevice: 'hvacOutdoor2'
    },
    {
        id: 'powerTower',
        name: '电塔',
        imageSrc: '/microgrid/基础底图_0000s_0004_电塔.png',
        position: { top: 0, left: 0 },
        size: {},
        zIndex: 5,
        visible: true
    },
    {
        id: 'streetLight',
        name: '路灯',
        imageSrc: '/microgrid/基础底图_0000s_0012_路灯.png',
        position: { top: 0, left: 0 },
        size: {},
        zIndex: 10,
        visible: true,
        linkedDevice: 'streetLights'
    },
    {
        id: 'evCharger1',
        name: '充电桩1',
        imageSrc: '/microgrid/基础底图_0000s_0011_充电桩.png',
        position: { top: 0, left: 0 },
        size: {},
        zIndex: 10,
        visible: true,
        linkedDevice: 'evCharger1'
    },
    {
        id: 'evCharger2',
        name: '充电桩2',
        imageSrc: '/microgrid/基础底图_0000s_0011_充电桩.png',
        position: { top: 0, left: 0 },
        size: {},
        zIndex: 10,
        visible: true,
        linkedDevice: 'evCharger2'
    },
    {
        id: 'evCar1',
        name: '电动汽车1',
        imageSrc: '/microgrid/基础底图_0000s_0007_汽车1.png',
        position: { top: 0, left: 0 },
        size: {},
        zIndex: 10,
        visible: true,
        linkedDevice: 'evCars'
    },
    {
        id: 'evCar2',
        name: '电动汽车2',
        imageSrc: '/microgrid/基础底图_0000s_0008_汽车2.png',
        position: { top: 0, left: 0 },
        size: {},
        zIndex: 10,
        visible: true,
        linkedDevice: 'evCars'
    },
    {
        id: 'evCar3',
        name: '电动汽车3',
        imageSrc: '/microgrid/基础底图_0000s_0009_汽车3.png',
        position: { top: 0, left: 0 },
        size: {},
        zIndex: 10,
        visible: true,
        linkedDevice: 'evCars'
    },
    {
        id: 'storage',
        name: '储能系统',
        imageSrc: '/microgrid/基础底图_0000s_0001_储能.png',
        position: { top: 0, left: 0 },
        size: {},
        zIndex: 10,
        visible: true,
        linkedDevice: 'storage'
    },
    {
        id: 'hvacIndoor',
        name: '空调挂机',
        imageSrc: '/microgrid/基础底图_0000s_0010_空调挂机.png',
        position: { top: 0, left: 0 },
        size: {},
        zIndex: 10,
        visible: true,
        linkedDevice: 'hvacIndoor'
    }
];
