
import React from 'react';
import { MediaAsset } from '../../types';
import { Play, Download, Trash2, Eye, Image as ImageIcon, Video, FileText } from 'lucide-react';

interface AssetCardProps {
    asset: MediaAsset;
    onPreview: (asset: MediaAsset) => void;
    onDownload: (asset: MediaAsset) => void;
    onDelete: (asset: MediaAsset) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, onPreview, onDownload, onDelete }) => {
    
    // Format duration helper (e.g. 125s -> 02:05)
    const formatDuration = (seconds?: number) => {
        if (!seconds) return '';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="group relative bg-surface border border-slate-700 rounded-xl overflow-hidden hover:border-slate-500 transition-all shadow-sm hover:shadow-lg">
            
            {/* THUMBNAIL AREA */}
            <div 
                className="aspect-square bg-slate-900 relative cursor-pointer overflow-hidden flex items-center justify-center"
                onClick={() => onPreview(asset)}
            >
                {asset.type === 'image' ? (
                    <img 
                        src={asset.thumbnailUrl || asset.publicUrl} 
                        alt={asset.prompt} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        loading="lazy"
                    />
                ) : asset.type === 'video' ? (
                    <div className="w-full h-full relative">
                        {/* Video Thumbnail (Poster) or video element for hover preview */}
                        <video 
                            src={asset.downloadUrl || asset.publicUrl} 
                            className="w-full h-full object-cover"
                            muted
                            loop
                            playsInline
                            // On hover logic could be added here
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Play size={20} className="text-white fill-white ml-1" />
                            </div>
                        </div>
                    </div>
                ) : (
                    // Generic File Type
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-500 group-hover:bg-slate-700 transition-colors">
                        <FileText size={48} className="mb-2 opacity-50" />
                        <span className="text-[10px] font-mono uppercase px-2 py-1 bg-black/30 rounded">
                            {asset.mimeType?.split('/')[1] || 'FILE'}
                        </span>
                    </div>
                )}

                {/* TYPE BADGE (Top Left) */}
                <div className="absolute top-2 left-2">
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded backdrop-blur-md border border-white/10
                        ${asset.type === 'video' ? 'bg-purple-500/80 text-white' : 
                          asset.type === 'image' ? 'bg-blue-500/80 text-white' : 
                          'bg-orange-500/80 text-white'}`}>
                        {asset.type === 'video' ? <Video size={10} /> : asset.type === 'image' ? <ImageIcon size={10} /> : <FileText size={10} />}
                        <span className="uppercase">{asset.type}</span>
                    </span>
                </div>

                {/* DURATION BADGE (Bottom Right for Video) */}
                {asset.type === 'video' && asset.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                        {formatDuration(asset.duration)}
                    </div>
                )}
            </div>

            {/* INFO & ACTIONS AREA */}
            <div className="p-3">
                <p className="text-xs text-slate-300 font-medium line-clamp-1 mb-1" title={asset.prompt}>
                    {asset.prompt || "Sans titre"}
                </p>
                <p className="text-[10px] text-slate-500 mb-3 font-mono">
                    {new Date(asset.createdAt).toLocaleDateString()}
                    {(asset.width && asset.height) && ` • ${asset.width}x${asset.height}`}
                </p>

                {/* Actions Toolbar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <button 
                        onClick={() => onPreview(asset)}
                        className="text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-slate-700 rounded"
                        title="Aperçu"
                    >
                        <Eye size={16} />
                    </button>
                    <div className="flex gap-1">
                        <button 
                            onClick={() => onDownload(asset)}
                            className="text-slate-400 hover:text-primary transition-colors p-1.5 hover:bg-slate-700 rounded"
                            title="Télécharger"
                        >
                            <Download size={16} />
                        </button>
                        <button 
                            onClick={() => onDelete(asset)}
                            className="text-slate-400 hover:text-red-400 transition-colors p-1.5 hover:bg-slate-700 rounded"
                            title="Supprimer"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
