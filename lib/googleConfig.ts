
/**
 * CONFIGURATION OAUTH 2.0 GOOGLE
 */
export const GOOGLE_CONFIG = {
  CLIENT_ID: '',
  CLIENT_SECRET: '',
  REDIRECT_URI: '',
  
  SCOPES: [
    'openid',
    'email',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive'
  ]
};

export const checkGoogleConfig = () => {
  return !!(GOOGLE_CONFIG.CLIENT_ID && GOOGLE_CONFIG.CLIENT_SECRET && GOOGLE_CONFIG.REDIRECT_URI);
};
