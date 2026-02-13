'use client'

import { useState, useEffect, useCallback } from 'react'
import { Settings, Save, Eye, EyeOff, ExternalLink, CheckCircle2, XCircle, AlertCircle, Loader2, Unplug, Wifi, Zap, Shield, ShieldCheck } from 'lucide-react'

interface TestResult {
  status: 'idle' | 'testing' | 'connected' | 'error' | 'missing' | 'configured'
  details?: string
  error?: string
}

interface SettingField {
  key: string
  label: string
  placeholder: string
  description?: string
}

interface ApiKeyFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  description?: string
  preview?: string
}

function ApiKeyField({ label, value, onChange, placeholder, description, preview }: ApiKeyFieldProps) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      {description && <p className="text-xs text-muted mb-1.5">{description}</p>}
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={preview ? `${preview} (enregistré)` : placeholder}
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

function TestBadge({ result }: { result: TestResult }) {
  if (result.status === 'idle') return null
  if (result.status === 'testing') return <Loader2 className="w-4 h-4 text-lantean-blue animate-spin" />
  if (result.status === 'connected' || result.status === 'configured') {
    return (
      <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" />
        {result.details || 'OK'}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full" title={result.error}>
      <XCircle className="w-3 h-3" />
      {result.error?.slice(0, 40) || 'Erreur'}
    </span>
  )
}

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [checkingGoogle, setCheckingGoogle] = useState(true)
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(true)

  // 2FA state
  const [show2FA, setShow2FA] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [totpSecret, setTotpSecret] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [totpVerifying, setTotpVerifying] = useState(false)
  const [totpMessage, setTotpMessage] = useState('')

  // Test results for each service
  const [tests, setTests] = useState<Record<string, TestResult>>({
    gemini: { status: 'idle' },
    notion: { status: 'idle' },
    perplexity: { status: 'idle' },
    google: { status: 'idle' },
    'google-oauth': { status: 'idle' },
  })

  // Load settings from API on mount
  useEffect(() => {
    async function loadSettings() {
      setLoading(true)
      try {
        const res = await fetch('/api/settings')
        const data = await res.json()
        if (data.success && data.data) {
          const newPreviews: Record<string, string> = {}
          for (const [key, val] of Object.entries(data.data)) {
            const v = val as { configured?: boolean; preview?: string } | boolean
            if (typeof v === 'object' && v?.configured && v?.preview) {
              newPreviews[key] = v.preview
            }
          }
          setPreviews(newPreviews)
        }
      } catch {
        // Settings API not available
      } finally {
        setLoading(false)
      }
    }
    loadSettings()

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

    const params = new URLSearchParams(window.location.search)
    if (params.get('google') === 'connected') {
      setGoogleConnected(true)
    }
    const error = params.get('error')
    if (error) {
      setAuthError(decodeURIComponent(error))
    }
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const settings: Record<string, string> = {}
      for (const [key, value] of Object.entries(apiKeys)) {
        if (value.trim()) {
          settings[key] = value.trim()
        }
      }

      if (Object.keys(settings).length > 0) {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings }),
        })
        const data = await res.json()
        if (data.success) {
          setSaved(true)
          for (const [key, value] of Object.entries(settings)) {
            setPreviews((prev) => ({
              ...prev,
              [key]: value.slice(0, 8) + '...' + value.slice(-4),
            }))
          }
          setApiKeys({})
          setTimeout(() => setSaved(false), 3000)
        }
      }
    } catch {
      // Save failed
    } finally {
      setSaving(false)
    }
  }

  const testService = useCallback(async (service: string) => {
    setTests((prev) => ({ ...prev, [service]: { status: 'testing' } }))
    try {
      const res = await fetch(`/api/test-connections?service=${service}`)
      const data = await res.json()
      if (data.success) {
        setTests((prev) => ({ ...prev, [service]: { status: data.status || 'connected', details: data.details } }))
      } else {
        setTests((prev) => ({
          ...prev,
          [service]: { status: data.status === 'missing' ? 'missing' : 'error', error: data.error },
        }))
      }
    } catch (err) {
      setTests((prev) => ({
        ...prev,
        [service]: { status: 'error', error: err instanceof Error ? err.message : 'Erreur réseau' },
      }))
    }
  }, [])

  async function testAll() {
    await Promise.all(['gemini', 'notion', 'perplexity', 'google', 'google-oauth'].map(testService))
  }

  // 2FA functions
  async function setup2FA() {
    setShow2FA(true)
    setTotpMessage('')
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setQrCode(data.data.qrCode)
        setTotpSecret(data.data.secret)
      } else {
        setTotpMessage(data.error || 'Erreur 2FA')
      }
    } catch {
      setTotpMessage('Erreur de connexion')
    }
  }

  async function verify2FA() {
    setTotpVerifying(true)
    setTotpMessage('')
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpCode }),
      })
      const data = await res.json()
      if (data.success) {
        setTotpMessage('2FA activé avec succès !')
        setTotpCode('')
      } else {
        setTotpMessage(data.error || 'Code invalide')
      }
    } catch {
      setTotpMessage('Erreur de vérification')
    } finally {
      setTotpVerifying(false)
    }
  }

  function updateKey(key: string, value: string) {
    setApiKeys((prev) => ({ ...prev, [key]: value }))
  }

  const geminiFields: SettingField[] = [
    { key: 'gemini_api_key', label: '', placeholder: 'AIzaSy...', description: 'Chat IA, Image Studio, Video Studio, Tutoriels, Vignettes YouTube' },
  ]

  const perplexityFields: SettingField[] = [
    { key: 'perplexity_api_key', label: '', placeholder: 'pplx-...', description: 'Actualités et veille technologique' },
  ]

  const notionFields: SettingField[] = [
    { key: 'notion_api_key', label: 'Notion API Key', placeholder: 'ntn_...', description: 'Gestion des clients et projets' },
    { key: 'notion_crm_db_id', label: 'CRM Database ID', placeholder: '6bd8c6a6...', description: 'ID de la base clients Notion' },
    { key: 'notion_projects_db_id', label: 'Projects Database ID', placeholder: '1f75ed7c...', description: 'ID de la base projets Notion' },
  ]

  const googleOAuthFields: SettingField[] = [
    { key: 'google_client_id', label: 'Client ID', placeholder: '381234392877-...apps.googleusercontent.com' },
    { key: 'google_client_secret', label: 'Client Secret', placeholder: 'GOCSPX-...' },
    { key: 'google_redirect_uri', label: 'Redirect URI', placeholder: 'https://splashbanana.com/api/auth/callback' },
  ]

  const qontoFields: SettingField[] = [
    { key: 'qonto_login', label: 'Identifiant Qonto', placeholder: 'ei-...' },
    { key: 'qonto_secret', label: 'Clé secrète Qonto', placeholder: 'ac5c...' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-lantean-blue animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Paramètres</h1>
          <p className="text-muted text-sm mt-1">Configuration de la plateforme - les clés sont stockées de manière sécurisée</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={testAll}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
          >
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">Tester tout</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              saved ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-lantean-blue hover:bg-primary/30'
            } disabled:opacity-50`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span className="text-sm font-medium">{saving ? 'Sauvegarde...' : saved ? 'Sauvegardé !' : 'Sauvegarder'}</span>
          </button>
        </div>
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

      {/* Google OAuth Connection + Config */}
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
            <button
              onClick={() => testService('google-oauth')}
              className="text-xs text-muted hover:text-lantean-blue transition-colors px-2 py-1 rounded hover:bg-lantean-blue/10"
            >
              Tester OAuth
            </button>
            <TestBadge result={tests['google-oauth']} />
            <button
              onClick={() => testService('google')}
              className="text-xs text-muted hover:text-lantean-blue transition-colors px-2 py-1 rounded hover:bg-lantean-blue/10"
            >
              Tester
            </button>
            <TestBadge result={tests.google} />
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

        {/* Google OAuth API Keys */}
        <div className="space-y-3 pt-2 border-t border-border/50">
          <p className="text-xs text-muted">Configurez vos identifiants Google Cloud Console (APIs &amp; Services &gt; Credentials)</p>
          {googleOAuthFields.map((field) => (
            <ApiKeyField
              key={field.key}
              label={field.label}
              value={apiKeys[field.key] || ''}
              onChange={(v) => updateKey(field.key, v)}
              placeholder={field.placeholder}
              description={field.description}
              preview={previews[field.key]}
            />
          ))}
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

      {/* Services IA */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-lantean-blue" />
            <h2 className="font-semibold">Services IA</h2>
          </div>
        </div>

        {/* Gemini */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Google Gemini</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => testService('gemini')}
                className="text-xs text-muted hover:text-lantean-blue transition-colors px-2 py-1 rounded hover:bg-lantean-blue/10"
              >
                Tester
              </button>
              <TestBadge result={tests.gemini} />
            </div>
          </div>
          {geminiFields.map((field) => (
            <ApiKeyField
              key={field.key}
              label={field.label}
              value={apiKeys[field.key] || ''}
              onChange={(v) => updateKey(field.key, v)}
              placeholder={field.placeholder}
              description={field.description}
              preview={previews[field.key]}
            />
          ))}
        </div>

        {/* Perplexity */}
        <div className="space-y-2 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Perplexity</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => testService('perplexity')}
                className="text-xs text-muted hover:text-lantean-blue transition-colors px-2 py-1 rounded hover:bg-lantean-blue/10"
              >
                Tester
              </button>
              <TestBadge result={tests.perplexity} />
            </div>
          </div>
          {perplexityFields.map((field) => (
            <ApiKeyField
              key={field.key}
              label={field.label}
              value={apiKeys[field.key] || ''}
              onChange={(v) => updateKey(field.key, v)}
              placeholder={field.placeholder}
              description={field.description}
              preview={previews[field.key]}
            />
          ))}
        </div>
      </div>

      {/* Notion */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Notion CRM</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => testService('notion')}
              className="text-xs text-muted hover:text-lantean-blue transition-colors px-2 py-1 rounded hover:bg-lantean-blue/10"
            >
              Tester
            </button>
            <TestBadge result={tests.notion} />
          </div>
        </div>
        {notionFields.map((field) => (
          <ApiKeyField
            key={field.key}
            label={field.label}
            value={apiKeys[field.key] || ''}
            onChange={(v) => updateKey(field.key, v)}
            placeholder={field.placeholder}
            description={field.description}
            preview={previews[field.key]}
          />
        ))}
      </div>

      {/* Qonto */}
      <div className="card space-y-4">
        <h2 className="font-semibold">Qonto (Facturation)</h2>
        {qontoFields.map((field) => (
          <ApiKeyField
            key={field.key}
            label={field.label}
            value={apiKeys[field.key] || ''}
            onChange={(v) => updateKey(field.key, v)}
            placeholder={field.placeholder}
            preview={previews[field.key]}
          />
        ))}
      </div>

      {/* 2FA Section */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-gold-accent" />
            <h2 className="font-semibold">Sécurité - 2FA</h2>
          </div>
          {!show2FA && (
            <button
              onClick={setup2FA}
              className="flex items-center gap-2 px-4 py-2 bg-gold-accent/20 text-gold-accent rounded-lg hover:bg-gold-accent/30 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="text-sm font-medium">Configurer 2FA</span>
            </button>
          )}
        </div>

        {show2FA && (
          <div className="space-y-4">
            {qrCode && (
              <div className="flex flex-col items-center gap-4 p-4 bg-background/50 rounded-lg">
                <p className="text-sm text-center">Scannez ce QR code avec Google Authenticator ou Authy :</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
                <div className="text-xs text-muted text-center">
                  <p>Clé manuelle : <code className="bg-surface px-2 py-0.5 rounded text-lantean-blue">{totpSecret}</code></p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Code à 6 chiffres"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-gold-accent font-mono text-lg tracking-widest text-center"
                maxLength={6}
                onKeyDown={(e) => e.key === 'Enter' && totpCode.length === 6 && verify2FA()}
              />
              <button
                onClick={verify2FA}
                disabled={totpVerifying || totpCode.length !== 6}
                className="px-6 py-2.5 bg-gold-accent/20 text-gold-accent rounded-lg hover:bg-gold-accent/30 transition-colors disabled:opacity-30 font-medium"
              >
                {totpVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vérifier'}
              </button>
            </div>

            {totpMessage && (
              <p className={`text-sm text-center ${totpMessage.includes('succès') ? 'text-green-400' : 'text-red-400'}`}>
                {totpMessage}
              </p>
            )}

            <button
              onClick={() => { setShow2FA(false); setQrCode(''); setTotpSecret(''); setTotpCode(''); setTotpMessage('') }}
              className="text-xs text-muted hover:text-white transition-colors"
            >
              Annuler
            </button>
          </div>
        )}

        {!show2FA && (
          <p className="text-xs text-muted">
            L&apos;authentification à deux facteurs ajoute une couche de sécurité supplémentaire pour les comptes administrateurs.
          </p>
        )}
      </div>

      {/* App Info */}
      <div className="card">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Splash Banana v2.0</span>
          <span>Next.js 14 + Supabase + Gemini AI</span>
        </div>
      </div>
    </div>
  )
}
