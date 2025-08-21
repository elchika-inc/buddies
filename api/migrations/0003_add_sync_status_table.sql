-- ==========================================
-- データ同期ステータス管理テーブル
-- ==========================================

-- データ同期ジョブの履歴と状態を管理
CREATE TABLE IF NOT EXISTS sync_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_type TEXT NOT NULL, -- 'initial_load', 'incremental', 'full_sync', 'screenshot'
  source TEXT NOT NULL, -- 'pet-home', 'github-actions', 'manual'
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  pet_type TEXT, -- 'dog', 'cat', or NULL for both
  
  -- 統計情報
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  new_records INTEGER DEFAULT 0,
  updated_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  
  -- 画像統計
  images_total INTEGER DEFAULT 0,
  images_with_jpeg INTEGER DEFAULT 0,
  images_with_webp INTEGER DEFAULT 0,
  images_missing INTEGER DEFAULT 0,
  
  -- 実行詳細
  started_at DATETIME,
  completed_at DATETIME,
  duration_ms INTEGER, -- 実行時間（ミリ秒）
  error_message TEXT,
  metadata TEXT, -- JSON形式の追加情報
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_type ON sync_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_created ON sync_jobs(created_at DESC);

-- データ準備状態を追跡するサマリーテーブル
CREATE TABLE IF NOT EXISTS data_readiness (
  id TEXT PRIMARY KEY, -- 'current' for latest status
  
  -- データ統計
  total_pets INTEGER DEFAULT 0,
  total_dogs INTEGER DEFAULT 0,
  total_cats INTEGER DEFAULT 0,
  
  -- 画像統計
  pets_with_images INTEGER DEFAULT 0,
  pets_with_jpeg INTEGER DEFAULT 0,
  pets_with_webp INTEGER DEFAULT 0,
  pets_missing_images INTEGER DEFAULT 0,
  
  -- 同期状態
  last_sync_job_id INTEGER,
  last_sync_status TEXT,
  last_sync_at DATETIME,
  last_successful_sync_at DATETIME,
  
  -- データ品質
  data_completeness_score REAL, -- 0.0-1.0のスコア
  image_coverage_score REAL, -- 0.0-1.0のスコア
  
  -- フラグ
  is_ready BOOLEAN DEFAULT FALSE, -- データが利用可能かどうか
  minimum_data_threshold INTEGER DEFAULT 30, -- 最低必要データ数
  
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (last_sync_job_id) REFERENCES sync_jobs(id)
);

-- 個別ペットの同期状態を追跡
CREATE TABLE IF NOT EXISTS pet_sync_status (
  pet_id TEXT PRIMARY KEY,
  
  -- データ状態
  has_data BOOLEAN DEFAULT FALSE,
  has_jpeg BOOLEAN DEFAULT FALSE,
  has_webp BOOLEAN DEFAULT FALSE,
  
  -- 同期情報
  last_sync_job_id INTEGER,
  last_sync_at DATETIME,
  sync_errors TEXT, -- JSON配列
  
  -- スクリーンショット要求
  screenshot_requested BOOLEAN DEFAULT FALSE,
  screenshot_request_at DATETIME,
  screenshot_completed_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (pet_id) REFERENCES pets(id),
  FOREIGN KEY (last_sync_job_id) REFERENCES sync_jobs(id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_pet_sync_status_missing ON pet_sync_status(has_jpeg) 
  WHERE has_jpeg = FALSE;
CREATE INDEX IF NOT EXISTS idx_pet_sync_screenshot ON pet_sync_status(screenshot_requested) 
  WHERE screenshot_requested = TRUE AND screenshot_completed_at IS NULL;

-- 初期データ挿入
INSERT OR IGNORE INTO data_readiness (id, is_ready) VALUES ('current', FALSE);