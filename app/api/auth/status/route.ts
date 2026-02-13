import { NextResponse } from 'next/server'
import { getGoogleToken } from '@/lib/google-token'

export async function GET() {
  try {
    const token = await getGoogleToken()
    return NextResponse.json({
      google: !!token,
    })
  } catch {
    return NextResponse.json({ google: false })
  }
}
