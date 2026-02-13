'use client'

import { useState } from 'react'
import { Library, Upload, Search, Grid, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MediaAsset } from '@/types'

export default function LibraryPage() {
  const [assets] = useState<MediaAsset[]>([])
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const filtered = assets.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Médiathèque</h1>
          <p className="text-muted text-sm mt-1">Gestion des médias</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors">
          <Upload className="w-4 h-4" />
          <span className="text-sm">Importer</span>
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Rechercher un média..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
          />
        </div>
        <div className="flex bg-surface border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={cn('p-2.5', viewMode === 'grid' ? 'bg-primary/20 text-lantean-blue' : 'text-muted')}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn('p-2.5', viewMode === 'list' ? 'bg-primary/20 text-lantean-blue' : 'text-muted')}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <Library className="w-12 h-12 mb-4 opacity-30" />
          <p>Aucun média</p>
          <p className="text-sm mt-1">Importez ou générez des médias</p>
        </div>
      ) : null}
    </div>
  )
}
