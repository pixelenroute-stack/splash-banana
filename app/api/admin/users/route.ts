import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken, getTokenFromCookie } from '@/lib/jwt'
import { logAudit } from '@/lib/audit'
import {
  getAllUsers,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
} from '@/lib/userStore'

// Helper: require admin JWT
function requireAdmin(request: NextRequest) {
  const token = getTokenFromCookie(request.headers.get('cookie'))
  const user = token ? verifyToken(token) : null
  return user?.role === 'admin' ? user : null
}

// GET /api/admin/users
export async function GET(request: NextRequest) {
  try {
    // Try Supabase first
    const { data: dbUsers, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, status, phone, company, job_title, avatar, notes, totp_enabled, last_login_at, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (dbUsers && !error) {
      const users = dbUsers.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status,
        phone: u.phone || '',
        company: u.company || '',
        jobTitle: u.job_title || '',
        avatar: u.avatar || '',
        notes: u.notes || '',
        totpEnabled: u.totp_enabled,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      }))
      return NextResponse.json({ success: true, data: users })
    }

    // Fallback to in-memory
    const users = getAllUsers()
    return NextResponse.json({ success: true, data: users })
  } catch {
    // Fallback to in-memory
    const users = getAllUsers()
    return NextResponse.json({ success: true, data: users })
  }
}

// POST /api/admin/users
export async function POST(request: NextRequest) {
  try {
    const admin = requireAdmin(request)
    const body = await request.json()
    const { name, email, password, role, status, phone, company, jobTitle, notes } = body

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'Nom, email, mot de passe et rôle sont requis' },
        { status: 400 }
      )
    }

    if (!['admin', 'manager', 'user'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Rôle invalide (admin, manager, user)' },
        { status: 400 }
      )
    }

    // Try Supabase first
    try {
      // Check duplicate
      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single()

      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Un utilisateur avec cet email existe déjà' },
          { status: 409 }
        )
      }

      const passwordHash = await bcrypt.hash(password, 10)

      const { data: newUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          email: email.toLowerCase(),
          name,
          password_hash: passwordHash,
          role,
          status: status || 'active',
          phone: phone || null,
          company: company || null,
          job_title: jobTitle || null,
          notes: notes || null,
        })
        .select('id, email, name, role, status, phone, company, job_title, notes, created_at')
        .single()

      if (newUser && !error) {
        await logAudit('user.created', admin?.userId || null, {
          targetUserId: newUser.id,
          email: newUser.email,
          role: newUser.role,
        })
        return NextResponse.json({
          success: true,
          data: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            status: newUser.status,
            phone: newUser.phone || '',
            company: newUser.company || '',
            jobTitle: newUser.job_title || '',
            notes: newUser.notes || '',
            createdAt: newUser.created_at,
          },
        }, { status: 201 })
      }
    } catch {
      // Supabase not available, fall through to legacy
    }

    // Fallback: in-memory
    const existing = getUserByEmail(email)
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Un utilisateur avec cet email existe déjà' },
        { status: 409 }
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

// PATCH /api/admin/users
export async function PATCH(request: NextRequest) {
  try {
    const admin = requireAdmin(request)
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID utilisateur requis' },
        { status: 400 }
      )
    }

    // Try Supabase first
    try {
      const dbUpdates: Record<string, unknown> = {}

      if (updates.name) dbUpdates.name = updates.name
      if (updates.email) dbUpdates.email = updates.email.toLowerCase()
      if (updates.role) dbUpdates.role = updates.role
      if (updates.status) dbUpdates.status = updates.status
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null
      if (updates.company !== undefined) dbUpdates.company = updates.company || null
      if (updates.jobTitle !== undefined) dbUpdates.job_title = updates.jobTitle || null
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null

      // Hash password if being updated
      if (updates.password) {
        dbUpdates.password_hash = await bcrypt.hash(updates.password, 10)
      }

      if (Object.keys(dbUpdates).length === 0) {
        return NextResponse.json(
          { success: false, error: 'Aucune modification valide fournie' },
          { status: 400 }
        )
      }

      dbUpdates.updated_at = new Date().toISOString()

      const { data: updated, error } = await supabaseAdmin
        .from('users')
        .update(dbUpdates)
        .eq('id', id)
        .select('id, email, name, role, status, phone, company, job_title, notes, updated_at')
        .single()

      if (updated && !error) {
        await logAudit('user.updated', admin?.userId || null, {
          targetUserId: updated.id,
          fields: Object.keys(dbUpdates).filter((k) => k !== 'updated_at' && k !== 'password_hash'),
        })
        return NextResponse.json({
          success: true,
          data: {
            id: updated.id,
            email: updated.email,
            name: updated.name,
            role: updated.role,
            status: updated.status,
            phone: updated.phone || '',
            company: updated.company || '',
            jobTitle: updated.job_title || '',
            notes: updated.notes || '',
            updatedAt: updated.updated_at,
          },
        })
      }
    } catch {
      // Fall through to legacy
    }

    // Fallback: in-memory
    const allowedFields: Record<string, boolean> = {
      name: true, email: true, role: true, status: true, password: true,
      phone: true, company: true, jobTitle: true, notes: true,
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

// DELETE /api/admin/users
export async function DELETE(request: NextRequest) {
  try {
    const admin = requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID utilisateur requis' },
        { status: 400 }
      )
    }

    // Try Supabase first
    try {
      // Check if this is the main admin
      const { data: targetUser } = await supabaseAdmin
        .from('users')
        .select('email, role')
        .eq('id', id)
        .single()

      if (targetUser?.email === 'admin@splashbanana.com') {
        return NextResponse.json(
          { success: false, error: "Impossible de supprimer l'administrateur principal" },
          { status: 403 }
        )
      }

      const { error } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', id)

      if (!error) {
        await logAudit('user.deleted', admin?.userId || null, {
          targetUserId: id,
          email: targetUser?.email,
        })
        return NextResponse.json({ success: true, message: 'Utilisateur supprimé' })
      }
    } catch {
      // Fall through to legacy
    }

    // Fallback: in-memory
    if (id === '1') {
      return NextResponse.json(
        { success: false, error: "Impossible de supprimer l'administrateur principal" },
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
