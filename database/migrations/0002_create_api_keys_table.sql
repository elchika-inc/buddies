-- APIキー管理テーブルの作成
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('public', 'internal', 'admin')),
  permissions TEXT NOT NULL, -- JSON配列形式
  rate_limit INTEGER NOT NULL DEFAULT 100,
  expires_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
  last_used_at DATETIME,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  metadata TEXT -- JSON形式の追加メタデータ
);

-- インデックスの作成
CREATE INDEX idx_api_keys_key ON api_keys(key);
CREATE INDEX idx_api_keys_type ON api_keys(type);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);