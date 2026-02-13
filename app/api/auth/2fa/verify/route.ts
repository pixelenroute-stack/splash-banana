import { NextRequest, NextResponse } from 'next/server'
import { verifySync } from 'otplib'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken, getTokenFromCookie } from '@/lib/jwt'
import { logAudit } from '@/lib/audit'

// POST /api/auth/2fa/verify - Verify TOTP code and enable 2FA
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie'))
    const user = token ? verifyToken(token) : null

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Code requis' }, { status: 400 })
    }

    // Get the stored secret
    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('totp_secret, totp_enabled')
      .eq('id', user.userId)
      .single()

    if (!dbUser?.totp_secret) {
      return NextResponse.json({ error: "Aucun secret 2FA configuré. Lancez le setup d'abord." }, { status: 400 })
    }

    // Verify the TOTP code
    const result = verifySync({ token: code, secret: dbUser.totp_secret })

    if (!result.valid) {
      return NextResponse.json({ error: "Code invalide. Vérifiez votre application d'authentification." }, { status: 401 })
    }

    // Enable 2FA
    if (!dbUser.totp_enabled) {
      await supabaseAdmin
        .from('users')
        .update({ totp_enabled: true })
        .eq('id', user.userId)

      await logAudit('user.2fa_enabled', user.userId)
    }

    return NextResponse.json({
      success: true,
      message: '2FA activé avec succès',
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
