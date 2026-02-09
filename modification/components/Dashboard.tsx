
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDatabase';
import { googleService } from '../services/googleService';
import { DashboardStats, EmailMessage, CalendarEvent, AuditLog } from '../types';
import { 
    Users, Clock as ClockIcon, Zap, Loader2, LayoutTemplate, RefreshCw, 
    Mail, Calendar as CalIcon, AlertTriangle, Activity, Rocket, ShieldCheck
} from 'lucide-react';

const DigitalClock: React.FC<{ timezone: string }> = ({ timezone }) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const timeString = time.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        timeZone: timezone 
    });
    
    const dateString = time.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long',
        timeZone: timezone 
    });

    return (
        <div className="flex flex-col items-center justify-center animate-in fade-in duration-1000">
            <div className="text-4xl font-bold text-white tracking-widest drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                {timeString}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mt-1">
                {dateString} • {timezone}
            </div>
        </div>
    );
};

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [connStatus, setConnStatus] = useState<'live' | 'mock' | 'error' | 'disconnected'>('disconnected');
  const [recentEmails, setRecentEmails] = useState<EmailMessage[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const settings = db.getSystemSettings();
  const CURRENT_USER_ID = "user_1";

  useEffect(() => {
    loadData();
    // OPTIMISATION: Augmentation de l'intervalle de 5s à 15s pour réduire la charge CPU et réseau
    const interval = setInterval(() => {
        // Ne rafraîchir que si la page est visible
        if (!document.hidden) {
            setStats(db.getStats());
            setRecentActivity(db.getRecentActivity(5));
        }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setStats(db.getStats());
    setRecentActivity(db.getRecentActivity(5));
    
    try {
        const statusRes = await googleService.getAccountStatus(CURRENT_USER_ID);
        setConnStatus(statusRes.status);

        if (statusRes.connected) {
            // Parallel fetch pour réduire le temps d'attente total
            const [emails, events] = await Promise.all([
                googleService.listMessages(CURRENT_USER_ID, 'INBOX'),
                googleService.listEvents(CURRENT_USER_ID, new Date(), new Date())
            ]);
            setRecentEmails(emails.slice(0, 5));
            setUpcomingEvents(events.slice(0, 5));
        }
    } catch (e) {
        setConnStatus('error');
    } finally {
        setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
      setIsSyncing(true);
      await loadData();
      setIsSyncing(false);
  };

  if (!stats) return <div className="p-8 text-slate-400">Chargement du dashboard...</div>;

  const usagePercent = stats.aiTokenLimit > 0 ? (stats.aiTokensUsed / stats.aiTokenLimit) * 100 : 0;
  
  const getTokenStyle = () => {
      if (usagePercent >= 95) return { text: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30', bar: 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' };
      if (usagePercent >= 80) return { text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', bar: 'bg-amber-500' };
      return { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-slate-700', bar: 'bg-emerald-400' };
  };

  const tokenStyle = getTokenStyle();

  const cards = [
    { label: 'Clients Total', value: stats.totalClients, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-slate-700' },
    { label: 'Factures en attente', value: stats.pendingInvoices, icon: ClockIcon, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-slate-700' },
    { 
        label: 'Tokens IA Utilisés', 
        value: stats.aiTokensUsed.toLocaleString(), 
        icon: Zap, 
        color: tokenStyle.text, 
        bg: tokenStyle.bg, 
        border: tokenStyle.border,
        extra: (
            <div className="mt-4 w-full">
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider mb-1">
                    <span className="text-slate-500">Quota Free Tier</span>
                    <span className={tokenStyle.text}>{Math.round(usagePercent)}%</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-1000 ${tokenStyle.bar}`} 
                        style={{ width: `${Math.min(100, usagePercent)}%` }}
                    />
                </div>
                {usagePercent >= 95 && (
                    <div className="mt-2 flex items-center gap-1 text-[9px] text-rose-500 font-bold animate-pulse">
                        <AlertTriangle size={10}/> LIMITE ATTEINTE : CRÉDITS PAYANTS REQUIS
                    </div>
                )}
            </div>
        )
    },
  ];

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto bg-transparent scrollbar-thin">
      
      <div className="flex flex-col items-center justify-center pt-2 pb-6 border-b border-slate-800/50">
          <DigitalClock timezone={settings.timezone} />
      </div>

      <div className="flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Tableau de bord</h1>
            <p className="text-slate-500 text-sm mt-1">Données temps réel de production et pilotage Workspace.</p>
          </div>
          <div className="flex items-center gap-3">
              <button 
                onClick={handleManualSync}
                disabled={isSyncing || isLoading}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-all shadow-lg"
                title="Actualiser les données"
              >
                  <RefreshCw size={20} className={isSyncing || isLoading ? 'animate-spin text-primary' : ''} />
              </button>
              <div className="bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 flex items-center gap-2">
                  <LayoutTemplate size={14}/> Vue d'ensemble
              </div>
          </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
              <div key={idx} className={`bg-surface border ${card.border} rounded-2xl p-6 flex flex-col items-start hover:border-slate-600 transition-all shadow-xl group`}>
                <div className="flex items-start justify-between w-full mb-2">
                    <div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">{card.label}</p>
                        <h3 className={`text-3xl font-bold ${card.value === 0 && card.label !== 'Tokens IA Utilisés' ? 'text-slate-600' : 'text-white'}`}>
                            {card.value}
                        </h3>
                    </div>
                    <div className={`p-4 rounded-xl ${card.bg} border border-white/5 transition-transform group-hover:scale-110`}>
                        <Icon className={card.color} size={24} />
                    </div>
                </div>
                {card.extra}
              </div>
          );
          })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="bg-surface border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[400px]">
              <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/20">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><Mail size={18}/></div>
                      <h2 className="text-lg font-bold text-white">Réception Gmail</h2>
                  </div>
                  {connStatus === 'live' && <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Live</span>}
              </div>

              <div className="flex-1 p-2 space-y-1">
                  {(connStatus === 'disconnected' || connStatus === 'error') ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500"><Loader2 size={32} className="animate-spin-slow"/></div>
                          <p className="text-sm text-slate-400">Synchronisation en attente...</p>
                      </div>
                  ) : isLoading ? (
                      <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-700" size={24}/></div>
                  ) : recentEmails.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">Aucun nouveau message</div>
                  ) : (
                      recentEmails.map(mail => (
                          <div key={mail.id} className="p-4 rounded-2xl hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-700/50 group">
                              <div className="flex justify-between items-start mb-1">
                                  <span className={`text-sm truncate max-w-[70%] ${!mail.isRead ? 'font-bold text-white' : 'text-slate-400'}`}>{mail.from}</span>
                                  <span className="text-[10px] text-slate-500">{new Date(mail.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                              <p className={`text-xs truncate ${!mail.isRead ? 'text-slate-200' : 'text-slate-500'}`}>{mail.subject}</p>
                          </div>
                      ))
                  )}
              </div>
          </div>

          <div className="bg-surface border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[400px]">
              <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/20">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><CalIcon size={18}/></div>
                      <h2 className="text-lg font-bold text-white">À venir (Agenda)</h2>
                  </div>
              </div>

              <div className="flex-1 p-2 space-y-1">
                  {isLoading ? (
                      <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-700" size={24}/></div>
                  ) : upcomingEvents.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">Aucun événement à venir</div>
                  ) : (
                      upcomingEvents.map(event => (
                          <div key={event.id} className="p-4 rounded-2xl hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-700/50 flex items-center gap-4 group">
                              <div className="bg-blue-500/10 px-2 py-1 rounded-lg text-blue-500 text-[10px] font-bold min-w-[50px] text-center">
                                  {event.start ? new Date(event.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Journée'}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-bold text-white truncate">{event.title}</h4>
                                  <p className="text-[10px] text-slate-500 uppercase">{event.start ? new Date(event.start).toLocaleDateString() : 'Aujourd\'hui'}</p>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </div>

      <div className="bg-surface border border-slate-700 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-3">
                <Activity className="text-primary" size={20} /> Activité de l'agence
            </h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <Rocket size={12}/> Monitoring Production
            </div>
          </div>
          
          <div className="space-y-4">
              {recentActivity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 border border-dashed border-slate-800 rounded-2xl">
                      <ShieldCheck size={40} className="text-slate-800" />
                      <div>
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-tight">Système Prêt pour la Production</p>
                        <p className="text-slate-600 text-xs mt-1">Aucune action n'a encore été enregistrée par les administrateurs ou collaborateurs.</p>
                      </div>
                  </div>
              ) : (
                  recentActivity.map((log) => (
                      <div key={log.id} className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800 hover:bg-slate-800/50 transition-all group">
                          <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px] ${
                              log.level === 'error' ? 'bg-rose-500 shadow-rose-500/40' : 
                              log.level === 'warn' ? 'bg-amber-500 shadow-amber-500/40' : 
                              'bg-primary shadow-primary/40'
                          }`}></div>
                          <div className="flex-1">
                            <p className="text-sm text-slate-300">
                                <span className="text-white font-bold">{log.actorName}</span> : {log.action.replace(/_/g, ' ')}
                            </p>
                            {log.metadata && <p className="text-[10px] text-slate-600 font-mono mt-0.5">{JSON.stringify(log.metadata)}</p>}
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                      </div>
                  ))
              )}
          </div>
      </div>
    </div>
  );
};
