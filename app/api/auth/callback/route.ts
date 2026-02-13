import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, encodeTokenCookie } from '@/lib/google'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/settings?error=${error}`, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?error=no_code', request.url))
  }

  try {
    const tokens = await exchangeCodeForTokens(code)

    const cookieValue = encodeTokenCookie({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
    })

    const response = NextResponse.redirect(new URL('/dashboard?google=connected', request.url))
    response.cookies.set('google_tokens', cookieValue, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth error'
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(message)}`, request.url))
  }
}
