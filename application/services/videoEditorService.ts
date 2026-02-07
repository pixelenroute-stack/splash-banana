
import { n8nAgentService } from '../lib/n8nAgentService';
import { googleService } from './googleService';
import { db } from './mockDatabase';
import { MoodboardData, AdvancedTechnique, N8NResult } from '../types';

const TEMP_FOLDER_ID = '1PjCsaOfNkcKE2qZFR0NQnKOdJ7RVdDX9'; // Dossier temporaire Drive ou 'root'

export class VideoEditorService {
    
    private getUserId(): string {
        return 'user_1'; // À remplacer par le vrai ID utilisateur
    }

    /**
     * Upload un fichier (vidéo/image) vers Drive pour que N8N puisse y accéder via URL
     */
    private async uploadAssetForProcessing(file: File): Promise<string> {
        try {
            console.log(`[VideoEditor] Uploading ${file.name} to Drive for n8n access...`);
            const driveFile = await googleService.uploadFile(this.getUserId(), file, TEMP_FOLDER_ID);
            
            // On retourne le lien de téléchargement direct ou webContentLink
            // N8N avec le nœud Google Drive pourra le télécharger via l'ID
            return driveFile.id; // On retourne l'ID, plus robuste pour N8N Google Drive Node
        } catch (e) {
            console.error("Upload failed", e);
            throw new Error("Échec de l'envoi du fichier vers le cloud de traitement.");
        }
    }

    /**
     * Action 1: Générer un Moodboard & DA
     */
    async generateMoodboard(prompt: string, file?: File | null, url?: string): Promise<MoodboardData> {
        let mediaId: string | undefined = undefined;
        let mediaUrl: string | undefined = url;

        if (file) {
            mediaId = await this.uploadAssetForProcessing(file);
        }

        const result = await n8nAgentService.fetchN8nWorkflow('video_editor', {
            action: 'generate_moodboard',
            prompt,
            mediaId, // ID Google Drive
            mediaUrl, // URL Youtube/TikTok
            userId: this.getUserId()
        });

        if (!result.success || !result.data) {
            throw new Error(result.error || "Erreur lors de la génération du moodboard via N8N");
        }

        // n8n returns {success, data} wrapper - extract inner data
        const webhookData = result.data;
        return (webhookData?.data ?? webhookData) as MoodboardData;
    }

    /**
     * Action 2: Analyser un Rush (B-Roll)
     */
    async analyzeRush(file: File): Promise<any[]> {
        const fileId = await this.uploadAssetForProcessing(file);

        const result = await n8nAgentService.fetchN8nWorkflow('video_editor', {
            action: 'analyze_rush',
            fileId,
            fileName: file.name,
            fileSize: file.size,
            userId: this.getUserId()
        });

        if (!result.success || !result.data) {
            throw new Error(result.error || "Erreur lors de l'analyse du rush");
        }

        // n8n returns {success, data} wrapper - extract inner data
        const webhookData = result.data;
        return (webhookData?.data ?? webhookData); // RushAnalysisItem[]
    }

    /**
     * Action 3: Générer des scripts
     */
    async generateScripts(topic: string, context?: any, format: string = 'Shorts'): Promise<any[]> {
        const result = await n8nAgentService.fetchN8nWorkflow('video_editor', {
            action: 'generate_script',
            topic,
            context,
            format,
            userId: this.getUserId()
        });

        if (!result.success || !result.data) {
            throw new Error(result.error || "Erreur lors de la génération des scripts");
        }

        // n8n returns {success, data} wrapper - extract inner data
        const webhookData = result.data;
        return (webhookData?.data ?? webhookData); // ScriptWithScore[]
    }

    /**
     * Action 4: Générer un tutoriel technique (AE, PR, PS, AI, Blender)
     */
    async generateTutorial(
        software: 'After Effects' | 'Premiere Pro' | 'Photoshop' | 'Illustrator' | 'Blender',
        context: string
    ): Promise<AdvancedTechnique[]> {
        const result = await n8nAgentService.fetchN8nWorkflow('video_editor', {
            action: 'generate_tutorial',
            software,
            context,
            userId: this.getUserId()
        });

        if (!result.success || !result.data) {
            throw new Error(result.error || "Erreur lors de la génération du tutoriel");
        }

        // n8n returns {success, data} wrapper - extract inner data
        const webhookData = result.data;
        const actualData = webhookData?.data ?? webhookData;
        const data = Array.isArray(actualData) ? actualData : [actualData];
        return data as AdvancedTechnique[];
    }

    /**
     * Sauvegarde automatique des résultats dans le Drive via N8N
     */
    async autoSaveResult(filename: string, content: any): Promise<boolean> {
        // On délègue la sauvegarde au workflow pour centraliser
        const result = await n8nAgentService.fetchN8nWorkflow('file_handling', {
            action: 'save_json',
            filename,
            content,
            userId: this.getUserId()
        }, { useCache: false }); // Pas de cache pour une sauvegarde

        return result.success;
    }
}

export const videoEditorService = new VideoEditorService();
