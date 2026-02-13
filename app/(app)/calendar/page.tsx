'use client'

import { useEffect, useState, FormEvent } from 'react'
import { Calendar as CalendarIcon, Plus, Loader2, Clock, MapPin, Trash2, X } from 'lucide-react'
import type { CalendarEvent } from '@/types'

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ summary: '', description: '', start: '', end: '', location: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function loadEvents() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/calendar')
      const data = await res.json()
      if (data.success) setEvents(data.data)
    } catch {
      // Calendar not connected
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadEvents() }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!formData.summary || !formData.start || !formData.end) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.success) {
        setShowForm(false)
        setFormData({ summary: '', description: '', start: '', end: '', location: '' })
        loadEvents()
      }
    } catch {
      // Error
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/calendar?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) setEvents((prev) => prev.filter((e) => e.id !== id))
    } catch {
      // Error
    }
  }

  function formatEventDate(dateStr: string) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const today = new Date().toISOString().split('T')[0]
  const todayEvents = events.filter((e) => e.start.startsWith(today))
  const upcomingEvents = events.filter((e) => !e.start.startsWith(today))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10">
            <CalendarIcon className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Calendrier</h1>
            <p className="text-muted text-sm mt-1">Google Calendar - Événements</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span className="text-sm">{showForm ? 'Annuler' : 'Nouvel événement'}</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card space-y-4">
          <h3 className="font-semibold">Nouvel événement</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Titre de l'événement"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              className="px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue"
              required
            />
            <input
              type="text"
              placeholder="Lieu (optionnel)"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue"
            />
            <input
              type="datetime-local"
              value={formData.start}
              onChange={(e) => setFormData({ ...formData, start: e.target.value })}
              className="px-4 py-2.5 bg-background border border-border rounded-lg text-white outline-none focus:border-lantean-blue"
              required
            />
            <input
              type="datetime-local"
              value={formData.end}
              onChange={(e) => setFormData({ ...formData, end: e.target.value })}
              className="px-4 py-2.5 bg-background border border-border rounded-lg text-white outline-none focus:border-lantean-blue"
              required
            />
          </div>
          <textarea
            placeholder="Description (optionnel)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue resize-none"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-30 font-medium"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-lantean-blue animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <CalendarIcon className="w-12 h-12 mb-4 opacity-30" />
          <p>Aucun événement à venir</p>
        </div>
      ) : (
        <div className="space-y-6">
          {todayEvents.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 text-gold-accent">Aujourd&apos;hui</h3>
              <div className="grid gap-3">
                {todayEvents.map((event) => (
                  <EventCard key={event.id} event={event} onDelete={handleDelete} formatDate={formatEventDate} />
                ))}
              </div>
            </div>
          )}
          {upcomingEvents.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">À venir</h3>
              <div className="grid gap-3">
                {upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} onDelete={handleDelete} formatDate={formatEventDate} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EventCard({ event, onDelete, formatDate }: { event: CalendarEvent; onDelete: (id: string) => void; formatDate: (d: string) => string }) {
  return (
    <div className="card-hover flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 flex-1">
        <div className="w-1 h-12 bg-lantean-blue rounded-full flex-shrink-0 mt-1" />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{event.summary}</p>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(event.start)} — {formatDate(event.end)}
            </span>
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {event.location}
              </span>
            )}
          </div>
          {event.description && <p className="text-sm text-muted mt-1 line-clamp-2">{event.description}</p>}
        </div>
      </div>
      <button onClick={() => onDelete(event.id)} className="p-2 text-muted hover:text-red-400 transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
