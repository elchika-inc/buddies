const { chromium } = require('playwright');

async function fetchLatestDogs() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Pet-Homeから最新の犬データを取得中...');
    
    // Pet-Homeの犬一覧ページにアクセス
    await page.goto('https://www.pet-home.jp/dogs/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // ペットリンクを直接取得
    const pets = await page.evaluate(() => {
      const items = [];
      // Pet-Homeの実際の構造に合わせて、個別ペットページへのリンクを取得
      const links = document.querySelectorAll('a[href*="/dogs/"][href*="/pn"]');
      
      const uniqueUrls = new Set();
      
      for (const link of links) {
        const url = link.href;
        
        // 重複URLをスキップ
        if (uniqueUrls.has(url)) continue;
        uniqueUrls.add(url);
        
        // URLからIDを抽出
        const idMatch = url.match(/pn(\d+)/);
        if (!idMatch) continue;
        
        const id = idMatch[1];
        
        // テキストから名前を取得（リンクテキストまたは近くの要素）
        let name = link.textContent.trim();
        if (!name || name.length === 0) {
          // 親要素や兄弟要素から名前を探す
          const parent = link.closest('div, article, li');
          if (parent) {
            const nameEl = parent.querySelector('h2, h3, h4, .title, .name');
            name = nameEl ? nameEl.textContent.trim() : `犬ID:${id}`;
          }
        }
        
        items.push({
          id: id,
          name: name || `犬ID:${id}`,
          sourceUrl: url,
          type: 'dog'
        });
        
        // 10件まで
        if (items.length >= 10) break;
      }
      
      return items;
    });
    
    console.log(`✅ ${pets.length}件の犬データを取得しました`);
    
    // GitHub Actions用のJSON形式で出力
    const jsonString = JSON.stringify(pets);
    console.log('\n📋 GitHub Actions用のペットデータ:');
    console.log(jsonString);
    
    return pets;
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// 実行
fetchLatestDogs()
  .then(pets => {
    console.log('\n✅ 処理完了');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 処理失敗:', error);
    process.exit(1);
  });