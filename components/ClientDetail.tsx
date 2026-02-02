
import React, { useEffect, useState } from 'react';
import { NotionClient, Project } from '../types';
import { db } from '../services/mockDatabase';
import { sheetsService } from '../services/sheetsRepository'; // Changed from Notion
import { 
  ArrowLeft, ExternalLink, Mail, MapPin, Youtube, Instagram, 
  Building2, MessageSquare, Tag, RefreshCw,
  FolderKanban, Plus, Clock, FileSpreadsheet
} from 'lucide-react';

interface ClientDetailProps {
  clientId: string; 
  onBack: () => void;
}

export const ClientDetail: React.FC<ClientDetailProps> = ({ clientId, onBack }) => {
  const [client, setClient] = useState<NotionClient | undefined>(undefined);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'projects'>('info');

  const settings = db.getSystemSettings();

  useEffect(() => {
    let found = db.getClientById(clientId);
    if (!found) {
        found = db.getClients().find(c => c.notionPageId === clientId);
    }
    setClient(found);
    if (found) {
        setProjects(db.getProjectsByClientId(found.id));
    }
  }, [clientId]);

  const handleSync = async () => {
      setLoading(true);
      await sheetsService.fetchClients();
      let found = db.getClientById(clientId);
      setClient(found);
      setLoading(false);
  };

  const openSheet = () => {
      if (settings.clients.spreadsheetId) {
          window.open(`https://docs.google.com/spreadsheets/d/${settings.clients.spreadsheetId}`, '_blank');
      }
  };

  if (!client) {
      return (
          <div className="p-8 text-center">
              <p className="text-slate-400 mb-4">Client introuvable.</p>
              <button onClick={onBack} className="text-primary hover:underline">Retour à la liste</button>
          </div>
      );
  }

  return (
    <div className="p-8 h-full overflow-y-auto bg-background scrollbar-thin">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-3 bg-slate-800/50 hover:bg-slate-700 rounded-2xl text-slate-400 hover:text-white transition-all">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    {client.name}
                    {client.isArchived && <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-1 rounded border border-red-500/20">ARCHIVÉ</span>}
                </h1>
                <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                    {client.spreadsheetRow && <span className="font-mono text-xs opacity-50">Ligne #{client.spreadsheetRow}</span>}
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider 
                      ${client.leadStatus === 'Signé' ? 'bg-green-500/20 text-green-400' : 
                        client.leadStatus === 'Perdu' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {client.leadStatus || 'LEAD'}
                    </span>
                </div>
            </div>
        </div>
        <div className="flex gap-2">
            <button onClick={handleSync} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 bg-surface hover:bg-slate-800 text-slate-300 rounded-xl text-sm font-bold border border-slate-700 transition-all">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Sync
            </button>
            {settings.clients.spreadsheetId && (
                <button onClick={openSheet} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold shadow-lg transition-all">
                    <FileSpreadsheet size={16} />
                    Ouvrir Sheet
                </button>
            )}
        </div>
      </div>

      {/* TABS Navigation */}
      <div className="flex gap-6 border-b border-slate-800 mb-8 px-2">
          <button 
            onClick={() => setActiveTab('info')}
            className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'info' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
          >
              Informations & CRM
              {activeTab === 'info' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('projects')}
            className={`pb-4 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'projects' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
          >
              Projets Production
              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{projects.length}</span>
              {activeTab === 'projects' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
      </div>

      {activeTab === 'info' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                {/* IDENTITY CARD */}
                <div className="bg-surface border border-slate-800 rounded-[32px] p-8 shadow-xl">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-3">
                        <Building2 size={20} className="text-primary" /> Détails de contact
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Entreprise / Marque</label>
                                <p className="text-white font-medium">{client.companyName || 'Indépendant'}</p>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">E-mail Professionnel</label>
                                <div className="flex items-center gap-2 text-white">
                                    <Mail size={14} className="text-slate-600" />
                                    {client.email ? (
                                        <a href={`mailto:${client.email}`} className="hover:text-primary transition-colors">{client.email}</a>
                                    ) : <span className="text-slate-600 italic">Non spécifié</span>}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Adresse de facturation</label>
                            <div className="flex items-start gap-2 text-white leading-relaxed">
                                <MapPin size={14} className="text-slate-600 mt-1 shrink-0" />
                                <span>{client.postalAddress || '—'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SOCIALS */}
                <div className="bg-surface border border-slate-800 rounded-[32px] p-8 shadow-xl">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-3">
                        <ExternalLink size={20} className="text-primary" /> Canaux digitaux
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-red-500/10 rounded-xl text-red-500"><Youtube size={20} /></div>
                                <span className="text-sm text-slate-200">YouTube</span>
                            </div>
                            {client.youtubeChannel ? <span className="text-xs text-primary">{client.youtubeChannel}</span> : <span className="text-xs text-slate-600">—</span>}
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-pink-500/10 rounded-xl text-pink-500"><Instagram size={20} /></div>
                                <span className="text-sm text-slate-200">Instagram</span>
                            </div>
                            {client.instagramAccount ? <span className="text-xs text-primary">{client.instagramAccount}</span> : <span className="text-xs text-slate-600">—</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {/* CRM STATUS */}
                <div className="bg-surface border border-slate-800 rounded-[32px] p-8 shadow-xl">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-3">
                        <Tag size={20} className="text-primary" /> Suivi Commercial
                    </h3>
                    <div className="space-y-6">
                        <div className="flex justify-between items-center py-3 border-b border-slate-800">
                            <span className="text-sm text-slate-400">Prestation</span>
                            <span className="text-white font-bold text-xs">{client.serviceType || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-slate-800">
                            <span className="text-sm text-slate-400">Prospecté ?</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${client.isContacted ? 'bg-green-500/10 text-green-400' : 'text-slate-500'}`}>{client.isContacted ? 'OUI' : 'NON'}</span>
                        </div>
                        <div className="pt-2">
                           <label className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-2 mb-3">
                               <MessageSquare size={12} /> Notes & Commentaires
                           </label>
                           <div className="bg-slate-900/80 p-4 rounded-2xl text-xs text-slate-300 leading-relaxed border border-slate-800">
                               {client.comments || 'Aucun commentaire enregistré.'}
                           </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-bold text-lg flex items-center gap-3">
                    <FolderKanban size={20} className="text-primary" /> Projets liés
                </h3>
                <button 
                  onClick={() => window.location.hash = '#projects'}
                  className="flex items-center gap-2 text-primary hover:text-blue-400 text-xs font-bold uppercase transition-colors"
                >
                    <Plus size={14} /> Créer un nouveau montage
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.length === 0 ? (
                    <div className="col-span-full py-16 text-center bg-surface/30 border border-dashed border-slate-800 rounded-[40px] space-y-4">
                        <Clock size={40} className="text-slate-800 mx-auto" />
                        <p className="text-slate-500 text-sm">Aucun projet n'a encore été lancé pour ce client.</p>
                    </div>
                ) : (
                    projects.map(project => (
                        <div key={project.id} className="bg-surface border border-slate-800 p-6 rounded-[24px] hover:border-slate-600 transition-all group shadow-lg">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-white mb-1">{project.title}</h4>
                                    <span className="text-[10px] text-slate-500 font-medium">{project.type}</span>
                                </div>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter border ${
                                    project.status === 'Terminé' ? 'border-green-500/20 text-green-400' : 'border-blue-500/20 text-blue-400'
                                }`}>
                                    {project.status}
                                </span>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                                <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                    <Clock size={12}/> {new Date(project.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      )}
    </div>
  );
};
