import { NextRequest, NextResponse } from 'next/server'
import { generateSecret, generateURI } from 'otplib'
import * as QRCode from 'qrcode'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken, getTokenFromCookie } from '@/lib/jwt'
import { logAudit } from '@/lib/audit'

// POST /api/auth/2fa/setup - Generate TOTP secret + QR code for setup
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie'))
    const user = token ? verifyToken(token) : null

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Only admins can enable 2FA
    if (user.role !== 'admin') {
      return NextResponse.json({ error: '2FA réservé aux administrateurs' }, { status: 403 })
    }

    // Generate new secret
    const secret = generateSecret()

    // Generate OTP auth URL
    const otpauthUrl = generateURI({
      issuer: 'SplashBanana',
      label: user.email,
      secret,
    })

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl)

    // Store secret temporarily (not yet enabled)
    await supabaseAdmin
      .from('users')
      .update({ totp_secret: secret })
      .eq('id', user.userId)

    return NextResponse.json({
      success: true,
      data: {
        secret,
        qrCode: qrCodeDataUrl,
        otpauthUrl,
      },
    })
  } catch (err) {
    console.error('2FA setup error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/auth/2fa/setup - Disable 2FA
export async function DELETE(request: NextRequest) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie'))
    const user = token ? verifyToken(token) : null

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    await supabaseAdmin
      .from('users')
      .update({ totp_secret: null, totp_enabled: false })
      .eq('id', user.userId)

    await logAudit('user.2fa_disabled', user.userId)

    return NextResponse.json({ success: true, message: '2FA désactivé' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
