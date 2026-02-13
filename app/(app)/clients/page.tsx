'use client'

import { useEffect, useState } from 'react'
import { Users, Plus, Search, Loader2 } from 'lucide-react'
import type { Client } from '@/types'

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadClients() {
      try {
        const res = await fetch('/api/notion/clients')
        const data = await res.json()
        if (data.success) setClients(data.data)
      } catch {
        // Will be connected to Notion API
      } finally {
        setIsLoading(false)
      }
    }
    loadClients()
  }, [])

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients CRM</h1>
          <p className="text-muted text-sm mt-1">Gestion via Notion</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors">
          <Plus className="w-4 h-4" />
          <span className="text-sm">Nouveau client</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Rechercher un client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
        />
      </div>

      {/* Client list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-lantean-blue animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <Users className="w-12 h-12 mb-4 opacity-30" />
          <p>{clients.length === 0 ? 'Aucun client' : 'Aucun résultat'}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((client) => (
            <div key={client.id} className="card-hover flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lantean-blue font-bold">
                  {client.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{client.name}</p>
                  <p className="text-sm text-muted">{client.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {client.company && (
                  <span className="text-sm text-muted">{client.company}</span>
                )}
                <span className={`text-xs px-2 py-1 rounded-full ${
                  client.status === 'active' ? 'bg-green-500/10 text-green-400' :
                  client.status === 'prospect' ? 'bg-blue-500/10 text-blue-400' :
                  client.status === 'lead' ? 'bg-yellow-500/10 text-yellow-400' :
                  'bg-gray-500/10 text-gray-400'
                }`}>
                  {client.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
