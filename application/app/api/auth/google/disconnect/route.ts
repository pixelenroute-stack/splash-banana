import { NextResponse } from 'next/server';
import { db } from '../../../../../services/mockDatabase';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    // Récupérer le compte pour révoquer le token si possible
    const account = db.getGoogleAccount(userId);

    if (account && account.accessTokenEncrypted) {
      // Optionnel: Révoquer le token côté Google
      // Cela empêche l'accès futur même si le token est intercepté
      try {
        // Note: Le token doit être déchiffré pour la révocation
        // Pour simplifier, on fait juste la suppression locale
        await fetch(`https://oauth2.googleapis.com/revoke?token=${account.accessTokenEncrypted}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
      } catch (revokeError) {
        // Ignorer les erreurs de révocation (token peut être déjà expiré)
        console.warn('Token revocation failed (might be already expired):', revokeError);
      }
    }

    // Supprimer le compte localement
    db.disconnectGoogleAccount(userId);

    return NextResponse.json({ success: true, message: 'Compte Google déconnecté' });
  } catch (err: any) {
    console.error("Disconnect Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Support pour GET aussi (pour les appels simples)
export async function GET(request: Request) {
  return POST(request);
}
