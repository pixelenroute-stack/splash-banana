import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Variables d'environnement pour Supabase (côté client)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Client Supabase singleton
 * Initialisé uniquement si les variables d'environnement sont présentes
 */
let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (supabaseUrl && supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    return supabaseInstance;
  }

  return null;
};

// Export du client pour compatibilité avec le code existant
export const supabase = getSupabaseClient();

/**
 * Vérifie si Supabase est configuré et prêt
 */
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey);
};

/**
 * Test de connexion Supabase
 */
export const testSupabaseConnection = async (): Promise<{
  ok: boolean;
  latency?: number;
  error?: string;
  mode: string;
  status?: string;
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
      mode: 'Erreur'
    };
  }

  const start = performance.now();

  try {
    // Test avec une requête simple sur la table system_settings
    const { data, error } = await client
      .from('system_settings')
      .select('id')
      .limit(1);

    const end = performance.now();

    if (error) {
      // 42P01 = table inexistante - c'est OK pour le test de connectivité
      if (error.code === '42P01') {
        return {
          ok: true,
          latency: Math.round(end - start),
          mode: 'Cloud (Connecté)',
          status: 'Tables non initialisées'
        };
      }

      return {
        ok: false,
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
      error: err instanceof Error ? err.message : "Erreur réseau Supabase",
      mode: 'Erreur Réseau'
    };
  }
};
