#!/usr/bin/env node
/**
 * Pet-Homeのページ構造をテストするスクリプト
 */

async function testPetHome() {
  try {
    // 犬のリストページをテスト
    const dogUrl = 'https://www.pet-home.jp/dogs/';
    console.log(`Fetching: ${dogUrl}`);
    
    const response = await fetch(dogUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.error(`HTTP ${response.status}: ${response.statusText}`);
      return;
    }
    
    const html = await response.text();
    console.log(`Response length: ${html.length} bytes`);
    
    // ペットIDのパターンを探す
    const petIdPattern = /\/dogs\/[^\/]+\/pn(\d+)\//g;
    const matches = html.match(petIdPattern) || [];
    console.log(`Found ${matches.length} pet IDs`);
    
    if (matches.length > 0) {
      console.log('Sample pet IDs:');
      matches.slice(0, 5).forEach(match => {
        const id = match.match(/pn(\d+)/)[1];
        console.log(`  - pn${id}`);
      });
    }
    
    // タイトルパターンを探す
    const titlePattern = /<h3[^>]*>([^<]+)<\/h3>/g;
    const titles = html.match(titlePattern) || [];
    console.log(`\nFound ${titles.length} titles`);
    
    if (titles.length > 0) {
      console.log('Sample names:');
      titles.slice(0, 5).forEach(title => {
        const name = title.replace(/<[^>]+>/g, '').trim();
        console.log(`  - ${name}`);
      });
    }
    
    // 画像URLパターンを探す
    const imgPattern = /<img[^>]+src="([^"]+)"/g;
    const imgMatches = [...html.matchAll(imgPattern)];
    const petImages = imgMatches
      .map(m => m[1])
      .filter(url => url.includes('/img/') || url.includes('pet'));
    
    console.log(`\nFound ${petImages.length} pet images`);
    if (petImages.length > 0) {
      console.log('Sample image URLs:');
      petImages.slice(0, 3).forEach(url => {
        console.log(`  - ${url}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testPetHome();