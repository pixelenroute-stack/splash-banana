
import { NewsArticle, NewsCategory, WeatherData } from '../types';
import { geminiService } from './geminiService';

class NewsService {
    
    private cleanJson(text: string): string {
        if (!text) return "[]";
        let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBracket = clean.indexOf('[');
        const lastBracket = clean.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1) {
            return clean.substring(firstBracket, lastBracket + 1);
        }
        return "[]";
    }

    async fetchWeather(city: string): Promise<WeatherData> {
        try {
            // Simulation intelligente via Gemini pour "estimer" ou récupérer via tool si dispo
            // Pour l'instant, on mocke une réponse réaliste basée sur la saison/ville via prompt
            const prompt = `Donne-moi un objet JSON représentant la météo actuelle probable à ${city} en ce moment.
            Format attendu: { "currentTemp": number, "condition": "Sunny"|"Rain"|"Cloudy"|"Storm", "humidity": number, "windSpeed": number }
            Réponds uniquement par le JSON.`;
            
            const response = await geminiService.simpleChat(prompt);
            let data: any = {};
            try {
                data = JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());
            } catch(e) {
                data = { currentTemp: 20, condition: "Sunny", humidity: 50, windSpeed: 10 };
            }
            
            return {
                city,
                currentTemp: data.currentTemp || 20,
                condition: data.condition || "Sunny",
                humidity: data.humidity || 50,
                windSpeed: data.windSpeed || 10,
                forecast: []
            };
        } catch (e) {
            console.warn("Weather fallback", e);
            return {
                city,
                currentTemp: 22,
                condition: 'Sunny',
                humidity: 45,
                windSpeed: 12,
                forecast: []
            };
        }
    }

    async getNews(category: 'all' | NewsCategory): Promise<NewsArticle[]> {
        try {
            const prompt = `Génère 5 actualités fictives mais réalistes pour la catégorie "${category}".
            Elles doivent sembler venir de sources réelles (TechCrunch, Le Monde, etc.).
            Format JSON Array: [{ "title": "...", "summary": "...", "source": "...", "date": "ISOString" }]`;

            const response = await geminiService.sendMessage(prompt);
            const jsonStr = this.cleanJson(response.text);
            
            let data = JSON.parse(jsonStr);

            return data.map((item: any, idx: number) => ({
                id: `news_${category}_${Date.now()}_${idx}`,
                title: item.title || "Titre inconnu",
                summary: item.summary || "Pas de résumé",
                category: category === 'all' ? 'general' : category,
                source: item.source || "Gemini News",
                date: item.date || new Date().toISOString(),
                imageUrl: `https://image.pollinations.ai/prompt/news%20${encodeURIComponent(category)}?width=800&height=600&nologo=true`
            }));

        } catch (e) {
            console.error(`Erreur News (${category}):`, e);
            return [];
        }
    }
}

export const newsService = new NewsService();
