'use client'

import { useState, useEffect } from 'react'
import { Target, Search, Loader2, Globe, MapPin, Linkedin, ExternalLink, Mail, Phone, Plus, X, AlertCircle, UserPlus } from 'lucide-react'
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

type ExtendedLead = Lead & { phone?: string; website?: string; address?: string }

const STORAGE_KEY = 'prospection_leads'

function loadLeads(): ExtendedLead[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}

function saveLeads(leads: ExtendedLead[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads))
}

export default function ProspectionPage() {
  const [leads, setLeads] = useState<ExtendedLead[]>([])
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('google-maps')
  const [query, setQuery] = useState('')
  const [url, setUrl] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [filter, setFilter] = useState<Lead['status'] | 'all'>('all')
  const [error, setError] = useState('')
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualLead, setManualLead] = useState({ name: '', email: '', company: '', phone: '', website: '' })

  // Load leads from localStorage on mount
  useEffect(() => {
    setLeads(loadLeads())
  }, [])

  // Save leads whenever they change
  useEffect(() => {
    if (leads.length > 0) saveLeads(leads)
  }, [leads])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim() && !url.trim()) return
    setIsSearching(true)
    setError('')
    try {
      const res = await fetch('/api/apify/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, query: query.trim(), url: url.trim() }),
      })
      const data = await res.json()
      if (data.success && data.data && data.data.length > 0) {
        setLeads((prev) => {
          const updated = [...data.data, ...prev]
          saveLeads(updated)
          return updated
        })
      } else if (data.success && (!data.data || data.data.length === 0)) {
        setError('Aucun résultat trouvé. Essayez avec des termes différents.')
      } else {
        setError(data.error || 'Erreur lors de la recherche')
      }
    } catch {
      setError('Impossible de se connecter au service de prospection. Vérifiez votre connexion.')
    } finally {
      setIsSearching(false)
    }
  }

  function handleAddManualLead(e: React.FormEvent) {
    e.preventDefault()
    if (!manualLead.name.trim()) return
    const newLead: ExtendedLead = {
      id: `manual-${Date.now()}`,
      name: manualLead.name.trim(),
      email: manualLead.email.trim() || undefined,
      company: manualLead.company.trim() || undefined,
      phone: manualLead.phone.trim() || undefined,
      website: manualLead.website.trim() || undefined,
      score: 50,
      status: 'new',
      source: 'manual',
      createdAt: new Date().toISOString(),
    }
    setLeads((prev) => {
      const updated = [newLead, ...prev]
      saveLeads(updated)
      return updated
    })
    setManualLead({ name: '', email: '', company: '', phone: '', website: '' })
    setShowManualForm(false)
  }

  function updateLeadStatus(id: string, status: Lead['status']) {
    setLeads((prev) => {
      const updated = prev.map((l) => l.id === id ? { ...l, status } : l)
      saveLeads(updated)
      return updated
    })
  }

  function deleteLead(id: string) {
    setLeads((prev) => {
      const updated = prev.filter((l) => l.id !== id)
      saveLeads(updated)
      return updated
    })
  }

  const filtered = leads.filter((l) => {
    const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.company?.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || l.status === filter
    return matchesSearch && matchesFilter
  })

  const statusCounts = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prospection</h1>
          <p className="text-muted text-sm mt-1">Recherche et gestion de leads</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className="flex items-center gap-2 px-4 py-2 bg-gold-accent/10 text-gold-accent rounded-lg hover:bg-gold-accent/20 transition-colors"
          >
            {showManualForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            <span className="text-sm">{showManualForm ? 'Annuler' : 'Ajout manuel'}</span>
          </button>
          <div className="text-sm text-muted">{leads.length} leads</div>
        </div>
      </div>

      {/* Stats */}
      {leads.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <div key={key} className={`px-3 py-1.5 rounded-full text-xs ${STATUS_COLORS[key as Lead['status']]}`}>
              {label}: {statusCounts[key] || 0}
            </div>
          ))}
        </div>
      )}

      {/* Manual lead form */}
      {showManualForm && (
        <form onSubmit={handleAddManualLead} className="card space-y-3">
          <h3 className="font-semibold text-sm">Ajouter un lead manuellement</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" placeholder="Nom *" value={manualLead.name} onChange={(e) => setManualLead({ ...manualLead, name: e.target.value })} className="px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue text-sm" required />
            <input type="email" placeholder="Email" value={manualLead.email} onChange={(e) => setManualLead({ ...manualLead, email: e.target.value })} className="px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue text-sm" />
            <input type="text" placeholder="Entreprise" value={manualLead.company} onChange={(e) => setManualLead({ ...manualLead, company: e.target.value })} className="px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue text-sm" />
            <input type="tel" placeholder="Téléphone" value={manualLead.phone} onChange={(e) => setManualLead({ ...manualLead, phone: e.target.value })} className="px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue text-sm" />
            <input type="url" placeholder="Site web" value={manualLead.website} onChange={(e) => setManualLead({ ...manualLead, website: e.target.value })} className="px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue text-sm" />
          </div>
          <button type="submit" className="px-6 py-2.5 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors font-medium text-sm">
            Ajouter le lead
          </button>
        </form>
      )}

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

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

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
          <p>{leads.length === 0 ? 'Lancez une recherche ou ajoutez un lead manuellement' : 'Aucun résultat pour ce filtre'}</p>
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
                    <p className="text-[10px] text-muted mt-1">
                      Source: {lead.source} | {new Date(lead.createdAt).toLocaleDateString('fr-FR')}
                    </p>
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
                  <button
                    onClick={() => deleteLead(lead.id)}
                    className="p-1 text-muted hover:text-red-400 transition-colors"
                    title="Supprimer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
