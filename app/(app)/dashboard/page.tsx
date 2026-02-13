'use client'

import { useEffect, useState } from 'react'
import { Users, FolderKanban, Receipt, TrendingUp, Calendar, Mail, Loader2, Wifi, Unplug, ExternalLink, UserPlus } from 'lucide-react'
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
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null)

  useEffect(() => {
    async function loadAll() {
      setIsLoading(true)
      try {
        const [clientsRes, projectsRes, calendarRes, gmailRes, authRes] = await Promise.allSettled([
          fetch('/api/notion/clients'),
          fetch('/api/notion/projects'),
          fetch('/api/calendar'),
          fetch('/api/gmail?maxResults=5&q=is:unread'),
          fetch('/api/auth/status'),
        ])

        let totalClients = 0
        let activeProjects = 0
        let newLeads = 0
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
        if (authRes.status === 'fulfilled') {
          const data = await authRes.value.json()
          setGoogleConnected(data.google === true)
        } else {
          setGoogleConnected(false)
        }

        // Count leads from localStorage
        try {
          const leads = localStorage.getItem('prospection_leads')
          if (leads) newLeads = JSON.parse(leads).length
        } catch { /* ignore */ }

        setStats({
          totalClients,
          activeProjects,
          pendingInvoices: 0,
          totalRevenue: 0,
          revenueGrowth: 0,
          newLeads,
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

      {/* Google Connection Banner */}
      {googleConnected === false && (
        <a
          href="/api/auth/google"
          className="flex items-center gap-4 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl hover:bg-yellow-500/10 transition-colors group"
        >
          <div className="p-2.5 rounded-lg bg-yellow-500/10">
            <Unplug className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-yellow-400">Google Workspace non connecté</p>
            <p className="text-xs text-muted mt-0.5">Connectez Google pour accéder à Calendar, Gmail, Drive et Docs</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg group-hover:bg-white/15 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-sm font-medium">Connecter</span>
            <ExternalLink className="w-3.5 h-3.5 text-muted" />
          </div>
        </a>
      )}
      {googleConnected === true && (
        <div className="flex items-center gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
          <Wifi className="w-4 h-4 text-green-400" />
          <span className="text-sm text-green-400">Google Workspace connecté</span>
          <div className="flex gap-2 ml-auto">
            {['Calendar', 'Gmail', 'Drive', 'Docs'].map((s) => (
              <span key={s} className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-400/70 rounded-full">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Clients" value={stats.totalClients} sub="Notion CRM" color="bg-blue-500/10 text-blue-400" />
        <StatCard icon={FolderKanban} label="Projets actifs" value={stats.activeProjects} sub="En cours" color="bg-green-500/10 text-green-400" />
        <StatCard icon={Receipt} label="Factures en attente" value={stats.pendingInvoices} color="bg-yellow-500/10 text-yellow-400" />
        <StatCard icon={UserPlus} label="Leads" value={stats.newLeads} sub="Prospection" color="bg-orange-500/10 text-orange-400" />
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
