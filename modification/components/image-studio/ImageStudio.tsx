
import React, { useState, useEffect, useRef } from 'react';
import { ImageJob, ImageGenerationParams } from '../../types';
import { imageService } from '../../services/imageService';
import { db } from '../../services/mockDatabase';
import { IMAGE_TEMPLATES, ImageTemplate } from './ImageTemplates';
import { PromptBar } from './PromptBar';
import { JobCard } from './JobCard';
import { Sparkles, History, LayoutGrid, Clock } from 'lucide-react';

export const ImageStudio: React.FC = () => {
    const [jobs, setJobs] = useState<ImageJob[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<ImageTemplate | null>(null);
    const [viewMode, setViewMode] = useState<'create' | 'history'>('create');
    
    // Polling Ref
    const pollingRef = useRef<any>(null);
    const USER_ID = 'user_1'; // Hardcoded for MVP

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
            setIsGenerating(false);
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
        setViewMode('create');
        try {
            await imageService.createJob(USER_ID, 'TXT2IMG', params);
            await loadJobs();
        } catch (e) {
            alert("Erreur lors du lancement du job: " + (e as Error).message);
            setIsGenerating(false);
        }
    };

    const handleTemplateClick = (t: ImageTemplate) => {
        setSelectedTemplate(t);
    };

    const recentJobs = jobs.slice(0, 10);

    return (
        <div className="flex h-full bg-[#020617] relative overflow-hidden">
            
            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col h-full relative z-10">
                
                {/* HEADER */}
                <header className="p-6 flex items-center justify-between bg-gradient-to-b from-[#020617] to-transparent">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Sparkles className="text-primary" /> Image Studio
                        </h1>
                        <p className="text-slate-400 text-sm">Générez des visuels pro avec Banana Engine (N8N/Flux)</p>
                    </div>
                    <div className="flex items-center gap-3">
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
                    
                    {/* MODE: CREATE */}
                    {viewMode === 'create' && (
                        <div className="max-w-5xl mx-auto space-y-12 pt-4">
                            
                            {/* ACTIVE JOB DISPLAY */}
                            {jobs.length > 0 && (jobs[0].status === 'PENDING' || jobs[0].status === 'PROCESSING') && (
                                <section className="mb-8">
                                    <h2 className="text-sm font-bold text-slate-500 uppercase mb-4 tracking-wider flex items-center gap-2">
                                        <Clock size={14} /> En cours
                                    </h2>
                                    <JobCard job={jobs[0]} />
                                </section>
                            )}

                            {/* TEMPLATES GALLERY */}
                            <section>
                                <h2 className="text-center text-xl font-medium text-white mb-8">Commencer avec un modèle</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {IMAGE_TEMPLATES.map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => handleTemplateClick(t)}
                                            className="group relative h-40 rounded-xl overflow-hidden border border-slate-800 hover:border-primary/50 transition-all hover:scale-[1.02] text-left p-5 flex flex-col justify-between"
                                        >
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

                    {/* MODE: HISTORY */}
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
