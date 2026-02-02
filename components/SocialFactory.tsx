
import React, { useState, useRef } from 'react';
import { 
    Linkedin, Instagram, Youtube, Sparkles, Zap, 
    Copy, Download, Share2, Hash, Image as ImageIcon, 
    Video, Type, Loader2, PlayCircle, CheckCircle2, Code,
    Upload, Trash2, Send, Ratio, AlignCenter
} from 'lucide-react';
import { db } from '../services/mockDatabase';
import { useNotification } from '../context/NotificationContext';

type SocialPlatform = 'linkedin' | 'instagram' | 'youtube';
type MediaType = 'image' | 'video';
type AspectRatio = '1:1' | '4:5' | '16:9' | '9:16';

interface GeneratedContent {
    text?: string;
    hashtags?: string[];
    mediaUrl?: string;
    mediaType?: MediaType;
    titleVariants?: string[]; // Pour YouTube
}

// --- GÉNÉRATEUR DE SCÉNARIOS DYNAMIQUES ET COMPLETS ---
const generateRandomSocialScenario = (platform: SocialPlatform) => {
    // 1. Sujets Business / Créateur
    const subjects = [
        "l'Intelligence Artificielle Générative", "le Burnout des créateurs de contenu", 
        "la Productivité toxique en entreprise", "le Futur du Télétravail et du nomadisme", 
        "le Montage Vidéo dynamique style Hormozi", "l'Économie de la Création (Creator Economy)", 
        "le Personal Branding sur LinkedIn", "l'Automatisation No-Code avec n8n",
        "la Gestion financière pour freelances", "le Storytelling visuel impactant"
    ];
    
    // 2. Angles d'attaque (Hooks)
    const hooks = [
        "Personne ne vous dit la vérité sur", "J'ai failli tout abandonner à cause de", 
        "Arrêtez de faire ça si vous voulez réussir dans", "Le secret que 99% des gens ignorent sur", 
        "Comment j'ai gagné 10h par semaine grâce à", "Pourquoi votre stratégie sur",
        "L'erreur fatale qui tue votre engagement sur", "3 outils indispensables pour maîtriser"
    ];

    // 3. Styles Visuels (Pour le prompt image)
    const visualStyles = [
        "cyberpunk neon lighting high contrast", "minimalist clean workspace bright", 
        "cinematic dramatic lighting moody", "vibrant colorful 3d render isometric",
        "professional studio photography crisp", "abstract geometric shapes futuristic",
        "retro 80s synthwave aesthetic", "hand drawn illustration sketch style"
    ];

    // 4. Emotions / Ambiances
    const emotions = [
        "shocked face expression", "confident professional look", 
        "chaotic and overwhelming atmosphere", "zen and peaceful composition",
        "focus and determination closeup", "exploding mind gesture"
    ];

    // Sélection aléatoire
    const sub = subjects[Math.floor(Math.random() * subjects.length)];
    const hook = hooks[Math.floor(Math.random() * hooks.length)];
    const style = visualStyles[Math.floor(Math.random() * visualStyles.length)];
    const emotion = emotions[Math.floor(Math.random() * emotions.length)];

    // Construction du Topic (Interface)
    const topic = `${hook} ${sub}`;

    // Construction du Prompt Image ADAPTÉ À LA PLATEFORME
    let imagePrompt = "";
    
    if (platform === 'youtube') {
        imagePrompt = `YouTube thumbnail for video about ${sub}, ${emotion}, ${style}, highly detailed, 4k, text overlay placeholder`;
    } else if (platform === 'instagram') {
        imagePrompt = `Instagram aesthetic photography regarding ${sub}, ${emotion}, ${style}, high quality, social media trend, 4k, award winning photography`;
    } else { // linkedin
        imagePrompt = `Professional corporate illustration about ${sub}, ${emotion}, ${style}, minimal, business concept, isometric or vector style, high quality`;
    }

    // Contenu textuel simulé enrichi
    let textBody = "";
    if (platform === 'linkedin') {
        textBody = `🚀 **${hook} ${sub}...**\n\nIl y a 6 mois, je pensais que c'était impossible. Aujourd'hui, tout a changé.\n\nVoici les 3 leçons que j'ai apprises à la dure :\n1️⃣ La constance bat l'intensité.\n2️⃣ La qualité est subjective, la valeur est objective.\n3️⃣ On ne réussit jamais seul.\n\n👇 Et vous, quelle est votre plus grande leçon cette année ?\n\n#Growth #Mindset #${sub.replace(/\s/g, '').substring(0, 15)} #Career`;
    } else if (platform === 'instagram') {
        textBody = `POV : Quand tu découvres enfin comment maîtriser ${sub} 🤯\n.\n.\nEnregistre ce post pour plus tard ! 📌\n.\n#creator #${sub.replace(/\s/g, '').substring(0, 15)} #viral #fyp #motivation`;
    } else {
        textBody = ""; // YouTube titles generated separately
    }

    return { topic, textBody, sub, imagePrompt };
};

export const SocialFactory: React.FC = () => {
    // STATE
    const [activeTab, setActiveTab] = useState<SocialPlatform>('linkedin');
    const [topic, setTopic] = useState('');
    const [tone, setTone] = useState('Professionnel');
    const [selectedMediaType, setSelectedMediaType] = useState<MediaType>('image');
    const [selectedFormat, setSelectedFormat] = useState<AspectRatio>('1:1');
    const [referenceImage, setReferenceImage] = useState<string | null>(null);
    const [overlayText, setOverlayText] = useState(''); // NEW: Overlay Text State
    
    // STATE EXECUTION
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [result, setResult] = useState<GeneratedContent | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const settings = db.getSystemSettings();
    const isDevMode = settings.appMode === 'developer';
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
                // Construction d'un prompt contextuel pour l'image
                let visualContext = "";
                if (activeTab === 'linkedin') visualContext = "professional corporate illustration, business, minimal vector style";
                else if (activeTab === 'instagram') visualContext = "aesthetic photography, social media trend, high quality";
                else visualContext = "YouTube thumbnail, high contrast, catchy";

                const fullImagePrompt = `${topic}, ${visualContext}, ${tone} style`;
                const promptEncoded = encodeURIComponent(fullImagePrompt + (referenceImage ? " remix" : ""));
                
                // Ajout d'un seed aléatoire pour varier même si le prompt est identique
                const seed = Math.floor(Math.random() * 1000);
                mockResult.mediaUrl = `https://image.pollinations.ai/prompt/${promptEncoded}%20${seed}?width=${width}&height=${height}&nologo=true`;
            } else {
                // Video Fallback (Stock videos rotation for demo)
                const videos = [
                    "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
                    "https://test-videos.co.uk/vids/jellyfish/mp4/h264/1080/Jellyfish_1080_10s_1MB.mp4", 
                    "https://test-videos.co.uk/vids/sintel/mp4/av1/1080/Sintel_1080_10s_1MB.mp4"
                ];
                mockResult.mediaUrl = videos[Math.floor(Math.random() * videos.length)];
            }

            // 3. GENERATE TEXT (Based on User Inputs)
            if (activeTab === 'linkedin') {
                mockResult.text = `[Post généré pour : ${topic}]\n\nVoici une analyse experte sur le sujet avec un ton ${tone}.\n\n✅ Point clé 1 : L'importance du contexte.\n✅ Point clé 2 : La stratégie à adopter.\n\nQu'en pensez-vous ? 👇\n\n#${topic.split(' ')[0]} #Innovation #Business`;
            } else if (activeTab === 'instagram') {
                mockResult.text = `🔥 Nouveau contenu sur : ${topic} !\n\nSwipez pour découvrir les meilleures astuces. (Ton: ${tone})\n.\n.\n#${topic.replace(/\s/g, '')} #creator #instadaily`;
                mockResult.hashtags = [`#${topic.split(' ')[0]}`, "#viral", "#contentcreator", "#fyp"];
            } else if (activeTab === 'youtube') {
                mockResult.titleVariants = [
                    `Comment réussir ${topic} ? (Guide Ultime)`,
                    `${topic} : Ce que personne ne vous dit`,
                    `J'ai testé ${topic} et voici le résultat...`
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

    // --- SIMULATION LOGIC (Dev Mode / Random) ---
    const runSimulation = async () => {
        if (isSimulating || isGenerating) return;
        setIsSimulating(true);
        setResult(null);
        setTopic(""); 
        setOverlayText(""); // Reset text

        try {
            // Generate Random Dynamic Scenario (Unique every time)
            const scenario = generateRandomSocialScenario(activeTab);

            // 1. Typing Effect
            const mockTopic = scenario.topic;
            // Faster typing for better UX
            for (let i = 0; i < mockTopic.length; i+=2) {
                setTopic(prev => prev + mockTopic.substring(i, i+2));
                await new Promise(r => setTimeout(r, 10));
            }

            // Auto-fill Overlay Text for demo
            setOverlayText(scenario.sub.toUpperCase());

            setIsGenerating(true);
            notify("Simulation : Génération des assets via IA...", "loading");
            
            // 2. Simulate Processing
            await new Promise(r => setTimeout(r, 1500));

            // 3. Generate Mock Result based on Scenario
            let mockResult: GeneratedContent = {
                mediaType: activeTab === 'youtube' ? 'image' : selectedMediaType,
            };

            // DYNAMIC MEDIA URL with Strict Dimensions
            if (activeTab === 'youtube' || selectedMediaType === 'image') {
                let width = 1080;
                let height = 1080;

                if (activeTab === 'youtube') {
                    width = 1280;
                    height = 720; // Strict YouTube Thumbnail Size
                } else {
                    width = selectedFormat === '16:9' ? 1280 : selectedFormat === '9:16' ? 720 : 1080;
                    height = selectedFormat === '16:9' ? 720 : selectedFormat === '9:16' ? 1280 : 1080;
                }

                // Add randomization seed to URL to force unique image every time
                const seed = Math.floor(Math.random() * 10000);
                // USE THE SCENARIO IMAGE PROMPT (WHICH IS NOW PLATFORM AWARE)
                const encodedPrompt = encodeURIComponent(scenario.imagePrompt);
                
                mockResult.mediaUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}%20${seed}?width=${width}&height=${height}&nologo=true`;
            } else {
                // Rotate videos
                const videos = [
                    "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
                    "https://test-videos.co.uk/vids/jellyfish/mp4/h264/1080/Jellyfish_1080_10s_1MB.mp4", 
                    "https://test-videos.co.uk/vids/sintel/mp4/av1/1080/Sintel_1080_10s_1MB.mp4"
                ];
                mockResult.mediaUrl = videos[Math.floor(Math.random() * videos.length)];
            }

            // TEXT CONTENT FROM SCENARIO
            if (activeTab === 'linkedin') {
                mockResult.text = scenario.textBody;
            } else if (activeTab === 'instagram') {
                mockResult.text = scenario.textBody;
                mockResult.hashtags = ["#videoediting", "#premierepro", "#filmmaker", "#viral"];
            } else if (activeTab === 'youtube') {
                const cleanSub = scenario.sub.replace(/\s/g, '');
                mockResult.titleVariants = [
                    `Pourquoi ${scenario.sub} va tout changer en 2024`,
                    `J'ai testé ${scenario.sub} pendant 30 jours (Résultats Choc)`,
                    `Le Guide Ultime de ${scenario.sub} (Tuto Complet)`
                ];
            }

            setResult(mockResult);
            notify("Simulation terminée avec succès.", "success");

        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
            setIsSimulating(false);
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
                            {isDevMode && (
                                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono flex items-center gap-1">
                                    <Code size={10}/> API: Gemini Pro + Flash
                                </span>
                            )}
                        </h1>
                        <p className="text-slate-400 text-sm">Créez et publiez du contenu optimisé pour chaque plateforme.</p>
                    </div>
                    
                    {/* BUTTON SIMULATION */}
                    {isDevMode && (
                        <button 
                            onClick={runSimulation}
                            disabled={isSimulating || isGenerating}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                            {isSimulating ? <Loader2 size={14} className="animate-spin"/> : <Zap size={14} className="fill-amber-400"/>}
                            {isSimulating ? 'Simulation...' : '⚡ Simuler le flux'}
                        </button>
                    )}
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
                                    placeholder={
                                        activeTab === 'linkedin' ? "De quoi voulez-vous parler ? (Ex: L'IA au travail...)" :
                                        activeTab === 'instagram' ? "Décrivez votre Reel ou Post..." :
                                        "Sujet de la vidéo YouTube..."
                                    }
                                    className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-sm focus:border-primary outline-none resize-none"
                                />
                            </div>

                            {/* OVERLAY TEXT INPUT (NEW) */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2">
                                    <AlignCenter size={14}/> Texte Incrusté (Overlay)
                                </label>
                                <input 
                                    type="text" 
                                    value={overlayText}
                                    onChange={e => setOverlayText(e.target.value)}
                                    placeholder="Ex: PROMO -50% / TITRE CHOC / BREAKING NEWS" 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-primary outline-none font-bold"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">Ce texte sera superposé sur l'image ou la vidéo générée.</p>
                            </div>

                            {/* MEDIA SETTINGS (Not for YouTube which is Thumbnails only here) */}
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
                                    
                                    {/* VISUAL HEADER (With Overlay Text Logic) */}
                                    <div className={`relative bg-black flex items-center justify-center overflow-hidden group 
                                        ${selectedFormat === '9:16' ? 'aspect-[9/16] max-h-[600px]' : selectedFormat === '4:5' ? 'aspect-[4/5]' : 'aspect-video'}`}>
                                        
                                        {result.mediaType === 'video' ? (
                                            <div className="relative w-full h-full">
                                                <video src={result.mediaUrl} className="w-full h-full object-cover" controls loop muted autoPlay/>
                                                <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                                                    <PlayCircle size={12}/> VIDEO PREVIEW
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative w-full h-full">
                                                <img src={result.mediaUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"/>
                                                <div className="absolute bottom-4 right-4 flex gap-2">
                                                    <button className="bg-black/60 hover:bg-black text-white p-2 rounded-lg backdrop-blur-sm transition-all" title="Télécharger">
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

                                        {/* PUBLISH BUTTON (For LinkedIn/Insta) */}
                                        {activeTab !== 'youtube' && (
                                            <div className="pt-4 border-t border-slate-800 flex justify-end">
                                                <button 
                                                    onClick={handlePublish}
                                                    disabled={isPublishing}
                                                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    {isPublishing ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
                                                    {isPublishing ? 'Publication...' : `Publier sur ${activeTab === 'linkedin' ? 'LinkedIn' : 'Instagram'}`}
                                                </button>
                                            </div>
                                        )}
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
