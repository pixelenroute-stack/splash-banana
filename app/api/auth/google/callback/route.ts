
import { NextResponse } from 'next/server';
import { db } from '../../../../../services/mockDatabase';
import { encrypt } from '../../../../../lib/encryption';
import { GoogleAccount } from '../../../../../types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const userId = searchParams.get('state'); // On récupère le userId passé au début

  if (error) {
    return NextResponse.redirect(new URL(`/settings?google_error=${error}`, request.url));
  }

  if (!code || !userId) {
    return NextResponse.json({ error: 'Paramètres manquants (code ou state)' }, { status: 400 });
  }

  try {
    const settings = db.getSystemSettings();
    const { clientId, clientSecret, redirectUri } = settings.google;

    if (!clientId || !clientSecret) {
        throw new Error("Configuration OAuth serveur manquante.");
    }

    // 1. Echange du code contre tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri || `${new URL(request.url).origin}/api/auth/google/callback`, // Fallback robuste
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
        throw new Error(`Google Token Error: ${tokens.error_description}`);
    }

    // 2. Récupération infos utilisateur
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const userData = await userRes.json();

    // 3. Chiffrement et Stockage
    // Note: Dans une vraie architecture, on stockerait ça dans Supabase/Postgres.
    // Ici on met à jour la "db" mockée qui est partagée en mémoire ou synchronisée.
    // Pour que le client (navigateur) récupère ces infos, on va rediriger avec un paramètre de succès,
    // et le client rechargera son état via l'API /status.
    
    const account: GoogleAccount = {
        userId,
        googleUserId: userData.id,
        email: userData.email,
        // CHIFFREMENT AES-256-GCM
        accessTokenEncrypted: encrypt(tokens.access_token),
        refreshTokenEncrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : '', // Peut être vide si déjà connecté sans prompt=consent
        tokenExpiryDate: Date.now() + (tokens.expires_in * 1000),
        scopes: tokens.scope ? tokens.scope.split(' ') : [],
        lastSyncedAt: new Date().toISOString(),
        status: 'connected'
    };

    // Si on n'a pas eu de refresh token (reconnexion simple), on essaie de garder l'ancien s'il existe
    if (!account.refreshTokenEncrypted) {
        const oldAccount = db.getGoogleAccount(userId);
        if (oldAccount && oldAccount.refreshTokenEncrypted) {
            account.refreshTokenEncrypted = oldAccount.refreshTokenEncrypted;
        }
    }

    // Sauvegarde "Serveur" (Ici simulée sur l'instance db partagée)
    db.saveGoogleAccount(userId, account);

    // Redirection vers l'app avec succès
    return NextResponse.redirect(new URL('/settings?google_auth=success', request.url));

  } catch (err: any) {
    console.error("Auth Callback Error:", err);
    return NextResponse.redirect(new URL(`/settings?google_error=${encodeURIComponent(err.message)}`, request.url));
  }
}
