
import { GoogleGenAI } from "@google/genai";
import { db } from './mockDatabase';
import { n8nAgentService } from '../lib/n8nAgentService';
import { VideoGenerationParams, VideoJob } from '../types';

export class VideoService {
    async createJob(userId: string, params: VideoGenerationParams): Promise<VideoJob> {
        // RÉCUPÉRATION DE LA CLÉ DEPUIS LA CONFIG CENTRALISÉE ADMIN
        const settings = db.getSystemSettings();
        let apiKey = process.env.API_KEY;
        let useAdminKey = false;

        if (settings.contentCreation?.provider === 'gemini' && settings.contentCreation?.value) {
            apiKey = settings.contentCreation.value;
            useAdminKey = true;
        }

        // Si aucune clé admin n'est fournie, on utilise le sélecteur utilisateur
        if (!useAdminKey) {
            if (!(await (window as any).aistudio.hasSelectedApiKey())) {
                await (window as any).aistudio.openSelectKey();
            }
        }

        // Model: veo-3.1-fast-generate-preview | Last verified: 2026-01-01
        const modelName = 'veo-3.1-fast-generate-preview';

        const job: VideoJob = {
            id: `vjob_${Date.now()}`,
            userId,
            provider: 'google-veo',
            modelId: modelName,
            status: 'QUEUED',
            params,
            progress: 0,
            createdAt: new Date().toISOString()
        };

        db.createVideoJob(job);
        this.processVideo(job, modelName, apiKey); // Pass the resolved key and model
        
        return job;
    }

    private async processVideo(job: VideoJob, modelName: string, apiKey?: string) {
        try {
            // Use passed key or env var fallback (Note: if user used window.aistudio, process.env.API_KEY is injected by the platform)
            const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
            
            let operation = await ai.models.generateVideos({
              model: modelName,
              prompt: job.params.prompt,
              config: {
                numberOfVideos: 1,
                resolution: job.params.resolution as any,
                aspectRatio: job.params.aspectRatio as any
              }
            });

            db.updateVideoJob(job.id, { status: 'RUNNING', progress: 20 });

            while (!operation.done) {
              await new Promise(resolve => setTimeout(resolve, 10000));
              operation = await ai.operations.getVideosOperation({ operation: operation });
              db.updateVideoJob(job.id, { progress: Math.min(95, (job.progress || 20) + 5) });
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            // Utiliser la même clé pour télécharger
            const downloadKey = apiKey || process.env.API_KEY;
            const videoResponse = await fetch(`${downloadLink}&key=${downloadKey}`);
            const videoBlob = await videoResponse.blob();
            
            // Conversion en base64 pour envoi à n8n (simplification pour le stockage)
            const reader = new FileReader();
            reader.readAsDataURL(videoBlob);
            reader.onloadend = async () => {
                const base64Video = reader.result as string;
                
                // Sauvegarde via n8n
                await n8nAgentService.saveAsset(job.userId, {
                    type: 'video',
                    publicUrl: base64Video,
                    prompt: job.params.prompt,
                    jobId: job.id,
                    createdAt: new Date().toISOString()
                });

                db.updateVideoJob(job.id, { status: 'COMPLETED', progress: 100 });
                db.createVideoAsset({
                    id: `va_${Date.now()}`,
                    jobId: job.id,
                    userId: job.userId,
                    publicUrl: base64Video,
                    duration: 5,
                    width: 1280,
                    height: 720,
                    fps: 24,
                    mimeType: 'video/mp4',
                    promptCopy: job.params.prompt,
                    isFavorite: false,
                    isArchived: false,
                    createdAt: new Date().toISOString()
                });
            };

        } catch (error) {
            db.updateVideoJob(job.id, { status: 'FAILED', errorMessage: (error as Error).message });
        }
    }

    getJobs(userId: string) { return db.getVideoJobs(userId); }
}

export const videoService = new VideoService();
