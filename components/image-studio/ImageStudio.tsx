
import React, { useState, useEffect, useRef } from 'react';
import { ImageJob, ImageGenerationParams } from '../../types';
import { imageService } from '../../services/imageService';
import { db } from '../../services/mockDatabase'; // Import DB for simulation
import { IMAGE_TEMPLATES, ImageTemplate } from './ImageTemplates';
import { PromptBar } from './PromptBar';
import { JobCard } from './JobCard';
import { Sparkles, History, LayoutGrid, Clock, Zap, Loader2, Code } from 'lucide-react';

const generateRandomPrompt = () => {
    const subjects = ["Cyberpunk samurai", "Astronaut in a flower field", "Futuristic sneakers", "Minimalist coffee shop", "Ancient temple ruins", "Neon lit city street", "Abstract geometric shapes"];
    const styles = ["Unreal Engine 5 render", "Oil painting style", "Synthwave aesthetic", "Hyperrealistic photography", "Vector art", "Cinematic lighting", "Matte painting"];
    const details = ["4k resolution", "highly detailed", "volumetric lighting", "sharp focus", "vibrant colors", "dark atmosphere", "pastel tones"];

    const sub = subjects[Math.floor(Math.random() * subjects.length)];
    const sty = styles[Math.floor(Math.random() * styles.length)];
    const det = details[Math.floor(Math.random() * details.length)];
    const det2 = details[Math.floor(Math.random() * details.length)];

    return `[SIMULATION] ${sub}, ${sty}, ${det}, ${det2}`;
};

export const ImageStudio: React.FC = () => {
    const [jobs, setJobs] = useState<ImageJob[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<ImageTemplate | null>(null);
    const [viewMode, setViewMode] = useState<'create' | 'history'>('create');
    
    // Polling Ref
    const pollingRef = useRef<any>(null);
    const USER_ID = 'user_1'; // Hardcoded for MVP
    const settings = db.getSystemSettings();
    const isDev = settings.appMode === 'developer';

    useEffect(() => {
        loadJobs();
        return () => stopPolling();
    }, []);

    // Polling Logic for active jobs
    useEffect(() => {
        const hasActiveJobs = jobs.some(j => j.status === 'PENDING' || j.status === 'PROCESSING');
        if (hasActiveJobs && !pollingRef.current) {
            startPolling();
        } else if (!hasActiveJobs && pollingRef.current) {
            stopPolling();
            setIsGenerating(false); // Safety reset
        }
    }, [jobs]);

    const loadJobs = async () => {
        const j = await imageService.getJobs(USER_ID);
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

    const handleRun = async (params: ImageGenerationParams) => {
        setIsGenerating(true);
        setViewMode('create'); // Force view to creation result
        try {
            await imageService.createJob(USER_ID, 'TXT2IMG', params);
            await loadJobs(); // Immediate fetch to show pending card
        } catch (e) {
            alert("Erreur lors du lancement du job: " + (e as Error).message);
            setIsGenerating(false);
        }
    };

    // --- SIMULATION LOGIC ---
    const runSimulation = async () => {
        if (isSimulating || isGenerating) return;
        setIsSimulating(true);
        setViewMode('create');

        const randomPrompt = generateRandomPrompt();

        // 1. Create Fake Job
        const fakeJobId = `sim_job_${Date.now()}`;
        const fakeJob: ImageJob = {
            id: fakeJobId,
            userId: USER_ID,
            provider: 'simulation',
            modelId: 'banana-mock-v1',
            type: 'TXT2IMG',
            status: 'PENDING',
            params: {
                prompt: randomPrompt,
                aspectRatio: '1:1',
                resolution: '1K',
                numberOfImages: 1
            },
            costTokens: 0,
            createdAt: new Date().toISOString()
        };

        // Inject directly into DB
        db.createImageJob(fakeJob);
        await loadJobs(); // Update UI

        // 2. Simulate Processing
        setTimeout(async () => {
            db.updateImageJob(fakeJobId, { status: 'PROCESSING' });
            await loadJobs();
            
            // 3. Complete
            setTimeout(async () => {
                const encodedPrompt = encodeURIComponent(randomPrompt.replace('[SIMULATION] ', ''));
                const mockUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;
                
                db.createImageAsset({
                    id: `sim_asset_${Date.now()}`,
                    jobId: fakeJobId,
                    userId: USER_ID,
                    storagePath: 'mock',
                    publicUrl: mockUrl,
                    width: 1024,
                    height: 1024,
                    mimeType: 'image/png',
                    promptCopy: fakeJob.params.prompt,
                    isFavorite: false,
                    isArchived: false,
                    createdAt: new Date().toISOString()
                });

                db.updateImageJob(fakeJobId, { status: 'COMPLETED' });
                await loadJobs();
                setIsSimulating(false);
            }, 3000); // 3s processing
        }, 1000); // 1s pending
    };

    const handleTemplateClick = (t: ImageTemplate) => {
        setSelectedTemplate(t);
        // The PromptBar will react to this state change via props
    };

    const recentJobs = jobs.slice(0, 10); // Show last 10 jobs in main view

    return (
        <div className="flex h-full bg-[#020617] relative overflow-hidden">
            
            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col h-full relative z-10">
                
                {/* HEADER */}
                <header className="p-6 flex items-center justify-between bg-gradient-to-b from-[#020617] to-transparent">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Sparkles className="text-primary" /> Image Studio
                            {isDev && (
                                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono flex items-center gap-1">
                                    <Code size={10}/> API: Banana Pro (Gemini 2.5)
                                </span>
                            )}
                        </h1>
                        <p className="text-slate-400 text-sm">Générez des visuels pro avec Banana Engine (N8N/Flux)</p>
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

                        <div className="flex gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                            <button 
                                onClick={() => setViewMode('create')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'create' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button 
                                onClick={() => setViewMode('history')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'history' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                <History size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-y-auto pb-32 px-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
                    
                    {/* MODE: CREATE (Templates + Recent Result) */}
                    {viewMode === 'create' && (
                        <div className="max-w-5xl mx-auto space-y-12 pt-4">
                            
                            {/* ACTIVE JOB DISPLAY (If any) */}
                            {jobs.length > 0 && (jobs[0].status === 'PENDING' || jobs[0].status === 'PROCESSING') && (
                                <section className="mb-8">
                                    <h2 className="text-sm font-bold text-slate-500 uppercase mb-4 tracking-wider flex items-center gap-2">
                                        <Clock size={14} /> En cours
                                    </h2>
                                    <JobCard job={jobs[0]} />
                                </section>
                            )}

                            {/* TEMPLATES GALLERY */}
                            {/* Only show if not generating or if user wants to start new */}
                            <section>
                                <h2 className="text-center text-xl font-medium text-white mb-8">Commencer avec un modèle</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {IMAGE_TEMPLATES.map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => handleTemplateClick(t)}
                                            className="group relative h-40 rounded-xl overflow-hidden border border-slate-800 hover:border-primary/50 transition-all hover:scale-[1.02] text-left p-5 flex flex-col justify-between"
                                        >
                                            {/* Gradient Background */}
                                            <div className={`absolute inset-0 bg-gradient-to-br ${t.gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />
                                            
                                            <div className="relative z-10 text-2xl group-hover:scale-110 transition-transform origin-left duration-300">
                                                {t.icon}
                                            </div>
                                            
                                            <div className="relative z-10">
                                                <h3 className="font-bold text-white text-sm">{t.title}</h3>
                                                <p className="text-[10px] text-slate-400 leading-tight mt-1 line-clamp-2">{t.description}</p>
                                            </div>

                                            <div className="absolute top-2 right-2 bg-black/20 backdrop-blur rounded px-1.5 py-0.5 text-[10px] text-white/50 font-mono">
                                                {t.aspectRatio}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* RECENT RESULTS */}
                            {jobs.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="h-px bg-slate-800 flex-1" />
                                        <span className="text-xs font-bold text-slate-500 uppercase">Récemment</span>
                                        <div className="h-px bg-slate-800 flex-1" />
                                    </div>
                                    <div className="grid grid-cols-1 gap-8">
                                        {recentJobs.filter(j => j.status === 'COMPLETED').map(job => (
                                            <JobCard key={job.id} job={job} />
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}

                    {/* MODE: HISTORY (Full List) */}
                    {viewMode === 'history' && (
                        <div className="max-w-5xl mx-auto pt-4">
                             <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <History size={20} className="text-slate-400" /> Historique Complet
                            </h2>
                            <div className="space-y-8">
                                {jobs.map(job => (
                                    <JobCard key={job.id} job={job} />
                                ))}
                                {jobs.length === 0 && (
                                    <div className="text-center py-20 text-slate-500">Aucun historique.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* STICKY PROMPT BAR */}
                <PromptBar 
                    onRun={handleRun} 
                    isGenerating={isGenerating}
                    initialPrompt={selectedTemplate?.defaultPrompt}
                    initialRatio={selectedTemplate?.aspectRatio}
                />
            </div>
        </div>
    );
};
