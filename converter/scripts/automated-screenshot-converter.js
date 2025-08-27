import { chromium } from 'playwright';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// R2クライアントの設定
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

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

// スクリーンショット取得と画像処理
async function captureAndConvert(page, pet) {
  const startTime = Date.now();
  const results = {
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
    
    // R2にアップロード
    const jpegKey = `pets/${pet.type}s/${pet.id}/original.jpg`;
    const webpKey = `pets/${pet.type}s/${pet.id}/optimized.webp`;
    
    // JPEG アップロード
    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: jpegKey,
      Body: jpegBuffer,
      ContentType: 'image/jpeg',
      Metadata: {
        'pet-id': pet.id,
        'pet-type': pet.type,
        'captured-at': new Date().toISOString()
      }
    }));
    
    // WebP アップロード
    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: webpKey,
      Body: webpBuffer,
      ContentType: 'image/webp',
      Metadata: {
        'pet-id': pet.id,
        'pet-type': pet.type,
        'captured-at': new Date().toISOString()
      }
    }));
    
    console.log(`  ☁️ Uploaded both formats to R2`);
    
    results.success = true;
    results.jpegUrl = `https://${process.env.R2_BUCKET_NAME}.r2.dev/${jpegKey}`;
    results.webpUrl = `https://${process.env.R2_BUCKET_NAME}.r2.dev/${webpKey}`;
    results.jpegSize = jpegBuffer.length;
    results.webpSize = webpBuffer.length;
    results.duration = Date.now() - startTime;
    
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    results.error = error.message;
  }
  
  return results;
}

// メイン処理
async function main() {
  const args = parseArgs();
  
  if (!args.batchFile) {
    console.error('❌ Error: --batch-file parameter is required');
    process.exit(1);
  }
  
  const batchId = args.batchId || `batch-${Date.now()}`;
  
  // ペットデータを読み込み
  const petsData = await fs.readFile(args.batchFile, 'utf-8');
  const pets = JSON.parse(petsData);
  
  console.log(`🚀 Automated Image Pipeline`);
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
    userAgent: 'Mozilla/5.0 (compatible; PawMatch-Screenshot-Bot/1.0)'
  });
  
  const page = await context.newPage();
  const results = [];
  
  // 各ペットを処理
  for (const pet of pets) {
    const result = await captureAndConvert(page, pet);
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
  
  // 結果をJSONファイルに保存
  const resultsPath = path.join(logDir, 'results.json');
  await fs.writeFile(resultsPath, JSON.stringify({
    batchId,
    timestamp: new Date().toISOString(),
    totalProcessed: pets.length,
    successful,
    failed,
    results
  }, null, 2));
  
  console.log(`\n✨ Pipeline completed!`);
  console.log(`📂 Results saved to: ${resultsPath}`);
  
  // 成功した場合は0、失敗がある場合は1を返す
  process.exit(failed > 0 ? 1 : 0);
}

// エラーハンドリング
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});