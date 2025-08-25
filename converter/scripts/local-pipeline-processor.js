const { chromium } = require('playwright');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// コマンドライン引数を解析
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  
  for (const arg of args) {
    if (arg.startsWith('--batch-file=')) {
      params.batchFile = arg.split('=')[1];
    } else if (arg.startsWith('--batch-id=')) {
      params.batchId = arg.split('=')[1];
    }
  }
  
  return params;
}

// ローカルストレージに保存（R2の代替）
async function saveToLocalStorage(pet, jpegBuffer, webpBuffer) {
  const storageDir = path.join(__dirname, '../local-storage/images', `${pet.type}s`, pet.id);
  await fs.mkdir(storageDir, { recursive: true });
  
  const jpegPath = path.join(storageDir, 'original.jpg');
  const webpPath = path.join(storageDir, 'optimized.webp');
  
  await fs.writeFile(jpegPath, jpegBuffer);
  await fs.writeFile(webpPath, webpBuffer);
  
  // ローカルURLを返す（実際のR2 URLの代わり）
  return {
    jpegUrl: `file://${jpegPath}`,
    webpUrl: `file://${webpPath}`
  };
}

// スクリーンショット取得と画像処理
async function processImage(page, pet) {
  const startTime = Date.now();
  const result = {
    pet_id: pet.id,
    pet_type: pet.type,
    success: false
  };
  
  try {
    console.log(`📸 Processing ${pet.id} - ${pet.name}`);
    
    // ページに移動
    await page.goto(pet.sourceUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    // ページが安定するまで待機
    await page.waitForTimeout(2000);
    
    // メイン画像を探す
    const selectors = [
      '.main_thumb.img_container img[src*="image.pet-home.jp"]',
      '.main_thumb img[alt]',
      '.img_container img[src*="user_file"]',
      '.photo_area img[src*="image.pet-home.jp"]',
      'img[src*="_th320.jpg"]',
      'img[src*="_th320.jpeg"]'
    ];
    
    let imageElement = null;
    for (const selector of selectors) {
      const element = await page.$(selector);
      if (element) {
        const src = await element.getAttribute('src');
        if (src && !src.includes('ui_img.png') && !src.includes('global_images')) {
          imageElement = element;
          console.log(`  ✓ Found image: ${selector}`);
          break;
        }
      }
    }
    
    let screenshotBuffer;
    if (imageElement) {
      screenshotBuffer = await imageElement.screenshot({ type: 'png' });
    } else {
      console.log('  ⚠ No specific image found, capturing page area');
      screenshotBuffer = await page.screenshot({
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 200, width: 800, height: 600 }
      });
    }
    
    // 画像処理: リサイズとフォーマット変換
    const sharpInstance = sharp(screenshotBuffer)
      .resize(800, 800, { 
        fit: 'inside',
        withoutEnlargement: true
      });
    
    // JPEG変換
    const jpegBuffer = await sharpInstance
      .clone()
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();
    
    // WebP変換
    const webpBuffer = await sharpInstance
      .clone()
      .webp({ quality: 80 })
      .toBuffer();
    
    console.log(`  📦 Converted - JPEG: ${(jpegBuffer.length / 1024).toFixed(1)}KB, WebP: ${(webpBuffer.length / 1024).toFixed(1)}KB`);
    console.log(`  💾 WebP savings: ${(100 - (webpBuffer.length / jpegBuffer.length * 100)).toFixed(1)}%`);
    
    // ローカルストレージに保存
    const urls = await saveToLocalStorage(pet, jpegBuffer, webpBuffer);
    
    console.log(`  ✅ Saved to local storage`);
    
    result.success = true;
    result.jpegUrl = urls.jpegUrl;
    result.webpUrl = urls.webpUrl;
    result.jpegSize = jpegBuffer.length;
    result.webpSize = webpBuffer.length;
    result.duration = Date.now() - startTime;
    
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    result.error = error.message;
  }
  
  return result;
}

// メイン処理
async function main() {
  const args = parseArgs();
  
  if (!args.batchFile) {
    console.error('❌ Error: --batch-file parameter is required');
    process.exit(1);
  }
  
  const batchId = args.batchId || `local-${Date.now()}`;
  
  // ペットデータを読み込み
  const petsData = await fs.readFile(args.batchFile, 'utf-8');
  const pets = JSON.parse(petsData);
  
  console.log(`🚀 Local Pipeline Processor`);
  console.log(`📋 Batch ID: ${batchId}`);
  console.log(`📦 Processing ${pets.length} pets\n`);
  
  // ログディレクトリを作成
  const logDir = path.join(__dirname, '../logs');
  await fs.mkdir(logDir, { recursive: true });
  
  // ブラウザを起動
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (compatible; PawMatch-Local-Bot/1.0)'
  });
  
  const page = await context.newPage();
  const results = [];
  
  // 各ペットを処理
  for (const pet of pets) {
    const result = await processImage(page, pet);
    results.push(result);
    
    // レート制限対策
    if (pets.indexOf(pet) < pets.length - 1) {
      await page.waitForTimeout(1000);
    }
  }
  
  await browser.close();
  
  // 結果サマリー
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('\n📊 Results Summary:');
  console.log(`  ✅ Successful: ${successful}/${pets.length}`);
  console.log(`  ❌ Failed: ${failed}/${pets.length}`);
  
  if (successful > 0) {
    const totalJpegSize = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.jpegSize, 0);
    const totalWebpSize = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.webpSize, 0);
    
    console.log(`  📦 Total JPEG size: ${(totalJpegSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  📦 Total WebP size: ${(totalWebpSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  💾 Total savings: ${(100 - (totalWebpSize / totalJpegSize * 100)).toFixed(1)}%`);
  }
  
  // 結果をJSONファイルに保存（Converterが読み込む）
  const resultsPath = path.join(logDir, 'results.json');
  await fs.writeFile(resultsPath, JSON.stringify({
    batchId,
    timestamp: new Date().toISOString(),
    results
  }, null, 2));
  
  console.log(`\n✨ Processing completed!`);
  console.log(`📂 Results saved to: ${resultsPath}`);
  console.log(`📂 Images saved to: ${path.join(__dirname, '../local-storage/images')}`);
}

// エラーハンドリング
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});