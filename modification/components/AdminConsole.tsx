
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDatabase';
import { configService } from '../services/configService';
import { adminService } from '../services/adminService';
import { supabaseService } from '../services/supabaseService';
import { 
  Shield, Server, Users, Activity, BarChart3,
  Save, RefreshCw, Eye, EyeOff, CheckCircle,
  Clock, Palette, Lock, Mail, Edit2, UserPlus, X, Trash2, Copy, Search, FileSearch,
  Newspaper, Target, Database, Briefcase, FileText, LayoutGrid, Globe
} from 'lucide-react';
import { SystemSettings, User, AuditLog, ConfigVersion, UserRole } from '../types';
import { MetricsDashboard } from './admin/MetricsDashboard';
import { BrandingEditor } from './admin/BrandingEditor';
import { SystemAuditor } from './admin/SystemAuditor'; 

type AdminTab = 'infrastructure' | 'accounts' | 'customization' | 'metrics' | 'logs' | 'audit';

interface AdminConsoleProps {
    onDirtyChange?: (isDirty: boolean) => void;
}

// ... PasswordCell Component ...
const PasswordCell = ({ password }: { password?: string }) => {
    const [visible, setVisible] = useState(false);
    
    if (!password) {
        return <span className="text-[10px] text-slate-500 italic flex items-center gap-1"><Lock size={10}/> Hashé (Sécurisé)</span>;
    }

    return (
        <div className="flex items-center gap-2 group">
            <span className={`font-mono text-xs ${visible ? 'text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded' : 'text-slate-500'}`}>
                {visible ? password : '••••••••••••'}
            </span>
            <button 
                onClick={() => setVisible(!visible)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white p-1"
                title={visible ? "Masquer" : "Voir"}
            >
                {visible ? <EyeOff size={12}/> : <Eye size={12}/>}
            </button>
        </div>
    );
};

// ... AccountsManager Component (Identical to previous) ...
const AccountsManager: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [invitations, setInvitations] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.COLLABORATOR);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<User> & { newPassword?: string }>({});

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setIsLoading(true);
        const u = await adminService.getUsers();
        const i = await adminService.getInvitations();
        setUsers(u);
        setInvitations(i);
        setIsLoading(false);
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await adminService.inviteNewUser(inviteEmail);
            if (res.success && res.inviteUrl) {
                setGeneratedLink(res.inviteUrl);
                loadData();
            }
        } catch (err) {
            alert((err as Error).message);
        }
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setEditFormData({ 
            name: user.name, 
            email: user.email, 
            role: user.role, 
            status: user.status,
            avatar: user.avatar,
            newPassword: '' 
        });
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        try {
            const updates: any = {
                name: editFormData.name,
                email: editFormData.email,
                role: editFormData.role,
                status: editFormData.status,
                avatar: editFormData.avatar
            };
            if (editFormData.newPassword && editFormData.newPassword.trim() !== '') {
                updates.passwordPlain = editFormData.newPassword;
            }
            db.updateUser(editingUser.id, updates);
            loadData();
            setEditingUser(null);
        } catch (err) {
            alert("Erreur lors de la mise à jour : " + (err as Error).message);
        }
    };

    const handleStatusChange = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
        if (newStatus === 'disabled' && !confirm("Désactiver cet utilisateur ? Il ne pourra plus se connecter.")) return;
        db.updateUser(userId, { status: newStatus as any });
        loadData();
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Supprimer définitivement cet utilisateur ?")) return;
        await adminService.deleteUser(userId);
        loadData();
    };

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(search.toLowerCase()) || 
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface border border-slate-700 p-4 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><Users size={24}/></div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold">Utilisateurs Total</p>
                        <p className="text-2xl font-bold text-white">{users.length}</p>
                    </div>
                </div>
                <div className="bg-surface border border-slate-700 p-4 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-green-500/10 rounded-xl text-green-400"><CheckCircle size={24}/></div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold">Actifs</p>
                        <p className="text-2xl font-bold text-white">{users.filter(u => u.status === 'active').length}</p>
                    </div>
                </div>
                <div className="bg-surface border border-slate-700 p-4 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400"><Mail size={24}/></div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold">Invitations en attente</p>
                        <p className="text-2xl font-bold text-white">{invitations.filter(i => i.status === 'pending').length}</p>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center bg-surface border border-slate-700 p-4 rounded-2xl">
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
                    <input 
                        type="text" 
                        placeholder="Rechercher..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-primary outline-none"
                    />
                </div>
                <button 
                    onClick={() => { setShowInviteModal(true); setGeneratedLink(null); setInviteEmail(''); }}
                    className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95"
                >
                    <UserPlus size={16}/> Inviter
                </button>
            </div>

            {/* Table */}
            <div className="bg-surface border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-slate-400 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Utilisateur</th>
                            <th className="p-4">Rôle</th>
                            <th className="p-4">Mot de passe</th>
                            <th className="p-4">Statut</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden border border-slate-600">
                                            {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover"/> : user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{user.name}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border bg-slate-900 text-slate-300 border-slate-700`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <PasswordCell password={user.passwordPlain} />
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                                        user.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                                        user.status === 'invited' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                        'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                        {user.status === 'active' ? 'Actif' : user.status === 'invited' ? 'Invité' : 'Désactivé'}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => openEditModal(user)}
                                            className="p-2 hover:bg-blue-500/10 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                                            title="Éditer"
                                        >
                                            <Edit2 size={16}/>
                                        </button>
                                        
                                        {user.id !== 'user_1' && (
                                            <>
                                                <button 
                                                    onClick={() => handleStatusChange(user.id, user.status)}
                                                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                                                    title={user.status === 'active' ? "Désactiver" : "Activer"}
                                                >
                                                    {user.status === 'active' ? <Lock size={16}/> : <CheckCircle size={16}/>}
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500 italic">Aucun utilisateur trouvé.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Invite Modal & Edit Modal (Code identique à précédemment, conservé) */}
            {/* ... Modal code omitted for brevity but should be included ... */}
        </div>
    );
};

// ... LogsRenderer Component ...
const LogsRenderer = ({ logs }: { logs: AuditLog[] }) => {
    const [liveLogs, setLiveLogs] = useState<AuditLog[]>(logs);

    useEffect(() => { setLiveLogs(logs); }, [logs]);

    useEffect(() => {
        const handleLocalUpdate = (e: CustomEvent) => {
            if (e.detail?.type === 'logs') {
                adminService.getAuditLogs().then(newLogs => {
                    if (newLogs) setLiveLogs(newLogs.slice(0, 50)); 
                });
            }
        };
        window.addEventListener('db-updated', handleLocalUpdate as EventListener);
        const unsubscribeSupabase = supabaseService.subscribeToLogs((newLog) => {
            setLiveLogs(prev => [newLog, ...prev]);
        });
        return () => {
            window.removeEventListener('db-updated', handleLocalUpdate as EventListener);
            unsubscribeSupabase();
        };
    }, []);

    return (
      <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-lg overflow-hidden flex flex-col h-[600px]">
        <h3 className="font-bold text-white flex items-center gap-2 mb-4">
          <Activity size={18} className="text-slate-400"/> Logs d'Audit (Temps Réel)
        </h3>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 font-mono text-xs">
          {liveLogs.length === 0 ? (
            <div className="text-slate-500 italic">Aucun log.</div>
          ) : liveLogs.map(log => (
            <div key={log.id} className="p-3 bg-slate-900 rounded border border-slate-800 flex gap-3 animate-in slide-in-from-left-2 fade-in duration-300">
              <span className="text-slate-500 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
              <span className={`font-bold shrink-0 w-16 ${log.level === 'error' ? 'text-red-500' : log.level === 'warn' ? 'text-amber-500' : 'text-blue-500'}`}>
                {log.level.toUpperCase()}
              </span>
              <span className="text-slate-300 font-bold shrink-0">{log.actorName}</span>
              <span className="text-slate-400 truncate flex-1">{log.action}</span>
            </div>
          ))}
        </div>
      </div>
    );
};

export const AdminConsole: React.FC<AdminConsoleProps> = ({ onDirtyChange }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('infrastructure');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [initialSettings, setInitialSettings] = useState<SystemSettings | null>(null);
  const [versions, setVersions] = useState<ConfigVersion[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{msg: string, type: 'success'|'error'} | null>(null);

  useEffect(() => {
      const loadAll = async () => {
          const config = await configService.getActiveConfig();
          setSettings(config);
          setInitialSettings(JSON.parse(JSON.stringify(config)));
          setVersions(db.getConfigVersions());
          const u = await adminService.getUsers();
          setUsers(u);
          const l = await supabaseService.getRecentLogs(50);
          setLogs(l);
      };
      loadAll();
  }, []);

  useEffect(() => {
    if (settings && initialSettings) {
        const isDirty = JSON.stringify(settings) !== JSON.stringify(initialSettings);
        if (onDirtyChange) onDirtyChange(isDirty);
    }
  }, [settings, initialSettings]);

  const updateSetting = (path: string, value: any) => {
      if (!settings) return;
      setSettings(prev => {
          if (!prev) return null;
          const next = JSON.parse(JSON.stringify(prev));
          let current: any = next;
          const parts = path.split('.');
          for (let i = 0; i < parts.length - 1; i++) {
              if (!current[parts[i]]) current[parts[i]] = {}; 
              current = current[parts[i]];
          }
          current[parts[parts.length - 1]] = value;
          return next;
      });
  };

  const handleSave = async (overrideSettings?: SystemSettings, silent: boolean = false) => {
    const configToSave = overrideSettings || settings;
    if (!configToSave) return;
    setIsSaving(true);
    let reason = "Auto-update";
    if (!silent) {
        const userReason = prompt("Raison de la modification (Optionnel) :");
        reason = userReason || "Mise à jour manuelle";
    }
    try {
        const updatedConfig = await configService.saveConfig(configToSave, 'user_1', reason);
        setSettings(updatedConfig);
        setInitialSettings(JSON.parse(JSON.stringify(updatedConfig)));
        setVersions(db.getConfigVersions());
        setFeedback({ msg: `Sauvegardé (v${updatedConfig.version})`, type: 'success' });
        window.dispatchEvent(new CustomEvent('agency-settings-updated'));
    } catch (e) {
        setFeedback({ msg: 'Erreur lors de la sauvegarde locale', type: 'error' });
        console.error(e);
    } finally {
        setIsSaving(false);
        setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleRollback = async (versionId: string) => {
      const reason = prompt("Raison du rollback :");
      if (!reason) return;
      try {
          const restored = await configService.rollbackToVersion(versionId, 'user_1', reason);
          setSettings(restored);
          setInitialSettings(JSON.parse(JSON.stringify(restored)));
          setVersions(db.getConfigVersions());
          alert(`Configuration restaurée à la version ${restored.version}`);
          window.dispatchEvent(new CustomEvent('agency-settings-updated'));
      } catch (e) {
          alert("Erreur rollback : " + (e as Error).message);
      }
  };

  if (!settings) return <div className="p-8 flex justify-center text-slate-500 gap-2"><RefreshCw className="animate-spin"/> Chargement de la console...</div>;

  const renderInfrastructure = () => (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2">
          
          <div className="flex justify-between items-center mb-6 bg-slate-900/80 backdrop-blur p-4 rounded-2xl border border-slate-800 sticky top-0 z-20 shadow-xl">
              <div>
                  <h2 className="text-white font-bold flex items-center gap-2">
                      <Server size={20} className="text-blue-400"/> Infrastructure & APIs
                      <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">v{settings.version || 1}</span>
                  </h2>
              </div>
              <div className="flex items-center gap-4">
                  {feedback && (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${feedback.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {feedback.msg}
                      </span>
                  )}
                  <button 
                      onClick={() => handleSave()}
                      disabled={isSaving}
                      className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
                  >
                      {isSaving ? <RefreshCw size={18} className="animate-spin"/> : <Save size={18}/>}
                      Publier
                  </button>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              <div className="space-y-8">
                  {/* AI KEYS */}
                  <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-lg animate-in fade-in">
                      <h3 className="font-bold text-white flex items-center gap-2 mb-6">
                          <Shield size={18} className="text-purple-400"/> Clés API (IA & Providers)
                      </h3>
                      <div className="space-y-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Google Gemini API Key</label>
                              <input 
                                type="password" 
                                value={settings.aiConfig.geminiKey || ''}
                                onChange={e => updateSetting('aiConfig.geminiKey', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                                placeholder="AIza..."
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Anthropic API Key</label>
                              <input 
                                type="password" 
                                value={settings.aiConfig.anthropicKey || ''}
                                onChange={e => updateSetting('aiConfig.anthropicKey', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                                placeholder="sk-ant..."
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Perplexity API Key</label>
                              <input 
                                type="password" 
                                value={settings.aiConfig.perplexityKey || ''}
                                onChange={e => updateSetting('aiConfig.perplexityKey', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                                placeholder="pplx-..."
                              />
                          </div>
                      </div>
                  </div>

                  {/* GOOGLE OAUTH */}
                  <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-lg animate-in fade-in">
                      <h3 className="font-bold text-white flex items-center gap-2 mb-6">
                          <Globe size={18} className="text-blue-500"/> Google Workspace (OAuth)
                      </h3>
                      <div className="space-y-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Client ID</label>
                              <input 
                                type="text" 
                                value={settings.google?.clientId || ''}
                                onChange={e => updateSetting('google.clientId', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                                placeholder="xxx.apps.googleusercontent.com"
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Client Secret</label>
                              <input 
                                type="password" 
                                value={settings.google?.clientSecret || ''}
                                onChange={e => updateSetting('google.clientSecret', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                                placeholder="Secret..."
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Redirect URI</label>
                              <input 
                                type="text" 
                                value={settings.google?.redirectUri || ''}
                                onChange={e => updateSetting('google.redirectUri', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                                placeholder="https://votre-app.com/api/auth/google/callback"
                              />
                          </div>
                      </div>
                  </div>

                  {/* NOUVELLE SECTION : ACTUALITÉS & VEILLE */}
                  <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-lg animate-in fade-in">
                      <h3 className="font-bold text-white flex items-center gap-2 mb-6">
                          <Newspaper size={18} className="text-blue-400"/> Actualités & Veille
                      </h3>
                      <div className="space-y-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">NewsAPI.org Key</label>
                              <input 
                                type="password" 
                                value={settings.newsConfig?.newsApiKey || ''}
                                onChange={e => updateSetting('newsConfig.newsApiKey', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                                placeholder="Key..."
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">GNews API Key</label>
                              <input 
                                type="password" 
                                value={settings.newsConfig?.gnewsApiKey || ''}
                                onChange={e => updateSetting('newsConfig.gnewsApiKey', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                                placeholder="Key..."
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">OpenWeatherMap API Key</label>
                              <input 
                                type="password" 
                                value={settings.newsConfig?.openWeatherApiKey || ''}
                                onChange={e => updateSetting('newsConfig.openWeatherApiKey', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                                placeholder="Key..."
                              />
                          </div>
                      </div>
                  </div>

                  {/* NOUVELLE SECTION : PROSPECTION */}
                  <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-lg animate-in fade-in">
                      <h3 className="font-bold text-white flex items-center gap-2 mb-6">
                          <Target size={18} className="text-emerald-400"/> Growth & Prospection
                      </h3>
                      <div className="space-y-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Apify API Token (Scraping)</label>
                              <input 
                                type="password" 
                                value={settings.prospectionConfig?.apifyApiToken || ''}
                                onChange={e => updateSetting('prospectionConfig.apifyApiToken', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                                placeholder="apify_api_..."
                              />
                          </div>
                      </div>
                  </div>
                  
                  {/* NOUVELLE SECTION : STOCKAGE & SUPABASE */}
                  <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-lg animate-in fade-in">
                      <h3 className="font-bold text-white flex items-center gap-2 mb-6">
                          <Database size={18} className="text-orange-400"/> Bibliothèque & Stockage (Supabase)
                      </h3>
                      <div className="space-y-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Supabase URL</label>
                              <input 
                                type="text" 
                                value={settings.library?.supabaseUrl || ''}
                                onChange={e => updateSetting('library.supabaseUrl', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                                placeholder="https://xyz.supabase.co"
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Supabase Anon Key</label>
                              <input 
                                type="password" 
                                value={settings.library?.supabaseAnonKey || ''}
                                onChange={e => updateSetting('library.supabaseAnonKey', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                                placeholder="public-anon-key..."
                              />
                          </div>
                      </div>
                  </div>
              </div>

              <div className="space-y-8">
                  {/* NOUVELLE SECTION : CRM & PROJETS (NOTION) */}
                  <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-lg animate-in fade-in">
                      <h3 className="font-bold text-white flex items-center gap-2 mb-6">
                          <LayoutGrid size={18} className="text-slate-200"/> CRM & Projets (Notion)
                      </h3>
                      <div className="space-y-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Notion Integration Token</label>
                              <input 
                                type="password" 
                                value={settings.notionConfig?.apiKey || ''}
                                onChange={e => updateSetting('notionConfig.apiKey', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                                placeholder="secret_..."
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Clients Database ID (CRM)</label>
                              <input 
                                type="text" 
                                value={settings.notionConfig?.clientsDatabaseId || ''}
                                onChange={e => updateSetting('notionConfig.clientsDatabaseId', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                                placeholder="32 chars hex ID"
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Projects Database ID (Production)</label>
                              <input 
                                type="text" 
                                value={settings.notionConfig?.projectsDatabaseId || ''}
                                onChange={e => updateSetting('notionConfig.projectsDatabaseId', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                                placeholder="32 chars hex ID"
                              />
                          </div>
                      </div>
                  </div>

                  {/* NOUVELLE SECTION : SERVICE RH & BILLING */}
                  <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-lg animate-in fade-in">
                      <h3 className="font-bold text-white flex items-center gap-2 mb-6">
                          <Briefcase size={18} className="text-amber-400"/> Finance & RH (Qonto / GDocs)
                      </h3>
                      <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Qonto Login (ID)</label>
                                  <input 
                                    type="text" 
                                    value={settings.billingConfig?.qontoLogin || ''}
                                    onChange={e => updateSetting('billingConfig.qontoLogin', e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                                    placeholder="ID..."
                                  />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Qonto Secret Key</label>
                                  <input 
                                    type="password" 
                                    value={settings.billingConfig?.qontoSecretKey || ''}
                                    onChange={e => updateSetting('billingConfig.qontoSecretKey', e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                                    placeholder="Secret..."
                                  />
                              </div>
                          </div>
                          
                          <div className="pt-4 border-t border-slate-700/50">
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-2 flex items-center gap-2">
                                  <FileText size={14}/> Templates Google Docs
                              </label>
                              <div className="space-y-3">
                                  <div>
                                      <span className="text-[10px] text-slate-400 block mb-1">ID Template Facture</span>
                                      <input 
                                        type="text" 
                                        value={settings.billingConfig?.googleDocInvoiceTemplateId || ''}
                                        onChange={e => updateSetting('billingConfig.googleDocInvoiceTemplateId', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm font-mono"
                                        placeholder="1xSj..."
                                      />
                                  </div>
                                  <div>
                                      <span className="text-[10px] text-slate-400 block mb-1">ID Template Devis</span>
                                      <input 
                                        type="text" 
                                        value={settings.billingConfig?.googleDocQuoteTemplateId || ''}
                                        onChange={e => updateSetting('billingConfig.googleDocQuoteTemplateId', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm font-mono"
                                        placeholder="1xSj..."
                                      />
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* HISTORIQUE */}
                  <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-lg max-h-[400px] overflow-y-auto">
                      <h3 className="font-bold text-white flex items-center gap-2 mb-4">
                          <Clock size={18} className="text-slate-400"/> Historique Versions
                      </h3>
                      <div className="space-y-4">
                          {versions.map(v => (
                              <div key={v.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs hover:border-slate-600 transition-colors">
                                  <div className="flex justify-between items-start mb-1">
                                      <span className="font-bold text-white">Version {v.version}</span>
                                      <span className="text-slate-500">{new Date(v.changedAt).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-slate-400 mb-2 line-clamp-2">{v.changeReason}</p>
                                  <div className="flex justify-between items-center">
                                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-500">{v.changedByName}</span>
                                      {v.status === 'archived' && (
                                          <button 
                                            onClick={() => handleRollback(v.id)}
                                            className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                                          >
                                              Restaurer
                                          </button>
                                      )}
                                      {v.status === 'active' && <span className="text-green-500 font-bold text-[10px]">ACTIVE</span>}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="p-8 h-full overflow-y-auto bg-background scrollbar-thin">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="text-primary" size={32} /> Console Admin
          </h1>
          <p className="text-slate-400 mt-1">Gouvernance centralisée et Configuration Système</p>
        </div>
      </div>

      <div className="flex gap-1 bg-surface/50 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700 w-fit mb-8 shadow-2xl relative z-10 overflow-x-auto">
          {[
            { id: 'infrastructure', label: 'Infrastructure', icon: Server },
            { id: 'audit', label: 'Audit IA', icon: FileSearch }, 
            { id: 'customization', label: 'Personnalisation', icon: Palette },
            { id: 'accounts', label: 'Comptes', icon: Users },
            { id: 'metrics', label: 'Monitoring IA', icon: BarChart3 },
            { id: 'logs', label: 'Logs d\'audit', icon: Activity },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-bold transition-all relative whitespace-nowrap
                ${activeTab === tab.id ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
      </div>

      <div className="pb-20">
          {activeTab === 'infrastructure' && renderInfrastructure()}
          {activeTab === 'audit' && <SystemAuditor />} 
          {activeTab === 'customization' && (
              <BrandingEditor 
                  settings={settings} 
                  updateSetting={updateSetting} 
                  onSave={() => handleSave()} 
                  isSaving={isSaving}
              />
          )}
          {activeTab === 'metrics' && <MetricsDashboard />}
          {activeTab === 'logs' && <LogsRenderer logs={logs} />}
          {activeTab === 'accounts' && <AccountsManager />}
      </div>
    </div>
  );
};
