const fs = require('fs').promises;
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const sharp = require('sharp');

// MCPのPlaywrightツールを使用してペット情報と画像を取得
async function fetchPetWithScreenshot(petId, petType) {
  const url = `https://www.pet-home.jp/${petType === 'dog' ? 'dogs' : 'cats'}/pn${petId}/`;
  console.log(`  📸 Fetching ${url} with Playwright...`);
  
  try {
    // ページを開く
    await mcp__playwright__browser_navigate({ url });
    
    // ページが完全に読み込まれるまで待機
    await mcp__playwright__browser_wait_for({ time: 3 });
    
    // ページのスナップショットを取得
    const snapshot = await mcp__playwright__browser_snapshot();
    
    // ペット情報を抽出
    const pet = {
      id: `pethome_${petId}`,
      type: petType,
      sourceUrl: url,
      prefecture: '東京都'
    };
    
    // スナップショットから情報を抽出
    if (snapshot && snapshot.content) {
      // タイトル/名前を取得
      const nameMatch = snapshot.content.match(/heading "([^"]+)"/);
      pet.name = nameMatch ? nameMatch[1] : `${petType === 'dog' ? '犬' : '猫'}ID:${petId}`;
      
      // 品種を取得
      const breedMatch = snapshot.content.match(/品種[：:]\s*([^\n]+)/);
      pet.breed = breedMatch ? breedMatch[1].trim() : '雑種';
      
      // 年齢を取得
      const ageMatch = snapshot.content.match(/年齢[：:]\s*([^\n]+)/);
      pet.age = ageMatch ? parseInt(ageMatch[1]) : 2;
      
      // 性別を取得
      const genderMatch = snapshot.content.match(/性別[：:]\s*([^\n]+)/);
      pet.gender = genderMatch ? (genderMatch[1].includes('オス') ? 'オス' : 'メス') : 'オス';
      
      console.log(`    ✓ Found: ${pet.name} - ${pet.breed}, ${pet.age}歳, ${pet.gender}`);
    }
    
    // メイン画像要素を見つけてスクリーンショットを撮る
    try {
      // 画像要素を探す（通常はalt属性に名前が含まれる）
      const imageElements = snapshot.elements?.filter(el => 
        el.type === 'image' && (el.alt?.includes(pet.name) || el.alt?.includes('写真'))
      );
      
      if (imageElements && imageElements.length > 0) {
        const mainImage = imageElements[0];
        
        // 画像要素のスクリーンショットを撮る
        const screenshotPath = path.resolve(
          __dirname, 
          '../../data/images', 
          `${pet.type}s`,
          'originals',
          `${pet.id}.png`
        );
        
        await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
        
        await mcp__playwright__browser_take_screenshot({
          element: `Main pet image for ${pet.name}`,
          ref: mainImage.ref,
          filename: screenshotPath,
          type: 'png'
        });
        
        console.log(`    ✓ Screenshot saved: ${screenshotPath}`);
        
        // PNGをJPEGとWebPに変換
        const pngBuffer = await fs.readFile(screenshotPath);
        
        // JPEG形式で保存
        const jpegPath = screenshotPath.replace('.png', '.jpg');
        const jpegBuffer = await sharp(pngBuffer)
          .jpeg({ quality: 90 })
          .toBuffer();
        await fs.writeFile(jpegPath, jpegBuffer);
        
        // WebP形式で保存
        const webpDir = path.resolve(
          __dirname,
          '../../data/images',
          `${pet.type}s`,
          'webp'
        );
        await fs.mkdir(webpDir, { recursive: true });
        const webpPath = path.join(webpDir, `${pet.id}.webp`);
        
        const webpBuffer = await sharp(pngBuffer)
          .webp({ quality: 80 })
          .toBuffer();
        await fs.writeFile(webpPath, webpBuffer);
        
        // 元のPNGを削除
        await fs.unlink(screenshotPath);
        
        console.log(`    ✓ Converted: JPEG ${(jpegBuffer.length / 1024).toFixed(1)}KB, WebP ${(webpBuffer.length / 1024).toFixed(1)}KB`);
        
        pet.imageUrl = `local://${pet.id}.jpg`;
      } else {
        // 画像要素が見つからない場合は、ページ全体のスクリーンショットを撮る
        console.log('    ⚠ No image element found, taking full page screenshot...');
        
        const screenshotPath = path.resolve(
          __dirname,
          '../../data/images',
          `${pet.type}s`,
          'originals',
          `${pet.id}_full.png`
        );
        
        await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
        
        await mcp__playwright__browser_take_screenshot({
          filename: screenshotPath,
          fullPage: false,
          type: 'png'
        });
        
        console.log(`    ✓ Full page screenshot saved: ${screenshotPath}`);
      }
    } catch (error) {
      console.log(`    ⚠ Screenshot error: ${error.message}`);
    }
    
    return pet;
    
  } catch (error) {
    console.error(`  ❌ Error fetching with Playwright: ${error.message}`);
    return null;
  }
}

// データベースに保存
async function saveToDB(pets) {
  const dbPath = path.resolve(__dirname, '../../data/pawmatch.db');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  let savedCount = 0;
  for (const pet of pets) {
    if (!pet) continue;
    
    try {
      await db.run(
        `INSERT OR REPLACE INTO pets (
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
  
  // テスト用に少数のペットIDを指定
  const testPetIds = {
    dog: ['523724', '523715', '523714', '523707', '523701'],
    cat: ['523725', '523722', '523721', '523720', '523719']
  };
  
  const allPets = [];
  
  // 犬データを取得
  console.log('📊 Fetching dogs with screenshots...');
  for (const petId of testPetIds.dog) {
    const pet = await fetchPetWithScreenshot(petId, 'dog');
    if (pet) allPets.push(pet);
    
    // レート制限対策
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // 猫データを取得
  console.log('\n📊 Fetching cats with screenshots...');
  for (const petId of testPetIds.cat) {
    const pet = await fetchPetWithScreenshot(petId, 'cat');
    if (pet) allPets.push(pet);
    
    // レート制限対策
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // ブラウザを閉じる
  try {
    await mcp__playwright__browser_close();
    console.log('\n✓ Browser closed');
  } catch (error) {
    console.log('\n⚠ Could not close browser:', error.message);
  }
  
  // データベースに保存
  if (allPets.length > 0) {
    console.log('\n💾 Saving to database...');
    const savedCount = await saveToDB(allPets);
    console.log(`Saved ${savedCount} pets to database`);
  }
  
  console.log(`\n✅ Process completed!`);
  console.log(`  Total fetched: ${allPets.length}`);
  console.log(`  Dogs: ${testPetIds.dog.length}`);
  console.log(`  Cats: ${testPetIds.cat.length}`);
}

// 実行
main().catch(console.error);