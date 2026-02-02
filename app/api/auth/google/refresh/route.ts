
import { NextResponse } from 'next/server';
import { db } from '../../../../../services/mockDatabase';
import { encrypt, decrypt } from '../../../../../lib/encryption';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  const account = db.getGoogleAccount(userId);
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  // Si le token est encore valide, on le renvoie (déchiffré pour l'usage immédiat)
  if (account.tokenExpiryDate > Date.now() + 60000) { // Marge 1 min
      try {
          return NextResponse.json({ accessToken: decrypt(account.accessTokenEncrypted) });
      } catch (e) {
          return NextResponse.json({ error: 'Token corruption' }, { status: 500 });
      }
  }

  // Sinon, refresh
  try {
      const settings = db.getSystemSettings();
      const { clientId, clientSecret } = settings.google;
      const refreshToken = decrypt(account.refreshTokenEncrypted);

      if (!refreshToken) throw new Error("No refresh token available");

      const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
              client_id: clientId || '',
              client_secret: clientSecret || '',
              refresh_token: refreshToken,
              grant_type: 'refresh_token',
          }),
      });

      const data = await response.json();

      if (!response.ok) {
          // Si refresh invalide (ex: révoqué), on met à jour le statut
          if (data.error === 'invalid_grant') {
              db.saveGoogleAccount(userId, { ...account, status: 'error' });
              return NextResponse.json({ error: 'Token revoked' }, { status: 401 });
          }
          throw new Error(data.error_description || 'Refresh failed');
      }

      // Mise à jour DB avec nouveaux tokens chiffrés
      const newAccount = {
          ...account,
          accessTokenEncrypted: encrypt(data.access_token),
          tokenExpiryDate: Date.now() + (data.expires_in * 1000),
          lastSyncedAt: new Date().toISOString(),
          status: 'connected' as const
      };
      
      db.saveGoogleAccount(userId, newAccount);

      return NextResponse.json({ accessToken: data.access_token });

  } catch (error: any) {
      console.error("Refresh Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
