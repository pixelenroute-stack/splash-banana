
import { createClient } from '@supabase/supabase-js';
import { db } from '../services/mockDatabase';

// Get settings from the mock database, which holds the user's config
const settings = db.getSystemSettings();
const supabaseUrl = settings.storage.mode === 'supabase' ? settings.library.supabaseUrl : undefined;
const supabaseAnonKey = settings.storage.mode === 'supabase' ? settings.library.supabaseAnonKey : undefined;


/**
 * RÉSOLUTION DU CLIENT SUPABASE
 * Le client est initialisé si le mode est 'supabase' ET que les identifiants sont présents.
 */
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

/**
 * Vérifie si Supabase est réellement prêt.
 */
export const isSupabaseConfigured = () => {
  return !!supabase;
};

/**
 * Test de connexion approfondi.
 */
export const testSupabaseConnection = async () => {
  if (!supabase) {
    const currentSettings = db.getSystemSettings(); // Re-check current settings
    if (currentSettings.storage.mode !== 'supabase') {
        return {
            ok: true,
            error: "Le mode de persistance n'est pas Supabase.",
            mode: 'Mock/Offline'
        };
    }
    return { 
      ok: false, 
      error: "Configuration Supabase manquante ou invalide (URL ou Clé API).",
      mode: 'Mock/Offline'
    };
  }
  
  const start = performance.now();
  try {
    const { data, error, status } = await supabase.from('clients').select('id').limit(1);
    const end = performance.now();

    // 42P01 = undefined_table. We can connect, but table is missing. That's a "success" for connectivity test.
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
      error: "Erreur réseau Supabase ou URL invalide.",
      mode: 'Erreur Réseau'
    };
  }
};
