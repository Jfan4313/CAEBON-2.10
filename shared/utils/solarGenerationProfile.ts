import { getCityCoordinates } from '../../services/solarData';

export interface SolarProfileLocation {
  latitude?: number;
  longitude?: number;
  province?: string;
  city?: string;
}

export interface ResolvedSolarLocation {
  latitude: number;
  longitude: number;
  source: 'coordinates' | 'province_city' | 'default';
}

const MONTH_MIDDLE_DAY = [15, 45, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349];
const toRadians = (degrees: number) => degrees * Math.PI / 180;

export const resolveSolarLocation = (location: SolarProfileLocation = {}): ResolvedSolarLocation => {
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
    return { latitude, longitude, source: 'coordinates' };
  }
  const local = getCityCoordinates(location.province || '', location.city || '');
  if (local) return { latitude: local.lat, longitude: local.lon, source: 'province_city' };
  return { latitude: 31.23, longitude: 121.47, source: 'default' };
};

/**
 * 按项目地生成全年平均典型日出力形状。
 * 使用12个代表日的太阳赤纬、时差和当地太阳时计算太阳高度，再取月均。
 * 返回的是归一化权重，发电总量仍由当地等效日照小时控制。
 */
export const buildLocationSolarProfile = (location: SolarProfileLocation = {}): number[] => {
  const resolved = resolveSolarLocation(location);
  const latitude = toRadians(resolved.latitude);
  const hourly = Array(24).fill(0);

  MONTH_MIDDLE_DAY.forEach(dayOfYear => {
    const declination = toRadians(23.45 * Math.sin(toRadians(360 * (284 + dayOfYear) / 365)));
    const seasonalAngle = toRadians(360 * (dayOfYear - 81) / 364);
    const equationOfTimeMinutes = 9.87 * Math.sin(2 * seasonalAngle) - 7.53 * Math.cos(seasonalAngle) - 1.5 * Math.sin(seasonalAngle);
    const solarTimeCorrectionHours = (4 * (resolved.longitude - 120) + equationOfTimeMinutes) / 60;

    for (let hour = 0; hour < 24; hour++) {
      const localClockHour = hour + 0.5;
      const solarHourAngle = toRadians(15 * (localClockHour + solarTimeCorrectionHours - 12));
      const cosZenith = Math.sin(latitude) * Math.sin(declination)
        + Math.cos(latitude) * Math.cos(declination) * Math.cos(solarHourAngle);
      hourly[hour] += cosZenith > 0 ? Math.pow(cosZenith, 1.22) : 0;
    }
  });

  const averaged = hourly.map(value => value / MONTH_MIDDLE_DAY.length);
  const maxValue = Math.max(...averaged, 0.0001);
  return averaged.map(value => value / maxValue < 0.012 ? 0 : value);
};

export const getSolarProfileBasis = (location: SolarProfileLocation = {}): string => {
  const resolved = resolveSolarLocation(location);
  if (resolved.source === 'coordinates') return `项目坐标 ${resolved.latitude.toFixed(3)}°, ${resolved.longitude.toFixed(3)}°`;
  if (resolved.source === 'province_city') return `${location.city || location.province || '项目所在地'}代表坐标`;
  return '默认代表坐标（项目地址待完善）';
};
