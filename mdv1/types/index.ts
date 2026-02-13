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
  | 'clients'
  | 'projects'
  | 'invoices'
  | 'settings'
  | 'images'
  | 'videos'
  | 'social_factory'
  | 'library'
  | 'scripts'
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
  claudeApiKey?: string
  perplexityApiKey?: string
  notionApiKey?: string
  notionCrmDbId?: string
  notionProjectsDbId?: string
  googleClientId?: string
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

// ===== Moodboard / Scripts =====
export interface MoodboardItem {
  id: string
  title: string
  type: 'image' | 'text' | 'color' | 'link'
  content: string
  position: { x: number; y: number }
  size: { width: number; height: number }
}
