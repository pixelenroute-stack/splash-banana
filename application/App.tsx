
import React, { useState, useEffect } from 'react';
import { Sidebar, NAV_ITEMS } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ChatInterface } from './components/ChatInterface';
import { Moodboard } from './components/AssetGallery';
import { ImageStudio } from './components/image-studio/ImageStudio';
import { VideoStudio } from './components/video-studio/VideoStudio'; 
import { MediaLibrary } from './components/library/MediaLibrary'; 
import { SocialFactory } from './components/SocialFactory';
import { NewsDashboard } from './components/NewsDashboard'; 
import { ClientList } from './components/ClientList';
import { ProjectList } from './components/ProjectList';
import { Billing } from './components/Billing';
import { Settings } from './components/Settings';
import { GoogleWorkspace } from './components/google/GoogleWorkspace';
import { AdminConsole } from './components/AdminConsole';
import { InviteAcceptFlow } from './components/InviteAcceptFlow';
import { BrandLogo } from './components/BrandLogo';
import { StargateBackground } from './components/backgrounds/StargateBackground';
import { NotificationProvider } from './context/NotificationContext'; 
import { ProspectionHub } from './components/prospection/ProspectionHub'; 
import { DevToolbar } from './components/DevToolbar'; 

import { authService } from './services/authService';
import { db } from './services/mockDatabase';
import { autoSyncService } from './services/autoSyncService';
import { backupService } from './services/backupService';
import { User, UserRole } from './types';
import { Loader2, ArrowRight, Shield, Lock, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  // MODIFICATION : Initialisation à null pour forcer le Login
  const [user, setUser] = useState<User | null>(null);

  const [currentView, setCurrentView] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [loginEmail, setLoginEmail] = useState('pixelenroute@gmail.com');
  const [loginPass, setLoginPass] = useState('Victoria&8530');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [isPublicInviteMode, setIsPublicInviteMode] = useState(false);

  // Récupération des settings pour le mode App
  const settings = db.getSystemSettings();
  const isDevMode = settings.appMode === 'developer';

  // --- THEME INJECTION ---
  useEffect(() => {
      const primary = settings.branding.primaryColor || '#3b82f6';
      // Création/MAJ d'une balise style pour surcharger les classes tailwind critiques
      const styleId = 'dynamic-theme-style';
      let styleTag = document.getElementById(styleId);
      if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = styleId;
          document.head.appendChild(styleTag);
      }
      
      styleTag.innerHTML = `
        :root { --primary-color: ${primary}; }
        .bg-primary { background-color: ${primary} !important; }
        .text-primary { color: ${primary} !important; }
        .border-primary { border-color: ${primary} !important; }
        .ring-primary { --tw-ring-color: ${primary} !important; }
        .shadow-primary\\/20 { --tw-shadow-color: ${primary}33 !important; }
      `;
  }, [settings.branding.primaryColor]);

  // Initialisation des services d'arrière-plan
  useEffect(() => {
      if (user) {
          // Démarrer la synchro toutes les 5 minutes
          autoSyncService.start(300000);
          // Démarrer le backup auto toutes les 60 minutes
          backupService.startAutoBackup(60);
      } else {
          autoSyncService.stop();
          backupService.stopAutoBackup();
      }
      return () => {
          autoSyncService.stop();
          backupService.stopAutoBackup();
      };
  }, [user]);

  // Détection du mode invitation via l'URL
  useEffect(() => {
    const handleInitialRoute = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#join')) {
        setIsPublicInviteMode(true);
      }
    };
    handleInitialRoute();
    window.addEventListener('hashchange', handleInitialRoute);
    return () => window.removeEventListener('hashchange', handleInitialRoute);
  }, []);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setRefreshKey(prev => prev + 1);
      setHasUnsavedChanges(false);
    };
    window.addEventListener('agency-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('agency-settings-updated', handleSettingsUpdate);
  }, []);

  // Gestion du changement de mode (Developer <-> Production) sans rechargement de page
  useEffect(() => {
    const handleModeChange = (event: CustomEvent<{ mode: string }>) => {
      console.log('[App] Mode changed to:', event.detail.mode);
      // Force le rafraîchissement des composants sans perdre la session utilisateur
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('app-mode-changed', handleModeChange as EventListener);
    return () => window.removeEventListener('app-mode-changed', handleModeChange as EventListener);
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && NAV_ITEMS.some(item => item.id === hash)) {
        handleNavigate(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); 

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [hasUnsavedChanges]);

  const handleNavigate = (viewId: string) => {
      if (viewId === currentView) return;
      
      if (hasUnsavedChanges) {
          const confirmLeave = window.confirm("⚠️ Attention : Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter cette page et perdre vos changements ?");
          if (!confirmLeave) {
              window.location.hash = `#${currentView}`;
              return;
          }
          setHasUnsavedChanges(false);
      }
      setCurrentView(viewId);
      window.location.hash = `#${viewId}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoggingIn(true);
      setLoginError(null);
      try {
          const u = await authService.login(loginEmail, loginPass);
          setUser(u);
      } catch (err) {
          setLoginError((err as Error).message);
      } finally {
          setIsLoggingIn(false);
      }
  };

  const handleLogout = async () => {
      await authService.logout();
      setUser(null);
      setLoginPass('Victoria&8530'); 
      setLoginEmail('pixelenroute@gmail.com'); 
  };

  const handleSwitchAccount = async (targetEmail?: string) => {
      await authService.logout();
      setUser(null);
      setLoginPass('');
      setLoginEmail(targetEmail || ''); 
  };

  const canAccessView = (viewId: string) => {
      if (!user) return false;
      
      // SÉCURITÉ STRICTE : Bloquer l'accès 'admin' si le rôle n'est pas ADMIN
      if (viewId === 'admin' && user.role !== 'ADMIN') return false;

      if (user.role === 'ADMIN') return true;
      if (!user.allowedViews) return !['admin'].includes(viewId);
      return user.allowedViews.includes(viewId);
  };

  if (isPublicInviteMode) {
      return (
          <div className="h-screen bg-background text-slate-100 relative">
              <StargateBackground />
              <div className="relative z-10 h-full flex items-center justify-center">
                <InviteAcceptFlow onComplete={() => {
                    setIsPublicInviteMode(false);
                    window.location.hash = '';
                }} />
              </div>
          </div>
      );
  }

  if (!user) {
      // CUSTOM LOGIN BACKGROUND HANDLING
      const customBg = settings.branding.loginBackgroundUrl;
      const bgStyle = customBg ? { backgroundImage: `url(${customBg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {};

      return (
          <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden" style={bgStyle}>
              {!customBg && <StargateBackground />}
              {customBg && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0" />}
              
              <div className="bg-surface/80 backdrop-blur-md border border-slate-700/50 p-8 rounded-2xl max-w-sm w-full shadow-2xl z-20 relative animate-in fade-in zoom-in duration-500">
                  <div className="flex justify-center mb-6">
                      <BrandLogo size="lg" />
                  </div>
                  <h1 className="text-2xl font-bold text-white text-center mb-1">
                      {settings.branding.welcomeMessage || "Bon retour"}
                  </h1>
                  <p className="text-slate-400 text-center mb-8 text-sm">
                      {settings.branding.welcomeSubtitle || "Connectez-vous à votre espace."}
                  </p>
                  <form onSubmit={handleLogin} className="space-y-4">
                      <input 
                        type="email" required value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-primary transition-colors"
                        placeholder="Email"
                      />
                      <input 
                        type="password" required value={loginPass}
                        onChange={(e) => setLoginPass(e.target.value)}
                        className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-primary transition-colors"
                        placeholder="Mot de passe"
                      />
                      {loginError && <p className="text-red-400 text-xs text-center">{loginError}</p>}
                      <button type="submit" className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                          {isLoggingIn ? <Loader2 size={18} className="animate-spin" /> : <>Se connecter <ArrowRight size={18}/></>}
                      </button>
                  </form>
              </div>
          </div>
      );
  }

  const renderContent = () => {
    if (!canAccessView(currentView)) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <Shield size={48} className="text-slate-600 mb-4"/>
                <h2 className="text-xl font-bold text-white mb-2">Accès non autorisé</h2>
                <p>Vous n'avez pas les permissions nécessaires pour accéder à cette section.</p>
            </div>
        );
    }

    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'chat': return <ChatInterface />;
      case 'news': return <NewsDashboard />; 
      case 'workspace': return <GoogleWorkspace />; 
      case 'prospection': return <ProspectionHub />; 
      case 'clients': return <ClientList />;
      case 'projects': return <ProjectList />;
      case 'invoices': return <Billing />;
      case 'settings': return <Settings onDirtyChange={setHasUnsavedChanges} />;
      case 'images': return <ImageStudio />; 
      case 'videos': return <VideoStudio />; 
      case 'social_factory': return <SocialFactory />; 
      case 'library': return <MediaLibrary />; 
      case 'scripts': return <Moodboard />; 
      case 'admin': return <AdminConsole onDirtyChange={setHasUnsavedChanges} />;
      default: return <Dashboard />;
    }
  };

  return (
    <NotificationProvider>
        {/* APP CONTAINER : Gère le Background selon le mode */}
        <div className={`flex h-screen overflow-hidden text-slate-100 ${isDevMode ? 'bg-dev-gradient' : 'bg-background'}`}>
            
            {/* OVERLAY LÉGER POUR LE MODE DEV (20% Opacity + Blur pour garder la couleur visible) */}
            {isDevMode && <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] pointer-events-none z-0" />}

            <div className="flex w-full h-full relative z-10">
                <Sidebar 
                    currentView={currentView} 
                    setView={handleNavigate} 
                    user={user} 
                    onLogout={handleLogout} 
                    onSwitchAccount={handleSwitchAccount} 
                />
                <main className="flex-1 flex flex-col relative overflow-hidden">
                    {hasUnsavedChanges && (
                        <div className="bg-amber-500/20 border-b border-amber-500/30 px-6 py-2 flex items-center gap-3 text-amber-400 text-[10px] font-bold uppercase tracking-widest animate-in slide-in-from-top duration-300 z-50">
                            <AlertTriangle size={12}/> Modifications non enregistrées en cours...
                        </div>
                    )}
                    {renderContent()}
                    <DevToolbar /> 
                </main>
            </div>
        </div>
    </NotificationProvider>
  );
};

export default App;
