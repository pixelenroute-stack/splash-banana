
import React, { useState } from 'react';
import { diagnosticsService } from '../../services/diagnosticsService';
import { geminiService } from '../../services/geminiService';
import { FileText, Play, Download, Loader2, Key, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

export const SystemAuditor: React.FC = () => {
    const [apiKey, setApiKey] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const [reportText, setReportText] = useState<string | null>(null);
    const [reportData, setReportData] = useState<any>(null);

    const runAudit = async () => {
        setIsAnalyzing(true);
        setReportText(null);
        
        try {
            // Etape 1: Collecte des données
            setStatusText("Scan du système en cours (DB, Config, Réseau)...");
            setProgress(10);
            const sysReport = await diagnosticsService.generateFullSystemReport();
            setReportData(sysReport);
            setProgress(40);

            // Etape 2: Analyse IA
            setStatusText("Envoi des données à l'Auditeur IA (Gemini Pro)...");
            setProgress(60);
            const auditResult = await geminiService.analyzeSystemReport(sysReport, apiKey || undefined);
            
            // Etape 3: Finalisation
            setReportText(auditResult);
            setProgress(100);
            setStatusText("Audit terminé.");

        } catch (e: any) {
            setStatusText(`Erreur critique: ${e.message}`);
            setProgress(0);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const downloadReport = () => {
        if (!reportText) return;
        
        // Construction du contenu du fichier
        const fileContent = `
================================================================
   RAPPORT D'AUDIT COMPLET - SPLASH BANANA SYSTEM
   Généré le: ${new Date().toLocaleString()}
================================================================

[1] ANALYSE IA (GEMINI PRO)
----------------------------------------------------------------
${reportText}

----------------------------------------------------------------
[2] DONNÉES TECHNIQUES BRUTES (SNAPSHOT JSON)
----------------------------------------------------------------
${JSON.stringify(reportData, null, 2)}
        `.trim();

        const blob = new Blob([fileContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Audit_Systeme_${new Date().toISOString().slice(0,10)}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Header Card */}
            <div className="bg-surface border border-slate-700 rounded-2xl p-8 shadow-xl">
                <div className="flex items-start justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <ShieldCheck className="text-primary" size={32}/> Auditeur Système IA
                        </h2>
                        <p className="text-slate-400 mt-2 text-sm leading-relaxed max-w-xl">
                            Cet outil scanne l'intégralité de l'application (configuration, intégrité des données, connectivité API) 
                            et soumet un rapport technique détaillé à un modèle d'IA (Gemini Pro) pour analyse critique.
                        </p>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-center min-w-[120px]">
                        <div className="text-xs text-slate-500 font-bold uppercase mb-1">Moteur</div>
                        <div className="text-primary font-bold">Gemini 1.5 Pro</div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-700 flex flex-col md:flex-row items-end gap-4">
                    <div className="flex-1 w-full">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2 flex items-center gap-2">
                            <Key size={14}/> Clé API Audit (Optionnel)
                        </label>
                        <input 
                            type="password" 
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Laisser vide pour utiliser la clé système..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-primary outline-none placeholder:text-slate-600"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                            Utilisez une clé personnelle si le quota système est atteint.
                        </p>
                    </div>
                    <button 
                        onClick={runAudit}
                        disabled={isAnalyzing}
                        className="w-full md:w-auto px-8 py-3 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                    >
                        {isAnalyzing ? <Loader2 size={18} className="animate-spin"/> : <Play size={18}/>}
                        {isAnalyzing ? 'Analyse en cours...' : 'Lancer l\'Audit Complet'}
                    </button>
                </div>

                {/* Progress Bar */}
                {isAnalyzing && (
                    <div className="mt-6 space-y-2">
                        <div className="flex justify-between text-xs font-bold text-slate-400">
                            <span>{statusText}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500" 
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Results Area */}
            {reportText && (
                <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <FileText className="text-green-400" size={24}/> Rapport Généré
                        </h3>
                        <button 
                            onClick={downloadReport}
                            className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold border border-slate-600 transition-colors"
                        >
                            <Download size={16}/> Télécharger (.txt)
                        </button>
                    </div>

                    <div className="bg-black border border-slate-800 rounded-xl p-6 overflow-hidden">
                        <div className="h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                            <div className="prose prose-invert prose-sm max-w-none font-mono text-slate-300 whitespace-pre-wrap">
                                {reportText}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex gap-4">
                        <div className="flex-1 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start gap-3">
                            <CheckCircle className="text-green-400 mt-0.5" size={18}/>
                            <div>
                                <h4 className="text-sm font-bold text-green-400">Analyse Terminée</h4>
                                <p className="text-xs text-green-300/80 mt-1">Le système a été scanné avec succès. Téléchargez le rapport pour archivage.</p>
                            </div>
                        </div>
                        {reportData?.status?.critical_issues?.length > 0 && (
                            <div className="flex-1 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                                <AlertTriangle className="text-red-400 mt-0.5" size={18}/>
                                <div>
                                    <h4 className="text-sm font-bold text-red-400">Problèmes Critiques</h4>
                                    <p className="text-xs text-red-300/80 mt-1">{reportData.status.critical_issues.length} services nécessitent une attention immédiate.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
