'use client'

import { useEffect, useState } from 'react'
import { Mail, Search, Loader2, Star, Paperclip, ChevronLeft, RefreshCw } from 'lucide-react'
import type { Email } from '@/types'

export default function GmailPage() {
  const [emails, setEmails] = useState<Email[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [emailBody, setEmailBody] = useState('')
  const [isLoadingBody, setIsLoadingBody] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  async function loadEmails(query = '') {
    setIsLoading(true)
    try {
      const q = filter === 'unread' ? `is:unread ${query}` : query
      const res = await fetch(`/api/maton/gmail?q=${encodeURIComponent(q)}&maxResults=30`)
      const data = await res.json()
      if (data.success) setEmails(data.data)
    } catch {
      // Gmail not connected
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadEmails(search) }, [filter])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    loadEmails(search)
  }

  async function openEmail(email: Email) {
    setSelectedEmail(email)
    setIsLoadingBody(true)
    try {
      const res = await fetch(`/api/maton/gmail?id=${email.id}`)
      const data = await res.json()
      if (data.success) {
        setEmailBody(data.data.body || data.data.snippet || '')
        setSelectedEmail(data.data)
      }
    } catch {
      setEmailBody(email.snippet)
    } finally {
      setIsLoadingBody(false)
    }
  }

  function formatEmailDate(dateStr: string) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  function extractSender(from: string) {
    const match = from.match(/^"?([^"<]+)"?\s*<?/)
    return match ? match[1].trim() : from
  }

  if (selectedEmail) {
    return (
      <div className="p-6 space-y-4">
        <button
          onClick={() => { setSelectedEmail(null); setEmailBody('') }}
          className="flex items-center gap-2 text-muted hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">Retour</span>
        </button>
        <div className="card space-y-4">
          <h2 className="text-xl font-bold">{selectedEmail.subject || '(Sans objet)'}</h2>
          <div className="flex items-center justify-between text-sm text-muted border-b border-border pb-3">
            <div>
              <span className="text-white font-medium">{extractSender(selectedEmail.from)}</span>
              <span className="ml-2">&lt;{selectedEmail.from.match(/<(.+)>/)?.[1] || selectedEmail.from}&gt;</span>
            </div>
            <span>{selectedEmail.date}</span>
          </div>
          {isLoadingBody ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-lantean-blue animate-spin" />
            </div>
          ) : (
            <div
              className="prose prose-invert max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: emailBody }}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Emails</h1>
          <p className="text-muted text-sm mt-1">Gmail via Maton.ai</p>
        </div>
        <button
          onClick={() => loadEmails(search)}
          className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-sm">Actualiser</span>
        </button>
      </div>

      <div className="flex gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Rechercher dans les emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
          />
        </form>
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${filter === 'all' ? 'bg-primary/20 text-lantean-blue' : 'text-muted hover:text-white'}`}
          >
            Tous
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${filter === 'unread' ? 'bg-primary/20 text-lantean-blue' : 'text-muted hover:text-white'}`}
          >
            Non lus
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-lantean-blue animate-spin" />
        </div>
      ) : emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <Mail className="w-12 h-12 mb-4 opacity-30" />
          <p>Aucun email</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {emails.map((email) => (
            <button
              key={email.id}
              onClick={() => openEmail(email)}
              className={`w-full text-left px-4 py-3 hover:bg-surface/50 transition-colors flex items-start gap-3 ${email.isUnread ? 'bg-surface/30' : ''}`}
            >
              <div className="flex-shrink-0 mt-1">
                {email.isUnread ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-lantean-blue" />
                ) : (
                  <div className="w-2.5 h-2.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm truncate ${email.isUnread ? 'font-bold' : 'font-medium'}`}>
                    {extractSender(email.from)}
                  </span>
                  <span className="text-xs text-muted flex-shrink-0">{formatEmailDate(email.date)}</span>
                </div>
                <p className={`text-sm truncate ${email.isUnread ? 'text-white' : 'text-muted'}`}>
                  {email.subject || '(Sans objet)'}
                </p>
                <p className="text-xs text-muted truncate mt-0.5">{email.snippet}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {email.labels.includes('STARRED') && <Star className="w-3.5 h-3.5 text-gold-accent" />}
                {email.labels.includes('ATTACHMENT') && <Paperclip className="w-3.5 h-3.5 text-muted" />}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
