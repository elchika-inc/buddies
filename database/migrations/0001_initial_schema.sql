-- Initial schema for PawMatch API
-- Generated from database/schema/schema.ts

-- Drop existing tables if they exist
DROP TABLE IF EXISTS sync_metadata;
DROP TABLE IF EXISTS sync_status;
DROP TABLE IF EXISTS crawler_states;
DROP TABLE IF EXISTS pets;

-- Create pets table
CREATE TABLE IF NOT EXISTS pets (
  -- Core fields
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('dog', 'cat')),
  name TEXT NOT NULL,
  breed TEXT,
  age TEXT,
  gender TEXT,
  
  -- Location fields
  prefecture TEXT,
  city TEXT,
  location TEXT,
  
  -- Description fields
  description TEXT,
  personality TEXT, -- JSON array
  medical_info TEXT,
  care_requirements TEXT, -- JSON array
  
  -- Extended pet information
  good_with TEXT, -- JSON array: ["子供", "他の犬", "猫"]
  health_notes TEXT, -- JSON array: 健康に関する注意事項
  
  -- Physical characteristics
  color TEXT,
  weight REAL,
  size TEXT, -- small, medium, large
  coat_length TEXT, -- short, medium, long
  
  -- Health status
  is_neutered INTEGER DEFAULT 0,
  is_vaccinated INTEGER DEFAULT 0,
  vaccination_status TEXT,
  is_fiv_felv_tested INTEGER DEFAULT 0,
  
  -- Behavior characteristics
  exercise_level TEXT, -- low, moderate, high
  training_level TEXT, -- basic, intermediate, advanced
  social_level TEXT, -- low, moderate, high
  indoor_outdoor TEXT, -- indoor, outdoor, both
  grooming_requirements TEXT, -- low, moderate, high
  
  -- Compatibility flags
  good_with_kids INTEGER DEFAULT 0,
  good_with_dogs INTEGER DEFAULT 0,
  good_with_cats INTEGER DEFAULT 0,
  apartment_friendly INTEGER DEFAULT 0,
  needs_yard INTEGER DEFAULT 0,
  
  -- Image management
  image_url TEXT,
  has_jpeg INTEGER DEFAULT 0,
  has_webp INTEGER DEFAULT 0,
  image_checked_at TEXT,
  screenshot_requested_at TEXT,
  screenshot_completed_at TEXT,
  
  -- Shelter information
  shelter_name TEXT,
  shelter_contact TEXT,
  source_url TEXT,
  source_id TEXT DEFAULT 'pet-home',
  adoption_fee INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for pets table
CREATE INDEX IF NOT EXISTS idx_pets_type ON pets(type);
CREATE INDEX IF NOT EXISTS idx_pets_prefecture ON pets(prefecture);
CREATE INDEX IF NOT EXISTS idx_pets_created_at ON pets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pets_has_jpeg ON pets(has_jpeg);
CREATE INDEX IF NOT EXISTS idx_pets_has_webp ON pets(has_webp);
CREATE INDEX IF NOT EXISTS idx_pets_type_created ON pets(type, created_at DESC);

-- Create crawler_states table
CREATE TABLE IF NOT EXISTS crawler_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  pet_type TEXT NOT NULL,
  checkpoint TEXT, -- JSON
  total_processed INTEGER DEFAULT 0,
  last_crawl_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for crawler_states table
CREATE INDEX IF NOT EXISTS idx_crawler_states_source_type ON crawler_states(source_id, pet_type);

-- Create sync_status table
CREATE TABLE IF NOT EXISTS sync_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL, -- 'pending' | 'running' | 'completed' | 'failed'
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  metadata TEXT, -- JSON
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for sync_status table
CREATE INDEX IF NOT EXISTS idx_sync_status_type ON sync_status(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_status_status ON sync_status(status);
CREATE INDEX IF NOT EXISTS idx_sync_status_created ON sync_status(created_at DESC);

-- Create sync_metadata table
CREATE TABLE IF NOT EXISTS sync_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  value_type TEXT DEFAULT 'string',
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create index for sync_metadata table
CREATE INDEX IF NOT EXISTS idx_sync_metadata_key ON sync_metadata(key);

-- Insert initial metadata
INSERT OR REPLACE INTO sync_metadata (key, value, description) VALUES 
  ('schema_version', '1', 'Database schema version'),
  ('min_required_dogs', '30', 'Minimum number of dogs required for app to be ready'),
  ('min_required_cats', '30', 'Minimum number of cats required for app to be ready'),
  ('min_image_coverage', '0.8', 'Minimum percentage of pets with images'),
  ('data_ready', 'false', 'Whether the database has sufficient data');