import { NextResponse } from 'next/server';
import { db } from '../../../../services/mockDatabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) return NextResponse.json({ connected: false, status: 'disconnected' }, { status: 400 });

  const account = db.getGoogleAccount(userId);

  if (!account) {
    return NextResponse.json({ connected: false, status: 'disconnected' });
  }

  // Vérifier si le token est expiré
  const isExpired = account.tokenExpiryDate && Date.now() > account.tokenExpiryDate;

  // Vérifier si on a un refresh token pour renouveler
  const hasRefreshToken = account.refreshTokenEncrypted && account.refreshTokenEncrypted.length > 0;

  let status: 'live' | 'mock' | 'error' | 'disconnected' = 'disconnected';

  if (account.status === 'connected') {
    if (isExpired && !hasRefreshToken) {
      status = 'error'; // Token expiré sans possibilité de renouvellement
    } else if (account.accessTokenEncrypted.includes('fake') || account.accessTokenEncrypted.includes('mock')) {
      status = 'mock';
    } else {
      status = 'live';
    }
  } else if (account.status === 'error') {
    status = 'error';
  } else if (account.status === 'expired') {
    status = hasRefreshToken ? 'live' : 'error'; // 'live' si on peut rafraîchir
  }

  return NextResponse.json({
    connected: status === 'live' || status === 'mock',
    status,
    email: account.email,
    lastSyncedAt: account.lastSyncedAt,
    isExpired,
    hasRefreshToken
  });
}
