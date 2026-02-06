
import React, { useEffect, useState, useRef } from 'react';
import { googleService } from '../services/googleService';
import { CalendarEvent } from '../types';
import { ChevronLeft, ChevronRight, Clock, MapPin, Plus, Calendar as CalIcon, ChevronDown, CheckSquare, CalendarRange, RefreshCw, Loader2 } from 'lucide-react';

interface CalendarClientProps {
    refreshTrigger?: number;
}

export const CalendarClient: React.FC<CalendarClientProps> = ({ refreshTrigger = 0 }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // State pour le menu déroulant "Créer"
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const CURRENT_USER_ID = "user_1";

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay(); // 0 = Sun

  const loadEvents = async () => {
    setLoading(true);
    try {
        // Déclenche le webhook N8N "list_events" et attend les données
        // Charger les événements du mois en cours (1er jour → dernier jour +7j de marge)
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfRange = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
        const evts = await googleService.listEvents(CURRENT_USER_ID, startOfMonth, endOfRange);
        setEvents(evts);
    } catch (e) {
        console.error("Erreur chargement calendrier", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { loadEvents(); }, [refreshTrigger, currentDate]);

  const handleSync = async () => {
      setIsSyncing(true);
      try {
          const status = await googleService.getAccountStatus(CURRENT_USER_ID);
          // Utilise l'email des settings ou de l'OAuth
          if(status.connected && status.email) {
             await googleService.triggerN8NSync(CURRENT_USER_ID, status.email);
             loadEvents();
          } else {
             alert("Aucun compte configuré pour la synchronisation.");
          }
      } catch(e) { console.error(e); }
      setIsSyncing(false);
  };

  // Gestion de la fermeture du menu au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowCreateMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeMonth = (delta: number) => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + delta);
      setCurrentDate(newDate);
  };

  const isSameDay = (d1: Date, d2: Date) => d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

  const getDayEvents = (date: Date) => events.filter(e => {
      const evtDate = new Date(e.start);
      return isSameDay(evtDate, date);
  });

  // --- ACTIONS DE CREATION ---

  const handleCreateEvent = async () => {
      setShowCreateMenu(false);
      const title = prompt("Titre de l'événement ?");
      if(!title) return;
      
      const start = new Date(selectedDate);
      start.setHours(9, 0, 0); // Default 9AM
      
      await googleService.createEvent(CURRENT_USER_ID, {
          title, 
          start: start.toISOString(),
          end: new Date(start.getTime() + 3600000).toISOString(),
          description: "Créé depuis Splash Banana"
      });
      loadEvents();
  };

  const handleCreateTask = async () => {
      setShowCreateMenu(false);
      const title = prompt("Titre de la tâche ?");
      if(!title) return;
      
      // Simulation visuelle d'une tâche (stockée comme un event court avec un préfixe pour le mock)
      const start = new Date(selectedDate);
      start.setHours(10, 0, 0); 
      
      await googleService.createEvent(CURRENT_USER_ID, {
          title: `[Tâche] ${title}`,
          start: start.toISOString(),
          end: new Date(start.getTime() + 1800000).toISOString(), // 30 min
          description: "Tâche Google Tasks (Simulée)"
      });
      loadEvents();
  };

  const handleCreateSchedule = () => {
      setShowCreateMenu(false);
      alert("La fonctionnalité 'Planning des rendez-vous' nécessite un compte Google Workspace Premium ou Individual. (Fonctionnalité à venir)");
  };

  const renderCalendarGrid = () => {
      const totalDays = daysInMonth(currentDate);
      const startPadding = (firstDayOfMonth(currentDate) + 6) % 7; // Shift to start Monday
      const days = [];

      for(let i=0; i<startPadding; i++) days.push(<div key={`pad-${i}`} className="h-24 md:h-32 bg-slate-900/50 border border-slate-800"></div>);
      
      for(let d=1; d<=totalDays; d++) {
          const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
          const dayEvents = getDayEvents(dayDate);
          const isSelected = isSameDay(dayDate, selectedDate);
          const isToday = isSameDay(dayDate, new Date());

          days.push(
              <div 
                key={d} 
                onClick={() => setSelectedDate(dayDate)}
                className={`h-24 md:h-32 border border-slate-800 p-2 cursor-pointer transition-colors relative
                    ${isSelected ? 'bg-slate-800' : 'hover:bg-slate-800/50'}
                    ${isToday ? 'bg-primary/5' : ''}`}>
                  <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full 
                      ${isToday ? 'bg-primary text-white' : 'text-slate-400'}`}>
                      {d}
                  </span>
                  <div className="mt-1 space-y-1 overflow-hidden">
                      {dayEvents.slice(0, 3).map(e => (
                          <div key={e.id} className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1 py-0.5 rounded truncate border-l-2 border-indigo-500">
                              {e.title}
                          </div>
                      ))}
                      {dayEvents.length > 3 && <div className="text-[10px] text-slate-500">+{dayEvents.length - 3} autres</div>}
                  </div>
              </div>
          );
      }
      return days;
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-background overflow-hidden">
      {/* 1. Main Calendar View */}
      <div className="flex-1 flex flex-col h-full border-r border-slate-700">
         <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-surface">
             <div className="flex items-center gap-4">
                 <h2 className="text-2xl font-bold text-white capitalize">
                     {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                 </h2>
                 <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
                     <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-700 rounded text-slate-300"><ChevronLeft size={20}/></button>
                     <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold text-white hover:bg-slate-700 rounded">Auj.</button>
                     <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-700 rounded text-slate-300"><ChevronRight size={20}/></button>
                 </div>
                 {loading && <span className="flex items-center text-xs text-slate-500 gap-1"><Loader2 size={12} className="animate-spin"/> Chargement...</span>}
             </div>
             
             {/* ACTIONS (CREATE + SYNC) */}
             <div className="flex items-center gap-3">
                 <button 
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-colors"
                    title="Synchroniser (N8N)"
                 >
                     <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
                 </button>

                 <div className="relative" ref={menuRef}>
                     <button 
                        onClick={() => setShowCreateMenu(!showCreateMenu)}
                        className="bg-primary hover:bg-blue-600 text-white px-4 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium shadow-lg shadow-primary/20 transition-all active:scale-95"
                     >
                        <Plus size={20} /> 
                        <span className="hidden sm:inline font-bold">Créer</span>
                        <ChevronDown size={16} className={`transition-transform duration-200 ${showCreateMenu ? 'rotate-180' : ''}`} />
                     </button>

                     {showCreateMenu && (
                         <div className="absolute top-full right-0 mt-2 w-64 bg-surface border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                             <div className="p-1 space-y-0.5">
                                 <button 
                                    onClick={handleCreateEvent}
                                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-800 rounded-lg transition-colors group"
                                 >
                                     <CalIcon size={18} className="text-slate-400 group-hover:text-primary"/>
                                     <span className="text-sm text-slate-200 group-hover:text-white">Événement</span>
                                 </button>
                                 
                                 <button 
                                    onClick={handleCreateTask}
                                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-800 rounded-lg transition-colors group"
                                 >
                                     <CheckSquare size={18} className="text-slate-400 group-hover:text-blue-400"/>
                                     <span className="text-sm text-slate-200 group-hover:text-white">Tâche</span>
                                 </button>
                                 
                                 <button 
                                    onClick={handleCreateSchedule}
                                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-800 rounded-lg transition-colors group"
                                 >
                                     <CalendarRange size={18} className="text-slate-400 group-hover:text-purple-400"/>
                                     <span className="text-sm text-slate-200 group-hover:text-white">Planning des rendez-vous</span>
                                 </button>
                             </div>
                         </div>
                     )}
                 </div>
             </div>
         </div>

         {/* Weekday Headers */}
         <div className="grid grid-cols-7 bg-slate-900 border-b border-slate-800">
             {['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'].map(d => (
                 <div key={d} className="py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">{d.slice(0,3)}</div>
             ))}
         </div>

         {/* Days Grid */}
         <div className="grid grid-cols-7 flex-1 overflow-y-auto bg-slate-900">
             {renderCalendarGrid()}
         </div>
      </div>

      {/* 2. Side Agenda (Smartphone style list) */}
      <div className="h-1/3 md:h-full md:w-80 bg-surface flex flex-col border-t md:border-t-0 border-slate-700 shadow-xl z-10">
          <div className="p-4 border-b border-slate-700 bg-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CalIcon size={18} className="text-primary"/> 
                  {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {getDayEvents(selectedDate).length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm">Rien de prévu</div>
              ) : (
                  getDayEvents(selectedDate).map(evt => (
                      <div key={evt.id} className="bg-slate-700/50 p-3 rounded-lg border-l-4 border-indigo-500">
                          <h4 className="font-bold text-white text-sm mb-1">{evt.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                              <Clock size={12}/>
                              {new Date(evt.start).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})} - 
                              {new Date(evt.end).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}
                          </div>
                          {evt.location && (
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                  <MapPin size={12}/> {evt.location}
                              </div>
                          )}
                      </div>
                  ))
              )}
          </div>
      </div>
    </div>
  );
};
