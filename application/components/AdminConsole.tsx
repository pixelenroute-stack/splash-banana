
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/mockDatabase';
import { configService } from '../services/configService';
import { adminService } from '../services/adminService';
import { supabaseService } from '../services/supabaseService';
import { 
  Shield, Server, Users, Activity, BarChart3,
  Save, RefreshCw, Eye, EyeOff, CheckCircle,
  Workflow, Clock, Palette, Lock, Mail, Edit2, UserPlus, X, Trash2, Copy, Image as ImageIcon,
  Search, Zap, FileSearch, Briefcase, BookOpen, Layers, MonitorPlay, Share2, Target, Newspaper
} from 'lucide-react';
import { SystemSettings, User, AuditLog, ConfigVersion, WebhookConfig, UserRole } from '../types';
import { MetricsDashboard } from './admin/MetricsDashboard';
import { BrandingEditor } from './admin/BrandingEditor';
import { WorkflowMonitor } from './admin/WorkflowMonitor'; 
import { SystemAuditor } from './admin/SystemAuditor'; 
import { n8nAgentService } from '../lib/n8nAgentService';
import { WorkflowBlueprintModal } from './admin/WorkflowBlueprintModal';
import { WORKFLOW_BLUEPRINTS } from '../data/workflowBlueprints';

type AdminTab = 'infrastructure' | 'accounts' | 'customization' | 'metrics' | 'logs' | 'workflows' | 'audit';

interface AdminConsoleProps {
    onDirtyChange?: (isDirty: boolean) => void;
}

// --- CONFIGURATION GROUPS ---
// 1. Webhooks Créatifs (Restent indépendants pour la performance/spécialisation)
const CREATIVE_HOOKS = ['chat', 'images', 'videos', 'video_editor', 'news'];

// 2. Webhooks de Gestion (Désormais pilotés par un seul Master Workflow)
const MANAGEMENT_HOOKS = ['clients', 'projects', 'invoices', 'prospection', 'google_workspace'];

const WEBHOOK_LABELS: Record<string, string> = {
    // Master
    unified_workspace: "⚡ WORKFLOW GESTION & WORKSPACE (Unifié)",
    
    // Creative
    chat: "Assistant Chat (Agent Principal)",
    images: "Studio Image (Banana)",
    videos: "Studio Vidéo (Veo)",
    video_editor: "🎬 Agent Monteur Vidéo",
    news: "Actualités & Veille",

    // Hidden (Managed by Unified)
    clients: "CRM Clients",
    invoices: "Facturation & Devis",
    prospection: "Prospection Leads",
    projects: "Gestion Projets",
    google_workspace: "Google Workspace Sync"
};

// --- COMPOSANT CELLULE MOT DE PASSE ---
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

// --- SOUS-COMPOSANT : GESTION DES COMPTES ---
const AccountsManager: React.FC = () => {
    // ... (Code existant inchangé pour AccountsManager) ...
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
            
            {/* ... Modal Rendering ... */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-surface border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                            <h3 className="font-bold text-white">Inviter un membre</h3>
                            <button onClick={() => setShowInviteModal(false)}><X size={20} className="text-slate-400 hover:text-white"/></button>
                        </div>
                        <div className="p-6 space-y-6">
                            {!generatedLink ? (
                                <form onSubmit={handleInvite} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Email</label>
                                        <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-primary" placeholder="nouveau@membre.com" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Rôle</label>
                                        <select value={inviteRole} onChange={e => setInviteRole(e.target.value as UserRole)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-primary">
                                            <option value={UserRole.ADMIN}>Administrateur</option>
                                            <option value={UserRole.COLLABORATOR}>Collaborateur</option>
                                            <option value={UserRole.VIEWER}>Lecture Seule</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-all">Générer l'invitation</button>
                                </form>
                            ) : (
                                <div className="space-y-4 text-center">
                                    <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32}/></div>
                                    <h4 className="text-white font-bold">Lien généré avec succès !</h4>
                                    <div className="bg-black/50 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
                                        <code className="flex-1 text-xs text-slate-300 font-mono truncate">{generatedLink}</code>
                                        <button onClick={() => navigator.clipboard.writeText(generatedLink)} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Copier"><Copy size={16}/></button>
                                    </div>
                                    <button onClick={() => setShowInviteModal(false)} className="text-sm text-slate-500 hover:text-white underline">Fermer</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-surface border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                            <h3 className="font-bold text-white flex items-center gap-2"><Edit2 size={18} className="text-blue-400"/> Modifier Utilisateur</h3>
                            <button onClick={() => setEditingUser(null)}><X size={20} className="text-slate-400 hover:text-white"/></button>
                        </div>
                        <form onSubmit={handleSaveEdit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                            {/* Form fields same as previous implementation */}
                            <div className="flex gap-4">
                                <div className="space-y-2">
                                    <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center overflow-hidden relative group">
                                        {editFormData.avatar ? <img src={editFormData.avatar} className="w-full h-full object-cover"/> : <span className="text-xl font-bold text-white">{editFormData.name?.charAt(0)}</span>}
                                    </div>
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Nom complet</label><input type="text" required value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none" /></div>
                                    <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Email</label><input type="email" required value={editFormData.email || ''} onChange={e => setEditFormData({...editFormData, email: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none" /></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Rôle</label><select value={editFormData.role} onChange={e => setEditFormData({...editFormData, role: e.target.value as UserRole})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none" disabled={editingUser.id === 'user_1'}><option value="ADMIN">Admin</option><option value="COLLABORATOR">Collaborateur</option><option value="VIEWER">Lecture Seule</option></select></div>
                                <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Statut</label><select value={editFormData.status} onChange={e => setEditFormData({...editFormData, status: e.target.value as any})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none" disabled={editingUser.id === 'user_1'}><option value="active">Actif</option><option value="disabled">Désactivé</option><option value="invited">Invité</option></select></div>
                            </div>
                            <div className="pt-4 border-t border-slate-700">
                                <label className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block mb-1 flex items-center gap-2"><Lock size={12}/> Réinitialiser mot de passe</label>
                                <input type="text" value={editFormData.newPassword || ''} onChange={e => setEditFormData({...editFormData, newPassword: e.target.value})} placeholder="Laisser vide pour ne pas changer" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 outline-none placeholder:text-slate-600" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors">Annuler</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold transition-colors shadow-lg">Enregistrer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- WEBHOOK EDITOR ITEM ---
interface WebhookEditorProps {
    moduleKey: string;
    webhook: WebhookConfig;
    onChange: (w: WebhookConfig) => void;
    onTest: (k: string) => Promise<any>;
    label?: string; // New prop for custom display name
    description?: string; // Optionnel : sous-titre
}

const WebhookEditor: React.FC<WebhookEditorProps> = ({ 
    moduleKey, 
    webhook, 
    onChange, 
    onTest,
    label,
    description
}) => {
    // ... (Code existant inchangé pour WebhookEditor) ...
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{success: boolean, msg: string} | null>(null);

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await onTest(moduleKey);
            if (res.success) setTestResult({ success: true, msg: `OK (${res.latency}ms)` });
            else setTestResult({ success: false, msg: res.error || 'Erreur' });
        } catch (e) {
            setTestResult({ success: false, msg: 'Erreur appel' });
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className={`p-4 bg-slate-900 rounded-xl border transition-all ${moduleKey === 'unified_workspace' ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-slate-800 hover:border-slate-700'}`}>
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${webhook.enabled ? 'bg-green-500' : 'bg-slate-600'}`}></div>
                    <div>
                        <span className="font-bold text-white uppercase text-xs truncate block max-w-[200px]" title={label || moduleKey}>{label || moduleKey}</span>
                        {description && <span className="text-[10px] text-slate-500">{description}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => onChange({ ...webhook, enabled: !webhook.enabled })}
                        className={`px-2 py-1 rounded text-[10px] font-bold ${webhook.enabled ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}
                    >
                        {webhook.enabled ? 'ACTIF' : 'INACTIF'}
                    </button>
                </div>
            </div>
            
            <div className="space-y-3">
                <input 
                    type="text" 
                    value={webhook.url} 
                    onChange={e => onChange({ ...webhook, url: e.target.value })}
                    placeholder="https://n8n.../webhook/..."
                    className="w-full bg-black/30 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-blue-500 outline-none"
                />
                <div className="flex gap-2">
                    <button 
                        onClick={handleTest}
                        disabled={testing || !webhook.url}
                        className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-2"
                        title="Tester la connexion"
                    >
                        {testing ? <RefreshCw size={14} className="animate-spin"/> : <Zap size={14}/>} Tester
                    </button>
                </div>
                
                {/* STATUS & RESULTS */}
                <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">
                        Dernier test : {webhook.lastTestedAt ? new Date(webhook.lastTestedAt).toLocaleTimeString() : 'Jamais'}
                        {webhook.lastTestStatus && (
                            <span className={`ml-2 font-bold ${webhook.lastTestStatus === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                                {webhook.lastTestStatus === 'success' ? 'SUCCESS' : 'FAILED'}
                            </span>
                        )}
                    </span>
                    {testResult && (
                        <span className={`font-bold ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                            {testResult.msg}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

const LogsRenderer = ({ logs }: { logs: AuditLog[] }) => {
    // ... (Code existant inchangé pour LogsRenderer) ...
    const [liveLogs, setLiveLogs] = useState<AuditLog[]>(logs);

    useEffect(() => {
        setLiveLogs(logs); 
    }, [logs]);

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
  const [showBlueprintModal, setShowBlueprintModal] = useState(false);
  const [selectedBlueprint, setSelectedBlueprint] = useState<any>(null);

  // Initial Load via Client Services (Persistence LocalStorage)
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

          if (path === 'webhooks.unified_workspace') {
              const unifiedUrl = value.url;
              MANAGEMENT_HOOKS.forEach(hookKey => {
                  if (next.webhooks[hookKey]) {
                      next.webhooks[hookKey].url = unifiedUrl;
                      next.webhooks[hookKey].enabled = value.enabled;
                  }
              });
          }
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

  const handleWebhookTest = async (moduleKey: string) => {
      return await configService.testWebhook(moduleKey as any, 'user_1');
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

  const openBlueprint = (type: keyof typeof WORKFLOW_BLUEPRINTS) => {
      setSelectedBlueprint(WORKFLOW_BLUEPRINTS[type]);
      setShowBlueprintModal(true);
  };

  if (!settings) return <div className="p-8 flex justify-center text-slate-500 gap-2"><RefreshCw className="animate-spin"/> Chargement de la console...</div>;

  const renderInfrastructure = () => (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2">
          
          <div className="flex justify-between items-center mb-6 bg-slate-900/80 backdrop-blur p-4 rounded-2xl border border-slate-800 sticky top-0 z-20 shadow-xl">
              <div>
                  <h2 className="text-white font-bold flex items-center gap-2">
                      <Server size={20} className="text-blue-400"/> Infrastructure
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className="lg:col-span-2 space-y-8">
                  
                  {/* --- SECTION DOCUMENTATION (NEW) --- */}
                  <div className="bg-surface border border-indigo-500/20 rounded-2xl p-6 shadow-lg animate-in fade-in">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-white flex items-center gap-2">
                              <BookOpen size={18} className="text-indigo-400"/> Architecture n8n & Blueprints (Documentation)
                          </h3>
                      </div>
                      
                      <p className="text-xs text-slate-400 mb-6">
                          Cliquez sur un module pour afficher la configuration JSON et les nœuds n8n requis.
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <button onClick={() => openBlueprint('chat_orchestrator')} className="flex flex-col items-center justify-center p-3 bg-slate-900 border border-slate-700 rounded-xl hover:border-indigo-500 transition-all text-center gap-2 group">
                              <Workflow size={20} className="text-indigo-400 group-hover:scale-110 transition-transform"/>
                              <span className="text-[10px] font-bold text-slate-300">1. Chat Agent</span>
                          </button>
                          <button onClick={() => openBlueprint('news_agent')} className="flex flex-col items-center justify-center p-3 bg-slate-900 border border-slate-700 rounded-xl hover:border-blue-500 transition-all text-center gap-2 group">
                              <Newspaper size={20} className="text-blue-400 group-hover:scale-110 transition-transform"/>
                              <span className="text-[10px] font-bold text-slate-300">2. News & Veille</span>
                          </button>
                          <button onClick={() => openBlueprint('video_editor')} className="flex flex-col items-center justify-center p-3 bg-slate-900 border border-slate-700 rounded-xl hover:border-purple-500 transition-all text-center gap-2 group">
                              <Layers size={20} className="text-purple-400 group-hover:scale-110 transition-transform"/>
                              <span className="text-[10px] font-bold text-slate-300">3. Monteur Vidéo</span>
                          </button>
                          <button onClick={() => openBlueprint('social_factory')} className="flex flex-col items-center justify-center p-3 bg-slate-900 border border-slate-700 rounded-xl hover:border-pink-500 transition-all text-center gap-2 group">
                              <Share2 size={20} className="text-pink-400 group-hover:scale-110 transition-transform"/>
                              <span className="text-[10px] font-bold text-slate-300">4. Social Factory</span>
                          </button>
                          <button onClick={() => openBlueprint('image_gen')} className="flex flex-col items-center justify-center p-3 bg-slate-900 border border-slate-700 rounded-xl hover:border-emerald-500 transition-all text-center gap-2 group">
                              <ImageIcon size={20} className="text-emerald-400 group-hover:scale-110 transition-transform"/>
                              <span className="text-[10px] font-bold text-slate-300">5. Images (Banana)</span>
                          </button>
                          <button onClick={() => openBlueprint('video_gen')} className="flex flex-col items-center justify-center p-3 bg-slate-900 border border-slate-700 rounded-xl hover:border-emerald-500 transition-all text-center gap-2 group">
                              <MonitorPlay size={20} className="text-emerald-400 group-hover:scale-110 transition-transform"/>
                              <span className="text-[10px] font-bold text-slate-300">6. Vidéos (Veo)</span>
                          </button>
                          <button onClick={() => openBlueprint('prospection')} className="flex flex-col items-center justify-center p-3 bg-slate-900 border border-slate-700 rounded-xl hover:border-amber-500 transition-all text-center gap-2 group">
                              <Target size={20} className="text-amber-400 group-hover:scale-110 transition-transform"/>
                              <span className="text-[10px] font-bold text-slate-300">7. Prospection</span>
                          </button>
                          <button onClick={() => openBlueprint('unified_workspace')} className="flex flex-col items-center justify-center p-3 bg-slate-900 border border-slate-700 rounded-xl hover:border-orange-500 transition-all text-center gap-2 group">
                              <Briefcase size={20} className="text-orange-400 group-hover:scale-110 transition-transform"/>
                              <span className="text-[10px] font-bold text-slate-300">8. Workspace (CRM/RH)</span>
                          </button>
                      </div>
                  </div>

                  {/* GROUPE 1: WORKSPACE & GESTION UNIFIÉE */}
                  <div className="bg-surface border border-amber-500/20 rounded-2xl p-6 shadow-lg animate-in fade-in">
                      <div className="flex justify-between items-start mb-4">
                          <div>
                              <h3 className="font-bold text-white flex items-center gap-2 mb-2">
                                  <Briefcase size={18} className="text-amber-400"/> Webhook Gestion & Workspace
                              </h3>
                              <p className="text-xs text-slate-400 mb-2">
                                  Endpoint unifié pour : CRM Clients, Projets, Facturation, Synchronisation Google.
                              </p>
                          </div>
                      </div>
                      
                      {settings.webhooks.unified_workspace && (
                          <WebhookEditor 
                            key="unified_workspace" 
                            moduleKey="unified_workspace" 
                            label={WEBHOOK_LABELS.unified_workspace}
                            description="Synchronise : CRM, Projets, Facturation, Emails, Agenda"
                            webhook={settings.webhooks.unified_workspace} 
                            onChange={(w) => updateSetting(`webhooks.unified_workspace`, w)}
                            onTest={handleWebhookTest}
                          />
                      )}
                  </div>

                  {/* GROUPE 2: STUDIO CRÉATIF */}
                  <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-lg animate-in fade-in">
                      <div className="flex justify-between items-start mb-6">
                          <h3 className="font-bold text-white flex items-center gap-2">
                              <Zap size={18} className="text-purple-400"/> Webhooks Studio Créatif
                          </h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {CREATIVE_HOOKS.map(key => {
                              const hook = settings.webhooks[key as keyof typeof settings.webhooks];
                              if (!hook) return null;
                              return (
                                  <WebhookEditor 
                                    key={key} 
                                    moduleKey={key} 
                                    label={WEBHOOK_LABELS[key]}
                                    webhook={hook} 
                                    onChange={(w) => updateSetting(`webhooks.${key}`, w)}
                                    onTest={handleWebhookTest}
                                  />
                              );
                          })}
                      </div>
                  </div>
              </div>

              {/* SIDEBAR: HISTORY */}
              <div className="space-y-6">
                  <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-lg max-h-[600px] overflow-y-auto">
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
          
          <WorkflowBlueprintModal 
            isOpen={showBlueprintModal}
            onClose={() => setShowBlueprintModal(false)}
            data={selectedBlueprint}
          />
      </div>
  );

  return (
    <div className="p-8 h-full overflow-y-auto bg-background scrollbar-thin">
      {/* ... (Reste du composant retourné inchangé) ... */}
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
            { id: 'workflows', label: 'Résultats Workflow', icon: Workflow }, 
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
          {activeTab === 'workflows' && <WorkflowMonitor />} 
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
