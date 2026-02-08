
import { N8NProcessingType, N8NResult, N8NLog, ModuleId } from '../types';
import { db } from '../services/mockDatabase';

const DEFAULT_N8N_URL = 'https://n8n.srv1027050.hstgr.cloud/webhook/assistant-multi-agent'; // UPDATED URL
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface AgentResponse {
  response: string;      
  actionTaken?: string;  
  status: 'success' | 'error';
  agentUsed?: string;
  data?: any;           
}

class N8NAgentService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private logs: N8NLog[] = [];

  public clearCache() {
      const size = this.cache.size;
      this.cache.clear();
      console.log(`[N8NAgentService] Cache cleared (${size} entries removed).`);
  }

  private getWebhookUrl() {
      const settings = db.getSystemSettings();
      if (settings.chat.provider === 'n8n' && settings.chat.value) {
          return settings.chat.value;
      }
      return DEFAULT_N8N_URL;
  }

  /**
   * Orchestrateur principal de traitement n8n
   */
  async fetchN8nWorkflow(
    type: N8NProcessingType, 
    data: any, 
    options: { timeout?: number; useCache?: boolean; maxRetries?: number } = {}
  ): Promise<N8NResult> {
    const { timeout = 60000, useCache = true, maxRetries = 3 } = options;
    const cacheKey = JSON.stringify({ type, data });
    const startTime = Date.now();

    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return { success: true, data: cached.data, cached: true, executionTime: Date.now() - startTime };
      }
      this.cache.delete(cacheKey);
    }

    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(this.getWebhookUrl(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.API_KEY || 'splash-banana-secret'}`
          },
          body: JSON.stringify({ type, data, timestamp: new Date().toISOString() }),
          signal: controller.signal
        });

        clearTimeout(id);

        if (!response.ok) throw new Error(`n8n error: ${response.status}`);

        const resultData = await response.json();
        const finalData = Array.isArray(resultData) ? resultData[0] : resultData;
        
        if (useCache) this.cache.set(cacheKey, { data: finalData, timestamp: Date.now() });
        this.addLog('info', `Success for ${type}`, type);
        
        return { success: true, data: finalData, executionTime: Date.now() - startTime };

      } catch (err: any) {
        lastError = err;
        this.addLog('warn', `Attempt ${attempt} failed: ${err.message}`, type);
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }

    this.addLog('error', `Final failure for ${type}`, type);
    return { success: false, data: null, error: lastError.message, executionTime: Date.now() - startTime };
  }

  /**
   * Exécute un webhook configuré pour un module spécifique
   */
  async triggerModuleWebhook(moduleId: ModuleId, event: string, payload: any): Promise<{success: boolean, message: string}> {
      const settings = db.getSystemSettings();
      const moduleConfig = settings.modules[moduleId];

      if (!moduleConfig) {
          return { success: false, message: `Module ${moduleId} non configuré` };
      }

      if (!moduleConfig.enabled || !moduleConfig.n8n.webhookUrl) {
          this.addLog('warn', `Webhook skipped: ${moduleId} disabled`, moduleId);
          return { success: false, message: 'Webhook désactivé ou URL manquante' };
      }

      if (!moduleConfig.n8n.enabledEvents.includes(event)) {
          this.addLog('info', `Webhook skipped: Event ${event} not in triggers`, moduleId);
          return { success: true, message: 'Event ignoré (non configuré)' };
      }

      try {
          const response = await fetch(moduleConfig.n8n.webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  module: moduleId,
                  event,
                  payload,
                  timestamp: new Date().toISOString()
              })
          });

          if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
          
          this.addLog('info', `Webhook triggered for ${moduleId}/${event}`, moduleId);
          return { success: true, message: 'Webhook envoyé avec succès' };

      } catch (e: any) {
          this.addLog('error', `Webhook failed for ${moduleId}: ${e.message}`, moduleId);
          return { success: false, message: e.message };
      }
  }

  private addLog(level: 'info' | 'warn' | 'error', message: string, type?: string) {
    const log: N8NLog = { timestamp: new Date().toISOString(), level, message, type };
    this.logs.unshift(log);
    if (this.logs.length > 100) this.logs.pop();
  }

  getLogs() { return this.logs; }

  async sendMessage(sessionId: string, message: string): Promise<AgentResponse> {
    const res = await this.fetchN8nWorkflow('text_transformation' as any, { 
      action: 'chat', 
      chatInput: message, 
      message, 
      sessionId 
    });

    if (!res.success) {
      return { response: "Erreur de communication avec l'orchestrateur.", status: 'error', agentUsed: 'System' };
    }

    return {
      response: res.data?.response || res.data?.output || res.data?.text || "",
      actionTaken: res.data?.actionTaken || res.data?.action || undefined,
      agentUsed: res.data?.agentUsed || res.data?.agent || "Orchestrator",
      status: 'success',
      data: res.data
    };
  }

  async saveAsset(userId: string, asset: any): Promise<boolean> {
      const res = await this.fetchN8nWorkflow('file_handling', { action: 'upload', asset });
      return res.success;
  }

  /**
   * Send an action to a specific n8n webhook by key from settings.webhooks
   */
  async sendAction(webhookKey: string, payload: any, options: { timeout?: number } = {}): Promise<N8NResult> {
    const { timeout = 30000 } = options;
    const settings = db.getSystemSettings();
    const webhookConfig = settings.webhooks[webhookKey as keyof typeof settings.webhooks];

    if (!webhookConfig?.url || !webhookConfig?.enabled) {
      this.addLog('warn', `sendAction: webhook "${webhookKey}" not configured or disabled`, webhookKey);
      return { success: false, data: null, error: `Webhook "${webhookKey}" not configured` };
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(webhookConfig.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: webhookKey,
          data: payload,
          timestamp: new Date().toISOString()
        }),
        signal: controller.signal
      });

      clearTimeout(id);

      if (!response.ok) throw new Error(`n8n webhook error: ${response.status}`);

      const resultData = await response.json();
      const finalData = Array.isArray(resultData) ? resultData[0] : resultData;

      this.addLog('info', `sendAction success: ${webhookKey}/${payload.action}`, webhookKey);
      return { success: true, data: finalData, executionTime: Date.now() - startTime };

    } catch (err: any) {
      this.addLog('error', `sendAction failed: ${webhookKey} - ${err.message}`, webhookKey);
      return { success: false, data: null, error: err.message, executionTime: Date.now() - startTime };
    }
  }
}

export const n8nAgentService = new N8NAgentService();
