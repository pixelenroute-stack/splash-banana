import { NextRequest, NextResponse } from 'next/server'

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY

export async function POST(request: NextRequest) {
  if (!PERPLEXITY_API_KEY) {
    return NextResponse.json({ success: false, error: 'Perplexity non configuré' }, { status: 500 })
  }

  try {
    const { query } = await request.json()

    if (!query) {
      return NextResponse.json({ success: false, error: 'Query requise' }, { status: 400 })
    }

    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'Tu es un assistant de veille. Retourne les actualités pertinentes au format structuré. Pour chaque article, donne: titre, résumé (2-3 phrases), source, et URL si disponible. Réponds en français.',
          },
          { role: 'user', content: query },
        ],
        max_tokens: 2048,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ success: false, error: err.error?.message || 'Erreur Perplexity' }, { status: res.status })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''

    return NextResponse.json({
      success: true,
      data: [{
        id: crypto.randomUUID(),
        title: query,
        summary: content,
        url: '',
        source: 'Perplexity AI',
        publishedAt: new Date().toISOString(),
      }],
      raw: content,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Perplexity'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
