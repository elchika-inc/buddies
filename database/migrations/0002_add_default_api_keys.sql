-- Add default API keys for development and production
-- These should be replaced with secure keys in production

-- Development API key
INSERT INTO api_keys (
  id,
  key,
  name,
  type,
  permissions,
  rateLimit,
  expiresAt,
  isActive
) VALUES (
  'dev-api-key-001',
  'dev_sk_b80f83e113c5463a811607a30afd133dbb0b3c39a0eb41ebac716e29eeda27fb',
  'Development API Key',
  'public',
  '["*"]', -- Full permissions for development
  1000, -- Higher rate limit for development
  NULL, -- No expiration for development
  1
) ON CONFLICT(id) DO NOTHING;

-- Production Public API key
INSERT INTO api_keys (
  id,
  key,
  name,
  type,
  permissions,
  rateLimit,
  expiresAt,
  isActive
) VALUES (
  'prod-public-key-001',
  'pk_b80f83e113c5463a811607a30afd133dbb0b3c39a0eb41ebac716e29eeda27fb',
  'Production Public API Key',
  'public',
  '["pets:read", "images:read", "stats:read"]', -- Read-only permissions
  100, -- Standard rate limit
  NULL, -- No expiration
  1
) ON CONFLICT(id) DO NOTHING;

-- Internal Crawler API key
INSERT INTO api_keys (
  id,
  key,
  name,
  type,
  permissions,
  rateLimit,
  expiresAt,
  isActive
) VALUES (
  'crawler-key-001',
  'crawler_sk_secret_key_2024_secure_token',
  'Crawler Service Key',
  'internal',
  '["pets:write", "pets:read", "images:write", "crawler:write"]', -- Crawler specific permissions
  500, -- Higher rate limit for crawler
  NULL,
  1
) ON CONFLICT(id) DO NOTHING;

-- Admin API key
INSERT INTO api_keys (
  id,
  key,
  name,
  type,
  permissions,
  rateLimit,
  expiresAt,
  isActive
) VALUES (
  'admin-key-001',
  'admin_sk_super_secure_admin_key_2024',
  'Admin API Key',
  'admin',
  '["*"]', -- Full admin permissions
  1000, -- High rate limit for admin
  NULL,
  1
) ON CONFLICT(id) DO NOTHING;