import { NextResponse } from 'next/server'
import { getGoogleAuthUrl } from '@/lib/google'

export async function GET() {
  const url = await getGoogleAuthUrl()
  return NextResponse.redirect(url)
}
