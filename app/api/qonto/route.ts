import { NextRequest, NextResponse } from 'next/server'

const QONTO_LOGIN = process.env.QONTO_LOGIN
const QONTO_SECRET = process.env.QONTO_SECRET_KEY
const QONTO_BASE = 'https://thirdparty.qonto.com/v2'

async function qontoFetch(path: string, options: RequestInit = {}) {
  if (!QONTO_LOGIN || !QONTO_SECRET) {
    throw new Error('Qonto non configuré')
  }

  const res = await fetch(`${QONTO_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `${QONTO_LOGIN}:${QONTO_SECRET}`,
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
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'organization'

    if (type === 'organization') {
      const data = await qontoFetch('/organization')
      return NextResponse.json({ success: true, data: data.organization })
    }

    if (type === 'transactions') {
      const slug = searchParams.get('slug') || ''
      const status = searchParams.get('status') || ''
      const params = new URLSearchParams({ 'slug': slug })
      if (status) params.set('status[]', status)
      const data = await qontoFetch(`/transactions?${params}`)
      return NextResponse.json({ success: true, data: data.transactions })
    }

    if (type === 'bank_accounts') {
      const data = await qontoFetch('/organization')
      return NextResponse.json({ success: true, data: data.organization?.bank_accounts || [] })
    }

    return NextResponse.json({ success: false, error: 'Type non supporté' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Qonto'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
