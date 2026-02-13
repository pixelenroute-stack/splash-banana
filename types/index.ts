// ===== Authentication =====
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: 'admin' | 'manager' | 'user'
  createdAt: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

// ===== Navigation =====
export type ViewId =
  | 'dashboard'
  | 'chat'
  | 'news'
  | 'prospection'
  | 'calendar'
  | 'gmail'
  | 'drive'
  | 'clients'
  | 'projects'
  | 'invoices'
  | 'settings'
  | 'images'
  | 'videos'
  | 'thumbnails'
  | 'social_factory'
  | 'library'
  | 'tutorials'
  | 'admin'

export interface NavItem {
  id: ViewId
  label: string
  icon: string
  category: 'general' | 'creator' | 'management' | 'admin'
  roles?: User['role'][]
}

// ===== CRM (Notion) =====
export interface Client {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  status: 'lead' | 'prospect' | 'active' | 'inactive'
  source?: string
  notes?: string
  createdAt: string
  updatedAt: string
  notionPageId?: string
}

export interface Project {
  id: string
  name: string
  clientId: string
  clientName?: string
  status: 'draft' | 'in_progress' | 'review' | 'completed' | 'archived'
  budget?: number
  startDate?: string
  endDate?: string
  description?: string
  notionPageId?: string
}

// ===== Billing =====
export interface Invoice {
  id: string
  number: string
  clientId: string
  clientName?: string
  amount: number
  tax: number
  total: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  dueDate: string
  createdAt: string
  items: InvoiceItem[]
}

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

// ===== Chat / AI =====
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  model?: string
  toolCalls?: ToolCall[]
}

export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  result?: unknown
}

export interface ChatConversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

// ===== Media =====
export interface MediaAsset {
  id: string
  name: string
  type: 'image' | 'video' | 'audio' | 'document'
  url: string
  thumbnailUrl?: string
  size?: number
  mimeType?: string
  createdAt: string
  tags?: string[]
}

// ===== News / Prospection =====
export interface NewsArticle {
  id: string
  title: string
  summary: string
  url: string
  source: string
  publishedAt: string
  category?: string
  imageUrl?: string
}

export interface Lead {
  id: string
  name: string
  email?: string
  company?: string
  score: number
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
  source: string
  notes?: string
  createdAt: string
}

// ===== Dashboard =====
export interface DashboardStats {
  totalClients: number
  activeProjects: number
  pendingInvoices: number
  totalRevenue: number
  revenueGrowth: number
  newLeads: number
}

// ===== Settings =====
export interface SystemSettings {
  geminiApiKey?: string
  openaiApiKey?: string
  claudeApiKey?: string
  perplexityApiKey?: string
  notionApiKey?: string
  notionCrmDbId?: string
  notionProjectsDbId?: string
  googleClientId?: string
  googleClientSecret?: string
  googleRedirectUri?: string
  qontoLogin?: string
  qontoSecret?: string
  theme: 'dark' | 'light'
  language: 'fr' | 'en'
}

// ===== API Response =====
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ===== Social Factory =====
export interface SocialPost {
  id: string
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok'
  content: string
  mediaUrls?: string[]
  scheduledAt?: string
  publishedAt?: string
  status: 'draft' | 'scheduled' | 'published' | 'failed'
}

// ===== Calendar =====
export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: string
  end: string
  location?: string
  attendees?: string[]
  htmlLink?: string
}

// ===== Gmail =====
export interface Email {
  id: string
  threadId: string
  from: string
  to: string
  subject: string
  snippet: string
  body?: string
  date: string
  isUnread: boolean
  labels: string[]
}

// ===== Google Drive =====
export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime: string
  webViewLink?: string
  iconLink?: string
  parents?: string[]
}

// ===== Tutorials (Creator Studio) =====
export interface Tutorial {
  id: string
  software: 'after-effects' | 'premiere-pro' | 'blender' | 'illustrator' | 'photoshop'
  title: string
  description: string
  steps: TutorialStep[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime?: string
  prerequisites?: string[]
  createdAt: string
}

export interface TutorialStep {
  order: number
  title: string
  description: string
  parameters?: EffectParameter[]
}

export interface EffectParameter {
  name: string
  value: string
  unit?: string
  description?: string
}

// ===== Admin User Management =====
export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'user'
  status: 'active' | 'inactive' | 'invited'
  password?: string
  phone?: string
  company?: string
  jobTitle?: string
  avatar?: string
  notes?: string
  permissions?: string[]
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

// ===== Contract =====
export interface Contract {
  id: string
  clientName: string
  projectName: string
  amount: number
  startDate: string
  endDate: string
  status: 'draft' | 'sent' | 'signed'
  googleDocId?: string
  googleDocUrl?: string
}
