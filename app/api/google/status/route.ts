
import { NextResponse } from 'next/server';
import { db } from '../../../../services/mockDatabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) return NextResponse.json({ connected: false }, { status: 400 });

  const account = db.getGoogleAccount(userId);

  if (!account) {
      return NextResponse.json({ connected: false, status: 'disconnected' });
  }

  return NextResponse.json({
      connected: account.status === 'connected',
      status: account.status,
      email: account.email,
      lastSyncedAt: account.lastSyncedAt
  });
}
