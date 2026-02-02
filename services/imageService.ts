
import { GoogleGenAI } from "@google/genai";
import { db } from './mockDatabase';
import { n8nAgentService } from '../lib/n8nAgentService';
import { ImageGenerationParams, ImageJob } from '../types';

export class ImageService {
    async createJob(userId: string, type: ImageJob['type'], params: ImageGenerationParams): Promise<ImageJob> {
        // Model: gemini-2.5-flash-image | Last verified: 2026-01-01
        const modelName = 'gemini-2.5-flash-image';

        const job: ImageJob = {
            id: `job_${Date.now()}`,
            userId,
            provider: 'google-gemini',
            modelId: modelName,
            type,
            status: 'PROCESSING',
            params,
            costTokens: 10,
            createdAt: new Date().toISOString()
        };

        db.createImageJob(job);
        
        (async () => {
            try {
                // RÉCUPÉRATION DE LA CLÉ DEPUIS LA CONFIG CENTRALISÉE ADMIN
                const settings = db.getSystemSettings();
                let apiKey = process.env.API_KEY;

                if (settings.contentCreation?.provider === 'gemini' && settings.contentCreation?.value) {
                    apiKey = settings.contentCreation.value;
                }

                const ai = new GoogleGenAI({ apiKey });
                
                // Model validation check handled by implicit knowledge or shared service if needed
                // Here we use the updated constant directly.
                
                const response = await ai.models.generateContent({
                  model: modelName,
                  contents: { parts: [{ text: params.prompt }] },
                  config: { imageConfig: { aspectRatio: params.aspectRatio } }
                });

                let base64Data = '';
                for (const part of response.candidates[0].content.parts) {
                  if (part.inlineData) {
                    base64Data = part.inlineData.data;
                    break;
                  }
                }

                if (!base64Data) throw new Error("Aucune image générée par le modèle.");

                const imageUrl = `data:image/png;base64,${base64Data}`;

                // Sauvegarde via n8n pour la persistance cloud
                await n8nAgentService.saveAsset(userId, {
                    type: 'image',
                    publicUrl: imageUrl,
                    prompt: params.prompt,
                    jobId: job.id,
                    createdAt: new Date().toISOString()
                });

                db.updateImageJob(job.id, { status: 'COMPLETED' });
                db.createImageAsset({
                    id: `ia_${Date.now()}`,
                    jobId: job.id,
                    userId,
                    storagePath: 'n8n_storage',
                    publicUrl: imageUrl,
                    width: 1024,
                    height: 1024,
                    mimeType: 'image/png',
                    promptCopy: params.prompt,
                    isFavorite: false,
                    isArchived: false,
                    createdAt: new Date().toISOString()
                });

            } catch (e) {
                db.updateImageJob(job.id, { status: 'FAILED', errorMessage: (e as Error).message });
            }
        })();
        
        return job;
    }

    getJobs(userId: string) { return db.getImageJobs(userId); }
}

export const imageService = new ImageService();
