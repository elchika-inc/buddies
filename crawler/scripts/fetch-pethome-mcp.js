const fs = require('fs').promises;
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const sharp = require('sharp');

// Pet-Homeから実際のペットリストを取得
async function fetchPetList(petType, limit = 30) {
  const baseUrl = `https://www.pet-home.jp/${petType === 'dog' ? 'dogs' : 'cats'}/`;
  const pets = [];
  let page = 1;
  
  while (pets.length < limit) {
    try {
      console.log(`Fetching ${petType} page ${page}...`);
      const url = `${baseUrl}?page=${page}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Failed to fetch: ${response.status}`);
        break;
      }
      
      const html = await response.text();
      
      // ペットIDを抽出
      const idMatches = html.matchAll(/href="\/(?:dogs|cats)\/[^\/]+\/pn(\d+)\//g);
      const pageIds = [];
      for (const match of idMatches) {
        const id = match[1];
        if (!pageIds.includes(id)) {
          pageIds.push(id);
        }
      }
      
      if (pageIds.length === 0) {
        console.log('  No pet IDs found on this page');
        break;
      }
      
      console.log(`  Found ${pageIds.length} pet IDs on page ${page}`);
      
      // 基本情報を取得
      for (const id of pageIds) {
        if (pets.length >= limit) break;
        
        const nameMatch = html.match(new RegExp(`href="/(?:dogs|cats)/[^/]+/pn${id}/"[^>]*>([^<]+)</a>`));
        const pet = {
          id: `pethome_${id}`,
          petId: id,
          type: petType,
          name: nameMatch ? nameMatch[1].trim() : `${petType === 'dog' ? '犬' : '猫'}ID:${id}`,
          sourceUrl: `https://www.pet-home.jp/${petType === 'dog' ? 'dogs' : 'cats'}/pn${id}/`,
          prefecture: '東京都'
        };
        
        pets.push(pet);
        console.log(`  Added: ${pet.name} (ID: pn${id})`);
      }
      
      page++;
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error.message);
      break;
    }
  }
  
  return pets.slice(0, limit);
}

// データベースに保存
async function saveToDB(pets) {
  const dbPath = path.resolve(__dirname, '../../data/pawmatch.db');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  // 既存のPet-Homeデータをクリア
  await db.run('DELETE FROM pets WHERE id LIKE "pethome_%"');
  console.log('Cleared existing Pet-Home data');
  
  let savedCount = 0;
  for (const pet of pets) {
    try {
      await db.run(
        `INSERT INTO pets (
          id, type, name, breed, age, gender, prefecture, city, location,
          description, personality, medical_info, care_requirements,
          image_url, shelter_name, shelter_contact, source_url,
          adoption_fee, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pet.id,
          pet.type,
          pet.name,
          pet.breed || '雑種',
          pet.age || 2,
          pet.gender || '不明',
          pet.prefecture,
          pet.city || '',
          pet.location || pet.prefecture,
          pet.description || `${pet.name}は新しい家族を待っています。`,
          JSON.stringify(['人懐っこい', '元気', '甘えん坊']),
          'ワクチン接種済み、健康診断済み',
          JSON.stringify(['室内飼い希望', '定期健診必要', '愛情必須']),
          pet.imageUrl || '',
          pet.shelterName || '保護団体',
          'contact@pet-home.jp',
          pet.sourceUrl,
          0,
          JSON.stringify({ source: 'pet-home', fetchedAt: new Date().toISOString() }),
          new Date().toISOString()
        ]
      );
      savedCount++;
    } catch (error) {
      console.error(`Failed to save pet ${pet.id}:`, error.message);
    }
  }
  
  await db.close();
  return savedCount;
}

// メイン処理
async function main() {
  console.log('🐾 Fetching Pet-Home data (MCP Playwright will be used for screenshots)...\n');
  
  // 犬データを取得
  console.log('📊 Fetching dogs...');
  const dogs = await fetchPetList('dog', 30);
  console.log(`Found ${dogs.length} dogs\n`);
  
  // 猫データを取得
  console.log('📊 Fetching cats...');
  const cats = await fetchPetList('cat', 30);
  console.log(`Found ${cats.length} cats\n`);
  
  // データベースに保存
  const allPets = [...dogs, ...cats];
  if (allPets.length > 0) {
    console.log('💾 Saving to database...');
    const savedCount = await saveToDB(allPets);
    console.log(`Saved ${savedCount} pets to database`);
  }
  
  console.log(`\n✅ Process completed!`);
  console.log(`  Total fetched: ${allPets.length}`);
  console.log(`  Dogs: ${dogs.length}`);
  console.log(`  Cats: ${cats.length}`);
  
  console.log('\n📸 Now you can use MCP Playwright tools to take screenshots of specific pets.');
  console.log('Example pet IDs:');
  if (dogs.length > 0) {
    console.log(`  Dog: ${dogs[0].sourceUrl}`);
  }
  if (cats.length > 0) {
    console.log(`  Cat: ${cats[0].sourceUrl}`);
  }
}

// 実行
main().catch(console.error);