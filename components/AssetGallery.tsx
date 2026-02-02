
import React, { useState, useRef, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';
import { googleService } from '../services/googleService';
import { apiRouter } from '../services/apiRouter'; 
import { tutorialValidator, TutorialStep } from '../services/tutorialValidator'; 
import { pdfExportService, TutorialForPDF } from '../services/pdfExportService'; 
import { MoodboardData, CreativeAnalysisData, DriveFile, AdvancedTechnique, DetailedStep, AdvancedTechnique as CustomTutorial, TutorialSetting } from '../types';
import { db } from '../services/mockDatabase'; 
import { 
    Layout, Wand2, Palette, Type, 
    Link, Loader2, RefreshCw, 
    Sparkles, MonitorPlay, ArrowRight,
    Mic, Volume2, FilePlus, Download, Info, Clock, 
    Scissors, Zap, MessageSquareQuote, CheckCircle2,
    Lightbulb, Sliders, Layers, Save, FileJson, Play, Cloud, PenTool,
    Film, ScrollText, Copy, Droplet, Move, Image as ImageIcon,
    BookOpen, PlayCircle, Star, Upload, Video, AlertTriangle, Code,
    FileVideo, X, Plus, ScanEye, ArrowUpRight, Keyboard, Command, Edit3,
    MousePointer2, Brush
} from 'lucide-react';

const LIBRARY_FOLDER_ID = '1PjCsaOfNkcKE2qZFR0NQnKOdJ7RVdDX9';
const CURRENT_USER_ID = "user_1";

// --- SYSTEM PROMPT FOR TUTORIAL GENERATION ---
const TUTORIAL_SYSTEM_PROMPT = `
ROLE : Expert certifié Adobe (After Effects, Premiere Pro, Photoshop, Illustrator) et Senior Digital Artist.
OBJECTIF : Générer des tutoriels techniques ultra-précis, reproductibles à l'identique.

FORMAT DE SORTIE (JSON STRICT) :
[
  {
    "id": "unique_id",
    "title": "Nom de la technique",
    "software": "After Effects" | "Premiere Pro" | "Photoshop" | "Illustrator",
    "difficulty": "Débutant" | "Intermédiaire" | "Expert",
    "estimatedTime": "XX min",
    "description": "Courte description",
    "steps": [
      {
        "order": 1,
        "category": "Préparation" | "Texte" | "Effets" | "Animation" | "Rendu" | "Ajustements" | "Dessin" | "Retouche",
        "action": "Action principale (verbe infinitif)",
        "tool": "Nom exact de l'outil ou effet (EN ANGLAIS)",
        "keyboard": "Raccourci clavier (Win / Mac)",
        "settings": [
          { "name": "Paramètre Exact", "value": "Valeur Numérique", "unit": "px/|%/°" }
        ],
        "tip": "Conseil pro contextuel",
        "explanation": "Pourquoi on fait ça"
      }
    ],
    "validationErrors": []
  }
]

RÈGLES D'OR :
1. VALEURS EXACTES : Interdit d'utiliser "ajuster selon goût". Donne des valeurs numériques précises (ex: "Gaussian Blur > Blurriness: 15px").
2. NOMS EN ANGLAIS : Utilise les noms d'effets exacts d'Adobe en Anglais (ex: "Drop Shadow", "Lumetri Color", "Fast Box Blur").
3. RACCOURCIS : Toujours inclure le raccourci clavier si applicable.
4. ORDRE LOGIQUE : Préparation -> Action -> Effets -> Finalisation.
5. EXHAUSTIVITÉ : Ne saute aucune étape critique (création de calque, conversion en objet dynamique, etc.).

EFFETS DISPONIBLES (After Effects) :
- Blur: Fast Box Blur, Gaussian Blur, Radial Blur
- Color: Curves, Levels, Hue/Saturation, Lumetri Color
- Generate: Fractal Noise, 4-Color Gradient, Fill, Stroke
- Stylize: Glow, Roughen Edges
- Transition: Linear Wipe, Radial Wipe
- Distort: Turbulent Displace, Wave Warp
- Keying: Keylight (1.2)

EFFETS DISPONIBLES (Premiere Pro) :
- Color: Lumetri Color (Basic, Creative, Curves, Wheels, HSL, Vignette)
- Blur: Gaussian Blur, Directional Blur
- Transform: Crop, Horizontal Flip, Transform
- Keying: Ultra Key
- Warp Stabilizer

EFFETS DISPONIBLES (Photoshop) :
- Filters: Gaussian Blur, Motion Blur, High Pass, Liquify, Camera Raw Filter, Unsharp Mask
- Adjustments: Levels, Curves, Hue/Saturation
- Layer Styles: Drop Shadow, Inner Shadow, Outer Glow, Stroke, Bevel & Emboss, Color Overlay
- Select & Mask

EFFETS DISPONIBLES (Illustrator) :
- 3D: 3D Extrude & Bevel
- Stylize: Drop Shadow, Feather, Round Corners
- Blur: Gaussian Blur
- Path: Offset Path, Outline Stroke
- Pathfinder: Unite, Minus Front, Intersect, Exclude
- Distort & Transform: Zig Zag, Roughen, Transform, Twist
- Image Trace
`;

// --- HELPERS ---

const cleanAndParseJson = <T = any>(text: string): T | null => {
    if (!text) return null;
    let clean = text.trim();
    
    // Remove markdown code blocks
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const match = clean.match(codeBlockRegex);
    if (match) {
        clean = match[1].trim();
    }

    // Attempt to find JSON object or array boundaries
    const firstBrace = clean.indexOf('{');
    const firstBracket = clean.indexOf('[');
    
    // Determine which comes first to decide if we look for Object or Array
    let start = -1;
    let end = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        start = firstBrace;
        end = clean.lastIndexOf('}');
    } else if (firstBracket !== -1) {
        start = firstBracket;
        end = clean.lastIndexOf(']');
    }

    if (start !== -1 && end !== -1 && end > start) {
        clean = clean.substring(start, end + 1);
    }

    try {
        return JSON.parse(clean) as T;
    } catch (e) {
        console.warn("JSON Clean Parse failed. Raw text:", text);
        return null;
    }
};

// --- TYPES NOUVEAUX ---

interface ScriptWithScore {
  id: string;
  content: string;
  viralScore: number; // 0-100
  breakdown: {
    hook: { score: number; justification: string };
    retention: { score: number; justification: string };
    engagement: { score: number; justification: string };
    trending: { score: number; justification: string };
  };
  timecodes: Array<{
    startTime: string;
    endTime: string;
    action: string;
    brollSuggestion?: string;
  }>;
  predictions: {
    estimatedViews: { min: number; max: number };
    engagementRate: number;
  };
}

// CustomTutorial interface updated to match DetailedStep from types.ts via aliasing or direct usage
// We'll use the AdvancedTechnique type from types.ts which matches the new structure

// NEW TYPE FOR RUSH ANALYSIS
interface RushAnalysisItem {
    id: string;
    timecode: string;
    duration: string;
    type: 'broll' | 'illustration' | 'animation' | 'vfx';
    suggestion: string;
    visualDescription: string;
    complexity: 'Low' | 'Medium' | 'High';
}

// --- MOCK DATA TUTORIALS (Fallback) ---
// Note: We use CustomTutorial type which is aliased to AdvancedTechnique in types.ts imports
// But here we need a local static version compatible with display
const TUTORIALS_DB: any[] = [
    // AFTER EFFECTS
    {
        id: 'ae_1',
        title: 'Introduction au Motion Design',
        difficulty: 'Débutant',
        estimatedTime: '15 min',
        software: 'After Effects',
        description: 'Les bases de l\'animation par images clés (Keyframes) et le lissage de vitesse (Easy Ease).',
        steps: [
            { order: 1, category: 'Préparation', action: 'Créer une composition', tool: 'Composition Settings', settings: [], explanation: 'Base du projet' },
            { order: 2, category: 'Animation', action: 'Position Keyframes', tool: 'Transform', settings: [], explanation: 'Mouvement simple' }
        ]
    },
    // PHOTOSHOP
    {
        id: 'ps_1',
        title: 'Retouche Peau Haute Fréquence',
        difficulty: 'Intermédiaire',
        estimatedTime: '20 min',
        software: 'Photoshop',
        description: 'Séparation de fréquences pour lisser la peau tout en gardant la texture.',
        steps: [
            { order: 1, category: 'Préparation', action: 'Dupliquer le calque', tool: 'Layers', settings: [], explanation: 'Sécurité' },
            { order: 2, category: 'Retouche', action: 'Appliquer Flou Gaussien', tool: 'Gaussian Blur', settings: [{name: 'Radius', value: '5px'}], explanation: 'Base basse fréquence' }
        ]
    },
    // ILLUSTRATOR
    {
        id: 'ai_1',
        title: 'Effet Texte 3D Retro',
        difficulty: 'Avancé',
        estimatedTime: '25 min',
        software: 'Illustrator',
        description: 'Création d\'un titre vectoriel avec extrusion et dégradés style 80s.',
        steps: [
            { order: 1, category: 'Texte', action: 'Ecrire le titre', tool: 'Type Tool', settings: [], explanation: 'Base vectorielle' },
            { order: 2, category: 'Effets', action: 'Extrusion', tool: '3D Extrude & Bevel', settings: [{name: 'Extrude Depth', value: '50pt'}], explanation: 'Volume 3D' }
        ]
    }
];

// --- SCENARIO GENERATOR ---
const generateRandomMoodboardScenario = () => {
    const clients = ["Boisson Énergisante", "Marque de Luxe", "Documentaire Nature", "Tech Startup", "Festival Musique", "Mode Streetwear"];
    const styles = ["Cyberpunk dynamique", "Cinématique calme", "Minimaliste épuré", "Rétro 80s", "Organique et fluide", "Glitch Art"];
    const names = ["Neon Pulse", "Velvet Touch", "Terra Viva", "NextGen AI", "Sonar Fest", "Urban Soul"];
    
    const colors = [
        ["#0A0A0A", "#1F1F1F", "#00FF41", "#FF00FF", "#00FFFF"],
        ["#2D3A1E", "#5D7052", "#E0C097", "#5C4033", "#A8BCA1"],
        ["#FF0000", "#FFFFFF", "#000000", "#FFD700", "#FFA500"]
    ];

    const idx = Math.floor(Math.random() * clients.length);
    const client = clients[idx];
    const style = styles[Math.floor(Math.random() * styles.length)];
    const name = names[idx] || "Projet X";
    const palette = colors[Math.floor(Math.random() * colors.length)];

    return {
        input: `Campagne pour ${client} '${name}' - Style ${style}`,
        moodboard: {
            title: `${name} - ${style}`,
            description: `Une direction artistique ${style.toLowerCase()} pour une marque de ${client.toLowerCase()}.`,
            colors: palette,
            dominant: palette[0]
        },
        script: `HOOK (0-3s): Plan d'introduction impactant pour ${name}. Mouvements rapides synchronisés à la musique.\nBODY: Présentation des features.\nOUTRO: Logo animé.`,
        tutoTitle: `Technique ${style} sur After Effects`
    };
};

export const Moodboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'moodboard' | 'analysis' | 'saved' | 'script' | 'ae' | 'pr' | 'ps' | 'ai' | 'rush_analysis'>('moodboard');
  
  // --- STATES MOODBOARD ---
  const [moodboardInput, setMoodboardInput] = useState('');
  const [videoUrl, setVideoUrl] = useState(''); // New: URL input
  const [videoFile, setVideoFile] = useState<File | null>(null); // New: File input
  const [isUrlMode, setIsUrlMode] = useState(false);
  const [loadingMoodboard, setLoadingMoodboard] = useState(false);
  const [loadingVisuals, setLoadingVisuals] = useState(false);
  const [moodboardData, setMoodboardData] = useState<MoodboardData | null>(null);
  const [isSavingDA, setIsSavingDA] = useState(false);

  // --- STATES SCRIPT IA ---
  const [scripts, setScripts] = useState<ScriptWithScore[]>([]);
  const [selectedScript, setSelectedScript] = useState<string | null>(null);
  const [generatingScripts, setGeneratingScripts] = useState(false);
  const [scriptTopic, setScriptTopic] = useState(''); // Legacy fallback
  const [scriptFormat, setScriptFormat] = useState('TikTok / Reels (Vertical)'); // Legacy fallback
  
  // --- STATES RUSH IMPORT ---
  const [rushFiles, setRushFiles] = useState<File[]>([]);
  const rushInputRef = useRef<HTMLInputElement>(null);

  // --- STATES RUSH ANALYSIS (NEW) ---
  const [analysisRushFile, setAnalysisRushFile] = useState<File | null>(null);
  const [analyzingRush, setAnalyzingRush] = useState(false);
  const [rushAnalysisData, setRushAnalysisData] = useState<RushAnalysisItem[]>([]);
  const rushAnalysisInputRef = useRef<HTMLInputElement>(null);

  // --- STATES TUTORIALS (AE, PR, PS, AI) ---
  const [selectedTutorial, setSelectedTutorial] = useState<CustomTutorial | null>(null);
  const [customTutorials, setCustomTutorials] = useState<CustomTutorial[]>([]);
  const [loadingTutorials, setLoadingTutorials] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [manualTutorialPrompt, setManualTutorialPrompt] = useState(''); // NEW: Manual input for tutorial
  
  // Context passing for generation (when coming from Rush Analysis)
  const [externalContext, setExternalContext] = useState<string | null>(null);

  // --- STATES SAVED ---
  const [savedFiles, setSavedFiles] = useState<DriveFile[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);

  // --- STATE SIMULATION ---
  const [isSimulating, setIsSimulating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const geminiService = useRef(new GeminiService());

  const settings = db.getSystemSettings();
  const isDev = settings.appMode === 'developer';

  const loadSavedFiles = async () => {
      setLoadingSaved(true);
      try {
          const files = await googleService.listDriveFiles(CURRENT_USER_ID, LIBRARY_FOLDER_ID);
          const relevantFiles = files.filter(f => 
              (f.mimeType === 'application/json' || f.name.endsWith('.json')) &&
              (f.name.startsWith('DA_Moodboard') || 
               f.name.startsWith('Creative_') || 
               f.name.startsWith('Script_IA_'))
          );
          setSavedFiles(relevantFiles);
      } catch (e) {
          console.error("Error loading saved files:", e);
      } finally {
          setLoadingSaved(false);
      }
  };

  useEffect(() => {
      if (activeTab === 'saved') {
          loadSavedFiles();
      }
      if (activeTab !== 'ae' && activeTab !== 'pr' && activeTab !== 'ps' && activeTab !== 'ai') {
          setSelectedTutorial(null);
      }
  }, [activeTab]);

  // --- AUTO-SAVE HELPER ---
  const autoSaveToDrive = async (filename: string, content: object) => {
      try {
          const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
          const file = new File([blob], filename, { type: 'application/json' });
          await googleService.uploadFile(CURRENT_USER_ID, file, LIBRARY_FOLDER_ID);
          console.log(`[AutoSave] ${filename} uploaded to Drive.`);
          return true;
      } catch (e) {
          console.error("AutoSave Failed:", e);
          return false;
      }
  };

  // --- HANDLERS MOODBOARD ---
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setVideoFile(e.target.files[0]);
          setMoodboardInput(`Analyse du fichier vidéo : ${e.target.files[0].name}`);
      }
  };

  const handleGenerateMoodboard = async () => {
      if (!moodboardInput && !videoUrl && !videoFile) return;
      setLoadingMoodboard(true);
      setMoodboardData(null);
      
      try {
          let promptContext = moodboardInput;
          if (videoUrl) promptContext += `\nAnalyse cette vidéo URL : ${videoUrl}`;
          if (videoFile) promptContext += `\nAnalyse ce fichier vidéo local (simulation contextuelle) : ${videoFile.name}`;

          const response = await apiRouter.routeRequest({
              type: 'moodboard_generation',
              prompt: promptContext,
              qualityRequired: 'high'
          });

          const data = cleanAndParseJson<MoodboardData>(response.content);
          if (!data) throw new Error("Impossible de lire la réponse du modèle (JSON invalide).");
          
          setMoodboardData(data);
          
          if (data.visual_prompts && data.visual_prompts.length > 0) {
              setLoadingVisuals(true);
              const imagePromises = data.visual_prompts.slice(0, 3).map(prompt => 
                  geminiService.current.generateImage(prompt, '16:9').catch(e => null)
              );
              const results = await Promise.all(imagePromises);
              data.generated_visuals = results.filter(img => img !== null) as string[];
              setMoodboardData({ ...data }); 
              setLoadingVisuals(false);
          }
          await autoSaveToDrive(`DA_Moodboard_${new Date().toISOString().split('T')[0]}.json`, data);
      } catch (e) {
          alert("Erreur génération Moodboard : " + (e as Error).message);
      } finally {
          setLoadingMoodboard(false);
          setLoadingVisuals(false);
      }
  };

  // --- HANDLERS RUSH IMPORT (SCRIPT) ---
  const handleRushUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const newFiles = Array.from(e.target.files);
          setRushFiles(prev => [...prev, ...newFiles]);
      }
  };

  const removeRush = (index: number) => {
      setRushFiles(prev => prev.filter((_, i) => i !== index));
  };

  // --- HANDLERS RUSH ANALYSIS (NEW) ---
  const handleAnalysisRushUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setAnalysisRushFile(e.target.files[0]);
      }
  };

  const handleAnalyzeRush = async () => {
      if (!analysisRushFile) return;
      setAnalyzingRush(true);
      setRushAnalysisData([]);

      try {
          const prompt = `
            Agis comme un monteur vidéo senior. Analyse le contenu de ce fichier vidéo : "${analysisRushFile.name}" (Taille: ${(analysisRushFile.size / 1024 / 1024).toFixed(1)}MB).
            
            Identifie les moments "morts" ou les opportunités d'ajouter du B-Roll, des illustrations ou des animations After Effects pour augmenter la rétention.
            
            Génère une liste JSON stricte au format suivant :
            [
                {
                    "timecode": "00:15",
                    "duration": "5s",
                    "type": "broll" | "illustration" | "animation" | "vfx",
                    "suggestion": "Titre court de l'idée",
                    "visualDescription": "Description très détaillée pour un prompteur d'image ou un animateur (ex: 'Drone shot over a cyberpunk city', 'Kinetic typography with glitch effect saying HELLO')",
                    "complexity": "Low" | "Medium" | "High"
                }
            ]
            
            Génère au moins 4 suggestions pertinentes.
          `;

          const response = await apiRouter.routeRequest({
              type: 'vision_analysis', // Or text if file not really uploaded
              prompt: prompt,
              qualityRequired: 'high'
          });

          const results = cleanAndParseJson<RushAnalysisItem[]>(response.content);
          if (results) {
              setRushAnalysisData(results.map((r, i) => ({ ...r, id: `rush_item_${i}` })));
          } else {
              throw new Error("Format de réponse invalide");
          }

      } catch (e) {
          console.error(e);
          alert("Erreur analyse rush : " + (e as Error).message);
      } finally {
          setAnalyzingRush(false);
      }
  };

  const handleSendToSoftware = (item: RushAnalysisItem, software: 'After Effects' | 'Premiere Pro' | 'Photoshop' | 'Illustrator') => {
      // 1. Prepare Context
      const context = `CONTEXTE TECHNIQUE (${software}):\nCréer : ${item.suggestion} (${item.type})\nDescription Visuelle : ${item.visualDescription}\nDurée : ${item.duration}\nComplexité : ${item.complexity}`;
      
      // 2. Set External Context
      setExternalContext(context);
      
      // 3. Switch Tab
      if (software === 'After Effects') setActiveTab('ae');
      else if (software === 'Premiere Pro') setActiveTab('pr');
      else if (software === 'Photoshop') setActiveTab('ps');
      else if (software === 'Illustrator') setActiveTab('ai');
      
      // 4. Auto-trigger generation (Optional, or just pre-fill)
      // We will handle the pre-fill in the AE/PR/PS/AI tab render logic
  };

  // --- HANDLERS SCRIPT IA ---
  const generateScripts = async () => {
      setGeneratingScripts(true);
      try {
        let context = moodboardData ? `Based on this Moodboard: ${JSON.stringify(moodboardData.concept)}` : `Topic: ${scriptTopic}`;
        if (rushFiles.length > 0) {
            const rushDescriptions = rushFiles.map(f => `File: ${f.name}`).join('\n');
            context += `\n\nAVAILABLE RUSHES:\n${rushDescriptions}`;
        }

        const genPrompt = `
            ${context}
            Génère 3 scripts vidéo VIRAUX pour ${scriptFormat}.
            Format JSON strict:
            [{"content": "Full script...", "timecodes": [{"startTime": "00:00", "endTime": "00:05", "action": "...", "brollSuggestion": "..."}]}]
        `;

        const response = await apiRouter.routeRequest({
          type: 'tutorial_generation',
          prompt: genPrompt,
          qualityRequired: 'high'
        });
        
        const generatedScripts = cleanAndParseJson<any[]>(response.content) || [];
        if (generatedScripts.length === 0) throw new Error("Échec de la génération des scripts");

        const scriptsWithScores = await Promise.all(
          generatedScripts.map(async (script: any) => {
            const scoreResponse = await apiRouter.routeRequest({
              type: 'viral_trends_research',
              prompt: `Analyse viralité script: "${script.content.substring(0, 300)}..." JSON: { "overall": 85, "breakdown": {...}, "predictions": {...} }`,
              qualityRequired: 'medium' // Faster for scoring
            });
            const scoreData = cleanAndParseJson<any>(scoreResponse.content) || { overall: 50 };
            return {
              id: Math.random().toString(36).substr(2, 9),
              content: script.content,
              viralScore: scoreData.overall || 50,
              breakdown: scoreData.breakdown || {},
              timecodes: script.timecodes || [],
              predictions: scoreData.predictions || {}
            };
          })
        );
        
        setScripts(scriptsWithScores);
        await autoSaveToDrive(`Script_IA_${Date.now()}.json`, scriptsWithScores);

      } catch (error) {
        console.error('Erreur génération scripts:', error);
      } finally {
        setGeneratingScripts(false);
      }
  };

  // --- HANDLERS TUTORIALS ---
  const generateCustomTutorials = async (software: 'After Effects' | 'Premiere Pro' | 'Photoshop' | 'Illustrator') => {
      // Prioritize Manual Input
      let context = "";
      
      if (manualTutorialPrompt.trim()) {
          context = `Demande manuelle : "${manualTutorialPrompt}"`;
      } else if (externalContext) {
          context = externalContext;
      } else {
          const script = scripts.find(s => s.id === selectedScript);
          context = script ? script.content : (moodboardData ? moodboardData.concept.description : "Générique");
      }
      
      setLoadingTutorials(true);
      try {
        const fullPrompt = `
            ${TUTORIAL_SYSTEM_PROMPT}
            
            DEMANDE UTILISATEUR :
            Génère un tutoriel pour ${software} pour réaliser la tâche suivante :
            "${context}"
        `;

        const response = await apiRouter.routeRequest({
          type: 'tutorial_generation',
          prompt: fullPrompt,
          qualityRequired: 'high'
        });
        
        const generatedRaw = cleanAndParseJson<CustomTutorial[]>(response.content);
        
        if (generatedRaw) {
            let generatedTutos = generatedRaw.map((t) => ({
                ...t, 
                // Ensure ID is unique
                id: t.id || `tuto_${Date.now()}`,
                scriptId: selectedScript || 'manual_request', 
                software 
            }));

            // --- VALIDATION & AUTO-CORRECTION ---
            let softwareKey: 'after-effects' | 'premiere' | 'photoshop' | 'illustrator';
            
            if (software === 'After Effects') softwareKey = 'after-effects';
            else if (software === 'Premiere Pro') softwareKey = 'premiere';
            else if (software === 'Photoshop') softwareKey = 'photoshop';
            else softwareKey = 'illustrator';
            
            generatedTutos = generatedTutos.map((t) => {
                const stepsToValidate: TutorialStep[] = t.steps.map((step) => ({
                    effect: step.tool || step.action,
                    parameters: step.settings ? step.settings.map((s) => ({ name: s.name, value: s.value, unit: s.unit })) : [],
                    software: softwareKey
                }));

                const { valid, results } = tutorialValidator.validateBatch(stepsToValidate);
                let validationErrors: string[] = [];

                if (!valid) {
                    validationErrors = results.flatMap(r => r.validation.errors);
                    const correctedSteps = t.steps.map((step, idx) => {
                        const valRes = results[idx];
                        if (valRes.validation.valid) return step;
                        const corrected = tutorialValidator.autoCorrect(valRes.tutorial);
                        return {
                            ...step,
                            tool: corrected.effect,
                            settings: corrected.parameters.map((p) => ({ name: p.name, value: p.value, unit: p.unit }))
                        };
                    });
                    return { ...t, steps: correctedSteps, validationErrors };
                }
                return t;
            });

            setCustomTutorials(generatedTutos);
            // Don't clear manual prompt automatically to allow refinement
            setExternalContext(null);
        }
      } catch (error) {
        console.error('Erreur génération tutoriels:', error);
      } finally {
        setLoadingTutorials(false);
      }
  };

  const handleExportPDF = async () => {
      let software: 'After Effects' | 'Premiere Pro' | 'Photoshop' | 'Illustrator';
      if (activeTab === 'ae') software = 'After Effects';
      else if (activeTab === 'pr') software = 'Premiere Pro';
      else if (activeTab === 'ps') software = 'Photoshop';
      else software = 'Illustrator';

      const tutorialsToExport = customTutorials.filter(t => t.software === software);
      if (tutorialsToExport.length === 0) return;

      setExportingPDF(true);
      try {
          const mappedTutorials: TutorialForPDF[] = tutorialsToExport.map(t => ({
              title: t.title,
              software: t.software as 'After Effects' | 'Premiere Pro', // Cast quick fix for existing type, functionality is generic
              difficulty: t.difficulty,
              estimatedTime: parseInt(t.estimatedTime) || 10,
              instructions: t.steps.map(s => ({
                  order: s.order,
                  action: `${s.action} ${s.tip ? `\n💡 Conseil: ${s.tip}` : ''}`,
                  parameters: s.settings,
                  shortcut: s.keyboard
              }))
          }));

          const blob = await pdfExportService.generateTutorialPDF(
              mappedTutorials,
              `Tutoriels ${software} - ${new Date().toLocaleDateString()}`
          );
          
          pdfExportService.downloadPDF(blob, `Tutoriels_${software.replace(' ', '_')}`);
      } catch (e) {
          console.error("Export PDF Failed", e);
      } finally {
          setExportingPDF(false);
      }
  };

  const handleLoadSavedItem = async (file: DriveFile) => { 
      setLoadingFileId(file.id);
      try {
          const content = await googleService.getFileContent(CURRENT_USER_ID, file.id);
          if (file.name.startsWith('DA_Moodboard')) {
              setMoodboardData(content as MoodboardData);
              setActiveTab('moodboard');
          } else if (file.name.startsWith('Script_IA_')) {
              setScripts(content as ScriptWithScore[]);
              setActiveTab('script');
          }
      } catch(e) { console.error(e); }
      setLoadingFileId(null);
  };

  const InfoCard = ({ title, icon: Icon, children, color = 'text-white' }: any) => (
      <div className="bg-surface border border-slate-700/50 rounded-2xl p-6 shadow-xl hover:border-slate-600 transition-all flex flex-col h-full relative overflow-hidden group">
          <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none ${color}`}>
              <Icon size={120} />
          </div>
          <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${color}`}>
              <Icon size={16} /> {title}
          </h3>
          <div className="relative z-10 flex-1">
              {children}
          </div>
      </div>
  );

  // Helper to determine active software string
  const getActiveSoftwareName = () => {
      switch(activeTab) {
          case 'ae': return 'After Effects';
          case 'pr': return 'Premiere Pro';
          case 'ps': return 'Photoshop';
          case 'ai': return 'Illustrator';
          default: return 'After Effects';
      }
  };

  const isTutorialTab = ['ae', 'pr', 'ps', 'ai'].includes(activeTab);

  return (
    <div className="flex flex-col h-full bg-[#020617] overflow-hidden">
      
      {/* HEADER TABS */}
      <header className="p-4 border-b border-slate-800 bg-surface/50 backdrop-blur shrink-0 z-20 flex justify-between items-center">
          <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Layout className="text-primary" /> Studio Créatif
                  {isDev && (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono flex items-center gap-1">
                          <Code size={10}/> API: Gemini 3 Pro
                      </span>
                  )}
              </h1>
              
              <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700 overflow-x-auto max-w-[60vw] scrollbar-hide">
                  <button 
                    onClick={() => setActiveTab('moodboard')}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap
                        ${activeTab === 'moodboard' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                      <Palette size={14}/> DA & Moodboard
                  </button>
                  <button 
                    onClick={() => setActiveTab('rush_analysis')}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap
                        ${activeTab === 'rush_analysis' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                      <ScanEye size={14}/> Analyse Rush & B-Roll
                  </button>
                  <button 
                    onClick={() => setActiveTab('script')}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap
                        ${activeTab === 'script' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                      <Sparkles size={14}/> Script IA
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('ae')}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap
                        ${activeTab === 'ae' ? 'bg-[#9999FF] text-black shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                      <Layers size={14}/> After Effects
                  </button>
                  <button 
                    onClick={() => setActiveTab('pr')}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap
                        ${activeTab === 'pr' ? 'bg-[#9999FF] text-black shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                      <Film size={14}/> Premiere Pro
                  </button>
                  <button 
                    onClick={() => setActiveTab('ps')}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap
                        ${activeTab === 'ps' ? 'bg-[#31A8FF] text-black shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                      <MousePointer2 size={14}/> Photoshop
                  </button>
                  <button 
                    onClick={() => setActiveTab('ai')}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap
                        ${activeTab === 'ai' ? 'bg-[#FF9A00] text-black shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                      <Brush size={14}/> Illustrator
                  </button>
                  <button 
                    onClick={() => setActiveTab('saved')}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap
                        ${activeTab === 'saved' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                      <FileJson size={14}/> Sauvegardes
                  </button>
              </div>
          </div>
      </header>

      <div className="flex-1 overflow-hidden relative">
          
          {/* --- TAB: MOODBOARD --- */}
          {activeTab === 'moodboard' && (
              <div className="h-full overflow-y-auto p-8 scrollbar-thin">
                  
                  {/* INPUT SECTION */}
                  <div className="max-w-4xl mx-auto mb-10 sticky top-0 z-30">
                      <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-2xl p-4 shadow-2xl flex flex-col gap-4">
                          <div className="flex gap-2 border-b border-slate-800 pb-2">
                              <button onClick={() => setIsUrlMode(false)} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors ${!isUrlMode ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}>
                                  Texte / Concept
                              </button>
                              <button onClick={() => setIsUrlMode(true)} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors ${isUrlMode ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-white'}`}>
                                  URL / Fichier
                              </button>
                          </div>

                          <div className="flex gap-4 items-center">
                              {isUrlMode ? (
                                  <div className="flex-1 flex gap-2">
                                      <input 
                                        type="text" 
                                        value={videoUrl}
                                        onChange={e => setVideoUrl(e.target.value)}
                                        placeholder="URL TikTok, Reel, YouTube..."
                                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                                      />
                                      <div className="relative">
                                          <input 
                                            type="file" 
                                            ref={videoInputRef} 
                                            className="hidden" 
                                            accept="video/*"
                                            onChange={handleVideoUpload}
                                          />
                                          <button 
                                            onClick={() => videoInputRef.current?.click()}
                                            className="h-full px-4 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-xl text-slate-300 flex items-center gap-2 text-xs font-bold"
                                          >
                                              <Upload size={16}/> {videoFile ? 'Fichier prêt' : 'Upload Rush'}
                                          </button>
                                      </div>
                                  </div>
                              ) : (
                                  <input 
                                    type="text" 
                                    value={moodboardInput}
                                    onChange={e => setMoodboardInput(e.target.value)}
                                    placeholder="Décrivez le projet (ex: Pub parfum luxe, sombre et doré)"
                                    className="flex-1 bg-transparent border-none text-sm text-white focus:ring-0 outline-none placeholder:text-slate-600 font-medium px-2"
                                  />
                              )}
                              
                              <button 
                                onClick={handleGenerateMoodboard}
                                disabled={loadingMoodboard || (!moodboardInput && !videoUrl && !videoFile)}
                                className="bg-primary hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap shadow-lg shadow-primary/20"
                              >
                                  {loadingMoodboard ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>}
                                  Générer
                              </button>
                          </div>
                      </div>
                  </div>

                  {/* RESULTS DISPLAY */}
                  {moodboardData && (
                      <div className="max-w-6xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4">
                          <div className="mb-8">
                              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700 relative overflow-hidden shadow-2xl">
                                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><Layout size={200}/></div>
                                  <div className="relative z-10">
                                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Concept Global</span>
                                      <h3 className="text-3xl font-bold text-white mb-4">{moodboardData.concept.title}</h3>
                                      <p className="text-slate-300 text-lg leading-relaxed max-w-4xl mb-6">{moodboardData.concept.description}</p>
                                  </div>
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                              <InfoCard title="Palette & Ambiance" icon={Palette} color="text-pink-400">
                                  <div className="space-y-4">
                                      <div className="flex flex-wrap gap-3">
                                          {moodboardData.colors.paletteHex?.map((hex, i) => (
                                              <div key={i} className="group relative">
                                                  <div 
                                                    className="w-12 h-12 rounded-xl shadow-lg border border-white/10 cursor-pointer transition-transform hover:scale-110" 
                                                    style={{ backgroundColor: hex }}
                                                    onClick={() => navigator.clipboard.writeText(hex)}
                                                  />
                                                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] bg-black text-white px-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none">
                                                      {hex}
                                                  </span>
                                              </div>
                                          ))}
                                      </div>
                                      <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                                          <p className="text-xs text-slate-300"><strong>Dominante:</strong> {moodboardData.colors.dominant}</p>
                                          <p className="text-xs text-slate-400 mt-1">"{moodboardData.colors.description}"</p>
                                      </div>
                                  </div>
                              </InfoCard>
                              
                              <InfoCard title="Typographie & Titrage" icon={Type} color="text-blue-400">
                                  <div className="space-y-2">
                                      <div className="bg-slate-900 p-2 rounded border border-slate-700">
                                          <span className="text-[10px] text-slate-500 uppercase">Font Family</span>
                                          <p className="text-white font-bold">{moodboardData.typography.style}</p>
                                      </div>
                                      <div className="bg-slate-900 p-2 rounded border border-slate-700">
                                          <span className="text-[10px] text-slate-500 uppercase">Animation</span>
                                          <p className="text-slate-300 text-xs">{moodboardData.typography.animation}</p>
                                      </div>
                                  </div>
                              </InfoCard>

                              <InfoCard title="Montage & Rythme" icon={Scissors} color="text-amber-400">
                                  <ul className="space-y-2 text-sm text-slate-300">
                                      <li className="flex gap-2"><span className="text-amber-500">•</span> {moodboardData.editing.pacing}</li>
                                      <li className="flex gap-2"><span className="text-amber-500">•</span> {moodboardData.editing.transitions}</li>
                                      <li className="flex gap-2"><span className="text-amber-500">•</span> {moodboardData.editing.style}</li>
                                  </ul>
                              </InfoCard>
                          </div>
                      </div>
                  )}
              </div>
          )}

          {/* --- NEW TAB: RUSH ANALYSIS --- */}
          {activeTab === 'rush_analysis' && (
              <div className="h-full overflow-y-auto p-8 scrollbar-thin">
                  <div className="max-w-6xl mx-auto flex flex-col gap-8 h-full">
                      
                      {/* HEADER */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div>
                              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                  <ScanEye className="text-orange-500"/> Analyse de Rush & B-Roll
                              </h2>
                              <p className="text-slate-400 text-sm mt-1">
                                  L'IA scanne votre vidéo brute et identifie les moments parfaits pour insérer des illustrations ou des animations.
                              </p>
                          </div>
                          
                          {/* UPLOAD AREA */}
                          <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-xl border border-slate-700">
                              <input 
                                  type="file" 
                                  ref={rushAnalysisInputRef}
                                  className="hidden"
                                  accept="video/*"
                                  onChange={handleAnalysisRushUpload}
                              />
                              <div className="px-4 py-2">
                                  <div className="text-xs text-slate-400 uppercase font-bold">Fichier Source</div>
                                  <div className="text-sm text-white truncate max-w-[200px]">
                                      {analysisRushFile ? analysisRushFile.name : 'Aucun fichier sélectionné'}
                                  </div>
                              </div>
                              <button 
                                  onClick={() => rushAnalysisInputRef.current?.click()}
                                  className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                              >
                                  <Upload size={18}/>
                              </button>
                              <button 
                                  onClick={handleAnalyzeRush}
                                  disabled={!analysisRushFile || analyzingRush}
                                  className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                              >
                                  {analyzingRush ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18}/>}
                                  Analyser
                              </button>
                          </div>
                      </div>

                      {/* CONTENT */}
                      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
                          
                          {/* LEFT: PREVIEW (Placeholder) */}
                          <div className="bg-black rounded-2xl border border-slate-800 flex items-center justify-center relative overflow-hidden aspect-video lg:aspect-auto lg:h-full">
                              {analysisRushFile ? (
                                  <div className="text-center">
                                      <FileVideo size={64} className="text-slate-700 mx-auto mb-4"/>
                                      <p className="text-slate-500 text-sm">Aperçu non disponible pour les gros fichiers (Simulé)</p>
                                      <p className="text-orange-500 text-xs mt-2 font-mono">{analysisRushFile.name}</p>
                                  </div>
                              ) : (
                                  <div className="text-slate-600 flex flex-col items-center gap-2">
                                      <Upload size={48} className="opacity-20"/>
                                      <span className="text-sm">Importez une vidéo pour commencer</span>
                                  </div>
                              )}
                          </div>

                          {/* RIGHT: TIMELINE RESULTS */}
                          <div className="lg:col-span-2 bg-surface border border-slate-700 rounded-2xl p-6 flex flex-col h-full overflow-hidden shadow-xl">
                              <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                                  <Layers size={18} className="text-slate-400"/> Timeline des Suggestions
                              </h3>

                              <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
                                  {analyzingRush && (
                                      <div className="text-center py-20">
                                          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4"/>
                                          <p className="text-slate-400 animate-pulse">Analyse visuelle frame-by-frame en cours...</p>
                                      </div>
                                  )}

                                  {!analyzingRush && rushAnalysisData.length === 0 && (
                                      <div className="text-center py-20 text-slate-500 italic border-2 border-dashed border-slate-800 rounded-xl">
                                          Les suggestions d'insertions B-Roll apparaîtront ici.
                                      </div>
                                  )}

                                  {rushAnalysisData.map((item) => (
                                      <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-orange-500/30 transition-all group">
                                          <div className="flex justify-between items-start mb-3">
                                              <div className="flex items-center gap-3">
                                                  <span className="bg-slate-800 text-orange-400 font-mono text-sm font-bold px-3 py-1 rounded border border-slate-700">
                                                      {item.timecode}
                                                  </span>
                                                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border 
                                                      ${item.type === 'broll' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                                        item.type === 'animation' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                        'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                                                      {item.type}
                                                  </span>
                                                  <span className="text-xs text-slate-500 flex items-center gap-1">
                                                      <Clock size={12}/> {item.duration}
                                                  </span>
                                              </div>
                                              <div className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                                                  Complexité: {item.complexity}
                                              </div>
                                          </div>

                                          <h4 className="text-white font-bold mb-2">{item.suggestion}</h4>
                                          <p className="text-sm text-slate-400 leading-relaxed mb-4 bg-black/20 p-3 rounded-lg border border-white/5">
                                              {item.visualDescription}
                                          </p>

                                          <div className="flex gap-3 pt-3 border-t border-slate-800/50">
                                              <button 
                                                  onClick={() => handleSendToSoftware(item, 'After Effects')}
                                                  className="flex items-center gap-2 px-4 py-2 bg-[#9999FF]/10 hover:bg-[#9999FF]/20 text-[#9999FF] rounded-lg text-xs font-bold border border-[#9999FF]/30 transition-colors"
                                              >
                                                  <ArrowUpRight size={14}/> Envoyer vers After Effects
                                              </button>
                                              <button 
                                                  onClick={() => handleSendToSoftware(item, 'Premiere Pro')}
                                                  className="flex items-center gap-2 px-4 py-2 bg-[#9999FF]/10 hover:bg-[#9999FF]/20 text-[#9999FF] rounded-lg text-xs font-bold border border-[#9999FF]/30 transition-colors"
                                              >
                                                  <ArrowUpRight size={14}/> Envoyer vers Premiere
                                              </button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* --- TAB 2: SCRIPT IA --- */}
          {activeTab === 'script' && (
              <div className="h-full overflow-y-auto p-8 scrollbar-thin">
                  <div className="flex flex-col md:flex-row gap-8 h-full">
                      
                      {/* LEFT: CONFIG */}
                      <div className="w-full md:w-1/3 min-w-[320px] flex flex-col gap-6">
                          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl">
                              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                  <Sparkles className="text-emerald-500" size={20}/> Générateur Viral
                              </h3>
                              
                              <div className="space-y-4">
                                  {!moodboardData && (
                                      <div>
                                          <label className="text-[11px] font-bold text-slate-500 uppercase block mb-2">Sujet</label>
                                          <textarea 
                                              value={scriptTopic} 
                                              onChange={e => setScriptTopic(e.target.value)}
                                              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white h-24"
                                              placeholder="Sujet de la vidéo..."
                                          />
                                      </div>
                                  )}
                                  
                                  {moodboardData && (
                                      <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300">
                                          Basé sur la DA : <strong>{moodboardData.concept.title}</strong>
                                      </div>
                                  )}

                                  {/* RUSH IMPORT SECTION */}
                                  <div>
                                      <label className="text-[11px] font-bold text-slate-500 uppercase block mb-2 flex items-center justify-between">
                                          <span>Import Rushs & Sources</span>
                                          {rushFiles.length > 0 && <span className="text-blue-400">{rushFiles.length} fichiers</span>}
                                      </label>
                                      
                                      <div 
                                        className="border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-800/30"
                                        onClick={() => rushInputRef.current?.click()}
                                      >
                                          <input 
                                            type="file" 
                                            multiple 
                                            ref={rushInputRef} 
                                            className="hidden" 
                                            accept="video/*,audio/*,image/*"
                                            onChange={handleRushUpload}
                                          />
                                          <Upload size={20} className="text-slate-500 mb-2" />
                                          <span className="text-xs text-slate-400 text-center">Glisser des fichiers ou cliquer pour analyser</span>
                                      </div>

                                      {/* Rush File List */}
                                      {rushFiles.length > 0 && (
                                          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto pr-1">
                                              {rushFiles.map((file, i) => (
                                                  <div key={i} className="flex items-center justify-between bg-slate-800 p-2 rounded-lg border border-slate-700 text-xs">
                                                      <div className="flex items-center gap-2 truncate">
                                                          <FileVideo size={12} className="text-blue-400 shrink-0"/>
                                                          <span className="truncate text-slate-300" title={file.name}>{file.name}</span>
                                                      </div>
                                                      <button onClick={() => removeRush(i)} className="text-slate-500 hover:text-red-400">
                                                          <X size={12}/>
                                                      </button>
                                                  </div>
                                              ))}
                                          </div>
                                      )}
                                  </div>

                                  <button 
                                      onClick={generateScripts}
                                      disabled={generatingScripts || (!moodboardData && !scriptTopic)}
                                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                  >
                                      {generatingScripts ? <Loader2 size={18} className="animate-spin"/> : <Wand2 size={18}/>}
                                      {generatingScripts ? (rushFiles.length > 0 ? 'Analyse des rushs...' : 'Rédaction...') : 'Générer 3 Scripts'}
                                  </button>
                              </div>
                          </div>

                          {/* SCRIPTS LIST */}
                          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                              {scripts.map((script, idx) => (
                                  <div 
                                    key={script.id}
                                    onClick={() => setSelectedScript(script.id)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedScript === script.id ? 'bg-slate-800 border-emerald-500 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
                                  >
                                      <div className="flex justify-between items-start mb-2">
                                          <h4 className="font-bold text-white text-sm">Option #{idx + 1}</h4>
                                          <div className={`text-xs font-bold px-2 py-1 rounded ${script.viralScore >= 80 ? 'bg-green-500 text-black' : 'bg-slate-700 text-white'}`}>
                                              Score: {script.viralScore}/100
                                          </div>
                                      </div>
                                      <p className="text-xs text-slate-400 line-clamp-3">{script.content}</p>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* RIGHT: DETAIL SCRIPT */}
                      <div className="flex-1 bg-surface border border-slate-800 rounded-2xl p-8 overflow-y-auto shadow-2xl">
                          {selectedScript ? (() => {
                              const s = scripts.find(sc => sc.id === selectedScript);
                              if (!s) return null;
                              return (
                                  <div className="space-y-8 animate-in fade-in duration-300">
                                      {/* HEADER METRICS */}
                                      <div className="grid grid-cols-4 gap-4 pb-6 border-b border-slate-700">
                                          <div className="text-center">
                                              <div className="text-[10px] text-slate-500 uppercase font-bold">Hook</div>
                                              <div className="text-xl font-bold text-white">{s.breakdown.hook.score}</div>
                                          </div>
                                          <div className="text-center">
                                              <div className="text-[10px] text-slate-500 uppercase font-bold">Rétention</div>
                                              <div className="text-xl font-bold text-white">{s.breakdown.retention.score}</div>
                                          </div>
                                          <div className="text-center">
                                              <div className="text-[10px] text-slate-500 uppercase font-bold">Engagement</div>
                                              <div className="text-xl font-bold text-white">{s.breakdown.engagement.score}</div>
                                          </div>
                                          <div className="text-center border-l border-slate-700">
                                              <div className="text-[10px] text-slate-500 uppercase font-bold">Vues Est.</div>
                                              <div className="text-sm font-bold text-emerald-400">
                                                  {s.predictions.estimatedViews.min.toLocaleString()} - {s.predictions.estimatedViews.max.toLocaleString()}
                                              </div>
                                          </div>
                                      </div>

                                      {/* CONTENT */}
                                      <div className="prose prose-invert max-w-none">
                                          <h3 className="text-white">Script</h3>
                                          <div className="whitespace-pre-wrap text-slate-300 leading-relaxed bg-slate-900/50 p-6 rounded-xl border border-slate-700/50">
                                              {s.content}
                                          </div>
                                      </div>

                                      {/* TIMECODES */}
                                      {s.timecodes && s.timecodes.length > 0 && (
                                          <div>
                                              <h3 className="text-white font-bold mb-4">Découpage Technique</h3>
                                              <div className="space-y-2">
                                                  {s.timecodes.map((tc, i) => (
                                                      <div key={i} className="flex gap-4 p-3 bg-slate-900 rounded-lg border border-slate-800 text-sm">
                                                          <span className="font-mono text-emerald-500 font-bold w-24 shrink-0">{tc.startTime} - {tc.endTime}</span>
                                                          <span className="text-white flex-1">{tc.action}</span>
                                                          {tc.brollSuggestion && <span className="text-slate-500 italic text-xs w-1/3">{tc.brollSuggestion}</span>}
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              );
                          })() : (
                              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                  <Sparkles size={48} className="opacity-20 mb-4"/>
                                  <p>Sélectionnez un script pour voir l'analyse détaillée.</p>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          )}

          {/* --- TAB 3: CUSTOM TUTORIALS (AE/PR/PS/AI) --- */}
          {isTutorialTab && (
              <div className="h-full flex gap-6 p-6">
                  {/* SIDEBAR: LIST */}
                  <div className="w-1/3 min-w-[300px] flex flex-col gap-4 overflow-y-auto scrollbar-thin pr-2">
                      <div className="p-4 bg-slate-900 rounded-xl border border-slate-700">
                          <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                              {activeTab === 'ps' ? <MousePointer2 size={16}/> : activeTab === 'ai' ? <Brush size={16}/> : activeTab === 'ae' ? <Layers size={16}/> : <Film size={16}/>}
                              Générateur de Tuto
                          </h3>
                          <p className="text-xs text-slate-400 mb-4">Créez un guide pas-à-pas basé sur votre script ou une demande manuelle pour {getActiveSoftwareName()}.</p>
                          
                          {/* MANUAL INPUT */}
                          <div className="mb-4">
                              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5 flex items-center gap-1">
                                  <Edit3 size={10}/> Description de l'effet
                              </label>
                              <textarea
                                  value={manualTutorialPrompt}
                                  onChange={(e) => setManualTutorialPrompt(e.target.value)}
                                  placeholder="Ex: Effet de texte néon qui clignote..."
                                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-white focus:border-blue-500 outline-none h-20 resize-none placeholder:text-slate-600"
                              />
                          </div>

                          {/* EXTERNAL CONTEXT INDICATOR */}
                          {externalContext && !manualTutorialPrompt && (
                              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
                                  <p className="font-bold mb-1 flex items-center gap-2"><Link size={12}/> Contexte importé :</p>
                                  <p className="line-clamp-2 italic opacity-80">{externalContext}</p>
                              </div>
                          )}

                          <div className="space-y-2">
                              <button 
                                  onClick={() => generateCustomTutorials(getActiveSoftwareName() as any)}
                                  disabled={loadingTutorials || (!selectedScript && !moodboardData && !externalContext && !manualTutorialPrompt)}
                                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                              >
                                  {loadingTutorials ? <Loader2 size={14} className="animate-spin"/> : <Wand2 size={14}/>}
                                  {manualTutorialPrompt ? 'Générer (Manuel)' : externalContext ? 'Générer (Contexte Rush)' : 'Générer Tuto IA'}
                              </button>
                              
                              {customTutorials.some(t => t.software === getActiveSoftwareName()) && (
                                  <button 
                                      onClick={handleExportPDF}
                                      disabled={exportingPDF}
                                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                                  >
                                      {exportingPDF ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>}
                                      Exporter en PDF
                                  </button>
                              )}
                          </div>
                      </div>

                      {/* Generated List */}
                      {customTutorials.filter(t => t.software === getActiveSoftwareName()).map((t, i) => (
                          <div key={i} className="p-4 bg-slate-800 rounded-xl border border-blue-500/30 cursor-pointer hover:bg-slate-700">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded inline-block">Généré par IA</span>
                                {t.validationErrors && t.validationErrors.length > 0 && (
                                    <span className="text-[10px] text-amber-400 flex items-center gap-1" title="Corrigé automatiquement">
                                        <AlertTriangle size={12}/> Auto-fix
                                    </span>
                                )}
                              </div>
                              <h4 className="font-bold text-white text-sm">{t.title}</h4>
                              <p className="text-xs text-slate-400 mt-1">{t.difficulty} • {t.estimatedTime}</p>
                          </div>
                      ))}

                      {/* Static Library Fallback */}
                      <div className="mt-4 pt-4 border-t border-slate-800">
                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Bibliothèque Standard</h4>
                          {TUTORIALS_DB.filter(t => t.software === getActiveSoftwareName()).map(t => (
                              <div key={t.id} onClick={() => setSelectedTutorial(t as any)} className={`p-4 mb-2 rounded-xl border cursor-pointer ${selectedTutorial?.id === t.id ? 'bg-slate-800 border-white' : 'bg-surface border-slate-800'}`}>
                                  <h4 className="font-bold text-white text-sm">{t.title}</h4>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* MAIN CONTENT */}
                  <div className="flex-1 bg-surface border border-slate-800 rounded-2xl p-8 overflow-y-auto">
                      {/* Display Custom Generated Tutorial */}
                      {customTutorials.length > 0 && !selectedTutorial ? (
                          customTutorials.map((t, i) => (
                              <div key={i} className="space-y-6">
                                  <header className="border-b border-slate-700 pb-4">
                                      <h2 className="text-2xl font-bold text-white">{t.title}</h2>
                                      <div className="flex gap-4 mt-2 text-sm text-slate-400">
                                          <span className="flex items-center gap-1"><Clock size={14}/> {t.estimatedTime}</span>
                                          <span>{t.difficulty}</span>
                                      </div>
                                      <p className="text-sm text-slate-300 mt-2">{t.description}</p>
                                      {t.validationErrors && t.validationErrors.length > 0 && (
                                          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
                                              <p className="font-bold flex items-center gap-2 mb-1"><AlertTriangle size={14}/> Corrections automatiques appliquées :</p>
                                              <ul className="list-disc pl-4 space-y-0.5 opacity-80">
                                                  {t.validationErrors.slice(0, 3).map((err, idx) => <li key={idx}>{err}</li>)}
                                                  {t.validationErrors.length > 3 && <li>...et {t.validationErrors.length - 3} autres corrections.</li>}
                                              </ul>
                                          </div>
                                      )}
                                  </header>
                                  <div className="space-y-4">
                                      {t.steps.map((step, idx) => (
                                          <div key={idx} className="flex gap-4 p-4 bg-slate-900 rounded-xl border border-slate-800">
                                              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shrink-0">{step.order}</div>
                                              <div className="flex-1">
                                                  <div className="flex justify-between items-start mb-2">
                                                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 uppercase font-bold tracking-wider">{step.category}</span>
                                                      {step.keyboard && (
                                                          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300 font-mono flex items-center gap-1">
                                                              <Keyboard size={10}/> {step.keyboard}
                                                          </span>
                                                      )}
                                                  </div>
                                                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                                                      {step.action} 
                                                      {step.tool && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded font-mono">{step.tool}</span>}
                                                  </h4>
                                                  
                                                  {step.explanation && <p className="text-xs text-slate-400 mt-2 mb-3 leading-relaxed">{step.explanation}</p>}

                                                  {step.settings && step.settings.length > 0 && (
                                                      <div className="mt-2 grid grid-cols-2 gap-2">
                                                          {step.settings.map((s, k) => (
                                                              <div key={k} className="text-xs bg-black/30 px-2 py-1.5 rounded border border-white/5 flex justify-between items-center group">
                                                                  <span className="text-slate-500 font-medium">{s.name}</span>
                                                                  <span className="text-blue-400 font-mono font-bold">
                                                                      {s.value}
                                                                      {s.unit && <span className="text-slate-600 ml-0.5 text-[9px]">{s.unit}</span>}
                                                                  </span>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  )}
                                                  
                                                  {step.tip && (
                                                      <div className="mt-3 text-xs text-amber-400/80 italic flex items-start gap-2 bg-amber-500/5 p-2 rounded">
                                                          <Lightbulb size={12} className="shrink-0 mt-0.5"/>
                                                          {step.tip}
                                                      </div>
                                                  )}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ))
                      ) : selectedTutorial ? (
                          // Display Static Tutorial
                          <div>
                              <h2 className="text-2xl font-bold text-white mb-4">{selectedTutorial.title}</h2>
                              <p className="text-slate-400 mb-8">{selectedTutorial.description}</p>
                              <div className="space-y-2">
                                  {selectedTutorial.steps.map((step, idx) => (
                                      <div key={idx} className="p-4 bg-slate-900 rounded-lg border border-slate-800 text-sm text-slate-300">
                                          <span className="font-bold text-white mr-2">{idx + 1}.</span> 
                                          {step.action} 
                                          {step.tool && <span className="ml-2 text-blue-400">({step.tool})</span>}
                                          {step.explanation && <p className="mt-1 text-xs text-slate-500">{step.explanation}</p>}
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ) : (
                          <div className="h-full flex items-center justify-center text-slate-500">
                              <BookOpen size={48} className="opacity-20 mb-4"/>
                              <p>Sélectionnez ou générez un tutoriel.</p>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* --- TAB 4: SAVED (Existing) --- */}
          {activeTab === 'saved' && (
              <div className="h-full p-8 overflow-y-auto scrollbar-thin">
                  {/* ... (Existing Saved Logic) ... */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {savedFiles.map((file) => (
                          <div key={file.id} className="bg-surface border border-slate-800 rounded-2xl p-6 hover:border-slate-600 transition-all shadow-xl group flex flex-col">
                              <div className="flex items-center gap-4 mb-4">
                                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 text-slate-400">
                                      <FileJson size={24}/>
                                  </div>
                                  <div className="min-w-0">
                                      <h3 className="font-bold text-white truncate text-sm mb-1">{file.name}</h3>
                                      <p className="text-[10px] text-slate-500 font-mono">{new Date(file.createdTime).toLocaleDateString()}</p>
                                  </div>
                              </div>
                              <button 
                                  onClick={() => handleLoadSavedItem(file)}
                                  disabled={loadingFileId === file.id}
                                  className="mt-auto w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                              >
                                  {loadingFileId === file.id ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>}
                                  Charger
                              </button>
                          </div>
                      ))}
                  </div>
              </div>
          )}

      </div>
    </div>
  );
};
