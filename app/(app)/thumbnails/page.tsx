'use client'

import { useState, FormEvent } from 'react'
import { Youtube, Loader2, Download, Save, AlertCircle, Wand2, Palette } from 'lucide-react'
import type { MediaAsset } from '@/types'

interface GeneratedThumbnail {
  id: string
  prompt: string
  topic: string
  style: string
  url: string
  createdAt: string
  savedToLibrary: boolean
}

const MEDIA_LIBRARY_KEY = 'media_library'

const STYLE_PRESETS = [
  { id: 'gaming', label: 'Gaming', description: 'Bold, colorful with action elements' },
  { id: 'tech', label: 'Tech', description: 'Clean, minimalist with tech elements' },
  { id: 'tutorial', label: 'Tutoriel', description: 'Step-by-step visual with numbered elements' },
  { id: 'vlog', label: 'Vlog', description: 'Personal, lifestyle feel' },
  { id: 'business', label: 'Business', description: 'Professional, corporate look' },
  { id: 'reaction', label: 'Reaction', description: 'Expressive, bold text overlay' },
]

const COLOR_SCHEMES = [
  { id: 'vibrant', label: 'Vibrant', colors: 'bg-gradient-to-r from-red-500 via-yellow-500 to-pink-500' },
  { id: 'dark', label: 'Sombre / Cinematic', colors: 'bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900' },
  { id: 'pastel', label: 'Pastel', colors: 'bg-gradient-to-r from-pink-300 via-purple-300 to-blue-300' },
  { id: 'neon', label: 'Neon', colors: 'bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500' },
  { id: 'monochrome', label: 'Monochrome', colors: 'bg-gradient-to-r from-white via-gray-400 to-black' },
]

const SUGGESTIONS = [
  'Top 10 astuces After Effects',
  '5 erreurs \u00e0 \u00e9viter en montage vid\u00e9o',
  'Blender vs Cinema 4D comparatif',
  'Comment cr\u00e9er un logo professionnel',
  'Tutoriel Premiere Pro d\u00e9butant',
]

function buildPrompt(topic: string, style: string, colorScheme: string, textOverlay: string): string {
  return `YouTube thumbnail design, ${style} style, ${colorScheme} colors, title text "${textOverlay}", topic: ${topic}, professional, eye-catching, 16:9 aspect ratio, high contrast`
}

function saveToMediaLibrary(thumbnail: GeneratedThumbnail): boolean {
  try {
    const raw = localStorage.getItem(MEDIA_LIBRARY_KEY)
    const assets: MediaAsset[] = raw ? JSON.parse(raw) : []

    const newAsset: MediaAsset = {
      id: thumbnail.id,
      name: `Thumbnail - ${thumbnail.topic.slice(0, 50)}`,
      type: 'image',
      url: thumbnail.url,
      thumbnailUrl: thumbnail.url,
      size: Math.round((thumbnail.url.length * 3) / 4),
      mimeType: 'image/png',
      createdAt: thumbnail.createdAt,
      tags: ['generated', 'thumbnail', 'youtube'],
    }

    assets.unshift(newAsset)
    localStorage.setItem(MEDIA_LIBRARY_KEY, JSON.stringify(assets))
    window.dispatchEvent(new Event('media_library_updated'))
    return true
  } catch {
    return false
  }
}

export default function ThumbnailsPage() {
  const [topic, setTopic] = useState('')
  const [textOverlay, setTextOverlay] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('tech')
  const [selectedColor, setSelectedColor] = useState('vibrant')
  const [isLoading, setIsLoading] = useState(false)
  const [thumbnails, setThumbnails] = useState<GeneratedThumbnail[]>([])
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate(e: FormEvent) {
    e.preventDefault()
    if (!topic.trim() || isLoading) return

    setIsLoading(true)
    setError(null)

    const overlay = textOverlay.trim() || topic.trim()
    const fullPrompt = buildPrompt(topic.trim(), selectedStyle, selectedColor, overlay)

    try {
      const res = await fetch('/api/gemini/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt }),
      })
      const data = await res.json()

      if (data.success && data.url) {
        const newThumbnail: GeneratedThumbnail = {
          id: crypto.randomUUID(),
          prompt: fullPrompt,
          topic: topic.trim(),
          style: selectedStyle,
          url: data.url,
          createdAt: new Date().toISOString(),
          savedToLibrary: false,
        }

        const saved = saveToMediaLibrary(newThumbnail)
        newThumbnail.savedToLibrary = saved

        setThumbnails((prev) => [newThumbnail, ...prev])
      } else {
        setError(data.error || 'Aucune miniature g\u00e9n\u00e9r\u00e9e. Essayez un autre sujet.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la g\u00e9n\u00e9ration de la miniature')
    } finally {
      setIsLoading(false)
    }
  }

  function handleSaveToLibrary(thumbnail: GeneratedThumbnail) {
    const saved = saveToMediaLibrary(thumbnail)
    if (saved) {
      setThumbnails((prev) =>
        prev.map((t) => (t.id === thumbnail.id ? { ...t, savedToLibrary: true } : t))
      )
    }
  }

  function applySuggestion(suggestion: string) {
    setTopic(suggestion)
    setTextOverlay(suggestion)
    setError(null)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Youtube className="w-7 h-7 text-red-500" />
          Miniatures YouTube
        </h1>
        <p className="text-muted text-sm mt-1">
          Cr\u00e9ation de miniatures professionnelles via Gemini (Imagen 3)
        </p>
      </div>

      {/* Generator Form */}
      <form onSubmit={handleGenerate} className="card space-y-5">
        {/* Topic Input */}
        <div>
          <label className="block text-xs text-muted mb-2">Titre / Sujet de la vid\u00e9o</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => { setTopic(e.target.value); setError(null) }}
            placeholder="Ex: Comment ma\u00eetriser After Effects en 30 jours..."
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
          />
        </div>

        {/* Text Overlay Input */}
        <div>
          <label className="block text-xs text-muted mb-2">Texte sur la miniature (optionnel, utilise le titre si vide)</label>
          <input
            type="text"
            value={textOverlay}
            onChange={(e) => setTextOverlay(e.target.value)}
            placeholder="Ex: 30 JOURS POUR MA\u00ceTRISER AE"
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
          />
        </div>

        {/* Style Presets */}
        <div>
          <p className="text-xs text-muted mb-2">Style :</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {STYLE_PRESETS.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => setSelectedStyle(style.id)}
                className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  selectedStyle === style.id
                    ? 'border-lantean-blue bg-primary/20 text-lantean-blue'
                    : 'border-border bg-surface text-muted hover:text-white hover:border-border'
                }`}
              >
                <span className="block text-sm font-medium">{style.label}</span>
                <span className="block text-[10px] opacity-60 mt-0.5">{style.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Color Scheme */}
        <div>
          <p className="text-xs text-muted mb-2 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" />
            Palette de couleurs :
          </p>
          <div className="flex flex-wrap gap-2">
            {COLOR_SCHEMES.map((scheme) => (
              <button
                key={scheme.id}
                type="button"
                onClick={() => setSelectedColor(scheme.id)}
                className={`flex items-center gap-2 text-xs px-3 py-2 rounded-full border transition-colors ${
                  selectedColor === scheme.id
                    ? 'border-lantean-blue bg-primary/20 text-lantean-blue'
                    : 'border-border bg-surface text-muted hover:text-white hover:border-border'
                }`}
              >
                <span className={`w-4 h-4 rounded-full ${scheme.colors} flex-shrink-0`} />
                {scheme.label}
              </button>
            ))}
          </div>
        </div>

        {/* Suggestions */}
        {!topic && (
          <div>
            <p className="text-xs text-muted mb-2">Suggestions :</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => applySuggestion(s)}
                  className="text-xs px-3 py-1.5 bg-surface border border-border rounded-full text-muted hover:text-white hover:border-lantean-blue transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          type="submit"
          disabled={isLoading || !topic.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-medium"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
          {isLoading ? 'G\u00e9n\u00e9ration en cours...' : 'G\u00e9n\u00e9rer la miniature'}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-400 font-medium">Erreur de g\u00e9n\u00e9ration</p>
            <p className="text-sm text-red-400/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Counter */}
      {thumbnails.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Youtube className="w-4 h-4 text-red-500" />
          <span>{thumbnails.length} miniature{thumbnails.length > 1 ? 's' : ''} g\u00e9n\u00e9r\u00e9e{thumbnails.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Gallery */}
      {thumbnails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <Youtube className="w-12 h-12 mb-4 opacity-30" />
          <p>Aucune miniature g\u00e9n\u00e9r\u00e9e</p>
          <p className="text-sm mt-1">Les miniatures sont automatiquement sauvegard\u00e9es dans la M\u00e9diath\u00e8que</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {thumbnails.map((thumb) => (
            <div key={thumb.id} className="card-hover group relative overflow-hidden rounded-lg">
              <img
                src={thumb.url}
                alt={thumb.topic}
                className="w-full aspect-video object-cover rounded"
              />
              {/* Style badge */}
              <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 bg-black/60 text-white rounded-full backdrop-blur-sm uppercase tracking-wide">
                {thumb.style}
              </span>
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium line-clamp-2">{thumb.topic}</p>
                  {thumb.savedToLibrary && (
                    <p className="text-xs text-green-400 mt-1">Sauvegard\u00e9 dans la M\u00e9diath\u00e8que</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <a
                    href={thumb.url}
                    download={`thumbnail-${thumb.id}.png`}
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    title="T\u00e9l\u00e9charger"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  {!thumb.savedToLibrary && (
                    <button
                      onClick={() => handleSaveToLibrary(thumb)}
                      className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                      title="Sauvegarder dans la M\u00e9diath\u00e8que"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
