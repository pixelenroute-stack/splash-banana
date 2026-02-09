
import { GoogleGenAI } from "@google/genai";
import { db } from './mockDatabase';
import { supabaseService } from './supabaseService'; // Changed from n8nAgentService
import { VideoGenerationParams, VideoJob } from '../types';

export class VideoService {
    async createJob(userId: string, params: VideoGenerationParams): Promise<VideoJob> {
        const settings = db.getSystemSettings();
        let apiKey = process.env.API_KEY;
        let useAdminKey = false;

        if (settings.contentCreation?.provider === 'gemini' && settings.contentCreation?.value) {
            apiKey = settings.contentCreation.value;
            useAdminKey = true;
        }

        if (!useAdminKey) {
            if (!(await (window as any).aistudio.hasSelectedApiKey())) {
                await (window as any).aistudio.openSelectKey();
            }
        }

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
        this.processVideo(job, modelName, apiKey); 
        
        return job;
    }

    private async processVideo(job: VideoJob, modelName: string, apiKey?: string) {
        try {
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
            const downloadKey = apiKey || process.env.API_KEY;
            const videoResponse = await fetch(`${downloadLink}&key=${downloadKey}`);
            const videoBlob = await videoResponse.blob();
            
            const filename = `video_${job.id}.mp4`;
            
            // Upload to Supabase
            const asset = await supabaseService.uploadFile(job.userId, videoBlob, filename, 'video/mp4', 'video');

            // Store local asset for instant feedback
            const reader = new FileReader();
            reader.readAsDataURL(videoBlob);
            reader.onloadend = () => {
                db.createVideoAsset({
                    ...asset,
                    id: `va_${Date.now()}`,
                    jobId: job.id,
                    publicUrl: reader.result as string, // Base64 for instant view
                    duration: 5,
                    width: 1280,
                    height: 720,
                    fps: 24,
                    isFavorite: false
                } as any);
            };

            db.updateVideoJob(job.id, { status: 'COMPLETED', progress: 100 });

        } catch (error) {
            db.updateVideoJob(job.id, { status: 'FAILED', errorMessage: (error as Error).message });
        }
    }

    getJobs(userId: string) { return db.getVideoJobs(userId); }
}

export const videoService = new VideoService();
