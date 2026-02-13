import { NextRequest, NextResponse } from 'next/server'
import { getGoogleToken } from '@/lib/google-token'
import { googleDrive } from '@/lib/google'

function noGoogle() {
  return NextResponse.json({
    success: false,
    error: 'Google non connecté. Allez dans Paramètres > Connecter Google.',
    needsAuth: true,
  }, { status: 401 })
}

export async function GET(request: NextRequest) {
  const token = await getGoogleToken()
  if (!token) return noGoogle()

  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const folderId = searchParams.get('folderId')
    const pageSize = parseInt(searchParams.get('pageSize') || '30')

    let driveQuery = query
    if (folderId) {
      driveQuery = `'${folderId}' in parents${query ? ` and ${query}` : ''}`
    }

    const data = await googleDrive.listFiles(token, driveQuery, pageSize)

    const files = (data.files || []).map((f: Record<string, unknown>) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size || '',
      modifiedTime: f.modifiedTime || '',
      webViewLink: f.webViewLink || '',
      iconLink: f.iconLink || '',
      parents: f.parents || [],
    }))

    return NextResponse.json({ success: true, data: files })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Drive'
    if (message === 'GOOGLE_TOKEN_EXPIRED') return noGoogle()
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const token = await getGoogleToken()
  if (!token) return noGoogle()

  try {
    const body = await request.json()
    const { name, parentId } = body
    if (!name) return NextResponse.json({ success: false, error: 'name requis' }, { status: 400 })

    const folder = await googleDrive.createFolder(token, name, parentId)
    return NextResponse.json({ success: true, data: folder })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Drive'
    if (message === 'GOOGLE_TOKEN_EXPIRED') return noGoogle()
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
