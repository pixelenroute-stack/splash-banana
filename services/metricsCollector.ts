
import { db } from './mockDatabase';

export interface ApiMetric {
  id: string;
  timestamp: number;
  model: string;
  operation: 'generateContent' | 'generateImage' | 'generateVideo' | 'chat';
  inputTokens: number;
  outputTokens: number;
  latency: number;
  success: boolean;
  errorCode?: string;
  retryCount: number;
  cacheHit: boolean;
  cost: number;
}

export interface AggregatedStats {
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  avgLatency: number;
  totalTokens: number;
  totalCost: number;
  rpm: number; // Avg requests per minute (last 1h)
  // Added for tests and detailed breakdown
  byProvider: Record<string, number>;
  byRequestType: Record<string, number>;
  today: number;
  month: number;
}

export interface Alert {
  id: string;
  type: 'error_rate' | 'quota' | 'latency' | 'cost';
  message: string;
  timestamp: string;
  severity: 'warning' | 'critical';
}

const PRICING = {
  'gemini-3-flash': { input: 0.10 / 1000000, output: 0.40 / 1000000 },
  'gemini-3-pro': { input: 1.25 / 1000000, output: 5.00 / 1000000 },
  'gemini-2.5-flash-image': { perImage: 0.04 },
  'veo-3.1': { perSecond: 0.10 },
  'default': { input: 0.50 / 1000000, output: 1.50 / 1000000 }
};

class MetricsCollector {
  private metrics: ApiMetric[] = [];
  private alerts: Alert[] = [];
  private readonly MAX_HISTORY = 5000;

  constructor() {
    this.load();
  }

  private load() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sb_metrics');
        if (saved) this.metrics = JSON.parse(saved);
        const savedAlerts = localStorage.getItem('sb_alerts');
        if (savedAlerts) this.alerts = JSON.parse(savedAlerts);
      } catch (e) {
        console.error("Failed to load metrics", e);
      }
    }
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sb_metrics', JSON.stringify(this.metrics.slice(0, this.MAX_HISTORY)));
      localStorage.setItem('sb_alerts', JSON.stringify(this.alerts.slice(0, 50)));
    }
  }

  private calculateCost(metric: Partial<ApiMetric>): number {
    const model = metric.model || 'default';
    let cost = 0;

    if (model.includes('image')) {
      cost = (PRICING['gemini-2.5-flash-image']?.perImage || 0.04);
    } else if (model.includes('veo')) {
      // Assuming 5s default if not specified elsewhere, Veo usually per second generated
      cost = (PRICING['veo-3.1']?.perSecond || 0.10) * 5; 
    } else {
      // Text models
      const price = Object.entries(PRICING).find(([k]) => model.includes(k))?.[1] || PRICING.default;
      if ('input' in price) { // Type guard logic
         cost += (metric.inputTokens || 0) * (price.input || 0);
         cost += (metric.outputTokens || 0) * (price.output || 0);
      }
    }
    return parseFloat(cost.toFixed(6));
  }

  logRequest(data: Omit<ApiMetric, 'id' | 'cost'>) {
    const metric: ApiMetric = {
      id: `mtr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      ...data,
      cost: 0
    };
    
    metric.cost = this.calculateCost(metric);
    
    this.metrics.unshift(metric);
    if (this.metrics.length > this.MAX_HISTORY) this.metrics.pop();
    
    this.checkAlerts();
    this.save();
  }

  getMetrics(limit = 100): ApiMetric[] {
    return this.metrics.slice(0, limit);
  }

  getStats(timeWindowMs: number = 24 * 60 * 60 * 1000): AggregatedStats {
    const now = Date.now();
    const windowMetrics = this.metrics.filter(m => m.timestamp > now - timeWindowMs);
    
    const totalRequests = windowMetrics.length;
    const totalErrors = windowMetrics.filter(m => !m.success).length;
    const totalLatency = windowMetrics.reduce((acc, m) => acc + m.latency, 0);
    const totalTokens = windowMetrics.reduce((acc, m) => acc + (m.inputTokens || 0) + (m.outputTokens || 0), 0);
    const totalCost = windowMetrics.reduce((acc, m) => acc + m.cost, 0);

    // RPM Calculation (based on time window or 1 hour if window is larger)
    const minutesInWindow = Math.min(timeWindowMs / 60000, 60); 
    const rpm = totalRequests > 0 ? (totalRequests / minutesInWindow) : 0;

    // Detailed stats for Dashboard & Tests
    const byProvider: Record<string, number> = {};
    const byRequestType: Record<string, number> = {};
    let today = 0;
    let month = 0;

    this.metrics.forEach(m => {
        const isToday = m.timestamp > now - 24 * 60 * 60 * 1000;
        const isMonth = m.timestamp > now - 30 * 24 * 60 * 60 * 1000;
        
        if (isToday) today += m.cost;
        if (isMonth) month += m.cost;
    });

    windowMetrics.forEach(m => {
        let provider = 'other';
        const modelLower = m.model.toLowerCase();
        if (modelLower.includes('gemini') || modelLower.includes('banana')) provider = 'gemini';
        else if (modelLower.includes('gpt') || modelLower.includes('openai')) provider = 'openai';
        else if (modelLower.includes('claude') || modelLower.includes('anthropic')) provider = 'anthropic';
        else if (modelLower.includes('veo')) provider = 'veo';
        else if (modelLower.includes('perplexity')) provider = 'perplexity';
        else if (m.model === 'DevAPI' || m.model === 'Local/Mock') provider = 'system';

        byProvider[provider] = (byProvider[provider] || 0) + m.cost;
        byRequestType[m.operation] = (byRequestType[m.operation] || 0) + 1;
    });

    return {
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      avgLatency: totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0,
      totalTokens,
      totalCost,
      rpm,
      byProvider,
      byRequestType,
      today,
      month
    };
  }

  getAlerts(): Alert[] {
    return this.alerts;
  }

  private checkAlerts() {
    const stats = this.getStats(60 * 60 * 1000); // Last hour
    const newAlerts: Alert[] = [];

    // 1. Error Rate > 10% (if enough traffic)
    if (stats.totalRequests > 10 && stats.errorRate > 10) {
      this.addUniqueAlert({
        type: 'error_rate',
        message: `Taux d'erreur élevé détecté : ${stats.errorRate.toFixed(1)}% sur la dernière heure.`,
        severity: 'critical'
      });
    }

    // 2. High Latency > 10s avg
    if (stats.avgLatency > 10000) {
      this.addUniqueAlert({
        type: 'latency',
        message: `Latence critique : ${stats.avgLatency}ms en moyenne.`,
        severity: 'warning'
      });
    }

    // 3. Cost > 5$ (Daily budget mock)
    if (stats.totalCost > 5.0) {
      this.addUniqueAlert({
        type: 'cost',
        message: `Budget journalier dépassé : ${stats.totalCost.toFixed(2)}$ consommés.`,
        severity: 'warning'
      });
    }
  }

  private addUniqueAlert(alert: Omit<Alert, 'id' | 'timestamp'>) {
    // Avoid spamming same alert type within 1 hour
    const recent = this.alerts.find(a => 
      a.type === alert.type && 
      new Date(a.timestamp).getTime() > Date.now() - 3600000
    );
    
    if (!recent) {
      this.alerts.unshift({
        id: `alt_${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...alert
      });
    }
  }

  clearMetrics() {
    this.metrics = [];
    this.alerts = [];
    this.save();
  }
}

export const metricsCollector = new MetricsCollector();
