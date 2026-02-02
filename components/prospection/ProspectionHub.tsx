
import React, { useState, useEffect, useRef } from 'react';
import { 
    Target, Search, MapPin, Linkedin, Map as MapIcon, 
    RefreshCw, Filter, ChevronRight, CheckCircle2, 
    AlertCircle, Mail, BarChart3, Globe, ExternalLink,
    Loader2, Send, Database, UserPlus, X, Terminal,
    Users, Sparkles
} from 'lucide-react';
import { prospectionService } from '../../services/prospectionService';
import { Lead, LeadSource } from '../../types';
import { db } from '../../services/mockDatabase';
import { sheetsService } from '../../services/sheetsRepository'; // Pour export vers Sheets

export const ProspectionHub: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'scanner' | 'leads' | 'campaign'>('scanner');
    
    // SCANNER STATE
    const [platform, setPlatform] = useState<LeadSource>('linkedin');
    const [keyword, setKeyword] = useState('');
    const [location, setLocation] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [scanLogs, setScanLogs] = useState<string[]>([]);
    const [foundLeads, setFoundLeads] = useState<Lead[]>([]);

    // LEADS STATE
    const [savedLeads, setSavedLeads] = useState<Lead[]>([]);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState('');

    // CAMPAIGN STATE
    const [emailDraft, setEmailDraft] = useState('');
    const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
    const [emailTone, setEmailTone] = useState<'professional' | 'casual' | 'direct'>('professional');

    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [scanLogs]);

    const addLog = (msg: string) => setScanLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const handleScan = async () => {
        if (!keyword || !location) return;
        
        setIsScanning(true);
        setScanLogs([]);
        setFoundLeads([]);
        
        addLog(`Initialisation du scraper pour ${platform.toUpperCase()}...`);
        addLog(`Cible : "${keyword}" à "${location}"`);
        
        try {
            // Simulation visuelle des étapes
            setTimeout(() => addLog("Authentification sécurisée... OK"), 800);
            setTimeout(() => addLog("Navigation vers la page de résultats..."), 1500);
            setTimeout(() => addLog("Extraction du DOM (Page 1)..."), 2200);
            setTimeout(() => addLog("Analyse des profils sociaux et enrichissement..."), 3000);

            const leads = await prospectionService.searchLeads(platform, keyword, location);
            
            setTimeout(() => {
                setFoundLeads(leads);
                addLog(`Terminé : ${leads.length} leads qualifiés trouvés.`);
                setIsScanning(false);
            }, 3500);

        } catch (e) {
            addLog("ERREUR CRITIQUE : Échec du scraping.");
            setIsScanning(false);
        }
    };

    const handleSaveLead = (lead: Lead) => {
        // Avoid duplicates
        if (!savedLeads.find(l => l.id === lead.id)) {
            const newLead = { ...lead, status: 'new' as const };
            setSavedLeads(prev => [...prev, newLead]);
            // Optionnel : Sync auto vers CRM / Sheets
            // sheetsService.addClient({...}); 
        }
    };

    const handleAnalyzeLead = async (lead: Lead) => {
        setSelectedLead(lead);
        setActiveTab('leads'); // Switch view if needed
        setIsAnalyzing(true);
        setAnalysisResult('');
        const analysis = await prospectionService.analyzeSocialPresence(lead);
        setAnalysisResult(analysis);
        setIsAnalyzing(false);
    };

    const handleGenerateEmail = async () => {
        if (!selectedLead) return;
        setIsGeneratingEmail(true);
        const mail = await prospectionService.generateColdEmail(selectedLead, emailTone);
        setEmailDraft(mail);
        setIsGeneratingEmail(false);
        setActiveTab('campaign');
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 50) return 'text-amber-400';
        return 'text-red-400';
    };

    // --- RENDERERS ---

    const renderScanner = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            {/* CONFIG PANEL */}
            <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-xl h-fit">
                <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                    <Filter className="text-primary" size={20} /> Configuration Recherche
                </h3>
                
                <div className="space-y-6">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Plateforme Cible</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setPlatform('linkedin')}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${platform === 'linkedin' ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                            >
                                <Linkedin size={24} className="mb-2"/>
                                <span className="text-xs font-bold">LinkedIn</span>
                            </button>
                            <button 
                                onClick={() => setPlatform('google_maps')}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${platform === 'google_maps' ? 'bg-green-600 border-green-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                            >
                                <MapIcon size={24} className="mb-2"/>
                                <span className="text-xs font-bold">Google Maps</span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Mots-clés (Niche)</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
                            <input 
                                type="text" 
                                value={keyword}
                                onChange={e => setKeyword(e.target.value)}
                                placeholder="ex: Salle de sport, Agence immo..." 
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Localisation</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
                            <input 
                                type="text" 
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                placeholder="ex: Paris, Lyon, Remote..." 
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleScan}
                        disabled={isScanning || !keyword}
                        className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isScanning ? <Loader2 className="animate-spin" size={20}/> : <Target size={20}/>}
                        {isScanning ? 'Scraping en cours...' : 'Lancer le Scanner'}
                    </button>
                </div>
            </div>

            {/* RESULTS / TERMINAL PANEL */}
            <div className="lg:col-span-2 flex flex-col gap-6 h-full overflow-hidden">
                {/* Terminal Log */}
                <div className="bg-black border border-slate-800 rounded-xl p-4 font-mono text-xs h-48 overflow-y-auto scrollbar-thin flex flex-col" ref={scrollRef}>
                    <div className="flex items-center gap-2 text-slate-500 border-b border-slate-800 pb-2 mb-2 sticky top-0 bg-black">
                        <Terminal size={12}/> Console de sortie
                    </div>
                    {scanLogs.length === 0 ? (
                        <span className="text-slate-700 italic">En attente de commandes...</span>
                    ) : (
                        scanLogs.map((log, i) => <div key={i} className="text-green-500/80 mb-1">{log}</div>)
                    )}
                    {isScanning && <div className="text-primary animate-pulse">_</div>}
                </div>

                {/* Results Table */}
                <div className="flex-1 bg-surface border border-slate-700 rounded-2xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Database size={16} className="text-emerald-400"/> Résultats ({foundLeads.length})
                        </h3>
                        {foundLeads.length > 0 && (
                            <button onClick={() => foundLeads.forEach(handleSaveLead)} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition-colors">
                                Tout importer
                            </button>
                        )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {foundLeads.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                                <Search size={48} className="mb-4"/>
                                <p>Aucun résultat à afficher</p>
                            </div>
                        ) : (
                            foundLeads.map(lead => (
                                <div key={lead.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between group hover:border-slate-600 transition-all">
                                    <div>
                                        <h4 className="font-bold text-white text-sm">{lead.company}</h4>
                                        <p className="text-xs text-slate-400">{lead.name} • {lead.role}</p>
                                        <div className="flex gap-2 mt-2">
                                            {lead.website && <a href={lead.website} target="_blank" className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-blue-400 hover:underline flex items-center gap-1"><Globe size={10}/> Web</a>}
                                            {lead.socials.instagram && <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-pink-400 flex items-center gap-1">Insta</span>}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className={`text-lg font-bold ${getScoreColor(lead.score)}`}>{lead.score}/100</div>
                                            <div className="text-[10px] text-slate-500 uppercase">Potentiel</div>
                                        </div>
                                        <button 
                                            onClick={() => handleSaveLead(lead)}
                                            className="p-2 bg-primary hover:bg-blue-600 text-white rounded-lg shadow-lg transition-transform active:scale-95"
                                            title="Ajouter aux leads"
                                        >
                                            <UserPlus size={18}/>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderLeads = () => (
        <div className="flex h-full gap-6">
            {/* LEAD LIST */}
            <div className="w-1/3 bg-surface border border-slate-700 rounded-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Users size={18} className="text-primary"/> Leads Sauvegardés
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {savedLeads.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 text-sm">Aucun lead importé.</div>
                    ) : (
                        savedLeads.map(lead => (
                            <div 
                                key={lead.id}
                                onClick={() => setSelectedLead(lead)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedLead?.id === lead.id ? 'bg-primary/10 border-primary shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-white text-sm truncate">{lead.company}</h4>
                                    <span className={`text-[10px] font-bold ${getScoreColor(lead.score)}`}>{lead.score}</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">{lead.name}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* LEAD DETAIL & ACTION */}
            <div className="flex-1 bg-surface border border-slate-700 rounded-2xl p-8 flex flex-col relative overflow-hidden">
                {!selectedLead ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
                        <Target size={64} className="opacity-20"/>
                        <p>Sélectionnez un lead pour l'analyser ou le contacter.</p>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-2">{selectedLead.company}</h2>
                                <p className="text-slate-400 flex items-center gap-2">
                                    <MapPin size={16}/> {selectedLead.location} 
                                    <span className="w-1 h-1 bg-slate-600 rounded-full"/> 
                                    <Globe size={16}/> {selectedLead.website || 'Pas de site'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleAnalyzeLead(selectedLead)}
                                    disabled={isAnalyzing}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-600 flex items-center gap-2"
                                >
                                    {isAnalyzing ? <Loader2 size={14} className="animate-spin"/> : <BarChart3 size={14}/>}
                                    Audit Social
                                </button>
                                <button 
                                    onClick={handleGenerateEmail}
                                    className="px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2"
                                >
                                    <Mail size={14}/> Préparer Email
                                </button>
                            </div>
                        </div>

                        {/* Analysis Box */}
                        {analysisResult && (
                            <div className="bg-slate-900/80 border-l-4 border-emerald-500 rounded-r-xl p-6 shadow-lg">
                                <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                    <Sparkles size={14} className="text-emerald-400"/> Analyse IA
                                </h4>
                                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{analysisResult}</p>
                            </div>
                        )}

                        {/* Social Stats Mock */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center">
                                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Fréquence Vidéo</div>
                                <div className="text-lg font-bold text-white">{selectedLead.metrics?.videoFrequency || 'N/A'}</div>
                            </div>
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center">
                                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Engagement Est.</div>
                                <div className="text-lg font-bold text-white">{selectedLead.metrics?.engagementRate || 'N/A'}</div>
                            </div>
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center">
                                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Status</div>
                                <div className="text-lg font-bold text-blue-400 capitalize">{selectedLead.status}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderCampaign = () => (
        <div className="h-full flex flex-col gap-6 max-w-4xl mx-auto">
            <div className="bg-surface border border-slate-700 rounded-2xl p-8 shadow-xl flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                        <Send size={24} className="text-primary"/> Rédacteur de Campagne
                    </h3>
                    
                    <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                        {(['professional', 'casual', 'direct'] as const).map(tone => (
                            <button
                                key={tone}
                                onClick={() => setEmailTone(tone)}
                                className={`px-4 py-1.5 text-xs font-bold rounded transition-all capitalize ${emailTone === tone ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                {tone}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Destinataire</label>
                            <input 
                                disabled 
                                value={selectedLead ? `${selectedLead.name} <${selectedLead.email || 'email@inconnu.com'}>` : 'Aucun lead sélectionné'} 
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-300 text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex-1 relative">
                        <textarea 
                            value={emailDraft}
                            onChange={e => setEmailDraft(e.target.value)}
                            className="w-full h-full bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-200 leading-relaxed outline-none focus:border-primary resize-none font-sans"
                            placeholder="Générez un email ou écrivez-le ici..."
                        />
                        {isGeneratingEmail && (
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
                                <div className="flex flex-col items-center gap-3 text-white">
                                    <Loader2 size={32} className="animate-spin text-primary"/>
                                    <span className="text-sm font-bold">Rédaction par l'IA en cours...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-slate-800">
                    <button 
                        onClick={handleGenerateEmail} 
                        disabled={!selectedLead || isGeneratingEmail}
                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center gap-2 border border-slate-600 transition-all"
                    >
                        <RefreshCw size={18}/> Régénérer (IA)
                    </button>
                    <button className="px-8 py-3 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                        <Send size={18}/> Envoyer (Simulation)
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#020617]">
            {/* HEADER */}
            <header className="p-6 border-b border-slate-800 bg-surface/50 backdrop-blur flex justify-between items-center z-10">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Target className="text-primary" /> Prospection Hub
                    </h1>
                    <p className="text-slate-400 text-sm">Génération de leads et outreach intelligent.</p>
                </div>
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
                    <button onClick={() => setActiveTab('scanner')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'scanner' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Scanner</button>
                    <button onClick={() => setActiveTab('leads')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'leads' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Leads ({savedLeads.length})</button>
                    <button onClick={() => setActiveTab('campaign')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'campaign' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Campagne</button>
                </div>
            </header>

            {/* CONTENT */}
            <div className="flex-1 overflow-hidden p-8">
                {activeTab === 'scanner' && renderScanner()}
                {activeTab === 'leads' && renderLeads()}
                {activeTab === 'campaign' && renderCampaign()}
            </div>
        </div>
    );
};
