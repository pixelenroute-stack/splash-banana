import type { NavItem } from '@/types'

export const NAV_ITEMS: NavItem[] = [
  // General
  { id: 'dashboard', label: 'Tableau de bord', icon: 'LayoutDashboard', category: 'general' },
  { id: 'chat', label: 'Chat IA', icon: 'MessageSquare', category: 'general' },
  { id: 'news', label: 'Actualités', icon: 'Newspaper', category: 'general' },
  { id: 'prospection', label: 'Prospection', icon: 'Target', category: 'general' },

  // Management (includes Google Workspace)
  { id: 'clients', label: 'Clients CRM', icon: 'Users', category: 'management' },
  { id: 'projects', label: 'Projets', icon: 'FolderKanban', category: 'management' },
  { id: 'invoices', label: 'Facturation', icon: 'Receipt', category: 'management' },
  { id: 'calendar', label: 'Calendrier', icon: 'Calendar', category: 'management' },
  { id: 'gmail', label: 'Emails', icon: 'Mail', category: 'management' },
  { id: 'drive', label: 'Google Drive', icon: 'HardDrive', category: 'management' },

  // Creator Studio
  { id: 'images', label: 'Image Studio', icon: 'Image', category: 'creator' },
  { id: 'videos', label: 'Video Studio', icon: 'Video', category: 'creator' },
  { id: 'thumbnails', label: 'Vignettes YouTube', icon: 'Youtube', category: 'creator' },
  { id: 'tutorials', label: 'Tutoriels', icon: 'GraduationCap', category: 'creator' },
  { id: 'social_factory', label: 'Social Factory', icon: 'Share2', category: 'creator' },
  { id: 'library', label: 'Médiathèque', icon: 'Library', category: 'creator' },

  // Admin
  { id: 'settings', label: 'Paramètres', icon: 'Settings', category: 'admin' },
  { id: 'admin', label: 'Console Admin', icon: 'Shield', category: 'admin', roles: ['admin'] },
]

export const CATEGORY_LABELS: Record<NavItem['category'], string> = {
  general: 'Général',
  management: 'Gestion',
  creator: 'Creator Studio',
  admin: 'Administration',
}
