import { supabaseAdmin, isSupabaseConfigured } from './supabase'

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.invited'
  | 'user.2fa_enabled'
  | 'user.2fa_disabled'
  | 'settings.updated'
  | 'api_key.tested'

export async function logAudit(
  action: AuditAction,
  userId: string | null,
  details?: Record<string, unknown>,
  ipAddress?: string
) {
  if (!isSupabaseConfigured) return
  try {
    await supabaseAdmin.from('audit_log').insert({
      action,
      user_id: userId,
      details: details || {},
      ip_address: ipAddress || null,
    })
  } catch (err) {
    // Don't let audit logging errors break the app
    console.error('Audit log error:', err)
  }
}
