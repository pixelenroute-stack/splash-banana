
import React from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  FolderKanban,
  FileText, 
  Image as ImageIcon, 
  Video, 
  Briefcase, 
  Settings,
  Shield,
  Grid,
  Globe,
  Sparkles,
  Cloud,
  CheckCircle2,
  Target,
  Share2,
  Newspaper
} from 'lucide-react';
import { User } from '../types';
import { UserMenu } from './UserMenu';
import { BrandLogo } from './BrandLogo';
import { db } from '../services/mockDatabase';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  user: User;
  onLogout: () => void;
  onSwitchAccount: (email?: string) => void;
}

type CategoryType = 'general' | 'creator' | 'management' | 'admin_section';

const CATEGORY_LABELS: Record<CategoryType, string> = {
  general: 'Général',
  creator: 'Creator IA',
  management: 'Gestion & Workspace',
  admin_section: 'Administration'
};

export const NAV_ITEMS = [
  // SECTION: GENERAL
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'general' as CategoryType },
  { id: 'chat', label: 'Studio Chat (IA)', icon: MessageSquare, highlight: true, category: 'general' as CategoryType },
  { id: 'news', label: 'Actualités & Veille', icon: Newspaper, category: 'general' as CategoryType },
  
  // SECTION: CREATOR IA
  { id: 'scripts', label: 'Monteur Vidéo', icon: Grid, category: 'creator' as CategoryType },
  { id: 'social_factory', label: 'Social Factory', icon: Share2, category: 'creator' as CategoryType },
  { id: 'images', label: 'Images (Banana)', icon: ImageIcon, category: 'creator' as CategoryType },
  { id: 'videos', label: 'Vidéos (Veo)', icon: Video, category: 'creator' as CategoryType },
  { id: 'library', label: 'Bibliothèque', icon: Grid, category: 'creator' as CategoryType },

  // SECTION: MANAGEMENT
  { id: 'prospection', label: 'Prospection', icon: Target, category: 'management' as CategoryType }, 
  { id: 'google_workspace', label: 'Google Workspace', icon: Globe, category: 'management' as CategoryType },
  { id: 'clients', label: 'Clients (CRM)', icon: Users, category: 'management' as CategoryType },
  { id: 'projects', label: 'Projets (Production)', icon: FolderKanban, category: 'management' as CategoryType },
  { id: 'invoices', label: 'Service RH', icon: Briefcase, category: 'management' as CategoryType },
  
  // SECTION: ADMIN
  { id: 'settings', label: 'Paramètres', icon: Settings, category: 'admin_section' as CategoryType },
  { id: 'admin', label: 'Admin Console', icon: Shield, adminOnly: true, category: 'admin_section' as CategoryType },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, user, onLogout, onSwitchAccount }) => {
  const isAdmin = user.role === 'ADMIN';
  const settings = db.getSystemSettings();

  const canView = (itemId: string, adminOnly?: boolean) => {
    // SÉCURITÉ STRICTE : Si l'item est 'admin', SEUL le rôle ADMIN passe.
    // Cela surcharge toute configuration 'allowedViews' erronée.
    if (itemId === 'admin' && !isAdmin) return false;

    if (adminOnly && !isAdmin) return false;
    if (isAdmin) return true; 
    
    // Pour les autres rôles, on vérifie les vues autorisées
    if (!user.allowedViews) return !['admin', 'settings', 'invoices'].includes(itemId);
    return user.allowedViews.includes(itemId);
  };

  let lastCategory: string | null = null;

  return (
    <div className="w-64 h-screen bg-surface border-r border-slate-700 flex flex-col text-sm flex-shrink-0">
      <div className="p-6 flex items-center gap-3 border-b border-slate-700">
        <BrandLogo size="sm" />
        <span className="text-lg font-bold tracking-tight text-white leading-tight">
            {settings.branding.name}
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          if (!canView(item.id, item.adminOnly)) return null;
          
          const isActive = currentView === item.id;
          const Icon = item.icon;
          const showCategory = item.category && item.category !== lastCategory;
          if (showCategory) lastCategory = item.category;

          return (
            <React.Fragment key={item.id}>
              {showCategory && (
                <div className="px-3 pt-6 pb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                    {CATEGORY_LABELS[item.category as CategoryType]}
                  </span>
                </div>
              )}
              <button
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative
                  ${isActive 
                    ? 'bg-primary text-white font-medium shadow-lg shadow-primary/20' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }
                  ${item.highlight && !isActive ? 'text-indigo-400 hover:bg-indigo-500/10' : ''}
                `}
              >
                <Icon size={18} className={isActive ? 'text-white' : (item.highlight ? 'text-indigo-400' : 'text-slate-500 group-hover:text-white')} />
                <span>{item.label}</span>
                {item.highlight && !isActive && (
                  <span className="absolute right-2 w-2 h-2 rounded-full bg-indigo-500"></span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* FOOTER SYNC STATUS */}
      <div className="px-6 py-2">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              <Cloud size={10} className="text-green-500"/>
              <span>Auto-Save Activé</span>
          </div>
          <p className="text-[9px] text-slate-600 mt-0.5 ml-4">Sync Drive & APIs toutes les 5min</p>
      </div>

      <div className="p-4 border-t border-slate-700">
        <UserMenu 
            user={user} 
            onLogout={onLogout} 
            onSwitchAccount={onSwitchAccount} 
            onNavigate={setView} // Ajouté ici
        />
      </div>
    </div>
  );
};
