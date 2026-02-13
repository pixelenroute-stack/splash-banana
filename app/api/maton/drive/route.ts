import { NextRequest, NextResponse } from 'next/server'
import { drive } from '@/lib/maton'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const folderId = searchParams.get('folderId')
    const pageSize = parseInt(searchParams.get('pageSize') || '30')

    let driveQuery = query
    if (folderId) {
      driveQuery = `'${folderId}' in parents${query ? ` and ${query}` : ''}`
    }

    const data = await drive.listFiles(driveQuery, pageSize)

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
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, parentId } = body

    if (!name) {
      return NextResponse.json({ success: false, error: 'name requis' }, { status: 400 })
    }

    const folder = await drive.createFolder(name, parentId)
    return NextResponse.json({ success: true, data: folder })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Drive'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
