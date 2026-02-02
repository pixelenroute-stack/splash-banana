
import React, { useState, useEffect, useRef } from 'react';
import { VideoJob, VideoGenerationParams } from '../../types';
import { videoService } from '../../services/videoService';
import { db } from '../../services/mockDatabase'; // Import DB
import { VIDEO_TEMPLATES, VideoTemplate } from './VideoTemplates';
import { PromptBar } from './PromptBar';
import { SettingsPanel } from './SettingsPanel';
import { VideoJobItem } from './VideoJobItem';
import { Video, History, Clock, Key, Zap, Loader2, LayoutGrid, Code } from 'lucide-react';

const generateRandomVideoPrompt = () => {
    const cameras = ["Cinematic drone shot over", "Slow motion tracking shot of", "First person view of", "Wide angle shot of", "Close up macro shot of"];
    const subjects = ["a futuristic city at night", "a formula 1 car racing", "a chef cooking in a busy kitchen", "a mystical forest with glowing plants", "a samurai training in the rain", "water droplets falling on a leaf"];
    const atmospheres = ["with neon lights and heavy rain", "at sunset with golden hour lighting", "in a foggy mysterious atmosphere", "with vibrant colors and high contrast", "in black and white noir style"];
    
    const cam = cameras[Math.floor(Math.random() * cameras.length)];
    const sub = subjects[Math.floor(Math.random() * subjects.length)];
    const atm = atmospheres[Math.floor(Math.random() * atmospheres.length)];

    return `[SIMULATION] ${cam} ${sub}, ${atm}, 4k render`;
};

const MOCK_VIDEO_URLS = [
    "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
    "https://test-videos.co.uk/vids/jellyfish/mp4/h264/1080/Jellyfish_1080_10s_1MB.mp4",
    "https://test-videos.co.uk/vids/sintel/mp4/av1/1080/Sintel_1080_10s_1MB.mp4"
];

export const VideoStudio: React.FC = () => {
    const [jobs, setJobs] = useState<VideoJob[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
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
    const settings = db.getSystemSettings();
    const isDev = settings.appMode === 'developer';

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
        pollingRef.current = setInterval(loadJobs, 2000); // Polling plus rapide pour réactivité UI
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

    // --- SIMULATION LOGIC ---
    const runSimulation = async () => {
        if (isSimulating || isGenerating) return;
        setIsSimulating(true);
        setViewMode('create');

        const randomPrompt = generateRandomVideoPrompt();
        const randomUrl = MOCK_VIDEO_URLS[Math.floor(Math.random() * MOCK_VIDEO_URLS.length)];

        setPrompt(randomPrompt); // Visual feedback

        // 1. Fake Job
        const fakeJobId = `sim_vid_${Date.now()}`;
        const fakeJob: VideoJob = {
            id: fakeJobId,
            userId: USER_ID,
            provider: 'simulation-veo',
            modelId: 'veo-mock',
            status: 'QUEUED',
            progress: 0,
            params: { ...params, prompt: randomPrompt },
            createdAt: new Date().toISOString()
        };

        db.createVideoJob(fakeJob);
        await loadJobs();

        // 2. Simulate Progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            db.updateVideoJob(fakeJobId, { status: 'RUNNING', progress });
            loadJobs();

            if (progress >= 100) {
                clearInterval(interval);
                finishSimulation(fakeJobId, randomPrompt, randomUrl);
            }
        }, 800); // Fast simulation
    };

    const finishSimulation = async (jobId: string, promptUsed: string, videoUrl: string) => {
        db.createVideoAsset({
            id: `va_sim_${Date.now()}`,
            jobId: jobId,
            userId: USER_ID,
            publicUrl: videoUrl,
            duration: 10,
            width: 640,
            height: 360,
            fps: 24,
            mimeType: 'video/mp4',
            promptCopy: promptUsed,
            isFavorite: false,
            isArchived: false,
            createdAt: new Date().toISOString()
        });

        db.updateVideoJob(jobId, { status: 'COMPLETED', progress: 100 });
        await loadJobs();
        setIsSimulating(false);
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
                            {isDev && (
                                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono flex items-center gap-1">
                                    <Code size={10}/> API: Google Veo 3.1
                                </span>
                            )}
                        </h1>
                        <p className="text-slate-400 text-sm">Générez des séquences avec Google Veo</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* BOUTON SIMULATION (DEV ONLY) */}
                        {isDev && (
                            <button 
                                onClick={runSimulation}
                                disabled={isSimulating || isGenerating}
                                className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                            >
                                {isSimulating ? <Loader2 size={14} className="animate-spin"/> : <Zap size={14} className="fill-amber-400"/>}
                                {isSimulating ? 'Test en cours...' : '⚡ Simuler'}
                            </button>
                        )}

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
