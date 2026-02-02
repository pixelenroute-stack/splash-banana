
import React, { useState, useRef, useEffect } from 'react';
import { User, AccountHistoryItem } from '../types';
import { authService } from '../services/authService';
import { 
  LogOut, UserCircle, Users, Plus, ChevronRight, Check, X, Settings
} from 'lucide-react';

interface UserMenuProps {
  user: User;
  onLogout: () => void;
  onSwitchAccount: (targetEmail?: string) => void;
  onNavigate: (view: string) => void; // Ajout de la prop de navigation
}

export const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout, onSwitchAccount, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [history, setHistory] = useState<AccountHistoryItem[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
        setHistory(authService.getHistory());
    } else {
        setShowAccounts(false);
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAccountClick = (email: string) => {
      if (email === user.email) return; // Already connected
      onSwitchAccount(email);
  };

  const handleRemoveAccount = (e: React.MouseEvent, email: string) => {
      e.stopPropagation();
      authService.removeFromHistory(email);
      setHistory(prev => prev.filter(a => a.email !== email));
  };

  const handleNavigateToProfile = () => {
      onNavigate('settings');
      setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* TRIGGER */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-left"
      >
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden border border-slate-500">
            {user.avatar ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover"/> : user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-white text-xs font-medium truncate">{user.name}</span>
            <span className="text-slate-500 text-[10px] truncate">{user.role}</span>
          </div>
          <Settings size={14} className="text-slate-500" />
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-surface border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                <p className="text-xs text-slate-400">Connecté en tant que</p>
                <p className="text-sm font-bold text-white truncate">{user.email}</p>
            </div>

            {/* Main Options */}
            {!showAccounts ? (
                <div className="p-2 space-y-1">
                    <button 
                        onClick={handleNavigateToProfile}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <UserCircle size={16} />
                        Mon Compte
                    </button>
                    
                    <button 
                        onClick={() => setShowAccounts(true)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <Users size={16} />
                            Changer de compte
                        </div>
                        <ChevronRight size={14} className="text-slate-600 group-hover:text-white" />
                    </button>
                    
                    <div className="h-px bg-slate-700 my-1 mx-2"></div>
                    
                    <button 
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                        <LogOut size={16} />
                        Se déconnecter
                    </button>
                </div>
            ) : (
                /* Accounts List View */
                <div className="p-2 space-y-1">
                     <div className="flex items-center justify-between px-2 py-1 mb-2">
                         <span className="text-xs font-bold text-slate-400 uppercase">Vos comptes</span>
                         <button onClick={() => setShowAccounts(false)} className="text-xs text-primary hover:underline">Retour</button>
                     </div>

                     <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                         {history.map(acc => {
                             const isActive = acc.email === user.email;
                             return (
                                <div 
                                    key={acc.email}
                                    onClick={() => handleAccountClick(acc.email)}
                                    className={`relative flex items-center gap-3 p-2 rounded-lg cursor-pointer group border border-transparent
                                        ${isActive ? 'bg-primary/10 border-primary/20' : 'hover:bg-slate-700 border-slate-700/0'}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
                                        {acc.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-xs font-bold truncate ${isActive ? 'text-primary' : 'text-slate-200'}`}>{acc.name}</div>
                                        <div className="text-[10px] text-slate-500 truncate">{acc.email}</div>
                                    </div>
                                    {isActive && <Check size={14} className="text-primary"/>}
                                    {!isActive && (
                                        <button 
                                            onClick={(e) => handleRemoveAccount(e, acc.email)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 hover:bg-slate-600 rounded transition-all"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                             );
                         })}
                     </div>

                     <button 
                        onClick={() => onSwitchAccount()}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors mt-2 border-t border-slate-700 pt-3"
                    >
                        <div className="w-8 h-8 rounded-full border border-dashed border-slate-500 flex items-center justify-center">
                            <Plus size={14} />
                        </div>
                        Ajouter un compte
                    </button>
                </div>
            )}
        </div>
      )}
    </div>
  );
};
