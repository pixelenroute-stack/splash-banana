'use client'

import { useState, FormEvent } from 'react'
import { Image as ImageIcon, Loader2, Download } from 'lucide-react'

interface GeneratedImage {
  id: string
  prompt: string
  url: string
  createdAt: string
}

export default function ImagesPage() {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [images, setImages] = useState<GeneratedImage[]>([])

  async function handleGenerate(e: FormEvent) {
    e.preventDefault()
    if (!prompt.trim() || isLoading) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/gemini/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })
      const data = await res.json()
      if (data.success && data.url) {
        setImages((prev) => [{
          id: crypto.randomUUID(),
          prompt: prompt.trim(),
          url: data.url,
          createdAt: new Date().toISOString(),
        }, ...prev])
        setPrompt('')
      }
    } catch {
      // Error handling
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Image Studio</h1>
        <p className="text-muted text-sm mt-1">Génération d&apos;images via Gemini</p>
      </div>

      {/* Generator */}
      <form onSubmit={handleGenerate} className="card">
        <div className="flex gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Décrivez l'image à générer..."
            className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="px-6 py-3 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Générer'}
          </button>
        </div>
      </form>

      {/* Gallery */}
      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <ImageIcon className="w-12 h-12 mb-4 opacity-30" />
          <p>Aucune image générée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((img) => (
            <div key={img.id} className="card-hover group relative overflow-hidden">
              <img src={img.url} alt={img.prompt} className="w-full aspect-square object-cover rounded" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <div className="flex-1">
                  <p className="text-sm line-clamp-2">{img.prompt}</p>
                </div>
                <a href={img.url} download className="p-2 bg-white/10 rounded-lg hover:bg-white/20">
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
