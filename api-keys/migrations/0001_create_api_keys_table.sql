-- APIキー管理テーブル
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('public', 'internal', 'admin')),
  permissions TEXT NOT NULL, -- JSON array
  rate_limit INTEGER DEFAULT 100,
  expires_at TEXT, -- ISO 8601 format
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_used_at TEXT,
  is_active INTEGER DEFAULT 1,
  metadata TEXT -- JSON object
);

-- インデックス
CREATE INDEX idx_api_keys_key ON api_keys(key);
CREATE INDEX idx_api_keys_type ON api_keys(type);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);

-- 使用ログテーブル（オプション）
CREATE TABLE IF NOT EXISTS api_key_usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_id TEXT NOT NULL,
  endpoint TEXT,
  method TEXT,
  ip_address TEXT,
  user_agent TEXT,
  response_status INTEGER,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (key_id) REFERENCES api_keys(id)
);

CREATE INDEX idx_usage_logs_key_id ON api_key_usage_logs(key_id);
CREATE INDEX idx_usage_logs_timestamp ON api_key_usage_logs(timestamp);