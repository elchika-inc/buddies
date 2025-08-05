-- PawMatch アプリケーション用の動物データベーススキーマ
-- Cloudflare D1用

-- 動物データテーブル
CREATE TABLE IF NOT EXISTS animals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat')),
  breed TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  size TEXT NOT NULL CHECK (size IN ('small', 'medium', 'large')),
  description TEXT,
  adoption_fee INTEGER DEFAULT 0,
  prefecture TEXT,
  city TEXT,
  shelter_name TEXT,
  shelter_contact TEXT,
  source_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  featured BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  adoption_status TEXT DEFAULT 'available' CHECK (adoption_status IN ('available', 'pending', 'adopted')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_crawled_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 動物の画像テーブル
CREATE TABLE IF NOT EXISTS animal_images (
  id TEXT PRIMARY KEY,
  animal_id TEXT NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE
);

-- 動物の性格・特徴テーブル
CREATE TABLE IF NOT EXISTS animal_personalities (
  id TEXT PRIMARY KEY,
  animal_id TEXT NOT NULL,
  trait TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE
);

-- 犬専用データテーブル
CREATE TABLE IF NOT EXISTS dog_info (
  animal_id TEXT PRIMARY KEY,
  is_mixed BOOLEAN DEFAULT FALSE,
  exercise_needs TEXT CHECK (exercise_needs IN ('low', 'moderate', 'high')),
  walk_frequency INTEGER, -- 1日あたりの散歩回数
  walk_duration INTEGER, -- 1回あたりの散歩時間（分）
  playfulness INTEGER CHECK (playfulness BETWEEN 1 AND 5),
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  training_level TEXT CHECK (training_level IN ('none', 'basic', 'intermediate', 'advanced')),
  housebroken BOOLEAN DEFAULT FALSE,
  leash_trained BOOLEAN DEFAULT FALSE,
  good_with_children BOOLEAN DEFAULT FALSE,
  good_with_dogs BOOLEAN DEFAULT FALSE,
  good_with_cats BOOLEAN DEFAULT FALSE,
  good_with_strangers BOOLEAN DEFAULT FALSE,
  apartment_suitable BOOLEAN DEFAULT FALSE,
  yard_required BOOLEAN DEFAULT FALSE,
  guard_dog BOOLEAN DEFAULT FALSE,
  hunting_instinct BOOLEAN DEFAULT FALSE,
  swimming_ability BOOLEAN DEFAULT FALSE,
  noise_level TEXT CHECK (noise_level IN ('quiet', 'moderate', 'loud')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE
);

-- 猫専用データテーブル
CREATE TABLE IF NOT EXISTS cat_info (
  animal_id TEXT PRIMARY KEY,
  is_mixed BOOLEAN DEFAULT FALSE,
  coat_length TEXT CHECK (coat_length IN ('short', 'medium', 'long')),
  eye_color TEXT,
  activity_level INTEGER CHECK (activity_level BETWEEN 1 AND 5),
  affection_level INTEGER CHECK (affection_level BETWEEN 1 AND 5),
  social_level TEXT CHECK (social_level IN ('shy', 'moderate', 'friendly')),
  playfulness INTEGER CHECK (playfulness BETWEEN 1 AND 5),
  indoor_outdoor TEXT CHECK (indoor_outdoor IN ('indoor_only', 'outdoor_access', 'both')),
  apartment_suitable BOOLEAN DEFAULT TRUE,
  good_with_children BOOLEAN DEFAULT FALSE,
  good_with_cats BOOLEAN DEFAULT FALSE,
  good_with_dogs BOOLEAN DEFAULT FALSE,
  good_with_strangers BOOLEAN DEFAULT FALSE,
  litter_box_trained BOOLEAN DEFAULT TRUE,
  scratching_post_use BOOLEAN DEFAULT TRUE,
  vocalization TEXT CHECK (vocalization IN ('quiet', 'moderate', 'vocal')),
  night_activity BOOLEAN DEFAULT FALSE,
  grooming_needs TEXT CHECK (grooming_needs IN ('low', 'moderate', 'high')),
  declawed BOOLEAN DEFAULT FALSE,
  multi_cat_compatible BOOLEAN DEFAULT FALSE,
  preferred_companion_type TEXT CHECK (preferred_companion_type IN ('alone', 'with_cats', 'with_dogs', 'any')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE
);

-- クローラー実行ログテーブル
CREATE TABLE IF NOT EXISTS crawler_logs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  species TEXT CHECK (species IN ('dog', 'cat', 'all')),
  success BOOLEAN NOT NULL,
  animals_count INTEGER DEFAULT 0,
  error_message TEXT,
  started_at DATETIME NOT NULL,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration_seconds INTEGER
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_animals_species ON animals(species);
CREATE INDEX IF NOT EXISTS idx_animals_adoption_status ON animals(adoption_status);
CREATE INDEX IF NOT EXISTS idx_animals_created_at ON animals(created_at);
CREATE INDEX IF NOT EXISTS idx_animals_prefecture ON animals(prefecture);
CREATE INDEX IF NOT EXISTS idx_animals_featured ON animals(featured);
CREATE INDEX IF NOT EXISTS idx_animals_is_active ON animals(is_active);

CREATE INDEX IF NOT EXISTS idx_animal_images_animal_id ON animal_images(animal_id);
CREATE INDEX IF NOT EXISTS idx_animal_images_primary ON animal_images(is_primary);

CREATE INDEX IF NOT EXISTS idx_animal_personalities_animal_id ON animal_personalities(animal_id);

CREATE INDEX IF NOT EXISTS idx_crawler_logs_source ON crawler_logs(source);
CREATE INDEX IF NOT EXISTS idx_crawler_logs_completed_at ON crawler_logs(completed_at);