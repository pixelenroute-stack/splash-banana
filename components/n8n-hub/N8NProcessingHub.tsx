
import React, { useState, useEffect } from 'react';
import { n8nAgentService } from '../../lib/n8nAgentService';
import { N8NProcessingType, N8NLog, N8NResult } from '../../types';
import { 
  Cpu, Image as ImageIcon, Video, FileText, FileCode, Play, 
  RefreshCw, Terminal, Download, AlertCircle, CheckCircle,
  Settings, Clock, Database, Search, Zap, Layers
} from 'lucide-react';

export const N8NProcessingHub: React.FC = () => {
  const [selectedType, setSelectedType] = useState<N8NProcessingType>('image_generation');
  const [params, setParams] = useState<any>({});
  const [results, setResults] = useState<N8NResult[]>([]);
  const [logs, setLogs] = useState<N8NLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'studio' | 'logs' | 'history'>('studio');

  useEffect(() => {
    // Sync logs every 2 seconds
    const interval = setInterval(() => {
      setLogs([...n8nAgentService.getLogs()]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleProcess = async () => {
    setIsProcessing(true);
    const result = await n8nAgentService.fetchN8nWorkflow(selectedType, params);
    setResults(prev => [result, ...prev]);
    setIsProcessing(false);
  };

  const renderStudio = () => {
    switch (selectedType) {
      case 'image_generation':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Prompt</label>
              <textarea 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-sm focus:ring-1 focus:ring-primary outline-none"
                placeholder="Un astronaute chevauchant une banane..."
                onChange={e => setParams({ ...params, prompt: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Format</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none"
                  onChange={e => setParams({ ...params, format: e.target.value })}
                >
                  <option value="png">PNG</option>
                  <option value="webp">WEBP</option>
                  <option value="jpeg">JPEG</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Résolution</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none"
                  onChange={e => setParams({ ...params, resolution: e.target.value })}
                >
                  <option value="1024x1024">1024 x 1024</option>
                  <option value="1920x1080">1920 x 1080</option>
                  <option value="1080x1920">1080 x 1920</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 'video_processing':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Action Vidéo</label>
              <div className="grid grid-cols-3 gap-2">
                {['compress', 'extract', 'upload'].map(action => (
                  <button 
                    key={action}
                    onClick={() => setParams({ ...params, action })}
                    className={`p-3 rounded-lg text-xs font-bold transition-all border ${params.action === action ? 'bg-primary border-primary text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                  >
                    {action.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Source URL / File</label>
              <input 
                type="text"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                placeholder="https://..."
                onChange={e => setParams({ ...params, videoFile: e.target.value })}
              />
            </div>
          </div>
        );
      case 'text_transformation':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Action Texte</label>
              <select 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                onChange={e => setParams({ ...params, action: e.target.value })}
              >
                <option value="summarize">Résumer</option>
                <option value="expand">Développer</option>
                <option value="rewrite">Réécrire</option>
              </select>
            </div>
            <textarea 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-sm h-32 outline-none"
                placeholder="Texte à transformer..."
                onChange={e => setParams({ ...params, text: e.target.value })}
            />
          </div>
        );
      case 'file_handling':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-10 text-center hover:border-primary/50 transition-colors cursor-pointer bg-slate-900/50">
                <Layers className="mx-auto text-slate-500 mb-4" size={32} />
                <p className="text-sm text-slate-400">Cliquez ou glissez un fichier ici</p>
                <span className="text-[10px] text-slate-600 mt-2 block">JPG, PNG, PDF, MP4 (Max 50MB)</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Action</label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                    onChange={e => setParams({ ...params, action: e.target.value })}
                  >
                    <option value="compress">Compresser</option>
                    <option value="extract">Extraire</option>
                    <option value="validate">Valider</option>
                  </select>
               </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex bg-[#020617] text-slate-100 overflow-hidden">
      
      {/* Sidebar Traitements */}
      <div className="w-64 border-r border-slate-800 p-6 flex flex-col gap-8 bg-surface/30">
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Orchestrateur n8n</h2>
          <div className="space-y-1">
            {[
              { id: 'image_generation', label: 'Génération Image', icon: ImageIcon },
              { id: 'video_processing', label: 'Traitement Vidéo', icon: Video },
              { id: 'text_transformation', label: 'Transformation Texte', icon: FileText },
              { id: 'file_handling', label: 'Gestion Fichiers', icon: FileCode },
            ].map(type => (
              <button
                key={type.id}
                onClick={() => { setSelectedType(type.id as any); setParams({}); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all
                  ${selectedType === type.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <type.icon size={18} />
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto space-y-4">
             <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                 <div className="flex items-center justify-between mb-2">
                     <span className="text-[10px] text-slate-500 font-bold uppercase">Statut Workflow</span>
                     <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 </div>
                 <p className="text-xs text-slate-300">v3.1.2 - Connecté</p>
             </div>
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-surface/20">
            <div className="flex items-center gap-3">
                <Cpu className="text-primary" />
                <h1 className="text-xl font-bold">N8N Hub Studio</h1>
            </div>
            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button onClick={() => setActiveTab('studio')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'studio' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Studio</button>
                <button onClick={() => setActiveTab('logs')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'logs' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Console Logs</button>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8">
            {activeTab === 'studio' && (
              <div className="max-w-4xl mx-auto w-full space-y-8">
                  {/* Configuration Area */}
                  <div className="bg-surface border border-slate-800 rounded-3xl p-8 shadow-2xl">
                      <div className="flex items-center justify-between mb-8">
                          <h2 className="text-lg font-bold flex items-center gap-2">
                             <Settings size={20} className="text-slate-500" /> Paramètres du Traitement
                          </h2>
                          <div className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-500 font-mono">
                              GATEWAY: {selectedType.toUpperCase()}
                          </div>
                      </div>

                      {renderStudio()}

                      <div className="mt-8 flex justify-end">
                          <button 
                            onClick={handleProcess}
                            disabled={isProcessing}
                            className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all active:scale-95
                                ${isProcessing ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-primary hover:bg-blue-600 text-white shadow-xl shadow-primary/20'}`}
                          >
                              {isProcessing ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
                              {isProcessing ? 'Exécution du workflow...' : 'Lancer le traitement'}
                          </button>
                      </div>
                  </div>

                  {/* Results Stack */}
                  <div className="space-y-4">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Database size={14} /> Résultats récents
                      </h3>
                      {results.length === 0 ? (
                        <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                            <Zap className="mx-auto text-slate-800 mb-2" size={32} />
                            <p className="text-slate-600 text-sm">Prêt pour le premier traitement</p>
                        </div>
                      ) : (
                        results.map((res, i) => (
                          <div key={i} className={`bg-slate-900 border rounded-2xl p-6 flex justify-between items-center animate-in slide-in-from-bottom-4 duration-300 ${res.success ? 'border-slate-800' : 'border-red-500/30'}`}>
                             <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${res.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {res.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm">{res.success ? 'Traitement réussi' : 'Échec du traitement'}</h4>
                                    <p className="text-xs text-slate-500">{res.executionTime}ms • {res.cached ? 'Depuis le cache' : 'Requête Live'}</p>
                                </div>
                             </div>
                             {res.success && (
                               <button className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors">
                                 <Download size={16} />
                               </button>
                             )}
                          </div>
                        ))
                      )}
                  </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="bg-black border border-slate-800 rounded-2xl overflow-hidden h-full flex flex-col font-mono text-[11px]">
                  <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                      <span className="flex items-center gap-2 text-slate-400">
                        <Terminal size={14} /> n8n Orchestrator Console
                      </span>
                      <span className="text-slate-600">Session: {Date.now()}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-1">
                      {logs.map((log, i) => (
                        <div key={i} className="flex gap-4">
                            <span className="text-slate-700 shrink-0">[{log.timestamp.split('T')[1].split('.')[0]}]</span>
                            <span className={`font-bold w-12 shrink-0 ${log.level === 'error' ? 'text-red-500' : log.level === 'warn' ? 'text-orange-500' : 'text-blue-500'}`}>
                                {log.level.toUpperCase()}
                            </span>
                            <span className="text-slate-400 truncate">[{log.type || 'SYS'}] {log.message}</span>
                        </div>
                      ))}
                      {logs.length === 0 && <p className="text-slate-800 italic">En attente d'événements...</p>}
                  </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
