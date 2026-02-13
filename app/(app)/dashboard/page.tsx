'use client'

import { useEffect, useState } from 'react'
import { LayoutDashboard, Users, FolderKanban, Receipt, TrendingUp, UserPlus, Calendar, Mail, Loader2 } from 'lucide-react'
import type { DashboardStats, CalendarEvent, Email } from '@/types'

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
    totalClients: 0, activeProjects: 0, pendingInvoices: 0,
    totalRevenue: 0, revenueGrowth: 0, newLeads: 0,
  })
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [emails, setEmails] = useState<Email[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadAll() {
      setIsLoading(true)
      try {
        const [clientsRes, projectsRes, calendarRes, gmailRes] = await Promise.allSettled([
          fetch('/api/notion/clients'),
          fetch('/api/notion/projects'),
          fetch('/api/calendar'),
          fetch('/api/gmail?maxResults=5&q=is:unread'),
        ])

        let totalClients = 0
        let activeProjects = 0
        if (clientsRes.status === 'fulfilled') {
          const data = await clientsRes.value.json()
          if (data.success) totalClients = data.data.length
        }
        if (projectsRes.status === 'fulfilled') {
          const data = await projectsRes.value.json()
          if (data.success) activeProjects = data.data.filter((p: { status: string }) => p.status === 'in_progress').length
        }
        if (calendarRes.status === 'fulfilled') {
          const data = await calendarRes.value.json()
          if (data.success) setEvents(data.data.slice(0, 5))
        }
        if (gmailRes.status === 'fulfilled') {
          const data = await gmailRes.value.json()
          if (data.success) setEmails(data.data.slice(0, 5))
        }

        setStats({
          totalClients,
          activeProjects,
          pendingInvoices: 0,
          totalRevenue: 0,
          revenueGrowth: 0,
          newLeads: 0,
        })
      } catch {
        // Dashboard load error
      } finally {
        setIsLoading(false)
      }
    }
    loadAll()
  }, [])

  function formatEventTime(dateStr: string) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  function extractSender(from: string) {
    const match = from.match(/^"?([^"<]+)"?\s*<?/)
    return match ? match[1].trim() : from
  }

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
        <StatCard icon={Users} label="Clients" value={stats.totalClients} sub="Notion CRM" color="bg-blue-500/10 text-blue-400" />
        <StatCard icon={FolderKanban} label="Projets actifs" value={stats.activeProjects} sub="En cours" color="bg-green-500/10 text-green-400" />
        <StatCard icon={Receipt} label="Factures en attente" value={stats.pendingInvoices} color="bg-yellow-500/10 text-yellow-400" />
        <StatCard icon={TrendingUp} label="Revenu total" value={`${stats.totalRevenue.toLocaleString('fr-FR')} €`} color="bg-emerald-500/10 text-emerald-400" />
        <StatCard icon={Mail} label="Emails non lus" value={emails.length} sub="Gmail" color="bg-purple-500/10 text-purple-400" />
        <StatCard icon={Calendar} label="Événements à venir" value={events.length} sub="Google Calendar" color="bg-cyan-500/10 text-cyan-400" />
      </div>

      {/* Activity section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-lantean-blue" />
            Prochains événements
          </h3>
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-lantean-blue animate-spin" /></div>
          ) : events.length === 0 ? (
            <p className="text-muted text-sm">Aucun événement à venir</p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  <div className="w-1 h-8 bg-lantean-blue rounded-full flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-medium">{event.summary}</p>
                    <p className="text-xs text-muted">{formatEventTime(event.start)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4 text-purple-400" />
            Emails récents
          </h3>
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-lantean-blue animate-spin" /></div>
          ) : emails.length === 0 ? (
            <p className="text-muted text-sm">Aucun email non lu</p>
          ) : (
            <div className="space-y-3">
              {emails.map((email) => (
                <div key={email.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0 mt-2" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{email.subject || '(Sans objet)'}</p>
                    <p className="text-xs text-muted truncate">{extractSender(email.from)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
