
import React, { useEffect, useState, useRef } from 'react';
import { ImageJob, ImageAsset } from '../../types';
import { db } from '../../services/mockDatabase';
import { supabaseService } from '../../services/supabaseService';
import { Loader2, Download, MoreHorizontal, HardDrive, Check, CloudUpload } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

interface JobCardProps {
    job: ImageJob;
}

const CURRENT_USER_ID = "user_1";

export const JobCard: React.FC<JobCardProps> = ({ job }) => {
    const [assets, setAssets] = useState<ImageAsset[]>([]);
    const [elapsed, setElapsed] = useState(0);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
    const menuRef = useRef<HTMLDivElement>(null);
    const { notify } = useNotification();

    // Fetch assets when job completes
    useEffect(() => {
        if (job.status === 'COMPLETED') {
            const allAssets = db.getImageAssets(job.userId);
            setAssets(allAssets.filter(a => a.jobId === job.id && a.type === 'image') as ImageAsset[]);
        }
    }, [job.status, job.id, job.userId]);

    // Timer for processing state
    useEffect(() => {
        let interval: any;
        if (job.status === 'PROCESSING' || job.status === 'PENDING') {
            const start = new Date(job.createdAt).getTime();
            interval = setInterval(() => {
                setElapsed(Math.floor((Date.now() - start) / 1000));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [job.status, job.createdAt]);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDownload = (asset: ImageAsset) => {
        const link = document.createElement('a');
        link.href = asset.publicUrl;
        link.download = `pixel-banana-${asset.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setOpenMenuId(null);
        notify("Téléchargement lancé.", "info");
    };

    const handleSaveToLibrary = async (asset: ImageAsset) => {
        setSavingId(asset.id);
        notify("Sauvegarde vers Supabase Storage...", "loading");
        try {
            // 1. Conversion Base64 -> Blob
            const response = await fetch(asset.publicUrl);
            const blob = await response.blob();
            const filename = `Image_${job.id}_${asset.id}.png`;
            
            // 2. Upload via Supabase Service
            await supabaseService.uploadFile(CURRENT_USER_ID, blob, filename, 'image/png', 'image');

            setSavedIds(prev => new Set(prev).add(asset.id));
            setOpenMenuId(null);
            notify("Image sauvegardée dans la Bibliothèque.", "success");
        } catch (error) {
            console.error("Erreur de sauvegarde en bibliothèque", error);
            notify("Erreur lors de la sauvegarde Supabase.", "error");
        } finally {
            setSavingId(null);
        }
    };

    if (job.status === 'FAILED') {
        return (
            <div className="w-full bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
                <div>
                    <h4 className="text-red-400 font-bold text-sm">Échec de la génération</h4>
                    <p className="text-red-300 text-xs mt-1">{job.errorMessage || "Erreur inconnue"}</p>
                </div>
                <span className="text-xs text-red-500 font-mono">{job.params.aspectRatio}</span>
            </div>
        );
    }

    if (job.status === 'PENDING' || job.status === 'PROCESSING') {
        return (
            <div className="w-full aspect-[4/3] bg-surface border border-slate-700 rounded-xl relative overflow-hidden flex flex-col items-center justify-center group">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 animate-pulse" />
                <div className="relative z-10 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <div className="text-center">
                        <p className="text-white font-medium text-sm">Création en cours...</p>
                        <p className="text-slate-400 text-xs font-mono mt-1">{elapsed}s</p>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/40 backdrop-blur-sm border-t border-white/5">
                    <p className="text-xs text-slate-300 truncate font-mono opacity-80">{job.params.prompt}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className={`grid gap-4 ${assets.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {assets.map((asset) => (
                    <div key={asset.id} className="group relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl transition-all hover:border-slate-600">
                        <img
                            src={asset.publicUrl}
                            alt={asset.prompt || 'Generated image'}
                            className="w-full h-auto object-cover max-h-[500px]"
                            loading="lazy"
                        />
                        
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
                            <div className="flex justify-end relative">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuId(openMenuId === asset.id ? null : asset.id);
                                    }}
                                    className={`p-2 rounded-lg transition-colors shadow-lg ${openMenuId === asset.id ? 'bg-primary text-white' : 'bg-black/50 text-white hover:bg-primary'}`}
                                >
                                    <MoreHorizontal size={16} />
                                </button>

                                {openMenuId === asset.id && (
                                    <div 
                                        ref={menuRef}
                                        className="absolute top-10 right-0 w-64 bg-surface/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl py-2 z-30 animate-in fade-in zoom-in-95 duration-200"
                                    >
                                        <button 
                                            onClick={() => handleDownload(asset)}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                                        >
                                            <Download size={16} className="text-slate-500" />
                                            Télécharger l'image
                                        </button>
                                        <button 
                                            onClick={() => handleSaveToLibrary(asset)}
                                            disabled={savingId === asset.id || savedIds.has(asset.id)}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {savingId === asset.id ? (
                                                <Loader2 size={16} className="animate-spin text-primary" />
                                            ) : savedIds.has(asset.id) ? (
                                                <Check size={16} className="text-green-500" />
                                            ) : (
                                                <CloudUpload size={16} className="text-slate-500" />
                                            )}
                                            {savedIds.has(asset.id) ? 'Sauvegardé' : 'Envoyer dans la Bibliothèque'}
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            {/* Quick Actions overlay */}
                            <div className="flex justify-center gap-3">
                                <button onClick={() => handleDownload(asset)} className="p-2 bg-white/10 backdrop-blur text-white rounded-full hover:bg-primary transition-colors border border-white/20" title="Télécharger">
                                    <Download size={18} />
                                </button>
                                <button 
                                    onClick={() => handleSaveToLibrary(asset)} 
                                    disabled={savedIds.has(asset.id)}
                                    className={`p-2 bg-white/10 backdrop-blur text-white rounded-full hover:bg-green-600 transition-colors border border-white/20 ${savedIds.has(asset.id) ? 'opacity-50 cursor-default' : ''}`} 
                                    title="Sauvegarder"
                                >
                                    {savedIds.has(asset.id) ? <Check size={18}/> : <CloudUpload size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="flex items-start gap-3 px-1">
                <div className="flex-1">
                    <p className="text-sm text-slate-200 line-clamp-2 leading-relaxed">{job.params.prompt}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 font-mono">
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{job.params.aspectRatio}</span>
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{job.params.resolution}</span>
                        <span>{new Date(job.createdAt).toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
