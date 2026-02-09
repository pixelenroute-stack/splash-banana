
import { GoogleGenerativeAI, GenerativeModel, GenerateContentResult } from "@google/generative-ai";

// Type alias pour compatibilité
type GoogleGenAI = GoogleGenerativeAI;
import { db } from './mockDatabase';
import { MoodboardData, CreativeAnalysisData, SystemReport } from '../types';
import { metricsCollector } from './metricsCollector';

// --- CONFIGURATION CONSTANTS ---

const SUPPORTED_MODELS = {
  TEXT_FAST: 'gemini-3-flash-preview',
  TEXT_PRO: 'gemini-3-pro-preview', 
  IMAGE: 'gemini-2.5-flash-image', 
  VIDEO: 'veo-3.1-fast-generate-preview' 
} as const;

const RETRY_CONFIG = {
  MAX_RETRIES: 5,
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 32000,
  MULTIPLIER: 2
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

  /**
   * Validates and cleans the API Key.
   * Throws explicit errors for missing or malformed keys.
   */
  private validateApiKey(key: string | undefined, sourceName: string): string {
      if (!key || key.trim() === '') {
          throw new GeminiServiceError(
              `GEMINI_API_KEY manquante (${sourceName}). Configurez-la dans Admin > Infrastructure.`,
              'MISSING_API_KEY',
              false
          );
      }

      const cleanKey = key.trim();
      
      // On accepte les clés "placeholder" pour ne pas faire crasher l'app au boot,
      // mais les appels échoueront plus tard (géré par APIRouter).
      if (!cleanKey.startsWith('AIza') && !cleanKey.includes('placeholder')) {
          console.warn(`[Security] Potential invalid API Key format in ${sourceName}`);
      }

      return cleanKey;
  }

  /**
   * Factory to get the GoogleGenAI client.
   * Prioritizes Admin Settings > Environment Variables.
   */
  private getAI(useBackup: boolean = false, overrideKey?: string): GoogleGenAI {
    // 0. Override Key (For specific temporary usage like audit)
    if (overrideKey) {
        return new GoogleGenerativeAI( overrideKey);
    }

    // 1. Admin Settings Override (Highest priority, managed by app UI)
    const settings = db.getSystemSettings();
    // Support new specific key or legacy field
    const adminKey = settings.aiConfig?.geminiKey || settings.contentCreation?.value;

    if (adminKey) {
        try {
            const key = this.validateApiKey(adminKey, 'Admin Settings');
            return new GoogleGenerativeAI( key);
        } catch (e) {
            // Si la validation échoue, on continue pour voir si une variable d'env existe
            console.debug("Clé Admin invalide ou manquante, vérification ENV...");
        }
    }

    // 2. Environment Variables
    const primaryKey = process.env.GEMINI_API_KEY;
    const backupKey = process.env.GEMINI_API_KEY_BACKUP;

    // 3. Selection Logic
    let selectedKey = useBackup ? backupKey : primaryKey;

    // Auto-fallback
    if (!selectedKey && !useBackup && backupKey) {
        selectedKey = backupKey;
    }

    // Protection ultime pour éviter le crash de l'initialisation du service
    // Si aucune clé n'est trouvée, on retourne une instance avec une clé bidon.
    // L'appel échouera proprement plus tard.
    const finalKey = selectedKey || "mock_key_to_prevent_init_crash";
    
    return new GoogleGenerativeAI( finalKey);
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
        const jitter = Math.random() * 1000;
        const delay = Math.min(exponentialDelay + jitter, RETRY_CONFIG.MAX_DELAY_MS);
        console.warn(`[Gemini] ${context} failed (Attempt ${attempt}/${RETRY_CONFIG.MAX_RETRIES}). Retrying in ${Math.round(delay)}ms. Reason: ${error.message}`);
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
    console.error("[Gemini] Failed to parse JSON. Raw text preview:", text.substring(0, 200));
    throw new JsonParsingError(`Failed to extract valid JSON from response.`, text);
  }

  private getSafeConfigForModel(modelName: string, baseConfig?: any): any {
    const config = { ...baseConfig };
    if (!config.temperature) {
        if (modelName.includes('gemini-2') || modelName.includes('gemini-3')) config.temperature = 1.0;
        if (modelName.includes('gemini-1.5')) config.temperature = 1.0;
    }
    return config;
  }

  public async testApiKey(key?: string): Promise<boolean> {
      try {
          // Utilise la clé fournie ou celle par défaut
          const ai = key ? new GoogleGenerativeAI( key) : this.getAI();

          // Test simple avec génération de contenu
          const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
          await model.generateContent('ping');
          return true;
      } catch (e: any) {
          console.error("[Gemini] Health Check Failed:", e.message);
          return false;
      }
  }

  async simpleChat(message: string): Promise<string> {
      const model = SUPPORTED_MODELS.TEXT_FAST;
      try {
          const response = await this.executeWithKeyRotation(async (ai) => {
              return await ai.models.generateContent({
                  model: model,
                  contents: { parts: [{ text: message }] },
                  config: { temperature: 0.7 }
             );
          }, 'simpleChat');
          return response.text || "";
      } catch (e) {
          console.error("[Gemini] Simple Chat Error:", e);
          throw e;
      }
  }

  async sendMessage(message: string): Promise<{ text: string }> {
    const startTime = Date.now();
    let modelUsed = SUPPORTED_MODELS.TEXT_PRO;
    try {
        const response = await this.executeWithKeyRotation(async (ai) => {
            return await ai.models.generateContent({
                model: modelUsed,
                contents: { parts: [{ text: message }] },
                config: { systemInstruction: "Tu es PixelBot, l'assistant de production expert vidéo." }
           );
        }, 'sendMessage');
        metricsCollector.logRequest({
            timestamp: Date.now(), model: modelUsed, operation: 'chat',
            inputTokens: response.usageMetadata?.promptTokenCount || 0,
            outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
            latency: Date.now() - startTime, success: true, retryCount: 0, cacheHit: false
       );
        return { text: response.text || "" };
    } catch (e: any) {
        metricsCollector.logRequest({
            timestamp: Date.now(), model: modelUsed, operation: 'chat',
            inputTokens: 0, outputTokens: 0, latency: Date.now() - startTime,
            success: false, errorCode: e.code || 'UNKNOWN', retryCount: 0, cacheHit: false
       );
        throw e;
    }
  }

  async generateMoodboard(input: string, isUrl: boolean = false): Promise<MoodboardData> {
      const prompt = `RÔLE : Directeur Artistique... (prompt complet)... ${input} ...`;
      const model = SUPPORTED_MODELS.TEXT_PRO;
      const startTime = Date.now();
      try {
          const config: any = { responseMimeType: 'application/json', temperature: 0.7 };
          const response = await this.executeWithKeyRotation(async (ai) => {
              return await ai.models.generateContent({
                  model: model, contents: { parts: [{ text: prompt }] },
                  config: this.getSafeConfigForModel(model, config)
             );
          }, 'generateMoodboard');
          metricsCollector.logRequest({
              timestamp: Date.now(), model: model, operation: 'generateContent',
              inputTokens: response.usageMetadata?.promptTokenCount || 0,
              outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
              latency: Date.now() - startTime, success: true, retryCount: 0, cacheHit: false
         );
          if (response.text) {
              const jsonStr = this.cleanJsonText(response.text);
              return JSON.parse(jsonStr) as MoodboardData;
          }
          throw new Error("Empty response from Moodboard generation");
      } catch (e: any) {
          metricsCollector.logRequest({
              timestamp: Date.now(), model: model, operation: 'generateContent',
              inputTokens: 0, outputTokens: 0, latency: Date.now() - startTime,
              success: false, errorCode: e.message, retryCount: 0, cacheHit: false
         );
          throw e;
      }
  }

  async generateVideoScript(topic: string, format: string): Promise<string> {
      const prompt = `RÔLE : Scénariste Expert... (prompt complet)... ${topic} ...`;
      const model = SUPPORTED_MODELS.TEXT_PRO;
      const startTime = Date.now();
      try {
          const response = await this.executeWithKeyRotation(async (ai) => {
              return await ai.models.generateContent({
                  model: model, contents: { parts: [{ text: prompt }] },
                  config: { temperature: 0.8 }
             );
          }, 'generateVideoScript');
          metricsCollector.logRequest({
              timestamp: Date.now(), model: model, operation: 'generateContent',
              inputTokens: response.usageMetadata?.promptTokenCount || 0,
              outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
              latency: Date.now() - startTime, success: true, retryCount: 0, cacheHit: false
         );
          return response.text || "Erreur de génération du script.";
      } catch (e: any) {
          metricsCollector.logRequest({
              timestamp: Date.now(), model: model, operation: 'generateContent',
              inputTokens: 0, outputTokens: 0, latency: Date.now() - startTime,
              success: false, errorCode: e.message, retryCount: 0, cacheHit: false
         );
          throw e;
      }
  }

  async generateCreativeAnalysis(imagesBase64: string[], moodboardContext: MoodboardData | null, durationContext?: string): Promise<CreativeAnalysisData> {
      const prompt = `CONTEXTE : Analyse technique... (prompt complet)...`;
      const model = SUPPORTED_MODELS.TEXT_PRO;
      const startTime = Date.now();
      const parts: any[] = [{ text: prompt }];
      imagesBase64.slice(0, 3).forEach(img => {
          const match = img.match(/^data:(image\/\w+);base64,/);
          const mimeType = match ? match[1] : 'image/png';
          const cleanBase64 = img.replace(/^data:image\/\w+;base64,/, "");
          parts.push({ inlineData: { mimeType: mimeType, data: cleanBase64 });
     );
      try {
          const response = await this.executeWithKeyRotation(async (ai) => {
              return await ai.models.generateContent({
                  model: model, contents: { parts }, config: { responseMimeType: 'application/json' }
             );
          }, 'generateCreativeAnalysis');
          metricsCollector.logRequest({
              timestamp: Date.now(), model: model, operation: 'generateContent',
              inputTokens: response.usageMetadata?.promptTokenCount || 0,
              outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
              latency: Date.now() - startTime, success: true, retryCount: 0, cacheHit: false
         );
          if (response.text) {
              const jsonStr = this.cleanJsonText(response.text);
              return JSON.parse(jsonStr) as CreativeAnalysisData;
          }
          throw new Error("Empty response from Analysis");
      } catch (e: any) { console.error("Analysis Failed", e); throw e; }
  }

  async generateImage(prompt: string, aspectRatio: string): Promise<string> {
      const model = SUPPORTED_MODELS.IMAGE;
      const startTime = Date.now();
      try {
          const response = await this.executeWithKeyRotation(async (ai) => {
              return await ai.models.generateContent({
                  model: model, contents: { parts: [{ text: prompt }] },
                  config: { imageConfig: { aspectRatio: aspectRatio as any, imageSize: '1K' } }
             );
          }, 'generateImage');
          metricsCollector.logRequest({
              timestamp: Date.now(), model: model, operation: 'generateImage',
              inputTokens: 0, outputTokens: 0, latency: Date.now() - startTime,
              success: true, retryCount: 0, cacheHit: false
         );
          for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) { return `data:image/png;base64,${part.inlineData.data}`; }
          }
          throw new Error("No image data in response");
      } catch (e: any) {
          metricsCollector.logRequest({
              timestamp: Date.now(), model: model, operation: 'generateImage',
              inputTokens: 0, outputTokens: 0, latency: Date.now() - startTime,
              success: false, errorCode: e.message, retryCount: 0, cacheHit: false
         );
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
             );
          }, 'generateVideo_Start');
          while (!operation.done) {
              await new Promise(resolve => setTimeout(resolve, 5000));
              const ai = this.getAI(); 
              operation = await ai.operations.getVideosOperation({ operation);
          }
          metricsCollector.logRequest({
              timestamp: Date.now(), model: model, operation: 'generateVideo',
              inputTokens: 0, outputTokens: 0, latency: Date.now() - startTime,
              success: true, retryCount: 0, cacheHit: false
         );
          const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
          if (!downloadLink) throw new Error("No video URI in response");
          return downloadLink;
      } catch (e: any) {
          metricsCollector.logRequest({
              timestamp: Date.now(), model: model, operation: 'generateVideo',
              inputTokens: 0, outputTokens: 0, latency: Date.now() - startTime,
              success: false, errorCode: e.message, retryCount: 0, cacheHit: false
         );
          throw e;
      }
  }

  /**
   * Analyse le rapport de diagnostic système complet.
   * Utilise une clé API spécifique si fournie (pour la fenêtre d'audit), sinon la clé système.
   */
  async analyzeSystemReport(report: any, apiKey?: string): Promise<string> {
      const prompt = `
        ROLE: Tu es un Architecte Logiciel et Expert DevOps Senior (20 ans d'XP).
        CONTEXTE: Tu audites une application Web SaaS (Next.js, Supabase, N8N, Google APIs).
        
        DONNÉES DU SYSTÈME (JSON):
        ${JSON.stringify(report, null, 2)}
        
        TACHE:
        Rédige un rapport d'audit détaillé et sans complaisance.
        
        STRUCTURE ATTENDUE (Markdown):
        1. 📊 **Score de Santé Global** (/100) avec justification courte.
        2. 🚨 **Alertes Critiques** (S'il y en a, sinon "Aucune").
        3. 🏗️ **Analyse Architecture** : Critique des choix techniques visibles (Stack, Auth, DB).
        4. 🔌 **Intégrations & Webhooks** : État des connexions (N8N, Google, Supabase).
        5. 📈 **Performance & Coûts** : Analyse des métriques IA et DB.
        6. 💡 **Recommandations** : 3 actions concrètes pour améliorer la stabilité ou la sécurité.
        
        TON: Professionnel, technique, constructif.
      `;

      try {
          const ai = apiKey ? new GoogleGenerativeAI({ apiKey) : this.getAI();
          const response = await ai.models.generateContent({
              model: SUPPORTED_MODELS.TEXT_PRO, // Utilise le modèle Pro pour une analyse profonde
              contents: { parts: [{ text: prompt }] },
              config: { temperature: 0.2 } // Faible température pour plus de rigueur
         );
          return response.text || "Erreur lors de la génération du rapport.";
      } catch (e: any) {
          console.error("Erreur Audit IA:", e);
          return `Échec de l'analyse IA : ${e.message}. Vérifiez la clé API.`;
      }
  }

  /**
   * Génère un prompt complet pour Google AI Studio afin de corriger les erreurs détectées
   */
  async generateFixPrompt(report: SystemReport): Promise<string> {
      const failedTests = report.results.filter(r => r.status === 'fail');
      if (failedTests.length === 0) return "";

      return `
        CONTEXTE: Je développe une application Next.js 15 (TypeScript) SaaS. 
        J'ai lancé un test système complet et voici les erreurs rencontrées.
        
        ERREURS DÉTECTÉES:
        ${failedTests.map(t => `- [${t.module}] ${t.testName}: ${t.error}`).join('\n')}
        
        DÉTAILS TECHNIQUES DU RAPPORT JSON:
        ${JSON.stringify(failedTests, null, 2)}
        
        TACHE:
        Agis comme un Senior Software Engineer. Analyse ces erreurs et fournis :
        1. Une explication de la cause probable pour chaque erreur.
        2. Le code corrigé ou les étapes de configuration manquantes (ex: Env Vars, Permissions Google Cloud, Configuration N8N).
        3. Priorise les fixes critiques.
        
        Stack: Next.js 15, React 19, TailwindCSS, Supabase, Google APIs (Drive/Gmail), Gemini API.
      `.trim();
  }
}

export const geminiService = new GeminiService();
