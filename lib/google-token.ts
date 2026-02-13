import { cookies } from 'next/headers'
import { decodeTokenCookie, refreshAccessToken, encodeTokenCookie } from './google'

// Get valid Google access token from cookies, refreshing if needed
export async function getGoogleToken(): Promise<string | null> {
  const cookieStore = await cookies()
  const tokenCookie = cookieStore.get('google_tokens')?.value
  if (!tokenCookie) return null

  const tokens = decodeTokenCookie(tokenCookie)
  if (!tokens) return null

  // If token is still valid (with 5min buffer)
  if (tokens.expires_at > Date.now() + 5 * 60 * 1000) {
    return tokens.access_token
  }

  // Token expired, try refresh
  if (!tokens.refresh_token) return null

  try {
    const refreshed = await refreshAccessToken(tokens.refresh_token)
    const newCookie = encodeTokenCookie({
      access_token: refreshed.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + refreshed.expires_in * 1000,
    })

    // Note: We can't set cookies in API routes directly from a helper
    // The cookie will be updated on next auth callback
    // For now, just return the new token
    return refreshed.access_token
  } catch {
    return null
  }
}
