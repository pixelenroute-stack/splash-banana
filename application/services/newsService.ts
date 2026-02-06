
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
            // Le workflow N8N doit être configuré pour utiliser OpenWeather
            const prompt = `Quelle est la météo actuelle exacte à ${city} ? 
            Utilise OpenWeather via le workflow.
            Réponds en JSON strict : { "currentTemp": 20, "condition": "Sunny", "humidity": 50, "windSpeed": 10 }. 
            `;
            
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

    /**
     * Récupère les actualités en fonction de la catégorie via le workflow N8N
     * Le workflow orchestre Google News, NewsAPI, GNews, et Perplexity
     */
    async getNews(category: 'all' | NewsCategory): Promise<NewsArticle[]> {
        try {
            let prompt = "";
            let sourceHint = "Google News, NewsAPI, GNews";

            // Définition des prompts spécifiques pour orienter le workflow vers les APIs configurées
            switch (category) {
                case 'headline':
                    prompt = `Récupère 3 gros titres "À la une" (France/Monde). Source: Google Actualités.`;
                    sourceHint = "Google Actualités";
                    break;
                case 'politics':
                    prompt = `Récupère 3 actualités RÉCENTES sur : "Politique, Législation, Lois Numériques". Source: Google Actualités.`;
                    sourceHint = "Google Actualités";
                    break;
                case 'tech':
                    prompt = `Récupère 3 actualités RÉCENTES sur : "Intelligence Artificielle, Tech, Startups". Source: NewsAPI (TechCrunch, Wired).`;
                    sourceHint = "NewsAPI";
                    break;
                case 'editing':
                    prompt = `Récupère 3 actualités, tutos ou tendances sur : "Montage Vidéo, Premiere Pro, DaVinci Resolve". Source: Perplexity Search (Recherche Web en direct).`;
                    sourceHint = "Perplexity";
                    break;
                case 'motion':
                    prompt = `Récupère 3 actualités ou tendances sur : "Motion Design, After Effects, 3D". Source: GNews.`;
                    sourceHint = "GNews";
                    break;
                default: // 'all' ou 'general'
                    prompt = `Récupère un mix de 4 actualités majeures Tech & Création. Sources variées.`;
                    break;
            }

            prompt += `\nFormat JSON STRICT : [{"title": "...", "summary": "...", "source": "${sourceHint}", "date": "YYYY-MM-DD"}]`;

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
                id: `news_${category}_${Date.now()}_${idx}`,
                title: item.title || "Titre inconnu",
                summary: item.summary || "Pas de résumé",
                category: category === 'all' ? 'general' : category,
                source: item.source || sourceHint,
                date: item.date || new Date().toISOString(),
                imageUrl: `https://image.pollinations.ai/prompt/news%20${encodeURIComponent(item.title || category)}?width=800&height=600&nologo=true`
            }));

        } catch (e) {
            console.error(`Erreur News (${category}):`, e);
            // Fallback propre pour éviter l'écran vide
            return [
                {
                    id: `mock_news_${category}`,
                    title: `Actualité ${category} (Mode Simulation)`,
                    summary: 'Le flux d\'actualités en temps réel est temporairement indisponible. Vérifiez la connexion au workflow N8N.',
                    category: category === 'all' ? 'general' : category,
                    source: 'Système',
                    date: new Date().toISOString(),
                    imageUrl: `https://image.pollinations.ai/prompt/abstract%20${category}?width=800&height=600`
                }
            ];
        }
    }
}

export const newsService = new NewsService();
