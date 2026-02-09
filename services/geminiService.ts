
import { GoogleGenerativeAI as GoogleGenAI, GenerateContentResult as GenerateContentResponse } from "@google/generative-ai";
import { db } from './mockDatabase';
import { MoodboardData, CreativeAnalysisData, SystemReport } from '../types';
import { metricsCollector } from './metricsCollector';

// --- CONFIGURATION CONSTANTS ---

const SUPPORTED_MODELS = {
  TEXT_FAST: 'gemini-3-flash-preview', // Beaucoup plus rapide pour le chat interactif
  TEXT_PRO: 'gemini-3-pro-preview',    // Réservé aux analyses complexes
  IMAGE: 'gemini-2.5-flash-image', 
  VIDEO: 'veo-3.1-fast-generate-preview' 
} as const;

const RETRY_CONFIG = {
  MAX_RETRIES: 3, // Réduit pour éviter d'attendre trop longtemps en cas d'erreur
  INITIAL_DELAY_MS: 500,
  MAX_DELAY_MS: 5000,
  MULTIPLIER: 1.5
};

// --- CUSTOM ERRORS ---

export class JsonParsingError extends Error {
  constructor(message: string, public rawText: string) {
    super(message);
    this.name = 'JsonParsingError';
  }
}

export class GeminiServiceError extends Error {
  constructor(message: string, public code: string, public retryable: boolean) {
    super(message);
    this.name = 'GeminiServiceError';
  }
}

// --- SERVICE IMPLEMENTATION ---

export class GeminiService {
  
  // --- 1. INITIALIZATION & VALIDATION ---

  private validateApiKey(key: string | undefined, sourceName: string): string {
      if (!key || key.trim() === '') {
          throw new GeminiServiceError(
              `GEMINI_API_KEY manquante (${sourceName}). Configurez-la dans Admin > Infrastructure.`,
              'MISSING_API_KEY',
              false
          );
      }
      const cleanKey = key.trim();
      if (!cleanKey.startsWith('AIza') && !cleanKey.includes('placeholder')) {
          console.warn(`[Security] Potential invalid API Key format in ${sourceName}`);
      }
      return cleanKey;
  }

  private getAI(useBackup: boolean = false, overrideKey?: string): GoogleGenAI {
    if (overrideKey) {
        return new GoogleGenAI({ apiKey: overrideKey });
    }

    const settings = db.getSystemSettings();
    const adminKey = settings.aiConfig?.geminiKey || settings.contentCreation?.value;

    if (adminKey) {
        try {
            const key = this.validateApiKey(adminKey, 'Admin Settings');
            return new GoogleGenAI({ apiKey: key });
        } catch (e) {
            console.debug("Clé Admin invalide ou manquante, vérification ENV...");
        }
    }

    const primaryKey = process.env.GEMINI_API_KEY;
    const backupKey = process.env.GEMINI_API_KEY_BACKUP;
    let selectedKey = useBackup ? backupKey : primaryKey;

    if (!selectedKey && !useBackup && backupKey) {
        selectedKey = backupKey;
    }

    const finalKey = selectedKey || "mock_key_to_prevent_init_crash";
    return new GoogleGenAI({ apiKey: finalKey });
  }

  private isRetryableError(error: any): boolean {
    const status = error.status || error.code;
    const msg = (error.message || '').toLowerCase();
    if ([429, 503, 504].includes(status)) return true;
    if (msg.includes('resource_exhausted') || msg.includes('too many requests') || msg.includes('quota') || msg.includes('service unavailable') || msg.includes('timeout')) {
      return true;
    }
    return false;
  }

  private async retryWithBackoff<T>(operation: () => Promise<T>, context: string): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await operation();
      } catch (error: any) {
        attempt++;
        if (attempt > RETRY_CONFIG.MAX_RETRIES || !this.isRetryableError(error)) {
          if (!this.isRetryableError(error)) {
             console.error(`[Gemini] ${context} failed with non-retryable error: ${JSON.stringify(error)}`);
          }
          throw error;
        }
        const exponentialDelay = RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.MULTIPLIER, attempt - 1);
        const jitter = Math.random() * 200;
        const delay = Math.min(exponentialDelay + jitter, RETRY_CONFIG.MAX_DELAY_MS);
        console.warn(`[Gemini] ${context} failed (Attempt ${attempt}). Retrying in ${Math.round(delay)}ms.`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private async executeWithKeyRotation<T>(operationBuilder: (ai: GoogleGenAI) => Promise<T>, context: string): Promise<T> {
      try {
          return await this.retryWithBackoff(async () => {
              const ai = this.getAI(false);
              return await operationBuilder(ai);
          }, context);
      } catch (e: any) {
          const isQuota = e.status === 429 || e.message?.includes('RESOURCE_EXHAUSTED');
          const isAuth = e.status === 403 || (e.status === 400 && /API key|auth/i.test(e.message || ''));
          const hasBackup = !!process.env.GEMINI_API_KEY_BACKUP;

          if ((isQuota || isAuth) && hasBackup) {
              console.warn(`[GeminiService] ${context} failed on Primary Key (${e.status}). Rotating to Backup Key...`);
              try {
                  return await this.retryWithBackoff(async () => {
                      const ai = this.getAI(true);
                      return await operationBuilder(ai);
                  }, `${context} (Backup)`);
              } catch (backupError: any) {
                  throw backupError; 
              }
          }
          if (isAuth) {
              throw new GeminiServiceError("Clé API invalide ou révoquée. Vérifiez les paramètres Admin.", 'AUTH_ERROR', false);
          }
          throw e;
      }
  }

  private cleanJsonText(text: string): string {
    if (!text) return "{}";
    const strategies = [
      (t: string) => t,
      (t: string) => { const match = t.match(/```json\s*([\s\S]*?)\s*```/); return match ? match[1] : null; },
      (t: string) => { const match = t.match(/```\s*([\s\S]*?)\s*```/); return match ? match[1] : null; },
      (t: string) => { const firstOpen = t.indexOf('{'); const lastClose = t.lastIndexOf('}'); return (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) ? t.substring(firstOpen, lastClose + 1) : null; }
    ];
    for (const extract of strategies) {
      const candidate = extract(text);
      if (candidate) {
        try { const trimmed = candidate.trim(); JSON.parse(trimmed); return trimmed; } catch (e) {}
      }
    }
    throw new JsonParsingError(`Failed to extract valid JSON from response.`, text);
  }

  private getSafeConfigForModel(modelName: string, baseConfig?: any): any {
    const config = { ...baseConfig };
    // Optimisation: Pas de temperature élevée pour les modèles 3.x Flash sauf créativité explicite
    if (!config.temperature) {
        config.temperature = 0.7; 
    }
    return config;
  }

  public async testApiKey(key?: string): Promise<boolean> {
      try {
          const ai = key ? new GoogleGenAI({ apiKey: key }) : this.getAI();
          await ai.models.countTokens({
              model: SUPPORTED_MODELS.TEXT_FAST,
              contents: [{ parts: [{ text: 'ping' }] }]
          });
          return true;
      } catch (e: any) {
          console.error("[Gemini] Health Check Failed:", e.message);
          return false;
      }
  }

  async simpleChat(message: string): Promise<string> {
      // Utilise le modèle Flash pour une réponse ultra-rapide
      const model = SUPPORTED_MODELS.TEXT_FAST;
      try {
          const response = await this.executeWithKeyRotation(async (ai) => {
              return await ai.models.generateContent({
                  model: model,
                  contents: { parts: [{ text: message }] },
                  config: { temperature: 0.7, maxOutputTokens: 500 } // Limite tokens pour vitesse
              });
          }, 'simpleChat');
          return response.text || "";
      } catch (e) {
          console.error("[Gemini] Simple Chat Error:", e);
          throw e;
      }
  }

  async sendMessage(message: string, usePro: boolean = false): Promise<{ text: string }> {
    const startTime = Date.now();
    // Par défaut on utilise Flash pour la réactivité, sauf si Pro est demandé explicitement
    let modelUsed = usePro ? SUPPORTED_MODELS.TEXT_PRO : SUPPORTED_MODELS.TEXT_FAST;
    
    try {
        const response = await this.executeWithKeyRotation(async (ai) => {
            return await ai.models.generateContent({
                model: modelUsed,
                contents: { parts: [{ text: message }] },
                config: { 
                    systemInstruction: "Tu es PixelBot, l'assistant de production expert vidéo.",
                    temperature: 0.7
                }
            });
        }, 'sendMessage');
        
        metricsCollector.logRequest({
            timestamp: Date.now(), model: modelUsed, operation: 'chat',
            inputTokens: response.usageMetadata?.promptTokenCount || 0,
            outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
            latency: Date.now() - startTime, success: true, retryCount: 0, cacheHit: false
        });
        
        return { text: response.text || "" };
    } catch (e: any) {
        metricsCollector.logRequest({
            timestamp: Date.now(), model: modelUsed, operation: 'chat',
            inputTokens: 0, outputTokens: 0, latency: Date.now() - startTime,
            success: false, errorCode: e.code || 'UNKNOWN', retryCount: 0, cacheHit: false
        });
        throw e;
    }
  }

  async generateMoodboard(input: string, isUrl: boolean = false): Promise<MoodboardData> {
      // Pour la DA, on garde le modèle Pro car la structure JSON est complexe
      const model = SUPPORTED_MODELS.TEXT_PRO;
      const startTime = Date.now();
      try {
          const config: any = { responseMimeType: 'application/json', temperature: 0.7 };
          const response = await this.executeWithKeyRotation(async (ai) => {
              return await ai.models.generateContent({
                  model: model, contents: { parts: [{ text: input }] },
                  config: this.getSafeConfigForModel(model, config)
              });
          }, 'generateMoodboard');
          
          if (response.text) {
              const jsonStr = this.cleanJsonText(response.text);
              return JSON.parse(jsonStr) as MoodboardData;
          }
          throw new Error("Empty response from Moodboard generation");
      } catch (e: any) {
          throw e;
      }
  }

  // ... (Méthodes Images/Vidéos inchangées car elles utilisent déjà les modèles spécialisés) ...
  
  async generateImage(prompt: string, aspectRatio: string): Promise<string> {
      const model = SUPPORTED_MODELS.IMAGE;
      const startTime = Date.now();
      try {
          const response = await this.executeWithKeyRotation(async (ai) => {
              return await ai.models.generateContent({
                  model: model, contents: { parts: [{ text: prompt }] },
                  config: { imageConfig: { aspectRatio: aspectRatio as any, imageSize: '1K' } }
              });
          }, 'generateImage');
          metricsCollector.logRequest({
              timestamp: Date.now(), model: model, operation: 'generateImage',
              inputTokens: 0, outputTokens: 0, latency: Date.now() - startTime,
              success: true, retryCount: 0, cacheHit: false
          });
          for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) { return `data:image/png;base64,${part.inlineData.data}`; }
          }
          throw new Error("No image data in response");
      } catch (e: any) {
          throw e;
      }
  }

  async generateVideo(prompt: string): Promise<string> {
      const model = SUPPORTED_MODELS.VIDEO;
      const startTime = Date.now();
      try {
          let operation = await this.executeWithKeyRotation(async (ai) => {
              return await ai.models.generateVideos({
                  model: model, prompt: prompt,
                  config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
              });
          }, 'generateVideo_Start');
          while (!operation.done) {
              await new Promise(resolve => setTimeout(resolve, 5000));
              const ai = this.getAI(); 
              operation = await ai.operations.getVideosOperation({ operation });
          }
          metricsCollector.logRequest({
              timestamp: Date.now(), model: model, operation: 'generateVideo',
              inputTokens: 0, outputTokens: 0, latency: Date.now() - startTime,
              success: true, retryCount: 0, cacheHit: false
          });
          const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
          if (!downloadLink) throw new Error("No video URI in response");
          return downloadLink;
      } catch (e: any) {
          throw e;
      }
  }

  // ... (Reste des méthodes)
  async analyzeSystemReport(report: any, apiKey?: string): Promise<string> {
      const prompt = `ROLE: Architecte Logiciel. Analyse ce rapport JSON et donne 3 recommandations courtes.\n${JSON.stringify(report)}`;
      try {
          const ai = apiKey ? new GoogleGenAI({ apiKey }) : this.getAI();
          // Flash suffit pour un résumé simple
          const response = await ai.models.generateContent({
              model: SUPPORTED_MODELS.TEXT_FAST, 
              contents: { parts: [{ text: prompt }] },
              config: { temperature: 0.2 } 
          });
          return response.text || "Erreur analyse.";
      } catch (e: any) {
          return `Échec: ${e.message}`;
      }
  }
}

export const geminiService = new GeminiService();
