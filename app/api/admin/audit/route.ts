
import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient'; // Client réel
import { db } from '../../../../services/mockDatabase'; // Pour vérification auth mockée (transition)

export async function GET(request: Request) {
  try {
    // 1. Sécurité : Vérification Admin (Compatible Mock Auth actuel)
    // En prod pure, remplacer par supabase.auth.getUser()
    const adminUser = db.getUserById('user_1'); 
    if (!adminUser || adminUser.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Si Supabase n'est pas configuré, on renvoie une erreur explicite
    if (!supabase) {
        return NextResponse.json({ 
            status: 'warning', 
            message: 'Supabase client not configured. Running in Mock Mode.',
            metrics: {
                mock_users: db.getUsers().length,
                mock_clients: db.getClients().length,
                mock_assets: db.getAssets().length
            }
        });
    }

    // 2. Exécution des requêtes d'audit sur la VRAIE base
    const results = {
        test_users: 0,
        expired_sessions: 0,
        recent_errors: 0,
        db_latency_ms: 0
    };

    const start = performance.now();

    // A. Users Suspects
    const { count: testUsersCount, error: userError } = await supabase
        .from('auth.users') // Note: accès direct à auth.users souvent bloqué via API client, requiert Service Key côté serveur
        .select('*', { count: 'exact', head: true })
        .ilike('email', '%test%');
    
    if (!userError) results.test_users = testUsersCount || 0;

    // B. Logs récents (si table audit_logs existe)
    const { count: errorCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // 24h
    
    results.recent_errors = errorCount || 0;

    results.db_latency_ms = Math.round(performance.now() - start);

    return NextResponse.json({
        status: 'success',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        metrics: results
    });

  } catch (error) {
    console.error("Audit Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
