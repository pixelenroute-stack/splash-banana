'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, Eye, EyeOff, ExternalLink, CheckCircle2, XCircle, AlertCircle, Loader2, Unplug, Wifi } from 'lucide-react'
import type { SystemSettings } from '@/types'

interface ApiKeyFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  description?: string
}

function ApiKeyField({ label, value, onChange, placeholder, description }: ApiKeyFieldProps) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {description && <p className="text-xs text-muted mb-1.5">{description}</p>}
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 pr-10 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors font-mono text-sm"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    theme: 'dark',
    language: 'fr',
  })
  const [saved, setSaved] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [checkingGoogle, setCheckingGoogle] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    // Load settings from localStorage
    const stored = localStorage.getItem('system_settings')
    if (stored) {
      try { setSettings(JSON.parse(stored)) } catch { /* ignore */ }
    }

    // Check Google connection via API (httpOnly cookies not visible to JS)
    async function checkGoogle() {
      setCheckingGoogle(true)
      try {
        const res = await fetch('/api/auth/status')
        const data = await res.json()
        setGoogleConnected(data.google === true)
      } catch {
        setGoogleConnected(false)
      } finally {
        setCheckingGoogle(false)
      }
    }
    checkGoogle()

    // Check URL params for connection status
    const params = new URLSearchParams(window.location.search)
    if (params.get('google') === 'connected') {
      setGoogleConnected(true)
    }
    const error = params.get('error')
    if (error) {
      setAuthError(decodeURIComponent(error))
    }
  }, [])

  function handleSave() {
    localStorage.setItem('system_settings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Paramètres</h1>
          <p className="text-muted text-sm mt-1">Configuration de la plateforme</p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            saved ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-lantean-blue hover:bg-primary/30'
          }`}
        >
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span className="text-sm font-medium">{saved ? 'Sauvegardé !' : 'Sauvegarder'}</span>
        </button>
      </div>

      {/* Error Banner */}
      {authError && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-400 font-medium">Erreur de connexion Google</p>
            <p className="text-xs text-red-400/70 mt-0.5">{authError}</p>
          </div>
          <button onClick={() => setAuthError('')} className="text-red-400 hover:text-red-300 text-xs">Fermer</button>
        </div>
      )}

      {/* Google OAuth Connection */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${googleConnected ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              {googleConnected ? <Wifi className="w-5 h-5 text-green-400" /> : <Unplug className="w-5 h-5 text-red-400" />}
            </div>
            <div>
              <h2 className="font-semibold">Google Workspace</h2>
              <p className="text-xs text-muted mt-0.5">Calendar, Gmail, Drive, Docs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {checkingGoogle ? (
              <Loader2 className="w-4 h-4 text-muted animate-spin" />
            ) : googleConnected ? (
              <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connecté
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 px-3 py-1 rounded-full">
                <XCircle className="w-3.5 h-3.5" />
                Non connecté
              </span>
            )}
          </div>
        </div>

        {googleConnected && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { name: 'Calendar', desc: 'Événements', color: 'text-blue-400' },
              { name: 'Gmail', desc: 'Emails', color: 'text-red-400' },
              { name: 'Drive', desc: 'Fichiers', color: 'text-yellow-400' },
              { name: 'Docs', desc: 'Contrats', color: 'text-cyan-400' },
            ].map((s) => (
              <div key={s.name} className="bg-background/50 rounded-lg p-2 text-center">
                <p className={`text-xs font-medium ${s.color}`}>{s.name}</p>
                <p className="text-[10px] text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        )}

        <a
          href="/api/auth/google"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white/10 hover:bg-white/15 border border-border rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span className="text-sm font-medium">{googleConnected ? 'Reconnecter Google' : 'Connecter Google Workspace'}</span>
          <ExternalLink className="w-3.5 h-3.5 text-muted" />
        </a>
        <p className="text-xs text-muted">
          Autorise l&apos;accès à Google Calendar, Gmail (lecture), Google Drive et Google Docs pour les contrats.
        </p>
      </div>

      {/* Services Configuration */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-5 h-5 text-lantean-blue" />
          <h2 className="font-semibold">Services IA</h2>
        </div>
        <ApiKeyField
          label="Gemini API Key"
          value={settings.geminiApiKey || ''}
          onChange={(v) => setSettings({ ...settings, geminiApiKey: v })}
          placeholder="AIzaSy..."
          description="Utilisé pour Chat IA, Image Studio, Video Studio et Tutoriels"
        />
        <ApiKeyField
          label="Perplexity API Key"
          value={settings.perplexityApiKey || ''}
          onChange={(v) => setSettings({ ...settings, perplexityApiKey: v })}
          placeholder="pplx-..."
          description="Utilisé pour les Actualités et la veille"
        />
      </div>

      {/* Notion */}
      <div className="card space-y-4">
        <h2 className="font-semibold">Notion CRM</h2>
        <ApiKeyField
          label="Notion API Key"
          value={settings.notionApiKey || ''}
          onChange={(v) => setSettings({ ...settings, notionApiKey: v })}
          placeholder="ntn_..."
          description="Gestion des clients et projets"
        />
      </div>

      {/* Qonto */}
      <div className="card space-y-4">
        <h2 className="font-semibold">Qonto (Facturation)</h2>
        <ApiKeyField
          label="Identifiant Qonto"
          value={settings.qontoLogin || ''}
          onChange={(v) => setSettings({ ...settings, qontoLogin: v })}
          placeholder="ei-..."
        />
        <ApiKeyField
          label="Clé secrète Qonto"
          value={settings.qontoSecret || ''}
          onChange={(v) => setSettings({ ...settings, qontoSecret: v })}
          placeholder="ac5c..."
        />
      </div>

      {/* App Info */}
      <div className="card">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Splash Banana v2.0</span>
          <span>Next.js 14 + Gemini AI</span>
        </div>
      </div>
    </div>
  )
}
