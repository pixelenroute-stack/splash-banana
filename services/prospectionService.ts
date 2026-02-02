
import { Lead, LeadSource, LeadStatus } from '../types';
import { geminiService } from './geminiService';
import { apiRouter } from './apiRouter';

class ProspectionService {
    
    /**
     * Recherche réelle de leads via API (Perplexity ou Gemini avec accès Web)
     */
    async searchLeads(source: LeadSource, keyword: string, location: string): Promise<Lead[]> {
        // En production strict, on ne retourne pas de fausses données.
        // On demande à l'agent IA de scraper ou d'utiliser ses connaissances web.
        
        try {
            const prompt = `
                Agis comme un expert en génération de leads.
                Effectue une recherche réelle pour trouver 5 entreprises correspondant à : "${keyword}" à "${location}".
                Pour chaque entreprise, fournis : Nom, Site Web (si dispo), Rôle du contact clé (probable), Lien LinkedIn (si dispo).
                
                Format de réponse JSON STRICT :
                [
                    {
                        "name": "Nom du contact",
                        "company": "Nom Entreprise",
                        "role": "Poste",
                        "website": "URL",
                        "linkedin": "URL"
                    }
                ]
            `;

            const response = await apiRouter.routeRequest({
                type: 'viral_trends_research', // Utilise Perplexity pour accès web temps réel
                prompt: prompt,
                qualityRequired: 'high'
            });

            // Parsing robuste
            let rawData = response.content;
            const jsonMatch = rawData.match(/\[.*\]/s);
            if (jsonMatch) rawData = jsonMatch[0];
            
            const results = JSON.parse(rawData);

            if (!Array.isArray(results)) throw new Error("Format de réponse invalide");

            return results.map((item: any, index: number) => ({
                id: `lead_${Date.now()}_${index}`,
                name: item.name || 'Contact Inconnu',
                company: item.company || 'Entreprise Inconnue',
                role: item.role || 'Direction',
                source: source,
                status: 'new' as LeadStatus,
                location: location,
                website: item.website,
                socials: { linkedin: item.linkedin },
                metrics: { videoFrequency: 'none' }, // Donnée par défaut en attendant enrichissement
                score: 50, // Score neutre avant analyse
                lastScrapedAt: new Date().toISOString()
            }));

        } catch (e) {
            console.error("Erreur Prospection:", e);
            throw new Error(`Impossible de récupérer des leads réels : ${(e as Error).message}. Vérifiez vos clés API.`);
        }
    }

    /**
     * Analyse approfondie des réseaux sociaux d'un lead
     */
    async analyzeSocialPresence(lead: Lead): Promise<string> {
        const analysisPrompt = `
            Effectue un audit rapide de la présence digitale de : ${lead.company} (${lead.website || 'Pas de site'}).
            Secteur: ${lead.role}.
            
            Critique leur stratégie vidéo potentielle et donne 1 angle d'attaque pour leur vendre une prestation de montage Shorts/Reels.
        `;

        try {
            const res = await geminiService.sendMessage(analysisPrompt);
            return res.text;
        } catch (e) {
            throw new Error("Analyse impossible : Clé API IA manquante ou invalide.");
        }
    }

    /**
     * Génère un email de prospection personnalisé
     */
    async generateColdEmail(lead: Lead, tone: 'professional' | 'casual' | 'direct'): Promise<string> {
        const userPrompt = `Rédige un email pour ${lead.name} (${lead.role} chez ${lead.company}). Ton: ${tone}. Objectif: Vendre du montage vidéo.`;

        try {
            const response = await geminiService.sendMessage(userPrompt);
            return response.text;
        } catch (e) {
            throw new Error("Génération impossible : Clé API IA manquante.");
        }
    }
}

export const prospectionService = new ProspectionService();
