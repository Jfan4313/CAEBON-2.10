import { Bill, PriceConfigState } from '../../../context/ConfigContext';
import { estimateMonthlyLoad, MonthlyEstimationOptions, parseBillMonth } from '../../../shared/utils/monthlyLoadEstimation';
import { SolarMonthlyTariff } from '../types';

type TouBand = 'tip' | 'peak' | 'flat' | 'valley';

const positive = (value: unknown) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
};

const averageBandPrices = (priceConfig: PriceConfigState): Record<TouBand, number> => {
    const fallback = positive(priceConfig.fixedPrice) || 0.8;
    const result = {} as Record<TouBand, number>;
    (['tip', 'peak', 'flat', 'valley'] as TouBand[]).forEach(type => {
        const segments = priceConfig.touSegments.filter(segment => segment.type === type);
        const duration = segments.reduce((sum, segment) => sum + Math.max(0, segment.end - segment.start), 0);
        result[type] = duration > 0
            ? segments.reduce((sum, segment) => sum + positive(segment.price) * Math.max(0, segment.end - segment.start), 0) / duration
            : fallback;
    });
    return result;
};

const averageBillBandPrice = (
    bills: Bill[],
    field: 'sharpPeakPrice' | 'peakPrice' | 'flatPrice' | 'valleyPrice',
) => {
    const values = bills.map(bill => positive(bill[field])).filter(Boolean);
    return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
};

export const buildMonthlyEmcTariffs = (
    bills: Bill[],
    priceConfig: PriceConfigState,
    discountRate: number,
    options: MonthlyEstimationOptions = {},
): SolarMonthlyTariff[] => {
    const months = estimateMonthlyLoad(bills, options);
    const billByMonth = new Map<number, Bill>();
    bills.forEach(bill => {
        const month = parseBillMonth(bill.month);
        if (month) billByMonth.set(month, bill);
    });
    const configured = averageBandPrices(priceConfig);
    const averageActual = {
        tip: averageBillBandPrice(bills, 'sharpPeakPrice'),
        peak: averageBillBandPrice(bills, 'peakPrice'),
        flat: averageBillBandPrice(bills, 'flatPrice'),
        valley: averageBillBandPrice(bills, 'valleyPrice'),
    };
    const ratio = Math.min(100, Math.max(0, Number(discountRate) || 0)) / 100;

    return months.map(month => {
        const actual = billByMonth.get(month.month);
        if (month.billingMode === 'fixed') {
            const benchmarkPrice = positive(actual?.fixedUnitPrice)
                || positive(month.fixedUnitPrice)
                || positive(priceConfig.fixedPrice)
                || 0.8;
            return {
                month: month.month,
                benchmarkPrice,
                discountedPrice: benchmarkPrice * ratio,
                source: actual ? 'bill' : 'estimated',
            };
        }

        const prices = {
            tip: positive(actual?.sharpPeakPrice) || averageActual.tip || configured.tip,
            peak: positive(actual?.peakPrice) || averageActual.peak || configured.peak,
            flat: positive(actual?.flatPrice) || averageActual.flat || configured.flat,
            valley: positive(actual?.valleyPrice) || averageActual.valley || configured.valley,
        };
        const touKwh = month.sharpPeakKwh + month.peakKwh + month.flatKwh + month.valleyKwh;
        const benchmarkPrice = touKwh > 0
            ? (
                month.sharpPeakKwh * prices.tip
                + month.peakKwh * prices.peak
                + month.flatKwh * prices.flat
                + month.valleyKwh * prices.valley
            ) / touKwh
            : positive(priceConfig.fixedPrice) || configured.flat;
        const hasMonthlyPrices = Boolean(actual && [
            actual.sharpPeakPrice, actual.peakPrice, actual.flatPrice, actual.valleyPrice,
        ].some(value => positive(value) > 0));
        return {
            month: month.month,
            benchmarkPrice,
            discountedPrice: benchmarkPrice * ratio,
            source: hasMonthlyPrices ? 'bill' : month.source === 'actual' ? 'config' : 'estimated',
        };
    });
};

export const getGenerationWeightedTariff = (
    tariffs: SolarMonthlyTariff[],
    priceField: 'benchmarkPrice' | 'discountedPrice',
    fallback: number,
) => {
    const generationProfile = [3.2, 3.5, 4.1, 4.8, 5.5, 5.2, 5.8, 5.6, 4.9, 4.5, 3.8, 3.3];
    const total = generationProfile.reduce((sum, value) => sum + value, 0);
    if (tariffs.length !== 12 || total <= 0) return fallback;
    return tariffs.reduce((sum, tariff, index) => (
        sum + positive(tariff[priceField]) * generationProfile[index] / total
    ), 0) || fallback;
};
