/**
 * NASA POWER API Service
 * 官方文档: https://power.larc.nasa.gov/docs/services/api/temporal/climatology/
 */

export interface NasaSolarResult {
    annualAverage: number; // 年均日等效小时数 (kWh/m^2/day)
    monthlyAverages: number[]; // 1-12月 均值
    source: 'nasa';
}

/**
 * 获取指定经纬度的多年平均日照数据 (Climatology)
 * @param lat 纬度
 * @param lon 经度
 */
export const fetchNasaSolarData = async (lat: number, lon: number): Promise<NasaSolarResult> => {
    // 参数: ALLSKY_SFC_SW_DWN (All Sky Surface Shortwave Downward Irradiance)
    // 社区: RE (Renewable Energy)
    const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('NASA API request failed');
        
        const data = await response.json();
        
        // 解析数据
        // NASA 返回的数据结构中，特征值在 properties.parameter.ALLSKY_SFC_SW_DWN 下
        const params = data.properties.parameter.ALLSKY_SFC_SW_DWN;
        
        // NASA 的 Key 通常是: JAN, FEB, MAR... 和 ANN (Annual)
        const annualAverage = params.ANN;
        const monthlyAverages = [
            params.JAN, params.FEB, params.MAR, params.APR, params.MAY, params.JUN,
            params.JUL, params.AUG, params.SEP, params.OCT, params.NOV, params.DEC
        ];

        return {
            annualAverage: parseFloat(annualAverage.toFixed(3)),
            monthlyAverages: monthlyAverages.map(v => parseFloat(v.toFixed(3))),
            source: 'nasa'
        };
    } catch (error) {
        console.error('Failed to fetch data from NASA POWER API:', error);
        throw error;
    }
};
