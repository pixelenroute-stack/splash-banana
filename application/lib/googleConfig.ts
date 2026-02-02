/**
 * CONFIGURATION OAUTH 2.0 GOOGLE
 * Les valeurs sont lues depuis les variables d'environnement
 */

// Fonction pour obtenir la config côté client (uniquement les valeurs publiques)
export const getGoogleConfig = () => {
  // Côté serveur, on utilise process.env directement
  // Côté client, on utilise les variables NEXT_PUBLIC_*
  const isServer = typeof window === 'undefined';

  return {
    CLIENT_ID: isServer
      ? process.env.GOOGLE_CLIENT_ID || ''
      : process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',

    // Le secret ne doit JAMAIS être exposé côté client
    CLIENT_SECRET: isServer ? process.env.GOOGLE_CLIENT_SECRET || '' : '',

    REDIRECT_URI: isServer
      ? process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
      : `${window.location.origin}/api/auth/google/callback`,

    SCOPES: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/drive.file'
    ]
  };
};

// Export statique pour compatibilité (utilise les valeurs d'environnement)
export const GOOGLE_CONFIG = {
  get CLIENT_ID() { return getGoogleConfig().CLIENT_ID; },
  get CLIENT_SECRET() { return getGoogleConfig().CLIENT_SECRET; },
  get REDIRECT_URI() { return getGoogleConfig().REDIRECT_URI; },
  SCOPES: [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive.file'
  ]
};

export const checkGoogleConfig = (): boolean => {
  const config = getGoogleConfig();
  const isConfigured = !!(config.CLIENT_ID && config.CLIENT_SECRET);

  if (!isConfigured && typeof window === 'undefined') {
    console.warn('[GoogleConfig] Configuration incomplète. Définissez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET.');
  }

  return isConfigured;
};

/**
 * Génère l'URL d'autorisation Google OAuth
 */
export const getGoogleAuthUrl = (state?: string): string => {
  const config = getGoogleConfig();

  if (!config.CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID non configuré');
  }

  const params = new URLSearchParams({
    client_id: config.CLIENT_ID,
    redirect_uri: config.REDIRECT_URI,
    response_type: 'code',
    scope: config.SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    ...(state && { state })
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};
