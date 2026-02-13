'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, Eye, EyeOff } from 'lucide-react'
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

  useEffect(() => {
    const stored = localStorage.getItem('system_settings')
    if (stored) {
      try { setSettings(JSON.parse(stored)) } catch { /* ignore */ }
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
        <div>
          <label className="block text-sm font-medium mb-1.5">CRM Database ID</label>
          <input
            type="text"
            value={settings.notionCrmDbId || ''}
            onChange={(e) => setSettings({ ...settings, notionCrmDbId: e.target.value })}
            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Projects Database ID</label>
          <input
            type="text"
            value={settings.notionProjectsDbId || ''}
            onChange={(e) => setSettings({ ...settings, notionProjectsDbId: e.target.value })}
            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors font-mono text-sm"
          />
        </div>
      </div>

      {/* Google */}
      <div className="card space-y-4">
        <h2 className="font-semibold">Google OAuth</h2>
        <div>
          <label className="block text-sm font-medium mb-1.5">Client ID</label>
          <input
            type="text"
            value={settings.googleClientId || ''}
            onChange={(e) => setSettings({ ...settings, googleClientId: e.target.value })}
            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors font-mono text-sm"
          />
        </div>
      </div>
    </div>
  )
}
