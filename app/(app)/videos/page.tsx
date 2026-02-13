'use client'

import { useState, FormEvent, useCallback } from 'react'
import { Video, Loader2, Download, RefreshCw, AlertCircle, Save } from 'lucide-react'
import type { MediaAsset } from '@/types'

interface GeneratedVideo {
  id: string
  prompt: string
  videoUrl?: string
  operationName: string
  status: 'processing' | 'completed' | 'failed'
  savedToLibrary: boolean
  errorMessage?: string
}

const MEDIA_LIBRARY_KEY = 'media_library'

function saveVideoToMediaLibrary(video: GeneratedVideo): boolean {
  if (!video.videoUrl) return false
  try {
    const raw = localStorage.getItem(MEDIA_LIBRARY_KEY)
    const assets: MediaAsset[] = raw ? JSON.parse(raw) : []

    const newAsset: MediaAsset = {
      id: video.id,
      name: `Video - ${video.prompt.slice(0, 50)}`,
      type: 'video',
      url: video.videoUrl,
      mimeType: 'video/mp4',
      createdAt: new Date().toISOString(),
      tags: ['generated', 'video-studio'],
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

export default function VideosPage() {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [videos, setVideos] = useState<GeneratedVideo[]>([])
  const [error, setError] = useState<string | null>(null)

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
          const videoUrl = data.data.videoUrl

          // Auto-save to media library
          const savedVideo: GeneratedVideo = {
            id: videoId,
            prompt: '',
            videoUrl,
            operationName,
            status: 'completed',
            savedToLibrary: false,
          }

          setVideos((prev) => {
            const updated = prev.map((v) => {
              if (v.id === videoId) {
                const withUrl = { ...v, status: 'completed' as const, videoUrl }
                savedVideo.prompt = v.prompt
                const saved = saveVideoToMediaLibrary({ ...withUrl, savedToLibrary: false })
                return { ...withUrl, savedToLibrary: saved }
              }
              return v
            })
            return updated
          })
          return
        }

        if (!data.success && data.error) {
          setVideos((prev) =>
            prev.map((v) => (v.id === videoId ? { ...v, status: 'failed' as const, errorMessage: data.error } : v))
          )
          return
        }
      } catch {
        // Continue polling
      }
    }

    // Timeout
    setVideos((prev) =>
      prev.map((v) => (v.id === videoId ? { ...v, status: 'failed' as const, errorMessage: 'Delai d\'attente depasse (5 min)' } : v))
    )
  }, [])

  async function handleGenerate(e: FormEvent) {
    e.preventDefault()
    if (!prompt.trim() || isLoading) return
    setIsLoading(true)
    setError(null)

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
          savedToLibrary: false,
        }
        setVideos((prev) => [newVideo, ...prev])
        setPrompt('')

        // Start polling in background
        pollVideo(data.data.operationName, videoId)
      } else {
        setError(data.error || 'Erreur lors du lancement de la generation')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion au serveur')
    } finally {
      setIsLoading(false)
    }
  }

  function handleSaveToLibrary(video: GeneratedVideo) {
    const saved = saveVideoToMediaLibrary(video)
    if (saved) {
      setVideos((prev) =>
        prev.map((v) => (v.id === video.id ? { ...v, savedToLibrary: true } : v))
      )
    }
  }

  function handleRetry(video: GeneratedVideo) {
    setVideos((prev) =>
      prev.map((v) => (v.id === video.id ? { ...v, status: 'processing' as const, errorMessage: undefined } : v))
    )
    pollVideo(video.operationName, video.id)
  }

  const VIDEO_SUGGESTIONS = [
    'Timelapse d\'un coucher de soleil sur l\'océan',
    'Animation 3D d\'un logo qui tourne',
    'Drone survol d\'une ville futuriste la nuit',
    'Transition fluide entre deux scènes naturelles',
    'Effet morphing entre deux visages abstraits',
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Video Studio</h1>
        <p className="text-muted text-sm mt-1">Génération vidéo via Gemini Veo 2.0</p>
      </div>

      <form onSubmit={handleGenerate} className="card space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setError(null) }}
            placeholder="Décrivez la vidéo à générer..."
            className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Video className="w-5 h-5" />}
            <span className="hidden sm:inline">{isLoading ? 'Lancement...' : 'Générer'}</span>
          </button>
        </div>

        {!prompt && (
          <div>
            <p className="text-xs text-muted mb-2">Suggestions :</p>
            <div className="flex flex-wrap gap-2">
              {VIDEO_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPrompt(s)}
                  className="text-xs px-3 py-1.5 bg-surface border border-border rounded-full text-muted hover:text-white hover:border-lantean-blue transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted">La génération prend 1-3 minutes. Les vidéos sont automatiquement sauvegardées dans la Médiathèque.</p>
      </form>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-400 font-medium">Erreur</p>
            <p className="text-sm text-red-400/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <Video className="w-12 h-12 mb-4 opacity-30" />
          <p>Aucune vidéo générée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {videos.map((vid) => (
            <div key={vid.id} className="card">
              {vid.status === 'processing' && (
                <div className="aspect-video bg-background/50 rounded-lg flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-lantean-blue animate-spin" />
                  <p className="text-sm text-muted">Generation en cours...</p>
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
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <p className="text-sm text-red-400">Echec de la generation</p>
                  {vid.errorMessage && (
                    <p className="text-xs text-red-400/70 max-w-xs text-center">{vid.errorMessage}</p>
                  )}
                  <button
                    onClick={() => handleRetry(vid)}
                    className="flex items-center gap-1 mt-2 px-3 py-1.5 text-xs bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reessayer le polling
                  </button>
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
                    {vid.status === 'completed' ? 'Termine' : vid.status === 'processing' ? 'En cours' : 'Echec'}
                  </span>
                  {vid.savedToLibrary && (
                    <span className="text-xs text-green-400">Sauvegarde</span>
                  )}
                  {vid.status === 'completed' && vid.videoUrl && !vid.savedToLibrary && (
                    <button
                      onClick={() => handleSaveToLibrary(vid)}
                      className="p-1 text-muted hover:text-lantean-blue transition-colors"
                      title="Sauvegarder dans la Mediatheque"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  )}
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
