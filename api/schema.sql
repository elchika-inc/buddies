-- PawMatch API Database Schema
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
  adoption_fee INTEGER DEFAULT 0,
  metadata TEXT, -- JSON object for additional fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pets_type ON pets(type);
CREATE INDEX IF NOT EXISTS idx_pets_prefecture ON pets(prefecture);
CREATE INDEX IF NOT EXISTS idx_pets_created_at ON pets(created_at DESC);

-- Sample data for development
INSERT OR IGNORE INTO pets (
  id, type, name, breed, age, gender, prefecture, city, location,
  description, personality, medical_info, care_requirements,
  image_url, shelter_name, created_at
) VALUES 
(
  'cat-sample-001',
  'cat',
  'ミケ',
  '三毛猫',
  2,
  '女の子',
  '東京都',
  '渋谷区',
  '東京都渋谷区',
  '人懐っこくて甘えん坊な三毛猫のミケちゃんです。',
  '["人懐っこい", "甘えん坊", "遊び好き"]',
  'ワクチン接種済み、避妊手術済み',
  '["完全室内飼い", "定期健診", "愛情たっぷり"]',
  'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=400&h=400&fit=crop',
  '東京キャットレスキュー',
  datetime('now')
),
(
  'cat-sample-002',
  'cat',
  'クロ',
  '黒猫',
  1,
  '男の子',
  '神奈川県',
  '横浜市',
  '神奈川県横浜市',
  '好奇心旺盛な黒猫のクロくん。',
  '["活発", "好奇心旺盛", "人懐っこい"]',
  'ワクチン接種済み、去勢手術済み',
  '["完全室内飼い", "たくさん遊んであげる"]',
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop',
  '横浜アニマルシェルター',
  datetime('now')
);