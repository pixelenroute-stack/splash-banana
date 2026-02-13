'use client'

import { useState } from 'react'
import { Target, Plus, Search } from 'lucide-react'
import type { Lead } from '@/types'

const STATUS_COLORS: Record<Lead['status'], string> = {
  new: 'bg-blue-500/10 text-blue-400',
  contacted: 'bg-yellow-500/10 text-yellow-400',
  qualified: 'bg-green-500/10 text-green-400',
  converted: 'bg-emerald-500/10 text-emerald-400',
  lost: 'bg-red-500/10 text-red-400',
}

export default function ProspectionPage() {
  const [leads] = useState<Lead[]>([])
  const [search, setSearch] = useState('')

  const filtered = leads.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.company?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prospection</h1>
          <p className="text-muted text-sm mt-1">Gestion des leads</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors">
          <Plus className="w-4 h-4" />
          <span className="text-sm">Nouveau lead</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Rechercher un lead..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <Target className="w-12 h-12 mb-4 opacity-30" />
          <p>Aucun lead</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((lead) => (
            <div key={lead.id} className="card-hover flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold-accent/20 flex items-center justify-center text-gold-accent font-bold">
                  {lead.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{lead.name}</p>
                  <p className="text-sm text-muted">{lead.company || lead.source}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm text-muted">Score: {lead.score}/100</div>
                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[lead.status]}`}>
                  {lead.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
