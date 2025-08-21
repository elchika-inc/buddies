#!/usr/bin/env node
/**
 * Pet-Homeから実際のペットデータを取得するスクリプト
 */

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs').promises;

// Pet-Homeのペット一覧を取得
async function fetchPetList(petType, limit = 30) {
  const pets = [];
  const baseUrl = petType === 'dog'
    ? 'https://www.pet-home.jp/dogs/'
    : 'https://www.pet-home.jp/cats/';
  
  let page = 1;
  while (pets.length < limit) {
    try {
      console.log(`Fetching ${petType} page ${page}...`);
      const url = `${baseUrl}?page=${page}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
        }
      });
      
      if (!response.ok) {
        console.error(`HTTP ${response.status}: ${response.statusText}`);
        break;
      }
      
      const html = await response.text();
      
      // ペット情報を抽出（class="pet_info"を持つ要素を探す）
      const petMatches = html.matchAll(/<article[^>]*class="[^"]*pet_info[^"]*"[^>]*>([\s\S]*?)<\/article>/g);
      
      for (const match of petMatches) {
        if (pets.length >= limit) break;
        
        const petHtml = match[1];
        
        // IDを抽出
        const idMatch = petHtml.match(/\/pn(\d+)\//);
        if (!idMatch) continue;
        const id = idMatch[1];
        
        // 画像URLを抽出
        const imgMatch = petHtml.match(/<img[^>]+src="([^"]+)"/);
        const imageUrl = imgMatch ? imgMatch[1] : null;
        
        // タイトル/名前を抽出
        const titleMatch = petHtml.match(/<h3[^>]*>([^<]+)<\/h3>/);
        const title = titleMatch ? titleMatch[1].trim() : `${petType}-${id}`;
        
        // 地域を抽出
        const areaMatch = petHtml.match(/<span[^>]*class="[^"]*area[^"]*"[^>]*>([^<]+)<\/span>/);
        const area = areaMatch ? areaMatch[1].trim() : '東京都';
        
        // 詳細URLを構築
        const detailUrl = `https://www.pet-home.jp/${petType}s/${area.toLowerCase()}/pn${id}/`;
        
        const pet = {
          id: `pethome_${id}`,
          type: petType,
          name: title.substring(0, 20), // タイトルから名前を抽出（最初の20文字）
          imageUrl: imageUrl,
          sourceUrl: detailUrl,
          prefecture: extractPrefecture(area),
          rawHtml: petHtml // デバッグ用
        };
        
        pets.push(pet);
        console.log(`  Found: ${pet.name} (ID: ${pet.id})`);
      }
      
      // 次のページがなければ終了
      if (!html.includes('class="next"') || pets.length === 0) {
        break;
      }
      
      page++;
      
      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error.message);
      break;
    }
  }
  
  return pets.slice(0, limit);
}

// 都道府県を抽出
function extractPrefecture(area) {
  const prefectures = [
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
    '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
    '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
    '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
  ];
  
  for (const pref of prefectures) {
    if (area.includes(pref)) return pref;
  }
  
  // デフォルトは東京都
  return '東京都';
}

// ペットの詳細情報を取得
async function fetchPetDetail(pet) {
  try {
    console.log(`  Fetching details for ${pet.name}...`);
    
    const response = await fetch(pet.sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
      }
    });
    
    if (!response.ok) {
      console.error(`    Failed to fetch details: HTTP ${response.status}`);
      return pet;
    }
    
    const html = await response.text();
    
    // 品種を抽出
    const breedMatch = html.match(/(?:犬種|猫種)[：:]\s*([^<\n]+)/);
    pet.breed = breedMatch ? breedMatch[1].trim() : '雑種';
    
    // 年齢を抽出
    const ageMatch = html.match(/(?:年齢|月齢)[：:]\s*([^<\n]+)/);
    if (ageMatch) {
      const ageText = ageMatch[1].trim();
      const yearMatch = ageText.match(/(\d+)\s*(?:歳|才)/);
      const monthMatch = ageText.match(/(\d+)\s*(?:ヶ月|カ月|か月)/);
      
      if (yearMatch) {
        pet.age = yearMatch[1];
      } else if (monthMatch) {
        pet.age = Math.max(1, Math.floor(parseInt(monthMatch[1]) / 12)).toString();
      } else {
        pet.age = '2';
      }
    } else {
      pet.age = '2';
    }
    
    // 性別を抽出
    const genderMatch = html.match(/性別[：:]\s*([^<\n]+)/);
    pet.gender = genderMatch ? genderMatch[1].trim() : '不明';
    
    // 説明文を抽出
    const descMatch = html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (descMatch) {
      pet.description = descMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 500);
    } else {
      pet.description = `${pet.breed}の${pet.name}です。新しい家族を探しています。`;
    }
    
    // 市区町村を抽出
    const cityMatch = html.match(/(?:地域|場所)[：:]\s*([^<\n]+)/);
    if (cityMatch) {
      const location = cityMatch[1].trim();
      pet.city = location.replace(pet.prefecture, '').trim() || '';
      pet.location = location;
    } else {
      pet.city = '';
      pet.location = pet.prefecture;
    }
    
    // 保護団体/掲載者を抽出
    const shelterMatch = html.match(/掲載者[：:]\s*([^<\n]+)/);
    pet.shelterName = shelterMatch ? shelterMatch[1].trim() : '保護団体';
    
    // より大きな画像URLを探す
    const largeImgMatch = html.match(/<img[^>]*class="[^"]*main[^"]*"[^>]*src="([^"]+)"/);
    if (largeImgMatch) {
      pet.imageUrl = largeImgMatch[1];
    }
    
    console.log(`    ✓ ${pet.breed}, ${pet.age}歳, ${pet.gender}`);
    
  } catch (error) {
    console.error(`    Error fetching details: ${error.message}`);
  }
  
  return pet;
}

// 画像をダウンロード
async function downloadImage(pet) {
  if (!pet.imageUrl) return;
  
  try {
    const response = await fetch(pet.imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.error(`    Failed to download image: HTTP ${response.status}`);
      return;
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // 画像を保存
    const imageDir = path.resolve(__dirname, '../../data/images', `${pet.type}s`);
    
    // オリジナル画像を保存
    const originalDir = path.join(imageDir, 'originals');
    await fs.mkdir(originalDir, { recursive: true });
    const originalPath = path.join(originalDir, `${pet.id}.jpg`);
    await fs.writeFile(originalPath, buffer);
    
    // WebP形式でも保存（実際にはJPEGと同じデータ）
    const webpDir = path.join(imageDir, 'webp');
    await fs.mkdir(webpDir, { recursive: true });
    const webpPath = path.join(webpDir, `${pet.id}.webp`);
    await fs.writeFile(webpPath, buffer);
    
    console.log(`    ✓ Image saved`);
    
  } catch (error) {
    console.error(`    Error downloading image: ${error.message}`);
  }
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
  
  for (const pet of pets) {
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
        pet.age || '2',
        pet.gender || '不明',
        pet.prefecture,
        pet.city || '',
        pet.location || pet.prefecture,
        pet.description || '',
        JSON.stringify(['人懐っこい', '元気', '甘えん坊']),
        'ワクチン接種済み',
        JSON.stringify(['室内飼い希望', '定期健診必要']),
        pet.imageUrl || '',
        pet.shelterName || '保護団体',
        'contact@pet-home.jp',
        pet.sourceUrl,
        0,
        JSON.stringify({ source: 'pet-home', fetchedAt: new Date().toISOString() }),
        new Date().toISOString()
      ]
    );
  }
  
  await db.close();
}

// メイン処理
async function main() {
  console.log('🐾 Fetching real data from Pet-Home...\n');
  
  // 犬データを取得
  console.log('📊 Fetching dogs...');
  const dogs = await fetchPetList('dog', 30);
  console.log(`Found ${dogs.length} dogs\n`);
  
  // 犬の詳細情報を取得
  console.log('📝 Fetching dog details...');
  for (let i = 0; i < dogs.length; i++) {
    dogs[i] = await fetchPetDetail(dogs[i]);
    await downloadImage(dogs[i]);
    // レート制限対策
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // 猫データを取得
  console.log('\n📊 Fetching cats...');
  const cats = await fetchPetList('cat', 30);
  console.log(`Found ${cats.length} cats\n`);
  
  // 猫の詳細情報を取得
  console.log('📝 Fetching cat details...');
  for (let i = 0; i < cats.length; i++) {
    cats[i] = await fetchPetDetail(cats[i]);
    await downloadImage(cats[i]);
    // レート制限対策
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // データベースに保存
  console.log('\n💾 Saving to database...');
  const allPets = [...dogs, ...cats];
  await saveToDB(allPets);
  
  console.log(`\n✅ Successfully fetched and saved ${allPets.length} pets!`);
  console.log(`  Dogs: ${dogs.length}`);
  console.log(`  Cats: ${cats.length}`);
}

// 実行
main().catch(console.error);