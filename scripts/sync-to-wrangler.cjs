#!/usr/bin/env node
/**
 * SQLiteデータをWranglerのローカルD1データベースに同期
 */

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const { execSync } = require('child_process');

async function syncData() {
  console.log('📦 Syncing data to Wrangler D1 local database...\n');
  
  // SQLiteデータベースを開く
  const dbPath = path.resolve(__dirname, '../data/pawmatch.db');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  // ペットデータを取得
  const pets = await db.all('SELECT * FROM pets');
  console.log(`Found ${pets.length} pets to sync`);
  
  // Wranglerのローカルデータベースにテーブルを作成
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS pets (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      breed TEXT,
      age TEXT,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  // テーブル作成
  execSync(
    `cd api && wrangler d1 execute pawmatch-db --local --command "${createTableSQL.replace(/\n/g, ' ')}"`,
    { stdio: 'inherit' }
  );
  
  // データを挿入
  console.log('\nInserting pets...');
  for (const pet of pets) {
    const insertSQL = `
      INSERT OR REPLACE INTO pets (
        id, type, name, breed, age, gender, prefecture, city, location,
        description, personality, medical_info, care_requirements,
        image_url, shelter_name, shelter_contact, source_url,
        adoption_fee, metadata, created_at
      ) VALUES (
        '${pet.id}',
        '${pet.type}',
        '${pet.name.replace(/'/g, "''")}',
        '${pet.breed?.replace(/'/g, "''") || ''}',
        '${pet.age}',
        '${pet.gender}',
        '${pet.prefecture}',
        '${pet.city}',
        '${pet.location}',
        '${pet.description?.replace(/'/g, "''") || ''}',
        '${pet.personality?.replace(/'/g, "''") || '[]'}',
        '${pet.medical_info?.replace(/'/g, "''") || ''}',
        '${pet.care_requirements?.replace(/'/g, "''") || '[]'}',
        '${pet.image_url}',
        '${pet.shelter_name?.replace(/'/g, "''") || ''}',
        '${pet.shelter_contact}',
        '${pet.source_url}',
        ${pet.adoption_fee || 0},
        '${pet.metadata?.replace(/'/g, "''") || '{}'}',
        '${pet.created_at}'
      );
    `.replace(/\n/g, ' ');
    
    try {
      execSync(
        `cd api && wrangler d1 execute pawmatch-db --local --command "${insertSQL}"`,
        { stdio: 'pipe' }
      );
      process.stdout.write('.');
    } catch (error) {
      console.error(`\nFailed to insert pet ${pet.id}:`, error.message);
    }
  }
  
  console.log('\n\n✅ Data sync completed!');
  
  // 確認
  const result = execSync(
    'cd api && wrangler d1 execute pawmatch-db --local --command "SELECT COUNT(*) as count, type FROM pets GROUP BY type"',
    { encoding: 'utf-8' }
  );
  console.log('\nDatabase statistics:');
  console.log(result);
  
  await db.close();
}

syncData().catch(console.error);