
import { db } from './mockDatabase';

export class OpenAIService {
  async sendMessage(message: string): Promise<string> {
    const settings = db.getSystemSettings();
    
    // Récupération de la clé depuis la config Admin spécifique
    const apiKey = settings.aiConfig?.openaiKey || settings.chat.value;

    if (!apiKey || !apiKey.startsWith('sk-')) {
        throw new Error("Clé API OpenAI non valide ou non configurée dans l'Admin Console.");
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4-turbo-preview', // Ou gpt-4o
                messages: [
                    { role: "system", content: "Tu es l'assistant intelligent de l'agence Pixel En Route. Tu es concis, professionnel et utile." },
                    { role: "user", content: message }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(`OpenAI Error: ${err.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "Pas de réponse.";

    } catch (error) {
        console.error("OpenAI Service Error:", error);
        throw error;
    }
  }
}

export const openAIService = new OpenAIService();
