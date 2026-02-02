import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration via variables d'environnement (Next.js)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Client Supabase singleton
 * Utilise les variables d'environnement pour la configuration
 */
let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (typeof window === 'undefined') {
    // Côté serveur, créer une nouvelle instance si configuré
    if (supabaseUrl && supabaseAnonKey) {
      return createClient(supabaseUrl, supabaseAnonKey);
    }
    return null;
  }

  // Côté client, utiliser le singleton
  if (!supabaseInstance && supabaseUrl && supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseInstance;
};

// Export pour compatibilité avec le code existant
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Vérifie si Supabase est configuré via les variables d'environnement
 */
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey);
};

/**
 * Test de connexion approfondi à Supabase
 */
export const testSupabaseConnection = async (): Promise<{
  ok: boolean;
  error?: string;
  mode: string;
  latency?: number;
  status?: string | number;
}> => {
  const client = getSupabaseClient();

  if (!client) {
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        ok: false,
        error: "Configuration Supabase manquante. Définissez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        mode: 'Non configuré'
      };
    }
    return {
      ok: false,
      error: "Client Supabase non initialisé.",
      mode: 'Mock/Offline'
    };
  }

  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();

  try {
    // Test de connexion simple
    const { data, error, status } = await client.from('clients').select('id').limit(1);
    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // 42P01 = table non définie - on peut se connecter mais la table manque
    // C'est un "succès" pour le test de connectivité
    if (error && error.code !== '42P01') {
      return {
        ok: false,
        status,
        error: error.message,
        mode: 'Cloud (Erreur)'
      };
    }

    return {
      ok: true,
      latency: Math.round(end - start),
      mode: 'Cloud (Connecté)',
      status: 'Ready'
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur réseau Supabase ou URL invalide.",
      mode: 'Erreur Réseau'
    };
  }
};

/**
 * Récupère l'URL publique de Supabase pour les uploads
 */
export const getSupabasePublicUrl = (bucket: string, path: string): string | null => {
  if (!supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
};
