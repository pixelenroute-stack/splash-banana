import { NextRequest, NextResponse } from 'next/server'
import { getSetting } from '@/lib/settings-service'

const QONTO_BASE = 'https://thirdparty.qonto.com/v2'

async function qontoFetch(login: string, secret: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`${QONTO_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `${login}:${secret}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Qonto error ${res.status}: ${text}`)
  }

  return res.json()
}

export async function GET(request: NextRequest) {
  try {
    const login = await getSetting('qonto_login')
    const secret = await getSetting('qonto_secret')

    if (!login || !secret) {
      return NextResponse.json({ success: false, error: 'Qonto non configuré. Configurez-le dans Paramètres.' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'organization'

    if (type === 'organization') {
      const data = await qontoFetch(login, secret, '/organization')
      return NextResponse.json({ success: true, data: data.organization })
    }

    if (type === 'transactions') {
      const slug = searchParams.get('slug') || ''
      const status = searchParams.get('status') || ''
      const params = new URLSearchParams({ 'slug': slug })
      if (status) params.set('status[]', status)
      const data = await qontoFetch(login, secret, `/transactions?${params}`)
      return NextResponse.json({ success: true, data: data.transactions })
    }

    if (type === 'bank_accounts') {
      const data = await qontoFetch(login, secret, '/organization')
      return NextResponse.json({ success: true, data: data.organization?.bank_accounts || [] })
    }

    return NextResponse.json({ success: false, error: 'Type non supporté' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Qonto'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
