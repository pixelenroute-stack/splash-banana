-- Splash Banana Database Schema
-- Run via Supabase SQL Editor or Management API

-- ===== USERS TABLE =====
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'invited')),
  phone TEXT,
  company TEXT,
  job_title TEXT,
  avatar TEXT,
  notes TEXT,
  totp_secret TEXT,
  totp_enabled BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== APP SETTINGS (key-value store) =====
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== AUDIT LOG =====
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- ===== SEED DEFAULT ADMIN =====
-- Password: admin123 (bcrypt hash)
INSERT INTO users (email, name, password_hash, role, status)
VALUES (
  'admin@splashbanana.com',
  'Admin SB',
  '$2b$10$dfspnoRZorzB9hP5kdZiCe2GIti5p0lpaKJl/p50j91qIm3Xk2iWC',
  'admin',
  'active'
) ON CONFLICT (email) DO NOTHING;
