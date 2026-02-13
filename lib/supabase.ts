import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'

// Whether Supabase is actually configured
export const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Server-side client with service role (bypasses RLS)
// Created with placeholder values if not configured - calls will fail gracefully
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Client-side client (uses anon key, respects RLS)
export function createBrowserClient() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  return createClient(supabaseUrl, anonKey)
}
