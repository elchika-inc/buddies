const { chromium } = require('playwright');
const sharp = require('sharp');
const fs = require('fs').promises;

async function testScreenshot() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const testPet = {
    id: "523773",
    name: "イタリアン・コルソ・ドッグ",
    sourceUrl: "https://www.pet-home.jp/dogs/kanagawa/pn523773/",
    type: "dog"
  };
  
  try {
    console.log(`📸 Testing screenshot for ${testPet.name}`);
    
    // ページに移動
    await page.goto(testPet.sourceUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
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
          console.log(`  ✓ Found pet image with selector: ${selector}`);
          console.log(`    Image URL: ${src}`);
          
          // altテキストも確認
          const alt = await element.getAttribute('alt');
          console.log(`    Alt text: ${alt}`);
          break;
        }
      }
    }
    
    if (imageElement) {
      // スクリーンショットを撮影
      const screenshotBuffer = await imageElement.screenshot({
        type: 'png',
        omitBackground: true
      });
      
      console.log(`  ✓ Screenshot captured: ${(screenshotBuffer.length / 1024).toFixed(1)}KB`);
      
      // JPEG変換
      const jpegBuffer = await sharp(screenshotBuffer)
        .jpeg({ quality: 95, progressive: true })
        .toBuffer();
      
      console.log(`  ✓ JPEG converted: ${(jpegBuffer.length / 1024).toFixed(1)}KB`);
      
      // ローカルに保存してテスト
      await fs.writeFile(`test-pet-${testPet.id}.jpg`, jpegBuffer);
      console.log(`  ✓ Saved to test-pet-${testPet.id}.jpg`);
      
    } else {
      console.log('  ❌ No pet image found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testScreenshot();