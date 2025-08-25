-- ==========================================
-- petsテーブルに同期状態カラムを追加
-- ==========================================

-- 画像の存在状態を追跡するカラムを追加
ALTER TABLE pets ADD COLUMN has_jpeg BOOLEAN DEFAULT FALSE;
ALTER TABLE pets ADD COLUMN has_webp BOOLEAN DEFAULT FALSE;
ALTER TABLE pets ADD COLUMN image_checked_at DATETIME;
ALTER TABLE pets ADD COLUMN screenshot_requested_at DATETIME;
ALTER TABLE pets ADD COLUMN screenshot_completed_at DATETIME;

-- インデックス追加（画像が不足しているペットを素早く検索）
CREATE INDEX IF NOT EXISTS idx_pets_missing_images ON pets(has_jpeg) 
  WHERE has_jpeg = FALSE;

CREATE INDEX IF NOT EXISTS idx_pets_screenshot_pending ON pets(screenshot_requested_at) 
  WHERE screenshot_requested_at IS NOT NULL AND screenshot_completed_at IS NULL;

-- 同期メタデータテーブル（全体の状態管理用）
CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 初期値を設定
INSERT OR IGNORE INTO sync_metadata (key, value) VALUES 
  ('total_pets', '0'),
  ('total_dogs', '0'), 
  ('total_cats', '0'),
  ('pets_with_jpeg', '0'),
  ('pets_with_webp', '0'),
  ('last_sync_at', NULL),
  ('data_ready', 'false'),
  ('min_required_dogs', '30'),
  ('min_required_cats', '30'),
  ('min_image_coverage', '0.8');