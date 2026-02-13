// Google OAuth 2.0 + API Service
// Uses authorization code flow with refresh tokens
// Reads client credentials from settings-service (Supabase > env vars)

import { getSetting } from './settings-service'

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
].join(' ')

// Helper to get Google credentials (async, reads from settings-service)
async function getGoogleCredentials() {
  const clientId = await getSetting('google_client_id') || ''
  const clientSecret = await getSetting('google_client_secret') || ''
  const redirectUri = await getSetting('google_redirect_uri') || 'https://splashbanana.com/api/auth/callback'
  return { clientId, clientSecret, redirectUri }
}

// Generate the Google authorization URL
export async function getGoogleAuthUrl(state?: string): Promise<string> {
  const { clientId, redirectUri } = await getGoogleCredentials()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    ...(state ? { state } : {}),
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  id_token?: string
}> {
  const { clientId, clientSecret, redirectUri } = await getGoogleCredentials()
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token exchange failed: ${err}`)
  }

  return res.json()
}

// Refresh an expired access token
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const { clientId, clientSecret } = await getGoogleCredentials()
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token refresh failed: ${err}`)
  }

  return res.json()
}

// Get user profile from ID token or userinfo endpoint
export async function getGoogleUserInfo(accessToken: string) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to get user info')
  return res.json()
}

// Generic Google API fetch with access token
export async function googleApiFetch(
  accessToken: string,
  url: string,
  options: RequestInit = {}
) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (res.status === 401) {
    throw new Error('GOOGLE_TOKEN_EXPIRED')
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google API error ${res.status}: ${text}`)
  }

  // Some DELETE requests return no content
  if (res.status === 204) return {}
  return res.json()
}

// ==========================================
// Google Calendar helpers
// ==========================================
export const googleCalendar = {
  listEvents: (token: string, timeMin?: string, timeMax?: string) => {
    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '50',
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    return googleApiFetch(token, `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`)
  },

  createEvent: (token: string, event: Record<string, unknown>) =>
    googleApiFetch(token, 'https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      body: JSON.stringify(event),
    }),

  updateEvent: (token: string, eventId: string, event: Record<string, unknown>) =>
    googleApiFetch(token, `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify(event),
    }),

  deleteEvent: (token: string, eventId: string) =>
    googleApiFetch(token, `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
    }),
}

// ==========================================
// Gmail helpers
// ==========================================
export const googleGmail = {
  listMessages: (token: string, query = '', maxResults = 20) => {
    const params = new URLSearchParams({ maxResults: String(maxResults) })
    if (query) params.set('q', query)
    return googleApiFetch(token, `https://www.googleapis.com/gmail/v1/users/me/messages?${params}`)
  },

  getMessage: (token: string, id: string) =>
    googleApiFetch(token, `https://www.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`),

  getProfile: (token: string) =>
    googleApiFetch(token, 'https://www.googleapis.com/gmail/v1/users/me/profile'),
}

// ==========================================
// Google Drive helpers
// ==========================================
export const googleDrive = {
  listFiles: (token: string, query = '', pageSize = 30) => {
    const params = new URLSearchParams({
      pageSize: String(pageSize),
      fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,iconLink,parents)',
      orderBy: 'modifiedTime desc',
    })
    if (query) params.set('q', query)
    return googleApiFetch(token, `https://www.googleapis.com/drive/v3/files?${params}`)
  },

  createFolder: (token: string, name: string, parentId?: string) =>
    googleApiFetch(token, 'https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId ? { parents: [parentId] } : {}),
      }),
    }),

  copyFile: (token: string, fileId: string, name: string) =>
    googleApiFetch(token, `https://www.googleapis.com/drive/v3/files/${fileId}/copy`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
}

// ==========================================
// Google Docs helpers
// ==========================================
export const googleDocs = {
  getDocument: (token: string, id: string) =>
    googleApiFetch(token, `https://docs.googleapis.com/v1/documents/${id}`),

  createDocument: (token: string, title: string) =>
    googleApiFetch(token, 'https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  batchUpdate: (token: string, id: string, requests: unknown[]) =>
    googleApiFetch(token, `https://docs.googleapis.com/v1/documents/${id}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    }),
}

// ==========================================
// Token cookie helpers
// ==========================================
export function encodeTokenCookie(tokens: { access_token: string; refresh_token?: string; expires_at: number }): string {
  return Buffer.from(JSON.stringify(tokens)).toString('base64')
}

export function decodeTokenCookie(cookie: string): { access_token: string; refresh_token?: string; expires_at: number } | null {
  try {
    return JSON.parse(Buffer.from(cookie, 'base64').toString('utf-8'))
  } catch {
    return null
  }
}
