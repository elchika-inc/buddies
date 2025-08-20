-- ==========================================
-- PawMatch Crawler 開発環境用スキーマ
-- ==========================================
-- このファイルは開発環境専用です
-- 本番環境では api/migrations/ を使用してください

-- ペット情報テーブル（APIスキーマと同じ）
CREATE TABLE IF NOT EXISTS pets (
  id TEXT PRIMARY KEY, -- Format: sourceId_petId
  type TEXT NOT NULL CHECK (type IN ('dog', 'cat')),
  name TEXT NOT NULL,
  breed TEXT,
  age INTEGER,
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
  metadata TEXT, -- JSON object for additional fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_pets_type ON pets(type);
CREATE INDEX IF NOT EXISTS idx_pets_prefecture ON pets(prefecture);
CREATE INDEX IF NOT EXISTS idx_pets_created_at ON pets(created_at DESC);

-- クロール実行ログテーブル
CREATE TABLE IF NOT EXISTS crawl_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_type TEXT NOT NULL,
  total_pets INTEGER DEFAULT 0,
  new_pets INTEGER DEFAULT 0,
  updated_pets INTEGER DEFAULT 0,
  errors TEXT, -- JSON array as string
  success BOOLEAN DEFAULT FALSE,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_crawl_logs_started_at ON crawl_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_crawl_logs_pet_type ON crawl_logs(pet_type);

-- クローラー状態テーブル（サイト別・ペットタイプ別の差分検知用）
CREATE TABLE IF NOT EXISTS crawler_states (
  source_id TEXT NOT NULL, -- クローラーソース識別子 (pet-home, anifare, hugooo)
  pet_type TEXT NOT NULL CHECK (pet_type IN ('dog', 'cat')),
  checkpoint TEXT, -- JSON形式のチェックポイント情報
  total_processed INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (source_id, pet_type)
);

CREATE INDEX IF NOT EXISTS idx_crawler_states_updated ON crawler_states(updated_at);