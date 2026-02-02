
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/mockDatabase';
import { systemTester } from '../services/systemTester';
import { 
    Activity, CheckCircle, AlertTriangle, X, Play, Loader2, Bug, Bot, 
    Terminal, Scan, Server, FileCode, Search 
} from 'lucide-react';
import { SystemReport } from '../types';

export const DevToolbar: React.FC = () => {
    const settings = db.getSystemSettings();
    const [isRunning, setIsRunning] = useState(false);
    const [lastReport, setLastReport] = useState<SystemReport | null>(null);
    const [minimized, setMinimized] = useState(false);
    const [showDeepScanModal, setShowDeepScanModal] = useState(false);
    const [logs, setLogs] = useState<Array<{msg: string, type: 'info'|'success'|'error'|'warning'}>>([]);
    const [viewMode, setViewMode] = useState<'analysis' | 'code_inspector'>('analysis');
    
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    if (settings.appMode !== 'developer') return null;

    const addLog = (msg: string, type: 'info'|'success'|'error'|'warning' = 'info') => {
        setLogs(prev => [...prev, { msg, type }]);
    };

    const handleRunTest = async () => {
        setIsRunning(true);
        setLastReport(null);
        setLogs([]);
        setShowDeepScanModal(true);
        setViewMode('analysis');
        
        try {
            const report = await systemTester.runFullSystemTest('user_1', addLog);
            setLastReport(report);
            
            if (report.failCount > 0) {
                addLog("Analysis finished with errors. Loading Code Inspector...", 'warning');
                setTimeout(() => setViewMode('code_inspector'), 1000);
            } else {
                addLog("Analysis finished. System Green.", 'success');
            }
        } catch (e) {
            console.error(e);
            addLog(`CRITICAL FAILURE: ${(e as Error).message}`, 'error');
        } finally {
            setIsRunning(false);
        }
    };

    // --- DEEP SCAN MODAL ---
    if (showDeepScanModal) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                <div className="w-[95vw] max-w-6xl h-[90vh] bg-[#0c0c0c] border border-green-900/30 rounded-lg shadow-[0_0_50px_rgba(0,255,0,0.1)] flex flex-col overflow-hidden relative">
                    
                    {/* Header Matrix Style */}
                    <div className="bg-black/50 border-b border-green-900/30 p-4 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <Bug className="text-green-500 animate-pulse" size={24} />
                            <div>
                                <h2 className="text-green-500 font-mono text-lg font-bold tracking-widest uppercase">System Integrity Check</h2>
                                <p className="text-green-500/50 text-[10px] font-mono">v5.0.0 • STATIC ANALYSIS • RUNTIME MAPPING</p>
                            </div>
                        </div>
                        <button onClick={() => setShowDeepScanModal(false)} className="text-green-500/50 hover:text-green-500 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        
                        {/* LEFT: TERMINAL LOGS */}
                        <div className="w-1/3 bg-black p-6 font-mono text-xs overflow-y-auto scrollbar-thin scrollbar-thumb-green-900/50 relative border-r border-green-900/20">
                            <div className="sticky top-0 bg-black pb-2 mb-2 border-b border-green-900/20 text-green-500 font-bold uppercase tracking-wider flex items-center gap-2">
                                <Terminal size={12}/> Live Execution Log
                            </div>
                            {logs.map((log, i) => (
                                <div key={i} className={`mb-1 break-words font-mono
                                    ${log.type === 'error' ? 'text-red-500' : 
                                      log.type === 'success' ? 'text-green-400' : 
                                      log.type === 'warning' ? 'text-amber-400' : 'text-green-500/60'}`}>
                                    <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                                    {log.type === 'error' ? '>> ERR: ' : '> '}
                                    {log.msg}
                                </div>
                            ))}
                            {isRunning && <div className="text-green-500 animate-pulse mt-4">_ scanning...</div>}
                            <div ref={logsEndRef} />
                        </div>

                        {/* RIGHT: CODE INSPECTOR */}
                        <div className="flex-1 bg-[#111] flex flex-col">
                            
                            {/* Tabs */}
                            <div className="flex border-b border-green-900/20 bg-black/40">
                                <button 
                                    onClick={() => setViewMode('analysis')}
                                    className={`px-6 py-3 text-xs font-bold font-mono uppercase transition-colors ${viewMode === 'analysis' ? 'bg-green-500/10 text-green-400 border-b-2 border-green-500' : 'text-gray-500 hover:text-green-500'}`}
                                >
                                    Overview
                                </button>
                                <button 
                                    onClick={() => setViewMode('code_inspector')}
                                    className={`px-6 py-3 text-xs font-bold font-mono uppercase transition-colors ${viewMode === 'code_inspector' ? 'bg-red-500/10 text-red-400 border-b-2 border-red-500' : 'text-gray-500 hover:text-red-500'}`}
                                >
                                    Code Inspector ({lastReport?.diagnostics?.length || 0})
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {viewMode === 'analysis' && (
                                    <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                                        {isRunning ? (
                                            <div className="relative">
                                                <div className="w-32 h-32 border-4 border-green-500/10 border-t-green-500 rounded-full animate-spin"></div>
                                                <Scan size={48} className="text-green-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse"/>
                                            </div>
                                        ) : lastReport ? (
                                            <>
                                                <div className={`text-6xl font-bold ${lastReport.failCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    {Math.round((lastReport.passCount / (lastReport.passCount + lastReport.failCount)) * 100)}%
                                                </div>
                                                <p className="text-gray-400 uppercase tracking-widest text-sm">System Health Score</p>
                                                
                                                <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-8">
                                                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                                                        <div className="text-2xl font-bold text-green-400">{lastReport.passCount}</div>
                                                        <div className="text-[10px] text-green-600 uppercase">Tests Passed</div>
                                                    </div>
                                                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                                                        <div className="text-2xl font-bold text-red-400">{lastReport.failCount}</div>
                                                        <div className="text-[10px] text-red-600 uppercase">Issues Found</div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-gray-600">Ready to analyze.</p>
                                        )}
                                    </div>
                                )}

                                {viewMode === 'code_inspector' && (
                                    <div className="space-y-6">
                                        {!lastReport?.diagnostics || lastReport.diagnostics.length === 0 ? (
                                            <div className="text-center text-green-500/50 py-20 italic">No code issues detected.</div>
                                        ) : (
                                            lastReport.diagnostics.map((diag, idx) => (
                                                <div key={idx} className="bg-[#0f0f0f] border border-red-500/20 rounded-lg overflow-hidden flex flex-col shadow-lg animate-in slide-in-from-bottom-2" style={{animationDelay: `${idx * 100}ms`}}>
                                                    {/* File Header */}
                                                    <div className="bg-red-500/10 px-4 py-2 border-b border-red-500/20 flex justify-between items-center">
                                                        <div className="flex items-center gap-2 text-red-400 font-mono text-sm">
                                                            <FileCode size={16}/>
                                                            <span className="font-bold">{diag.file}</span>
                                                            <span className="text-red-500/50">:{diag.line}</span>
                                                        </div>
                                                        <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30 uppercase font-bold">
                                                            {diag.errorType}
                                                        </span>
                                                    </div>

                                                    {/* Code Snippet */}
                                                    <div className="p-4 bg-black relative group">
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                                                        <pre className="font-mono text-xs text-gray-300 overflow-x-auto p-2">
                                                            <code className="block text-red-300 mb-1">// {diag.functionName}</code>
                                                            {diag.snippet}
                                                        </pre>
                                                    </div>

                                                    {/* Suggestion Footer */}
                                                    <div className="bg-[#1a1a1a] p-3 border-t border-gray-800 flex gap-3 items-start">
                                                        <Bot size={16} className="text-blue-400 shrink-0 mt-0.5"/>
                                                        <p className="text-xs text-gray-400 leading-relaxed">
                                                            <span className="text-blue-400 font-bold block mb-1">Fix Suggestion:</span>
                                                            {diag.suggestion}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- DEFAULT TOOLBAR ---
    if (minimized) {
        return (
            <button 
                onClick={() => setMinimized(false)}
                className="fixed bottom-4 right-4 z-[9990] p-3 bg-green-600 hover:bg-green-500 text-black rounded-full shadow-[0_0_20px_rgba(34,197,94,0.5)] border-2 border-black/20 transition-all hover:scale-110 group"
            >
                <Bug size={24} className="group-hover:rotate-12 transition-transform" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-[9990] bg-[#0c0c0c] border border-green-500/30 rounded-xl shadow-2xl overflow-hidden font-mono w-72 animate-in slide-in-from-bottom-4">
            <div className="bg-green-500/10 p-3 border-b border-green-500/20 flex justify-between items-center">
                <div className="flex items-center gap-2 text-green-500 font-bold text-xs uppercase tracking-wider">
                    <Terminal size={14} /> Dev Console
                </div>
                <button onClick={() => setMinimized(true)} className="text-green-500/50 hover:text-green-500"><X size={14} /></button>
            </div>
            <div className="p-4 space-y-3">
                <button 
                    onClick={handleRunTest}
                    className="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs transition-all active:scale-95 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                >
                    <Play size={14} fill="currentColor"/> START DIAGNOSTIC
                </button>
                <div className="text-[10px] text-gray-500 text-center">
                    Simulates user actions • Maps Runtime Errors to Code • Zero AI Cost
                </div>
            </div>
        </div>
    );
};
