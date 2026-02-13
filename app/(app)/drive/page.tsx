'use client'

import { useEffect, useState } from 'react'
import { HardDrive, Search, Loader2, Folder, FileText, Image, Film, Music, Table, Presentation, FolderPlus, ChevronLeft, ExternalLink, RefreshCw } from 'lucide-react'
import type { DriveFile } from '@/types'

const MIME_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'application/vnd.google-apps.folder': Folder,
  'application/vnd.google-apps.document': FileText,
  'application/vnd.google-apps.spreadsheet': Table,
  'application/vnd.google-apps.presentation': Presentation,
  'application/pdf': FileText,
  'image/': Image,
  'video/': Film,
  'audio/': Music,
}

function getFileIcon(mimeType: string) {
  for (const [key, Icon] of Object.entries(MIME_ICONS)) {
    if (mimeType.startsWith(key)) return Icon
  }
  return FileText
}

function formatFileSize(bytes: string) {
  if (!bytes) return ''
  const n = parseInt(bytes)
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export default function DrivePage() {
  const [files, setFiles] = useState<DriveFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [folderStack, setFolderStack] = useState<Array<{ id: string; name: string }>>([])
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : null

  async function loadFiles(folderId?: string | null, query = '') {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (folderId) params.set('folderId', folderId)
      if (query) params.set('q', `name contains '${query}'`)
      const res = await fetch(`/api/maton/drive?${params}`)
      const data = await res.json()
      if (data.success) setFiles(data.data)
    } catch {
      // Drive not connected
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadFiles(currentFolderId) }, [currentFolderId])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    loadFiles(currentFolderId, search)
  }

  function openFolder(file: DriveFile) {
    setFolderStack((prev) => [...prev, { id: file.id, name: file.name }])
  }

  function goBack() {
    setFolderStack((prev) => prev.slice(0, -1))
  }

  function goToRoot() {
    setFolderStack([])
  }

  async function createFolder() {
    if (!newFolderName.trim()) return
    try {
      await fetch('/api/maton/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim(), parentId: currentFolderId }),
      })
      setNewFolderName('')
      setShowNewFolder(false)
      loadFiles(currentFolderId)
    } catch {
      // Error
    }
  }

  const folders = files.filter((f) => f.mimeType === 'application/vnd.google-apps.folder')
  const nonFolders = files.filter((f) => f.mimeType !== 'application/vnd.google-apps.folder')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Google Drive</h1>
          <p className="text-muted text-sm mt-1">Fichiers et dossiers via Maton.ai</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewFolder(!showNewFolder)}
            className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            <span className="text-sm">Nouveau dossier</span>
          </button>
          <button
            onClick={() => loadFiles(currentFolderId)}
            className="p-2 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      {folderStack.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <button onClick={goToRoot} className="text-muted hover:text-lantean-blue transition-colors">Mon Drive</button>
          {folderStack.map((folder, i) => (
            <span key={folder.id} className="flex items-center gap-2">
              <span className="text-muted">/</span>
              {i === folderStack.length - 1 ? (
                <span className="text-white font-medium">{folder.name}</span>
              ) : (
                <button
                  onClick={() => setFolderStack((prev) => prev.slice(0, i + 1))}
                  className="text-muted hover:text-lantean-blue transition-colors"
                >
                  {folder.name}
                </button>
              )}
            </span>
          ))}
          <button onClick={goBack} className="ml-2 p-1 text-muted hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {showNewFolder && (
        <div className="card flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm text-muted mb-1 block">Nom du dossier</label>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nouveau dossier"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue"
              onKeyDown={(e) => e.key === 'Enter' && createFolder()}
            />
          </div>
          <button
            onClick={createFolder}
            className="px-4 py-2.5 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors font-medium"
          >
            Créer
          </button>
        </div>
      )}

      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Rechercher des fichiers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
        />
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-lantean-blue animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <HardDrive className="w-12 h-12 mb-4 opacity-30" />
          <p>Aucun fichier</p>
        </div>
      ) : (
        <div className="space-y-4">
          {folders.length > 0 && (
            <div>
              <h3 className="text-sm text-muted mb-2">Dossiers</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {folders.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => openFolder(file)}
                    className="card-hover flex flex-col items-center gap-2 p-4 text-center"
                  >
                    <Folder className="w-10 h-10 text-gold-accent" />
                    <span className="text-sm truncate w-full">{file.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {nonFolders.length > 0 && (
            <div>
              <h3 className="text-sm text-muted mb-2">Fichiers</h3>
              <div className="divide-y divide-border/50">
                {nonFolders.map((file) => {
                  const Icon = getFileIcon(file.mimeType)
                  return (
                    <div key={file.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface/50 transition-colors">
                      <Icon className="w-5 h-5 text-lantean-blue flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted">
                          {formatFileSize(file.size || '')}
                          {file.modifiedTime && ` · ${new Date(file.modifiedTime).toLocaleDateString('fr-FR')}`}
                        </p>
                      </div>
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-muted hover:text-lantean-blue transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
