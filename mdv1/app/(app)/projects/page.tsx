'use client'

import { useEffect, useState } from 'react'
import { FolderKanban, Plus, Search, Loader2 } from 'lucide-react'
import type { Project } from '@/types'

const STATUS_COLORS: Record<Project['status'], string> = {
  draft: 'bg-gray-500/10 text-gray-400',
  in_progress: 'bg-blue-500/10 text-blue-400',
  review: 'bg-yellow-500/10 text-yellow-400',
  completed: 'bg-green-500/10 text-green-400',
  archived: 'bg-muted/10 text-muted',
}

const STATUS_LABELS: Record<Project['status'], string> = {
  draft: 'Brouillon',
  in_progress: 'En cours',
  review: 'En revue',
  completed: 'Terminé',
  archived: 'Archivé',
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/notion/projects')
        const data = await res.json()
        if (data.success) setProjects(data.data)
      } catch {
        // Will be connected to Notion API
      } finally {
        setIsLoading(false)
      }
    }
    loadProjects()
  }, [])

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projets</h1>
          <p className="text-muted text-sm mt-1">Gestion via Notion</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors">
          <Plus className="w-4 h-4" />
          <span className="text-sm">Nouveau projet</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Rechercher un projet..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-lantean-blue animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <FolderKanban className="w-12 h-12 mb-4 opacity-30" />
          <p>{projects.length === 0 ? 'Aucun projet' : 'Aucun résultat'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <div key={project.id} className="card-hover">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold">{project.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[project.status]}`}>
                  {STATUS_LABELS[project.status]}
                </span>
              </div>
              {project.description && (
                <p className="text-sm text-muted mb-3 line-clamp-2">{project.description}</p>
              )}
              {project.clientName && (
                <p className="text-xs text-muted">Client: {project.clientName}</p>
              )}
              {project.budget && (
                <p className="text-xs text-lantean-blue mt-1">
                  Budget: {project.budget.toLocaleString('fr-FR')} €
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
