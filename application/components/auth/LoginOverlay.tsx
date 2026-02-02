
import React, { useState } from 'react';
import { Mail, Lock, Eye, ArrowLeft, X, Loader2 } from 'lucide-react';
import { googleService } from '../../services/googleService';
import { googleSyncService } from '../../services/googleSyncService';
import { db } from '../../services/mockDatabase';
import { BrandLogo } from '../BrandLogo';

interface LoginOverlayProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const LoginOverlay: React.FC<LoginOverlayProps> = ({ onClose, onSuccess }) => {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  
  const settings = db.getSystemSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    
    // Tentative de connexion via les paramètres de synchro (Mock / Credentials)
    try {
        // Sauvegarde des credentials dans le service de synchro pour activer le mode Mock
        googleSyncService.updateConfig({
            enabled: true,
            credentials: { email, password: pass }
        });
        
        // Petit délai pour simuler
        await new Promise(resolve => setTimeout(resolve, 800));
        
        onSuccess();
    } catch (e) {
        alert("Erreur de connexion.");
        setIsConnecting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsConnecting(true);
    try {
        const url = googleService.getAuthUrl("user_1");
        window.location.href = url;
    } catch (error) {
        console.error("Google Auth failed, falling back to mock", error);
        // Fallback ultime : on valide quand même pour permettre la démo
        onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-[440px] bg-[#121212] rounded-[32px] p-8 shadow-2xl border border-white/5 ring-1 ring-white/10">
        
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <div className="flex items-center gap-4 mb-8">
          <button onClick={onClose} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 transition-all">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-white">Se connecter</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-slate-300 ml-1">
              Adresse e-mail <span className="text-rose-500">*</span>
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                <Mail size={20} />
              </div>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Saisissez votre e-mail"
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-slate-300 ml-1">
              Mot de passe <span className="text-rose-500">*</span>
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                <Lock size={20} />
              </div>
              <input 
                type={showPass ? 'text' : 'password'} 
                required
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Saisissez votre mot de passe"
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-slate-600 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
              />
              <button 
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <Eye size={20} />
              </button>
            </div>
          </div>

          <div className="text-right">
            <button type="button" className="text-sm text-slate-400 hover:text-white transition-colors">
              Mot de passe oublié ?
            </button>
          </div>

          <button 
            type="submit"
            disabled={isConnecting}
            className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
          >
            {isConnecting && <Loader2 size={18} className="animate-spin" />}
            {isConnecting ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="relative my-8 flex items-center">
          <div className="flex-1 h-px bg-white/10"></div>
          <span className="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">ou</span>
          <div className="flex-1 h-px bg-white/10"></div>
        </div>

        <div className="space-y-3">
          <button 
            onClick={handleGoogleLogin}
            disabled={isConnecting}
            className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 px-4 rounded-2xl flex items-center transition-all disabled:opacity-70 group"
          >
            <div className="flex-1 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-black flex items-center justify-center border border-slate-200">
                {isConnecting ? (
                  <Loader2 size={16} className="animate-spin text-white" />
                ) : (
                  <BrandLogo size="sm" overrideLogo={settings.branding.logoUrl} />
                )}
              </div>
              <div className="text-left overflow-hidden">
                <div className="text-xs leading-tight font-bold truncate">
                  {isConnecting ? 'Connexion...' : `Se connecter à ${settings.branding.name}`}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">via Compte Google</div>
              </div>
            </div>
            {!isConnecting && <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" className="w-5 h-5 ml-auto opacity-80 group-hover:opacity-100" />}
          </button>

          <button className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 transition-all">
            <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="MS" className="w-5 h-5" />
            <span className="text-xs uppercase tracking-tight">Se connecter avec Microsoft</span>
          </button>
        </div>
      </div>
    </div>
  );
};
