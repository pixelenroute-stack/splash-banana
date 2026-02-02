import { GoogleGenerativeAI } from "@google/genai";
import { db } from './mockDatabase';
import { MoodboardData, CreativeAnalysisData, SystemReport } from '../types';
import { metricsCollector } from './metricsCollector';

// --- CONFIGURATION CONSTANTS ---
// Utilise les modèles Gemini actuels (2024-2025)
const SUPPORTED_MODELS = {
  TEXT_FLASH: 'gemini-1.5-flash',      // Rapide et économique
  TEXT_PRO: 'gemini-1.5-pro',          // Plus capable
  TEXT_FLASH_2: 'gemini-2.0-flash-exp', // Nouvelle génération (expérimental)
} as const;

const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 16000,
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

  /**
   * Récupère la clé API depuis les variables d'environnement ou les settings admin
   */
  private getApiKey(): string {
    // 1. Priorité aux variables d'environnement (côté serveur)
    if (typeof window === 'undefined') {
      const envKey = process.env.GEMINI_API_KEY;
      if (envKey && envKey.trim()) {
        return envKey.trim();
      }
    }

    // 2. Settings Admin (stockés dans la DB/localStorage)
    const settings = db.getSystemSettings();
    const adminKey = settings.aiConfig?.geminiKey;
    if (adminKey && adminKey.trim()) {
      return adminKey.trim();
    }

    // 3. Variable d'environnement publique (côté client si définie)
    if (typeof window !== 'undefined') {
      const publicKey = (window as any).__GEMINI_API_KEY__;
      if (publicKey && publicKey.trim()) {
        return publicKey.trim();
      }
    }

    throw new GeminiServiceError(
      'Clé API Gemini non configurée. Ajoutez GEMINI_API_KEY dans les variables d\'environnement ou dans Admin > Infrastructure.',
      'MISSING_API_KEY',
      false
    );
  }

  /**
   * Crée une instance du client Gemini
   */
  private getClient(): GoogleGenerativeAI {
    const apiKey = this.getApiKey();
    return new GoogleGenerativeAI(apiKey);
  }

  /**
   * Vérifie si une erreur est récupérable (retry)
   */
  private isRetryableError(error: any): boolean {
    const status = error.status || error.code;
    const msg = (error.message || '').toLowerCase();

    if ([429, 503, 504, 500].includes(status)) return true;
    if (msg.includes('resource_exhausted') ||
        msg.includes('too many requests') ||
        msg.includes('quota') ||
        msg.includes('overloaded') ||
        msg.includes('timeout')) {
      return true;
    }
    return false;
  }

  /**
   * Exécute avec retry et backoff exponentiel
   */
  private async retryWithBackoff<T>(operation: () => Promise<T>, context: string): Promise<T> {
    let attempt = 0;
    let lastError: any;

    while (attempt < RETRY_CONFIG.MAX_RETRIES) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        attempt++;

        if (!this.isRetryableError(error) || attempt >= RETRY_CONFIG.MAX_RETRIES) {
          break;
        }

        const exponentialDelay = RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.MULTIPLIER, attempt - 1);
        const jitter = Math.random() * 500;
        const delay = Math.min(exponentialDelay + jitter, RETRY_CONFIG.MAX_DELAY_MS);

        console.warn(`[Gemini] ${context} - Tentative ${attempt}/${RETRY_CONFIG.MAX_RETRIES}. Retry dans ${Math.round(delay)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Nettoie le texte pour extraire du JSON valide
   */
  private cleanJsonText(text: string): string {
    if (!text) return "{}";

    // Stratégies d'extraction JSON
    const strategies = [
      // 1. Texte brut
      (t: string) => t.trim(),
      // 2. Code block ```json
      (t: string) => {
        const match = t.match(/```json\s*([\s\S]*?)\s*```/);
        return match ? match[1].trim() : null;
      },
      // 3. Code block générique
      (t: string) => {
        const match = t.match(/```\s*([\s\S]*?)\s*```/);
        return match ? match[1].trim() : null;
      },
      // 4. Extraction entre {}
      (t: string) => {
        const firstOpen = t.indexOf('{');
        const lastClose = t.lastIndexOf('}');
        return (firstOpen !== -1 && lastClose > firstOpen)
          ? t.substring(firstOpen, lastClose + 1)
          : null;
      }
    ];

    for (const extract of strategies) {
      const candidate = extract(text);
      if (candidate) {
        try {
          JSON.parse(candidate);
          return candidate;
        } catch (e) {
          // Continue avec la stratégie suivante
        }
      }
    }

    console.error("[Gemini] Impossible d'extraire du JSON valide:", text.substring(0, 300));
    throw new JsonParsingError(`Impossible de lire la réponse du modèle (JSON invalide).`, text);
  }

  /**
   * Test de la clé API
   */
  public async testApiKey(): Promise<boolean> {
    try {
      const client = this.getClient();
      const model = client.getGenerativeModel({ model: SUPPORTED_MODELS.TEXT_FLASH });
      const result = await model.generateContent("Réponds uniquement 'OK'");
      return !!result.response?.text();
    } catch (e: any) {
      console.error("[Gemini] Test API échoué:", e.message);
      return false;
    }
  }

  /**
   * Chat simple (réponse texte)
   */
  async simpleChat(message: string): Promise<string> {
    const modelName = SUPPORTED_MODELS.TEXT_FLASH;

    try {
      const response = await this.retryWithBackoff(async () => {
        const client = this.getClient();
        const model = client.getGenerativeModel({ model: modelName });
        return await model.generateContent(message);
      }, 'simpleChat');

      return response.response?.text() || "";
    } catch (e: any) {
      console.error("[Gemini] simpleChat Error:", e.message);
      throw e;
    }
  }

  /**
   * Envoi de message avec contexte système
   */
  async sendMessage(message: string): Promise<{ text: string }> {
    const startTime = Date.now();
    const modelName = SUPPORTED_MODELS.TEXT_PRO;

    try {
      const response = await this.retryWithBackoff(async () => {
        const client = this.getClient();
        const model = client.getGenerativeModel({
          model: modelName,
          systemInstruction: "Tu es PixelBot, l'assistant de production expert vidéo de l'agence Splash Banana. Tu réponds en français de manière professionnelle et concise."
        });
        return await model.generateContent(message);
      }, 'sendMessage');

      const text = response.response?.text() || "";

      metricsCollector.logRequest({
        timestamp: Date.now(),
        model: modelName,
        operation: 'chat',
        inputTokens: response.response?.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.response?.usageMetadata?.candidatesTokenCount || 0,
        latency: Date.now() - startTime,
        success: true,
        retryCount: 0,
        cacheHit: false
      });

      return { text };
    } catch (e: any) {
      metricsCollector.logRequest({
        timestamp: Date.now(),
        model: modelName,
        operation: 'chat',
        inputTokens: 0,
        outputTokens: 0,
        latency: Date.now() - startTime,
        success: false,
        errorCode: e.code || e.message,
        retryCount: 0,
        cacheHit: false
      });
      throw e;
    }
  }

  /**
   * Génération de Moodboard (JSON structuré)
   */
  async generateMoodboard(input: string, isUrl: boolean = false): Promise<MoodboardData> {
    const modelName = SUPPORTED_MODELS.TEXT_PRO;
    const startTime = Date.now();

    const prompt = `
RÔLE : Tu es un Directeur Artistique Senior spécialisé en production vidéo.

TÂCHE : Analyse cette demande et génère un moodboard complet au format JSON.

DEMANDE : ${input}

FORMAT DE SORTIE (JSON uniquement, pas de texte avant/après) :
{
  "concept": {
    "title": "Titre du concept",
    "description": "Description détaillée de la direction artistique"
  },
  "colors": {
    "dominant": "Couleur dominante",
    "skin": "Tons de peau",
    "accents": "Couleurs d'accent",
    "description": "Description de la palette",
    "paletteHex": ["#hex1", "#hex2", "#hex3"]
  },
  "typography": {
    "style": "Style typographique",
    "animation": "Type d'animation texte",
    "effects": "Effets visuels"
  },
  "editing": {
    "pacing": "Rythme du montage",
    "transitions": "Types de transitions",
    "broll": "Style de B-roll",
    "style": "Style général de montage"
  },
  "sound": {
    "music": "Style musical",
    "sfx": "Effets sonores"
  },
  "grading": {
    "look": "Look de l'étalonnage",
    "reference": "Référence visuelle"
  },
  "critique": {
    "hypothesis": "Hypothèse créative",
    "counterpoint": "Point de vue alternatif",
    "flaw": "Faille potentielle",
    "differentiation": "Élément différenciateur"
  },
  "visual_prompts": ["prompt1", "prompt2", "prompt3"]
}`;

    try {
      const response = await this.retryWithBackoff(async () => {
        const client = this.getClient();
        const model = client.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: "application/json" }
        });
        return await model.generateContent(prompt);
      }, 'generateMoodboard');

      const text = response.response?.text() || "";
      const jsonStr = this.cleanJsonText(text);

      metricsCollector.logRequest({
        timestamp: Date.now(),
        model: modelName,
        operation: 'moodboard',
        inputTokens: response.response?.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.response?.usageMetadata?.candidatesTokenCount || 0,
        latency: Date.now() - startTime,
        success: true,
        retryCount: 0,
        cacheHit: false
      });

      return JSON.parse(jsonStr) as MoodboardData;
    } catch (e: any) {
      console.error("[Gemini] Moodboard Error:", e.message);
      throw e;
    }
  }

  /**
   * Génération de script vidéo
   */
  async generateVideoScript(topic: string, format: string): Promise<string> {
    const modelName = SUPPORTED_MODELS.TEXT_PRO;

    const prompt = `
RÔLE : Tu es un Scénariste Expert en contenu vidéo viral.

TÂCHE : Écris un script complet pour une vidéo ${format} sur le sujet suivant.

SUJET : ${topic}

FORMAT :
- Hook accrocheur (5 secondes)
- Introduction du problème
- Solution/Contenu principal
- Call-to-action

Réponds directement avec le script, sans introduction.`;

    try {
      const response = await this.retryWithBackoff(async () => {
        const client = this.getClient();
        const model = client.getGenerativeModel({ model: modelName });
        return await model.generateContent(prompt);
      }, 'generateVideoScript');

      return response.response?.text() || "Erreur de génération du script.";
    } catch (e: any) {
      console.error("[Gemini] Script Error:", e.message);
      throw e;
    }
  }

  /**
   * Analyse créative avec images
   */
  async generateCreativeAnalysis(
    imagesBase64: string[],
    moodboardContext: MoodboardData | null,
    durationContext?: string
  ): Promise<CreativeAnalysisData> {
    const modelName = SUPPORTED_MODELS.TEXT_PRO;

    const prompt = `
RÔLE : Tu es un Directeur Technique en post-production vidéo.

TÂCHE : Analyse ces images et génère un guide technique de montage au format JSON.

CONTEXTE : ${moodboardContext ? JSON.stringify(moodboardContext.concept) : 'Aucun moodboard fourni'}
DURÉE CIBLE : ${durationContext || '30 secondes'}

FORMAT DE SORTIE (JSON uniquement) :
{
  "artDirectionSummary": "Résumé de la direction artistique",
  "suggestions": [
    {
      "time": "00:00-00:05",
      "phrase": "Texte/voix off",
      "visual": "Description visuelle",
      "technicalGuide": "Instructions techniques"
    }
  ],
  "advancedTechniques": [
    {
      "id": "tech_1",
      "title": "Nom de la technique",
      "software": "After Effects",
      "difficulty": "Intermédiaire",
      "estimatedTime": "15 min",
      "description": "Description",
      "steps": []
    }
  ]
}`;

    try {
      const client = this.getClient();
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" }
      });

      // Préparer les parties avec images
      const parts: any[] = [{ text: prompt }];

      for (const img of imagesBase64.slice(0, 3)) {
        const match = img.match(/^data:(image\/\w+);base64,/);
        const mimeType = match ? match[1] : 'image/png';
        const cleanBase64 = img.replace(/^data:image\/\w+;base64,/, "");
        parts.push({
          inlineData: { mimeType, data: cleanBase64 }
        });
      }

      const response = await model.generateContent(parts);
      const text = response.response?.text() || "";
      const jsonStr = this.cleanJsonText(text);

      return JSON.parse(jsonStr) as CreativeAnalysisData;
    } catch (e: any) {
      console.error("[Gemini] Creative Analysis Error:", e.message);
      throw e;
    }
  }

  /**
   * Analyse du rapport système
   */
  async analyzeSystemReport(report: SystemReport): Promise<string> {
    const prompt = `
ROLE: Tu es un Ingénieur DevOps Senior analysant un rapport de diagnostic.

DONNÉES:
${JSON.stringify(report, null, 2)}

TÂCHE: Rédige une synthèse courte avec:
1. Score de santé global /10
2. Modules en échec (❌) et pourquoi
3. Avertissements (⚠️)
4. Recommandations prioritaires

Format: Markdown avec émojis.`;

    try {
      const res = await this.sendMessage(prompt);
      return res.text;
    } catch (e) {
      return "❌ Analyse IA du rapport échouée.";
    }
  }
}

export const geminiService = new GeminiService();
