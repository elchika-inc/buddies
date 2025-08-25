-- 本番D1データベース初期化スクリプト
-- 警告: このスクリプトは既存データを削除します

-- 既存テーブルを削除（開発中のため）
DROP TABLE IF EXISTS pet_sync_status;
DROP TABLE IF EXISTS data_readiness;
DROP TABLE IF EXISTS sync_jobs;
DROP TABLE IF EXISTS sync_metadata;
DROP TABLE IF EXISTS sync_status;
DROP TABLE IF EXISTS crawler_states;
DROP TABLE IF EXISTS pets;

-- ペットテーブル
CREATE TABLE pets (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('dog', 'cat')),
  name TEXT NOT NULL,
  breed TEXT,
  age TEXT,
  gender TEXT,
  prefecture TEXT,
  city TEXT,
  location TEXT,
  description TEXT,
  personality TEXT, -- JSON array
  medical_info TEXT,
  care_requirements TEXT, -- JSON array
  image_url TEXT,
  shelter_name TEXT,
  shelter_contact TEXT,
  source_url TEXT,
  adoption_fee INTEGER DEFAULT 0,
  metadata TEXT, -- JSON object
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- 画像関連
  has_jpeg INTEGER DEFAULT 0,
  has_webp INTEGER DEFAULT 0,
  image_checked_at TIMESTAMP,
  screenshot_requested_at TIMESTAMP,
  screenshot_completed_at TIMESTAMP,
  source_id TEXT DEFAULT 'pet-home'
);

-- インデックス
CREATE INDEX idx_pets_type ON pets(type);
CREATE INDEX idx_pets_prefecture ON pets(prefecture);
CREATE INDEX idx_pets_created_at ON pets(created_at DESC);
CREATE INDEX idx_pets_has_jpeg ON pets(has_jpeg);
CREATE INDEX idx_pets_has_webp ON pets(has_webp);
CREATE INDEX idx_pets_type_created ON pets(type, created_at DESC);

-- クローラー状態テーブル
CREATE TABLE crawler_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  pet_type TEXT NOT NULL,
  checkpoint TEXT, -- JSON
  total_processed INTEGER DEFAULT 0,
  last_crawl_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE UNIQUE INDEX idx_crawler_states_source_type ON crawler_states(source_id, pet_type);

-- 同期ステータステーブル
CREATE TABLE sync_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  metadata TEXT, -- JSON
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_sync_status_type ON sync_status(sync_type);
CREATE INDEX idx_sync_status_status ON sync_status(status);
CREATE INDEX idx_sync_status_created ON sync_status(created_at DESC);

-- 同期メタデータテーブル
CREATE TABLE sync_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  value_type TEXT DEFAULT 'string',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_sync_metadata_key ON sync_metadata(key);