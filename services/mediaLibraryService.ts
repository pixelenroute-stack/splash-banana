
import { n8nAgentService } from '../lib/n8nAgentService';
import { MediaAsset, MediaFilterParams } from '../types';

export class MediaLibraryService {
  /**
   * Récupère les assets stockés via le workflow n8n.
   * Le workflow doit retourner les éléments classés par catégorie.
   */
  async getAssets(userId: string, filters: MediaFilterParams): Promise<{ data: MediaAsset[], total: number }> {
    try {
        // Fix: Replace non-existent execute method with fetchN8nWorkflow and pass payload in data object
        const result = await n8nAgentService.fetchN8nWorkflow('file_handling' as any, {
            action: 'get_library',
            type: filters.type,
            search: filters.search,
            userId
        });

        // Fix: n8nAgentService.fetchN8nWorkflow returns N8NResult which uses success boolean instead of status string
        if (result.success && result.data) {
            const assets = result.data.assets || [];
            return {
                data: assets,
                total: assets.length
            };
        }
        return { data: [], total: 0 };
    } catch (e) {
        console.error("Erreur Library n8n:", e);
        return { data: [], total: 0 };
    }
  }

  async deleteAsset(userId: string, assetId: string, type: 'image' | 'video'): Promise<boolean> {
      // Fix: Replace non-existent execute method with fetchN8nWorkflow
      const result = await n8nAgentService.fetchN8nWorkflow('file_handling' as any, { 
        action: 'delete_asset', 
        assetId, 
        type, 
        userId 
      });
      // Fix: result is N8NResult which has success property
      return result.success;
  }

  async getDownloadUrl(asset: MediaAsset): Promise<string> {
      return asset.publicUrl;
  }
}

export const mediaLibraryService = new MediaLibraryService();
