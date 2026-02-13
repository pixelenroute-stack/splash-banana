'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, MessageSquare, Newspaper, Target,
  Calendar, Mail, HardDrive,
  Users, FolderKanban, Receipt,
  Image, Video, Youtube, Share2, Library, GraduationCap,
  Settings, Shield, LogOut, ChevronLeft
} from 'lucide-react'
import { NAV_ITEMS, CATEGORY_LABELS } from '@/lib/navigation'
import { logout } from '@/lib/auth'
import { cn } from '@/lib/utils'
import type { NavItem, User } from '@/types'
import { useState } from 'react'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, MessageSquare, Newspaper, Target,
  Calendar, Mail, HardDrive,
  Users, FolderKanban, Receipt,
  Image, Video, Youtube, Share2, Library, GraduationCap,
  Settings, Shield,
}

interface SidebarProps {
  user: User | null
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const filteredItems = NAV_ITEMS.filter((item) => {
    if (item.roles && user && !item.roles.includes(user.role)) return false
    return true
  })

  const groupedItems = filteredItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <aside className={cn(
      'h-screen bg-surface border-r border-border flex flex-col transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        {!collapsed && (
          <h2 className="font-orbitron text-lantean-blue text-sm uppercase tracking-wider">
            Splash Banana
          </h2>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-surface-hover text-muted hover:text-white transition-colors"
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {(['general', 'management', 'creator', 'admin'] as const).map((category) => {
          const items = groupedItems[category]
          if (!items?.length) return null

          return (
            <div key={category}>
              {!collapsed && (
                <p className="px-3 mb-2 text-xs uppercase tracking-wider text-muted/60">
                  {CATEGORY_LABELS[category]}
                </p>
              )}
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = ICON_MAP[item.icon]
                  const href = `/${item.id === 'dashboard' ? 'dashboard' : item.id}`
                  const isActive = pathname === href

                  return (
                    <Link
                      key={item.id}
                      href={href}
                      className={cn('sidebar-item', isActive && 'active')}
                      title={collapsed ? item.label : undefined}
                    >
                      {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
                      {!collapsed && <span className="text-sm">{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-border">
        {!collapsed && user && (
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-lantean-blue text-sm font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted truncate">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          title={collapsed ? 'Déconnexion' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Déconnexion</span>}
        </button>
      </div>
    </aside>
  )
}
