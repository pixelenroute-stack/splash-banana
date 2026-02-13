'use client'

import { useState, FormEvent, useEffect } from 'react'
import {
  Share2,
  Plus,
  X,
  Loader2,
  Wand2,
  Calendar,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Clock,
  FileText,
  Image as ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SocialPost } from '@/types'

const PLATFORMS = [
  { id: 'instagram' as const, label: 'Instagram', icon: Instagram, color: 'text-pink-400', bg: 'bg-pink-500/10', limit: 2200 },
  { id: 'facebook' as const, label: 'Facebook', icon: Facebook, color: 'text-blue-400', bg: 'bg-blue-500/10', limit: 63206 },
  { id: 'linkedin' as const, label: 'LinkedIn', icon: Linkedin, color: 'text-sky-400', bg: 'bg-sky-500/10', limit: 3000 },
  { id: 'twitter' as const, label: 'Twitter', icon: Twitter, color: 'text-cyan-400', bg: 'bg-cyan-500/10', limit: 280 },
  { id: 'tiktok' as const, label: 'TikTok', icon: Share2, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', limit: 2200 },
]

const STORAGE_KEY = 'social_factory_posts'

function loadPosts(): SocialPost[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function savePosts(posts: SocialPost[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
}

export default function SocialFactoryPage() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [showForm, setShowForm] = useState(false)
  const [platform, setPlatform] = useState<SocialPost['platform']>('instagram')
  const [content, setContent] = useState('')
  const [imagePrompt, setImagePrompt] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [status, setStatus] = useState<'draft' | 'scheduled'>('draft')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPosts(loadPosts())
  }, [])

  const currentPlatform = PLATFORMS.find((p) => p.id === platform)!
  const charCount = content.length
  const charLimit = currentPlatform.limit
  const isOverLimit = charCount > charLimit

  function resetForm() {
    setContent('')
    setImagePrompt('')
    setScheduledAt('')
    setStatus('draft')
    setAiTopic('')
    setGeneratedImageUrl(null)
    setError(null)
  }

  async function handleGenerateContent() {
    if (!aiTopic.trim() || isGenerating) return
    setIsGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini',
          messages: [
            {
              role: 'user',
              content: `Generate a social media post for ${currentPlatform.label} about the following topic: "${aiTopic.trim()}".
The post must be under ${charLimit} characters.
Write in French. Include relevant hashtags.
Return ONLY the post content, no explanations or quotes around it.`,
            },
          ],
        }),
      })
      const data = await res.json()
      if (data.content) {
        setContent(data.content.trim())
      } else if (data.error) {
        setError(data.error)
      }
    } catch {
      setError('Erreur lors de la generation du contenu IA')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleGenerateImage() {
    if (!imagePrompt.trim() || isGeneratingImage) return
    setIsGeneratingImage(true)
    setError(null)

    try {
      const res = await fetch('/api/gemini/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt.trim() }),
      })
      const data = await res.json()
      if (data.success && data.url) {
        setGeneratedImageUrl(data.url)
      } else {
        setError(data.error || 'Echec de la generation d\'image')
      }
    } catch {
      setError('Erreur lors de la generation de l\'image')
    } finally {
      setIsGeneratingImage(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!content.trim() || isOverLimit) return

    const newPost: SocialPost = {
      id: crypto.randomUUID(),
      platform,
      content: content.trim(),
      mediaUrls: generatedImageUrl ? [generatedImageUrl] : undefined,
      scheduledAt: scheduledAt || undefined,
      status: scheduledAt ? 'scheduled' : status,
    }

    const updated = [newPost, ...posts]
    setPosts(updated)
    savePosts(updated)
    resetForm()
    setShowForm(false)
  }

  function handleDelete(id: string) {
    const updated = posts.filter((p) => p.id !== id)
    setPosts(updated)
    savePosts(updated)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Social Factory</h1>
          <p className="text-muted text-sm mt-1">Creation et planification de contenu social</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); if (!showForm) resetForm() }}
          className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span className="text-sm">{showForm ? 'Annuler' : 'Nouveau post'}</span>
        </button>
      </div>

      {/* Creation Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-5">
          <h2 className="font-semibold text-lg">Nouveau post</h2>

          {/* Platform Selector */}
          <div>
            <label className="text-sm text-muted block mb-2">Plateforme</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const Icon = p.icon
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors text-sm',
                      platform === p.id
                        ? 'border-lantean-blue bg-primary/20 text-white'
                        : 'border-border bg-surface text-muted hover:text-white hover:border-border'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', p.color)} />
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* AI Content Generation */}
          <div>
            <label className="text-sm text-muted block mb-2">Generation IA</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="Sujet du post (ex: lancement produit, promo ete...)"
                className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors text-sm"
              />
              <button
                type="button"
                onClick={handleGenerateContent}
                disabled={isGenerating || !aiTopic.trim()}
                className="flex items-center gap-2 px-4 py-2.5 bg-gold-accent/10 text-gold-accent rounded-lg hover:bg-gold-accent/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Generer avec IA
              </button>
            </div>
          </div>

          {/* Content Text Area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-muted">Contenu du post</label>
              <span className={cn('text-xs font-mono', isOverLimit ? 'text-red-400' : 'text-muted')}>
                {charCount}/{charLimit}
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ecrivez votre post ici..."
              rows={6}
              className={cn(
                'w-full px-4 py-3 bg-background border rounded-lg text-white placeholder:text-muted outline-none transition-colors resize-none text-sm',
                isOverLimit ? 'border-red-500 focus:border-red-400' : 'border-border focus:border-lantean-blue'
              )}
            />
            {isOverLimit && (
              <p className="text-xs text-red-400 mt-1">
                Depassement de {charCount - charLimit} caracteres pour {currentPlatform.label}
              </p>
            )}
          </div>

          {/* Image Generation */}
          <div>
            <label className="text-sm text-muted block mb-2">Image (optionnel)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Decrivez l'image a generer..."
                className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors text-sm"
              />
              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={isGeneratingImage || !imagePrompt.trim()}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                Generer
              </button>
            </div>
            {generatedImageUrl && (
              <div className="mt-3 relative inline-block">
                <img src={generatedImageUrl} alt="Generated" className="w-40 h-40 object-cover rounded-lg border border-border" />
                <button
                  type="button"
                  onClick={() => setGeneratedImageUrl(null)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500/80 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Schedule & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted block mb-2">Planification (optionnel)</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-white outline-none focus:border-lantean-blue transition-colors text-sm [color-scheme:dark]"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted block mb-2">Statut</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('draft')}
                  className={cn(
                    'flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                    status === 'draft'
                      ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                      : 'border-border bg-surface text-muted hover:text-white'
                  )}
                >
                  Brouillon
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('scheduled')}
                  className={cn(
                    'flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                    status === 'scheduled'
                      ? 'border-lantean-blue bg-primary/20 text-lantean-blue'
                      : 'border-border bg-surface text-muted hover:text-white'
                  )}
                >
                  Planifie
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!content.trim() || isOverLimit}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Creer le post
            </button>
          </div>
        </form>
      )}

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <Share2 className="w-12 h-12 mb-4 opacity-30" />
          <p>Aucun post planifie</p>
          <p className="text-sm mt-1">Creez et planifiez vos publications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const plat = PLATFORMS.find((p) => p.id === post.platform)
            const PlatIcon = plat?.icon || Share2
            return (
              <div key={post.id} className="card-hover flex items-start gap-4">
                {/* Platform icon */}
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', plat?.bg)}>
                  <PlatIcon className={cn('w-5 h-5', plat?.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', plat?.bg, plat?.color)}>
                      {plat?.label}
                    </span>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        post.status === 'draft' && 'bg-yellow-500/10 text-yellow-400',
                        post.status === 'scheduled' && 'bg-lantean-blue/10 text-lantean-blue',
                        post.status === 'published' && 'bg-green-500/10 text-green-400',
                        post.status === 'failed' && 'bg-red-500/10 text-red-400'
                      )}
                    >
                      {post.status === 'draft' ? 'Brouillon' : post.status === 'scheduled' ? 'Planifie' : post.status === 'published' ? 'Publie' : 'Echoue'}
                    </span>
                  </div>
                  <p className="text-sm text-white/80 line-clamp-3">{post.content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {post.scheduledAt && (
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <Clock className="w-3 h-3" />
                        {new Date(post.scheduledAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <FileText className="w-3 h-3" />
                      {post.content.length} car.
                    </span>
                    {post.mediaUrls && post.mediaUrls.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <ImageIcon className="w-3 h-3" />
                        {post.mediaUrls.length} media
                      </span>
                    )}
                  </div>
                </div>

                {/* Thumbnail */}
                {post.mediaUrls && post.mediaUrls[0] && (
                  <img
                    src={post.mediaUrls[0]}
                    alt=""
                    className="w-16 h-16 object-cover rounded-lg border border-border flex-shrink-0"
                  />
                )}

                {/* Delete */}
                <button
                  onClick={() => handleDelete(post.id)}
                  className="p-1.5 text-muted hover:text-red-400 transition-colors flex-shrink-0"
                  title="Supprimer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
