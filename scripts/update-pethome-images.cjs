#!/usr/bin/env node

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs').promises;

// Pet-Home画像URLをデータベースに更新
async function updatePetHomeImages() {
  const dbPath = path.resolve(__dirname, '../data/pawmatch.db');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  console.log('🔄 Updating Pet-Home image URLs...\n');
  
  // 実際の画像ファイルが存在するペットのリストを取得
  const imageDir = path.resolve(__dirname, '../data/images');
  const dogImagesDir = path.join(imageDir, 'dogs/originals');
  const catImagesDir = path.join(imageDir, 'cats/originals');
  
  const availableImages = new Set();
  
  try {
    const dogFiles = await fs.readdir(dogImagesDir);
    dogFiles.forEach(file => {
      if (file.endsWith('.jpg')) {
        const petId = file.replace('.jpg', '');
        availableImages.add(petId);
      }
    });
  } catch (error) {
    console.log('⚠ Dog images directory not found:', error.message);
  }
  
  try {
    const catFiles = await fs.readdir(catImagesDir);
    catFiles.forEach(file => {
      if (file.endsWith('.jpg')) {
        const petId = file.replace('.jpg', '');
        availableImages.add(petId);
      }
    });
  } catch (error) {
    console.log('⚠ Cat images directory not found:', error.message);
  }
  
  console.log(`Found ${availableImages.size} locally stored images`);
  
  // Pet-Homeペットの画像URLを更新
  let updatedCount = 0;
  const pets = await db.all('SELECT id, type, name, image_url FROM pets WHERE id LIKE "pethome_%"');
  
  for (const pet of pets) {
    if (availableImages.has(pet.id)) {
      // ローカル画像が存在する場合は、Next.js静的ファイル配信URLに更新
      const localImageUrl = `/images/${pet.type}s/${pet.id}.jpg`;
      
      await db.run(
        'UPDATE pets SET image_url = ? WHERE id = ?',
        [localImageUrl, pet.id]
      );
      
      console.log(`✓ Updated ${pet.name}: ${localImageUrl}`);
      updatedCount++;
    } else {
      // ローカル画像が存在しない場合は、Pet-Home画像URLを確認
      if (pet.image_url && pet.image_url.includes('image.pet-home.jp')) {
        console.log(`→ ${pet.name}: Already has Pet-Home URL`);
      } else {
        console.log(`⚠ ${pet.name}: No local image or Pet-Home URL`);
      }
    }
  }
  
  await db.close();
  
  console.log(`\n✅ Updated ${updatedCount} image URLs`);
  console.log(`📊 Total Pet-Home pets: ${pets.length}`);
  
  // 確認
  const db2 = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  const samplePets = await db2.all(
    'SELECT id, name, image_url FROM pets WHERE id LIKE "pethome_%" AND image_url LIKE "/api/images%" LIMIT 3'
  );
  
  console.log('\nSample updated records:');
  samplePets.forEach(pet => {
    console.log(`  ${pet.name}: ${pet.image_url}`);
  });
  
  await db2.close();
}

// 実行
updatePetHomeImages().catch(console.error);