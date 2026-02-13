'use client'

import { useEffect, useState } from 'react'
import { LayoutDashboard, Users, FolderKanban, Receipt, TrendingUp, UserPlus } from 'lucide-react'
import type { DashboardStats } from '@/types'

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div className="card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted mb-1">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeProjects: 0,
    pendingInvoices: 0,
    totalRevenue: 0,
    revenueGrowth: 0,
    newLeads: 0,
  })

  useEffect(() => {
    // TODO: Fetch real stats from Notion + Qonto APIs
    setStats({
      totalClients: 24,
      activeProjects: 8,
      pendingInvoices: 5,
      totalRevenue: 47500,
      revenueGrowth: 12.5,
      newLeads: 15,
    })
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-muted text-sm mt-1">Vue d&apos;ensemble de votre activité</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          label="Clients"
          value={stats.totalClients}
          sub="Notion CRM"
          color="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          icon={FolderKanban}
          label="Projets actifs"
          value={stats.activeProjects}
          sub="En cours"
          color="bg-green-500/10 text-green-400"
        />
        <StatCard
          icon={Receipt}
          label="Factures en attente"
          value={stats.pendingInvoices}
          color="bg-yellow-500/10 text-yellow-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Revenu total"
          value={`${stats.totalRevenue.toLocaleString('fr-FR')} €`}
          sub={`+${stats.revenueGrowth}% ce mois`}
          color="bg-emerald-500/10 text-emerald-400"
        />
        <StatCard
          icon={UserPlus}
          label="Nouveaux leads"
          value={stats.newLeads}
          sub="Ce mois"
          color="bg-purple-500/10 text-purple-400"
        />
        <StatCard
          icon={LayoutDashboard}
          label="Taux conversion"
          value="68%"
          sub="Objectif: 75%"
          color="bg-cyan-500/10 text-cyan-400"
        />
      </div>

      {/* Activity section placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-4">Activité récente</h3>
          <p className="text-muted text-sm">Les données seront chargées depuis Notion...</p>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-4">Prochaines échéances</h3>
          <p className="text-muted text-sm">Les données seront chargées depuis Google Calendar...</p>
        </div>
      </div>
    </div>
  )
}
