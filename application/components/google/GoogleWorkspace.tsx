
import React, { useState, useEffect } from 'react';
import { MailClient } from '../MailClient';
import { CalendarClient } from '../CalendarClient';
import { DriveClient } from '../DriveClient';
import { googleService } from '../../services/googleService';
import { googleSyncService } from '../../services/googleSyncService';
import { db } from '../../services/mockDatabase';
import { LoginOverlay } from '../auth/LoginOverlay';
import { Mail, Calendar, HardDrive, RefreshCw, Loader2, Lock, ShieldAlert, Wifi, WifiOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

export const GoogleWorkspace: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'gmail' | 'calendar' | 'drive'>('gmail');
    const [connStatus, setConnStatus] = useState<'live' | 'mock' | 'error' | 'disconnected'>('disconnected');
    const [isLoading, setIsLoading] = useState(true);
    const [showAuth, setShowAuth] = useState(false);
    
    // Notifications Counters
    const [newEmailsCount, setNewEmailsCount] = useState(0);
    const [newEventsCount, setNewEventsCount] = useState(0);
    const [newFilesCount, setNewFilesCount] = useState(0);

    const { notify } = useNotification();
    const USER_ID = "user_1";

    // Gestion du retour OAuth avec les données du compte
    useEffect(() => {
        const handleOAuthReturn = () => {
            const hash = window.location.hash;
            const params = new URLSearchParams(hash.replace('#workspace?', '').replace('#workspace', ''));

            const googleAuth = params.get('google_auth');
            const accountData = params.get('account_data');
            const googleError = params.get('google_error');

            if (googleError) {
                notify(`Erreur Google: ${decodeURIComponent(googleError)}`, 'error');
                // Nettoyer l'URL
                window.history.replaceState(null, '', '/#workspace');
                return;
            }

            if (googleAuth === 'success' && accountData) {
                try {
                    // Décoder les données du compte depuis base64
                    const decodedData = JSON.parse(atob(decodeURIComponent(accountData)));

                    // Sauvegarder dans localStorage via mockDatabase
                    db.saveGoogleAccount(USER_ID, decodedData);

                    notify('Compte Google connecté avec succès!', 'success');

                    // Nettoyer l'URL pour ne pas réimporter les données
                    window.history.replaceState(null, '', '/#workspace');

                    // Vérifier le status
                    checkStatus();
                } catch (e) {
                    console.error('Failed to parse account data:', e);
                    notify('Erreur lors de la connexion Google', 'error');
                }
            } else {
                checkStatus();
            }
        };

        handleOAuthReturn();
    }, []);

    // Abonnement à la synchronisation automatique
    useEffect(() => {
        if (connStatus === 'live') {
            // Démarrer le polling
            googleSyncService.startPolling(USER_ID);

            // S'abonner aux mises à jour
            const unsubscribe = googleSyncService.subscribe((service, data) => {
                if (service === 'gmail') {
                    const count = Array.isArray(data) ? data.length : 1;
                    setNewEmailsCount(prev => prev + count);
                    notify(`📧 ${count} nouvel(s) email(s) reçu(s)`, 'info');
                } else if (service === 'calendar') {
                    setNewEventsCount(prev => prev + 1); // Simplifié, on incrémente juste pour signaler du changement
                    notify(`📅 Calendrier mis à jour`, 'info');
                } else if (service === 'drive') {
                    setNewFilesCount(prev => prev + 1);
                    notify(`📁 Fichiers Drive mis à jour`, 'info');
                }
            });

            return () => {
                unsubscribe();
                googleSyncService.stopPolling();
            };
        }
    }, [connStatus]);

    const checkStatus = async () => {
        setIsLoading(true);
        try {
            const res = await googleService.getAccountStatus(USER_ID);
            setConnStatus(res.status);
        } catch (e) {
            setConnStatus('error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuccessAuth = () => {
        setShowAuth(false);
        checkStatus();
    };

    const handleTabChange = (tab: 'gmail' | 'calendar' | 'drive') => {
        setActiveTab(tab);
        // Reset counters on view
        if (tab === 'gmail') setNewEmailsCount(0);
        if (tab === 'calendar') setNewEventsCount(0);
        if (tab === 'drive') setNewFilesCount(0);
    };

    const handleManualRefresh = async () => {
        setIsLoading(true);
        // Force refresh via le sync service pour mettre à jour les caches
        googleService.invalidateCache();
        await checkStatus();
        setIsLoading(false);
    };

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 bg-background">
                <Loader2 size={40} className="animate-spin text-primary" />
                <p className="animate-pulse font-medium">Vérification de la synchronisation réelle...</p>
            </div>
        );
    }

    // Si on est vraiment déconnecté ou en erreur critique (et pas de config Settings)
    if (connStatus === 'disconnected' || connStatus === 'error') {
        return (
            <div className="h-full flex items-center justify-center p-8 bg-background relative overflow-hidden">
                <div className="max-w-md w-full bg-surface border border-slate-700/50 rounded-[40px] p-12 text-center shadow-2xl relative z-10">
                    <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-6 border ${connStatus === 'error' ? 'bg-red-500/10 border-red-500/20' : 'bg-primary/10 border-primary/20'}`}>
                        {connStatus === 'error' ? <ShieldAlert size={40} className="text-red-500 -rotate-6" /> : <Lock size={40} className="text-primary -rotate-6" />}
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">
                        {connStatus === 'error' ? 'Erreur de Connexion' : 'Google Workspace'}
                    </h2>
                    <p className="text-slate-400 mb-10 leading-relaxed text-sm">
                        {connStatus === 'error' 
                            ? 'Votre jeton de synchronisation est invalide. Veuillez vérifier les Paramètres > Synchronisation Auto ou vous reconnecter.' 
                            : 'Connectez votre compte pour accéder à vos vrais emails, agendas et fichiers Drive. Vous pouvez aussi configurer vos identifiants dans les Paramètres.'}
                    </p>
                    <button 
                        onClick={() => setShowAuth(true)}
                        className={`w-full text-white font-bold py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 ${connStatus === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-primary hover:bg-blue-600 shadow-primary/20'}`}
                    >
                        <Wifi size={20} />
                        {connStatus === 'error' ? 'Réinitialiser la connexion' : 'Se connecter avec Google'}
                    </button>
                </div>

                {showAuth && (
                    <LoginOverlay 
                        onClose={() => setShowAuth(false)} 
                        onSuccess={handleSuccessAuth}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header avec indicateur de vérité */}
            <header className="bg-surface border-b border-slate-700 px-6 py-2 flex items-center justify-between shrink-0 shadow-lg z-20">
                <div className="flex items-center gap-1">
                    {[
                        { id: 'gmail', label: 'Gmail', icon: Mail, color: 'hover:text-red-400', count: newEmailsCount },
                        { id: 'calendar', label: 'Agenda', icon: Calendar, color: 'hover:text-blue-400', count: newEventsCount },
                        { id: 'drive', label: 'Drive', icon: HardDrive, color: 'hover:text-emerald-400', count: newFilesCount },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id as any)}
                            className={`flex items-center gap-3 px-5 py-2.5 rounded-xl text-sm font-bold transition-all relative group
                                ${activeTab === tab.id ? 'bg-slate-800 text-white border border-slate-600 shadow-inner' : `text-slate-500 ${tab.color}`}`}
                        >
                            <div className="relative">
                                <tab.icon size={18} />
                                {tab.count > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] min-w-[16px] h-4 rounded-full flex items-center justify-center animate-bounce shadow-md border border-background">
                                        {tab.count > 9 ? '9+' : tab.count}
                                    </span>
                                )}
                            </div>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    {/* Badge de Statut Réel */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all
                        ${connStatus === 'live' 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.15)]' 
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                        {connStatus === 'live' ? <CheckCircle2 size={12}/> : <AlertTriangle size={12}/>}
                        {connStatus === 'live' ? 'Auto-Sync Actif' : 'Mode Prototype'}
                    </div>
                    
                    <button 
                        onClick={handleManualRefresh}
                        className="p-2.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
                        title="Forcer la synchronisation (utilise les identifiants configurés)"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin text-primary' : ''} />
                    </button>
                </div>
            </header>

            {/* Banner d'avertissement si Mock */}
            {connStatus === 'mock' && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center gap-3 text-amber-500 text-xs font-medium">
                    <AlertTriangle size={14} />
                    <span>L'application utilise des données de démonstration. Configurez la Synchronisation Auto dans Paramètres ou connectez-vous.</span>
                    <button onClick={() => setShowAuth(true)} className="ml-auto underline hover:text-amber-400 transition-colors">Se connecter réellement</button>
                </div>
            )}

            <div className="flex-1 min-h-0 overflow-hidden relative">
                <div className="absolute inset-0">
                    {activeTab === 'gmail' && <MailClient key={`gmail-${connStatus}`} />}
                    {activeTab === 'calendar' && <CalendarClient key={`calendar-${connStatus}`} />}
                    {activeTab === 'drive' && <DriveClient key={`drive-${connStatus}`} />}
                </div>
            </div>

            {showAuth && (
                <LoginOverlay 
                    onClose={() => setShowAuth(false)} 
                    onSuccess={handleSuccessAuth}
                />
            )}
        </div>
    );
};
