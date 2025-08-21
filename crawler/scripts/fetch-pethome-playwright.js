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

// Playwrightでペット詳細と画像を取得
async function fetchPetWithPlaywright(pet) {
  console.log(`  📸 Fetching ${pet.sourceUrl} with screenshot...`);
  
  try {
    // スクリーンショット保存先のディレクトリを作成
    const imageDir = path.resolve(__dirname, '../../data/images', `${pet.type}s`);
    const originalDir = path.join(imageDir, 'originals');
    const webpDir = path.join(imageDir, 'webp');
    await fs.mkdir(originalDir, { recursive: true });
    await fs.mkdir(webpDir, { recursive: true });
    
    // 一時的なスクリーンショットパス
    const tempScreenshotPath = path.join(originalDir, `${pet.id}_temp.png`);
    
    // Playwrightコマンドを実行するためのNode.jsスクリプトを作成
    const playwrightScript = `
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // ページを開く（タイムアウトを10秒に設定）
    await page.goto('${pet.sourceUrl}', { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // ページが完全に読み込まれるまで待機
    await page.waitForTimeout(2000);
    
    // ペット情報を抽出
    const petInfo = await page.evaluate(() => {
      const info = {};
      
      // タイトル/名前
      const h1 = document.querySelector('h1');
      info.name = h1 ? h1.textContent.trim() : '';
      
      // 品種
      const breedElement = Array.from(document.querySelectorAll('dt')).find(el => el.textContent.includes('種類'));
      if (breedElement) {
        const dd = breedElement.nextElementSibling;
        info.breed = dd ? dd.textContent.trim() : '雑種';
      }
      
      // 年齢
      const ageElement = Array.from(document.querySelectorAll('dt')).find(el => el.textContent.includes('年齢'));
      if (ageElement) {
        const dd = ageElement.nextElementSibling;
        const ageText = dd ? dd.textContent : '';
        const ageMatch = ageText.match(/(\\d+)/);
        info.age = ageMatch ? parseInt(ageMatch[1]) : 2;
      }
      
      // 性別
      const genderElement = Array.from(document.querySelectorAll('dt')).find(el => el.textContent.includes('雄雌'));
      if (genderElement) {
        const dd = genderElement.nextElementSibling;
        info.gender = dd && dd.textContent.includes('メス') ? 'メス' : 'オス';
      }
      
      return info;
    });
    
    console.log('Extracted info:', petInfo);
    
    // メイン画像を探してスクリーンショットを撮る
    const mainImage = await page.$('.photo_area img');
    if (mainImage) {
      await mainImage.screenshot({ path: '${tempScreenshotPath}' });
      console.log('Screenshot saved to ${tempScreenshotPath}');
    } else {
      // 画像が見つからない場合は、画像エリア全体のスクリーンショット
      const photoArea = await page.$('.photo_area');
      if (photoArea) {
        await photoArea.screenshot({ path: '${tempScreenshotPath}' });
        console.log('Photo area screenshot saved');
      } else {
        // それでも見つからない場合は、ページの可視部分
        await page.screenshot({ path: '${tempScreenshotPath}' });
        console.log('Full page screenshot saved');
      }
    }
    
    // 結果をJSONファイルに保存
    const fs = require('fs');
    fs.writeFileSync('${tempScreenshotPath}.json', JSON.stringify(petInfo));
    
  } finally {
    await browser.close();
  }
})();
    `;
    
    // スクリプトを一時ファイルに保存して実行
    const scriptPath = path.join(__dirname, 'temp-playwright.js');
    await fs.writeFile(scriptPath, playwrightScript);
    
    // Playwrightスクリプトを実行
    const { execSync } = require('child_process');
    try {
      execSync(`node ${scriptPath}`, { stdio: 'pipe', timeout: 30000 });
    } catch (error) {
      console.log(`    ⚠ Playwright execution error: ${error.message}`);
    }
    
    // 情報を読み込む
    try {
      const infoJson = await fs.readFile(`${tempScreenshotPath}.json`, 'utf-8');
      const petInfo = JSON.parse(infoJson);
      Object.assign(pet, petInfo);
      await fs.unlink(`${tempScreenshotPath}.json`);
    } catch (error) {
      console.log(`    ⚠ Could not read pet info`);
    }
    
    // スクリーンショットが存在するか確認
    try {
      const stats = await fs.stat(tempScreenshotPath);
      if (stats.size > 0) {
        // PNGをJPEGとWebPに変換
        const pngBuffer = await fs.readFile(tempScreenshotPath);
        
        // JPEG形式で保存
        const jpegPath = path.join(originalDir, `${pet.id}.jpg`);
        const jpegBuffer = await sharp(pngBuffer)
          .jpeg({ quality: 90 })
          .toBuffer();
        await fs.writeFile(jpegPath, jpegBuffer);
        
        // WebP形式で保存
        const webpPath = path.join(webpDir, `${pet.id}.webp`);
        const webpBuffer = await sharp(pngBuffer)
          .webp({ quality: 80 })
          .toBuffer();
        await fs.writeFile(webpPath, webpBuffer);
        
        // 一時PNGファイルを削除
        await fs.unlink(tempScreenshotPath);
        
        console.log(`    ✓ Screenshot converted: JPEG ${(jpegBuffer.length / 1024).toFixed(1)}KB, WebP ${(webpBuffer.length / 1024).toFixed(1)}KB`);
        pet.imageUrl = `local://${pet.id}.jpg`;
      }
    } catch (error) {
      console.log(`    ⚠ No screenshot found or conversion error: ${error.message}`);
    }
    
    // 一時スクリプトを削除
    await fs.unlink(scriptPath);
    
    return pet;
    
  } catch (error) {
    console.error(`  ❌ Error with Playwright: ${error.message}`);
    return pet;
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
  console.log('🐾 Fetching Pet-Home data with Playwright screenshots...\n');
  
  // Playwrightがインストールされているか確認
  try {
    require.resolve('playwright');
  } catch (error) {
    console.log('Installing Playwright...');
    const { execSync } = require('child_process');
    execSync('npm install playwright', { stdio: 'inherit' });
    execSync('npx playwright install chromium', { stdio: 'inherit' });
  }
  
  // 犬データを取得
  console.log('📊 Fetching dogs...');
  const dogs = await fetchPetList('dog', 30);
  console.log(`Found ${dogs.length} dogs\n`);
  
  if (dogs.length > 0) {
    console.log('📝 Fetching dog details with screenshots...');
    for (let i = 0; i < dogs.length; i++) {
      console.log(`[${i+1}/${dogs.length}] Processing ${dogs[i].name}...`);
      dogs[i] = await fetchPetWithPlaywright(dogs[i]);
      
      // レート制限対策（3秒待機）
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // 猫データを取得
  console.log('\n📊 Fetching cats...');
  const cats = await fetchPetList('cat', 30);
  console.log(`Found ${cats.length} cats\n`);
  
  if (cats.length > 0) {
    console.log('📝 Fetching cat details with screenshots...');
    for (let i = 0; i < cats.length; i++) {
      console.log(`[${i+1}/${cats.length}] Processing ${cats[i].name}...`);
      cats[i] = await fetchPetWithPlaywright(cats[i]);
      
      // レート制限対策（3秒待機）
      await new Promise(resolve => setTimeout(resolve, 3000));
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
}

// 実行
main().catch(console.error);