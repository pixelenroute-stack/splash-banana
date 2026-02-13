import { NextRequest, NextResponse } from 'next/server'
import { getSetting } from '@/lib/settings-service'

const SYSTEM_PROMPT = `Tu es un assistant de veille technologique. Pour chaque recherche, retourne 5-8 articles d'actualité pertinents et récents. Pour chaque article, structure ta réponse EXACTEMENT ainsi:

ARTICLE_START
TITRE: [titre de l'article]
SOURCE: [nom du média source]
URL: [url si disponible, sinon N/A]
RESUME: [résumé en 2-3 phrases]
ARTICLE_END

Règles importantes:
- Sépare bien chaque article avec les marqueurs ARTICLE_START et ARTICLE_END
- Donne des titres clairs et informatifs
- Indique toujours la source (nom du média)
- Fournis l'URL réelle si tu la connais, sinon écris N/A
- Rédige les résumés en français
- Ne mets RIEN en dehors des blocs ARTICLE_START/ARTICLE_END`

interface ParsedArticle {
  id: string
  title: string
  summary: string
  url: string
  source: string
  publishedAt: string
  category?: string
}

function parseArticles(content: string, citations?: string[]): ParsedArticle[] {
  const articles: ParsedArticle[] = []
  const blocks = content.split('ARTICLE_START').filter((block) => block.includes('ARTICLE_END'))

  for (const block of blocks) {
    const articleText = block.split('ARTICLE_END')[0].trim()

    const titleMatch = articleText.match(/TITRE:\s*(.+)/i)
    const sourceMatch = articleText.match(/SOURCE:\s*(.+)/i)
    const urlMatch = articleText.match(/URL:\s*(.+)/i)
    const resumeMatch = articleText.match(/RESUME:\s*([\s\S]+?)$/i)

    if (titleMatch) {
      const title = titleMatch[1].trim()
      const source = sourceMatch ? sourceMatch[1].trim() : 'Source inconnue'
      let url = urlMatch ? urlMatch[1].trim() : ''
      const summary = resumeMatch ? resumeMatch[1].trim() : ''

      if (!url || url === 'N/A' || url === 'n/a') {
        url = ''
        if (citations && citations.length > 0) {
          const articleIndex = articles.length
          if (articleIndex < citations.length) {
            url = citations[articleIndex]
          }
        }
      }

      articles.push({
        id: crypto.randomUUID(),
        title,
        summary,
        url,
        source,
        publishedAt: new Date().toISOString(),
      })
    }
  }

  return articles
}

export async function POST(request: NextRequest) {
  const apiKey = await getSetting('perplexity_api_key')
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'Perplexity non configuré. Configurez-le dans Paramètres.' }, { status: 500 })
  }

  try {
    const { query } = await request.json()

    if (!query) {
      return NextResponse.json({ success: false, error: 'Query requise' }, { status: 400 })
    }

    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Recherche les dernières actualités sur: ${query}` },
        ],
        max_tokens: 4096,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ success: false, error: err.error?.message || 'Erreur Perplexity' }, { status: res.status })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    const citations: string[] = data.citations || []

    const articles = parseArticles(content, citations)

    if (articles.length === 0 && content.length > 0) {
      const paragraphs = content.split('\n\n').filter((p: string) => p.trim().length > 30)

      if (paragraphs.length > 0) {
        for (let i = 0; i < Math.min(paragraphs.length, 6); i++) {
          const text = paragraphs[i].trim()
          const lines = text.split('\n')
          const title = lines[0].replace(/^[\d#.*-]+\s*/, '').trim()
          const summary = lines.slice(1).join(' ').trim() || text

          articles.push({
            id: crypto.randomUUID(),
            title: title.substring(0, 120),
            summary: summary.substring(0, 300),
            url: citations[i] || '',
            source: 'Perplexity AI',
            publishedAt: new Date().toISOString(),
          })
        }
      } else {
        articles.push({
          id: crypto.randomUUID(),
          title: query,
          summary: content.substring(0, 500),
          url: citations[0] || '',
          source: 'Perplexity AI',
          publishedAt: new Date().toISOString(),
        })
      }
    }

    if (citations.length > 0) {
      articles.forEach((article, idx) => {
        if (!article.url && idx < citations.length) {
          article.url = citations[idx]
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: articles,
      citations,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Perplexity'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
