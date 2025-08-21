#!/usr/bin/env node

const { execSync } = require('child_process');

// 外部Pet-Home画像URLをUnsplashフォールバック画像に置き換える
function replaceExternalImages() {
  console.log('🔄 Replacing external Pet-Home image URLs with fallback images...\n');
  
  // フォールバック画像URL
  const dogFallback = 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=600&h=600&fit=crop';
  const catFallback = 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop';
  
  try {
    // 犬の外部画像URLを置き換え
    console.log('Updating dog external image URLs...');
    execSync(
      `cd /Users/nishikawa/projects/elchika/pawmatch/api && npx wrangler d1 execute pawmatch-db --local --command "UPDATE pets SET image_url = '${dogFallback}' WHERE type = 'dog' AND image_url LIKE 'https://image.pet-home.jp%'"`,
      { stdio: 'pipe' }
    );
    
    // 猫の外部画像URLを置き換え
    console.log('Updating cat external image URLs...');
    execSync(
      `cd /Users/nishikawa/projects/elchika/pawmatch/api && npx wrangler d1 execute pawmatch-db --local --command "UPDATE pets SET image_url = '${catFallback}' WHERE type = 'cat' AND image_url LIKE 'https://image.pet-home.jp%'"`,
      { stdio: 'pipe' }
    );
    
    console.log('✅ External image URLs replaced successfully!');
    
    // 確認
    const result = execSync(
      'cd /Users/nishikawa/projects/elchika/pawmatch/api && npx wrangler d1 execute pawmatch-db --local --command "SELECT COUNT(*) as count FROM pets WHERE image_url LIKE \'https://image.pet-home.jp%\'"',
      { encoding: 'utf-8' }
    );
    console.log('\nRemaining external Pet-Home URLs:');
    console.log(result);
    
  } catch (error) {
    console.error('Error replacing external images:', error);
  }
}

// 実行
replaceExternalImages();