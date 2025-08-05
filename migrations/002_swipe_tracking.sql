-- スワイプトラッキング用テーブル
-- ユーザーのスワイプ履歴を記録

-- ユーザーテーブル（簡易版）
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- スワイプ履歴テーブル
CREATE TABLE IF NOT EXISTS swipe_history (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  session_id TEXT, -- ユーザー登録前でもトラッキング可能
  animal_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('like', 'pass', 'superlike')),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  -- 追加の分析用フィールド
  swipe_duration_ms INTEGER, -- スワイプにかかった時間
  view_duration_ms INTEGER, -- カードを見ていた時間
  is_undo BOOLEAN DEFAULT FALSE, -- アンドゥされたスワイプか
  device_info TEXT, -- デバイス情報（JSON形式）
  FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- マッチングテーブル（将来の機能拡張用）
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  animal_id TEXT NOT NULL,
  matched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_mutual BOOLEAN DEFAULT FALSE, -- 相互いいね（将来の機能）
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'adopted')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE,
  UNIQUE(user_id, animal_id)
);

-- ユーザーの好み分析テーブル（将来の機能拡張用）
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat')),
  preferred_size TEXT CHECK (preferred_size IN ('small', 'medium', 'large')),
  preferred_age_min INTEGER,
  preferred_age_max INTEGER,
  preferred_gender TEXT CHECK (preferred_gender IN ('male', 'female', 'any')),
  location_radius INTEGER DEFAULT 50, -- km
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_swipe_history_user_id ON swipe_history(user_id);
CREATE INDEX IF NOT EXISTS idx_swipe_history_session_id ON swipe_history(session_id);
CREATE INDEX IF NOT EXISTS idx_swipe_history_animal_id ON swipe_history(animal_id);
CREATE INDEX IF NOT EXISTS idx_swipe_history_action ON swipe_history(action);
CREATE INDEX IF NOT EXISTS idx_swipe_history_timestamp ON swipe_history(timestamp);

CREATE INDEX IF NOT EXISTS idx_matches_user_id ON matches(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_animal_id ON matches(animal_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

CREATE INDEX IF NOT EXISTS idx_users_session_id ON users(session_id);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_species ON user_preferences(species);