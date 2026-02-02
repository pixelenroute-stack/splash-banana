
import React, { useState, useEffect } from 'react';
import { googleSyncService } from '../services/googleSyncService';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { db } from '../services/mockDatabase';
import { BrandLogo } from './BrandLogo';
import { RefreshCw, Clock, Save, Check, Mail, Lock, Eye, EyeOff, Loader2, AlertTriangle, ArrowLeft, X, LogOut } from 'lucide-react';

export const GoogleSyncSettings: React.FC = () => {
    const [config, setConfig] = useState(googleSyncService.getConfig());
    const [saved, setSaved] = useState(false);
    
    const settings = db.getSystemSettings();
    const USER_ID = "user_1";
    
    // Utilisation du nouveau hook
    const { isConnected, loading: authLoading, email, connect, disconnect } = useGoogleAuth(USER_ID);

    // Check URL params for success/error (after redirect)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('google_auth') === 'success') {
            window.history.replaceState({}, '', window.location.pathname); // Clean URL
        }
    }, []);

    const handleSaveConfig = () => {
        googleSyncService.updateConfig(config);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            
            {/* CONFIGURATION HEADER */}
            <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <RefreshCw size={20} className="text-blue-400"/> Synchronisation Auto
                    </h3>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-medium uppercase">{config.enabled ? 'Activé' : 'Désactivé'}</span>
                        <button 
                            onClick={() => setConfig({...config, enabled: !config.enabled})}
                            className={`w-12 h-6 rounded-full p-1 transition-colors ${config.enabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${config.enabled ? 'translate-x-6' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className={`space-y-4 transition-opacity ${config.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Fréquences de mise à jour (sec)</h4>
                    <div className="grid grid-cols-3 gap-4">
                        {['gmail', 'calendar', 'drive'].map((service) => (
                            <div key={service}>
                                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5 flex items-center gap-1">
                                    <Clock size={10}/> {service}
                                </label>
                                <input 
                                    type="number" 
                                    min="15" 
                                    value={(config.intervals as any)[service]}
                                    onChange={(e) => setConfig({...config, intervals: {...config.intervals, [service]: parseInt(e.target.value)}})}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-blue-500 outline-none"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end pt-2">
                        <button 
                            onClick={handleSaveConfig}
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-colors border border-slate-600"
                        >
                            {saved ? <Check size={14}/> : <Save size={14}/>}
                            {saved ? 'Enregistré' : 'Sauvegarder Intervalles'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="h-px bg-slate-700/50 w-full" />

            {/* LOGIN CARD */}
            <div className="flex justify-center py-4">
                <div className="relative w-full max-w-[420px] bg-[#0c0c0c] rounded-[32px] p-8 shadow-2xl border border-white/5 ring-1 ring-white/5">
                    
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-2.5 bg-white/5 rounded-xl text-slate-300">
                            <Lock size={20} />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Connexion Services</h2>
                    </div>

                    {authLoading ? (
                        <div className="py-8 flex justify-center text-slate-500">
                            <Loader2 className="animate-spin" size={24}/>
                        </div>
                    ) : isConnected ? (
                        <div className="space-y-6">
                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                    <Check size={20}/>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Google Workspace Actif</p>
                                    <p className="text-xs text-green-400">{email}</p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={disconnect}
                                className="w-full bg-slate-800 hover:bg-red-500/10 hover:text-red-400 text-slate-300 font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all border border-slate-700 hover:border-red-500/30"
                            >
                                <LogOut size={16}/> Déconnecter le compte
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-400 mb-4">
                                Connectez votre compte Google pour synchroniser vos emails, agendas et fichiers Drive.
                            </p>

                            <button 
                                onClick={connect}
                                className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 px-4 rounded-2xl flex items-center transition-all group active:scale-[0.98]"
                            >
                                <div className="flex-1 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-black flex items-center justify-center border border-slate-200 shrink-0">
                                        <BrandLogo size="sm" overrideLogo={settings.branding.logoUrl} />
                                    </div>
                                    <div className="text-left overflow-hidden">
                                        <div className="text-xs leading-tight font-bold truncate">Connecter {settings.branding.name}</div>
                                        <div className="text-[10px] text-slate-500 font-medium truncate">via Google OAuth</div>
                                    </div>
                                </div>
                                <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" className="w-5 h-5 ml-auto opacity-80 group-hover:opacity-100" />
                            </button>

                            <div className="text-center">
                                <p className="text-[10px] text-slate-600 mt-2">
                                    Requiert les permissions Gmail, Drive et Calendar.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
