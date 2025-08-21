const fs = require('fs').promises;
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const sharp = require('sharp');

// Pet-Homeから実際のペットリストを取得（簡易版）
async function fetchPetList(petType, limit = 5) {
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

// ペットの詳細情報を取得
async function fetchPetDetail(pet) {
  try {
    console.log(`  Fetching details for ${pet.name}...`);
    const response = await fetch(pet.sourceUrl);
    
    if (!response.ok) {
      console.log(`    ⚠ Failed to fetch details: HTTP ${response.status}`);
      return pet;
    }
    
    const html = await response.text();
    
    // 画像URLを取得（サムネイル形式）
    const imageMatch = html.match(/<img[^>]+src="(https:\/\/image\.pet-home\.jp\/user_file\/[^"]+?)(?:_th\d+)?\.jpe?g"[^>]*alt="[^"]*"[^>]*\/>/i);
    
    if (imageMatch && imageMatch[1]) {
      const thumbnailUrl = imageMatch[1].replace(/_th\d+$/, '') + '_th320.jpeg';
      pet.imageUrl = thumbnailUrl;
      console.log(`    ✓ Found image URL: ${thumbnailUrl}`);
    } else {
      const fallbackMatch = html.match(/https:\/\/image\.pet-home\.jp\/user_file\/([\d\/]+\/\d+)(?:_th\d+)?\.jpe?g/i);
      if (fallbackMatch) {
        const thumbnailUrl = `https://image.pet-home.jp/user_file/${fallbackMatch[1]}_th320.jpeg`;
        pet.imageUrl = thumbnailUrl;
        console.log(`    ✓ Found fallback image URL: ${thumbnailUrl}`);
      } else {
        console.log(`    ⚠ No image URL found in detail page for ${pet.name}`);
      }
    }
    
    // 基本情報を抽出
    const breedMatch = html.match(/品種[：:]\s*([^<\n]+)/);
    pet.breed = breedMatch ? breedMatch[1].trim() : '雑種';
    
    const ageMatch = html.match(/年齢[：:]\s*([^<\n]+)/);
    pet.age = ageMatch ? parseInt(ageMatch[1]) : 2;
    
    const genderMatch = html.match(/性別[：:]\s*([^<\n]+)/);
    pet.gender = genderMatch ? (genderMatch[1].includes('オス') ? 'オス' : 'メス') : 'オス';
    
    console.log(`    ✓ ${pet.breed}, ${pet.age}歳, ${pet.gender}`);
    
  } catch (error) {
    console.log(`    ⚠ Error fetching details: ${error.message}`);
  }
  
  return pet;
}

// 画像をダウンロード（遅延付き）
async function downloadImage(pet, delay = 3000) {
  if (!pet.imageUrl) {
    console.log(`    ⚠ No image URL for ${pet.name}`);
    return false;
  }
  
  console.log(`    ⏳ Waiting ${delay/1000}s before download...`);
  await new Promise(resolve => setTimeout(resolve, delay));
  
  try {
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
      console.log(`    ❌ Failed to download: HTTP ${response.status}`);
      return false;
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
    
    const webpBuffer = await sharp(buffer)
      .webp({ quality: 80 })
      .toBuffer();
    
    await fs.writeFile(webpPath, webpBuffer);
    
    console.log(`    ✅ Image saved: Original ${(buffer.length / 1024).toFixed(1)}KB → WebP ${(webpBuffer.length / 1024).toFixed(1)}KB`);
    return true;
    
  } catch (error) {
    console.log(`    ❌ Error downloading: ${error.message}`);
    return false;
  }
}

// メイン処理
async function main() {
  console.log('🐾 Testing slow fetch with adaptive delays (5 dogs only)...\n');
  
  // 犬データを取得（5件のみ）
  console.log('📊 Fetching dogs...');
  const dogs = await fetchPetList('dog', 5);
  console.log(`Found ${dogs.length} dogs\n`);
  
  if (dogs.length > 0) {
    console.log('📝 Fetching dog details and images with adaptive delays...');
    let delay = 3000; // 初期遅延: 3秒
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < dogs.length; i++) {
      console.log(`[${i+1}/${dogs.length}] Processing ${dogs[i].name}...`);
      dogs[i] = await fetchPetDetail(dogs[i]);
      
      const success = await downloadImage(dogs[i], delay);
      if (success) {
        successCount++;
        // 成功したら遅延を少し減らす
        delay = Math.max(delay - 500, 2000); // 最小2秒
      } else {
        failCount++;
        // 失敗したら遅延を大幅に増やす
        delay = Math.min(delay + 3000, 15000); // 最大15秒
      }
      
      console.log(`  → Current success rate: ${successCount}/${i+1} (${Math.round(successCount/(i+1)*100)}%)`);
      console.log(`  → Next delay: ${delay/1000}s\n`);
      
      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n📊 Test Results:');
    console.log(`  ✅ Successful downloads: ${successCount}/${dogs.length}`);
    console.log(`  ❌ Failed downloads: ${failCount}/${dogs.length}`);
    console.log(`  📈 Success rate: ${Math.round(successCount/dogs.length*100)}%`);
  }
}

// 実行
main().catch(console.error);