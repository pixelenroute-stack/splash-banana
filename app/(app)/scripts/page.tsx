'use client'

import { useState } from 'react'
import { Palette, Plus } from 'lucide-react'
import type { MoodboardItem } from '@/types'

export default function MoodboardPage() {
  const [items] = useState<MoodboardItem[]>([])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Moodboard</h1>
          <p className="text-muted text-sm mt-1">Tableaux d&apos;inspiration et scripts</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors">
          <Plus className="w-4 h-4" />
          <span className="text-sm">Nouveau tableau</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <Palette className="w-12 h-12 mb-4 opacity-30" />
          <p>Aucun moodboard</p>
          <p className="text-sm mt-1">Créez votre premier tableau d&apos;inspiration</p>
        </div>
      ) : null}
    </div>
  )
}
