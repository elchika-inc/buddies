-- Initial schema for PawMatch API
CREATE TABLE IF NOT EXISTS pets (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('dog', 'cat')),
  name TEXT NOT NULL,
  breed TEXT,
  age INTEGER,
  gender TEXT,
  prefecture TEXT,
  city TEXT,
  location TEXT,
  description TEXT,
  personality TEXT, -- JSON array
  medical_info TEXT,
  care_requirements TEXT, -- JSON array
  image_url TEXT,
  shelter_name TEXT,
  shelter_contact TEXT,
  source_url TEXT,
  adoption_fee INTEGER DEFAULT 0,
  metadata TEXT, -- JSON object for additional fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pets_type ON pets(type);
CREATE INDEX IF NOT EXISTS idx_pets_prefecture ON pets(prefecture);
CREATE INDEX IF NOT EXISTS idx_pets_created_at ON pets(created_at DESC);