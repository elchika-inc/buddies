-- sync_metadataテーブルの作成
CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初期データの挿入
INSERT OR IGNORE INTO sync_metadata (key, value) VALUES
  ('total_pets', '0'),
  ('total_dogs', '0'),
  ('total_cats', '0'),
  ('pets_with_jpeg', '0'),
  ('pets_with_webp', '0'),
  ('data_ready', 'false'),
  ('min_required_dogs', '30'),
  ('min_required_cats', '30'),
  ('min_image_coverage', '0.8'),
  ('last_sync_at', NULL);