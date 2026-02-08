
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/mockDatabase';
import { configService } from '../services/configService';
import { adminService } from '../services/adminService';
import { 
  Shield, Server, Users, Activity, BarChart3,
  Save, RefreshCw, Eye, EyeOff, CheckCircle, AlertTriangle, 
  BrainCircuit, Globe, Bot, Share2, Database, Key, Cloud, Link, Zap, DollarSign,
  Code, Lock, Edit2, UserPlus, X, CheckSquare, MessageSquare, Terminal, FileJson, Bug, Palette,
  Workflow, Newspaper, FolderKanban, Target, Image as ImageIcon, Video, Mail, Receipt, FileSignature, Briefcase, FileSpreadsheet, RotateCcw, Clock, ArrowRight,
  Settings, Loader2, Search, MoreHorizontal, Trash2, Copy, LogOut, Camera, ToggleLeft, ToggleRight
} from 'lucide-react';
import { SystemSettings, User, AuditLog, ConfigVersion, WebhookConfig, UserRole } from '../types';
import { MetricsDashboard } from './admin/MetricsDashboard';
import { BrandingEditor } from './admin/BrandingEditor';

type AdminTab = 'infrastructure' | 'accounts' | 'customization' | 'metrics' | 'logs' | 'costs';

interface AdminConsoleProps {
    onDirtyChange?: (isDirty: boolean) => void;
}

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
    const [users, setUsers] = useState<User[]>([]);
    const [invitations, setInvitations] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Modal Invitation
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.COLLABORATOR);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);

    // Modal Edition (Modification complète)
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

    // --- LOGIQUE INVITATION ---
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

    // --- LOGIQUE EDITION ---
    const openEditModal = (user: User) => {
        setEditingUser(user);
        setEditFormData({ 
            name: user.name, 
            email: user.email, 
            role: user.role, 
            status: user.status,
            avatar: user.avatar,
            newPassword: '' // Champ vide par défaut
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

            // Gestion mot de passe si rempli
            if (editFormData.newPassword && editFormData.newPassword.trim() !== '') {
                updates.passwordPlain = editFormData.newPassword;
                // Note: En prod, adminService.updateUser hasherait le mot de passe.
                // Ici on simule via db.updateUser qui gère le stockage mock.
            }

            db.updateUser(editingUser.id, updates);
            
            // Feedback & Refresh
            loadData();
            setEditingUser(null);
        } catch (err) {
            alert("Erreur lors de la mise à jour : " + (err as Error).message);
        }
    };

    // --- ACTIONS RAPIDES ---
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
            
            {/* STATS HEADER */}
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

            {/* TOOLBAR */}
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

            {/* USERS LIST */}
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

            {/* MODAL INVITATION */}
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
                                        <input 
                                            type="email" 
                                            required
                                            value={inviteEmail} 
                                            onChange={e => setInviteEmail(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-primary"
                                            placeholder="nouveau@membre.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Rôle</label>
                                        <select 
                                            value={inviteRole} 
                                            onChange={e => setInviteRole(e.target.value as UserRole)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-primary"
                                        >
                                            <option value={UserRole.ADMIN}>Administrateur</option>
                                            <option value={UserRole.COLLABORATOR}>Collaborateur</option>
                                            <option value={UserRole.VIEWER}>Lecture Seule</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-all">
                                        Générer l'invitation
                                    </button>
                                </form>
                            ) : (
                                <div className="space-y-4 text-center">
                                    <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle size={32}/>
                                    </div>
                                    <h4 className="text-white font-bold">Lien généré avec succès !</h4>
                                    <p className="text-sm text-slate-400">Partagez ce lien avec l'utilisateur pour qu'il configure son compte.</p>
                                    
                                    <div className="bg-black/50 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
                                        <code className="flex-1 text-xs text-slate-300 font-mono truncate">{generatedLink}</code>
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(generatedLink)}
                                            className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                            title="Copier"
                                        >
                                            <Copy size={16}/>
                                        </button>
                                    </div>

                                    <button onClick={() => setShowInviteModal(false)} className="text-sm text-slate-500 hover:text-white underline">Fermer</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL EDITION */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-surface border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Edit2 size={18} className="text-blue-400"/> Modifier Utilisateur
                            </h3>
                            <button onClick={() => setEditingUser(null)}><X size={20} className="text-slate-400 hover:text-white"/></button>
                        </div>
                        
                        <form onSubmit={handleSaveEdit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                            
                            {/* Avatar & Identité */}
                            <div className="flex gap-4">
                                <div className="space-y-2">
                                    <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center overflow-hidden relative group">
                                        {editFormData.avatar ? (
                                            <img src={editFormData.avatar} className="w-full h-full object-cover"/>
                                        ) : (
                                            <span className="text-xl font-bold text-white">{editFormData.name?.charAt(0)}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Nom complet</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={editFormData.name || ''} 
                                            onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Email</label>
                                        <input 
                                            type="email" 
                                            required
                                            value={editFormData.email || ''} 
                                            onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* URL Avatar */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1 flex items-center gap-2">
                                    <ImageIcon size={12}/> URL Avatar
                                </label>
                                <input 
                                    type="text" 
                                    value={editFormData.avatar || ''} 
                                    onChange={e => setEditFormData({...editFormData, avatar: e.target.value})}
                                    placeholder="https://..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:border-primary outline-none font-mono"
                                />
                            </div>

                            {/* Rôle & Statut */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Rôle</label>
                                    <select 
                                        value={editFormData.role} 
                                        onChange={e => setEditFormData({...editFormData, role: e.target.value as UserRole})}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none"
                                        disabled={editingUser.id === 'user_1'} // Protect super admin role
                                    >
                                        <option value="ADMIN">Admin</option>
                                        <option value="COLLABORATOR">Collaborateur</option>
                                        <option value="VIEWER">Lecture Seule</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Statut</label>
                                    <select 
                                        value={editFormData.status} 
                                        onChange={e => setEditFormData({...editFormData, status: e.target.value as any})}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none"
                                        disabled={editingUser.id === 'user_1'}
                                    >
                                        <option value="active">Actif</option>
                                        <option value="disabled">Désactivé</option>
                                        <option value="invited">Invité</option>
                                    </select>
                                </div>
                            </div>

                            {/* Password Reset */}
                            <div className="pt-4 border-t border-slate-700">
                                <label className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block mb-1 flex items-center gap-2">
                                    <Key size={12}/> Réinitialiser mot de passe
                                </label>
                                <input 
                                    type="text" 
                                    value={editFormData.newPassword || ''} 
                                    onChange={e => setEditFormData({...editFormData, newPassword: e.target.value})}
                                    placeholder="Laisser vide pour ne pas changer"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 outline-none placeholder:text-slate-600"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">Si renseigné, le mot de passe sera écrasé immédiatement.</p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
                                >
                                    Annuler
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-1 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold transition-colors shadow-lg"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const ConfigInput = ({ label, value, onChange, type = "text", placeholder, locked = false }: any) => {
    const [visible, setVisible] = useState(false);
    const isPassword = type === 'password';
    
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                {label}
                {locked && <Lock size={10} className="text-amber-500"/>}
            </label>
            <div className="relative group">
                <input 
                    type={isPassword && !visible ? "password" : "text"}
                    value={value || ''}
                    onChange={(e) => !locked && onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={locked}
                    className={`w-full bg-slate-900 border rounded-xl py-3 px-4 text-sm outline-none transition-all
                        ${locked ? 'border-slate-800 text-slate-500 cursor-not-allowed' : 'border-slate-700 text-white focus:border-primary'}`}
                />
                {isPassword && (
                    <button 
                        onClick={() => setVisible(!visible)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                        {visible ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                )}
            </div>
        </div>
    );
};

// --- WEBHOOK EDITOR ITEM ---
interface WebhookEditorProps {
    moduleKey: string;
    webhook: WebhookConfig;
    onChange: (w: WebhookConfig) => void;
    onTest: (k: string) => Promise<any>;
}

const WebhookEditor: React.FC<WebhookEditorProps> = ({ 
    moduleKey, 
    webhook, 
    onChange, 
    onTest 
}) => {
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
        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${webhook.enabled ? 'bg-green-500' : 'bg-slate-600'}`}></div>
                    <span className="font-bold text-white uppercase text-xs">{moduleKey}</span>
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

const LogsRenderer = ({ logs }: { logs: AuditLog[] }) => (
  <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-lg overflow-hidden flex flex-col h-[600px]">
    <h3 className="font-bold text-white flex items-center gap-2 mb-4">
      <Activity size={18} className="text-slate-400"/> Logs d'Audit
    </h3>
    <div className="flex-1 overflow-y-auto space-y-2 pr-2 font-mono text-xs">
      {logs.length === 0 ? (
        <div className="text-slate-500 italic">Aucun log.</div>
      ) : logs.map(log => (
        <div key={log.id} className="p-3 bg-slate-900 rounded border border-slate-800 flex gap-3">
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

export const AdminConsole: React.FC<AdminConsoleProps> = ({ onDirtyChange }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('infrastructure');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [initialSettings, setInitialSettings] = useState<SystemSettings | null>(null);
  const [versions, setVersions] = useState<ConfigVersion[]>([]);
  
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  
  // SWITCH MODE STATES
  const [showModeSwitch, setShowModeSwitch] = useState(false);
  const [devPasswordInput, setDevPasswordInput] = useState('');
  const [switchingMode, setSwitchingMode] = useState<'production' | 'developer' | null>(null);
  
  // Initial Load via Client Services (Persistence LocalStorage)
  useEffect(() => {
      const loadAll = async () => {
          // Chargement Settings
          const config = await configService.getActiveConfig();
          setSettings(config);
          setInitialSettings(JSON.parse(JSON.stringify(config)));
          
          // Chargement Versions
          setVersions(db.getConfigVersions());
          
          // Chargement Users & Logs
          const u = await adminService.getUsers();
          setUsers(u);
          const l = await adminService.getAuditLogs();
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
          // IMPORTANT: Deep Clone pour éviter la mutation de l'état précédent ou initial
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
        // Demande de raison optionnelle : si l'utilisateur annule ou vide, on met une valeur par défaut
        const userReason = prompt("Raison de la modification (Optionnel) :");
        reason = userReason || "Mise à jour manuelle";
    }

    try {
        // Sauvegarde via Service Client pour MAJ LocalStorage
        const updatedConfig = await configService.saveConfig(configToSave, 'user_1', reason);
        
        setSettings(updatedConfig);
        setInitialSettings(JSON.parse(JSON.stringify(updatedConfig)));
        setVersions(db.getConfigVersions()); // Rafraîchir historique
        
        setFeedback({ msg: `Sauvegardé (v${updatedConfig.version})`, type: 'success' });
        
        // Signal global pour mettre à jour les autres composants
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
      // Test direct via service client (évite le passage API serveur qui n'a pas la config locale)
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

  // --- NOUVEAU LOGIQUE UNIFIEE DE CHANGEMENT DE MODE ---
  const requestModeSwitch = (targetMode: 'production' | 'developer') => {
      setSwitchingMode(targetMode);
      setShowModeSwitch(true);
      setDevPasswordInput('');
  };

  const confirmSwitchMode = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const input = devPasswordInput.trim();
      
      // Vérification contre le mot de passe de l'administrateur (user_1)
      const adminUser = db.getUserById('user_1');
      const isValid = adminUser && (input === adminUser.passwordPlain);
      
      if (isValid) {
          if (!settings || !switchingMode) return;

          // Démarrage transition
          setShowModeSwitch(false);
          setIsSaving(true); // Bloque l'interface principale
          
          try {
              // 1. Mise à jour settings local
              const newSettings = { ...settings, appMode: switchingMode } as SystemSettings;
              
              // 2. Sauvegarde Persistante
              await handleSave(newSettings, true); // Silent save
              
              // 3. Simulation de chargement d'interface (Overlay)
              setTimeout(() => {
                  window.location.reload(); // Force refresh pour recharger les services (APIRouter, etc.)
              }, 2500);

          } catch (err) {
              alert("Erreur lors du changement de mode : " + (err as Error).message);
              setIsSaving(false);
          }
      } else {
          alert("Mot de passe administrateur incorrect.");
          setDevPasswordInput('');
      }
  };

  // --- RENDERERS ---

  if (!settings) return <div className="p-8 flex justify-center text-slate-500 gap-2"><RefreshCw className="animate-spin"/> Chargement de la console...</div>;

  // OVERLAY DE TRANSITION
  if (isSaving && switchingMode) {
      return (
          <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col items-center justify-center animate-in fade-in duration-500">
              <div className="w-24 h-24 relative mb-8">
                  <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                      <RefreshCw size={32} className="text-primary animate-pulse"/>
                  </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Reconfiguration du Système</h2>
              <p className="text-slate-400 font-mono text-sm">
                  Bascule vers l'architecture {switchingMode === 'production' ? 'WORKFLOW N8N' : 'API DIRECTE'}...
              </p>
              <div className="mt-8 flex gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay:'0s'}}></span>
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></span>
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay:'0.4s'}}></span>
              </div>
          </div>
      );
  }

  const renderInfrastructure = () => (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2">
          
          {/* TOP BAR */}
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
              
              {/* MAIN CONFIG */}
              <div className="lg:col-span-2 space-y-8">
                  {/* MODE CARD */}
                  <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-lg relative overflow-hidden">
                      {/* Background decoration based on mode */}
                      <div className={`absolute top-0 right-0 p-8 opacity-5 pointer-events-none ${settings.appMode === 'production' ? 'text-green-500' : 'text-amber-500'}`}>
                          {settings.appMode === 'production' ? <Workflow size={120}/> : <Code size={120}/>}
                      </div>

                      <div className="flex justify-between items-start mb-6 relative z-10">
                          <div>
                              <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                                  <Settings size={20} className="text-slate-400"/> Mode d'exécution
                              </h3>
                              <p className="text-sm text-slate-400 mt-1 max-w-md">
                                  Définit l'architecture technique active (Workflows vs APIs).
                              </p>
                          </div>
                          
                          {/* CURRENT BADGE */}
                          <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${
                              settings.appMode === 'production' 
                                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          }`}>
                              <span className="relative flex h-3 w-3">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${settings.appMode === 'production' ? 'bg-green-400' : 'bg-amber-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${settings.appMode === 'production' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                              </span>
                              <span className="font-bold uppercase text-xs tracking-wider">
                                  {settings.appMode === 'production' ? 'PRODUCTION' : 'DEVELOPER'}
                              </span>
                          </div>
                      </div>

                      {/* SWITCH ACTIONS */}
                      <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 relative z-10">
                          <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-300 font-medium">
                                  {settings.appMode === 'production' 
                                    ? "Le système utilise les Webhooks n8n (Stable)." 
                                    : "Le système utilise les APIs directes (Test)."}
                              </span>
                              
                              <button 
                                  onClick={() => requestModeSwitch(settings.appMode === 'production' ? 'developer' : 'production')}
                                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-600 transition-all hover:scale-105 active:scale-95"
                              >
                                  {settings.appMode === 'production' ? <ToggleLeft size={16}/> : <ToggleRight size={16}/>}
                                  Passer en {settings.appMode === 'production' ? 'DEV' : 'PROD'}
                              </button>
                          </div>

                          {/* PASSWORD PROMPT INLINE */}
                          {showModeSwitch && (
                              <form onSubmit={confirmSwitchMode} className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-3 animate-in slide-in-from-top-2">
                                  <Lock size={16} className="text-primary"/>
                                  <input 
                                      type="password" 
                                      placeholder="Mot de passe admin requis" 
                                      value={devPasswordInput}
                                      onChange={e => setDevPasswordInput(e.target.value)}
                                      className="bg-black/30 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary flex-1"
                                      autoFocus
                                  />
                                  <button 
                                      type="button" 
                                      onClick={() => setShowModeSwitch(false)}
                                      className="text-slate-500 hover:text-white px-3 py-2 text-xs font-bold"
                                  >
                                      Annuler
                                  </button>
                                  <button 
                                      type="submit"
                                      className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2"
                                  >
                                      <RefreshCw size={14}/> Déverrouiller & Basculer
                                  </button>
                              </form>
                          )}
                      </div>
                  </div>

                  {/* NOTION INTEGRATION */}
                  <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-lg animate-in fade-in">
                      <h3 className="font-bold text-white flex items-center gap-2 mb-2">
                          <Database size={18} className="text-purple-400"/> Notion Integration
                      </h3>
                      <p className="text-xs text-slate-500 mb-6">CRM Clients & Gestion de Projets via Notion API</p>
                      <div className="space-y-4">
                          <ConfigInput label="Notion API Key (Internal Integration)" value={settings.notion?.apiKey} onChange={(v: string) => updateSetting('notion.apiKey', v)} type="password" placeholder="ntn_..." />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <ConfigInput label="CRM Database ID" value={settings.notion?.crmDatabaseId} onChange={(v: string) => updateSetting('notion.crmDatabaseId', v)} placeholder="6bd8c6a6..." />
                              <ConfigInput label="Projects Database ID" value={settings.notion?.projectsDatabaseId} onChange={(v: string) => updateSetting('notion.projectsDatabaseId', v)} placeholder="1f75ed7c..." />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <ConfigInput label="CRM Database URL (optionnel)" value={settings.notion?.crmDatabaseUrl} onChange={(v: string) => updateSetting('notion.crmDatabaseUrl', v)} placeholder="https://www.notion.so/..." />
                              <ConfigInput label="Projects Database URL (optionnel)" value={settings.notion?.projectsDatabaseUrl} onChange={(v: string) => updateSetting('notion.projectsDatabaseUrl', v)} placeholder="https://www.notion.so/..." />
                          </div>
                          {settings.notion?.apiKey && (
                              <div className="flex items-center gap-2 text-xs mt-2">
                                  <CheckCircle size={14} className="text-green-400"/>
                                  <span className="text-green-400 font-medium">API Key configurée</span>
                              </div>
                          )}
                      </div>
                  </div>

                  {/* QONTO INTEGRATION */}
                  <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-lg animate-in fade-in">
                      <h3 className="font-bold text-white flex items-center gap-2 mb-2">
                          <DollarSign size={18} className="text-green-400"/> Qonto Integration
                      </h3>
                      <p className="text-xs text-slate-500 mb-6">Facturation & Devis via API bancaire Qonto</p>
                      <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <ConfigInput label="Qonto Login (Organization slug)" value={settings.qonto?.login} onChange={(v: string) => updateSetting('qonto.login', v)} placeholder="my-company-xxx" />
                              <ConfigInput label="Qonto Secret Key" value={settings.qonto?.secretKey} onChange={(v: string) => updateSetting('qonto.secretKey', v)} type="password" placeholder="sk_..." />
                          </div>
                          <ConfigInput label="IBAN (optionnel)" value={settings.qonto?.iban} onChange={(v: string) => updateSetting('qonto.iban', v)} placeholder="FR76 ..." />
                          {settings.qonto?.login && settings.qonto?.secretKey && (
                              <div className="flex items-center gap-2 text-xs mt-2">
                                  <CheckCircle size={14} className="text-green-400"/>
                                  <span className="text-green-400 font-medium">Credentials Qonto configurées</span>
                              </div>
                          )}
                      </div>
                  </div>

                  {/* CONTRACTS CONFIG */}
                  <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-lg animate-in fade-in">
                      <h3 className="font-bold text-white flex items-center gap-2 mb-2">
                          <FileSignature size={18} className="text-blue-400"/> Contrats (Google Docs)
                      </h3>
                      <p className="text-xs text-slate-500 mb-6">Génération de contrats depuis un template Google Docs</p>
                      <div className="space-y-4">
                          <ConfigInput label="Google Docs Template ID" value={settings.contracts?.googleDocsTemplateId} onChange={(v: string) => updateSetting('contracts.googleDocsTemplateId', v)} placeholder="1yQSTeadQYfAV..." />
                          <ConfigInput label="Dossier Google Drive de sortie (ID)" value={settings.contracts?.outputDriveFolderId} onChange={(v: string) => updateSetting('contracts.outputDriveFolderId', v)} placeholder="1aBcDeFgHiJkLm..." />
                          {settings.contracts?.googleDocsTemplateId && (
                              <div className="flex items-center gap-2 text-xs mt-2">
                                  <Link size={14} className="text-blue-400"/>
                                  <a href={`https://docs.google.com/document/d/${settings.contracts.googleDocsTemplateId}/edit`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-medium">
                                      Ouvrir le template Google Docs
                                  </a>
                              </div>
                          )}
                      </div>
                  </div>

                  {/* WEBHOOKS CONFIG (PROD) */}
                  {settings.appMode === 'production' && (
                      <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-lg animate-in fade-in">
                          <h3 className="font-bold text-white flex items-center gap-2 mb-6">
                              <Workflow size={18} className="text-blue-400"/> Configuration Webhooks n8n
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {Object.keys(settings.webhooks).map(key => {
                                  const hook = settings.webhooks[key as keyof typeof settings.webhooks];
                                  if (!hook) return null;
                                  return (
                                      <WebhookEditor 
                                        key={key} 
                                        moduleKey={key} 
                                        webhook={hook} 
                                        onChange={(w) => updateSetting(`webhooks.${key}`, w)}
                                        onTest={handleWebhookTest}
                                      />
                                  );
                              })}
                          </div>
                      </div>
                  )}

                  {/* API KEYS (DEV) */}
                  {settings.appMode === 'developer' && (
                      <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-lg animate-in fade-in">
                          <h3 className="font-bold text-white flex items-center gap-2 mb-6">
                              <Key size={18} className="text-amber-400"/> Clés API (Dev Mode Only)
                          </h3>
                          <div className="space-y-4">
                              <ConfigInput label="Gemini API Key" value={settings.aiConfig.geminiKey} onChange={(v: string) => updateSetting('aiConfig.geminiKey', v)} type="password" />
                              <ConfigInput label="Anthropic API Key" value={settings.aiConfig.anthropicKey} onChange={(v: string) => updateSetting('aiConfig.anthropicKey', v)} type="password" />
                              <ConfigInput label="OpenAI API Key" value={settings.aiConfig.openaiKey} onChange={(v: string) => updateSetting('aiConfig.openaiKey', v)} type="password" />
                          </div>
                      </div>
                  )}
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
                                              <RotateCcw size={10}/> Restaurer
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
          {activeTab === 'customization' && <BrandingEditor settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'metrics' && <MetricsDashboard />}
          {activeTab === 'logs' && <LogsRenderer logs={logs} />}
          {activeTab === 'accounts' && <AccountsManager />}
      </div>
    </div>
  );
};
