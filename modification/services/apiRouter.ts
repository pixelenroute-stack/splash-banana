
import { geminiService } from './geminiService';
import { openAIService } from './openaiService';
import { perplexityService } from './perplexityService';
import { metricsCollector } from './metricsCollector';
import { APIRequest } from '../types';

// Cache simple avec expiration (TTL)
interface CacheEntry {
    content: string;
    timestamp: number;
    provider: string;
}

export class APIRouter {
  
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 1000 * 60 * 5; // 5 minutes cache

  private getCacheKey(request: APIRequest): string {
      return `${request.type}:${request.prompt}:${request.qualityRequired || 'std'}`;
  }

  async routeRequest(request: APIRequest): Promise<{ content: string, provider: string, cost: number, tokensUsed: number, cached: boolean, executionTime: number }> {
      const startTime = Date.now();
      const cacheKey = this.getCacheKey(request);

      // 1. Check Cache
      if (this.cache.has(cacheKey)) {
          const entry = this.cache.get(cacheKey)!;
          if (Date.now() - entry.timestamp < this.CACHE_TTL) {
              return {
                  content: entry.content,
                  provider: entry.provider,
                  cost: 0, tokensUsed: 0, cached: true, executionTime: Date.now() - startTime
              };
          } else {
              this.cache.delete(cacheKey);
          }
      }

      let contentStr = "";
      // Utilisation de Gemini Flash par défaut pour la vitesse
      let provider = 'gemini-flash'; 

      try {
          const reqType = request.type as string;

          if (reqType === 'chat_simple') {
              contentStr = await geminiService.simpleChat(request.prompt);
              provider = 'gemini-flash';
          } else if (reqType === 'image_generation') {
              contentStr = "Use imageService for generation.";
          } else if (reqType === 'viral_trends_research' || reqType === 'news_generation') {
              provider = 'perplexity';
              contentStr = await perplexityService.sendMessage(request.prompt);
          } else if (reqType === 'code_analysis' || request.qualityRequired === 'high') {
              // Pour la qualité haute, on utilise le modèle Pro (plus lent mais meilleur)
              provider = 'gemini-pro';
              const res = await geminiService.sendMessage(request.prompt, true); // true = force Pro
              contentStr = res.text;
          } else {
              // Default Chat: Flash (Fast)
              const res = await geminiService.sendMessage(request.prompt, false); // false = Flash
              contentStr = res.text;
          }

          // 2. Set Cache
          if (contentStr && !contentStr.startsWith("Error")) {
              this.cache.set(cacheKey, {
                  content: contentStr,
                  timestamp: Date.now(),
                  provider
              });
          }

          metricsCollector.logRequest({
              timestamp: Date.now(), model: provider, operation: 'chat', inputTokens: 0, outputTokens: 0,
              latency: Date.now() - startTime, success: true, retryCount: 0, cacheHit: false
          });

      } catch (error) {
          console.error(`[APIRouter] Error in ${request.type}:`, error);
          contentStr = `Error: ${(error as Error).message}`;
          metricsCollector.logRequest({
              timestamp: Date.now(), model: provider, operation: 'chat', inputTokens: 0, outputTokens: 0,
              latency: Date.now() - startTime, success: false, errorCode: (error as Error).message, retryCount: 0, cacheHit: false
          });
      }

      return {
          content: contentStr,
          provider: provider,
          cost: 0, tokensUsed: 0, cached: false, executionTime: Date.now() - startTime
      };
  }
  
  async getCostMetrics() { return metricsCollector.getStats(); }
  public clearCache() { 
      this.cache.clear();
      console.log("[APIRouter] Cache cleared."); 
  }
}

export const apiRouter = new APIRouter();
