import { NextRequest, NextResponse } from 'next/server'

// Demo users for development - replace with real auth later
const DEMO_USERS = [
  {
    id: '1',
    email: 'admin@splashbanana.com',
    password: 'admin123',
    name: 'Admin SB',
    role: 'admin' as const,
  },
  {
    id: '2',
    email: 'user@splashbanana.com',
    password: 'user123',
    name: 'Utilisateur',
    role: 'user' as const,
  },
]

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      )
    }

    const user = DEMO_USERS.find(
      (u) => u.email === email && u.password === password
    )

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
        createdAt: new Date().toISOString(),
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
