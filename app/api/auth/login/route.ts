import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/userStore'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      )
    }

    // Authenticate against the shared in-memory user store
    // This includes both the original demo users and any admin-created users
    const user = authenticateUser(email, password)

    if (!user) {
      return NextResponse.json(
        { error: 'Identifiants incorrects' },
        { status: 401 }
      )
    }

    // Simple token for demo - replace with JWT in production
    const token = Buffer.from(`${user.id}:${user.email}:${Date.now()}`).toString('base64')

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
