export const PRODUCT_IDENTITY = {
  fullName: '园区综合能源项目投资收益测算与辅助决策系统',
  shortName: '零碳项目辅助决策系统',
  version: 'V2.14',
  developmentYear: '2026',
  copyrightHolder: (import.meta.env.VITE_COPYRIGHT_HOLDER || '').trim() || '待权利人确认',
} as const;

export const COPYRIGHT_RELEASE_FEATURES = {
  cloudCollaboration: true,
  artificialIntelligencePlatform: false,
  carbonTrading: false,
  realtimeVppDispatch: false,
  realtimeIotControl: false,
  digitalTwinControl: false,
  algorithmAdministration: false,
} as const;

export const getProductDisplayName = () =>
  `${PRODUCT_IDENTITY.fullName}${PRODUCT_IDENTITY.version}`;
