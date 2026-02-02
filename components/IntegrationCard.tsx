import React, { ReactNode } from 'react';
import { 
  CheckCircle, AlertTriangle, Loader2, Plug, Trash2, 
  ToggleLeft, ToggleRight, Settings, ExternalLink
} from 'lucide-react';
import { IntegrationState } from '../types';

interface IntegrationCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  state?: IntegrationState;
  
  // Actions
  onToggleOverride?: () => void;
  onTest?: () => void;
  onDisconnect?: () => void;
  
  // UI State
  isProcessing?: boolean;
  canOverride?: boolean;
  
  // Form Content (if override is active)
  children?: ReactNode;
  
  // Footer content (optional links, etc)
  footer?: ReactNode;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  title, description, icon, state,
  onToggleOverride, onTest, onDisconnect,
  isProcessing, canOverride = true,
  children, footer
}) => {
  
  const isConnected = state?.configured;
  const isError = state?.lastTestStatus === 'error';
  const isSuccess = state?.lastTestStatus === 'success';

  return (
    <div className="bg-surface border border-slate-700 rounded-xl p-6 transition-all hover:border-slate-600">
      
      {/* HEADER */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-white shrink-0">
               {icon}
           </div>
           <div>
               <h3 className="font-bold text-white text-lg">{title}</h3>
               <p className="text-sm text-slate-400">{description}</p>
               
               {/* Status Badge */}
               <div className="flex items-center gap-2 mt-2">
                   {state?.source !== 'none' && (
                       <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border
                           ${state?.source === 'user' ? 'bg-primary/10 text-primary border-primary/20' : 
                             state?.source === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                             'bg-slate-700 text-slate-400 border-slate-600'}`}>
                           Source: {state?.source}
                       </span>
                   )}
                   
                   {isConnected && !isError && (
                       <span className="flex items-center gap-1 text-[10px] text-green-400 font-medium">
                           <CheckCircle size={12}/> Connecté
                       </span>
                   )}
                   {isError && (
                       <span className="flex items-center gap-1 text-[10px] text-red-400 font-medium" title={state?.lastErrorMessage}>
                           <AlertTriangle size={12}/> Erreur
                       </span>
                   )}
                   {state?.lastTestedAt && (
                       <span className="text-[10px] text-slate-600">
                           Testé: {new Date(state.lastTestedAt).toLocaleTimeString()}
                       </span>
                   )}
               </div>
           </div>
        </div>

        {/* TOP ACTIONS */}
        <div className="flex flex-col items-end gap-2">
            {canOverride && (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Override</span>
                    <button onClick={onToggleOverride} className="text-primary hover:text-blue-400 transition-colors">
                        {state?.isOverridden ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-slate-600"/>}
                    </button>
                </div>
            )}
            
            <div className="flex items-center gap-2 mt-1">
                {isConnected && (
                    <button 
                        onClick={onTest}
                        disabled={isProcessing}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title="Tester la connexion"
                    >
                        {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <Plug size={16}/>}
                    </button>
                )}
                
                {/* Delete/Disconnect Button */}
                {(state?.source === 'user') && (
                    <button 
                        onClick={onDisconnect}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Déconnecter / Supprimer la configuration"
                    >
                        <Trash2 size={16}/>
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* BODY (CONFIG FORM) */}
      {state?.isOverridden && (
          <div className="bg-slate-900/50 p-5 rounded-lg border-l-2 border-primary animate-in fade-in slide-in-from-top-2 duration-200">
               <div className="mb-4 flex items-center gap-2 text-primary">
                   <Settings size={14}/>
                   <span className="text-xs font-bold uppercase">Configuration Personnelle</span>
               </div>
               <div className="space-y-4">
                   {children}
               </div>
          </div>
      )}

      {/* READ ONLY INFO IF ADMIN SOURCE */}
      {!state?.isOverridden && state?.source === 'admin' && (
          <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50 flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded text-purple-400"><Settings size={16}/></div>
              <div className="text-xs text-slate-400">
                  Cette intégration utilise la configuration globale définie par l'administrateur.
              </div>
          </div>
      )}

      {/* FOOTER */}
      {footer && (
          <div className="mt-4 pt-4 border-t border-slate-800">
              {footer}
          </div>
      )}

      {/* ERROR MESSAGE DISPLAY */}
      {isError && state?.lastErrorMessage && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-300 flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0"/>
              {state.lastErrorMessage}
          </div>
      )}
    </div>
  );
};