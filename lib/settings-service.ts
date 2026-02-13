// Server-side settings service
// Reads API keys from: 1) Supabase app_settings 2) env vars (fallback)

import { supabaseAdmin, isSupabaseConfigured } from './supabase'

// Settings keys
const SETTING_KEYS = [
  'gemini_api_key',
  'perplexity_api_key',
  'notion_api_key',
  'notion_crm_db_id',
  'notion_projects_db_id',
  'google_client_id',
  'google_client_secret',
  'google_redirect_uri',
  'qonto_login',
  'qonto_secret',
] as const

type SettingKey = typeof SETTING_KEYS[number]

// Env var mapping for fallback
const ENV_FALLBACKS: Record<SettingKey, string> = {
  gemini_api_key: 'GEMINI_API_KEY',
  perplexity_api_key: 'PERPLEXITY_API_KEY',
  notion_api_key: 'NOTION_API_KEY',
  notion_crm_db_id: 'NOTION_CRM_DATABASE_ID',
  notion_projects_db_id: 'NOTION_PROJECTS_DATABASE_ID',
  google_client_id: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
  google_client_secret: 'GOOGLE_CLIENT_SECRET',
  google_redirect_uri: 'GOOGLE_REDIRECT_URI',
  qonto_login: 'QONTO_LOGIN',
  qonto_secret: 'QONTO_SECRET_KEY',
}

// In-memory cache (refreshes every 5 minutes)
let settingsCache: Record<string, string> = {}
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000

async function refreshCache() {
  if (!isSupabaseConfigured) {
    cacheTimestamp = Date.now()
    return
  }
  try {
    const { data } = await supabaseAdmin
      .from('app_settings')
      .select('key, value')
    if (data) {
      settingsCache = {}
      for (const row of data) {
        settingsCache[row.key] = row.value
      }
      cacheTimestamp = Date.now()
    }
  } catch {
    // Supabase not available, use env vars only
    cacheTimestamp = Date.now()
  }
}

// Get a single setting value
export async function getSetting(key: SettingKey): Promise<string | undefined> {
  // Refresh cache if stale
  if (Date.now() - cacheTimestamp > CACHE_TTL) {
    await refreshCache()
  }

  // 1) Check Supabase cache
  if (settingsCache[key]) return settingsCache[key]

  // 2) Fallback to env var
  const envKey = ENV_FALLBACKS[key]
  if (envKey) return process.env[envKey]

  return undefined
}

// Get all settings
export async function getAllSettings(): Promise<Record<string, string>> {
  if (Date.now() - cacheTimestamp > CACHE_TTL) {
    await refreshCache()
  }

  const result: Record<string, string> = {}
  for (const key of SETTING_KEYS) {
    const value = settingsCache[key] || process.env[ENV_FALLBACKS[key]] || ''
    if (value) result[key] = value
  }
  return result
}

// Save a setting
export async function saveSetting(key: SettingKey, value: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    const { error } = await supabaseAdmin
      .from('app_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() })
    if (error) throw error
    settingsCache[key] = value
    return true
  } catch {
    return false
  }
}

// Save multiple settings at once
export async function saveSettings(settings: Partial<Record<SettingKey, string>>): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    const rows = Object.entries(settings)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([key, value]) => ({
        key,
        value: value!,
        updated_at: new Date().toISOString(),
      }))
    if (rows.length === 0) return true
    const { error } = await supabaseAdmin
      .from('app_settings')
      .upsert(rows)
    if (error) throw error
    for (const row of rows) {
      settingsCache[row.key] = row.value
    }
    return true
  } catch {
    return false
  }
}

// Get masked settings for the frontend (hide full API keys)
export async function getMaskedSettings(): Promise<Record<string, { configured: boolean; preview: string }>> {
  const all = await getAllSettings()
  const result: Record<string, { configured: boolean; preview: string }> = {}
  for (const key of SETTING_KEYS) {
    const value = all[key]
    if (value) {
      result[key] = {
        configured: true,
        preview: value.slice(0, 8) + '...' + value.slice(-4),
      }
    } else {
      result[key] = { configured: false, preview: '' }
    }
  }
  return result
}
