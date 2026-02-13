import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSetting } from '@/lib/settings-service'

// GET /api/test-connections?service=gemini|notion|perplexity|google|google-oauth
export async function GET(request: NextRequest) {
  const service = request.nextUrl.searchParams.get('service')

  if (!service) {
    return NextResponse.json({ success: false, error: 'Service parameter required' }, { status: 400 })
  }

  try {
    switch (service) {
      case 'gemini': {
        const key = await getSetting('gemini_api_key')
        if (!key) return NextResponse.json({ success: false, error: 'GEMINI_API_KEY non configurée', status: 'missing' })
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
          { method: 'GET' }
        )
        if (res.ok) {
          const data = await res.json()
          const models = data.models?.slice(0, 3).map((m: { name: string }) => m.name) || []
          return NextResponse.json({ success: true, status: 'connected', details: `${data.models?.length || 0} modèles disponibles`, models })
        }
        const err = await res.text()
        return NextResponse.json({ success: false, status: 'error', error: `API Error ${res.status}: ${err.slice(0, 200)}` })
      }

      case 'notion': {
        const key = await getSetting('notion_api_key')
        if (!key) return NextResponse.json({ success: false, error: 'NOTION_API_KEY non configurée', status: 'missing' })
        const res = await fetch('https://api.notion.com/v1/users/me', {
          headers: { Authorization: `Bearer ${key}`, 'Notion-Version': '2022-06-28' },
        })
        if (res.ok) {
          const data = await res.json()
          return NextResponse.json({ success: true, status: 'connected', details: `Bot: ${data.name || data.bot?.owner?.user?.name || 'OK'}` })
        }
        return NextResponse.json({ success: false, status: 'error', error: `Notion API Error ${res.status}` })
      }

      case 'perplexity': {
        const key = await getSetting('perplexity_api_key')
        if (!key) return NextResponse.json({ success: false, error: 'PERPLEXITY_API_KEY non configurée', status: 'missing' })
        const res = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'sonar',
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 5,
          }),
        })
        if (res.ok) {
          return NextResponse.json({ success: true, status: 'connected', details: 'API fonctionnelle' })
        }
        const errText = await res.text()
        return NextResponse.json({ success: false, status: 'error', error: `Perplexity Error ${res.status}: ${errText.slice(0, 200)}` })
      }

      case 'google': {
        const cookieStore = await cookies()
        const tokenCookie = cookieStore.get('google_tokens')
        if (!tokenCookie) {
          return NextResponse.json({ success: false, status: 'disconnected', error: 'Non connecté à Google' })
        }
        try {
          const tokens = JSON.parse(Buffer.from(tokenCookie.value, 'base64').toString('utf-8'))
          if (!tokens.access_token) {
            return NextResponse.json({ success: false, status: 'error', error: 'Token invalide' })
          }
          const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          })
          if (res.ok) {
            const data = await res.json()
            return NextResponse.json({ success: true, status: 'connected', details: `Connecté: ${data.email}` })
          }
          if (res.status === 401 && tokens.refresh_token) {
            return NextResponse.json({ success: false, status: 'expired', error: 'Token expiré, reconnexion nécessaire' })
          }
          return NextResponse.json({ success: false, status: 'error', error: `Google API Error ${res.status}` })
        } catch {
          return NextResponse.json({ success: false, status: 'error', error: 'Token cookie corrompu' })
        }
      }

      case 'google-oauth': {
        const clientId = await getSetting('google_client_id')
        if (!clientId) {
          return NextResponse.json({ success: false, status: 'missing', error: 'GOOGLE_CLIENT_ID non configuré' })
        }
        const clientSecret = await getSetting('google_client_secret')
        return NextResponse.json({
          success: true,
          status: clientSecret ? 'configured' : 'partial',
          details: `Client ID: ${clientId.slice(0, 12)}...`,
          hasSecret: !!clientSecret,
        })
      }

      default:
        return NextResponse.json({ success: false, error: `Service inconnu: ${service}` }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({
      success: false,
      status: 'error',
      error: err instanceof Error ? err.message : 'Erreur inconnue',
    })
  }
}
