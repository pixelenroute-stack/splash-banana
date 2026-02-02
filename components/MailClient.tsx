
import React, { useEffect, useState } from 'react';
import { googleService } from '../services/googleService';
import { EmailMessage } from '../types';
import { Mail, Send, Trash2, Archive, Star, Edit3, Reply, Loader2, X, RefreshCw, AlertTriangle } from 'lucide-react';

export const MailClient: React.FC = () => {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState('INBOX');
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  
  // Compose State
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const CURRENT_USER_ID = "user_1";

  const loadEmails = async () => {
    setLoading(true);
    try {
        const msgs = await googleService.listMessages(CURRENT_USER_ID, selectedLabel);
        setEmails(msgs);
        setSelectedEmail(null);
    } catch (e) {
        console.warn("MailClient load error", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();
  }, [selectedLabel]);

  const handleSync = async () => {
      setIsSyncing(true);
      setSyncError(null);
      try {
          const status = await googleService.getAccountStatus(CURRENT_USER_ID);
          // Utilise l'email des settings ou de l'OAuth
          if (status.connected && status.email) {
              await googleService.triggerN8NSync(CURRENT_USER_ID, status.email);
              await loadEmails();
          } else {
              setSyncError("Aucun compte configuré (Paramètres > Sync Auto ou Connexion).");
          }
      } catch (e: any) {
          console.error(e);
          if (e.name === 'AbortError') {
              setSyncError("Le délai d'attente de synchronisation est dépassé (60s).");
          } else {
              setSyncError("Échec de la synchronisation : " + (e.message || "Erreur inconnue"));
          }
      } finally {
          setIsSyncing(false);
      }
  };

  const handleSend = async () => {
    setLoading(true);
    try {
        await googleService.sendDraft(CURRENT_USER_ID, { to, subject, body });
        setIsComposing(false);
        setTo(''); setSubject(''); setBody('');
        if (selectedLabel === 'SENT') loadEmails();
    } catch (e) {
        alert("Erreur d'envoi");
    } finally {
        setLoading(false);
    }
  };

  const handleArchive = async (msgId: string) => {
      await googleService.modifyMessage(CURRENT_USER_ID, msgId, [], ['INBOX']);
      loadEmails();
  };

  return (
    <div className="h-full flex bg-background overflow-hidden relative">
      {/* 1. Folders Pane */}
      <div className="w-16 md:w-56 flex-shrink-0 bg-surface border-r border-slate-700 flex flex-col">
        <div className="p-4">
            <button 
                onClick={() => setIsComposing(true)}
                className="w-full bg-primary hover:bg-blue-600 text-white rounded-xl p-3 flex items-center justify-center md:justify-start gap-3 shadow-lg transition-all">
                <Edit3 size={20} />
                <span className="hidden md:inline font-bold">Nouveau</span>
            </button>
        </div>
        <nav className="flex-1 space-y-1 p-2">
            {[
                { id: 'INBOX', label: 'Boîte de réception', icon: Mail },
                { id: 'SENT', label: 'Envoyés', icon: Send },
                { id: 'STARRED', label: 'Favoris', icon: Star },
                { id: 'TRASH', label: 'Corbeille', icon: Trash2 },
            ].map(folder => (
                <button
                    key={folder.id}
                    onClick={() => setSelectedLabel(folder.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors
                        ${selectedLabel === folder.id ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                    <folder.icon size={18} />
                    <span className="hidden md:inline">{folder.label}</span>
                </button>
            ))}
        </nav>
      </div>

      {/* 2. List Pane */}
      <div className={`${selectedEmail || isComposing ? 'hidden lg:block' : 'block'} w-full lg:w-96 flex-shrink-0 border-r border-slate-700 bg-background flex flex-col`}>
         <div className="p-4 border-b border-slate-700 flex justify-between items-center">
             <h2 className="font-bold text-white text-lg">{selectedLabel === 'INBOX' ? 'Réception' : selectedLabel}</h2>
             <button 
                onClick={handleSync}
                disabled={isSyncing}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="Synchroniser (N8N)"
             >
                 <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
             </button>
         </div>
         
         {/* Message d'erreur de sync */}
         {syncError && (
             <div className="p-3 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs flex items-start gap-2 relative">
                 <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                 <span className="flex-1">{syncError}</span>
                 <button onClick={() => setSyncError(null)} className="hover:text-white"><X size={14}/></button>
             </div>
         )}

         <div className="flex-1 overflow-y-auto">
             {loading ? <div className="p-8 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2"/>Chargement...</div> : (
                 emails.length === 0 ? <div className="p-8 text-center text-slate-500 text-sm">Aucun message</div> :
                 emails.map(email => (
                     <div 
                        key={email.id} 
                        onClick={() => { setSelectedEmail(email); setIsComposing(false); }}
                        className={`p-4 border-b border-slate-800 cursor-pointer hover:bg-slate-800/50 transition-colors 
                            ${selectedEmail?.id === email.id ? 'bg-slate-800 border-l-4 border-l-primary' : ''}
                            ${!email.isRead ? 'bg-slate-900/40' : ''}`}>
                        <div className="flex justify-between items-start mb-1">
                            <span className={`text-sm truncate max-w-[70%] ${!email.isRead ? 'font-bold text-white' : 'text-slate-300'}`}>
                                {selectedLabel === 'SENT' ? `À: ${email.to}` : email.from}
                            </span>
                            <span className="text-[10px] text-slate-500">{new Date(email.date).toLocaleDateString()}</span>
                        </div>
                        <div className={`text-sm mb-1 truncate ${!email.isRead ? 'font-bold text-slate-200' : 'text-slate-400'}`}>{email.subject}</div>
                        <div className="text-xs text-slate-500 truncate">{email.snippet}</div>
                     </div>
                 ))
             )}
         </div>
      </div>

      {/* 3. Reading / Composing Pane */}
      <div className={`${!selectedEmail && !isComposing ? 'hidden lg:flex' : 'flex'} flex-1 flex-col bg-slate-900/50`}>
         {isComposing ? (
             <div className="flex-1 flex flex-col">
                 <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-surface">
                     <h3 className="font-bold text-white">Nouveau Message</h3>
                     <button onClick={() => setIsComposing(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
                 </div>
                 <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                     <input 
                        className="w-full bg-transparent border-b border-slate-700 p-2 text-white outline-none focus:border-primary placeholder-slate-500"
                        placeholder="À : destinataire@exemple.com"
                        value={to} onChange={e => setTo(e.target.value)}
                     />
                     <input 
                        className="w-full bg-transparent border-b border-slate-700 p-2 text-white outline-none focus:border-primary placeholder-slate-500 font-medium"
                        placeholder="Objet"
                        value={subject} onChange={e => setSubject(e.target.value)}
                     />
                     <textarea 
                        className="w-full h-64 bg-transparent p-2 text-slate-300 outline-none resize-none placeholder-slate-600"
                        placeholder="Écrivez votre message..."
                        value={body} onChange={e => setBody(e.target.value)}
                     />
                 </div>
                 <div className="p-4 border-t border-slate-700 bg-surface flex justify-end gap-3">
                     <button onClick={() => setIsComposing(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Annuler</button>
                     <button 
                        onClick={handleSend} disabled={loading || !to}
                        className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Envoyer
                     </button>
                 </div>
             </div>
         ) : selectedEmail ? (
             <div className="flex-1 flex flex-col h-full overflow-hidden">
                 <div className="p-6 border-b border-slate-700 bg-surface flex justify-between items-start">
                     <div>
                         <h2 className="text-xl font-bold text-white mb-2">{selectedEmail.subject}</h2>
                         <div className="flex items-center gap-2 text-sm">
                             <span className="font-medium text-primary">{selectedEmail.from}</span>
                             <span className="text-slate-500">pour {selectedEmail.to}</span>
                         </div>
                     </div>
                     <div className="flex gap-2">
                         <button onClick={() => handleArchive(selectedEmail.id)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg" title="Archiver"><Archive size={18}/></button>
                         <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg" title="Supprimer"><Trash2 size={18}/></button>
                     </div>
                 </div>
                 <div className="flex-1 p-8 overflow-y-auto bg-background">
                     <div className="prose prose-invert max-w-none text-slate-300" dangerouslySetInnerHTML={{ __html: selectedEmail.body }} />
                 </div>
                 <div className="p-4 border-t border-slate-700 bg-surface">
                     <button onClick={() => setIsComposing(true)} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium">
                         <Reply size={16}/> Répondre
                     </button>
                 </div>
             </div>
         ) : (
             <div className="flex-1 flex items-center justify-center text-slate-500 flex-col gap-4">
                 <Mail size={48} className="opacity-20" />
                 <p>Sélectionnez un email pour le lire</p>
             </div>
         )}
      </div>
    </div>
  );
};
