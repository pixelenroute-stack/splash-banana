
import { supabase } from '../lib/supabaseClient';
import { db } from './mockDatabase';
import { User } from '../types';

const STORAGE_KEY_ACCOUNTS = 'sb_accounts_history';

export class AuthService {

  /**
   * Login via Supabase Auth
   */
  async login(email: string, password: string): Promise<User> {
    
    // Si Supabase n'est pas configuré, fallback local (legacy mode dev)
    if (!supabase) {
        console.warn("Supabase non configuré, utilisation du Mock Auth.");
        return this.mockLogin(email, password);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Erreur inconnue lors de la connexion.");

    // Récupération du profil enrichi
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

    const user: User = {
        id: data.user.id,
        email: data.user.email!,
        name: profile?.name || data.user.user_metadata?.name || 'Utilisateur',
        role: profile?.role || 'COLLABORATOR',
        status: 'active',
        allowedViews: profile?.allowed_views || ['dashboard', 'chat'],
        createdAt: data.user.created_at
    };

    // Historique local pour le switch rapide
    this.addToHistory({
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      lastUsedAt: new Date().toISOString()
    });

    return user;
  }

  /**
   * Méthode Legacy pour Dev Mode sans internet
   */
  private async mockLogin(email: string, password: string): Promise<User> {
      await new Promise(r => setTimeout(r, 500));
      const user = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) throw new Error("Compte inexistant (Mock).");
      // Accepte le mot de passe hardcodé ou tout mot de passe en mode dev
      return user;
  }

  /**
   * Logout réel
   */
  async logout() {
    if (supabase) {
        await supabase.auth.signOut();
    }
    return true;
  }

  /**
   * Récupération session courante au chargement
   */
  async getCurrentUser(): Promise<User | null> {
      if (!supabase) return null;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      return {
        id: session.user.id,
        email: session.user.email!,
        name: profile?.name || 'Utilisateur',
        role: profile?.role || 'COLLABORATOR',
        status: 'active',
        allowedViews: profile?.allowed_views || [],
        createdAt: session.user.created_at
      };
  }

  // --- ACCOUNT SWITCHING HISTORY (Local Storage) ---

  getHistory(): any[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private addToHistory(account: any) {
    if (typeof window === 'undefined') return;
    const history = this.getHistory();
    const filtered = history.filter(a => a.email !== account.email);
    filtered.unshift(account);
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(filtered.slice(0, 5)));
  }

  removeFromHistory(email: string) {
      if (typeof window === 'undefined') return;
      const history = this.getHistory().filter(a => a.email !== email);
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(history));
  }
  
  // Hashage legacy pour compatibilité
  async hashPassword(password: string): Promise<string> {
      return "managed_by_supabase"; 
  }
}

export const authService = new AuthService();
