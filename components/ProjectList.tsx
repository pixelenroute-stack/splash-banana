
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDatabase';
import { notionService } from '../services/notionRepository';
import { Project, ProjectStatus, ProjectType } from '../types';
import { 
  FolderKanban, Plus, RefreshCw, Search, ExternalLink, 
  Clock, CheckCircle2, AlertCircle, Film, Link, 
  MoreHorizontal, Trash2, Edit3, Loader2, Database,
  ArrowRight
} from 'lucide-react';

export const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Partial<Project> | null>(null);

  const clients = db.getClients();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      notionService.loadConfig();
      const result = await notionService.syncProjects();
      if (result.data.length > 0) {
        setProjects(result.data);
      } else {
        // Fallback to local
        setProjects(db.getProjects());
      }
    } catch {
      setProjects(db.getProjects());
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNotion = async () => {
    setIsSyncing(true);
    try {
      notionService.clearCache();
      notionService.loadConfig();
      const result = await notionService.syncProjects();
      if (result.data.length > 0) {
        setProjects(result.data);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject?.title || !editingProject?.clientId) return;

    setLoading(true);
    try {
      const client = clients.find(c => c.id === editingProject.clientId);
      const data: Partial<Project> = {
        ...editingProject,
        clientName: client?.name,
      };

      // Write directly to Notion
      const result = await notionService.upsertProjectToNotion(data);
      if (result.success) {
        // Also save locally as backup
        if (editingProject.id) {
          db.updateProject(editingProject.id, { ...data, notionPageId: result.notionPageId });
        } else {
          db.createProject({ ...data, notionPageId: result.notionPageId, createdAt: new Date().toISOString() });
        }
      }

      await loadProjects();
      setShowModal(false);
      setEditingProject(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: ProjectStatus) => {
    switch (status) {
      case 'Terminé': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'En cours': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Montage': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Validation': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'À faire': return 'bg-slate-700/50 text-slate-400 border-slate-700';
      default: return 'bg-slate-800 text-slate-500';
    }
  };

  const filtered = projects.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 h-full overflow-y-auto bg-background scrollbar-thin">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
           <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
               Production
               <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full border border-primary/20 flex items-center gap-1 font-bold uppercase tracking-widest">
                   <Film size={12}/> Notion Projects Link
               </span>
           </h1>
           <p className="text-slate-400 text-sm">Suivi des montages et livraisons clients</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSyncNotion} 
            disabled={isSyncing} 
            className="group flex items-center gap-2 px-5 py-2.5 bg-surface border border-slate-700 rounded-xl text-slate-300 hover:text-white font-bold text-sm transition-all shadow-lg"
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
            Sync Notion
          </button>
          <button onClick={() => { setEditingProject({ status: 'À faire', type: 'Shorts' }); setShowModal(true); }} className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold shadow-xl shadow-primary/20 transition-all active:scale-95">
            <Plus size={18} /> Lancer un projet
          </button>
        </div>
      </div>

      <div className="mb-8 relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input 
          type="text" 
          placeholder="Filtrer par titre ou client..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-surface/50 border border-slate-700 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-surface/30 border border-dashed border-slate-800 rounded-[32px] text-slate-600 italic">
            Aucun projet actif trouvé.
          </div>
        ) : (
          filtered.map(project => (
            <div key={project.id} className="bg-surface border border-slate-800 p-6 rounded-[28px] flex items-center justify-between group hover:border-slate-600 hover:bg-slate-800/20 transition-all shadow-xl relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  project.status === 'Terminé' ? 'bg-green-500' : 
                  project.status === 'En cours' ? 'bg-blue-500' : 'bg-slate-600'}`}></div>
                
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-white">{project.title}</h3>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border tracking-wider uppercase ${getStatusStyle(project.status)}`}>
                            {project.status}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">/ {project.type}</span>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-slate-400">
                        <span className="flex items-center gap-2"><Database size={13} className="text-slate-600"/> {project.clientName}</span>
                        {project.deliveryUrl && (
                            <a href={project.deliveryUrl} target="_blank" className="flex items-center gap-1.5 text-primary hover:underline font-bold">
                                <Link size={13}/> Livraison
                            </a>
                        )}
                        <span className="flex items-center gap-2"><Clock size={13} className="text-slate-600"/> Lancé le {new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingProject(project); setShowModal(true); }} className="p-3 bg-slate-800 hover:bg-primary hover:text-white text-slate-400 rounded-2xl transition-all shadow-lg">
                        <Edit3 size={18} />
                    </button>
                    <button className="p-3 bg-slate-800 hover:bg-red-600 hover:text-white text-slate-400 rounded-2xl transition-all shadow-lg">
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="relative w-full max-w-2xl bg-surface border border-slate-700 rounded-[32px] shadow-2xl animate-in zoom-in duration-200">
                <header className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 rounded-t-[32px]">
                    <div className="flex items-center gap-3 text-white">
                        <div className="p-2 bg-primary/20 rounded-lg text-primary"><FolderKanban size={20}/></div>
                        <h2 className="text-xl font-bold">{editingProject?.id ? 'Modifier Projet' : 'Nouveau Projet Production'}</h2>
                    </div>
                    <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-white transition-colors">Fermer</button>
                </header>

                <form onSubmit={handleSaveProject} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Nom du projet (ex: Montage YouTube #12)</label>
                            <input required type="text" value={editingProject?.title || ''} onChange={e => setEditingProject({...editingProject, title: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-primary outline-none" />
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Client</label>
                            <select required value={editingProject?.clientId || ''} onChange={e => setEditingProject({...editingProject, clientId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:border-primary">
                                <option value="">Choisir un client...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Type de contenu</label>
                            <select value={editingProject?.type || 'Shorts'} onChange={e => setEditingProject({...editingProject, type: e.target.value as ProjectType})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:border-primary">
                                <option value="Shorts">Shorts / Reels</option>
                                <option value="Long-form">Vidéo Longue (YouTube)</option>
                                <option value="Publicité">Publicité (Ads)</option>
                                <option value="TikTok">TikTok Style</option>
                                <option value="Autre">Autre</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Statut Production</label>
                            <select value={editingProject?.status || 'À faire'} onChange={e => setEditingProject({...editingProject, status: e.target.value as ProjectStatus})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:border-primary">
                                <option value="À faire">À faire</option>
                                <option value="En cours">En cours</option>
                                <option value="Montage">Montage</option>
                                <option value="Validation">Validation Client</option>
                                <option value="Terminé">Terminé</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Prix Prestation (€)</label>
                            <input type="number" value={editingProject?.price || ''} onChange={e => setEditingProject({...editingProject, price: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-primary outline-none" />
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Lien Sources (Google Drive / Dropbox)</label>
                            <div className="relative">
                                <Link className="absolute left-3 top-3.5 text-slate-500" size={14}/>
                                <input type="url" value={editingProject?.rawFilesUrl || ''} onChange={e => setEditingProject({...editingProject, rawFilesUrl: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 pl-10 text-sm text-white focus:border-primary outline-none" placeholder="https://..." />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Lien Livraison Finale (WeTransfer / Frame.io)</label>
                            <div className="relative">
                                <ExternalLink className="absolute left-3 top-3.5 text-slate-500" size={14}/>
                                <input type="url" value={editingProject?.deliveryUrl || ''} onChange={e => setEditingProject({...editingProject, deliveryUrl: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 pl-10 text-sm text-white focus:border-primary outline-none" placeholder="https://..." />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Brief / Notes Production</label>
                            <textarea value={editingProject?.comments || ''} onChange={e => setEditingProject({...editingProject, comments: e.target.value})} className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-primary outline-none resize-none" />
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50">
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                        {editingProject?.id ? 'Mettre à jour sur Notion' : 'Lancer le projet'}
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
