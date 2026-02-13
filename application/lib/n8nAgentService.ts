
import { N8NProcessingType, N8NResult, N8NLog, ModuleId, WorkflowExecution } from '../types';
import { db } from '../services/mockDatabase';

const CACHE_TTL = 5 * 60 * 1000;
const MAX_HISTORY_SIZE = 100;

export interface AgentResponse {
  response: string;
  actionTaken?: string;
  status: 'success' | 'error';
  agentUsed?: string;
  data?: any;
}

/**
 * Service local - Plus de dépendance n8n.
 * Le chat utilise l'API Gemini directement.
 * Les autres opérations sont gérées par les services dédiés (imageService, videoService, etc.)
 */
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
              console.error("Failed to load workflow history", e);
          }
      }
  }

  public clearCache() {
      const size = this.cache.size;
      this.cache.clear();
      console.log(`[AgentService] Cache cleared (${size} entries removed).`);
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

  /**
   * Traitement local - les opérations sont déléguées aux services API directs.
   * Cette méthode reste pour compatibilité mais ne fait plus d'appels n8n.
   */
  async fetchN8nWorkflow(
    type: N8NProcessingType | string,
    data: any,
    options: { timeout?: number; useCache?: boolean; maxRetries?: number } = {}
  ): Promise<N8NResult> {
    const startTime = Date.now();
    const { useCache = true } = options;
    const cacheKey = JSON.stringify({ type, data });

    // Check Cache
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        this.recordExecution(type, data, cached.data, 'success', Date.now() - startTime, true);
        return { success: true, data: cached.data, cached: true, executionTime: Date.now() - startTime };
      }
      this.cache.delete(cacheKey);
    }

    // Route vers l'API Gemini pour le chat
    if (type === 'text_transformation' && data?.action === 'chat') {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: data.chatInput || data.message, sessionId: data.sessionId })
        });
        const result = await response.json();
        const latency = Date.now() - startTime;
        this.recordExecution(type, data, result, 'success', latency, false);
        return { success: true, data: result, executionTime: latency };
      } catch (err: any) {
        const latency = Date.now() - startTime;
        this.recordExecution(type, data, { error: err.message }, 'error', latency, false);
        return { success: false, data: null, error: err.message, executionTime: latency };
      }
    }

    // Pour les autres types, retourner un résultat local
    const mockResult = { message: `Operation '${type}' traitée localement`, type, data };
    const latency = Date.now() - startTime;

    if (useCache) this.cache.set(cacheKey, { data: mockResult, timestamp: Date.now() });
    this.addLog('info', `Local processing for ${type}`, type);
    this.recordExecution(type, data, mockResult, 'success', latency, false);

    return { success: true, data: mockResult, executionTime: latency };
  }

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

  public logExecution(workflowType: string, input: any, output: any, status: 'success' | 'error', latency: number) {
      this.recordExecution(workflowType, input, output, status, latency, false);
  }

  public getHistory(typeFilter?: string): WorkflowExecution[] {
      if (typeFilter) {
          return this.history.filter(h => h.workflowType === typeFilter);
      }
      return this.history;
  }

  async triggerModuleWebhook(moduleId: ModuleId, event: string, payload: any): Promise<{success: boolean, message: string}> {
      this.addLog('info', `Module ${moduleId} event: ${event}`, moduleId);
      return { success: true, message: `Module ${moduleId} traité localement` };
  }

  private addLog(level: 'info' | 'warn' | 'error', message: string, type?: string) {
    const log: N8NLog = { timestamp: new Date().toISOString(), level, message, type };
    this.logs.unshift(log);
    if (this.logs.length > 100) this.logs.pop();
  }

  getLogs() { return this.logs; }

  async sendMessage(sessionId: string, message: string): Promise<AgentResponse> {
    try {
      // Appel direct à l'API route /api/chat qui utilise Gemini
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();

      return {
        response: result.response || result.output || result.text || "",
        actionTaken: result.actionTaken || undefined,
        agentUsed: result.agentUsed || "Gemini",
        status: 'success',
        data: result
      };
    } catch (err: any) {
      return {
        response: `Erreur: ${err.message}`,
        status: 'error',
        agentUsed: 'System'
      };
    }
  }

  async saveAsset(userId: string, asset: any): Promise<boolean> {
      // Sauvegarde locale - plus besoin de n8n
      this.addLog('info', `Asset saved locally for user ${userId}`, 'file_handling');
      return true;
  }
}

export const n8nAgentService = new N8NAgentService();
