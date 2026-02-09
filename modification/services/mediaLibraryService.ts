
import { supabaseService } from './supabaseService';
import { MediaAsset, MediaFilterParams } from '../types';

export class MediaLibraryService {
  /**
   * Récupère les assets stockés via Supabase.
   */
  async getAssets(userId: string, filters: MediaFilterParams): Promise<{ data: MediaAsset[], total: number }> {
    try {
        const assets = await supabaseService.getMediaAssets();
        
        // Filtrage local (si Supabase n'a pas de filtres backend avancés configurés)
        let filtered = assets;
        if (filters.type !== 'all') {
            filtered = filtered.filter(a => a.type === filters.type);
        }
        if (filters.search) {
            filtered = filtered.filter(a => a.prompt?.toLowerCase().includes(filters.search.toLowerCase()));
        }

        return {
            data: filtered,
            total: filtered.length
        };
    } catch (e) {
        console.error("Erreur Library:", e);
        return { data: [], total: 0 };
    }
  }

  async deleteAsset(userId: string, assetId: string, type: 'image' | 'video'): Promise<boolean> {
      try {
          await supabaseService.deleteMediaAsset(assetId);
          return true;
      } catch {
          return false;
      }
  }

  async getDownloadUrl(asset: MediaAsset): Promise<string> {
      return asset.publicUrl;
  }
}

export const mediaLibraryService = new MediaLibraryService();
