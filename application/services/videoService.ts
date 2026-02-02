import { db } from './mockDatabase';
import { n8nAgentService } from '../lib/n8nAgentService';
import { VideoGenerationParams, VideoJob } from '../types';
import { geminiService } from './geminiService';

export class VideoService {
    async createJob(userId: string, params: VideoGenerationParams): Promise<VideoJob> {
        const settings = db.getSystemSettings();
        const isDev = settings.appMode === 'developer';

        const job: VideoJob = {
            id: `vjob_${Date.now()}`,
            userId,
            provider: isDev ? 'pollinations-ai' : 'n8n-workflow',
            modelId: isDev ? 'pollinations-video' : 'n8n-veo',
            status: 'QUEUED',
            params,
            progress: 0,
            createdAt: new Date().toISOString()
        };

        db.createVideoJob(job);
        this.processVideo(job, isDev);

        return job;
    }

    private async processVideo(job: VideoJob, isDev: boolean) {
        try {
            db.updateVideoJob(job.id, { status: 'RUNNING', progress: 20 });

            let videoUrl: string;

            if (isDev) {
                // MODE DÉVELOPPEUR: Simuler avec une image (pas de vrai service vidéo gratuit)
                // En production, utiliser Runway, Pika, ou un service n8n
                await new Promise(resolve => setTimeout(resolve, 2000)); // Simuler le traitement
                db.updateVideoJob(job.id, { progress: 50 });

                // Utiliser Pollinations pour générer une "preview" (image)
                videoUrl = await geminiService.generateVideo(job.params.prompt, job.params.duration);

                db.updateVideoJob(job.id, { progress: 80 });
            } else {
                // MODE PRODUCTION: Utiliser n8n webhook
                const settings = db.getSystemSettings();
                const webhookUrl = settings.webhooks?.videos?.url;

                if (!webhookUrl) {
                    throw new Error("Webhook vidéos non configuré. Allez dans Admin > Infrastructure.");
                }

                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'generate_video',
                        userId: job.userId,
                        jobId: job.id,
                        params: job.params
                    })
                });

                if (!response.ok) {
                    throw new Error(`Erreur n8n: ${response.status}`);
                }

                const result = await response.json();
                videoUrl = result.videoUrl || result.url || result.publicUrl;

                if (!videoUrl) {
                    throw new Error("URL vidéo non retournée par n8n");
                }
            }

            // Sauvegarde de l'asset
            db.updateVideoJob(job.id, { status: 'COMPLETED', progress: 100 });
            db.createVideoAsset({
                id: `va_${Date.now()}`,
                jobId: job.id,
                userId: job.userId,
                publicUrl: videoUrl,
                duration: parseInt(job.params.duration) || 5,
                width: 1280,
                height: 720,
                fps: 24,
                mimeType: 'video/mp4',
                promptCopy: job.params.prompt,
                isFavorite: false,
                isArchived: false,
                createdAt: new Date().toISOString()
            });

            // Notification n8n optionnelle
            try {
                await n8nAgentService.saveAsset(job.userId, {
                    type: 'video',
                    publicUrl: videoUrl,
                    prompt: job.params.prompt,
                    jobId: job.id,
                    createdAt: new Date().toISOString()
                });
            } catch (e) {
                console.log("[VideoService] Sauvegarde n8n optionnelle échouée (normal en dev)");
            }

        } catch (error) {
            console.error("[VideoService] Erreur génération:", error);
            db.updateVideoJob(job.id, { status: 'FAILED', errorMessage: (error as Error).message });
        }
    }

    getJobs(userId: string) { return db.getVideoJobs(userId); }
}

export const videoService = new VideoService();
