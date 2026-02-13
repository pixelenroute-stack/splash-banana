'use client'

import { useState, FormEvent } from 'react'
import { Image as ImageIcon, Loader2, Download, Save, AlertCircle } from 'lucide-react'
import type { MediaAsset } from '@/types'

interface GeneratedImage {
  id: string
  prompt: string
  url: string
  createdAt: string
  savedToLibrary: boolean
}

const MEDIA_LIBRARY_KEY = 'media_library'

function saveToMediaLibrary(image: GeneratedImage) {
  try {
    const raw = localStorage.getItem(MEDIA_LIBRARY_KEY)
    const assets: MediaAsset[] = raw ? JSON.parse(raw) : []

    const newAsset: MediaAsset = {
      id: image.id,
      name: `Image - ${image.prompt.slice(0, 50)}`,
      type: 'image',
      url: image.url,
      thumbnailUrl: image.url,
      size: Math.round((image.url.length * 3) / 4), // approximate base64 size
      mimeType: 'image/png',
      createdAt: image.createdAt,
      tags: ['generated', 'image-studio'],
    }

    assets.unshift(newAsset)
    localStorage.setItem(MEDIA_LIBRARY_KEY, JSON.stringify(assets))

    // Notify library page if open
    window.dispatchEvent(new Event('media_library_updated'))
    return true
  } catch {
    return false
  }
}

export default function ImagesPage() {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate(e: FormEvent) {
    e.preventDefault()
    if (!prompt.trim() || isLoading) return

    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/gemini/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })
      const data = await res.json()
      if (data.success && data.url) {
        const newImage: GeneratedImage = {
          id: crypto.randomUUID(),
          prompt: prompt.trim(),
          url: data.url,
          createdAt: new Date().toISOString(),
          savedToLibrary: false,
        }

        // Auto-save to media library
        const saved = saveToMediaLibrary(newImage)
        newImage.savedToLibrary = saved

        setImages((prev) => [newImage, ...prev])
        setPrompt('')
      } else {
        setError(data.error || 'Aucune image generee. Essayez un autre prompt.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la generation de l\'image')
    } finally {
      setIsLoading(false)
    }
  }

  function handleSaveToLibrary(image: GeneratedImage) {
    const saved = saveToMediaLibrary(image)
    if (saved) {
      setImages((prev) =>
        prev.map((img) => (img.id === image.id ? { ...img, savedToLibrary: true } : img))
      )
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Image Studio</h1>
        <p className="text-muted text-sm mt-1">Generation d&apos;images via Gemini (Imagen 3)</p>
      </div>

      {/* Generator */}
      <form onSubmit={handleGenerate} className="card">
        <div className="flex gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setError(null) }}
            placeholder="Decrivez l'image a generer..."
            className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="px-6 py-3 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generer'}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-400 font-medium">Erreur de generation</p>
            <p className="text-sm text-red-400/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Gallery */}
      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <ImageIcon className="w-12 h-12 mb-4 opacity-30" />
          <p>Aucune image generee</p>
          <p className="text-sm mt-1">Les images seront automatiquement sauvegardees dans la Mediatheque</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((img) => (
            <div key={img.id} className="card-hover group relative overflow-hidden">
              <img src={img.url} alt={img.prompt} className="w-full aspect-square object-cover rounded" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <div className="flex-1">
                  <p className="text-sm line-clamp-2">{img.prompt}</p>
                  {img.savedToLibrary && (
                    <p className="text-xs text-green-400 mt-1">Sauvegarde dans la Mediatheque</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <a href={img.url} download={`image-${img.id}.png`} className="p-2 bg-white/10 rounded-lg hover:bg-white/20">
                    <Download className="w-4 h-4" />
                  </a>
                  {!img.savedToLibrary && (
                    <button
                      onClick={() => handleSaveToLibrary(img)}
                      className="p-2 bg-white/10 rounded-lg hover:bg-white/20"
                      title="Sauvegarder dans la Mediatheque"
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
