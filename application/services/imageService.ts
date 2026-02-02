import { db } from './mockDatabase';
import { n8nAgentService } from '../lib/n8nAgentService';
import { ImageGenerationParams, ImageJob } from '../types';
import { geminiService } from './geminiService';

export class ImageService {
    async createJob(userId: string, type: ImageJob['type'], params: ImageGenerationParams): Promise<ImageJob> {
        const settings = db.getSystemSettings();
        const isDev = settings.appMode === 'developer';

        const job: ImageJob = {
            id: `job_${Date.now()}`,
            userId,
            provider: isDev ? 'pollinations-ai' : 'n8n-workflow',
            modelId: isDev ? 'pollinations-v1' : 'n8n-flux',
            type,
            status: 'PROCESSING',
            params,
            costTokens: 10,
            createdAt: new Date().toISOString()
        };

        db.createImageJob(job);

        // Traitement asynchrone
        (async () => {
            try {
                let imageUrl: string;

                if (isDev) {
                    // MODE DÉVELOPPEUR: Utiliser Pollinations.ai (gratuit, pas de clé API requise)
                    imageUrl = await geminiService.generateImage(params.prompt, params.aspectRatio);
                } else {
                    // MODE PRODUCTION: Utiliser n8n webhook
                    const webhookUrl = settings.webhooks?.images?.url;
                    if (!webhookUrl) {
                        throw new Error("Webhook images non configuré. Allez dans Admin > Infrastructure.");
                    }

                    const response = await fetch(webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'generate_image',
                            userId,
                            jobId: job.id,
                            params
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`Erreur n8n: ${response.status}`);
                    }

                    const result = await response.json();
                    imageUrl = result.imageUrl || result.url || result.publicUrl;

                    if (!imageUrl) {
                        throw new Error("URL d'image non retournée par n8n");
                    }
                }

                // Sauvegarde de l'asset
                db.updateImageJob(job.id, { status: 'COMPLETED' });
                db.createImageAsset({
                    id: `ia_${Date.now()}`,
                    jobId: job.id,
                    userId,
                    storagePath: isDev ? 'pollinations' : 'n8n_storage',
                    publicUrl: imageUrl,
                    width: 1024,
                    height: 1024,
                    mimeType: 'image/png',
                    promptCopy: params.prompt,
                    isFavorite: false,
                    isArchived: false,
                    createdAt: new Date().toISOString()
                });

                // Notification n8n optionnelle
                try {
                    await n8nAgentService.saveAsset(userId, {
                        type: 'image',
                        publicUrl: imageUrl,
                        prompt: params.prompt,
                        jobId: job.id,
                        createdAt: new Date().toISOString()
                    });
                } catch (e) {
                    // Ignorer les erreurs de sauvegarde n8n en mode dev
                    console.log("[ImageService] Sauvegarde n8n optionnelle échouée (normal en dev)");
                }

            } catch (e) {
                console.error("[ImageService] Erreur génération:", e);
                db.updateImageJob(job.id, { status: 'FAILED', errorMessage: (e as Error).message });
            }
        })();

        return job;
    }

    getJobs(userId: string) { return db.getImageJobs(userId); }
}

export const imageService = new ImageService();
