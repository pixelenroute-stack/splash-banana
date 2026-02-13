import { NextRequest, NextResponse } from 'next/server'
import { calendar } from '@/lib/maton'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeMin = searchParams.get('timeMin') || new Date().toISOString()
    const timeMax = searchParams.get('timeMax') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const data = await calendar.listEvents(timeMin, timeMax)

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
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { summary, description, start, end, attendees } = body

    if (!summary || !start || !end) {
      return NextResponse.json({ success: false, error: 'summary, start et end sont requis' }, { status: 400 })
    }

    const event = await calendar.createEvent({
      summary,
      description,
      start: { dateTime: start, timeZone: 'Europe/Paris' },
      end: { dateTime: end, timeZone: 'Europe/Paris' },
      attendees: attendees?.map((email: string) => ({ email })),
    })

    return NextResponse.json({ success: true, data: event })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Calendar'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'id requis' }, { status: 400 })
    }

    const patchData: Record<string, unknown> = {}
    if (updates.summary) patchData.summary = updates.summary
    if (updates.description !== undefined) patchData.description = updates.description
    if (updates.start) patchData.start = { dateTime: updates.start, timeZone: 'Europe/Paris' }
    if (updates.end) patchData.end = { dateTime: updates.end, timeZone: 'Europe/Paris' }

    const event = await calendar.updateEvent(id, patchData)
    return NextResponse.json({ success: true, data: event })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Calendar'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'id requis' }, { status: 400 })
    }
    await calendar.deleteEvent(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Calendar'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
