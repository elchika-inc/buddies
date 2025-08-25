-- crawler_states テーブルの作成
CREATE TABLE IF NOT EXISTS crawler_states (
  source_id TEXT NOT NULL,
  pet_type TEXT NOT NULL,
  checkpoint TEXT,
  total_processed INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (source_id, pet_type)
);