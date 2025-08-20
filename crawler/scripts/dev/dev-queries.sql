-- ==========================================
-- PawMatch Crawler 開発用SQLクエリ集
-- ==========================================
-- 開発時によく使用するクエリをまとめたファイル

-- 基本確認用クエリ
-- ==========================================

-- テーブル一覧確認
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;

-- ペット情報確認
SELECT COUNT(*) as total_pets FROM pets;

-- サイト別ペット数
SELECT 
  CASE 
    WHEN id LIKE 'pet-home_%' THEN 'pet-home'
    WHEN id LIKE 'anifare_%' THEN 'anifare' 
    WHEN id LIKE 'hugooo_%' THEN 'hugooo'
    ELSE 'unknown'
  END as source,
  type,
  COUNT(*) as count
FROM pets 
GROUP BY source, type 
ORDER BY source, type;

-- 最新のペット情報（5件）
SELECT 
  id, 
  type, 
  name, 
  prefecture || city as location,
  created_at
FROM pets 
ORDER BY created_at DESC 
LIMIT 5;

-- クローラー状態確認
SELECT 
  source_id,
  pet_type,
  total_processed,
  updated_at
FROM crawler_states 
ORDER BY updated_at DESC;

-- 開発・デバッグ用クエリ
-- ==========================================

-- 重複ID確認
SELECT id, COUNT(*) as count 
FROM pets 
GROUP BY id 
HAVING COUNT(*) > 1;

-- 空の必須フィールド確認
SELECT 
  id,
  CASE 
    WHEN name IS NULL OR name = '' THEN 'name_empty'
    WHEN type IS NULL THEN 'type_null'
    WHEN source_url IS NULL OR source_url = '' THEN 'source_url_empty'
    ELSE 'ok'
  END as issue
FROM pets 
WHERE issue != 'ok'
LIMIT 10;

-- 特定ソースのペット情報詳細
SELECT 
  id,
  name,
  breed,
  age,
  gender,
  location,
  source_url
FROM pets 
WHERE id LIKE 'pet-home_%'
ORDER BY created_at DESC
LIMIT 10;

-- クロールエラー確認
SELECT 
  pet_type,
  errors,
  started_at
FROM crawl_logs 
WHERE success = FALSE
ORDER BY started_at DESC
LIMIT 5;

-- パフォーマンス確認用
-- ==========================================

-- 日別ペット登録数
SELECT 
  DATE(created_at) as date,
  type,
  COUNT(*) as count
FROM pets 
GROUP BY DATE(created_at), type
ORDER BY date DESC, type;

-- クロール状態のチェックポイント詳細
SELECT 
  source_id,
  pet_type,
  JSON_EXTRACT(checkpoint, '$.lastCrawlAt') as last_crawl,
  JSON_EXTRACT(checkpoint, '$.metadata.processedCount') as last_processed_count,
  total_processed
FROM crawler_states;

-- データクリーンアップ用（注意して使用）
-- ==========================================

-- 特定ソースのデータ削除（開発環境専用）
-- DELETE FROM pets WHERE id LIKE 'test_%';

-- 古いクロールログ削除（30日以上前）
-- DELETE FROM crawl_logs WHERE started_at < datetime('now', '-30 days');

-- クローラー状態リセット（特定ソース）
-- DELETE FROM crawler_states WHERE source_id = 'test-source';

-- サンプルデータ確認用
-- ==========================================

-- ペット情報のサンプル（metadata付き）
SELECT 
  id,
  type,
  name,
  JSON_EXTRACT(metadata, '$.sourceId') as source_id,
  JSON_EXTRACT(metadata, '$.personality') as personality_json,
  created_at
FROM pets 
WHERE JSON_EXTRACT(metadata, '$.sourceId') IS NOT NULL
LIMIT 3;

-- 性格情報の分析
SELECT 
  personality,
  COUNT(*) as count
FROM pets 
WHERE personality IS NOT NULL
GROUP BY personality
ORDER BY count DESC
LIMIT 10;