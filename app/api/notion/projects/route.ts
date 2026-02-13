import { NextRequest, NextResponse } from 'next/server'
import { getSetting } from '@/lib/settings-service'

const NOTION_BASE = 'https://api.notion.com/v1'

async function notionFetch(apiKey: string, path: string, options: RequestInit = {}) {
  return fetch(`${NOTION_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

export async function GET() {
  const apiKey = await getSetting('notion_api_key')
  const projectsDb = await getSetting('notion_projects_db_id')

  if (!apiKey || !projectsDb) {
    return NextResponse.json({ success: false, error: 'Notion non configuré. Configurez-le dans Paramètres.' }, { status: 500 })
  }

  try {
    const res = await notionFetch(apiKey, `/databases/${projectsDb}/query`, {
      method: 'POST',
      body: JSON.stringify({ page_size: 100 }),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ success: false, error: err.message }, { status: res.status })
    }

    const data = await res.json()

    const projects = data.results.map((page: Record<string, unknown>) => {
      const props = page.properties as Record<string, Record<string, unknown>>
      return {
        id: page.id,
        notionPageId: page.id,
        name: getTitle(props.Name || props.Nom),
        clientName: getRichText(props.Client),
        status: getSelect(props.Status || props.Statut) || 'draft',
        description: getRichText(props.Description),
        budget: getNumber(props.Budget),
        startDate: getDate(props['Start Date'] || props['Date début']),
        endDate: getDate(props['End Date'] || props['Date fin']),
      }
    })

    return NextResponse.json({ success: true, data: projects })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Notion'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const apiKey = await getSetting('notion_api_key')
  const projectsDb = await getSetting('notion_projects_db_id')

  if (!apiKey || !projectsDb) {
    return NextResponse.json({ success: false, error: 'Notion non configuré. Configurez-le dans Paramètres.' }, { status: 500 })
  }

  try {
    const body = await request.json()

    const res = await notionFetch(apiKey, '/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: { database_id: projectsDb },
        properties: {
          Name: { title: [{ text: { content: body.name } }] },
          Status: { select: { name: body.status || 'draft' } },
          Description: { rich_text: [{ text: { content: body.description || '' } }] },
        },
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ success: false, error: err.message }, { status: res.status })
    }

    const page = await res.json()
    return NextResponse.json({ success: true, data: { id: page.id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Notion'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

function getTitle(prop: Record<string, unknown> | undefined): string {
  if (!prop) return ''
  const title = prop.title as Array<{ plain_text: string }> | undefined
  return title?.[0]?.plain_text || ''
}

function getRichText(prop: Record<string, unknown> | undefined): string {
  if (!prop) return ''
  const rt = prop.rich_text as Array<{ plain_text: string }> | undefined
  return rt?.[0]?.plain_text || ''
}

function getSelect(prop: Record<string, unknown> | undefined): string {
  if (!prop) return ''
  const sel = prop.select as { name: string } | null
  return sel?.name || ''
}

function getNumber(prop: Record<string, unknown> | undefined): number | undefined {
  if (!prop) return undefined
  return prop.number as number | undefined
}

function getDate(prop: Record<string, unknown> | undefined): string | undefined {
  if (!prop) return undefined
  const date = prop.date as { start: string } | null
  return date?.start
}
