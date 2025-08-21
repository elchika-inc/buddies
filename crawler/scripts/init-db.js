const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs').promises;

async function initDatabase() {
  console.log('🔧 Initializing database...');
  
  // データベースパスの確認と作成
  const dbPath = path.resolve(__dirname, '../../data/pawmatch.db');
  const dbDir = path.dirname(dbPath);
  
  // ディレクトリが存在しない場合は作成
  await fs.mkdir(dbDir, { recursive: true });
  
  // データベースを開く（存在しない場合は作成）
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  // テーブルを作成
  await db.exec(`
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
      personality TEXT,
      medical_info TEXT,
      care_requirements TEXT,
      image_url TEXT,
      shelter_name TEXT,
      shelter_contact TEXT,
      source_url TEXT,
      adoption_fee INTEGER DEFAULT 0,
      metadata TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_pets_type ON pets(type);
    CREATE INDEX IF NOT EXISTS idx_pets_prefecture ON pets(prefecture);
    CREATE INDEX IF NOT EXISTS idx_pets_created_at ON pets(created_at DESC);
  `);
  
  console.log('✅ Database initialized successfully at:', dbPath);
  
  // 現在のレコード数を確認
  const countResult = await db.get('SELECT COUNT(*) as count FROM pets');
  console.log(`📊 Current records in database: ${countResult.count}`);
  
  await db.close();
}

// 実行
initDatabase().catch(console.error);