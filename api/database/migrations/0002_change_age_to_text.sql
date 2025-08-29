-- Change age column from INTEGER to TEXT
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Create new table with correct schema
CREATE TABLE pets_new (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('dog', 'cat')),
  name TEXT NOT NULL,
  breed TEXT,
  age TEXT,  -- Changed from INTEGER to TEXT
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

-- Copy data from old table, converting age to text
INSERT INTO pets_new 
SELECT 
  id, type, name, breed,
  CAST(age AS TEXT),  -- Convert INTEGER to TEXT
  gender, prefecture, city, location, description, personality,
  medical_info, care_requirements, image_url, shelter_name,
  shelter_contact, source_url, adoption_fee, metadata,
  created_at, updated_at
FROM pets;

-- Drop old table
DROP TABLE pets;

-- Rename new table
ALTER TABLE pets_new RENAME TO pets;

-- Recreate indexes
CREATE INDEX idx_pets_type ON pets(type);
CREATE INDEX idx_pets_prefecture ON pets(prefecture);
CREATE INDEX idx_pets_created_at ON pets(created_at DESC);