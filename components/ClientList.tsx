
import React, { useEffect, useState } from 'react';
import { notionService } from '../services/notionRepository';
import { db } from '../services/mockDatabase';
import { NotionClient } from '../types';
import { 
  Plus as PlusIcon, 
  Trash2 as TrashIcon, 
  RefreshCw as SyncIcon, 
  Search as SearchIcon, 
  Eye as EyeIcon, 
  X as CloseIcon, 
  Building2, 
  User, 
  Mail, 
  MapPin, 
  Youtube, 
  Instagram, 
  Tag, 
  Loader2 as SpinnerIcon, 
  AlertCircle as AlertIcon, 
  CheckCircle2, 
  CloudUpload,
  Cloud,
  ArrowRight
} from 'lucide-react';
import { ClientDetail } from './ClientDetail';
import { useNotification } from '../context/NotificationContext';

export const ClientList: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{msg: string, type: 'success' | 'error' | 'warning' | null}>({msg: '', type: null});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClient, setNewClient] = useState<Partial<NotionClient>>({
      name: '',
      companyName: '',
      email: '',
      leadStatus: 'Lead',
      serviceType: '',
      contactDate: new Date().toISOString().split('T')[0],
      isContacted: false,
      giftSent: false,
      comments: '',
      postalAddress: '',
      youtubeChannel: '',
      instagramAccount: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [orchestrationStep, setOrchestrationStep] = useState<string>('');

  const settings = db.getSystemSettings();
  const { notify } = useNotification();

  const loadClients = async () => {
    setLoading(true);
    try {
        notionService.loadConfig();
        const result = await notionService.syncClients();
        setClients(result.data);
    } catch (e) {
        console.error(e);
        // Fallback to local
        const local = db.getClients();
        setClients(local);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleSync = async () => {
    setLoading(true);
    setSyncStatus({ msg: 'Synchronisation Notion CRM...', type: null });

    try {
        notionService.clearCache();
        notionService.loadConfig();
        const result = await notionService.syncClients();

        if (result.data.length > 0) {
            setClients(result.data);
            setSyncStatus({
                msg: `Notion CRM : ${result.data.length} clients synchronisés.`,
                type: 'success'
            });
        } else {
            setSyncStatus({
                msg: notionService.getStatus().configured
                  ? "Aucun client trouvé dans la base Notion CRM."
                  : "Notion non configuré. Ajoutez votre API Key dans Admin Console > Infrastructure.",
                type: notionService.getStatus().configured ? 'warning' : 'error'
            });
        }
        setTimeout(() => setSyncStatus({ msg: '', type: null }), 6000);
    } catch (e) {
        setSyncStatus({ msg: "Impossible de contacter Notion. Vérifiez la clé API.", type: 'error' });
    } finally {
        setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newClient.name) return;
      
      setIsCreating(true);
      setOrchestrationStep('Validation...');
      
      try {
          setOrchestrationStep('Création dans Notion CRM...');
          const result = await notionService.upsertClientToNotion(newClient);

          if (result.success) {
              setOrchestrationStep('Succès !');
              notify("Client créé dans Notion CRM.", 'success');

              await loadClients();

              setTimeout(() => {
                  setShowCreateModal(false);
                  setIsCreating(false);
                  setOrchestrationStep('');
                  setNewClient({ name: '', companyName: '', email: '', leadStatus: 'Lead', contactDate: new Date().toISOString().split('T')[0] });
              }, 800);
          } else {
              setOrchestrationStep('Erreur');
              notify("Échec de la création dans Notion.", 'error');
              setIsCreating(false);
          }

      } catch (err) {
          console.error("Creation flow error", err);
          notify("Erreur inattendue lors de la création.", 'error');
          setIsCreating(false);
          setOrchestrationStep('');
      }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Archiver ce client ?")) return;
    const client = clients.find(c => c.id === id);
    if (client?.notionPageId) {
      await notionService.archiveClient(client.notionPageId);
    }
    loadClients();
  };

  if (selectedClientId) {
      return <ClientDetail clientId={selectedClientId} onBack={() => setSelectedClientId(null)} />;
  }

  const filtered = clients.filter(c => (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-8 h-full overflow-y-auto bg-background scrollbar-thin">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
           <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
               Clients
               <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-1 rounded-full border border-purple-500/20 flex items-center gap-1 font-bold uppercase tracking-widest">
                   <Cloud size={12}/> {notionService.getStatus().configured ? 'Notion CRM' : 'Local'}
               </span>
           </h1>
           <p className="text-slate-400 text-sm">Gestion des contacts CRM via Notion</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSync} 
            disabled={loading} 
            className={`group flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all font-bold text-sm
                ${loading ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-surface border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 shadow-lg'}`}
          >
            {loading ? <SpinnerIcon size={16} className="animate-spin" /> : <SyncIcon size={16} className="group-hover:rotate-180 transition-transform duration-500" />}
            {loading ? 'Synchronisation...' : 'Sync Notion'}
          </button>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold shadow-xl shadow-primary/20 transition-all active:scale-95">
            <PlusIcon size={18} /> Nouveau contact
          </button>
        </div>
      </div>

      {syncStatus.msg && (
          <div className={`mb-6 p-4 rounded-2xl border flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-300
            ${syncStatus.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 
              syncStatus.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
              syncStatus.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
              'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
              <div className="flex items-center gap-3">
                {syncStatus.type === 'success' ? <CheckCircle2 size={18}/> : syncStatus.type === 'error' ? <AlertIcon size={18}/> : syncStatus.type === 'warning' ? <AlertIcon size={18}/> : <SpinnerIcon size={18} className="animate-spin"/>}
                <span className="text-sm font-medium">{syncStatus.msg}</span>
              </div>
              <button onClick={() => setSyncStatus({msg: '', type: null})} className="opacity-50 hover:opacity-100"><CloseIcon size={14}/></button>
          </div>
      )}

      <div className="mb-8 relative max-w-2xl">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input 
          type="text" 
          placeholder="Rechercher un client ou une prestation..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-surface/50 border border-slate-700 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 pb-20">
        {loading && clients.length === 0 ? (
            <div className="text-center py-20 text-slate-500 flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                <p className="font-medium animate-pulse">Chargement de la base de données...</p>
            </div>
        ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-surface/30 border border-dashed border-slate-800 rounded-[32px] text-slate-600 italic">
                {searchTerm ? 'Aucun résultat pour cette recherche.' : 'Votre base de clients est vide.'}
            </div>
        ) : (
         filtered.map(client => (
          <div key={client.id} className="bg-surface border border-slate-800 p-6 rounded-[28px] flex items-center justify-between group hover:border-slate-600 hover:bg-slate-800/20 transition-all shadow-xl relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${client.leadStatus === 'Signé' ? 'bg-green-500' : client.leadStatus === 'Perdu' ? 'bg-red-500' : 'bg-amber-500'}`}></div>

            <div className="flex-1 cursor-pointer" onClick={() => setSelectedClientId(client.id)}>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{client.name}</h3>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border tracking-wider uppercase
                    ${client.leadStatus === 'Signé' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      client.leadStatus === 'Perdu' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                    {client.leadStatus || 'LEAD'}
                </span>
                {client.notionUrl && (
                  <a href={client.notionUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[8px] font-bold text-purple-400/60 hover:text-purple-300 uppercase tracking-tighter">
                     Notion
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <p className="text-slate-400 text-xs flex items-center gap-2 truncate">
                      <Building2 size={13} className="text-slate-600"/> {client.companyName || 'Indépendant'}
                  </p>
                  <p className="text-slate-400 text-xs flex items-center gap-2 truncate">
                      <Tag size={13} className="text-slate-600"/> {client.serviceType || '—'}
                  </p>
                  <p className="text-slate-400 text-xs flex items-center gap-2 truncate">
                      <Mail size={13} className="text-slate-600"/> {client.email || '—'}
                  </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
               <div className="hidden lg:flex flex-col items-end text-[10px] text-slate-600 font-mono">
                   <span>LAST SYNC: {new Date(client.lastSyncedAt || Date.now()).toLocaleDateString()}</span>
               </div>
               <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={(e) => { e.stopPropagation(); setSelectedClientId(client.id); }} className="p-3 bg-slate-800 hover:bg-primary hover:text-white text-slate-400 rounded-2xl transition-all shadow-lg">
                     <EyeIcon size={18} />
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }} className="p-3 bg-slate-800 hover:bg-red-600 hover:text-white text-slate-400 rounded-2xl transition-all shadow-lg">
                     <TrashIcon size={18} />
                   </button>
               </div>
            </div>
          </div>
        )))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="relative w-full max-w-4xl bg-surface border border-slate-700 rounded-[32px] shadow-2xl animate-in fade-in zoom-in duration-200">
                <header className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 rounded-t-[32px]">
                    <div className="flex items-center gap-3 text-white">
                        <div className="p-2 bg-primary/20 rounded-lg text-primary"><User size={20}/></div>
                        <h2 className="text-xl font-bold">Nouveau Contact CRM</h2>
                    </div>
                    <button onClick={() => !isCreating && setShowCreateModal(false)} className="p-2 text-slate-400 hover:text-white transition-colors"><CloseIcon size={24}/></button>
                </header>
                
                <form onSubmit={handleCreateClient} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto scrollbar-thin">
                    {/* ... (Form fields remain same) ... */}
                    <div className="space-y-6">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <User size={14}/> Identité & Contact
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Nom du contact <span className="text-rose-500">*</span></label>
                                <input required type="text" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-primary outline-none" placeholder="Ex: Jean Martin" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Entreprise</label>
                                <input type="text" value={newClient.companyName} onChange={e => setNewClient({...newClient, companyName: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-primary outline-none" placeholder="Ex: Agence Pixel" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Email</label>
                                <input type="email" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-primary outline-none" placeholder="jean@exemple.com" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Adresse Postale</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 text-slate-500" size={16}/>
                                    <textarea value={newClient.postalAddress} onChange={e => setNewClient({...newClient, postalAddress: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 pl-10 text-sm text-white focus:border-primary outline-none h-20 resize-none" placeholder="Rue, Ville, CP..." />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Tag size={14}/> Suivi Prestation
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Statut Lead</label>
                                    <select value={newClient.leadStatus} onChange={e => setNewClient({...newClient, leadStatus: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:border-primary">
                                        <option value="Lead">Lead (Prospect)</option>
                                        <option value="Signé">Signé (Client)</option>
                                        <option value="Perdu">Perdu</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Date Contact</label>
                                    <input type="date" value={newClient.contactDate} onChange={e => setNewClient({...newClient, contactDate: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-primary outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Type de prestation</label>
                                <input type="text" value={newClient.serviceType} onChange={e => setNewClient({...newClient, serviceType: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-primary outline-none" placeholder="Ex: Montage Shorts 30j" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Chaîne YouTube</label>
                                    <div className="relative">
                                        <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" size={16}/>
                                        <input type="text" value={newClient.youtubeChannel} onChange={e => setNewClient({...newClient, youtubeChannel: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 pl-10 text-xs text-white outline-none focus:border-primary" placeholder="@channel" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Instagram</label>
                                    <div className="relative">
                                        <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-500" size={16}/>
                                        <input type="text" value={newClient.instagramAccount} onChange={e => setNewClient({...newClient, instagramAccount: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 pl-10 text-xs text-white outline-none focus:border-primary" placeholder="@user" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Commentaires / Notes privées</label>
                        <textarea value={newClient.comments} onChange={e => setNewClient({...newClient, comments: e.target.value})} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-2xl p-4 text-sm text-white focus:border-primary outline-none resize-none" placeholder="Détails du projet, ton de voix, urgence..." />
                    </div>
                </form>

                <footer className="p-8 border-t border-slate-700 flex justify-between items-center bg-slate-800/30 rounded-b-[32px]">
                    <div className="flex items-center gap-3">
                        {isCreating && (
                            <div className="flex items-center gap-2 text-primary animate-pulse">
                                <CloudUpload size={18} className="animate-bounce" />
                                <span className="text-xs font-bold uppercase tracking-wider">{orchestrationStep}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <button type="button" disabled={isCreating} onClick={() => setShowCreateModal(false)} className="px-6 py-3 text-slate-400 hover:text-white font-bold transition-all disabled:opacity-50">Annuler</button>
                        <button 
                            onClick={handleCreateClient}
                            disabled={isCreating || !newClient.name}
                            className="flex items-center gap-2 bg-primary hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-10 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-primary/20 active:scale-95"
                        >
                            {isCreating ? <SpinnerIcon size={18} className="animate-spin"/> : <ArrowRight size={18}/>}
                            {isCreating ? 'Traitement...' : 'Ajouter et Synchroniser'}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
      )}
    </div>
  );
};
