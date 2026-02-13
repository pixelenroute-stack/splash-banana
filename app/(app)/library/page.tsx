'use client'

import { useState, useEffect, useRef, useCallback, DragEvent } from 'react'
import {
  Library,
  Upload,
  Search,
  Grid,
  List,
  Trash2,
  Image as ImageIcon,
  Video,
  FileText,
  Download,
  X,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MediaAsset } from '@/types'

const STORAGE_KEY = 'media_library'

function loadAssets(): MediaAsset[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAssets(assets: MediaAsset[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets))
  } catch (e) {
    // localStorage quota exceeded - remove oldest items and retry
    console.warn('localStorage quota exceeded, pruning old items...')
    const pruned = assets.slice(0, Math.floor(assets.length / 2))
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned))
    } catch {
      console.error('Cannot save to localStorage even after pruning', e)
    }
  }
}

function getTypeIcon(type: MediaAsset['type']) {
  switch (type) {
    case 'image':
      return ImageIcon
    case 'video':
      return Video
    default:
      return FileText
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '--'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function LibraryPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all')
  const [isDragging, setIsDragging] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setAssets(loadAssets())
  }, [])

  // Listen for changes from other pages (Image Studio, Video Studio)
  useEffect(() => {
    function handleStorageUpdate() {
      setAssets(loadAssets())
    }
    window.addEventListener('media_library_updated', handleStorageUpdate)
    return () => window.removeEventListener('media_library_updated', handleStorageUpdate)
  }, [])

  const filtered = assets.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.tags && a.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())))
    const matchesType = typeFilter === 'all' || a.type === typeFilter
    return matchesSearch && matchesType
  })

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        let type: MediaAsset['type'] = 'document'
        if (file.type.startsWith('image/')) type = 'image'
        else if (file.type.startsWith('video/')) type = 'video'
        else if (file.type.startsWith('audio/')) type = 'audio'

        const newAsset: MediaAsset = {
          id: crypto.randomUUID(),
          name: file.name,
          type,
          url: dataUrl,
          thumbnailUrl: type === 'image' ? dataUrl : undefined,
          size: file.size,
          mimeType: file.type,
          createdAt: new Date().toISOString(),
          tags: [],
        }

        setAssets((prev) => {
          const updated = [newAsset, ...prev]
          saveAssets(updated)
          return updated
        })
      }
      reader.readAsDataURL(file)
    })
  }, [])

  function handleDelete(id: string) {
    const updated = assets.filter((a) => a.id !== id)
    setAssets(updated)
    saveAssets(updated)
    if (selectedAsset?.id === id) setSelectedAsset(null)
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    handleFileUpload(e.dataTransfer.files)
  }

  return (
    <div
      className="p-6 space-y-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mediatheque</h1>
          <p className="text-muted text-sm mt-1">
            Gestion des medias{' '}
            <span className="text-xs">({assets.length} fichier{assets.length !== 1 ? 's' : ''})</span>
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span className="text-sm">Importer</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />
      </div>

      {/* Search + Filters + View Toggle */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Rechercher un media..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
          />
        </div>

        {/* Type filter */}
        <div className="flex bg-surface border border-border rounded-lg overflow-hidden">
          {(['all', 'image', 'video'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'px-3 py-2.5 text-sm transition-colors',
                typeFilter === t ? 'bg-primary/20 text-lantean-blue' : 'text-muted hover:text-white'
              )}
            >
              {t === 'all' ? (
                <span className="flex items-center gap-1"><Filter className="w-3 h-3" /> Tous</span>
              ) : t === 'image' ? (
                <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Images</span>
              ) : (
                <span className="flex items-center gap-1"><Video className="w-3 h-3" /> Videos</span>
              )}
            </button>
          ))}
        </div>

        {/* View mode */}
        <div className="flex bg-surface border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={cn('p-2.5', viewMode === 'grid' ? 'bg-primary/20 text-lantean-blue' : 'text-muted')}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn('p-2.5', viewMode === 'list' ? 'bg-primary/20 text-lantean-blue' : 'text-muted')}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Drag & Drop overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-lantean-blue rounded-2xl p-12 text-center">
            <Upload className="w-12 h-12 text-lantean-blue mx-auto mb-4" />
            <p className="text-lg font-medium text-lantean-blue">Deposez vos fichiers ici</p>
          </div>
        </div>
      )}

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <Library className="w-12 h-12 mb-4 opacity-30" />
          <p>Aucun media</p>
          <p className="text-sm mt-1">Importez ou generez des medias depuis Image Studio ou Video Studio</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors text-sm"
          >
            <Upload className="w-4 h-4" />
            Importer des fichiers
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((asset) => {
            const TypeIcon = getTypeIcon(asset.type)
            return (
              <div
                key={asset.id}
                className="card-hover group relative overflow-hidden cursor-pointer"
                onClick={() => setSelectedAsset(asset)}
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-background/50 rounded-lg overflow-hidden flex items-center justify-center">
                  {asset.type === 'image' && asset.url ? (
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                  ) : asset.type === 'video' && asset.url ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-background">
                      <Video className="w-8 h-8 text-lantean-blue" />
                    </div>
                  ) : (
                    <TypeIcon className="w-8 h-8 text-muted" />
                  )}
                </div>

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate text-white">{asset.name}</p>
                    <p className="text-xs text-muted">{formatFileSize(asset.size)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(asset.id) }}
                    className="p-1.5 bg-red-500/20 rounded-lg hover:bg-red-500/40 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>

                {/* Type badge */}
                <div className="absolute top-2 left-2">
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full',
                    asset.type === 'image' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                  )}>
                    {asset.type}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {filtered.map((asset) => {
            const TypeIcon = getTypeIcon(asset.type)
            return (
              <div
                key={asset.id}
                className="card-hover flex items-center gap-4 cursor-pointer"
                onClick={() => setSelectedAsset(asset)}
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 bg-background/50 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                  {asset.type === 'image' && asset.url ? (
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                  ) : (
                    <TypeIcon className="w-5 h-5 text-muted" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{asset.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full',
                      asset.type === 'image' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                    )}>
                      {asset.type}
                    </span>
                    <span className="text-xs text-muted">{formatFileSize(asset.size)}</span>
                    <span className="text-xs text-muted">
                      {new Date(asset.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'short' })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {asset.url && (
                    <a
                      href={asset.url}
                      download={asset.name}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 text-muted hover:text-white transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(asset.id) }}
                    className="p-2 text-muted hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6" onClick={() => setSelectedAsset(null)}>
          <div className="bg-surface border border-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold truncate">{selectedAsset.name}</h3>
              <button onClick={() => setSelectedAsset(null)} className="p-1 text-muted hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {selectedAsset.type === 'image' && selectedAsset.url && (
                <img src={selectedAsset.url} alt={selectedAsset.name} className="w-full max-h-[60vh] object-contain rounded-lg" />
              )}
              {selectedAsset.type === 'video' && selectedAsset.url && (
                <video src={selectedAsset.url} controls className="w-full max-h-[60vh] rounded-lg" />
              )}
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted">Type :</span>{' '}
                  <span className="text-white">{selectedAsset.type}</span>
                </div>
                <div>
                  <span className="text-muted">Taille :</span>{' '}
                  <span className="text-white">{formatFileSize(selectedAsset.size)}</span>
                </div>
                <div>
                  <span className="text-muted">Date :</span>{' '}
                  <span className="text-white">{new Date(selectedAsset.createdAt).toLocaleString('fr-FR')}</span>
                </div>
                {selectedAsset.mimeType && (
                  <div>
                    <span className="text-muted">MIME :</span>{' '}
                    <span className="text-white">{selectedAsset.mimeType}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
              {selectedAsset.url && (
                <a
                  href={selectedAsset.url}
                  download={selectedAsset.name}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  Telecharger
                </a>
              )}
              <button
                onClick={() => { handleDelete(selectedAsset.id); setSelectedAsset(null) }}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
