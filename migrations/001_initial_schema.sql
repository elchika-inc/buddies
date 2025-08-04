-- PawMatch D1 Database Schema
-- 初期スキーマ作成

-- ユーザーテーブル
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 動物テーブル（犬と猫の統合テーブル）
CREATE TABLE animals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat')),
  breed TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('男の子', '女の子')),
  size TEXT NOT NULL,
  color TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  personality TEXT, -- JSON配列として保存
  medical_info TEXT,
  care_requirements TEXT, -- JSON配列として保存
  image_url TEXT NOT NULL,
  shelter_name TEXT NOT NULL,
  shelter_contact TEXT NOT NULL,
  adoption_fee INTEGER NOT NULL,
  is_neutered BOOLEAN DEFAULT FALSE,
  is_vaccinated BOOLEAN DEFAULT FALSE,
  good_with_kids BOOLEAN DEFAULT FALSE,
  good_with_other_animals BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 犬固有の情報
CREATE TABLE dog_details (
  animal_id TEXT PRIMARY KEY,
  exercise_level TEXT NOT NULL CHECK (exercise_level IN ('低', '中', '高')),
  training_level TEXT NOT NULL,
  walk_frequency TEXT NOT NULL,
  needs_yard BOOLEAN DEFAULT FALSE,
  apartment_friendly BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE
);

-- 猫固有の情報
CREATE TABLE cat_details (
  animal_id TEXT PRIMARY KEY,
  coat_length TEXT CHECK (coat_length IN ('短毛', '長毛')),
  indoor_outdoor TEXT CHECK (indoor_outdoor IN ('完全室内', '室内外自由', '室内外どちらでも')),
  social_level TEXT CHECK (social_level IN ('人懐っこい', 'シャイ', '警戒心強い')),
  multi_cat_compatible BOOLEAN DEFAULT FALSE,
  vocalization TEXT CHECK (vocalization IN ('静か', '普通', 'よく鳴く')),
  activity_time TEXT CHECK (activity_time IN ('昼型', '夜型', 'どちらでも')),
  FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE
);

-- スワイプアクション記録
CREATE TABLE swipe_actions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  animal_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('like', 'pass', 'superlike')),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE,
  UNIQUE(user_id, animal_id) -- 同じユーザーが同じ動物に複数回アクションしないように
);

-- マッチング記録（将来的に相互いいねなどの機能用）
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  animal_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX idx_animals_species ON animals(species);
CREATE INDEX idx_animals_location ON animals(location);
CREATE INDEX idx_swipe_actions_user ON swipe_actions(user_id);
CREATE INDEX idx_swipe_actions_animal ON swipe_actions(animal_id);
CREATE INDEX idx_swipe_actions_timestamp ON swipe_actions(timestamp);