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
  const crmDb = await getSetting('notion_crm_db_id')

  if (!apiKey || !crmDb) {
    return NextResponse.json({ success: false, error: 'Notion non configuré. Configurez-le dans Paramètres.' }, { status: 500 })
  }

  try {
    const res = await notionFetch(apiKey, `/databases/${crmDb}/query`, {
      method: 'POST',
      body: JSON.stringify({ page_size: 100 }),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ success: false, error: err.message }, { status: res.status })
    }

    const data = await res.json()

    const clients = data.results.map((page: Record<string, unknown>) => {
      const props = page.properties as Record<string, Record<string, unknown>>
      return {
        id: page.id,
        notionPageId: page.id,
        name: getTitle(props.Name || props.Nom),
        email: getRichText(props.Email),
        phone: getRichText(props.Phone || props.Téléphone),
        company: getRichText(props.Company || props.Entreprise),
        status: getSelect(props.Status || props.Statut) || 'lead',
        source: getRichText(props.Source),
        notes: getRichText(props.Notes),
        createdAt: (page as Record<string, string>).created_time,
        updatedAt: (page as Record<string, string>).last_edited_time,
      }
    })

    return NextResponse.json({ success: true, data: clients })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Notion'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const apiKey = await getSetting('notion_api_key')
  const crmDb = await getSetting('notion_crm_db_id')

  if (!apiKey || !crmDb) {
    return NextResponse.json({ success: false, error: 'Notion non configuré. Configurez-le dans Paramètres.' }, { status: 500 })
  }

  try {
    const body = await request.json()

    const res = await notionFetch(apiKey, '/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: { database_id: crmDb },
        properties: {
          Name: { title: [{ text: { content: body.name } }] },
          Email: { rich_text: [{ text: { content: body.email || '' } }] },
          Phone: { rich_text: [{ text: { content: body.phone || '' } }] },
          Company: { rich_text: [{ text: { content: body.company || '' } }] },
          Status: { select: { name: body.status || 'lead' } },
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

// Notion property extractors
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
