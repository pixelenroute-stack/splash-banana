'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { getAuthState } from '@/lib/auth'
import type { User } from '@/types'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const auth = getAuthState()
    if (!auth.isAuthenticated) {
      router.replace('/login')
      return
    }
    setUser(auth.user)
    setIsReady(true)
  }, [router])

  if (!isReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-lantean-blue font-orbitron animate-pulse">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
