
import { configService } from './configService';
import { circuitBreaker } from './circuitBreaker';
import { APIRequest, APIResponse } from '../types';
import { metricsCollector } from './metricsCollector';

const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 8000,
  multiplier: 2
};

export class APIRouter {
  
  private async retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
    let delay = RETRY_CONFIG.initialDelay;
    
    for (let i = 0; i < RETRY_CONFIG.maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === RETRY_CONFIG.maxRetries - 1) throw error;
        console.warn(`[APIRouter] Retry attempt ${i + 1}/${RETRY_CONFIG.maxRetries} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * RETRY_CONFIG.multiplier, RETRY_CONFIG.maxDelay);
      }
    }
    throw new Error('Unreachable');
  }

  /**
   * Main Route method - Production Mode Only (Webhooks)
   */
  async route<T>(module: string, action: string, payload: any): Promise<APIResponse<T>> {
    const settings = await configService.getActiveConfig();
    const startTime = Date.now();

    try {
      let data: T;
      const providerName = 'n8n Webhook';

      // --- PROD MODE : n8n Webhooks ---
      let webhookConfig = settings.webhooks?.[module as keyof typeof settings.webhooks];
      if (!webhookConfig && module === 'chat_simple') webhookConfig = settings.webhooks.chat;
      
      if (!webhookConfig || !webhookConfig.enabled || !webhookConfig.url) {
           throw new Error(`Aucun webhook configuré pour le module ${module}`);
      }

      const webhookUrl = webhookConfig.url;
      const requestBody = { action, payload, userId: 'user_1', timestamp: Date.now() };

      data = await circuitBreaker.execute(webhookUrl, async () => {
          return await this.retryWithBackoff(async () => {
              const response = await fetch(webhookUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(requestBody)
              });

              if (!response.ok) {
                  const errBody = await response.text(); 
                  throw new Error(`n8n HTTP ${response.status}: ${errBody.substring(0, 100)}`);
              }

              // SAFE JSON PARSING
              const text = await response.text();
              if (!text) return {} as T;
              try {
                  return JSON.parse(text);
              } catch (e) {
                  console.warn(`[APIRouter] Non-JSON response from ${webhookUrl}`);
                  return { text } as unknown as T;
              }
          });
      });

      metricsCollector.logRequest({
          timestamp: Date.now(), model: providerName, operation: 'chat', inputTokens: 0, outputTokens: 0,
          latency: Date.now() - startTime, success: true, retryCount: 0, cacheHit: false
      });

      return {
        success: true,
        data,
        meta: { executionTime: Date.now() - startTime, cached: false, provider: providerName }
      };

    } catch (error) {
      console.error(`[APIRouter] Error in ${module}/${action}:`, error);
      metricsCollector.logRequest({
          timestamp: Date.now(), model: 'n8n', operation: 'chat', inputTokens: 0, outputTokens: 0,
          latency: Date.now() - startTime, success: false, errorCode: (error as Error).message, retryCount: 0, cacheHit: false
      });

      return {
        success: false,
        error: { code: 'EXECUTION_FAILED', message: (error as Error).message, retryable: true },
        meta: { executionTime: Date.now() - startTime, cached: false, provider: 'Error' }
      };
    }
  }

  async routeRequest(request: APIRequest): Promise<{ content: string, provider: string, cost: number, tokensUsed: number, cached: boolean, executionTime: number }> {
      let module = 'chat';
      let action = 'generate';
      let payload: any = { prompt: request.prompt };

      const reqType = request.type as string;

      if (reqType === 'image_generation') module = 'images';
      else if (reqType === 'viral_trends_research' || reqType === 'news_generation') {
          module = 'chat';
          action = 'perplexity'; // Mapped to chat webhook action inside n8n
      } else if (reqType === 'code_analysis') {
          module = 'chat';
          payload.system = request.context;
      }

      const res = await this.route<string>(module, action, payload);
      
      let contentStr = "";
      if (!res.success) {
          contentStr = `Error: ${res.error?.message || "Unknown error"}`;
      } else if (typeof res.data === 'string') {
          contentStr = res.data;
      } else if (res.data && typeof res.data === 'object') {
          if ('text' in res.data && typeof (res.data as any).text === 'string') {
              contentStr = (res.data as any).text;
          } else if ('choices' in res.data) { // Standard format
              contentStr = (res.data as any).choices?.[0]?.message?.content || "";
          } else if ('output' in res.data) {
              contentStr = (res.data as any).output;
          } else {
              contentStr = JSON.stringify(res.data);
          }
      } else {
          contentStr = "Erreur: Réponse vide ou malformée.";
      }

      return {
          content: contentStr,
          provider: res.meta?.provider as any || 'system',
          cost: 0, tokensUsed: 0, cached: res.meta?.cached || false, executionTime: res.meta?.executionTime || 0
      };
  }
  
  async getCostMetrics() { return metricsCollector.getStats(); }
  public clearCache() { console.log("[APIRouter] Cache cleared."); }
}

export const apiRouter = new APIRouter();
