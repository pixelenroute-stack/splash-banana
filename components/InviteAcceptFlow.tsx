
import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { Loader2, CheckCircle, AlertTriangle, User, Lock, Mail } from 'lucide-react';

export const InviteAcceptFlow: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [token, setToken] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [msg, setMsg] = useState('');

    useEffect(() => {
        // Extraction du token depuis l'URL si présent (ex: ?token=xyz)
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        if (urlToken) setToken(urlToken);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!name) {
            setMsg("Veuillez saisir votre nom complet");
            setStatus('error');
            return;
        }
        if(password !== confirm) {
            setMsg("Les mots de passe ne correspondent pas");
            setStatus('error');
            return;
        }
        setStatus('loading');
        try {
            await adminService.finalizeUserRegistration(token, { name, passwordPlain: password });
            setStatus('success');
            setTimeout(onComplete, 3000);
        } catch(e) {
            setMsg((e as Error).message);
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle size={48} />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Inscription complétée !</h2>
                <p className="text-slate-400 max-w-sm">
                    Vos informations ont été envoyées à l'administrateur pour validation. Vous recevrez un accès dès que votre compte sera activé.
                </p>
                <div className="mt-8 text-xs text-slate-600 animate-pulse">Redirection vers la connexion...</div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center h-full p-4">
            <div className="bg-surface border border-slate-700 p-10 rounded-[40px] max-w-lg w-full shadow-2xl space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-white">Rejoindre le Studio</h1>
                    <p className="text-slate-400 text-sm">Créez votre profil collaborateur pour commencer à produire.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Token de sécurité (Reçu par mail)</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-primary transition-colors" size={18}/>
                                <input 
                                    type="text" 
                                    placeholder="xyz..."
                                    value={token}
                                    onChange={e => setToken(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-white font-mono text-xs focus:border-primary outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nom complet</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-primary transition-colors" size={18}/>
                                <input 
                                    type="text" 
                                    placeholder="Jean Martin"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:border-primary outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mot de passe</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-primary transition-colors" size={16}/>
                                    <input 
                                        type="password" 
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-3.5 pl-11 pr-4 text-white focus:border-primary outline-none transition-all"
                                        required
                                        minLength={8}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Confirmation</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-primary transition-colors" size={16}/>
                                    <input 
                                        type="password" 
                                        placeholder="••••••••"
                                        value={confirm}
                                        onChange={e => setConfirm(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-3.5 pl-11 pr-4 text-white focus:border-primary outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {status === 'error' && (
                        <div className="bg-red-500/10 text-red-400 text-[11px] p-4 rounded-xl border border-red-500/20 flex items-start gap-3">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5"/> 
                            <p>{msg}</p>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={status === 'loading'}
                        className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                    >
                        {status === 'loading' ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                        Créer mon compte collaborateur
                    </button>
                </form>
                
                <div className="pt-6 border-t border-slate-800 text-center">
                    <button onClick={onComplete} className="text-xs text-slate-500 hover:text-white transition-colors">Déjà un compte ? Se connecter</button>
                </div>
            </div>
        </div>
    );
};
