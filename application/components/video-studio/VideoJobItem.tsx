
import React, { useEffect, useState } from 'react';
import { VideoJob, VideoAsset } from '../../types';
import { db } from '../../services/mockDatabase';
import { supabaseService } from '../../services/supabaseService';
import { Loader2, Download, Clock, HardDrive, Check, CloudUpload } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

interface VideoJobItemProps {
    job: VideoJob;
}

const CURRENT_USER_ID = "user_1";

export const VideoJobItem: React.FC<VideoJobItemProps> = ({ job }) => {
    const [asset, setAsset] = useState<VideoAsset | undefined>(undefined);
    const [elapsed, setElapsed] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const { notify } = useNotification();

    // Load asset if completed
    useEffect(() => {
        if (job.status === 'COMPLETED') {
            const allAssets = db.getVideoAssets(job.userId);
            setAsset(allAssets.find(a => a.jobId === job.id && a.type === 'video') as VideoAsset);
        }
    }, [job.status, job.id, job.userId]);

    // Timer
    useEffect(() => {
        let interval: any;
        if (job.status === 'RUNNING' || job.status === 'QUEUED') {
            const start = new Date(job.createdAt).getTime();
            interval = setInterval(() => {
                setElapsed(Math.floor((Date.now() - start) / 1000));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [job.status, job.createdAt]);

    const handleSaveToCloud = async () => {
        if (!asset) return;
        setIsSaving(true);
        notify("Envoi vers Supabase Storage...", "loading");
        try {
            // Convert base64 to blob
            const response = await fetch(asset.publicUrl);
            const blob = await response.blob();
            const filename = `Video_${asset.id}.mp4`;
            
            await supabaseService.uploadFile(CURRENT_USER_ID, blob, filename, 'video/mp4', 'video');
            setIsSaved(true);
            notify("Vidéo sauvegardée dans la Bibliothèque.", "success");
        } catch (e) {
            notify("Erreur de sauvegarde Cloud", "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (job.status === 'FAILED') {
        return (
            <div className="w-full bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
                 <div>
                    <h4 className="text-red-400 font-bold text-sm">Échec Génération</h4>
                    <p className="text-red-300 text-xs mt-1 opacity-70">{job.errorMessage || "Erreur inconnue"}</p>
                </div>
            </div>
        );
    }

    if (job.status === 'QUEUED' || job.status === 'RUNNING') {
        return (
            <div className="aspect-video bg-surface border border-slate-700 rounded-xl relative overflow-hidden flex flex-col items-center justify-center group">
                 {/* Progress Bar Background */}
                 <div className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-500" style={{ width: `${job.progress || 0}%` }}></div>
                 
                 <div className="flex flex-col items-center gap-3 relative z-10">
                     <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                         {job.status === 'QUEUED' ? <Clock size={18} className="text-slate-400"/> : <Loader2 size={18} className="text-primary animate-spin"/>}
                     </div>
                     <div className="text-center">
                         <p className="text-white font-medium text-xs uppercase tracking-wider">{job.status}</p>
                         <p className="text-slate-500 text-xs font-mono">{elapsed}s • {job.progress}%</p>
                     </div>
                 </div>

                 <div className="absolute top-2 right-2 px-2 py-1 bg-black/40 rounded text-[10px] text-slate-300 font-mono border border-white/5">
                     {job.params.aspectRatio}
                 </div>
            </div>
        );
    }

    if (!asset) return null; // Should not happen if completed

    return (
        <div className="group relative rounded-xl overflow-hidden bg-black border border-slate-800 shadow-xl">
            {/* Video Player */}
            <video 
                src={asset.publicUrl} 
                className="w-full aspect-video object-cover bg-black"
                controls 
                loop 
                playsInline
                poster={asset.thumbnailUrl}
            />
            
            {/* Overlay Info */}
            <div className="p-4 bg-surface border-t border-slate-700">
                <p className="text-sm text-white line-clamp-1 mb-2">{job.params.prompt}</p>
                <div className="flex items-center justify-between">
                    <div className="flex gap-2 text-[10px] text-slate-500 font-mono">
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded">{asset.duration}s</span>
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded">{job.params.resolution}</span>
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded">{asset.fps} FPS</span>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleSaveToCloud}
                            disabled={isSaving || isSaved}
                            className={`p-1.5 rounded transition-colors flex items-center gap-1 ${isSaved ? 'text-green-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} 
                            title="Sauvegarder dans Supabase"
                        >
                            {isSaving ? <Loader2 size={14} className="animate-spin"/> : isSaved ? <Check size={14}/> : <CloudUpload size={14}/>}
                        </button>
                        <a href={asset.publicUrl} download={`video_${job.id}.mp4`} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Télécharger">
                            <Download size={14} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
