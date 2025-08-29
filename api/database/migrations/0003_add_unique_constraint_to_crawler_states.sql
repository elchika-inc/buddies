-- crawler_statesテーブルに(source_id, pet_type)のユニーク制約を追加

-- 既存のテーブルをリネーム
ALTER TABLE crawler_states RENAME TO crawler_states_old;

-- 新しいテーブルを作成（ユニーク制約付き）
CREATE TABLE crawler_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  pet_type TEXT NOT NULL,
  checkpoint TEXT,
  total_processed INTEGER DEFAULT 0,
  last_crawl_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_id, pet_type)
);

-- データを移行
INSERT INTO crawler_states (id, source_id, pet_type, checkpoint, total_processed, last_crawl_at, created_at, updated_at)
SELECT id, source_id, pet_type, checkpoint, total_processed, last_crawl_at, created_at, updated_at
FROM crawler_states_old;

-- 古いテーブルを削除
DROP TABLE crawler_states_old;