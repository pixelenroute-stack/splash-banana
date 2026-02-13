'use client'

import { Shield, Server, Database, Key } from 'lucide-react'

export default function AdminPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Console Admin</h1>
        <p className="text-muted text-sm mt-1">Administration du système</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Server className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="font-semibold">Infrastructure</h3>
          </div>
          <p className="text-sm text-muted">APIs connectées, statut des services</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Gemini API</span>
              <span className="text-green-400">Configurée</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Notion API</span>
              <span className="text-green-400">Configurée</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Perplexity API</span>
              <span className="text-green-400">Configurée</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Claude API</span>
              <span className="text-green-400">Configurée</span>
            </div>
          </div>
        </div>

        <div className="card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Database className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="font-semibold">Bases de données</h3>
          </div>
          <p className="text-sm text-muted">Notion CRM, Projets, Stockage local</p>
        </div>

        <div className="card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Key className="w-5 h-5 text-yellow-400" />
            </div>
            <h3 className="font-semibold">Credentials</h3>
          </div>
          <p className="text-sm text-muted">Gestion des clés API et tokens</p>
        </div>

        <div className="card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-semibold">Sécurité</h3>
          </div>
          <p className="text-sm text-muted">Utilisateurs, rôles, permissions</p>
        </div>
      </div>
    </div>
  )
}
