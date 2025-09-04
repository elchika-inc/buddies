#!/usr/bin/env node

/**
 * API経由で画像をアップロードするクライアント
 * GitHub Actionsから使用
 */

const fs = require('fs').promises;
const path = require('path');

// コマンドライン引数を解析
function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i].replace('--', '');
    const value = process.argv[i + 1];
    args[key] = value;
  }
  return args;
}

/**
 * APIに画像をアップロード
 */
async function uploadToAPI(apiUrl, apiKey, adminSecret, endpoint, data) {
  const response = await fetch(`${apiUrl}/api/admin/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'X-Admin-Secret': adminSecret
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * 画像ファイルをBase64エンコード
 */
async function encodeImageToBase64(filePath) {
  const buffer = await fs.readFile(filePath);
  return buffer.toString('base64');
}

/**
 * スクリーンショットをアップロード
 */
async function uploadScreenshot(config, petData, imagePath) {
  console.log(`📸 Uploading screenshot for ${petData.id}...`);
  
  const imageData = await encodeImageToBase64(imagePath);
  
  const result = await uploadToAPI(
    config.apiUrl,
    config.apiKey,
    config.adminSecret,
    'upload-screenshot',
    {
      petId: petData.id,
      petType: petData.type,
      imageData,
      captureMethod: petData.captureMethod || 'puppeteer',
      sourceUrl: petData.sourceUrl
    }
  );

  if (result.success) {
    console.log(`  ✅ Screenshot uploaded: ${result.urls.screenshot}`);
  } else {
    console.error(`  ❌ Failed: ${result.error}`);
  }

  return result;
}

/**
 * 変換済み画像をアップロード
 */
async function uploadConvertedImages(config, petData, jpegPath, webpPath) {
  console.log(`🔄 Uploading converted images for ${petData.id}...`);
  
  const uploadData = {
    petId: petData.id,
    petType: petData.type,
    targetFormats: []
  };

  // JPEG画像がある場合
  if (jpegPath && await fs.access(jpegPath).then(() => true).catch(() => false)) {
    const jpegData = await encodeImageToBase64(jpegPath);
    uploadData.targetFormats.push('jpeg');
    uploadData.imageData = jpegData; // 最初の画像データを使用
  }

  // WebP画像がある場合
  if (webpPath && await fs.access(webpPath).then(() => true).catch(() => false)) {
    const webpData = await encodeImageToBase64(webpPath);
    uploadData.targetFormats.push('webp');
    if (!uploadData.imageData) {
      uploadData.imageData = webpData;
    }
  }

  if (uploadData.targetFormats.length === 0) {
    console.log(`  ⚠️ No images to upload`);
    return { success: false, error: 'No images found' };
  }

  const result = await uploadToAPI(
    config.apiUrl,
    config.apiKey,
    config.adminSecret,
    'convert-image',
    uploadData
  );

  if (result.success) {
    console.log(`  ✅ Images uploaded: ${uploadData.targetFormats.join(', ')}`);
  } else {
    console.error(`  ❌ Failed: ${result.error}`);
  }

  return result;
}

/**
 * バッチアップロード（複数ペットを一括処理）
 */
async function batchUpload(config, batchFile, imageDir) {
  console.log(`📦 Starting batch upload...`);
  
  // バッチデータを読み込み
  const batchData = JSON.parse(await fs.readFile(batchFile, 'utf-8'));
  const results = [];

  // 各ペットの画像を準備
  for (const pet of batchData.pets || batchData) {
    const petResult = {
      petId: pet.id,
      petType: pet.type
    };

    try {
      // スクリーンショット
      const screenshotPath = path.join(imageDir, `${pet.id}-screenshot.png`);
      if (await fs.access(screenshotPath).then(() => true).catch(() => false)) {
        petResult.screenshot = {
          data: await encodeImageToBase64(screenshotPath),
          captureMethod: pet.captureMethod
        };
      }

      // JPEG画像
      const jpegPath = path.join(imageDir, `${pet.id}.jpg`);
      if (await fs.access(jpegPath).then(() => true).catch(() => false)) {
        petResult.jpeg = {
          data: await encodeImageToBase64(jpegPath)
        };
      }

      // WebP画像
      const webpPath = path.join(imageDir, `${pet.id}.webp`);
      if (await fs.access(webpPath).then(() => true).catch(() => false)) {
        petResult.webp = {
          data: await encodeImageToBase64(webpPath)
        };
      }

      results.push(petResult);
    } catch (error) {
      console.error(`  ❌ Error processing ${pet.id}: ${error.message}`);
    }
  }

  if (results.length === 0) {
    console.log('  ⚠️ No images found for batch upload');
    return;
  }

  // APIにバッチアップロード
  const response = await uploadToAPI(
    config.apiUrl,
    config.apiKey,
    config.adminSecret,
    'batch-upload',
    {
      batchId: batchData.batchId || `batch-${Date.now()}`,
      results
    }
  );

  console.log(`\n📊 Batch Upload Summary:`);
  console.log(`  ✅ Successful: ${response.successful}/${response.processed}`);
  console.log(`  ❌ Failed: ${response.failed}/${response.processed}`);

  if (response.results) {
    const failed = response.results.filter(r => !r.success);
    if (failed.length > 0) {
      console.log('\n❌ Failed uploads:');
      failed.forEach(f => {
        console.log(`  - ${f.petId}: ${f.error}`);
      });
    }
  }

  return response;
}

/**
 * メイン処理
 */
async function main() {
  const args = parseArgs();
  
  // 設定を読み込み
  const config = {
    apiUrl: process.env.API_URL || args.apiUrl || 'https://pawmatch-api.elchika.app',
    apiKey: process.env.API_KEY || args.apiKey,
    adminSecret: process.env.API_ADMIN_SECRET || args.adminSecret
  };

  if (!config.apiKey || !config.adminSecret) {
    console.error('❌ API_KEY and API_ADMIN_SECRET are required');
    process.exit(1);
  }

  const mode = args.mode || 'batch';
  
  console.log(`🚀 API Upload Client`);
  console.log(`📡 API URL: ${config.apiUrl}`);
  console.log(`🔧 Mode: ${mode}\n`);

  try {
    switch (mode) {
      case 'screenshot':
        // 単一スクリーンショットのアップロード
        if (!args.pet || !args.image) {
          throw new Error('--pet and --image are required for screenshot mode');
        }
        const petData = JSON.parse(await fs.readFile(args.pet, 'utf-8'));
        await uploadScreenshot(config, petData, args.image);
        break;

      case 'convert':
        // 変換済み画像のアップロード
        if (!args.pet) {
          throw new Error('--pet is required for convert mode');
        }
        const pet = JSON.parse(await fs.readFile(args.pet, 'utf-8'));
        await uploadConvertedImages(config, pet, args.jpeg, args.webp);
        break;

      case 'batch':
        // バッチアップロード
        if (!args.batch) {
          throw new Error('--batch is required for batch mode');
        }
        const imageDir = args.imageDir || './images';
        await batchUpload(config, args.batch, imageDir);
        break;

      default:
        throw new Error(`Unknown mode: ${mode}`);
    }

    console.log('\n✨ Upload completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// エラーハンドリング
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});