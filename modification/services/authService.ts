
import { supabase } from '../lib/supabaseClient';
import { db } from './mockDatabase';
import { User, UserRole } from '../types';

const STORAGE_KEY_ACCOUNTS = 'sb_accounts_history';

export class AuthService {

  /**
   * Login via Supabase Auth
   */
  async login(email: string, password: string): Promise<User> {
    
    // SÉCURITÉ : Si des clés Supabase sont présentes dans l'environnement, on REFUSE le mode Mock.
    // Cela empêche tout contournement de l'auth en production.
    const isSupabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabase) {
        if (isSupabaseConfigured) {
            throw new Error("Erreur critique : Client Supabase non initialisé malgré la configuration présente.");
        }
        console.warn("Supabase non configuré, utilisation du Mock Auth (Dev Mode uniquement).");
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
   * MODIFIÉ : Crée automatiquement l'utilisateur s'il n'existe pas pour faciliter les tests.
   */
  private async mockLogin(email: string, password: string): Promise<User> {
      await new Promise(r => setTimeout(r, 500));
      let user = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
      
      // Auto-création en mode Mock pour éviter le blocage
      if (!user) {
          console.log(`[MockAuth] Nouvel utilisateur détecté, création automatique du profil pour : ${email}`);
          user = {
              id: `mock_user_${Date.now()}`,
              email: email,
              name: email.split('@')[0], // ex: "jean" pour "jean@gmail.com"
              role: UserRole.ADMIN, // On donne les droits ADMIN par défaut en mode dev pour faciliter les tests
              status: 'active',
              allowedViews: ['dashboard', 'chat', 'clients', 'projects', 'invoices', 'settings', 'admin', 'images', 'videos', 'library', 'prospection', 'news'],
              createdAt: new Date().toISOString()
          };
          db.createUser(user);
      }
      
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