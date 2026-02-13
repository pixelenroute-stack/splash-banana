// Server-side in-memory user store
// Shared between admin API and login API
// Persists across requests within the same server process

import type { AdminUser } from '@/types'

export interface StoredUser extends AdminUser {
  password: string
}

// Seed with the same demo users as the original login route
const defaultUsers: StoredUser[] = [
  {
    id: '1',
    name: 'Admin SB',
    email: 'admin@splashbanana.com',
    password: 'admin123',
    role: 'admin',
    status: 'active',
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
  },
  {
    id: '2',
    name: 'Utilisateur',
    email: 'user@splashbanana.com',
    password: 'user123',
    role: 'user',
    status: 'active',
    createdAt: '2024-03-01T14:30:00.000Z',
    updatedAt: '2024-03-01T14:30:00.000Z',
  },
]

// The in-memory store (singleton within the server process)
let users: StoredUser[] = [...defaultUsers]

export function getAllUsers(): AdminUser[] {
  // Return users WITHOUT passwords
  return users.map(({ password: _pw, ...user }) => user)
}

export function getUserById(id: string): StoredUser | undefined {
  return users.find((u) => u.id === id)
}

export function getUserByEmail(email: string): StoredUser | undefined {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase())
}

export function authenticateUser(email: string, password: string): StoredUser | undefined {
  return users.find(
    (u) =>
      u.email.toLowerCase() === email.toLowerCase() &&
      u.password === password &&
      u.status === 'active'
  )
}

export function createUser(data: {
  name: string
  email: string
  password: string
  role: 'admin' | 'manager' | 'user'
  status?: 'active' | 'inactive' | 'invited'
}): AdminUser {
  const now = new Date().toISOString()
  const newUser: StoredUser = {
    id: String(Date.now()),
    name: data.name,
    email: data.email,
    password: data.password,
    role: data.role,
    status: data.status || 'inactive',
    createdAt: now,
    updatedAt: now,
  }
  users.push(newUser)
  const { password: _pw, ...userWithoutPassword } = newUser
  return userWithoutPassword
}

export function updateUser(
  id: string,
  data: Partial<Pick<StoredUser, 'name' | 'role' | 'status' | 'password' | 'lastLoginAt'>>
): AdminUser | null {
  const index = users.findIndex((u) => u.id === id)
  if (index === -1) return null

  users[index] = {
    ...users[index],
    ...data,
    updatedAt: new Date().toISOString(),
  }

  const { password: _pw, ...userWithoutPassword } = users[index]
  return userWithoutPassword
}

export function deleteUser(id: string): boolean {
  const index = users.findIndex((u) => u.id === id)
  if (index === -1) return false
  users.splice(index, 1)
  return true
}

export function resetStore(): void {
  users = [...defaultUsers]
}
