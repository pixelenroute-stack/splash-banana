
import { geminiService } from './geminiService';
import { supabaseService } from './supabaseService';
import { MoodboardData, AdvancedTechnique } from '../types';

const TEMP_FOLDER_ID = '1PjCsaOfNkcKE2qZFR0NQnKOdJ7RVdDX9'; 

export class VideoEditorService {
    
    private getUserId(): string {
        return 'user_1';
    }

    // --- Action 1: Moodboard ---
    async generateMoodboard(prompt: string, file?: File | null, url?: string): Promise<MoodboardData> {
        // Si un fichier est fourni, on pourrait l'envoyer à Gemini Vision
        // Pour l'instant, on se base sur le texte ou une simulation
        
        let fullPrompt = `Génère une Direction Artistique (Moodboard) pour un projet vidéo.
        Description: ${prompt}
        ${url ? `Inspiré par: ${url}` : ''}
        Format JSON attendu: {
            "concept": { "title": "...", "description": "..." },
            "colors": { "paletteHex": ["#..."], "dominant": "...", "description": "..." },
            "typography": { "style": "...", "animation": "..." },
            "editing": { "pacing": "...", "transitions": "...", "style": "..." }
        }`;

        const data = await geminiService.generateMoodboard(fullPrompt);
        return data;
    }

    // --- Action 2: Analyse Rush ---
    async analyzeRush(file: File): Promise<any[]> {
        // Simulation d'analyse vidéo (Gemini 1.5 Pro peut le faire avec un upload réel via File API)
        // Ici on simule une réponse basée sur le nom du fichier
        const prompt = `Simule une analyse technique d'un rush vidéo nommé "${file.name}".
        Taille: ${file.size}.
        Suggère 3 moments clés pour insérer du B-Roll.
        Format JSON: [{ "timecode": "00:00:10", "duration": "5s", "type": "broll", "suggestion": "...", "visualDescription": "...", "complexity": "Low" }]`;

        const res = await geminiService.sendMessage(prompt);
        // Extraction JSON basique
        try {
            const jsonStr = res.text.substring(res.text.indexOf('['), res.text.lastIndexOf(']') + 1);
            return JSON.parse(jsonStr);
        } catch {
            return [];
        }
    }

    // --- Action 3: Scripts ---
    async generateScripts(topic: string, context?: any, format: string = 'Shorts'): Promise<any[]> {
        const prompt = `Ecris 3 scripts vidéo viraux pour "${topic}". Format: ${format}.
        Context: ${JSON.stringify(context)}.
        Retourne un tableau JSON avec pour chaque script : id, content, viralScore (0-100), et breakdown (hook, retention...).`;
        
        // On utilise la méthode script du service Gemini existant ou sendMessage et on parse
        const res = await geminiService.sendMessage(prompt);
        try {
            const jsonStr = res.text.substring(res.text.indexOf('['), res.text.lastIndexOf(']') + 1);
            return JSON.parse(jsonStr);
        } catch (e) {
            throw new Error("Erreur parsing scripts Gemini");
        }
    }

    // --- Action 4: Tutos ---
    async generateTutorial(
        software: 'After Effects' | 'Premiere Pro' | 'Photoshop' | 'Illustrator' | 'Blender',
        context: string
    ): Promise<AdvancedTechnique[]> {
        const prompt = `Crée un tutoriel technique détaillé pour ${software}.
        Sujet: ${context}.
        Format JSON Array: [{ "title": "...", "difficulty": "...", "estimatedTime": "...", "description": "...", "steps": [{ "order": 1, "category": "...", "action": "...", "tool": "..." }] }]`;

        const res = await geminiService.sendMessage(prompt);
        try {
            const jsonStr = res.text.substring(res.text.indexOf('['), res.text.lastIndexOf(']') + 1);
            return JSON.parse(jsonStr);
        } catch {
            return [];
        }
    }

    /**
     * Sauvegarde automatique des résultats dans Supabase
     */
    async autoSaveResult(filename: string, content: any): Promise<boolean> {
        try {
            const blob = new Blob([JSON.stringify(content)], { type: 'application/json' });
            await supabaseService.uploadFile(this.getUserId(), blob, filename, 'application/json', 'file');
            return true;
        } catch {
            return false;
        }
    }
}

export const videoEditorService = new VideoEditorService();
