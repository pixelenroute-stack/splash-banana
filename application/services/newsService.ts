
import { apiRouter } from './apiRouter';
import { NewsArticle, NewsCategory, WeatherData } from '../types';

class NewsService {
    
    /**
     * Helper pour extraire proprement le JSON d'une réponse LLM
     */
    private cleanJson(text: string): string {
        if (!text) return "{}";
        // Enlever les blocs markdown ```json ... ```
        let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        // S'assurer que ça commence par { ou [
        const firstBrace = clean.indexOf('{');
        const firstBracket = clean.indexOf('[');
        
        if (firstBrace === -1 && firstBracket === -1) return clean; // Pas de JSON détecté
        
        const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
        clean = clean.substring(start);
        
        return clean;
    }

    async fetchWeather(city: string): Promise<WeatherData> {
        try {
            const prompt = `Quelle est la météo actuelle exacte à ${city} ? 
            Réponds en JSON strict : { "currentTemp": 20, "condition": "Sunny", "humidity": 50, "windSpeed": 10 }. 
            Données réalistes.`;
            
            const response = await apiRouter.routeRequest({
                type: 'chat_simple', 
                prompt: prompt,
                qualityRequired: 'low'
            });
            
            if (response.content.startsWith("Error") || response.content.startsWith("Erreur")) {
                throw new Error("Weather AI unavailable");
            }

            const data = JSON.parse(this.cleanJson(response.content));
            
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
            const prompt = `
                Trouve 4 actualités RÉCENTES (moins de 48h) sur : "${category === 'all' ? 'Tech, IA, Vidéo' : category}".
                JSON STRICT : [{"title": "...", "summary": "...", "source": "...", "date": "YYYY-MM-DD"}]
            `;

            const response = await apiRouter.routeRequest({
                type: 'news_generation',
                prompt: prompt,
                qualityRequired: 'high'
            });

            if (response.content.startsWith("Error") || response.content.startsWith("Erreur")) {
                throw new Error(response.content);
            }

            const data = JSON.parse(this.cleanJson(response.content));

            if (!Array.isArray(data)) throw new Error("Format invalide (pas un tableau)");

            return data.map((item: any, idx: number) => ({
                id: `news_${Date.now()}_${idx}`,
                title: item.title || "Titre inconnu",
                summary: item.summary || "Pas de résumé",
                category: category === 'all' ? 'tech' : category,
                source: item.source || "Web",
                date: item.date || new Date().toISOString(),
                imageUrl: `https://image.pollinations.ai/prompt/news%20${encodeURIComponent(item.title || 'tech')}?width=800&height=600&nologo=true`
            }));

        } catch (e) {
            console.error("Erreur News:", e);
            // Fallback propre
            return [
                {
                    id: 'mock_news_1',
                    title: 'L\'IA générative transforme Hollywood (Simulation)',
                    summary: 'Impossible de récupérer les news réelles pour le moment. Vérifiez la clé API Perplexity.',
                    category: 'tech',
                    source: 'Système',
                    date: new Date().toISOString(),
                    imageUrl: 'https://image.pollinations.ai/prompt/error%20robot?width=800&height=600'
                }
            ];
        }
    }

    async simulateLiveNews(category: NewsCategory): Promise<NewsArticle[]> {
        return this.getNews(category);
    }
}

export const newsService = new NewsService();
