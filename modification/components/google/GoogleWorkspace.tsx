
import React, { useState, useEffect } from 'react';
import { MailClient } from '../MailClient';
import { CalendarClient } from '../CalendarClient';
import { DriveClient } from '../DriveClient';
import { googleService } from '../../services/googleService';
import { googleSyncService } from '../../services/googleSyncService';
import { Mail, Calendar, HardDrive, RefreshCw, Zap, Activity } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { db } from '../../services/mockDatabase';

export const GoogleWorkspace: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'gmail' | 'calendar' | 'drive'>('gmail');
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Ce compteur sert de signal pour forcer les enfants à recharger les données depuis N8N
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    
    // Notifications Counters
    const [newEmailsCount, setNewEmailsCount] = useState(0);
    const [newEventsCount, setNewEventsCount] = useState(0);
    const [newFilesCount, setNewFilesCount] = useState(0);

    const { notify } = useNotification();
    
    // Vérification de la configuration N8N
    const settings = db.getSystemSettings();
    const webhookConfig = settings.webhooks?.google_workspace;
    const isWebhookActive = webhookConfig && webhookConfig.enabled && webhookConfig.url && webhookConfig.url.length > 5;

    const USER_ID = "user_1";

    // Abonnement à la synchronisation automatique
    useEffect(() => {
        // Démarrer le polling (qui respectera désormais les 1h d'intervalle)
        googleSyncService.startPolling(USER_ID);

        // S'abonner aux mises à jour
        const unsubscribe = googleSyncService.subscribe((service, data) => {
            if (service === 'gmail') {
                const count = Array.isArray(data) ? data.length : 1;
                setNewEmailsCount(prev => prev + count);
                notify(`📧 ${count} nouvel(s) email(s) reçu(s)`, 'info');
            } else if (service === 'calendar') {
                setNewEventsCount(prev => prev + 1);
                notify(`📅 Calendrier mis à jour`, 'info');
            } else if (service === 'drive') {
                setNewFilesCount(prev => prev + 1);
                notify(`📁 Fichiers Drive mis à jour`, 'info');
            }
        });

        return () => {
            unsubscribe();
            // On ne stoppe pas forcément le polling ici si on veut qu'il continue en background
            // Mais pour une SPA, c'est mieux de nettoyer si le composant est démonté
            googleSyncService.stopPolling();
        };
    }, []);

    const handleTabChange = (tab: 'gmail' | 'calendar' | 'drive') => {
        setActiveTab(tab);
        // Reset counters on view
        if (tab === 'gmail') setNewEmailsCount(0);
        if (tab === 'calendar') setNewEventsCount(0);
        if (tab === 'drive') setNewFilesCount(0);
    };

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        notify("Actualisation et synchronisation...", "loading");
        
        // 1. On invalide le cache pour forcer l'appel API/Webhook
        googleService.invalidateCache();
        
        // 2. On notifie le service de background qu'on vient de faire une action manuelle
        // Cela permet de reset les timers (pour ne pas re-poller dans 1min si on vient de le faire)
        await googleSyncService.triggerManualSync();
        
        // 3. On déclenche le rechargement immédiat dans les composants enfants (UI)
        setRefreshTrigger(prev => prev + 1);

        setTimeout(() => {
            setIsRefreshing(false);
            notify("Données à jour.", "success");
        }, 800);
    };

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
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
                    {/* Badge de Statut N8N */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all
                        ${isWebhookActive 
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.15)]' 
                            : 'bg-slate-800/50 text-slate-500 border-slate-700'}`}>
                        {isWebhookActive ? <Zap size={12}/> : <Activity size={12}/>}
                        {isWebhookActive ? 'N8N Workflow Actif' : 'Mode Simulation'}
                    </div>
                    
                    <button 
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        className="p-2.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
                        title="Synchroniser maintenant"
                    >
                        <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-primary' : ''} />
                    </button>
                </div>
            </header>

            <div className="flex-1 min-h-0 overflow-hidden relative">
                <div className="absolute inset-0">
                    {/* On passe le refreshTrigger aux enfants pour qu'ils sachent quand recharger */}
                    {activeTab === 'gmail' && <MailClient key={`gmail-view`} refreshTrigger={refreshTrigger} />}
                    {activeTab === 'calendar' && <CalendarClient key={`calendar-view`} refreshTrigger={refreshTrigger} />}
                    {activeTab === 'drive' && <DriveClient key={`drive-view`} refreshTrigger={refreshTrigger} />}
                </div>
            </div>
        </div>
    );
};
