import { NextRequest, NextResponse } from 'next/server'
import {
  getAllUsers,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
} from '@/lib/userStore'

// GET /api/admin/users - List all users
export async function GET() {
  try {
    const users = getAllUsers()
    return NextResponse.json({ success: true, data: users })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST /api/admin/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role, status, phone, company, jobTitle, notes } = body

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'Nom, email, mot de passe et rôle sont requis' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existing = getUserByEmail(email)
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Un utilisateur avec cet email existe déjà' },
        { status: 409 }
      )
    }

    // Validate role
    if (!['admin', 'manager', 'user'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Rôle invalide (admin, manager, user)' },
        { status: 400 }
      )
    }

    const user = createUser({ name, email, password, role, status, phone, company, jobTitle, notes })
    return NextResponse.json({ success: true, data: user }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/users - Update user status or role
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID utilisateur requis' },
        { status: 400 }
      )
    }

    // Only allow updating specific fields
    const allowedFields: Record<string, boolean> = {
      name: true,
      email: true,
      role: true,
      status: true,
      password: true,
      phone: true,
      company: true,
      jobTitle: true,
      notes: true,
    }

    const sanitized: Record<string, string> = {}
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields[key] && typeof value === 'string') {
        sanitized[key] = value
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune modification valide fournie' },
        { status: 400 }
      )
    }

    const user = updateUser(id, sanitized as Parameters<typeof updateUser>[1])
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: user })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/users - Delete a user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID utilisateur requis' },
        { status: 400 }
      )
    }

    // Prevent deleting the main admin
    if (id === '1') {
      return NextResponse.json(
        { success: false, error: 'Impossible de supprimer l\'administrateur principal' },
        { status: 403 }
      )
    }

    const deleted = deleteUser(id)
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, message: 'Utilisateur supprimé' })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
