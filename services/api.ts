/**
 * API服务层
 * 用于调用后端FastAPI服务
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// API基础URL - 开发环境使用localhost，生产环境使用相对路径（同源）
const isDev = import.meta.env.DEV;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (isDev ? 'http://localhost:8000' : '');

// 请求超时设置（8760小时模拟可能较慢）
const API_TIMEOUT = 60000; // 60秒

// ========== 类型定义 ==========

export interface CalculationResult {
  investment: number;
  annual_saving: number;
  roi: number;
  irr: number;
  payback_period: number;
  npv: number;
  carbon_reduction: number;
  hourly_data?: Array<{
    hour: number;
    generation: number;
    self_use: number;
    feed_in: number;
  }>;
  calculation_details?: Record<string, any>;
}

export interface SolarParams {
  capacity: number;
  yieldHours?: number;
  selfUseRatio?: number;
  buyPrice?: number;
  sellPrice?: number;
  costPerW?: number;
  emissionFactor?: number;
  includeHourly?: boolean;
}

export interface StorageParams {
  capacity: number;
  power: number;
  efficiency?: number;
  cyclesPerDay?: number;
  gridFee?: number;
  aiEnabled?: boolean;
  priceCurve?: number[];
}

export interface HVACParams {
  buildings?: Array<{
    area: number;
    currentCOP?: number;
    targetCOP?: number;
  }>;
  electricityPrice?: number;
  currentAvgCOP?: number;
  targetCOP?: number;
  aiEnabled?: boolean;
  aiPrecoolSavingPct?: number;
  emissionFactor?: number;
}

export interface LightingParams {
  areas?: Array<{
    count: number;
    oldPower?: number;
    newPower?: number;
    hours?: number;
  }>;
  electricityPrice?: number;
  aiEnabled?: boolean;
  aiDimmingSavingPct?: number;
  emissionFactor?: number;
}

export interface EVParams {
  chargerCount: number;
  powerPerChargerKw?: number;
  dailyUtilHours?: number;
  serviceFeePerKwh?: number;
  investmentPerCharger?: number;
}

export interface SimulationParams {
  province?: string;
  priceMode?: 'tou' | 'fixed' | 'spot';
  fixedPrice?: number;
  touSegments?: Array<{
    start: number;
    end: number;
    price: number;
    type: string;
  }>;
  spotPrices?: number[];
  pvCapacityKw?: number;
  storageCapacityKwh?: number;
  storagePowerKw?: number;
  annualLoadKwh?: number;
  includeHourly?: boolean;
}

export interface SimulationOutput {
  pv?: Record<string, any>;
  storage?: Record<string, any>;
  hvac?: Record<string, any>;
  aggregate?: Record<string, any>;
}

export interface ProjectSaveRequest {
  projectId?: string;
  projectName: string;
  username?: string;
  config: Record<string, any>;
  metadata?: Record<string, any>;
  version?: string;
}

export interface ProjectSummary {
  filename: string;
  projectId: string;
  projectName: string;
  timestamp: string;
  version: string;
  metadata: Record<string, any>;
  data: Record<string, any>;
}

export interface MemoryData {
  lastAccessedProject: string | null;
  recentProjects: Array<{
    id: string;
    name: string;
    timestamp: string;
  }>;
  preferences: Record<string, any>;
  templates: Record<string, any>;
  learnings: Record<string, any>;
}

// ========== API服务类 ==========

class CalculationService {
  private client: AxiosInstance;
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    );
  }

  // ========== 错误处理和重试 ==========

  private handleError(error: AxiosError<any>): never {
    if (error.code === 'ECONNABORTED') {
      throw new Error('请求超时，请稍后重试');
    }
    if (error.response) {
      const message = error.response.data?.detail || error.response.statusText;
      throw new Error(message || '请求失败');
    }
    if (error.request) {
      throw new Error('无法连接到服务器，请检查网络连接');
    }
    throw new Error(error.message || '未知错误');
  }

  private async requestWithRetry<T>(
    fn: () => Promise<T>,
    retries = this.maxRetries
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0 && this.isRetryable(error)) {
        console.log(`Request failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.requestWithRetry(fn, retries - 1);
      }
      throw error;
    }
  }

  private isRetryable(error: any): boolean {
    return (
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNRESET'
    );
  }

  // ========== 光伏计算 ==========

  async calculateSolar(params: SolarParams): Promise<CalculationResult> {
    return this.requestWithRetry(() =>
      this.client.post('/api/v1/calculation/solar', {
        capacity_kw: params.capacity,
        yield_hours: params.yieldHours || 1100,
        self_use_ratio: params.selfUseRatio || 0.8,
        buy_price: params.buyPrice || 0.8,
        sell_price: params.sellPrice || 0.35,
        cost_per_w: params.costPerW || 3.0,
        emission_factor: params.emissionFactor || 0.5703,
        include_hourly: params.includeHourly || false,
      })
    ).then(res => res.data);
  }

  // ========== 储能计算 ==========

  async calculateStorage(params: StorageParams): Promise<CalculationResult> {
    return this.requestWithRetry(() =>
      this.client.post('/api/v1/calculation/storage', {
        capacity_kwh: params.capacity,
        power_kw: params.power,
        efficiency: params.efficiency || 0.9,
        cycles_per_day: params.cyclesPerDay || 2,
        grid_fee: params.gridFee || 0.2,
        ai_enabled: params.aiEnabled || false,
        price_curve: params.priceCurve || [],
      })
    ).then(res => res.data);
  }

  // ========== 空调计算 ==========

  async calculateHVAC(params: HVACParams): Promise<CalculationResult> {
    return this.requestWithRetry(() =>
      this.client.post('/api/v1/calculation/hvac', {
        buildings: params.buildings || [],
        electricity_price: params.electricityPrice || 0.85,
        current_avg_cop: params.currentAvgCOP || 3.2,
        target_cop: params.targetCOP || 4.5,
        ai_enabled: params.aiEnabled || false,
        ai_precool_saving_pct: params.aiPrecoolSavingPct || 0.08,
        emission_factor: params.emissionFactor || 0.5703,
      })
    ).then(res => res.data);
  }

  // ========== 照明计算 ==========

  async calculateLighting(params: LightingParams): Promise<CalculationResult> {
    return this.requestWithRetry(() =>
      this.client.post('/api/v1/calculation/lighting', {
        areas: params.areas || [],
        electricity_price: params.electricityPrice || 0.85,
        ai_enabled: params.aiEnabled || false,
        ai_dimming_saving_pct: params.aiDimmingSavingPct || 0.15,
        emission_factor: params.emissionFactor || 0.5703,
      })
    ).then(res => res.data);
  }

  // ========== 充电桩计算 ==========

  async calculateEV(params: EVParams): Promise<CalculationResult> {
    return this.requestWithRetry(() =>
      this.client.post('/api/v1/calculation/ev', {
        charger_count: params.chargerCount,
        power_per_charger_kw: params.powerPerChargerKw || 7.0,
        daily_util_hours: params.dailyUtilHours || 4.0,
        service_fee_per_kwh: params.serviceFeePerKwh || 0.5,
        investment_per_charger: params.investmentPerCharger || 3000,
      })
    ).then(res => res.data);
  }

  // ========== 8760小时模拟 ==========

  async run8760Simulation(params: SimulationParams): Promise<SimulationOutput> {
    return this.requestWithRetry(() =>
      this.client.post('/api/v1/simulation/8760', {
        province: params.province || '广东省',
        price_mode: params.priceMode || 'tou',
        fixed_price: params.fixedPrice || 0.85,
        tou_segments: params.touSegments || [],
        spot_prices: params.spotPrices || [],
        pv_capacity_kw: params.pvCapacityKw || 0,
        storage_capacity_kwh: params.storageCapacityKwh || 0,
        storage_power_kw: params.storagePowerKw || 0,
        annual_load_kwh: params.annualLoadKwh || 0,
        include_hourly_data: params.includeHourly ?? true,
      })
    ).then(res => res.data);
  }

  // ========== 离线降级计算 ==========

  // 当API不可用时，使用本地计算
  async calculateSolarOffline(params: SolarParams): Promise<CalculationResult> {
    // 简化的本地计算
    const totalGeneration = params.capacity * (params.yieldHours || 1100);
    const selfUseRatio = params.selfUseRatio || 0.8;
    const buyPrice = params.buyPrice || 0.8;
    const sellPrice = params.sellPrice || 0.35;
    const costPerW = params.costPerW || 3.0;

    const selfUseKwh = totalGeneration * selfUseRatio;
    const feedInKwh = totalGeneration * (1 - selfUseRatio);
    const annualRevenue = (selfUseKwh * buyPrice) + (feedInKwh * sellPrice);

    const investment = params.capacity * 1000 * costPerW / 10000; // 万元
    const annualMaintenance = investment * 0.01;
    const annualNetCashflow = (annualRevenue / 10000) - annualMaintenance;

    const { roi, irr, payback } = this.calculateFinancials(
      investment,
      annualNetCashflow,
      25
    );

    return {
      investment: Number(investment.toFixed(2)),
      annual_saving: Number(annualNetCashflow.toFixed(2)),
      roi: Number(roi.toFixed(2)),
      irr: Number(irr.toFixed(2)),
      payback_period: Number(payback.toFixed(2)),
      npv: 0,
      carbon_reduction: Number((totalGeneration * 0.0005703).toFixed(2)),
      calculation_details: {
        note: '离线模式计算',
      },
    };
  }

  // ========== 辅助计算方法 ==========

  private calculateFinancials(
    investment: number,
    annualNetCashflow: number,
    lifespanYears: number
  ): { roi: number; irr: number; payback: number } {
    if (investment <= 0) {
      return { roi: 0, irr: 0, payback: 0 };
    }

    // 回收期
    const payback = annualNetCashflow > 0 ? investment / annualNetCashflow : Infinity;

    // ROI
    const totalReturn = annualNetCashflow * lifespanYears - investment;
    const roi = investment > 0 ? (totalReturn / investment) * 100 : 0;

    // IRR (简化计算)
    let irr = 0;
    for (let i = 1; i <= 100; i++) {
      const rate = i / 100;
      let npv = -investment;
      for (let year = 1; year <= lifespanYears; year++) {
        npv += annualNetCashflow / Math.pow(1 + rate, year);
      }
      if (Math.abs(npv) < 0.001) {
        irr = rate;
        break;
      }
    }

    return { roi, irr: irr * 100, payback };
  }

  // ========== 检查API可用性 ==========

  async checkHealth(): Promise<boolean> {
    try {
      await this.client.get('/health', { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}

// 导出单例
export const calculationService = new CalculationService();
