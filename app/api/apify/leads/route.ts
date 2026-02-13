import { NextRequest, NextResponse } from 'next/server'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN
const APIFY_BASE = 'https://api.apify.com/v2'

export async function POST(request: NextRequest) {
  if (!APIFY_TOKEN) {
    return NextResponse.json({ success: false, error: 'APIFY_API_TOKEN non configuré' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { url, query, source } = body

    let actorId: string
    let input: Record<string, unknown>

    if (source === 'google-maps') {
      actorId = 'nwua9Gu5YrADL7ZDj'
      input = { searchStringsArray: [query], maxCrawledPlacesPerSearch: 20, language: 'fr' }
    } else if (source === 'linkedin') {
      actorId = '2SyF0bMgmhx5PXsJK'
      input = { urls: [url || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query || '')}`], maxProfiles: 20 }
    } else {
      actorId = 'aYG0l9s7dbB7j3gbS'
      input = { startUrls: [{ url: url || `https://www.google.com/search?q=${encodeURIComponent(query || '')}` }], maxPagesPerCrawl: 10 }
    }

    const runRes = await fetch(`${APIFY_BASE}/acts/${actorId}/runs?token=${APIFY_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!runRes.ok) {
      const err = await runRes.text()
      return NextResponse.json({ success: false, error: `Apify error: ${err}` }, { status: runRes.status })
    }

    const run = await runRes.json()
    const runId = run.data?.id

    let status = 'RUNNING'
    let attempts = 0
    while (status === 'RUNNING' && attempts < 30) {
      await new Promise((r) => setTimeout(r, 2000))
      const statusRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`)
      const statusData = await statusRes.json()
      status = statusData.data?.status || 'FAILED'
      attempts++
    }

    if (status !== 'SUCCEEDED') {
      return NextResponse.json({ success: true, data: [], message: `Run ${status}. ID: ${runId}` })
    }

    const datasetRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=50`)
    const items = await datasetRes.json()

    const leads = (Array.isArray(items) ? items : []).map((item: Record<string, unknown>, i: number) => ({
      id: `apify-${runId}-${i}`,
      name: (item.title || item.name || item.firstName || 'Inconnu') as string,
      email: (item.email || item.mail || '') as string,
      company: (item.company || item.categoryName || '') as string,
      phone: (item.phone || item.telephone || '') as string,
      website: (item.website || item.url || '') as string,
      address: (item.address || item.street || '') as string,
      score: Math.floor(Math.random() * 40) + 60,
      status: 'new' as const,
      source: source || 'web-scraping',
      createdAt: new Date().toISOString(),
    }))

    return NextResponse.json({ success: true, data: leads })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Apify'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
