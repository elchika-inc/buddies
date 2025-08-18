-- PawMatch D1 Database Schema

CREATE TABLE IF NOT EXISTS pets (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('dog', 'cat')),
  name TEXT NOT NULL,
  breed TEXT,
  age INTEGER,
  gender TEXT,
  prefecture TEXT,
  city TEXT,
  location TEXT,
  description TEXT,
  personality TEXT, -- JSON array as string
  medical_info TEXT,
  care_requirements TEXT, -- JSON array as string
  image_url TEXT,
  shelter_name TEXT,
  shelter_contact TEXT,
  source_url TEXT,
  metadata TEXT, -- Full JSON data as string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_pets_type ON pets(type);
CREATE INDEX IF NOT EXISTS idx_pets_created_at ON pets(created_at);
CREATE INDEX IF NOT EXISTS idx_pets_prefecture ON pets(prefecture);
CREATE INDEX IF NOT EXISTS idx_pets_type_created ON pets(type, created_at);

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