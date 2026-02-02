import { NextResponse } from 'next/server';
import { db } from '../../../../../services/mockDatabase';
import { encrypt } from '../../../../../lib/encryption';
import { GoogleAccount } from '../../../../../types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const userId = searchParams.get('state');
  const origin = new URL(request.url).origin;

  if (error) {
    return NextResponse.redirect(new URL(`/#workspace?google_error=${error}`, origin));
  }

  if (!code || !userId) {
    return NextResponse.json({ error: 'Paramètres manquants (code ou state)' }, { status: 400 });
  }

  try {
    // Configuration depuis les variables d'environnement
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      throw new Error("Configuration OAuth serveur manquante. Définissez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET.");
    }

    // 1. Échange du code contre les tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      throw new Error(`Google Token Error: ${tokens.error_description || tokens.error}`);
    }

    // 2. Récupération infos utilisateur
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const userData = await userRes.json();

    // 3. Chiffrement et stockage
    const account: GoogleAccount = {
      userId,
      googleUserId: userData.id,
      email: userData.email,
      accessTokenEncrypted: encrypt(tokens.access_token),
      refreshTokenEncrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : '',
      tokenExpiryDate: Date.now() + (tokens.expires_in * 1000),
      scopes: tokens.scope ? tokens.scope.split(' ') : [],
      lastSyncedAt: new Date().toISOString(),
      status: 'connected'
    };

    // Conserver l'ancien refresh token si pas de nouveau
    if (!account.refreshTokenEncrypted) {
      const oldAccount = db.getGoogleAccount(userId);
      if (oldAccount && oldAccount.refreshTokenEncrypted) {
        account.refreshTokenEncrypted = oldAccount.refreshTokenEncrypted;
      }
    }

    // Sauvegarde côté serveur (pour les API routes qui peuvent y accéder)
    db.saveGoogleAccount(userId, account);

    // Encoder les données du compte pour que le client puisse les sauvegarder dans localStorage
    // On passe les données encodées en base64 pour que le client puisse les persister
    const accountData = Buffer.from(JSON.stringify(account)).toString('base64');

    // Redirection vers Google Workspace avec les données du compte
    return NextResponse.redirect(new URL(`/#workspace?google_auth=success&account_data=${encodeURIComponent(accountData)}`, origin));

  } catch (err: any) {
    console.error("Auth Callback Error:", err);
    return NextResponse.redirect(new URL(`/#workspace?google_error=${encodeURIComponent(err.message)}`, origin));
  }
}
