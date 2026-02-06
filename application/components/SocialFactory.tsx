
import React, { useState, useRef } from 'react';
import { 
    Linkedin, Instagram, Youtube, Sparkles, Zap, 
    Copy, Download, Share2, Hash, Image as ImageIcon, 
    Video, Type, Loader2, PlayCircle, CheckCircle2, Code,
    Upload, Trash2, Send, Ratio, AlignCenter, HardDrive, CloudUpload
} from 'lucide-react';
import { db } from '../services/mockDatabase';
import { useNotification } from '../context/NotificationContext';
import { supabaseService } from '../services/supabaseService';

type SocialPlatform = 'linkedin' | 'instagram' | 'youtube';
type MediaType = 'image' | 'video';
type AspectRatio = '1:1' | '4:5' | '16:9' | '9:16';

const CURRENT_USER_ID = "user_1";

interface GeneratedContent {
    text?: string;
    hashtags?: string[];
    mediaUrl?: string;
    mediaType?: MediaType;
    titleVariants?: string[]; // Pour YouTube
}

export const SocialFactory: React.FC = () => {
    // STATE
    const [activeTab, setActiveTab] = useState<SocialPlatform>('linkedin');
    const [topic, setTopic] = useState('');
    const [tone, setTone] = useState('Professionnel');
    const [selectedMediaType, setSelectedMediaType] = useState<MediaType>('image');
    const [selectedFormat, setSelectedFormat] = useState<AspectRatio>('1:1');
    const [referenceImage, setReferenceImage] = useState<string | null>(null);
    const [overlayText, setOverlayText] = useState('');
    
    // STATE EXECUTION
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [result, setResult] = useState<GeneratedContent | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const settings = db.getSystemSettings();
    const { notify } = useNotification();

    // --- HELPERS ---
    const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setReferenceImage(reader.result as string);
        reader.readAsDataURL(file);
    };

    const triggerUpload = () => fileInputRef.current?.click();

    const getFormatsForPlatform = (): AspectRatio[] => {
        if (activeTab === 'youtube') return ['16:9'];
        if (activeTab === 'instagram') return selectedMediaType === 'video' ? ['9:16'] : ['1:1', '4:5', '9:16'];
        return ['1:1', '4:5', '16:9']; // LinkedIn supports document/video formats
    };

    // --- ACTIONS ---
    const handlePublish = async () => {
        if (!result) return;
        setIsPublishing(true);
        // Simulation d'appel API
        await new Promise(r => setTimeout(r, 1500));
        notify(`Contenu publié avec succès sur ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} !`, 'success');
        setIsPublishing(false);
    };

    const handleSaveToLibrary = async () => {
        if (!result) return;
        setIsSaving(true);
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const baseFilename = `Social_${activeTab}_${timestamp}`;

            // 1. Sauvegarde du Texte
            if (result.text) {
                const textContent = result.text + "\n\n" + (result.hashtags?.join(' ') || '');
                const textBlob = new Blob([textContent], { type: 'text/plain' });
                await supabaseService.uploadFile(CURRENT_USER_ID, textBlob, `${baseFilename}.txt`, 'text/plain', 'file');
            }

            // 2. Sauvegarde du Média (Image/Vidéo)
            if (result.mediaUrl) {
                const response = await fetch(result.mediaUrl);
                const blob = await response.blob();
                const ext = result.mediaType === 'image' ? 'png' : 'mp4';
                const mime = result.mediaType === 'image' ? 'image/png' : 'video/mp4';
                const type = result.mediaType === 'image' ? 'image' : 'video';
                
                await supabaseService.uploadFile(CURRENT_USER_ID, blob, `${baseFilename}.${ext}`, mime, type);
            }

            notify("Contenu sauvegardé dans la Bibliothèque (Supabase).", "success");
        } catch (e) {
            console.error(e);
            notify("Erreur lors de la sauvegarde.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownload = async () => {
        if(!result) return;
        if (result.text) {
            const element = document.createElement("a");
            const file = new Blob([result.text], {type: 'text/plain'});
            element.href = URL.createObjectURL(file);
            element.download = "caption.txt";
            document.body.appendChild(element);
            element.click();
        }
        if (result.mediaUrl) {
            const link = document.createElement('a');
            link.href = result.mediaUrl;
            link.target = "_blank";
            link.download = `social_media_${Date.now()}`;
            document.body.appendChild(link);
            link.click();
        }
    };

    // --- GENERATION MANUELLE (User Input) ---
    const handleGenerate = async () => {
        if (!topic) return;
        setIsGenerating(true);
        notify("Analyse du sujet et génération des assets...", "loading");

        try {
            // Simulation du délai de l'IA
            await new Promise(r => setTimeout(r, 2000));

            let mockResult: GeneratedContent = {
                mediaType: activeTab === 'youtube' ? 'image' : selectedMediaType,
            };

            // 1. CALCUL DIMENSIONS
            let width = 1080;
            let height = 1080;

            if (activeTab === 'youtube') {
                width = 1280;
                height = 720;
            } else {
                width = selectedFormat === '16:9' ? 1280 : selectedFormat === '9:16' ? 720 : 1080;
                height = selectedFormat === '16:9' ? 720 : selectedFormat === '9:16' ? 1280 : 1080;
            }

            // 2. GENERATE MEDIA URL
            if (activeTab === 'youtube' || selectedMediaType === 'image') {
                let visualContext = "";
                if (activeTab === 'linkedin') visualContext = "professional corporate illustration, business, minimal vector style";
                else if (activeTab === 'instagram') visualContext = "aesthetic photography, social media trend, high quality";
                else visualContext = "YouTube thumbnail, high contrast, catchy";

                const fullImagePrompt = `${topic}, ${visualContext}, ${tone} style`;
                const promptEncoded = encodeURIComponent(fullImagePrompt + (referenceImage ? " remix" : ""));
                
                const seed = Math.floor(Math.random() * 1000);
                mockResult.mediaUrl = `https://image.pollinations.ai/prompt/${promptEncoded}%20${seed}?width=${width}&height=${height}&nologo=true`;
            } else {
                // Video Fallback
                const videos = [
                    "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
                    "https://test-videos.co.uk/vids/jellyfish/mp4/h264/1080/Jellyfish_1080_10s_1MB.mp4"
                ];
                mockResult.mediaUrl = videos[Math.floor(Math.random() * videos.length)];
            }

            // 3. GENERATE TEXT
            if (activeTab === 'linkedin') {
                mockResult.text = `[Post généré pour : ${topic}]\n\nVoici une analyse experte sur le sujet avec un ton ${tone}.\n\n#${topic.split(' ')[0]} #Innovation #Business`;
            } else if (activeTab === 'instagram') {
                mockResult.text = `🔥 Nouveau contenu sur : ${topic} !\n\nSwipez pour découvrir les meilleures astuces. (Ton: ${tone})\n#${topic.replace(/\s/g, '')} #creator`;
                mockResult.hashtags = [`#${topic.split(' ')[0]}`, "#viral", "#contentcreator"];
            } else if (activeTab === 'youtube') {
                mockResult.titleVariants = [
                    `Comment réussir ${topic} ? (Guide Ultime)`,
                    `${topic} : Ce que personne ne vous dit`
                ];
            }

            setResult(mockResult);
            notify("Contenu généré avec succès.", "success");

        } catch (e) {
            console.error(e);
            notify("Erreur lors de la génération.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        notify("Copié dans le presse-papier", "success");
    };

    return (
        <div className="flex h-full bg-[#020617] overflow-hidden">
            <div className="flex-1 flex flex-col relative h-full">
                
                {/* HEADER */}
                <header className="p-6 border-b border-slate-800 bg-surface/50 backdrop-blur z-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Share2 className="text-pink-500" /> Social Factory
                        </h1>
                        <p className="text-slate-400 text-sm">Créez et publiez du contenu optimisé pour chaque plateforme.</p>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    
                    {/* LEFT: CONFIGURATION */}
                    <div className="w-1/3 min-w-[350px] border-r border-slate-800 bg-surface/30 p-6 flex flex-col gap-6 overflow-y-auto">
                        
                        {/* TABS */}
                        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
                            <button 
                                onClick={() => { setActiveTab('linkedin'); setResult(null); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'linkedin' ? 'bg-[#0077b5] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                <Linkedin size={18}/> LinkedIn
                            </button>
                            <button 
                                onClick={() => { setActiveTab('instagram'); setResult(null); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'instagram' ? 'bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                <Instagram size={18}/> Instagram
                            </button>
                            <button 
                                onClick={() => { setActiveTab('youtube'); setResult(null); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'youtube' ? 'bg-[#FF0000] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                <Youtube size={18}/> YouTube
                            </button>
                        </div>

                        {/* CONFIGURATION FORM */}
                        <div className="space-y-6">
                            
                            {/* TEXT INPUT */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                                    Sujet / Texte du Post
                                </label>
                                <textarea 
                                    value={topic}
                                    onChange={e => setTopic(e.target.value)}
                                    placeholder="Sujet de votre contenu..."
                                    className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-sm focus:border-primary outline-none resize-none"
                                />
                            </div>

                            {/* OVERLAY TEXT INPUT */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2">
                                    <AlignCenter size={14}/> Texte Incrusté (Overlay)
                                </label>
                                <input 
                                    type="text" 
                                    value={overlayText}
                                    onChange={e => setOverlayText(e.target.value)}
                                    placeholder="Ex: PROMO -50% / TITRE CHOC" 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-primary outline-none font-bold"
                                />
                            </div>

                            {/* MEDIA SETTINGS */}
                            {activeTab !== 'youtube' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Type de média</label>
                                        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                                            <button 
                                                onClick={() => { setSelectedMediaType('image'); setSelectedFormat('1:1'); }}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${selectedMediaType === 'image' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                            >
                                                <ImageIcon size={14}/> Image
                                            </button>
                                            <button 
                                                onClick={() => { setSelectedMediaType('video'); setSelectedFormat('9:16'); }}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${selectedMediaType === 'video' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                            >
                                                <Video size={14}/> Vidéo
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Ton</label>
                                        <select 
                                            value={tone}
                                            onChange={e => setTone(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs outline-none h-[34px]"
                                        >
                                            <option>Professionnel</option>
                                            <option>Engageant</option>
                                            <option>Humoristique</option>
                                            <option>Éducatif</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* FORMAT SELECTOR */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2">
                                    <Ratio size={14}/> Format / Ratio
                                </label>
                                <div className="flex gap-2">
                                    {getFormatsForPlatform().map(fmt => (
                                        <button
                                            key={fmt}
                                            onClick={() => setSelectedFormat(fmt)}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${selectedFormat === fmt ? 'bg-primary/20 border-primary text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                        >
                                            {fmt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* YOUTUBE REFERENCE IMAGE */}
                            {activeTab === 'youtube' && (
                                <div className="p-4 bg-slate-900 rounded-xl border border-slate-700 border-dashed">
                                    <div className="flex justify-between items-start mb-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                                            <ImageIcon size={14}/> Vignette de référence (Optionnel)
                                        </label>
                                        {referenceImage && (
                                            <button onClick={() => setReferenceImage(null)} className="text-red-400 hover:text-red-300">
                                                <Trash2 size={14}/>
                                            </button>
                                        )}
                                    </div>
                                    
                                    {!referenceImage ? (
                                        <div onClick={triggerUpload} className="cursor-pointer flex flex-col items-center justify-center py-4 text-slate-500 hover:text-white transition-colors">
                                            <Upload size={24} className="mb-2"/>
                                            <span className="text-xs">Cliquez pour uploader une image style</span>
                                            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleReferenceUpload} />
                                        </div>
                                    ) : (
                                        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-700">
                                            <img src={referenceImage} className="w-full h-full object-cover opacity-70"/>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur">Image chargée</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* GENERATE BUTTON */}
                        <button 
                            onClick={handleGenerate} 
                            disabled={!topic || isGenerating}
                            className="mt-auto w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isGenerating ? <Loader2 size={20} className="animate-spin"/> : <Sparkles size={20}/>}
                            {isGenerating ? 'Création en cours...' : 'Générer le contenu'}
                        </button>
                    </div>

                    {/* RIGHT: PREVIEW */}
                    <div className="flex-1 bg-[#0f172a] p-8 overflow-y-auto flex flex-col items-center justify-center relative">
                        {!result && !isGenerating && (
                            <div className="text-center text-slate-600 opacity-50">
                                <Sparkles size={64} className="mx-auto mb-4"/>
                                <p className="text-lg font-medium">Votre assistant créatif est prêt.</p>
                            </div>
                        )}

                        {isGenerating && (
                            <div className="text-center text-slate-400 animate-pulse">
                                <Loader2 size={48} className="mx-auto mb-4 animate-spin text-primary"/>
                                <p>Analyse du sujet et génération des médias...</p>
                            </div>
                        )}

                        {result && (
                            <div className="w-full max-w-2xl animate-in slide-in-from-bottom-8 duration-500">
                                {/* CARD PREVIEW */}
                                <div className="bg-surface border border-slate-700 rounded-3xl overflow-hidden shadow-2xl">
                                    
                                    {/* VISUAL HEADER */}
                                    <div className={`relative bg-black flex items-center justify-center overflow-hidden group 
                                        ${selectedFormat === '9:16' ? 'aspect-[9/16] max-h-[600px]' : selectedFormat === '4:5' ? 'aspect-[4/5]' : 'aspect-video'}`}>
                                        
                                        {result.mediaType === 'video' ? (
                                            <div className="relative w-full h-full">
                                                <video src={result.mediaUrl} className="w-full h-full object-cover" controls loop muted autoPlay/>
                                                <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                                                    <PlayCircle size={12}/> VIDEO
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative w-full h-full">
                                                <img src={result.mediaUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"/>
                                                <div className="absolute bottom-4 right-4 flex gap-2">
                                                    <button onClick={handleDownload} className="bg-black/60 hover:bg-black text-white p-2 rounded-lg backdrop-blur-sm transition-all" title="Télécharger">
                                                        <Download size={16}/>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* TEXT OVERLAY LAYER */}
                                        {overlayText && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6 z-20">
                                                <span className="text-white font-black text-4xl text-center uppercase drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] bg-black/20 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/20 transform rotate-[-2deg]">
                                                    {overlayText}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* CONTENT BODY */}
                                    <div className="p-8 space-y-6">
                                        
                                        {/* FOR YOUTUBE: TITLES */}
                                        {activeTab === 'youtube' && result.titleVariants && (
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                    <Type size={14}/> Titres suggérés
                                                </h4>
                                                {result.titleVariants.map((title, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800 group hover:border-slate-600 transition-colors">
                                                        <span className="text-sm font-bold text-white">{title}</span>
                                                        <button onClick={() => handleCopy(title)} className="text-slate-500 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Copy size={16}/>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* FOR LINKEDIN/INSTA: TEXT */}
                                        {(activeTab !== 'youtube' && result.text) && (
                                            <div>
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                        <Type size={14}/> {activeTab === 'instagram' ? 'Caption' : 'Post'}
                                                    </h4>
                                                    <button onClick={() => result.text && handleCopy(result.text)} className="text-xs text-primary hover:underline flex items-center gap-1">
                                                        <Copy size={12}/> Copier
                                                    </button>
                                                </div>
                                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                                                    {result.text}
                                                </div>
                                            </div>
                                        )}

                                        {/* HASHTAGS */}
                                        {result.hashtags && (
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                                                    <Hash size={14}/> Hashtags
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {result.hashtags.map((tag, i) => (
                                                        <span key={i} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs rounded-full cursor-pointer transition-colors border border-slate-700">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* PUBLISH & SAVE BUTTONS */}
                                        <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                                            <button 
                                                onClick={handleSaveToLibrary}
                                                disabled={isSaving}
                                                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center gap-2 border border-slate-600 transition-all disabled:opacity-50"
                                            >
                                                {isSaving ? <Loader2 size={18} className="animate-spin"/> : <CloudUpload size={18}/>}
                                                Enregistrer (Supabase)
                                            </button>
                                            
                                            {activeTab !== 'youtube' && (
                                                <button 
                                                    onClick={handlePublish}
                                                    disabled={isPublishing}
                                                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    {isPublishing ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
                                                    Publier
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
