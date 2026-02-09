
import { GoogleGenerativeAI as GoogleGenAI } from "@google/generative-ai";
import { db } from './mockDatabase';
import { supabaseService } from './supabaseService'; // Changed from n8nAgentService
import { ImageGenerationParams, ImageJob } from '../types';

export class ImageService {
    async createJob(userId: string, type: ImageJob['type'], params: ImageGenerationParams): Promise<ImageJob> {
        // Model: gemini-2.5-flash-image
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

                // Conversion base64 -> Blob pour upload Supabase
                const res = await fetch(imageUrl);
                const blob = await res.blob();
                const filename = `generated_${job.id}.png`;

                // Sauvegarde via Supabase Storage
                const asset = await supabaseService.uploadFile(userId, blob, filename, 'image/png', 'image');

                db.updateImageJob(job.id, { status: 'COMPLETED' });
                // L'asset est déjà créé par uploadFile, mais on peut mettre à jour le jobId si besoin
                // Dans mockDatabase/supabaseService, uploadFile retourne l'asset créé.
                // On peut juste s'assurer qu'il est lié au job.
                
                // Note: supabaseService.uploadFile ne prend pas jobId en paramètre direct dans cette version simplifiée,
                // mais retourne l'asset. On pourrait faire un update. 
                // Pour la démo, on recrée un asset localement lié au job dans la MockDB pour l'affichage immédiat
                db.createImageAsset({
                    ...asset,
                    id: `ia_${Date.now()}`, // Force new ID for view
                    jobId: job.id,
                    publicUrl: imageUrl, // Use base64 for instant display
                    width: 1024,
                    height: 1024,
                    isFavorite: false
                } as any);

            } catch (e) {
                db.updateImageJob(job.id, { status: 'FAILED', errorMessage: (e as Error).message });
            }
        })();
        
        return job;
    }

    getJobs(userId: string) { return db.getImageJobs(userId); }
}

export const imageService = new ImageService();
