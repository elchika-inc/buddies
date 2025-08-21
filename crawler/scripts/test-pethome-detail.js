#!/usr/bin/env node
/**
 * Pet-Homeの詳細ページ構造をテストするスクリプト
 */

async function testPetHomeDetail() {
  try {
    // 特定のペットの詳細ページをテスト
    const petUrl = 'https://www.pet-home.jp/dogs/tokyo/pn523701/';
    console.log(`Fetching detail page: ${petUrl}\n`);
    
    const response = await fetch(petUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
      }
    });
    
    if (!response.ok) {
      console.error(`HTTP ${response.status}: ${response.statusText}`);
      return;
    }
    
    const html = await response.text();
    console.log(`Response length: ${html.length} bytes\n`);
    
    // ペットの名前を探す
    const namePattern = /<h1[^>]*>([^<]+)<\/h1>/;
    const nameMatch = html.match(namePattern);
    if (nameMatch) {
      console.log(`Pet Name: ${nameMatch[1].trim()}`);
    }
    
    // 基本情報を探す
    const infoPatterns = {
      '犬種': /犬種[：:]\s*([^<\n]+)/,
      '年齢': /年齢[：:]\s*([^<\n]+)/,
      '性別': /性別[：:]\s*([^<\n]+)/,
      '募集地域': /募集地域[：:]\s*([^<\n]+)/,
      '掲載者': /掲載者[：:]\s*([^<\n]+)/,
    };
    
    console.log('\n基本情報:');
    for (const [key, pattern] of Object.entries(infoPatterns)) {
      const match = html.match(pattern);
      if (match) {
        console.log(`  ${key}: ${match[1].trim()}`);
      }
    }
    
    // 画像URLを探す
    const mainImagePattern = /<img[^>]+class="[^"]*main[^"]*"[^>]+src="([^"]+)"/;
    const mainImageMatch = html.match(mainImagePattern);
    if (mainImageMatch) {
      console.log(`\nMain Image: ${mainImageMatch[1]}`);
    }
    
    // その他の画像
    const imgPattern = /<img[^>]+src="([^"]+pet[^"]+)"/g;
    const imgMatches = [...html.matchAll(imgPattern)];
    if (imgMatches.length > 0) {
      console.log(`\nOther pet images (${imgMatches.length}):`);
      imgMatches.slice(0, 3).forEach(match => {
        console.log(`  - ${match[1]}`);
      });
    }
    
    // 説明文を探す
    const descPattern = /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/;
    const descMatch = html.match(descPattern);
    if (descMatch) {
      const desc = descMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 200);
      console.log(`\n説明: ${desc}...`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testPetHomeDetail();