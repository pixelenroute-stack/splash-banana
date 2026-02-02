
import { db } from './mockDatabase';

export class AnthropicService {
  async sendMessage(systemPrompt: string, userMessage: string): Promise<string> {
    const settings = db.getSystemSettings();
    
    // Récupération de la clé depuis la config Admin
    const apiKey = settings.aiConfig?.anthropicKey;

    if (!apiKey || !apiKey.startsWith('sk-')) {
        throw new Error("Clé API Anthropic non valide ou non configurée dans l'Admin Console.");
    }

    try {
        const response = await fetch('/api/proxy/anthropic', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                apiKey: apiKey,
                system: systemPrompt,
                messages: [
                    { role: "user", content: userMessage }
                ],
                max_tokens: 8192,
                temperature: 0.1 // Très précis pour le code
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `Anthropic Error: ${response.statusText}`);
        }

        const data = await response.json();
        // Le format de réponse Anthropic Messages API
        if (data.content && data.content.length > 0) {
            return data.content[0].text;
        }
        return "Pas de réponse de Claude.";

    } catch (error) {
        console.error("Anthropic Service Error:", error);
        throw error;
    }
  }
}

export const anthropicService = new AnthropicService();
