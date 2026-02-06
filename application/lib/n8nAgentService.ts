
import { N8NProcessingType, N8NResult, N8NLog, ModuleId, WorkflowExecution } from '../types';
import { db } from '../services/mockDatabase';

const DEFAULT_N8N_URL = 'https://n8n.srv1027050.hstgr.cloud/webhook/assistant-multi-agent'; // UPDATED URL
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_HISTORY_SIZE = 100;

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
  private history: WorkflowExecution[] = [];

  constructor() {
      if (typeof window !== 'undefined') {
          try {
              const savedHistory = localStorage.getItem('n8n_workflow_history');
              if (savedHistory) {
                  this.history = JSON.parse(savedHistory);
              }
          } catch (e) {
              console.error("Failed to load n8n history", e);
          }
      }
  }

  public clearCache() {
      const size = this.cache.size;
      this.cache.clear();
      console.log(`[N8NAgentService] Cache cleared (${size} entries removed).`);
  }

  public clearHistory() {
      this.history = [];
      this.saveHistory();
  }

  private saveHistory() {
      if (typeof window !== 'undefined') {
          localStorage.setItem('n8n_workflow_history', JSON.stringify(this.history.slice(0, MAX_HISTORY_SIZE)));
      }
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
    type: N8NProcessingType | string, 
    data: any, 
    options: { timeout?: number; useCache?: boolean; maxRetries?: number } = {}
  ): Promise<N8NResult> {
    const { timeout = 60000, useCache = true, maxRetries = 3 } = options;
    const cacheKey = JSON.stringify({ type, data });
    const startTime = Date.now();

    // Check Cache
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        this.recordExecution(type, data, cached.data, 'success', Date.now() - startTime, true);
        return { success: true, data: cached.data, cached: true, executionTime: Date.now() - startTime };
      }
      this.cache.delete(cacheKey);
    }

    // Determine Webhook URL based on type/module if specific config exists, else default chat webhook
    let targetUrl = this.getWebhookUrl();
    const settings = db.getSystemSettings();
    // Use type assertion or check if type is a valid key
    const hookKey = type as keyof typeof settings.webhooks;
    const specificHook = settings.webhooks?.[hookKey];
    if (specificHook && specificHook.enabled && specificHook.url) {
        targetUrl = specificHook.url;
    }

    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.API_KEY || 'splash-banana-secret'}`
          },
          body: JSON.stringify({ type, data, timestamp: new Date().toISOString() }),
          signal: controller.signal
        });

        clearTimeout(id);

        if (!response.ok) {
            // Tentative de lire le corps de l'erreur
            const errorText = await response.text();
            throw new Error(`n8n HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }

        const resultData = await response.json();
        const finalData = Array.isArray(resultData) ? resultData[0] : resultData;
        
        if (useCache) this.cache.set(cacheKey, { data: finalData, timestamp: Date.now() });
        this.addLog('info', `Success for ${type}`, type);
        
        const latency = Date.now() - startTime;
        this.recordExecution(type, data, finalData, 'success', latency, false);

        return { success: true, data: finalData, executionTime: latency };

      } catch (err: any) {
        lastError = err;
        this.addLog('warn', `Attempt ${attempt} failed: ${err.message}`, type);
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }

    const failureLatency = Date.now() - startTime;
    this.addLog('error', `Final failure for ${type}`, type);
    this.recordExecution(type, data, { error: lastError.message }, 'error', failureLatency, false);
    
    return { success: false, data: null, error: lastError.message, executionTime: failureLatency };
  }

  /**
   * Enregistre l'exécution complète (Req/Res) pour le monitoring interne
   */
  private recordExecution(workflowType: string, input: any, output: any, status: 'success' | 'error', latency: number, cached: boolean) {
      const exec: WorkflowExecution = {
          id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          workflowType,
          status,
          inputPayload: input,
          outputResponse: output,
          timestamp: new Date().toISOString(),
          latency,
          cached
      };
      
      this.history.unshift(exec);
      if (this.history.length > MAX_HISTORY_SIZE) this.history.pop();
      this.saveHistory();
  }

  /**
   * Méthode publique pour permettre aux autres services (ex: ConfigService, GoogleService)
   * d'enregistrer des exécutions N8N dans l'historique global.
   */
  public logExecution(workflowType: string, input: any, output: any, status: 'success' | 'error', latency: number) {
      this.recordExecution(workflowType, input, output, status, latency, false);
  }

  public getHistory(typeFilter?: string): WorkflowExecution[] {
      if (typeFilter) {
          return this.history.filter(h => h.workflowType === typeFilter);
      }
      return this.history;
  }

  /**
   * Exécute un webhook configuré pour un module spécifique
   */
  async triggerModuleWebhook(moduleId: ModuleId, event: string, payload: any): Promise<{success: boolean, message: string}> {
      const settings = db.getSystemSettings();
      // ModuleId maps to key in modules? No, modules is Record<string, any>.
      // Maybe it should map to webhooks keys?
      // Assuming modules config logic
      
      return this.fetchN8nWorkflow(moduleId, { event, payload }).then(res => ({
          success: res.success,
          message: res.success ? 'Webhook envoyé' : (res.error || 'Erreur inconnue')
      }));
  }

  private addLog(level: 'info' | 'warn' | 'error', message: string, type?: string) {
    const log: N8NLog = { timestamp: new Date().toISOString(), level, message, type };
    this.logs.unshift(log);
    if (this.logs.length > 100) this.logs.pop();
  }

  getLogs() { return this.logs; }

  async sendMessage(sessionId: string, message: string): Promise<AgentResponse> {
    const res = await this.fetchN8nWorkflow('text_transformation', { 
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
}

export const n8nAgentService = new N8NAgentService();
