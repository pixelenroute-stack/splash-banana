'use client'

import { useState, useEffect, useCallback } from 'react'
import { Newspaper, Search, RefreshCw, ExternalLink } from 'lucide-react'
import type { NewsArticle } from '@/types'

const DEFAULT_QUERY = 'actualités technologie marketing digital France'

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNews = useCallback(async (query?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/perplexity/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query || DEFAULT_QUERY }),
      })
      const data = await res.json()
      if (data.success) {
        setArticles(data.data)
      } else {
        setError(data.error || 'Erreur lors du chargement des actualités')
      }
    } catch {
      setError('Erreur de connexion au serveur')
    } finally {
      setIsLoading(false)
      setHasLoaded(true)
    }
  }, [])

  // Auto-load news on first render
  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Actualités</h1>
          <p className="text-muted text-sm mt-1">Veille via Perplexity AI</p>
        </div>
        <button
          onClick={() => fetchNews(search || undefined)}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="text-sm">Actualiser</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Rechercher des actualités..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchNews(search || undefined)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
        />
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-hover animate-pulse">
              <div className="space-y-3">
                <div className="h-5 bg-white/5 rounded w-3/4" />
                <div className="space-y-2">
                  <div className="h-3 bg-white/5 rounded w-full" />
                  <div className="h-3 bg-white/5 rounded w-5/6" />
                  <div className="h-3 bg-white/5 rounded w-2/3" />
                </div>
                <div className="flex gap-3">
                  <div className="h-3 bg-white/5 rounded w-20" />
                  <div className="h-3 bg-white/5 rounded w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <Newspaper className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => fetchNews(search || undefined)}
            className="mt-4 text-sm text-lantean-blue hover:underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Empty state - only show if loaded and no articles and no error */}
      {!isLoading && !error && hasLoaded && articles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <Newspaper className="w-12 h-12 mb-4 opacity-30" />
          <p>Aucun article trouvé. Essayez une autre recherche.</p>
        </div>
      )}

      {/* Articles grid */}
      {!isLoading && articles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((article) => (
            <div key={article.id} className="card-hover">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">{article.title}</h3>
                  <p className="text-sm text-muted line-clamp-3">{article.summary}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted">
                    <span>{article.source}</span>
                    <span>{new Date(article.publishedAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
                {article.url && (
                  <a href={article.url} target="_blank" rel="noopener noreferrer"
                     className="text-muted hover:text-lantean-blue transition-colors flex-shrink-0">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
