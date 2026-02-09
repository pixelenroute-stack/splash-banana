
import React, { useEffect, useState, useRef } from 'react';
import { SystemSettings, User } from '../types';
import { db } from '../services/mockDatabase';
import { apiRouter } from '../services/apiRouter'; // Import services to clear cache
import { googleService } from '../services/googleService';
import { n8nAgentService } from '../lib/n8nAgentService';
import { notionService } from '../services/notionRepository';
import { 
  UserCircle, Loader2, Palette, Save, CheckCircle, AlertCircle, Trash2, Zap, Lock, Mail, User as UserIcon, Eye, EyeOff
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { GoogleSyncSettings } from './GoogleSyncSettings';

interface SettingsProps {
    onDirtyChange?: (isDirty: boolean) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onDirtyChange }) => {
  const [activeTab, setActiveTab] = useState<'agency' | 'profile'>('agency');
  const [loading, setLoading] = useState(true);
  
  // -- AGENCY SETTINGS STATE --
  const [initialSettings] = useState<SystemSettings>(JSON.parse(JSON.stringify(db.getSystemSettings())));
  const [sysSettings, setSysSettings] = useState<SystemSettings>(db.getSystemSettings());
  const [isSavingAgency, setIsSavingAgency] = useState(false);
  const [saveAgencySuccess, setSaveAgencySuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // -- USER PROFILE STATE --
  const CURRENT_USER_ID = "user_1"; // Mock ID
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  const isAgencyDirty = JSON.stringify(sysSettings) !== JSON.stringify(initialSettings);

  useEffect(() => {
    if (onDirtyChange) onDirtyChange(isAgencyDirty);
  }, [isAgencyDirty]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    // Charger utilisateur actuel
    const user = db.getUserById(CURRENT_USER_ID);
    if (user) {
        setUserProfile({ ...user }); // Copie locale
    }
    setLoading(false);
  };

  // --- AGENCY HANDLERS ---

  const handleSaveAgencySettings = () => {
      setIsSavingAgency(true);
      db.updateSystemSettings(sysSettings);
      
      setTimeout(() => {
          setIsSavingAgency(false);
          setSaveAgencySuccess(true);
          window.dispatchEvent(new CustomEvent('agency-settings-updated'));
          setTimeout(() => setSaveAgencySuccess(false), 3000);
      }, 800);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        setSysSettings(prev => ({
            ...prev,
            branding: { ...prev.branding, logoUrl: reader.result as string }
        }));
    };
    reader.readAsDataURL(file);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleClearCache = () => {
    if (confirm("Voulez-vous vider les caches mémoire (réponses API, prévisualisations) ?\n\nCela ne supprime AUCUNE donnée enregistrée (Clients, Projets, etc.), seulement les données temporaires pour libérer de la mémoire.")) {
      apiRouter.clearCache();
      googleService.clearCache();
      n8nAgentService.clearCache();
      notionService.clearCache();
      alert("Cache système vidé avec succès !");
    }
  };

  // --- PROFILE HANDLERS ---

  const handleSaveProfile = () => {
      setProfileError('');
      setProfileSuccess('');

      if (!userProfile) return;
      if (!userProfile.email || !userProfile.name) {
          setProfileError("Nom et Email obligatoires.");
          return;
      }

      // Mot de passe
      const updatePayload: Partial<User> = {
          name: userProfile.name,
          email: userProfile.email,
      };

      if (newPassword) {
          if (newPassword.length < 6) {
              setProfileError("Le mot de passe doit faire au moins 6 caractères.");
              return;
          }
          if (newPassword !== confirmPassword) {
              setProfileError("Les mots de passe ne correspondent pas.");
              return;
          }
          // En prod : Hashage. Ici : Stockage mock
          updatePayload.passwordPlain = newPassword; 
          // Note: En mode mock, passwordHash est aussi mis à jour via authService.hashPassword si on passait par adminService,
          // mais ici on modifie directement le user mock.
      }

      setIsSavingProfile(true);
      
      // Simulation appel DB
      setTimeout(() => {
          db.updateUser(CURRENT_USER_ID, updatePayload);
          setNewPassword('');
          setConfirmPassword('');
          setIsSavingProfile(false);
          setProfileSuccess("Profil mis à jour avec succès.");
          setTimeout(() => setProfileSuccess(''), 3000);
      }, 800);
  };

  if (loading) return <div className="p-8 text-slate-400 flex items-center gap-2"><Loader2 className="animate-spin"/> Chargement...</div>;

  return (
    <div className="p-8 h-full overflow-y-auto max-w-5xl mx-auto space-y-8">
      
      {/* HEADER WITH TABS */}
      <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <UserCircle size={32} className="text-primary" />
                Paramètres
            </h1>
            <p className="text-slate-400 mt-2">Gérez l'identité de l'agence et vos informations personnelles.</p>
          </div>

          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700 w-fit">
              <button 
                onClick={() => setActiveTab('agency')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'agency' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                  Agence & Système
              </button>
              <button 
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                  Mon Profil
              </button>
          </div>
      </div>

      {/* --- TAB 1: AGENCY SETTINGS --- */}
      {activeTab === 'agency' && (
          <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="bg-surface border border-slate-700 rounded-[32px] p-8 shadow-2xl space-y-8">
                  <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-white flex items-center gap-3">
                          <Palette className="text-primary" size={24} /> Identité de l'Agence
                      </h2>
                      <div className="flex items-center gap-4">
                        {isAgencyDirty && (
                            <div className="hidden md:flex items-center gap-2 text-amber-400 text-xs font-bold animate-pulse">
                                <AlertCircle size={14}/> Changements non enregistrés
                            </div>
                        )}
                        <button 
                            onClick={handleSaveAgencySettings}
                            disabled={isSavingAgency || !isAgencyDirty}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-xl active:scale-95
                                ${saveAgencySuccess ? 'bg-green-600 text-white' : 
                                isAgencyDirty ? 'bg-primary hover:bg-blue-600 text-white shadow-primary/20 scale-105 ring-4 ring-primary/10' : 
                                'bg-slate-700 text-slate-500 disabled:opacity-50 cursor-not-allowed'}`}
                        >
                            {isSavingAgency ? <Loader2 size={18} className="animate-spin"/> : (saveAgencySuccess ? <CheckCircle size={18}/> : <Save size={18}/>)}
                            {isSavingAgency ? 'Enregistrement...' : (saveAgencySuccess ? 'Sauvegardé' : 'Appliquer les changements')}
                        </button>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Aperçu du Logo (Cliquez pour modifier)</label>
                          <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/png, image/jpeg" className="hidden" />
                          <div 
                            onClick={triggerUpload}
                            className="group relative flex items-center gap-6 p-6 bg-slate-900/50 rounded-2xl border border-slate-800 cursor-pointer hover:border-primary/50 transition-all overflow-hidden"
                          >
                              <BrandLogo size="lg" overrideLogo={sysSettings.branding.logoUrl} />
                              <div>
                                  <p className="text-white font-bold">{sysSettings.branding.name}</p>
                                  <p className="text-[10px] text-slate-500 font-mono">Initials: {sysSettings.branding.initials}</p>
                                  <p className="text-[9px] text-primary mt-1 font-bold uppercase tracking-wider group-hover:underline">Modifier l'image</p>
                              </div>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-widest block">Nom de l'Agence</label>
                              <input 
                                type="text" 
                                value={sysSettings.branding.name}
                                onChange={(e) => setSysSettings({ ...sysSettings, branding: { ...sysSettings.branding, name: e.target.value }})}
                                className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-primary/50 transition-all"
                              />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-widest block">Initiales (Badge)</label>
                              <input 
                                type="text" 
                                maxLength={2}
                                value={sysSettings.branding.initials}
                                onChange={(e) => setSysSettings({ ...sysSettings, branding: { ...sysSettings.branding, initials: e.target.value.toUpperCase() }})}
                                className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-primary/50 transition-all font-bold"
                              />
                          </div>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <GoogleSyncSettings />
                  
                  <div className="bg-surface border border-slate-700 rounded-[32px] p-8 shadow-2xl space-y-8">
                      <h2 className="text-xl font-bold text-white flex items-center gap-3">
                          <span className="text-amber-500"><Zap size={24} /></span> Maintenance
                      </h2>
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
                          <h3 className="font-bold text-white">Vider le cache système</h3>
                          <p className="text-sm text-slate-400 mt-2 mb-4">
                              Libère la mémoire en supprimant les réponses API temporaires, les prévisualisations d'images et les données de navigation non essentielles.
                          </p>
                          <button 
                              onClick={handleClearCache}
                              className="w-full px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-600"
                          >
                              <Trash2 size={18}/> Nettoyer Cache
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- TAB 2: USER PROFILE --- */}
      {activeTab === 'profile' && userProfile && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-surface border border-slate-700 rounded-[32px] p-8 shadow-2xl space-y-8">
                  <div className="flex items-center gap-6 pb-6 border-b border-slate-700">
                      <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-2xl font-bold text-white border-2 border-slate-600 shadow-xl overflow-hidden">
                          {userProfile.avatar ? <img src={userProfile.avatar} className="w-full h-full object-cover"/> : userProfile.name.charAt(0)}
                      </div>
                      <div>
                          <h2 className="text-2xl font-bold text-white">{userProfile.name}</h2>
                          <p className="text-slate-400 text-sm flex items-center gap-2">
                              <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-[10px] uppercase font-bold">{userProfile.role}</span>
                              {userProfile.email}
                          </p>
                      </div>
                  </div>

                  <div className="space-y-6">
                      <div className="space-y-4">
                          <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                              <UserIcon size={16} className="text-slate-500"/> Informations Personnelles
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                  <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Nom complet</label>
                                  <input 
                                      type="text" 
                                      value={userProfile.name}
                                      onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all"
                                  />
                              </div>
                              <div className="space-y-1.5">
                                  <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Adresse Email</label>
                                  <div className="relative">
                                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                                      <input 
                                          type="email" 
                                          value={userProfile.email}
                                          onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                                          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary outline-none transition-all"
                                      />
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-700/50">
                          <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                              <Lock size={16} className="text-slate-500"/> Sécurité
                          </h3>
                          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-4">
                              <div className="space-y-1.5">
                                  <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Nouveau mot de passe</label>
                                  <div className="relative">
                                      <input 
                                          type={showPassword ? "text" : "password"}
                                          value={newPassword}
                                          onChange={(e) => setNewPassword(e.target.value)}
                                          placeholder="Laisser vide pour ne pas changer"
                                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all pr-10"
                                      />
                                      <button 
                                          type="button"
                                          onClick={() => setShowPassword(!showPassword)}
                                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                      >
                                          {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                      </button>
                                  </div>
                              </div>
                              {newPassword && (
                                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                                      <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Confirmer le mot de passe</label>
                                      <input 
                                          type="password"
                                          value={confirmPassword}
                                          onChange={(e) => setConfirmPassword(e.target.value)}
                                          placeholder="Répétez le mot de passe"
                                          className={`w-full bg-slate-900 border rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all ${newPassword !== confirmPassword ? 'border-red-500/50' : 'border-slate-700'}`}
                                      />
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* FEEDBACK MESSAGES */}
                      {profileError && (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                              <AlertCircle size={16}/> {profileError}
                          </div>
                      )}
                      {profileSuccess && (
                          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400 flex items-center gap-2">
                              <CheckCircle size={16}/> {profileSuccess}
                          </div>
                      )}

                      <div className="pt-6 flex justify-end">
                          <button 
                              onClick={handleSaveProfile}
                              disabled={isSavingProfile}
                              className="bg-primary hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                          >
                              {isSavingProfile ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                              Enregistrer mon profil
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
