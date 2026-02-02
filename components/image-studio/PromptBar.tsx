
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Image as ImageIcon, Search, Settings2, Loader2, Wand2, X, Check } from 'lucide-react';
import { ImageAspectRatio, ImageGenerationParams } from '../../types';

interface PromptBarProps {
    onRun: (params: ImageGenerationParams) => void;
    isGenerating: boolean;
    initialPrompt?: string;
    initialRatio?: ImageAspectRatio;
}

export const PromptBar: React.FC<PromptBarProps> = ({ onRun, isGenerating, initialPrompt = '', initialRatio = '16:9' }) => {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>(initialRatio);
    const [numImages, setNumImages] = useState(1);
    const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('2K');
    const [showSettings, setShowSettings] = useState(false);
    
    const [referenceImage, setReferenceImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialPrompt) setPrompt(initialPrompt);
        if (initialRatio) setAspectRatio(initialRatio);
    }, [initialPrompt, initialRatio]);

    const handleRun = () => {
        if (!prompt.trim() || isGenerating) return;
        onRun({
            prompt,
            aspectRatio,
            resolution,
            numberOfImages: numImages,
            seed: undefined,
            referenceImageUrl: referenceImage || undefined
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleRun();
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert("Veuillez sélectionner uniquement des fichiers image.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("L'image est trop volumineuse (> 5MB)");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setReferenceImage(reader.result as string);
        };
        reader.readAsDataURL(file);
        
        // Reset the value so the same file can be re-uploaded if cleared
        if (e.target) e.target.value = '';
    };

    const triggerFileInput = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        fileInputRef.current?.click();
    };

    const clearReferenceImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setReferenceImage(null);
    };

    return (
        <div className="absolute bottom-6 left-6 right-6 z-20">
            <div className="max-w-4xl mx-auto flex flex-col gap-2">
                
                {showSettings && (
                    <div className="bg-surface/95 backdrop-blur-xl border border-slate-700 p-4 rounded-xl shadow-2xl mb-2 animate-in slide-in-from-bottom-2 fade-in">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block tracking-widest">Ratio</label>
                                <div className="flex flex-wrap gap-2">
                                    {['1:1', '16:9', '9:16', '4:5', '3:4'].map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => setAspectRatio(r as any)}
                                            className={`text-[10px] font-bold px-2 py-1.5 rounded border transition-all ${aspectRatio === r ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block tracking-widest">Résolution</label>
                                <div className="flex gap-2">
                                    {['1K', '2K', '4K'].map((res) => (
                                        <button
                                            key={res}
                                            onClick={() => setResolution(res as any)}
                                            className={`text-[10px] font-bold px-2 py-1.5 rounded border transition-all ${resolution === res ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                                        >
                                            {res}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block tracking-widest">Images</label>
                                <div className="flex gap-2">
                                    {[1, 2, 4].map((n) => (
                                        <button
                                            key={n}
                                            onClick={() => setNumImages(n)}
                                            className={`text-[10px] font-bold px-3 py-1.5 rounded border transition-all ${numImages === n ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl p-2 flex flex-col gap-2 focus-within:border-primary/50 transition-all ring-1 ring-white/5">
                    
                    <div className="flex items-start">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Décrivez l'image que vous voulez générer..."
                            className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm p-3 outline-none resize-none h-16 scrollbar-hide"
                        />
                        
                        {referenceImage && (
                            <div className="p-2">
                                <div className="relative h-14 w-14 group animate-in zoom-in-95">
                                    <img 
                                        src={referenceImage} 
                                        alt="Ref" 
                                        className="h-full w-full object-cover rounded-lg border border-slate-700 shadow-md"
                                    />
                                    <button 
                                        onClick={clearReferenceImage}
                                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between px-2 pb-1">
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setShowSettings(!showSettings)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border
                                    ${showSettings ? 'bg-primary text-white border-primary' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                            >
                                <Settings2 size={14} />
                                <span>{aspectRatio} • {resolution}</span>
                            </button>
                            
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleImageUpload} 
                                accept="image/*" 
                                className="hidden" 
                            />
                            
                            <button 
                                onClick={triggerFileInput}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border
                                    ${referenceImage 
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                            >
                                {referenceImage ? <Check size={14} /> : <ImageIcon size={14} />}
                                <span>{referenceImage ? 'Image Prête' : 'Image Ref'}</span>
                            </button>

                            <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-[11px] font-bold transition-all border border-slate-700">
                                <Search size={14} />
                                <span>Grounding</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-[9px] text-slate-600 font-bold uppercase hidden md:inline">⌘ + Entrée</span>
                            <button
                                onClick={handleRun}
                                disabled={!prompt.trim() || isGenerating}
                                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all
                                    ${!prompt.trim() || isGenerating 
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                        : 'bg-gradient-to-r from-primary to-indigo-600 text-white shadow-lg shadow-primary/20 hover:scale-[1.03] active:scale-[0.98]'}`}
                            >
                                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                                {isGenerating ? 'Calcul...' : 'Lancer'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
