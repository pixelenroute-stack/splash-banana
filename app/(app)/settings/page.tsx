'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, Eye, EyeOff, ExternalLink, CheckCircle2, XCircle } from 'lucide-react'
import type { SystemSettings } from '@/types'

interface ApiKeyFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

function ApiKeyField({ label, value, onChange, placeholder }: ApiKeyFieldProps) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
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

  useEffect(() => {
    const stored = localStorage.getItem('system_settings')
    if (stored) {
      try { setSettings(JSON.parse(stored)) } catch { /* ignore */ }
    }
    // Check Google connection via cookie presence
    setGoogleConnected(document.cookie.includes('google_tokens'))

    // Check URL for Google connection status
    const params = new URLSearchParams(window.location.search)
    if (params.get('google') === 'connected') {
      setGoogleConnected(true)
    }
    if (params.get('error')) {
      // Show error state
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
          className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors"
        >
          <Save className="w-4 h-4" />
          <span className="text-sm">{saved ? 'Sauvegardé !' : 'Sauvegarder'}</span>
        </button>
      </div>

      {/* Google OAuth Connection */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Google Workspace</h2>
            <p className="text-xs text-muted mt-1">Calendar, Gmail, Drive, Docs</p>
          </div>
          <div className="flex items-center gap-2">
            {googleConnected ? (
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                Connecté
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-red-400">
                <XCircle className="w-4 h-4" />
                Non connecté
              </span>
            )}
          </div>
        </div>
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
          <span className="text-sm font-medium">{googleConnected ? 'Reconnecter Google' : 'Connecter Google'}</span>
          <ExternalLink className="w-3.5 h-3.5 text-muted" />
        </a>
        <p className="text-xs text-muted">
          Autorise l&apos;accès à Google Calendar, Gmail (lecture), Google Drive (lecture) et Google Docs.
        </p>
      </div>

      {/* AI Services */}
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
        />
        <ApiKeyField
          label="OpenAI API Key"
          value={settings.openaiApiKey || ''}
          onChange={(v) => setSettings({ ...settings, openaiApiKey: v })}
          placeholder="sk-proj-..."
        />
        <ApiKeyField
          label="Claude API Key"
          value={settings.claudeApiKey || ''}
          onChange={(v) => setSettings({ ...settings, claudeApiKey: v })}
          placeholder="sk-ant-..."
        />
        <ApiKeyField
          label="Perplexity API Key"
          value={settings.perplexityApiKey || ''}
          onChange={(v) => setSettings({ ...settings, perplexityApiKey: v })}
          placeholder="pplx-..."
        />
      </div>

      {/* Notion */}
      <div className="card space-y-4">
        <h2 className="font-semibold">Notion</h2>
        <ApiKeyField
          label="Notion API Key"
          value={settings.notionApiKey || ''}
          onChange={(v) => setSettings({ ...settings, notionApiKey: v })}
          placeholder="ntn_..."
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
    </div>
  )
}
