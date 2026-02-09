
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../../services/supabaseService';
import { MediaAsset, MediaFilterParams } from '../../types';
import { AssetCard } from './AssetCard';
import { PreviewModal } from './PreviewModal';
import { Search, Image as ImageIcon, Video, Filter, Loader2, RefreshCw, FileText, UploadCloud, Folder, Cloud } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

export const MediaLibrary: React.FC = () => {
    const [assets, setAssets] = useState<MediaAsset[]>([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<MediaFilterParams>({ type: 'all', search: '', page: 1, pageSize: 50 });
    const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { notify } = useNotification();

    const CURRENT_USER_ID = "user_1"; // Mock Session

    useEffect(() => {
        loadAssets();
    }, []);

    const loadAssets = async () => {
        setLoading(true);
        try {
            // Récupération depuis Supabase (DB + Storage Link)
            const remoteAssets = await supabaseService.getMediaAssets();
            setAssets(remoteAssets);
        } catch (e) {
            console.error("Failed to load library", e);
            notify("Erreur de chargement de la bibliothèque.", "error");
        } finally {
            setLoading(false);
        }
    };

    // --- ACTIONS ---

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }));
    };

    const handleTypeFilter = (type: 'all' | 'image' | 'video' | 'file') => {
        setFilters(prev => ({ ...prev, type, page: 1 }));
    };

    const handleDownload = (asset: MediaAsset) => {
        // Utilise le lien public Supabase ou le blob mock
        const url = asset.downloadUrl || asset.publicUrl;
        if (url) {
            const link = document.createElement('a');
            link.href = url;
            link.target = "_blank";
            // Tentative de nom de fichier propre
            link.download = asset.prompt ? `${asset.prompt.substring(0, 20)}.${asset.type === 'image' ? 'png' : asset.type === 'video' ? 'mp4' : 'bin'}` : 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            notify("Lien de téléchargement non disponible.", "error");
        }
    };

    const handleDelete = async (asset: MediaAsset) => {
        if (!window.confirm("Supprimer ce fichier de la bibliothèque ?")) return;
        
        try {
            await supabaseService.deleteMediaAsset(asset.id);
            setAssets(prev => prev.filter(a => a.id !== asset.id));
            notify("Fichier supprimé.", "success");
        } catch (e) {
            notify("Erreur lors de la suppression.", "error");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        notify("Upload vers Supabase Storage en cours...", "loading");
        try {
            // Détection type simple
            let type: 'image' | 'video' | 'file' = 'file';
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('video/')) type = 'video';

            await supabaseService.uploadFile(CURRENT_USER_ID, file, file.name, file.type, type);
            notify("Fichier ajouté à la bibliothèque.", "success");
            await loadAssets(); // Recharger après upload
        } catch (err) {
            notify(`Erreur d'upload: ${(err as Error).message}`, "error");
        } finally {
            setIsUploading(false);
        }
    };

    // --- FILTERING LOGIC ---
    const filteredAssets = assets.filter(asset => {
        // Filter by Type
        if (filters.type !== 'all' && asset.type !== filters.type) return false;
        
        // Filter by Search
        if (filters.search && asset.prompt) {
            return asset.prompt.toLowerCase().includes(filters.search.toLowerCase());
        }
        return true;
    });

    return (
        <div className="flex flex-col h-full bg-[#020617] overflow-hidden">
            
            {/* HEADER */}
            <header className="p-6 border-b border-slate-800 bg-surface/50 backdrop-blur flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Folder className="text-primary" /> Bibliothèque Média
                    </h1>
                    <p className="text-slate-400 text-sm flex items-center gap-1">
                        Stockage Cloud <span className="text-xs font-mono bg-green-500/10 text-green-400 px-2 rounded border border-green-500/20 flex items-center gap-1"><Cloud size={10}/> Supabase</span>
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center">
                    {/* Search */}
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Rechercher fichier..." 
                            value={filters.search}
                            onChange={handleSearch}
                            className="bg-slate-900 border border-slate-700 text-white pl-9 pr-4 py-2 rounded-lg text-sm w-full md:w-64 focus:ring-1 focus:ring-primary outline-none"
                        />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700 overflow-x-auto max-w-[300px] md:max-w-none">
                        <button 
                            onClick={() => handleTypeFilter('all')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filters.type === 'all' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                            Tout
                        </button>
                        <button 
                            onClick={() => handleTypeFilter('image')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${filters.type === 'image' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                            <ImageIcon size={12}/> Images
                        </button>
                        <button 
                            onClick={() => handleTypeFilter('video')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${filters.type === 'video' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                            <Video size={12}/> Vidéos
                        </button>
                        <button 
                            onClick={() => handleTypeFilter('file')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${filters.type === 'file' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                            <FileText size={12}/> Fichiers
                        </button>
                    </div>
                    
                    <div className="flex gap-2">
                        <label className="px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg cursor-pointer shadow-lg transition-all flex items-center gap-2 text-sm font-bold active:scale-95">
                            {isUploading ? <Loader2 size={16} className="animate-spin"/> : <UploadCloud size={16} />}
                            Importer
                            <input type="file" className="hidden" onChange={handleFileUpload} />
                        </label>
                        <button onClick={loadAssets} className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors" title="Actualiser">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </header>

            {/* GRID CONTENT */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
                {loading && assets.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-500 gap-3">
                        <Loader2 className="animate-spin" /> Synchronisation Supabase...
                    </div>
                ) : filteredAssets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                        <Filter size={48} className="opacity-20" />
                        <p>Aucun fichier trouvé dans la bibliothèque.</p>
                        <button onClick={() => setFilters({ type: 'all', search: '', page: 1, pageSize: 50 })} className="text-primary hover:underline text-sm">
                            Réinitialiser les filtres
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {filteredAssets.map(asset => (
                            <AssetCard 
                                key={asset.id} 
                                asset={asset} 
                                onPreview={setPreviewAsset}
                                onDownload={handleDownload}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL */}
            <PreviewModal 
                isOpen={!!previewAsset} 
                asset={previewAsset} 
                onClose={() => setPreviewAsset(null)}
                onDownload={handleDownload}
            />
        </div>
    );
};
