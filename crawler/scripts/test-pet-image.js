const { chromium } = require('playwright');

async function testPetImage(url) {
  const browser = await chromium.launch({ headless: true }); // ヘッドレスモード
  const page = await browser.newPage();
  
  try {
    console.log(`🔍 ページを確認中: ${url}`);
    
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // ページが完全に読み込まれるまで待機
    await page.waitForTimeout(3000);
    
    // ペットの画像を探す
    const imageInfo = await page.evaluate(() => {
      const results = [];
      
      // すべての画像要素を確認
      const images = document.querySelectorAll('img');
      images.forEach((img, index) => {
        // 画像のsrcとaltを取得
        const src = img.src;
        const alt = img.alt;
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        const parentClass = img.parentElement?.className || '';
        
        // ペット画像の可能性が高いものを判定
        const isPetImage = 
          src.includes('pet-home.jp/img/pet/') || // ペット画像のパス
          src.includes('/photo/') ||                // 写真フォルダ
          parentClass.includes('photo') ||          // 写真エリア
          width > 200;                              // 大きい画像
        
        results.push({
          index,
          src,
          alt,
          width,
          height,
          parentClass,
          isPetImage
        });
      });
      
      return results;
    });
    
    console.log('\n📸 見つかった画像:');
    imageInfo.forEach(img => {
      if (img.isPetImage) {
        console.log(`  ✅ [ペット画像の可能性] ${img.index}: ${img.src}`);
        console.log(`     サイズ: ${img.width}x${img.height}, alt: ${img.alt}`);
      } else {
        console.log(`  ❌ [その他] ${img.index}: ${img.src.substring(0, 50)}...`);
      }
    });
    
    // メインのペット画像を特定
    const mainPetImage = imageInfo.find(img => 
      img.isPetImage && img.width > 200
    );
    
    if (mainPetImage) {
      console.log('\n🎯 メインペット画像を発見:');
      console.log(`  URL: ${mainPetImage.src}`);
      console.log(`  サイズ: ${mainPetImage.width}x${mainPetImage.height}`);
      
      // 実際の画像をダウンロードして確認
      const response = await page.goto(mainPetImage.src);
      const buffer = await response.body();
      console.log(`  ファイルサイズ: ${(buffer.length / 1024).toFixed(1)}KB`);
    }
    
    // ヘッドレスモードでは待機不要
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await browser.close();
  }
}

// テスト実行
const testUrl = 'https://www.pet-home.jp/dogs/tochigi/pn523772/';
testPetImage(testUrl);