
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // ページを開く
    await page.goto('https://www.pet-home.jp/dogs/pn523715/', { waitUntil: 'networkidle' });
    
    // ページが完全に読み込まれるまで待機
    await page.waitForTimeout(3000);
    
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
        const ageMatch = ageText.match(/(\d+)/);
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
      await mainImage.screenshot({ path: '/Users/nishikawa/projects/elchika/pawmatch/data/images/dogs/originals/pethome_523715_temp.png' });
      console.log('Screenshot saved to /Users/nishikawa/projects/elchika/pawmatch/data/images/dogs/originals/pethome_523715_temp.png');
    } else {
      // 画像が見つからない場合は、画像エリア全体のスクリーンショット
      const photoArea = await page.$('.photo_area');
      if (photoArea) {
        await photoArea.screenshot({ path: '/Users/nishikawa/projects/elchika/pawmatch/data/images/dogs/originals/pethome_523715_temp.png' });
        console.log('Photo area screenshot saved');
      } else {
        // それでも見つからない場合は、ページの可視部分
        await page.screenshot({ path: '/Users/nishikawa/projects/elchika/pawmatch/data/images/dogs/originals/pethome_523715_temp.png' });
        console.log('Full page screenshot saved');
      }
    }
    
    // 結果をJSONファイルに保存
    const fs = require('fs');
    fs.writeFileSync('/Users/nishikawa/projects/elchika/pawmatch/data/images/dogs/originals/pethome_523715_temp.png.json', JSON.stringify(petInfo));
    
  } finally {
    await browser.close();
  }
})();
    