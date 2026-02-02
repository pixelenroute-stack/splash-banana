
import React, { useState, useEffect } from 'react';
import { Loader2, Wand2, Video } from 'lucide-react';

interface PromptBarProps {
    prompt: string;
    onPromptChange: (val: string) => void;
    onRun: () => void;
    isGenerating: boolean;
}

export const PromptBar: React.FC<PromptBarProps> = ({ prompt, onPromptChange, onRun, isGenerating }) => {
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (prompt.trim() && !isGenerating) onRun();
        }
    };

    return (
        <div className="absolute bottom-6 left-6 right-6 lg:right-[340px] z-20">
            <div className="max-w-4xl mx-auto">
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl p-2 flex flex-col gap-2 relative ring-1 ring-white/5 focus-within:ring-primary/50 transition-all">
                    
                    <textarea
                        value={prompt}
                        onChange={(e) => onPromptChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Décrivez la vidéo que vous imaginez (Ex: A neon hologram of a cat driving at top speed)..."
                        className="w-full bg-transparent text-white placeholder-slate-500 text-sm p-3 outline-none resize-none h-16 scrollbar-hide"
                    />

                    <div className="flex items-center justify-between px-2 pb-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                <Video size={10} /> Model: Veo 3.1
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-600 font-mono hidden sm:inline-block">CTRL + ENTER</span>
                            <button
                                onClick={onRun}
                                disabled={!prompt.trim() || isGenerating}
                                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all
                                    ${!prompt.trim() || isGenerating 
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                        : 'bg-gradient-to-r from-primary to-indigo-600 text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95'}`}
                            >
                                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                                {isGenerating ? 'Génération...' : 'Generate Video'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
