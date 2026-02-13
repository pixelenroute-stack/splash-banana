import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { verifySync } from 'otplib'
import { supabaseAdmin } from '@/lib/supabase'
import { signToken } from '@/lib/jwt'
import { logAudit } from '@/lib/audit'
import { authenticateUser, updateUser } from '@/lib/userStore'

export async function POST(request: NextRequest) {
  try {
    const { email, password, totpCode } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }

    // Try Supabase first
    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('status', 'active')
      .single()

    if (dbUser) {
      // Verify bcrypt password
      const passwordValid = await bcrypt.compare(password, dbUser.password_hash)
      if (!passwordValid) {
        return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })
      }

      // Check 2FA if enabled
      if (dbUser.totp_enabled && dbUser.totp_secret) {
        if (!totpCode) {
          return NextResponse.json({
            error: 'Code 2FA requis',
            requires2FA: true,
          }, { status: 403 })
        }
        // Verify TOTP
        const totpResult = verifySync({ token: totpCode, secret: dbUser.totp_secret })
        const valid = totpResult.valid
        if (!valid) {
          return NextResponse.json({ error: 'Code 2FA invalide' }, { status: 401 })
        }
      }

      // Sign JWT
      const token = signToken({
        userId: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
      })

      // Update last login
      await supabaseAdmin
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', dbUser.id)

      await logAudit('user.login', dbUser.id, { method: 'password' })

      const response = NextResponse.json({
        token,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          avatar: dbUser.avatar,
          createdAt: dbUser.created_at,
        },
      })

      // Set JWT as httpOnly cookie
      response.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      })

      return response
    }

    // Fallback: in-memory store (demo/legacy users)
    const legacyUser = authenticateUser(email, password)
    if (legacyUser) {
      const token = signToken({
        userId: legacyUser.id,
        email: legacyUser.email,
        role: legacyUser.role,
      })

      updateUser(legacyUser.id, { lastLoginAt: new Date().toISOString() })

      const response = NextResponse.json({
        token,
        user: {
          id: legacyUser.id,
          email: legacyUser.email,
          name: legacyUser.name,
          role: legacyUser.role,
          createdAt: legacyUser.createdAt,
        },
      })

      response.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })

      return response
    }

    return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
