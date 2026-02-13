'use client'

import { useState } from 'react'
import { Share2, Plus } from 'lucide-react'
import type { SocialPost } from '@/types'

export default function SocialFactoryPage() {
  const [posts] = useState<SocialPost[]>([])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Social Factory</h1>
          <p className="text-muted text-sm mt-1">Création et planification de contenu social</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors">
          <Plus className="w-4 h-4" />
          <span className="text-sm">Nouveau post</span>
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <Share2 className="w-12 h-12 mb-4 opacity-30" />
          <p>Aucun post planifié</p>
          <p className="text-sm mt-1">Créez et planifiez vos publications</p>
        </div>
      ) : null}
    </div>
  )
}
