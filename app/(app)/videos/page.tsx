'use client'

import { useState, FormEvent } from 'react'
import { Video, Loader2 } from 'lucide-react'

export default function VideosPage() {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleGenerate(e: FormEvent) {
    e.preventDefault()
    if (!prompt.trim() || isLoading) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/gemini/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })
      await res.json()
      // TODO: Handle video generation result
    } catch {
      // Error handling
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Video Studio</h1>
        <p className="text-muted text-sm mt-1">Génération vidéo via Gemini Veo</p>
      </div>

      <form onSubmit={handleGenerate} className="card">
        <div className="flex gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Décrivez la vidéo à générer..."
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

      <div className="flex flex-col items-center justify-center py-12 text-muted">
        <Video className="w-12 h-12 mb-4 opacity-30" />
        <p>Aucune vidéo générée</p>
        <p className="text-sm mt-1">Utilisez Gemini Veo 3.1 pour créer des vidéos</p>
      </div>
    </div>
  )
}
