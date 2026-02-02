
import { NextResponse } from 'next/server';
import { db } from '../../../../../services/mockDatabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const settings = db.getSystemSettings();
  const { clientId, redirectUri } = settings.google;

  if (!clientId || !redirectUri) {
      return NextResponse.json({ error: "Configuration Google OAuth incomplète (Admin Settings)." }, { status: 500 });
  }
  
  // Scopes requis pour l'application
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets'
  ].join(' ');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('access_type', 'offline'); // CRUCIAL pour obtenir le Refresh Token
  authUrl.searchParams.set('prompt', 'consent'); // Force le consentement pour ravoir le refresh token si perdu
  authUrl.searchParams.set('state', userId); // Passage simple du userId comme state (En prod: utiliser un token signé)
  
  return NextResponse.redirect(authUrl.toString());
}
