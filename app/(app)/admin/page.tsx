'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AdminUser } from '@/types'
import {
  Shield,
  Server,
  Users,
  UserPlus,
  Mail,
  Trash2,
  ChevronDown,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Lock,
  Globe,
  Database,
  Key,
  Pencil,
  Phone,
  Building2,
  Briefcase,
  StickyNote,
} from 'lucide-react'

// ===== Types =====
type TabId = 'users' | 'infrastructure' | 'security'

interface CreateUserForm {
  name: string
  email: string
  password: string
  role: 'admin' | 'manager' | 'user'
  phone: string
  company: string
  jobTitle: string
  notes: string
}

interface EditUserForm {
  name: string
  email: string
  password: string
  role: 'admin' | 'manager' | 'user'
  status: 'active' | 'inactive' | 'invited'
  phone: string
  company: string
  jobTitle: string
  notes: string
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

// ===== Status Badge Component =====
function StatusBadge({ status }: { status: AdminUser['status'] }) {
  const config = {
    active: {
      bg: 'bg-green-500/15',
      text: 'text-green-400',
      border: 'border-green-500/30',
      label: 'Actif',
    },
    invited: {
      bg: 'bg-yellow-500/15',
      text: 'text-yellow-400',
      border: 'border-yellow-500/30',
      label: 'Invité',
    },
    inactive: {
      bg: 'bg-gray-500/15',
      text: 'text-gray-400',
      border: 'border-gray-500/30',
      label: 'Inactif',
    },
  }
  const c = config[status]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
      {c.label}
    </span>
  )
}

// ===== Role Badge Component =====
function RoleBadge({ role }: { role: AdminUser['role'] }) {
  const config = {
    admin: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Admin' },
    manager: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Manager' },
    user: { bg: 'bg-slate-500/15', text: 'text-slate-300', label: 'User' },
  }
  const c = config[role]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

// ===== Toast Notification Component =====
function ToastNotification({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-green-400" />,
    error: <XCircle className="w-4 h-4 text-red-400" />,
    info: <AlertCircle className="w-4 h-4 text-lantean-blue" />,
  }
  const borders = {
    success: 'border-green-500/30',
    error: 'border-red-500/30',
    info: 'border-lantean-blue/30',
  }

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div className={`flex items-center gap-3 px-4 py-3 bg-surface border ${borders[toast.type]} rounded-lg shadow-lg animate-slide-up`}>
      {icons[toast.type]}
      <span className="text-sm">{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} className="ml-auto text-muted hover:text-white">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ===== Create User Modal =====
function CreateUserModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (form: CreateUserForm) => void
}) {
  const [form, setForm] = useState<CreateUserForm>({
    name: '',
    email: '',
    password: '',
    role: 'user',
    phone: '',
    company: '',
    jobTitle: '',
    notes: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Partial<CreateUserForm>>({})

  function validate(): boolean {
    const errs: Partial<CreateUserForm> = {}
    if (!form.name.trim()) errs.name = 'Nom requis'
    if (!form.email.trim()) errs.email = 'Email requis'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email invalide'
    if (!form.password.trim()) errs.password = 'Mot de passe requis'
    else if (form.password.length < 4) errs.password = 'Minimum 4 caractères'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) {
      onCreate(form)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto py-8">
      <div className="w-full max-w-lg bg-surface border border-border rounded-xl p-6 shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-lantean-blue/10">
              <UserPlus className="w-5 h-5 text-lantean-blue" />
            </div>
            <h2 className="text-lg font-semibold">Créer un utilisateur</h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Nom complet</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Jean Dupont"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jean@example.com"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Rôle</label>
            <div className="relative">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as CreateUserForm['role'] })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white outline-none focus:border-lantean-blue transition-colors appearance-none cursor-pointer"
              >
                <option value="user">Utilisateur</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrateur</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minimum 4 caractères"
                className="w-full px-4 py-2.5 pr-10 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Phone & Company row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Téléphone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+33 6 12 34 56 78"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Entreprise</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Nom de l'entreprise"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
              />
            </div>
          </div>

          {/* Job Title */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Poste / Fonction</label>
            <input
              type="text"
              value={form.jobTitle}
              onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
              placeholder="Directeur, Développeur, Designer..."
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes internes..."
              rows={2}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-muted hover:text-white hover:border-white/20 transition-colors text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-lantean-blue/20 border border-lantean-blue/30 text-lantean-blue rounded-lg hover:bg-lantean-blue/30 transition-colors text-sm font-medium"
            >
              Créer l&apos;utilisateur
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ===== Delete Confirmation Modal =====
function DeleteModal({
  userName,
  onClose,
  onConfirm,
}: {
  userName: string
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-surface border border-red-500/30 rounded-xl p-6 shadow-2xl animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-red-500/10">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold">Supprimer l&apos;utilisateur</h2>
        </div>
        <p className="text-sm text-muted mb-6">
          Êtes-vous sûr de vouloir supprimer <span className="text-white font-medium">{userName}</span> ?
          Cette action est irréversible.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-muted hover:text-white transition-colors text-sm"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== Edit User Modal =====
function EditUserModal({
  user,
  onClose,
  onSave,
}: {
  user: AdminUser
  onClose: () => void
  onSave: (id: string, data: Partial<EditUserForm>) => void
}) {
  const [form, setForm] = useState<EditUserForm>({
    name: user.name,
    email: user.email,
    password: '',
    role: user.role,
    status: user.status,
    phone: user.phone || '',
    company: user.company || '',
    jobTitle: user.jobTitle || '',
    notes: user.notes || '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Partial<EditUserForm>>({})

  function validate(): boolean {
    const errs: Partial<EditUserForm> = {}
    if (!form.name.trim()) errs.name = 'Nom requis'
    if (!form.email.trim()) errs.email = 'Email requis'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email invalide'
    if (form.password && form.password.length < 4) errs.password = 'Minimum 4 caractères'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const updates: Record<string, string> = {}
    if (form.name !== user.name) updates.name = form.name
    if (form.email !== user.email) updates.email = form.email
    if (form.role !== user.role) updates.role = form.role
    if (form.status !== user.status) updates.status = form.status
    if (form.password) updates.password = form.password
    if (form.phone !== (user.phone || '')) updates.phone = form.phone
    if (form.company !== (user.company || '')) updates.company = form.company
    if (form.jobTitle !== (user.jobTitle || '')) updates.jobTitle = form.jobTitle
    if (form.notes !== (user.notes || '')) updates.notes = form.notes
    onSave(user.id, updates)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto py-8">
      <div className="w-full max-w-lg bg-surface border border-border rounded-xl p-6 shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-lantean-blue/10">
              <Pencil className="w-5 h-5 text-lantean-blue" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Modifier l&apos;utilisateur</h2>
              <p className="text-xs text-muted">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name & Email row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nom complet</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>
          </div>

          {/* Role & Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Rôle</label>
              <div className="relative">
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as EditUserForm['role'] })}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white outline-none focus:border-lantean-blue transition-colors appearance-none cursor-pointer"
                >
                  <option value="user">Utilisateur</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrateur</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Statut</label>
              <div className="relative">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as EditUserForm['status'] })}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white outline-none focus:border-lantean-blue transition-colors appearance-none cursor-pointer"
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                  <option value="invited">Invité</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Nouveau mot de passe <span className="text-muted font-normal">(laisser vide pour ne pas changer)</span></label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Nouveau mot de passe..."
                className="w-full px-4 py-2.5 pr-10 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Separator */}
          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted uppercase tracking-wider mb-3">Informations complémentaires</p>
          </div>

          {/* Phone & Company row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                <Phone className="w-3.5 h-3.5 text-muted" /> Téléphone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+33 6 12 34 56 78"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                <Building2 className="w-3.5 h-3.5 text-muted" /> Entreprise
              </label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Nom de l'entreprise"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
              />
            </div>
          </div>

          {/* Job Title */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
              <Briefcase className="w-3.5 h-3.5 text-muted" /> Poste / Fonction
            </label>
            <input
              type="text"
              value={form.jobTitle}
              onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
              placeholder="Directeur, Développeur, Designer..."
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
              <StickyNote className="w-3.5 h-3.5 text-muted" /> Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes internes sur l'utilisateur..."
              rows={3}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-muted hover:text-white hover:border-white/20 transition-colors text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-lantean-blue/20 border border-lantean-blue/30 text-lantean-blue rounded-lg hover:bg-lantean-blue/30 transition-colors text-sm font-medium"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ===== Infrastructure Card =====
function InfrastructureCard({
  name,
  envVar,
  icon,
}: {
  name: string
  envVar: string
  icon: React.ReactNode
}) {
  // Client-side: we check if the env var name is known to be configured
  // Since env vars are server-side, we use a heuristic based on known config
  const knownConfigured = [
    'GEMINI_API_KEY',
    'NOTION_API_KEY',
    'PERPLEXITY_API_KEY',
    'CLAUDE_API_KEY',
    'GOOGLE_CLIENT_ID',
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
  ]
  const isConfigured = knownConfigured.includes(envVar)

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <span className="text-sm">{name}</span>
          <p className="text-xs text-muted font-mono">{envVar}</p>
        </div>
      </div>
      <span className={`text-xs font-medium ${isConfigured ? 'text-green-400' : 'text-yellow-400'}`}>
        {isConfigured ? 'Configurée' : 'Non configurée'}
      </span>
    </div>
  )
}

// ===== Main Admin Page =====
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  // Toast helper
  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = String(Date.now())
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (data.success) {
        setUsers(data.data)
        // Sync to localStorage for client-side reference
        localStorage.setItem('admin_users', JSON.stringify(data.data))
      }
    } catch {
      addToast('Erreur lors du chargement des utilisateurs', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Create user
  async function handleCreateUser(form: CreateUserForm) {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, status: 'inactive' }),
      })
      const data = await res.json()
      if (data.success) {
        setShowCreateModal(false)
        addToast(`Utilisateur ${form.name} créé avec succès`)
        fetchUsers()
        // Also update demo_users for login reference
        const demoUsers = JSON.parse(localStorage.getItem('demo_users') || '[]')
        demoUsers.push({ email: form.email, password: form.password, name: form.name, role: form.role })
        localStorage.setItem('demo_users', JSON.stringify(demoUsers))
      } else {
        addToast(data.error || 'Erreur lors de la création', 'error')
      }
    } catch {
      addToast('Erreur réseau', 'error')
    }
  }

  // Edit user
  async function handleEditUser(id: string, updates: Partial<EditUserForm>) {
    if (Object.keys(updates).length === 0) {
      setEditTarget(null)
      return
    }
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
      const data = await res.json()
      if (data.success) {
        setEditTarget(null)
        addToast('Utilisateur mis à jour avec succès')
        fetchUsers()
        // Update demo_users if email or password changed
        if (updates.email || updates.password) {
          const demoUsers = JSON.parse(localStorage.getItem('demo_users') || '[]')
          const idx = demoUsers.findIndex((u: { email: string }) => u.email === editTarget?.email)
          if (idx >= 0) {
            if (updates.email) demoUsers[idx].email = updates.email
            if (updates.password) demoUsers[idx].password = updates.password
            if (updates.name) demoUsers[idx].name = updates.name
            if (updates.role) demoUsers[idx].role = updates.role
            localStorage.setItem('demo_users', JSON.stringify(demoUsers))
          }
        }
      } else {
        addToast(data.error || 'Erreur lors de la mise à jour', 'error')
      }
    } catch {
      addToast('Erreur réseau', 'error')
    }
  }

  // Send invitation
  async function handleSendInvitation(user: AdminUser) {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, status: 'invited' }),
      })
      const data = await res.json()
      if (data.success) {
        addToast(`Invitation envoyée à ${user.email}`, 'info')
        fetchUsers()
      } else {
        addToast(data.error || 'Erreur lors de l\'envoi', 'error')
      }
    } catch {
      addToast('Erreur réseau', 'error')
    }
  }

  // Toggle active/inactive
  async function handleToggleStatus(user: AdminUser) {
    const newStatus = user.status === 'active' ? 'inactive' : 'active'
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, status: newStatus }),
      })
      const data = await res.json()
      if (data.success) {
        addToast(
          newStatus === 'active'
            ? `${user.name} est maintenant actif`
            : `${user.name} a été désactivé`
        )
        fetchUsers()
      } else {
        addToast(data.error || 'Erreur lors de la mise à jour', 'error')
      }
    } catch {
      addToast('Erreur réseau', 'error')
    }
  }

  // Delete user
  async function handleDeleteUser() {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/admin/users?id=${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        addToast(`${deleteTarget.name} a été supprimé`)
        setDeleteTarget(null)
        fetchUsers()
      } else {
        addToast(data.error || 'Erreur lors de la suppression', 'error')
      }
    } catch {
      addToast('Erreur réseau', 'error')
    }
  }

  // Format date
  function formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return '-'
    }
  }

  // Tab config
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'users', label: 'Utilisateurs', icon: <Users className="w-4 h-4" /> },
    { id: 'infrastructure', label: 'Infrastructure', icon: <Server className="w-4 h-4" /> },
    { id: 'security', label: 'Sécurité', icon: <Shield className="w-4 h-4" /> },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Console Admin</h1>
          <p className="text-muted text-sm mt-1">Gestion des utilisateurs et du système</p>
        </div>
        {activeTab === 'users' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-lantean-blue/20 border border-lantean-blue/30 text-lantean-blue rounded-lg hover:bg-lantean-blue/30 transition-colors text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Nouvel utilisateur
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-background border border-border rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-surface text-lantean-blue shadow-sm'
                : 'text-muted hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== USERS TAB ===== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card-hover">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Total utilisateurs</span>
                <Users className="w-4 h-4 text-lantean-blue" />
              </div>
              <p className="text-2xl font-bold mt-2">{users.length}</p>
            </div>
            <div className="card-hover">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Actifs</span>
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-2xl font-bold mt-2 text-green-400">
                {users.filter((u) => u.status === 'active').length}
              </p>
            </div>
            <div className="card-hover">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Invitations en attente</span>
                <Mail className="w-4 h-4 text-yellow-400" />
              </div>
              <p className="text-2xl font-bold mt-2 text-yellow-400">
                {users.filter((u) => u.status === 'invited').length}
              </p>
            </div>
          </div>

          {/* Users table */}
          <div className="card-hover overflow-hidden !p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-sm">Liste des utilisateurs</h3>
              <button
                onClick={fetchUsers}
                className="text-muted hover:text-lantean-blue transition-colors"
                title="Rafraîchir"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-5 h-5 text-muted animate-spin" />
                <span className="text-sm text-muted ml-2">Chargement...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted">
                <Users className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Aucun utilisateur</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-background/50">
                      <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-4 py-3">
                        Nom
                      </th>
                      <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-4 py-3">
                        Email
                      </th>
                      <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-4 py-3">
                        Rôle
                      </th>
                      <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-4 py-3">
                        Statut
                      </th>
                      <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                        Infos
                      </th>
                      <th className="text-right text-xs font-medium text-muted uppercase tracking-wider px-4 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-surface-hover/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-lantean-blue/10 flex items-center justify-center text-lantean-blue text-sm font-semibold">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted">{user.email}</span>
                        </td>
                        <td className="px-4 py-3">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={user.status} />
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="text-xs text-muted space-y-0.5">
                            {user.jobTitle && <p>{user.jobTitle}</p>}
                            {user.company && <p className="text-muted/60">{user.company}</p>}
                            {!user.jobTitle && !user.company && <p className="text-muted/40">-</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {/* Edit user */}
                            <button
                              onClick={() => setEditTarget(user)}
                              className="p-1.5 rounded-md text-lantean-blue hover:bg-lantean-blue/10 transition-colors"
                              title="Modifier"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {/* Send invitation (only for inactive users) */}
                            {user.status === 'inactive' && (
                              <button
                                onClick={() => handleSendInvitation(user)}
                                className="p-1.5 rounded-md text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                                title="Envoyer une invitation"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                            )}

                            {/* Toggle active/inactive */}
                            <button
                              onClick={() => handleToggleStatus(user)}
                              className={`p-1.5 rounded-md transition-colors ${
                                user.status === 'active'
                                  ? 'text-green-400 hover:bg-green-500/10'
                                  : 'text-gray-400 hover:bg-gray-500/10'
                              }`}
                              title={user.status === 'active' ? 'Désactiver' : 'Activer'}
                            >
                              {user.status === 'active' ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                            </button>

                            {/* Delete (not for main admin id=1) */}
                            {user.id !== '1' && (
                              <button
                                onClick={() => setDeleteTarget(user)}
                                className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== INFRASTRUCTURE TAB ===== */}
      {activeTab === 'infrastructure' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* API Services */}
          <div className="card-hover">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-semibold">Services API</h3>
            </div>
            <div className="space-y-3">
              <InfrastructureCard
                name="Google Gemini"
                envVar="GEMINI_API_KEY"
                icon={<div className="w-2 h-2 rounded-full bg-green-400" />}
              />
              <InfrastructureCard
                name="Claude AI"
                envVar="CLAUDE_API_KEY"
                icon={<div className="w-2 h-2 rounded-full bg-green-400" />}
              />
              <InfrastructureCard
                name="Perplexity"
                envVar="PERPLEXITY_API_KEY"
                icon={<div className="w-2 h-2 rounded-full bg-green-400" />}
              />
              <InfrastructureCard
                name="Notion"
                envVar="NOTION_API_KEY"
                icon={<div className="w-2 h-2 rounded-full bg-green-400" />}
              />
            </div>
          </div>

          {/* Authentication */}
          <div className="card-hover">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Key className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="font-semibold">Authentification</h3>
            </div>
            <div className="space-y-3">
              <InfrastructureCard
                name="Google OAuth"
                envVar="GOOGLE_CLIENT_ID"
                icon={<div className="w-2 h-2 rounded-full bg-green-400" />}
              />
              <InfrastructureCard
                name="Google Client (Public)"
                envVar="NEXT_PUBLIC_GOOGLE_CLIENT_ID"
                icon={<div className="w-2 h-2 rounded-full bg-green-400" />}
              />
            </div>
          </div>

          {/* Database */}
          <div className="card-hover">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Database className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-semibold">Bases de données</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Notion CRM</span>
                <span className="text-green-400 text-xs">Connectée</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Notion Projects</span>
                <span className="text-green-400 text-xs">Connectée</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">localStorage</span>
                <span className="text-green-400 text-xs">Actif</span>
              </div>
            </div>
          </div>

          {/* Server info */}
          <div className="card-hover">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Server className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="font-semibold">Serveur</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Framework</span>
                <span className="text-white text-xs">Next.js 14</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Runtime</span>
                <span className="text-white text-xs">Node.js</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Environnement</span>
                <span className="text-yellow-400 text-xs">Development</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SECURITY TAB ===== */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="card-hover">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Lock className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-semibold">Politique de sécurité</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <span className="text-sm">Authentification</span>
                  <p className="text-xs text-muted">Système de connexion par email/mot de passe</p>
                </div>
                <span className="text-xs text-green-400 font-medium">Actif</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <span className="text-sm">Google OAuth 2.0</span>
                  <p className="text-xs text-muted">Connexion sécurisée avec Google</p>
                </div>
                <span className="text-xs text-green-400 font-medium">Configuré</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <span className="text-sm">Gestion des rôles</span>
                  <p className="text-xs text-muted">Admin, Manager, Utilisateur</p>
                </div>
                <span className="text-xs text-green-400 font-medium">3 rôles</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <span className="text-sm">Tokens de session</span>
                  <p className="text-xs text-muted">Base64 encodé (demo) - JWT recommandé en production</p>
                </div>
                <span className="text-xs text-yellow-400 font-medium">Demo</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm">Clés API</span>
                  <p className="text-xs text-muted">Stockées côté serveur via variables d&apos;environnement</p>
                </div>
                <span className="text-xs text-green-400 font-medium">Sécurisé</span>
              </div>
            </div>
          </div>

          <div className="card-hover">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertCircle className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="font-semibold">Recommandations</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted">
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">-</span>
                <span>Implémenter l&apos;authentification JWT pour la production</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">-</span>
                <span>Ajouter la vérification 2FA pour les comptes admin</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">-</span>
                <span>Remplacer le stockage localStorage par une base de données sécurisée</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">-</span>
                <span>Hasher les mots de passe avec bcrypt avant stockage</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">-</span>
                <span>Ajouter un audit log pour tracer les actions administratives</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* ===== MODALS ===== */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateUser}
        />
      )}

      {editTarget && (
        <EditUserModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEditUser}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          userName={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteUser}
        />
      )}

      {/* ===== TOASTS ===== */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 space-y-2 max-w-sm">
          {toasts.map((toast) => (
            <ToastNotification key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </div>
      )}
    </div>
  )
}
