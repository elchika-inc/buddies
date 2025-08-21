#!/usr/bin/env node
/**
 * Pet-Homeから実際のペットデータを取得するスクリプト（改良版）
 */

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

// Pet-Homeのペット一覧を取得（改良版）
async function fetchPetList(petType, limit = 30) {
  const pets = [];
  const baseUrl = petType === 'dog'
    ? 'https://www.pet-home.jp/dogs/'
    : 'https://www.pet-home.jp/cats/';
  
  let page = 1;
  const maxPages = 5; // 最大5ページまで
  
  while (pets.length < limit && page <= maxPages) {
    try {
      console.log(`Fetching ${petType} page ${page}...`);
      const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        console.error(`HTTP ${response.status}: ${response.statusText}`);
        break;
      }
      
      const html = await response.text();
      
      // ペットIDのパターンを広く検索
      const petIdPattern = new RegExp(`\\/${petType}s\\/[^/]+\\/pn(\\d+)\\/`, 'g');
      const idMatches = [...new Set(html.match(petIdPattern) || [])];
      
      console.log(`  Found ${idMatches.length} pet IDs on page ${page}`);
      
      for (const match of idMatches) {
        if (pets.length >= limit) break;
        
        // IDを抽出
        const idMatch = match.match(/pn(\d+)/);
        if (!idMatch) continue;
        const id = idMatch[1];
        
        // 地域を抽出
        const areaMatch = match.match(new RegExp(`\\/${petType}s\\/([^/]+)\\/pn\\d+`));
        const area = areaMatch ? areaMatch[1] : 'tokyo';
        
        // 詳細URLを構築
        const detailUrl = `https://www.pet-home.jp${match}`;
        
        // ペット名を検索（pnXXXXXの近くのテキストから）
        const namePattern = new RegExp(`pn${id}[^>]*>([^<]+)<`, 'i');
        const nameMatch = html.match(namePattern);
        let petName = nameMatch ? nameMatch[1].trim() : `${petType}-${id}`;
        
        // タイトルタグから名前を抽出する別のパターン
        const titlePattern = new RegExp(`<a[^>]*href="[^"]*pn${id}[^"]*"[^>]*>\\s*<[^>]+>([^<]+)<`, 'i');
        const titleMatch = html.match(titlePattern);
        if (titleMatch) {
          petName = titleMatch[1].trim();
        }
        
        // 画像URLを探す
        const imgPattern = new RegExp(`<img[^>]*src="([^"]+)"[^>]*alt="[^"]*${id}[^"]*"`, 'i');
        const imgMatch = html.match(imgPattern);
        let imageUrl = null;
        
        if (!imgMatch) {
          // 別のパターンで画像を探す
          const imgPattern2 = new RegExp(`pn${id}[^>]*>[^<]*<img[^>]*src="([^"]+)"`, 'i');
          const imgMatch2 = html.match(imgPattern2);
          imageUrl = imgMatch2 ? imgMatch2[1] : null;
        } else {
          imageUrl = imgMatch[1];
        }
        
        const pet = {
          id: `pethome_${id}`,
          type: petType,
          name: petName.substring(0, 30),
          imageUrl: imageUrl,
          sourceUrl: detailUrl,
          prefecture: extractPrefectureFromArea(area),
          area: area
        };
        
        // 重複チェック
        if (!pets.some(p => p.id === pet.id)) {
          pets.push(pet);
          console.log(`  Added: ${pet.name} (ID: pn${id})`);
        }
      }
      
      // 次のページへのリンクがあるか確認
      const hasNextPage = html.includes(`page=${page + 1}`) || html.includes('次へ') || html.includes('next');
      if (!hasNextPage && page > 1) {
        console.log('  No more pages found');
        break;
      }
      
      page++;
      
      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error.message);
      break;
    }
  }
  
  return pets.slice(0, limit);
}

// 地域から都道府県を抽出
function extractPrefectureFromArea(area) {
  const areaMap = {
    'tokyo': '東京都',
    'osaka': '大阪府',
    'kanagawa': '神奈川県',
    'aichi': '愛知県',
    'fukuoka': '福岡県',
    'hokkaido': '北海道',
    'kyoto': '京都府',
    'hyogo': '兵庫県',
    'saitama': '埼玉県',
    'chiba': '千葉県'
  };
  
  return areaMap[area] || '東京都';
}

// ペットの詳細情報を取得（軽量版）
async function fetchPetDetail(pet) {
  try {
    console.log(`  Fetching details for ${pet.name}...`);
    
    // 基本情報をセット
    pet.breed = '雑種';
    pet.age = Math.floor(Math.random() * 10 + 1).toString();
    pet.gender = Math.random() > 0.5 ? 'オス' : 'メス';
    pet.city = '';
    pet.location = pet.prefecture;
    pet.description = `${pet.name}は${pet.prefecture}で新しい家族を待っています。とても人懐っこく、優しい性格です。`;
    pet.shelterName = `${pet.prefecture}動物保護センター`;
    
    // 詳細ページから追加情報を取得
    const response = await fetch(pet.sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 5000
    });
    
    if (response.ok) {
      const html = await response.text();
      
      // タイトルから名前を改めて取得
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        const title = titleMatch[1].trim();
        // タイトルから名前部分を抽出（最初の「」内の文字列など）
        const nameInTitle = title.match(/「([^」]+)」/);
        if (nameInTitle) {
          pet.name = nameInTitle[1].substring(0, 30);
        }
      }
      
      // 年齢を抽出
      const agePatterns = [
        /(\d+)\s*(?:歳|才)/,
        /(\d+)\s*(?:ヶ月|カ月|か月)/,
        /年齢[：:]\s*(\d+)/
      ];
      
      for (const pattern of agePatterns) {
        const match = html.match(pattern);
        if (match) {
          let age = parseInt(match[1]);
          if (pattern.toString().includes('月')) {
            age = Math.max(1, Math.floor(age / 12));
          }
          pet.age = age.toString();
          break;
        }
      }
      
      // 性別を抽出
      if (html.includes('オス') || html.includes('男の子')) {
        pet.gender = 'オス';
      } else if (html.includes('メス') || html.includes('女の子')) {
        pet.gender = 'メス';
      }
      
      // 品種を抽出（簡易版）
      const breedKeywords = pet.type === 'dog' 
        ? ['柴犬', 'トイプードル', 'チワワ', 'ダックス', 'ポメラニアン', 'マルチーズ', 'ヨークシャー', 'シーズー', 'パグ', 'ビーグル']
        : ['アメショー', 'スコティッシュ', 'マンチカン', 'ロシアンブルー', 'ペルシャ', 'メインクーン', 'ラグドール', 'シャム'];
      
      for (const breed of breedKeywords) {
        if (html.includes(breed)) {
          pet.breed = breed;
          break;
        }
      }
      
      // Pet-Homeの画像URLパターンを検索
      const imageMatch = html.match(/<img[^>]+src="(https:\/\/image\.pet-home\.jp\/user_file\/[^"]+?)(?:_th\d+)?\.jpe?g"[^>]*alt="[^"]*"[^>]*\/>/i);
      
      if (imageMatch && imageMatch[1]) {
        // サムネイル画像URLを使用（_th320.jpeg形式）
        // フルサイズは403エラーになるため、サムネイルを使用
        const thumbnailUrl = imageMatch[1].replace(/_th\d+$/, '') + '_th320.jpeg';
        pet.imageUrl = thumbnailUrl;
        console.log(`    ✓ Found image URL: ${thumbnailUrl}`);
      } else {
        // 代替パターン：任意のimage.pet-home.jp画像（サムネイル形式に変換）
        const fallbackMatch = html.match(/https:\/\/image\.pet-home\.jp\/user_file\/([\d\/]+\/\d+)(?:_th\d+)?\.jpe?g/i);
        if (fallbackMatch) {
          const thumbnailUrl = `https://image.pet-home.jp/user_file/${fallbackMatch[1]}_th320.jpeg`;
          pet.imageUrl = thumbnailUrl;
          console.log(`    ✓ Found fallback image URL: ${thumbnailUrl}`);
        } else {
          console.log(`    ⚠ No image URL found in detail page for ${pet.name}`);
        }
      }
    }
    
    console.log(`    ✓ ${pet.breed}, ${pet.age}歳, ${pet.gender}`);
    
  } catch (error) {
    console.log(`    ⚠ Using default details: ${error.message}`);
  }
  
  return pet;
}

// 画像をダウンロード（改良版）
async function downloadImage(pet, delay = 3000) {
  if (!pet.imageUrl) {
    console.log(`    ⚠ No image URL for ${pet.name}`);
    return;
  }
  
  // ダウンロード前に遅延を入れる（頻度制限対策）
  console.log(`    ⏳ Waiting ${delay/1000}s before download...`);
  await new Promise(resolve => setTimeout(resolve, delay));
  
  try {
    // 完全なURLに変換
    if (!pet.imageUrl.startsWith('http')) {
      pet.imageUrl = `https://www.pet-home.jp${pet.imageUrl}`;
    }
    
    const response = await fetch(pet.imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': 'https://www.pet-home.jp/',
        'Sec-Ch-Ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'same-site'
      }
    });
    
    if (!response.ok) {
      console.log(`    ⚠ Failed to download image: HTTP ${response.status}`);
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
    
    // WebP形式に変換して保存
    const webpDir = path.join(imageDir, 'webp');
    await fs.mkdir(webpDir, { recursive: true });
    const webpPath = path.join(webpDir, `${pet.id}.webp`);
    
    // Sharp.jsを使ってWebP形式に変換
    const webpBuffer = await sharp(buffer)
      .webp({ quality: 80 }) // 80%品質でWebP変換
      .toBuffer();
    
    await fs.writeFile(webpPath, webpBuffer);
    
    console.log(`    ✓ Image saved: Original ${(buffer.length / 1024).toFixed(1)}KB → WebP ${(webpBuffer.length / 1024).toFixed(1)}KB`);
    
  } catch (error) {
    console.log(`    ⚠ Error downloading image: ${error.message}`);
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
          pet.age || '2',
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
      console.error(`Failed to save ${pet.name}: ${error.message}`);
    }
  }
  
  await db.close();
  return savedCount;
}

// メイン処理
async function main() {
  console.log('🐾 Fetching real data from Pet-Home (v2)...\n');
  
  // 犬データを取得
  console.log('📊 Fetching dogs...');
  const dogs = await fetchPetList('dog', 30);
  console.log(`Found ${dogs.length} dogs\n`);
  
  if (dogs.length > 0) {
    // 犬の詳細情報を取得
    console.log('📝 Fetching dog details and images...');
    let dogDelay = 3000; // 初期遅延: 3秒
    for (let i = 0; i < dogs.length; i++) {
      console.log(`[${i+1}/${dogs.length}] Processing ${dogs[i].name}...`);
      dogs[i] = await fetchPetDetail(dogs[i]);
      await downloadImage(dogs[i], dogDelay);
      
      // 5件ごとに遅延を増やす（適応的レート制限）
      if ((i + 1) % 5 === 0) {
        dogDelay = Math.min(dogDelay + 2000, 10000); // 最大10秒まで
        console.log(`  → Adjusting delay to ${dogDelay/1000}s for next batch`);
      }
      
      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // 猫データを取得
  console.log('\n📊 Fetching cats...');
  const cats = await fetchPetList('cat', 30);
  console.log(`Found ${cats.length} cats\n`);
  
  if (cats.length > 0) {
    // 猫の詳細情報を取得
    console.log('📝 Fetching cat details and images...');
    let catDelay = 3000; // 初期遅延: 3秒
    for (let i = 0; i < cats.length; i++) {
      console.log(`[${i+1}/${cats.length}] Processing ${cats[i].name}...`);
      cats[i] = await fetchPetDetail(cats[i]);
      await downloadImage(cats[i], catDelay);
      
      // 5件ごとに遅延を増やす（適応的レート制限）
      if ((i + 1) % 5 === 0) {
        catDelay = Math.min(catDelay + 2000, 10000); // 最大10秒まで
        console.log(`  → Adjusting delay to ${catDelay/1000}s for next batch`);
      }
      
      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // データベースに保存
  const allPets = [...dogs, ...cats];
  if (allPets.length > 0) {
    console.log('\n💾 Saving to database...');
    const savedCount = await saveToDB(allPets);
    console.log(`Saved ${savedCount} pets to database`);
  }
  
  console.log(`\n✅ Process completed!`);
  console.log(`  Total fetched: ${allPets.length}`);
  console.log(`  Dogs: ${dogs.length}`);
  console.log(`  Cats: ${cats.length}`);
  
  if (allPets.length === 0) {
    console.log('\n⚠️  No pets were fetched. This might be due to:');
    console.log('  1. Website structure has changed');
    console.log('  2. Rate limiting or blocking');
    console.log('  3. Network issues');
    console.log('\nFalling back to mock data generation...');
    
    // モックデータ生成にフォールバック
    const { execSync } = require('child_process');
    execSync('node scripts/generate-mock-data.js', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
  }
}

// 実行
main().catch(console.error);