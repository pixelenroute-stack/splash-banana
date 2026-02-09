
import React, { useState, useEffect, useRef } from 'react';
import { VideoJob, VideoGenerationParams } from '../../types';
import { videoService } from '../../services/videoService';
import { db } from '../../services/mockDatabase';
import { VIDEO_TEMPLATES, VideoTemplate } from './VideoTemplates';
import { PromptBar } from './PromptBar';
import { SettingsPanel } from './SettingsPanel';
import { VideoJobItem } from './VideoJobItem';
import { Video, History, Clock, Key, LayoutGrid } from 'lucide-react';

export const VideoStudio: React.FC = () => {
    const [jobs, setJobs] = useState<VideoJob[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [viewMode, setViewMode] = useState<'create' | 'history'>('create');
    const [prompt, setPrompt] = useState('');
    const [params, setParams] = useState<VideoGenerationParams>({
        prompt: '',
        aspectRatio: '16:9',
        resolution: '720p',
        duration: '5s',
        fps: '24',
        negativePrompt: ''
    });

    const pollingRef = useRef<any>(null);
    const USER_ID = 'user_1';

    useEffect(() => {
        loadJobs();
        return () => stopPolling();
    }, []);

    useEffect(() => {
        const hasActiveJobs = jobs.some(j => j.status === 'QUEUED' || j.status === 'RUNNING');
        if (hasActiveJobs && !pollingRef.current) startPolling();
        else if (!hasActiveJobs && pollingRef.current) {
            stopPolling();
            setIsGenerating(false); 
        }
    }, [jobs]);

    const loadJobs = async () => {
        const j = await videoService.getJobs(USER_ID);
        setJobs(j);
    };

    const startPolling = () => {
        pollingRef.current = setInterval(loadJobs, 2000);
    };

    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    const handleRun = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        setViewMode('create');
        try {
            await videoService.createJob(USER_ID, { ...params, prompt });
            loadJobs();
        } catch (e) {
            alert("Erreur: " + (e as Error).message);
            setIsGenerating(false);
        }
    };

    const openKeyDialog = async () => {
        await (window as any).aistudio.openSelectKey();
    };

    return (
        <div className="flex h-full bg-[#020617] overflow-hidden">
            <div className="flex-1 flex flex-col relative h-full">
                <header className="p-6 flex items-center justify-between z-10 bg-gradient-to-b from-[#020617] to-transparent">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Video className="text-purple-500" /> Video Studio
                        </h1>
                        <p className="text-slate-400 text-sm">Générez des séquences avec Google Veo</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={openKeyDialog} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700">
                            <Key size={14}/> Clé API
                        </button>
                        
                        <div className="flex gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                            <button onClick={() => setViewMode('create')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'create' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                                <LayoutGrid size={18}/>
                            </button>
                            <button onClick={() => setViewMode('history')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'history' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                                <History size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto pb-32 px-6 scrollbar-thin scrollbar-thumb-slate-800">
                    {viewMode === 'create' ? (
                        <div className="max-w-4xl mx-auto space-y-10 pt-4">
                            {jobs.some(j => j.status === 'RUNNING' || j.status === 'QUEUED') && (
                                <section>
                                    <h2 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2"><Clock size={12} /> En cours</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {jobs.filter(j => j.status === 'RUNNING' || j.status === 'QUEUED').map(job => <VideoJobItem key={job.id} job={job} />)}
                                    </div>
                                </section>
                            )}
                            <section>
                                <h2 className="text-center text-xl font-medium text-white mb-8">Modèles de production</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {VIDEO_TEMPLATES.map(t => (
                                        <button key={t.id} onClick={() => {setPrompt(t.defaultPrompt); setParams({...params, aspectRatio: t.aspectRatio, duration: t.duration});}} className="group relative h-48 rounded-xl overflow-hidden border border-slate-800 hover:border-purple-500/50 p-4 flex flex-col justify-between">
                                            <div className={`absolute inset-0 bg-gradient-to-br ${t.gradient} opacity-10 group-hover:opacity-20`} />
                                            <div className="relative z-10 text-3xl mb-2">{t.icon}</div>
                                            <div className="relative z-10">
                                                <h3 className="font-bold text-white text-sm">{t.title}</h3>
                                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{t.description}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>
                            {jobs.some(j => j.status === 'COMPLETED') && (
                                <section>
                                    <h2 className="text-xs font-bold text-slate-500 uppercase mb-6 flex items-center gap-4">Récemment générés</h2>
                                    <div className="grid grid-cols-1 gap-8">
                                        {jobs.filter(j => j.status === 'COMPLETED').slice(0, 5).map(job => <VideoJobItem key={job.id} job={job} />)}
                                    </div>
                                </section>
                            )}
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto pt-4 space-y-8">
                            <h2 className="text-lg font-bold text-white mb-6">Historique complet</h2>
                            {jobs.length === 0 ? <p className="text-slate-500 text-center py-20">Aucune vidéo.</p> : jobs.map(job => <VideoJobItem key={job.id} job={job} />)}
                        </div>
                    )}
                </div>
                <PromptBar prompt={prompt} onPromptChange={setPrompt} onRun={handleRun} isGenerating={isGenerating} />
            </div>
            <SettingsPanel params={params} onChange={setParams} disabled={isGenerating} />
        </div>
    );
};
