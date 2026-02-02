
import { db } from './mockDatabase';
import { PerplexityModel } from '../types';

export class PerplexityService {
  
  async sendMessage(message: string): Promise<string> {
      const settings = db.getSystemSettings();
      // On vérifie d'abord la clé spécifique, puis le fallback
      const apiKey = settings.aiConfig?.perplexityKey || settings.chat.value; 

      if (!apiKey || !apiKey.startsWith('pplx-')) {
          console.warn("Clé Perplexity manquante, mode simulation activé.");
          return this.getMockResponse(message);
      }

      try {
          const response = await fetch('/api/proxy/perplexity', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message, apiKey }),
          });

          // Lecture sécurisée en texte d'abord
          const text = await response.text();

          if (!response.ok) {
              console.warn(`Perplexity Proxy Error ${response.status}: ${text}`);
              return `Erreur API Web (${response.status}). Passage en mode simulation.`;
          }

          if (!text) return "Réponse vide de l'API.";

          try {
              const data = JSON.parse(text);
              // Support de différents formats de réponse (Standard OpenAI format vs autres)
              return data.choices?.[0]?.message?.content || data.output || "Réponse vide.";
          } catch (e) {
              console.error("Perplexity JSON Parse Error", e);
              // Si ce n'est pas du JSON, c'est peut-être une erreur brute du proxy
              return `Erreur format: ${text.substring(0, 100)}`;
          }

      } catch (e) {
          console.warn("Perplexity Network Error", e);
          return this.getMockResponse(message);
      }
  }

  private getMockResponse(query: string): string {
      return `[SIMULATION WEB] Recherche simulée pour : "${query}". \n\nPour activer la vraie recherche, configurez une clé API Perplexity (commençant par pplx-) dans les Paramètres > Admin Console.`;
  }

  async streamChat(
    userId: string,
    messages: { role: string; content: string }[],
    model: PerplexityModel,
    onChunk: (text: string) => void,
    onComplete: (fullText: string, citations: string[]) => void,
    onError: (err: Error) => void
  ) {
    const mockResponse = this.getMockResponse(messages[messages.length - 1].content);
    const chunks = mockResponse.split(' ');
    let currentText = '';
    let i = 0;
    
    const interval = setInterval(() => {
        if (i >= chunks.length) {
            clearInterval(interval);
            onComplete(currentText, []);
            return;
        }
        const chunk = chunks[i] + ' ';
        currentText += chunk;
        onChunk(chunk);
        i++;
    }, 50);
  }
}

export const perplexityService = new PerplexityService();
