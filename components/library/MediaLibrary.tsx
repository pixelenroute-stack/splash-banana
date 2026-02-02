
import React, { useState, useEffect } from 'react';
import { googleService } from '../../services/googleService';
import { MediaAsset, MediaFilterParams, DriveFile } from '../../types';
import { AssetCard } from './AssetCard';
import { PreviewModal } from './PreviewModal';
import { Search, Image as ImageIcon, Video, Grid, Filter, Loader2, RefreshCw, FileText, UploadCloud, Folder } from 'lucide-react';

// ID du dossier Google Drive spécifique pour la bibliothèque
const LIBRARY_FOLDER_ID = '1PjCsaOfNkcKE2qZFR0NQnKOdJ7RVdDX9';

export const MediaLibrary: React.FC = () => {
    const [assets, setAssets] = useState<MediaAsset[]>([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<MediaFilterParams>({ type: 'all', search: '', page: 1, pageSize: 50 });
    const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const CURRENT_USER_ID = "user_1"; // Mock Session

    useEffect(() => {
        loadAssets();
    }, []);

    // Conversion des fichiers Drive en MediaAsset pour l'affichage
    const mapDriveFileToAsset = (file: DriveFile): MediaAsset => {
        let type: 'image' | 'video' | 'file' = 'file';
        if (file.mimeType.startsWith('image/')) type = 'image';
        else if (file.mimeType.startsWith('video/')) type = 'video';

        return {
            id: file.id,
            type: type,
            publicUrl: file.webViewLink || '', // Utilise le lien Drive (Viewer)
            downloadUrl: file.webContentLink, // Utilise le lien de téléchargement direct
            prompt: file.name, // Le nom du fichier sert de titre/prompt
            createdAt: file.createdTime,
            width: 0, 
            height: 0,
            mimeType: file.mimeType
        };
    };

    const loadAssets = async () => {
        setLoading(true);
        try {
            // 1. Récupération depuis le dossier Drive spécifique
            const driveFiles = await googleService.listDriveFiles(CURRENT_USER_ID, LIBRARY_FOLDER_ID);
            
            // 2. Mapping
            const mappedAssets = driveFiles.map(mapDriveFileToAsset);
            setAssets(mappedAssets);
        } catch (e) {
            console.error("Failed to load library from Drive", e);
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
        // Utilise le lien de téléchargement direct si disponible, sinon le lien web
        const url = asset.downloadUrl || asset.publicUrl;
        if (url) {
            window.open(url, '_blank');
        } else {
            alert("Lien de téléchargement non disponible pour ce fichier.");
        }
    };

    const handleDelete = async (asset: MediaAsset) => {
        if (!window.confirm("Voulez-vous vraiment supprimer ce fichier du Drive ? (Action irréversible)")) return;
        
        try {
            // Utilise l'API Drive pour trash le fichier
            // Note: googleService.createDriveFile mocks this in dev, 
            // but in a real app we would add a delete method to googleService.
            // For now, let's simulate optimistic delete locally.
            setAssets(prev => prev.filter(a => a.id !== asset.id));
            alert("Fichier supprimé (Simulation - API Delete non implémentée dans googleService pour l'instant)");
        } catch (e) {
            alert("Erreur lors de la suppression");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            await googleService.uploadFile(CURRENT_USER_ID, file, LIBRARY_FOLDER_ID);
            await loadAssets(); // Recharger après upload
        } catch (err) {
            alert("Erreur d'upload vers Drive: " + (err as Error).message);
        } finally {
            setIsUploading(false);
        }
    };

    // --- FILTERING LOGIC ---
    const filteredAssets = assets.filter(asset => {
        // Filter by Type
        if (filters.type !== 'all' && asset.type !== filters.type) return false;
        
        // Filter by Search
        if (filters.search) {
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
                        <Folder className="text-primary" /> Bibliothèque Drive
                    </h1>
                    <p className="text-slate-400 text-sm flex items-center gap-1">
                        Connecté à <span className="text-xs font-mono bg-slate-800 px-1 rounded text-slate-300">Drive / Splash-Assets</span>
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
                        <label className="p-2 bg-primary hover:bg-blue-600 text-white rounded-lg cursor-pointer shadow-lg transition-all flex items-center justify-center min-w-[40px]">
                            {isUploading ? <Loader2 size={18} className="animate-spin"/> : <UploadCloud size={18} />}
                            <input type="file" className="hidden" onChange={handleFileUpload} />
                        </label>
                        <button onClick={loadAssets} className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors" title="Actualiser Drive">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </header>

            {/* GRID CONTENT */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
                {loading && assets.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-500 gap-3">
                        <Loader2 className="animate-spin" /> Synchronisation avec Google Drive...
                    </div>
                ) : filteredAssets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                        <Filter size={48} className="opacity-20" />
                        <p>Aucun fichier trouvé dans le dossier Splash-Assets.</p>
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
