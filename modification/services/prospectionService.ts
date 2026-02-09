
import { Lead, LeadSource, LeadStatus } from '../types';
import { geminiService } from './geminiService';

class ProspectionService {
    
    async searchLeads(source: LeadSource, keyword: string, location: string): Promise<Lead[]> {
        try {
            const prompt = `Simule une recherche de leads B2B pour "${keyword}" à "${location}" sur ${source}.
            Génère 5 profils fictifs mais réalistes.
            Format JSON Array: [{ "name": "...", "company": "...", "role": "...", "website": "...", "score": 85 }]`;

            const response = await geminiService.sendMessage(prompt);
            const cleanJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
            const start = cleanJson.indexOf('[');
            const end = cleanJson.lastIndexOf(']');
            const jsonStr = cleanJson.substring(start, end + 1);
            
            const data = JSON.parse(jsonStr);

            return data.map((item: any, index: number) => ({
                id: `lead_${Date.now()}_${index}`,
                name: item.name || 'Contact Inconnu',
                company: item.company || 'Entreprise Inconnue',
                role: item.role || 'Direction',
                source: source,
                status: 'new' as LeadStatus,
                location: location,
                website: item.website,
                socials: { linkedin: `https://linkedin.com/in/${item.name.replace(/\s/g,'').toLowerCase()}` },
                metrics: { videoFrequency: 'none' }, 
                score: item.score || 50, 
                lastScrapedAt: new Date().toISOString()
            }));

        } catch (e) {
            console.error("Erreur Prospection:", e);
            throw new Error("Impossible de générer des leads simulés.");
        }
    }

    async analyzeSocialPresence(lead: Lead): Promise<string> {
        try {
            const prompt = `Analyse le profil fictif de cette entreprise : ${lead.company} (${lead.role}).
            Donne une analyse de leur présence sociale probable et des recommandations marketing.`;
            
            const res = await geminiService.sendMessage(prompt);
            return res.text;
        } catch (e) {
            return "Analyse impossible.";
        }
    }

    async generateColdEmail(lead: Lead, tone: 'professional' | 'casual' | 'direct'): Promise<string> {
        try {
            const prompt = `Rédige un email de prospection (Cold Email) pour ${lead.name} de ${lead.company}.
            Ton: ${tone}. Objectif: Proposer des services de montage vidéo.`;
            
            const res = await geminiService.sendMessage(prompt);
            return res.text;
        } catch (e) {
            return "Erreur génération email.";
        }
    }
}

export const prospectionService = new ProspectionService();
