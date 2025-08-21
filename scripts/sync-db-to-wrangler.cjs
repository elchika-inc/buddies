#!/usr/bin/env node

const { execSync } = require('child_process');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

// SQLiteからWrangler D1に全データを同期
async function syncToWrangler() {
  const dbPath = path.resolve(__dirname, '../data/pawmatch.db');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  console.log('🔄 Syncing database to Wrangler D1...\n');
  
  try {
    // 全ペットデータを取得
    const pets = await db.all('SELECT * FROM pets');
    console.log(`Found ${pets.length} pets in local database`);
    
    // Wranglerのローカルデータベースをクリア
    execSync('cd /Users/nishikawa/projects/elchika/pawmatch/api && npx wrangler d1 execute pawmatch-db --local --command "DELETE FROM pets"', { stdio: 'pipe' });
    console.log('Cleared Wrangler local database');
    
    // バッチで同期（10件ずつ）
    const batchSize = 10;
    let syncedCount = 0;
    
    for (let i = 0; i < pets.length; i += batchSize) {
      const batch = pets.slice(i, i + batchSize);
      
      for (const pet of batch) {
        // JSON文字列を正しく処理
        let personality = '["friendly", "energetic", "affectionate"]';
        let careRequirements = '["indoor", "regular_checkup", "love"]';
        let metadata = '{}';
        
        try {
          if (pet.personality && typeof pet.personality === 'string') {
            personality = pet.personality.includes('[') 
              ? '["friendly", "energetic", "affectionate"]' 
              : pet.personality;
          }
          if (pet.care_requirements && typeof pet.care_requirements === 'string') {
            careRequirements = pet.care_requirements.includes('[') 
              ? '["indoor", "regular_checkup", "love"]' 
              : pet.care_requirements;
          }
          if (pet.metadata && typeof pet.metadata === 'string') {
            metadata = pet.metadata.includes('{') ? pet.metadata : '{}';
          }
        } catch (e) {
          // フォールバック値を使用
        }
        
        const sql = `INSERT INTO pets (
          id, type, name, breed, age, gender, prefecture, city, location,
          description, personality, medical_info, care_requirements,
          image_url, shelter_name, shelter_contact, source_url,
          adoption_fee, metadata, created_at
        ) VALUES (
          '${pet.id}', '${pet.type}', '${pet.name.replace(/'/g, "''")}', 
          '${(pet.breed || '').replace(/'/g, "''")}', '${pet.age || ''}', 
          '${pet.gender || ''}', '${(pet.prefecture || '').replace(/'/g, "''")}', 
          '${(pet.city || '').replace(/'/g, "''")}', '${(pet.location || '').replace(/'/g, "''")}',
          '${(pet.description || '').replace(/'/g, "''")}', 
          '${personality}', 
          '${(pet.medical_info || '').replace(/'/g, "''")}', 
          '${careRequirements}',
          '${pet.image_url || ''}', '${(pet.shelter_name || '').replace(/'/g, "''")}', 
          '${pet.shelter_contact || ''}', '${pet.source_url || ''}',
          ${pet.adoption_fee || 0}, '${metadata}', 
          '${pet.created_at || new Date().toISOString()}'
        )`;
        
        try {
          execSync(`cd /Users/nishikawa/projects/elchika/pawmatch/api && npx wrangler d1 execute pawmatch-db --local --command "${sql}"`, { stdio: 'pipe' });
          syncedCount++;
          process.stdout.write('.');
        } catch (error) {
          process.stdout.write('x');
          console.error(`\nError syncing pet ${pet.id}: ${error.message}`);
        }
      }
    }
    
    console.log(`\n\n✅ Synced ${syncedCount}/${pets.length} pets to Wrangler D1`);
    
    // 確認
    const result = execSync(
      'cd /Users/nishikawa/projects/elchika/pawmatch/api && npx wrangler d1 execute pawmatch-db --local --command "SELECT COUNT(*) as total FROM pets"',
      { encoding: 'utf-8' }
    );
    console.log('\nWrangler D1 database status:');
    console.log(result);
    
  } catch (error) {
    console.error('Sync error:', error);
  } finally {
    await db.close();
  }
}

// 実行
syncToWrangler().catch(console.error);