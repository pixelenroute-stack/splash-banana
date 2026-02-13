'use client'

import { useState, FormEvent, useCallback } from 'react'
import { Video, Loader2, Download, RefreshCw } from 'lucide-react'

interface GeneratedVideo {
  id: string
  prompt: string
  videoUrl?: string
  operationName: string
  status: 'processing' | 'completed' | 'failed'
}

export default function VideosPage() {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [videos, setVideos] = useState<GeneratedVideo[]>([])

  const pollVideo = useCallback(async (operationName: string, videoId: string) => {
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max

    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 5000))
      attempts++

      try {
        const res = await fetch('/api/gemini/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName }),
        })
        const data = await res.json()

        if (data.success && data.data?.status === 'completed') {
          setVideos((prev) =>
            prev.map((v) =>
              v.id === videoId ? { ...v, status: 'completed', videoUrl: data.data.videoUrl } : v
            )
          )
          return
        }
      } catch {
        // Continue polling
      }
    }

    // Timeout
    setVideos((prev) =>
      prev.map((v) => (v.id === videoId ? { ...v, status: 'failed' } : v))
    )
  }, [])

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
      const data = await res.json()

      if (data.success && data.data?.operationName) {
        const videoId = crypto.randomUUID()
        const newVideo: GeneratedVideo = {
          id: videoId,
          prompt: prompt.trim(),
          operationName: data.data.operationName,
          status: 'processing',
        }
        setVideos((prev) => [newVideo, ...prev])
        setPrompt('')

        // Start polling in background
        pollVideo(data.data.operationName, videoId)
      }
    } catch {
      // Error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Video Studio</h1>
        <p className="text-muted text-sm mt-1">Génération vidéo via Gemini Veo 2.0</p>
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

      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <Video className="w-12 h-12 mb-4 opacity-30" />
          <p>Aucune vidéo générée</p>
          <p className="text-sm mt-1">La génération prend 1-3 minutes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {videos.map((vid) => (
            <div key={vid.id} className="card">
              {vid.status === 'processing' && (
                <div className="aspect-video bg-background/50 rounded-lg flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-lantean-blue animate-spin" />
                  <p className="text-sm text-muted">Génération en cours...</p>
                  <p className="text-xs text-muted">Cela peut prendre 1-3 minutes</p>
                </div>
              )}
              {vid.status === 'completed' && vid.videoUrl && (
                <div className="aspect-video bg-background/50 rounded-lg overflow-hidden">
                  <video src={vid.videoUrl} controls className="w-full h-full object-contain" />
                </div>
              )}
              {vid.status === 'failed' && (
                <div className="aspect-video bg-background/50 rounded-lg flex flex-col items-center justify-center gap-2">
                  <p className="text-sm text-red-400">Échec de la génération</p>
                  <p className="text-xs text-muted">Essayez un autre prompt</p>
                </div>
              )}
              <div className="mt-3">
                <p className="text-sm line-clamp-2">{vid.prompt}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    vid.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                    vid.status === 'processing' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {vid.status === 'completed' ? 'Terminé' : vid.status === 'processing' ? 'En cours' : 'Échec'}
                  </span>
                  {vid.videoUrl && (
                    <a href={vid.videoUrl} download className="p-1 text-muted hover:text-white transition-colors">
                      <Download className="w-4 h-4" />
                    </a>
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
