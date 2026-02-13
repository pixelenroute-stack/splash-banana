import { NextRequest, NextResponse } from 'next/server'
import { getGoogleToken } from '@/lib/google-token'
import { googleCalendar } from '@/lib/google'

function noGoogle() {
  return NextResponse.json({
    success: false,
    error: 'Google non connecté. Allez dans Paramètres > Connecter Google.',
    needsAuth: true,
  }, { status: 401 })
}

export async function GET(request: NextRequest) {
  const token = await getGoogleToken()
  if (!token) return noGoogle()

  try {
    const { searchParams } = new URL(request.url)
    const timeMin = searchParams.get('timeMin') || undefined
    const timeMax = searchParams.get('timeMax') || undefined

    const data = await googleCalendar.listEvents(token, timeMin, timeMax)

    const events = (data.items || []).map((e: Record<string, unknown>) => ({
      id: e.id,
      summary: e.summary || '(Sans titre)',
      description: e.description || '',
      start: (e.start as Record<string, string>)?.dateTime || (e.start as Record<string, string>)?.date || '',
      end: (e.end as Record<string, string>)?.dateTime || (e.end as Record<string, string>)?.date || '',
      location: e.location || '',
      attendees: ((e.attendees as Array<{ email: string }>) || []).map((a) => a.email),
      htmlLink: e.htmlLink || '',
    }))

    return NextResponse.json({ success: true, data: events })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Calendar'
    if (message === 'GOOGLE_TOKEN_EXPIRED') return noGoogle()
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const token = await getGoogleToken()
  if (!token) return noGoogle()

  try {
    const body = await request.json()
    const { summary, description, start, end, attendees } = body

    if (!summary || !start || !end) {
      return NextResponse.json({ success: false, error: 'summary, start et end requis' }, { status: 400 })
    }

    const event = await googleCalendar.createEvent(token, {
      summary,
      description,
      start: { dateTime: start, timeZone: 'Europe/Paris' },
      end: { dateTime: end, timeZone: 'Europe/Paris' },
      attendees: attendees?.map((email: string) => ({ email })),
    })

    return NextResponse.json({ success: true, data: event })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Calendar'
    if (message === 'GOOGLE_TOKEN_EXPIRED') return noGoogle()
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const token = await getGoogleToken()
  if (!token) return noGoogle()

  try {
    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ success: false, error: 'id requis' }, { status: 400 })

    const patchData: Record<string, unknown> = {}
    if (updates.summary) patchData.summary = updates.summary
    if (updates.description !== undefined) patchData.description = updates.description
    if (updates.start) patchData.start = { dateTime: updates.start, timeZone: 'Europe/Paris' }
    if (updates.end) patchData.end = { dateTime: updates.end, timeZone: 'Europe/Paris' }

    const event = await googleCalendar.updateEvent(token, id, patchData)
    return NextResponse.json({ success: true, data: event })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Calendar'
    if (message === 'GOOGLE_TOKEN_EXPIRED') return noGoogle()
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const token = await getGoogleToken()
  if (!token) return noGoogle()

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id requis' }, { status: 400 })

    await googleCalendar.deleteEvent(token, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Calendar'
    if (message === 'GOOGLE_TOKEN_EXPIRED') return noGoogle()
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
