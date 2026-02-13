import { NextRequest, NextResponse } from 'next/server'
import { getGoogleToken } from '@/lib/google-token'
import { googleGmail } from '@/lib/google'

function noGoogle() {
  return NextResponse.json({
    success: false,
    error: 'Google non connecté. Allez dans Paramètres > Connecter Google.',
    needsAuth: true,
  }, { status: 401 })
}

function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  try {
    return Buffer.from(base64, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

function extractHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || ''
}

function extractBody(payload: Record<string, unknown>): string {
  if (payload.body && (payload.body as Record<string, unknown>).data) {
    return decodeBase64Url((payload.body as Record<string, string>).data)
  }
  const parts = (payload.parts as Array<Record<string, unknown>>) || []
  for (const part of parts) {
    const mimeType = part.mimeType as string
    if (mimeType === 'text/html' || mimeType === 'text/plain') {
      const body = part.body as Record<string, string>
      if (body?.data) return decodeBase64Url(body.data)
    }
    if (part.parts) {
      const nested = extractBody(part as Record<string, unknown>)
      if (nested) return nested
    }
  }
  return ''
}

export async function GET(request: NextRequest) {
  const token = await getGoogleToken()
  if (!token) return noGoogle()

  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const maxResults = parseInt(searchParams.get('maxResults') || '20')
    const messageId = searchParams.get('id')

    // Single message detail
    if (messageId) {
      const msg = await googleGmail.getMessage(token, messageId)
      const headers = (msg.payload?.headers || []) as Array<{ name: string; value: string }>
      return NextResponse.json({
        success: true,
        data: {
          id: msg.id,
          threadId: msg.threadId,
          from: extractHeader(headers, 'From'),
          to: extractHeader(headers, 'To'),
          subject: extractHeader(headers, 'Subject'),
          date: extractHeader(headers, 'Date'),
          snippet: msg.snippet || '',
          body: extractBody(msg.payload || {}),
          isUnread: (msg.labelIds || []).includes('UNREAD'),
          labels: msg.labelIds || [],
        },
      })
    }

    // List messages
    const list = await googleGmail.listMessages(token, query, maxResults)
    const messageIds = (list.messages || []) as Array<{ id: string; threadId: string }>

    const emails = await Promise.all(
      messageIds.slice(0, maxResults).map(async (m) => {
        try {
          const msg = await googleGmail.getMessage(token, m.id)
          const headers = (msg.payload?.headers || []) as Array<{ name: string; value: string }>
          return {
            id: msg.id,
            threadId: msg.threadId,
            from: extractHeader(headers, 'From'),
            to: extractHeader(headers, 'To'),
            subject: extractHeader(headers, 'Subject'),
            snippet: msg.snippet || '',
            date: extractHeader(headers, 'Date'),
            isUnread: (msg.labelIds || []).includes('UNREAD'),
            labels: msg.labelIds || [],
          }
        } catch {
          return null
        }
      })
    )

    return NextResponse.json({ success: true, data: emails.filter(Boolean) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Gmail'
    if (message === 'GOOGLE_TOKEN_EXPIRED') return noGoogle()
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
