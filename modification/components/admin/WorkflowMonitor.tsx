
import React, { useState, useEffect } from 'react';
import { n8nAgentService } from '../../lib/n8nAgentService';
import { WorkflowExecution } from '../../types';
import { 
    Activity, CheckCircle2, AlertCircle, Clock, 
    MessageSquare, Image as ImageIcon, Video, 
    Users, Briefcase, RefreshCw, Trash2, Code, Zap
} from 'lucide-react';

const WORKFLOW_TYPES = [
    { id: 'chat', label: 'Chat Agent', icon: MessageSquare },
    { id: 'images', label: 'Image Gen', icon: ImageIcon },
    { id: 'videos', label: 'Video Gen', icon: Video },
    { id: 'clients', label: 'CRM Clients', icon: Users },
    { id: 'projects', label: 'Projets', icon: Briefcase },
    { id: 'google_workspace', label: 'Google Sync', icon: RefreshCw },
    { id: 'video_editor', label: 'Video Editor', icon: Zap },
    { id: 'news_generation', label: 'News Gen', icon: Activity },
    { id: 'file_handling', label: 'Fichiers', icon: Activity }
];

export const WorkflowMonitor: React.FC = () => {
    const [selectedType, setSelectedType] = useState<string>(WORKFLOW_TYPES[0].id);
    const [history, setHistory] = useState<WorkflowExecution[]>([]);
    const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const loadHistory = () => {
        const data = n8nAgentService.getHistory(selectedType);
        setHistory(data);
        // Si l'exécution sélectionnée n'est plus dans la liste (ex: clear), on désélectionne
        if (selectedExecution && !data.find(h => h.id === selectedExecution.id)) {
            setSelectedExecution(null);
        }
    };

    useEffect(() => {
        loadHistory();
        let interval: any;
        if (autoRefresh) {
            interval = setInterval(loadHistory, 3000);
        }
        return () => clearInterval(interval);
    }, [selectedType, autoRefresh]);

    const handleClear = () => {
        if(confirm("Voulez-vous effacer tout l'historique des résultats ?")) {
            n8nAgentService.clearHistory();
            loadHistory();
        }
    };

    const formatJSON = (data: any) => {
        try {
            return JSON.stringify(data, null, 2);
        } catch (e) {
            return String(data);
        }
    };

    return (
        <div className="flex h-[calc(100vh-140px)] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            
            {/* SIDEBAR: WORKFLOW TYPES */}
            <div className="w-64 bg-surface border-r border-slate-700 flex flex-col">
                <div className="p-4 border-b border-slate-700 font-bold text-white text-sm flex items-center gap-2">
                    <Activity size={16} className="text-primary"/> Flux Surveillés
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {WORKFLOW_TYPES.map(type => (
                        <button
                            key={type.id}
                            onClick={() => { setSelectedType(type.id); setSelectedExecution(null); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all
                                ${selectedType === type.id ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            <type.icon size={16} />
                            {type.label}
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-700">
                    <button 
                        onClick={handleClear}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 text-slate-400 rounded-lg text-xs font-bold transition-colors"
                    >
                        <Trash2 size={14}/> Vider l'historique
                    </button>
                </div>
            </div>

            {/* MIDDLE: EXECUTION LIST */}
            <div className="w-80 border-r border-slate-700 bg-black/20 flex flex-col">
                <div className="p-3 border-b border-slate-700 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Exécutions ({history.length})</span>
                    <button 
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`text-[10px] px-2 py-1 rounded border ${autoRefresh ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}
                    >
                        {autoRefresh ? 'AUTO ON' : 'PAUSE'}
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {history.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-xs italic">
                            Aucune donnée pour ce workflow.
                        </div>
                    ) : (
                        history.map(exec => (
                            <div 
                                key={exec.id}
                                onClick={() => setSelectedExecution(exec)}
                                className={`p-4 border-b border-slate-800 cursor-pointer transition-colors hover:bg-slate-800/50
                                    ${selectedExecution?.id === exec.id ? 'bg-slate-800 border-l-2 border-l-primary' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase
                                        ${exec.status === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {exec.status}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                        {new Date(exec.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-300 font-medium truncate mb-1">
                                    Payload: {JSON.stringify(exec.inputPayload).substring(0, 30)}...
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                    <Clock size={10}/> {exec.latency}ms
                                    {exec.cached && <span className="bg-blue-500/10 text-blue-400 px-1 rounded">CACHE</span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT: JSON INSPECTOR */}
            <div className="flex-1 flex flex-col bg-[#0c0c0c]">
                {selectedExecution ? (
                    <>
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-surface/50">
                            <div className="flex items-center gap-3">
                                {selectedExecution.status === 'success' ? <CheckCircle2 size={20} className="text-green-500"/> : <AlertCircle size={20} className="text-red-500"/>}
                                <div>
                                    <h3 className="font-bold text-white text-sm">Détails de l'exécution</h3>
                                    <p className="text-xs text-slate-500 font-mono">ID: {selectedExecution.id}</p>
                                </div>
                            </div>
                            <div className="text-xs text-slate-400">
                                {new Date(selectedExecution.timestamp).toLocaleString()}
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {/* INPUT PAYLOAD */}
                            <div className="h-1/3 border-b border-slate-800 flex flex-col">
                                <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <Code size={12}/> Données d'entrée (Request Payload)
                                </div>
                                <div className="flex-1 overflow-auto p-4 bg-[#0a0a0a]">
                                    <pre className="text-xs font-mono text-blue-300 whitespace-pre-wrap">
                                        {formatJSON(selectedExecution.inputPayload)}
                                    </pre>
                                </div>
                            </div>

                            {/* OUTPUT RESPONSE */}
                            <div className="flex-1 flex flex-col">
                                <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <Code size={12}/> Réponse renvoyée (Result)
                                </div>
                                <div className="flex-1 overflow-auto p-4 bg-[#0a0a0a]">
                                    <pre className={`text-xs font-mono whitespace-pre-wrap ${selectedExecution.status === 'success' ? 'text-green-300' : 'text-red-300'}`}>
                                        {formatJSON(selectedExecution.outputResponse)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                        <Activity size={48} className="opacity-20 mb-4"/>
                        <p className="text-sm">Sélectionnez une exécution pour voir les détails JSON.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
