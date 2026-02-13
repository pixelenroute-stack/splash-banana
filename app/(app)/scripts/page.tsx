'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ScriptsRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/tutorials') }, [router])
  return null
}
