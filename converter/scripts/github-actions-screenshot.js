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
    if (arg.startsWith('--batch=')) {
      params.batch = arg.split('=')[1];
    } else if (arg.startsWith('--batch-id=')) {
      params.batchId = arg.split('=')[1];
    }
  }
  
  return params;
}

// 単一のペットのスクリーンショットを取得
async function captureScreenshot(page, pet) {
  const startTime = Date.now();
  
  try {
    console.log(`📸 Processing ${pet.id} - ${pet.name}`);
    
    // ページに移動
    try {
      await page.goto(pet.sourceUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
    } catch (navigationError) {
      console.warn(`  ⚠️ Navigation error for ${pet.id}: ${navigationError.message}`);
      console.log(`  🔄 Skipping ${pet.id} due to navigation failure`);
      return {
        petId: pet.id,
        success: false,
        error: `Navigation failed: ${navigationError.message}`,
        skipped: true,
        duration: Date.now() - startTime
      };
    }
    
    // ページが安定するまで待機
    await page.waitForTimeout(2000);
    
    // メイン画像を探す（Pet-Homeの実際の構造に合わせて更新）
    const selectors = [
      '.main_thumb.img_container img[src*="image.pet-home.jp"]',  // メインサムネイル内の実際の画像
      '.main_thumb img[alt]',                                      // altタグ付きのメイン画像
      '.img_container img[src*="user_file"]',                      // ユーザーファイル画像
      '.photo_area img[src*="image.pet-home.jp"]',               // 写真エリアの画像
      'img[src*="_th320.jpg"]',                                    // 320pxサムネイル
      'img[src*="_th320.jpeg"]'                                    // 320pxサムネイル(jpeg)
    ];
    
    let imageElement = null;
    for (const selector of selectors) {
      const element = await page.$(selector);
      if (element) {
        // ui_img.pngなどのUIバッジを除外
        const src = await element.getAttribute('src');
        if (src && !src.includes('ui_img.png') && !src.includes('global_images')) {
          imageElement = element;
          console.log(`  ✓ Found pet image with selector: ${selector}`);
          console.log(`    Image URL: ${src}`);
          break;
        }
      }
    }
    
    if (!imageElement) {
      // 画像が見つからない場合は、より幅広いセレクタを試す
      console.log('  ⚠ No specific image found, trying broader selectors');
      
      // 任意の画像要素を探す（ただしヘッダーやフッターは除く）
      const allImages = await page.$$('main img, article img, .content img, img');
      if (allImages.length > 0) {
        // 最初の画像を使用
        imageElement = allImages[0];
        console.log(`  ✓ Found ${allImages.length} images, using the first one`);
      }
    }
    
    if (!imageElement) {
      // それでも見つからない場合は、ページ全体のスクリーンショット
      console.log('  ⚠ No images found, capturing full page');
      const screenshotBuffer = await page.screenshot({
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 200, width: 800, height: 600 }
      });
      
      // 直接処理に進む
      const uploadResult = await processAndUploadImage(pet, screenshotBuffer);
      const duration = Date.now() - startTime;
      console.log(`  ✅ Completed with full page capture in ${duration}ms`);
      
      return {
        petId: pet.id,
        success: true,
        duration,
        fallbackCapture: true,
        ...uploadResult
      };
    }
    
    // スクリーンショットを撮影
    const screenshotBuffer = await imageElement.screenshot({
      type: 'png',
      omitBackground: true
    });
    
    // 画像を処理してR2にアップロード
    const uploadResult = await processAndUploadImage(pet, screenshotBuffer);
    
    const duration = Date.now() - startTime;
    console.log(`  ✅ Completed in ${duration}ms`);
    
    return {
      petId: pet.id,
      success: true,
      duration,
      ...uploadResult
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`  ❌ Error: ${error.message}`);
    console.log(`  🔄 Skipping ${pet.id} and continuing`);
    
    return {
      petId: pet.id,
      success: false,
      error: error.message,
      duration,
      skipped: true
    };
  }
}

// 画像を処理してR2にアップロード（JPEGのみ）
async function processAndUploadImage(pet, screenshotBuffer) {
  const results = {};
  
  try {
    // JPEG変換（高品質）
    const jpegBuffer = await sharp(screenshotBuffer)
      .jpeg({ quality: 95, progressive: true })
      .toBuffer();
    
    console.log(`  📦 Image size - JPEG: ${(jpegBuffer.length / 1024).toFixed(1)}KB`);
    
    // R2にJPEGをアップロード
    const jpegKey = `pets/${pet.type}s/${pet.id}/original.jpg`;
    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: jpegKey,
      Body: jpegBuffer,
      ContentType: 'image/jpeg',
      Metadata: {
        'pet-id': pet.id,
        'pet-type': pet.type,
        'captured-at': new Date().toISOString()
        // 日本語文字はヘッダーに含めないようにする
      }
    }));
    results.jpegUrl = `https://${process.env.R2_BUCKET_NAME}.r2.dev/${jpegKey}`;
    results.jpegSize = jpegBuffer.length;
    
    console.log(`  ☁️ Uploaded JPEG to R2 successfully`);
    
    // WebP変換はWorkersで行うため、フラグを設定
    results.webpPending = true;
    
  } catch (error) {
    console.error(`  ❌ Upload error: ${error.message}`);
    throw error;
  }
  
  return results;
}

// バッチ処理のメイン関数
async function processBatch(petsData, batchId) {
  const pets = JSON.parse(petsData);
  console.log(`\n🚀 Starting batch processing`);
  console.log(`📋 Batch ID: ${batchId}`);
  console.log(`📦 Processing ${pets.length} pets\n`);
  
  // ログディレクトリを作成
  const logDir = path.join(__dirname, '../logs');
  await fs.mkdir(logDir, { recursive: true });
  
  // ブラウザを起動
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu'
    ]
  });
  
  const results = [];
  let successCount = 0;
  let failureCount = 0;
  
  try {
    // コンテキストとページを作成
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // 各ペットを順次処理
    for (let i = 0; i < pets.length; i++) {
      const pet = pets[i];
      console.log(`\n[${i + 1}/${pets.length}] Processing ${pet.name}`);
      
      try {
        const result = await captureScreenshot(page, pet);
        results.push(result);
        
        if (result.success) {
          successCount++;
        } else if (result.skipped) {
          console.log(`  ⏭️ Skipped ${pet.id} - continuing with next pet`);
          failureCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        console.error(`  ❌ Unexpected error for ${pet.id}: ${error.message}`);
        console.log(`  ⏭️ Continuing with next pet`);
        results.push({
          petId: pet.id,
          success: false,
          error: error.message,
          skipped: true
        });
        failureCount++;
      }
      
      // ペット間で短い待機（レート制限対策）
      if (i < pets.length - 1) {
        await page.waitForTimeout(1000);
      }
    }
    
    await context.close();
    
  } finally {
    await browser.close();
  }
  
  // 結果をログファイルに保存
  const logFile = path.join(logDir, `batch-${batchId}-${Date.now()}.json`);
  await fs.writeFile(logFile, JSON.stringify({
    batchId,
    timestamp: new Date().toISOString(),
    totalPets: pets.length,
    successCount,
    failureCount,
    results
  }, null, 2));
  
  // サマリーを表示
  console.log('\n' + '='.repeat(50));
  console.log('📊 Batch Processing Summary');
  console.log('='.repeat(50));
  console.log(`✅ Success: ${successCount}/${pets.length}`);
  console.log(`❌ Failed: ${failureCount}/${pets.length}`);
  console.log(`📁 Log saved to: ${logFile}`);
  
  // GitHub Actions の output として結果を出力
  const output = JSON.stringify({ successCount, failureCount, results });
  console.log(`::set-output name=results::${output}`);
  
  return results;
}

// メイン実行
async function main() {
  try {
    const { batch, batchId = 'unknown' } = parseArgs();
    
    if (!batch) {
      throw new Error('No batch data provided. Use --batch=\'[...]\'');
    }
    
    const results = await processBatch(batch, batchId);
    
    // エラーがあってもワークフローを継続するため、常に exit code 0 を返す
    // ログで成功/失敗を確認できる
    const successRate = results.filter(r => r.success).length / results.length * 100;
    console.log(`\n🎯 Success rate: ${successRate.toFixed(1)}%`);
    process.exit(0);
    
  } catch (error) {
    console.error('Fatal error:', error);
    // エラーがあってもワークフローを継続するため exit code 0 を返す
    process.exit(0);
  }
}

// 実行
main();