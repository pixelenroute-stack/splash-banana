import { NextRequest, NextResponse } from 'next/server'
import { getAllSettings, saveSettings, getMaskedSettings } from '@/lib/settings-service'
import { verifyToken, getTokenFromCookie } from '@/lib/jwt'
import { logAudit } from '@/lib/audit'

// GET /api/settings - Get all settings (masked for non-admins)
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie'))
    const user = token ? verifyToken(token) : null

    // Admin gets full masked view, others get basic status
    if (user?.role === 'admin') {
      const masked = await getMaskedSettings()
      return NextResponse.json({ success: true, data: masked })
    }

    // Non-admin: just return which services are configured
    const all = await getAllSettings()
    const status: Record<string, boolean> = {}
    for (const [key, value] of Object.entries(all)) {
      status[key] = !!value
    }
    return NextResponse.json({ success: true, data: status })
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/settings - Update settings (admin only)
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie'))
    const user = token ? verifyToken(token) : null

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès réservé aux administrateurs' }, { status: 403 })
    }

    const body = await request.json()
    const { settings } = body

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ success: false, error: 'Settings requis' }, { status: 400 })
    }

    const saved = await saveSettings(settings)
    if (!saved) {
      return NextResponse.json({ success: false, error: 'Erreur de sauvegarde' }, { status: 500 })
    }

    await logAudit('settings.updated', user.userId, {
      keys: Object.keys(settings),
    })

    return NextResponse.json({ success: true, message: 'Paramètres sauvegardés' })
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
