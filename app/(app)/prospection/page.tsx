'use client'

import { useState } from 'react'
import { Target, Search, Loader2, Globe, MapPin, Linkedin, RefreshCw, ExternalLink, Mail, Phone } from 'lucide-react'
import type { Lead } from '@/types'

const STATUS_COLORS: Record<Lead['status'], string> = {
  new: 'bg-blue-500/10 text-blue-400',
  contacted: 'bg-yellow-500/10 text-yellow-400',
  qualified: 'bg-green-500/10 text-green-400',
  converted: 'bg-emerald-500/10 text-emerald-400',
  lost: 'bg-red-500/10 text-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Nouveau', contacted: 'Contacté', qualified: 'Qualifié', converted: 'Converti', lost: 'Perdu',
}

const SOURCES = [
  { id: 'google-maps', label: 'Google Maps', icon: MapPin, description: 'Entreprises locales' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, description: 'Profils professionnels' },
  { id: 'web', label: 'Web Scraping', icon: Globe, description: 'Sites web' },
]

export default function ProspectionPage() {
  const [leads, setLeads] = useState<Array<Lead & { phone?: string; website?: string; address?: string }>>([])
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('google-maps')
  const [query, setQuery] = useState('')
  const [url, setUrl] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [filter, setFilter] = useState<Lead['status'] | 'all'>('all')

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim() && !url.trim()) return
    setIsSearching(true)
    try {
      const res = await fetch('/api/apify/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, query: query.trim(), url: url.trim() }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        setLeads((prev) => [...data.data, ...prev])
      }
    } catch {
      // Error
    } finally {
      setIsSearching(false)
    }
  }

  function updateLeadStatus(id: string, status: Lead['status']) {
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l))
  }

  const filtered = leads.filter((l) => {
    const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.company?.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || l.status === filter
    return matchesSearch && matchesFilter
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prospection</h1>
          <p className="text-muted text-sm mt-1">Recherche de leads via Apify</p>
        </div>
        <div className="text-sm text-muted">{leads.length} leads</div>
      </div>

      {/* Source selector */}
      <div className="flex gap-3">
        {SOURCES.map((s) => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              onClick={() => setSource(s.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
                source === s.id
                  ? 'border-lantean-blue bg-primary/20 text-white'
                  : 'border-border bg-surface text-muted hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <div className="text-left">
                <span className="text-sm font-medium block">{s.label}</span>
                <span className="text-xs opacity-60">{s.description}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="card space-y-3">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={source === 'google-maps' ? 'Ex: agences web Paris' : source === 'linkedin' ? 'Ex: directeur marketing startup' : 'Mots-clés de recherche'}
            className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
          />
          <button
            type="submit"
            disabled={isSearching || (!query.trim() && !url.trim())}
            className="flex items-center gap-2 px-6 py-3 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-medium"
          >
            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            <span>{isSearching ? 'Recherche...' : 'Lancer'}</span>
          </button>
        </div>
        {(source === 'linkedin' || source === 'web') && (
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL spécifique (optionnel)"
            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue text-sm"
          />
        )}
        {isSearching && (
          <p className="text-xs text-gold-accent animate-pulse">Scraping en cours... cela peut prendre 30-60 secondes</p>
        )}
      </form>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Filtrer les leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Lead['status'] | 'all')}
          className="px-4 py-2.5 bg-surface border border-border rounded-lg text-white outline-none focus:border-lantean-blue"
        >
          <option value="all">Tous</option>
          <option value="new">Nouveau</option>
          <option value="contacted">Contacté</option>
          <option value="qualified">Qualifié</option>
          <option value="converted">Converti</option>
          <option value="lost">Perdu</option>
        </select>
      </div>

      {/* Lead list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <Target className="w-12 h-12 mb-4 opacity-30" />
          <p>{leads.length === 0 ? 'Lancez une recherche pour trouver des leads' : 'Aucun résultat'}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((lead) => (
            <div key={lead.id} className="card-hover">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gold-accent/20 flex items-center justify-center text-gold-accent font-bold flex-shrink-0">
                    {lead.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{lead.name}</p>
                    {lead.company && <p className="text-sm text-muted">{lead.company}</p>}
                    <div className="flex flex-wrap gap-3 mt-1.5">
                      {lead.email && (
                        <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-xs text-lantean-blue hover:underline">
                          <Mail className="w-3 h-3" />{lead.email}
                        </a>
                      )}
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs text-muted hover:text-white">
                          <Phone className="w-3 h-3" />{lead.phone}
                        </a>
                      )}
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted hover:text-white">
                          <ExternalLink className="w-3 h-3" />Site web
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-xs text-muted">Score: {lead.score}/100</div>
                  <select
                    value={lead.status}
                    onChange={(e) => updateLeadStatus(lead.id, e.target.value as Lead['status'])}
                    className={`text-xs px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${STATUS_COLORS[lead.status]}`}
                  >
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
