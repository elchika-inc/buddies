#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// 取得したクローラーデータの型
interface CrawlerCat {
  id: string;
  name: string;
  breed: string;
  age: number;
  gender: string;
  coatLength: string;
  color: string;
  weight?: number;
  prefecture: string;
  city: string;
  location: string;
  description: string;
  personality: string[];
  medicalInfo: string;
  careRequirements: string[];
  imageUrl: string;
  shelterName: string;
  shelterContact: string;
  adoptionFee?: number;
  isNeutered?: boolean;
  isVaccinated?: boolean;
  isFIVFeLVTested?: boolean;
  socialLevel: string;
  indoorOutdoor: string;
  goodWithMultipleCats?: boolean;
  groomingRequirements: string;
  vocalizationLevel: string;
  activityTime: string;
  playfulness: string;
  createdAt: string;
  sourceUrl: string;
}

// アプリで使用するCat型
interface AppCat {
  id: string;
  name: string;
  breed: string;
  age: number;
  gender: '男の子' | '女の子' | '不明';
  coatLength: string;
  color: string;
  weight: number;
  location: string;
  prefecture?: string;
  city?: string;
  description: string;
  personality: string[];
  medicalInfo: string;
  careRequirements: string[];
  imageUrl: string;
  shelterName: string;
  shelterContact: string;
  adoptionFee: number;
  isNeutered: boolean;
  isVaccinated: boolean;
  isFIVFeLVTested: boolean;
  socialLevel: string;
  indoorOutdoor: string;
  goodWithMultipleCats: boolean;
  groomingRequirements: string;
  vocalizationLevel: string;
  activityTime: string;
  playfulness: string;
  createdAt: string;
  sourceUrl?: string;
}

// 地域マッピング
const regionMapping: Record<string, { prefecture: string; city?: string }> = {
  'hukuoka': { prefecture: '福岡県', city: '福岡市' },
  'fukuoka': { prefecture: '福岡県', city: '福岡市' },
  'tokyo': { prefecture: '東京都', city: '新宿区' },
  'kochi': { prefecture: '高知県', city: '高知市' },
  'okayama': { prefecture: '岡山県', city: '岡山市' },
  'kanagawa': { prefecture: '神奈川県', city: '横浜市' },
  'kagawa': { prefecture: '香川県', city: '高松市' },
  'osaka': { prefecture: '大阪府', city: '大阪市' },
  'kyoto': { prefecture: '京都府', city: '京都市' },
  'aichi': { prefecture: '愛知県', city: '名古屋市' },
  'hyogo': { prefecture: '兵庫県', city: '神戸市' },
};

// プレースホルダー画像のリスト
const placeholderImages = [
  'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=500&h=600&fit=crop', // 三毛猫
  'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=500&h=600&fit=crop', // 白猫
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&h=600&fit=crop', // 茶トラ
  'https://images.unsplash.com/photo-1571566882372-1598d88abd90?w=500&h=600&fit=crop', // 黒猫
  'https://images.unsplash.com/photo-1595433707802-6b2626ef1c91?w=500&h=600&fit=crop', // 灰色猫
  'https://images.unsplash.com/photo-1606214174585-fe31582cd601?w=500&h=600&fit=crop', // キジトラ
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=600&fit=crop', // サビ猫
  'https://images.unsplash.com/photo-1610539264216-a3d2e2b72a3f?w=500&h=600&fit=crop', // 長毛猫
];

function convertCrawlerDataToApp(crawlerData: CrawlerCat[], startIndex = 0): AppCat[] {
  return crawlerData.map((crawler, index): AppCat => {
    // URLから地域情報を抽出
    const regionMatch = crawler.sourceUrl.match(/\/cats\/([^\/]+)\//);
    const regionKey = regionMatch?.[1] || 'tokyo';
    const locationInfo = regionMapping[regionKey] || { prefecture: '東京都', city: '新宿区' };
    
    // 名前をクリーンアップ
    const cleanName = crawler.name
      .replace(/「|」/g, '')
      .replace(/\.{3}.*$/, '') // ...以降を削除
      .replace(/\s*-\s*猫の里親募集\(\d+\)/, '') // 余分な文字を削除
      .replace(/[県府]$/, '') // 末尾の県府を削除
      .trim();

    // 猫の特性から詳細情報を推測
    const personalities = [];
    if (cleanName.includes('甘え') || cleanName.includes('甘い')) personalities.push('甘えん坊');
    if (cleanName.includes('元気') || cleanName.includes('活発')) personalities.push('元気', '遊び好き');
    if (cleanName.includes('おとなしい') || cleanName.includes('静か')) personalities.push('おとなしい', '静か');
    if (cleanName.includes('人懐っこい') || cleanName.includes('フレンドリー')) personalities.push('人懐っこい');
    if (cleanName.includes('子猫') || cleanName.includes('3ヶ月')) personalities.push('好奇心旺盛', '遊び好き');
    
    // デフォルトの性格を追加
    if (personalities.length === 0) {
      personalities.push('人懐っこい', '甘えん坊');
    }

    // 年齢を推測
    let age = 2; // デフォルト
    if (cleanName.includes('子猫') || cleanName.includes('3ヶ月')) age = 0.3;
    else if (cleanName.includes('若い') || cleanName.includes('1歳')) age = 1;
    else if (cleanName.includes('成猫')) age = 3;
    else if (cleanName.includes('シニア') || cleanName.includes('老')) age = 8;

    return {
      id: crawler.id,
      name: cleanName || `猫ちゃん${crawler.id}`,
      breed: crawler.breed || '雑種',
      age: age,
      gender: crawler.gender === '男の子' ? '男の子' : 
              crawler.gender === '女の子' ? '女の子' : 
              cleanName.includes('くん') ? '男の子' :
              cleanName.includes('ちゃん') ? '女の子' : '不明',
      coatLength: crawler.coatLength || '短毛',
      color: crawler.color || (
        cleanName.includes('茶') ? '茶トラ' :
        cleanName.includes('白') ? '白' :
        cleanName.includes('黒') || cleanName.includes('クロ') ? '黒' :
        cleanName.includes('三毛') ? '三毛' : 
        cleanName.includes('キジ') ? 'キジトラ' : '茶白'
      ),
      weight: crawler.weight || (age < 1 ? 2.5 : age > 5 ? 4.5 : 3.8),
      location: `${locationInfo.prefecture}${locationInfo.city}`,
      prefecture: locationInfo.prefecture,
      city: locationInfo.city,
      description: crawler.description && crawler.description.length > 50 
        ? crawler.description.substring(0, 200) + '...'
        : generateDescription(cleanName, age, personalities[0] || '人懐っこい'),
      personality: personalities,
      medicalInfo: crawler.medicalInfo || 'ワクチン接種済み、健康チェック済み',
      careRequirements: crawler.careRequirements.length > 0 
        ? crawler.careRequirements 
        : ['完全室内飼い', '定期健診', '愛情たっぷり'],
      imageUrl: crawler.imageUrl || placeholderImages[(startIndex + index) % placeholderImages.length],
      shelterName: crawler.shelterName || `${locationInfo.prefecture}動物保護センター`,
      shelterContact: crawler.shelterContact || 'pethome@example.com',
      adoptionFee: crawler.adoptionFee || 25000,
      isNeutered: crawler.isNeutered ?? true,
      isVaccinated: crawler.isVaccinated ?? true,
      isFIVFeLVTested: crawler.isFIVFeLVTested ?? true,
      socialLevel: crawler.socialLevel || '人懐っこい',
      indoorOutdoor: crawler.indoorOutdoor || '完全室内',
      goodWithMultipleCats: crawler.goodWithMultipleCats ?? true,
      groomingRequirements: crawler.groomingRequirements || '低',
      vocalizationLevel: crawler.vocalizationLevel || '普通',
      activityTime: crawler.activityTime || 'どちらでも',
      playfulness: crawler.playfulness || '中',
      createdAt: crawler.createdAt,
      sourceUrl: crawler.sourceUrl
    };
  });
}

function generateDescription(name: string, age: number, personality: string): string {
  const ageDesc = age < 1 ? '元気いっぱいの子猫' :
                  age < 3 ? '若くて活発な猫' :
                  age < 6 ? '落ち着いた成猫' : '穏やかなシニア猫';
  
  const descriptions = [
    `${ageDesc}の${name}です。${personality}で、新しい家族を待っています。`,
    `${personality}な性格の${name}ちゃんです。${ageDesc}で、とても愛らしい子です。`,
    `${name}は${ageDesc}です。${personality}で、きっと素敵な家族の一員になってくれるでしょう。`
  ];
  
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

async function main() {
  const inputFile = process.argv[2] || '/Users/nishikawa/projects/elchika/pawmatch/crawler/output/cat-data-2025-08-18T08-09-25-237Z.json';
  
  if (!inputFile) {
    console.error('Usage: npm run convert-data <input-file>');
    process.exit(1);
  }

  try {
    console.log('📋 Converting crawler data to app format...');
    console.log('Input file:', inputFile);
    
    // クローラーデータを読み込み
    const crawlerData = JSON.parse(readFileSync(inputFile, 'utf8'));
    const cats: CrawlerCat[] = crawlerData.data;
    
    console.log(`Found ${cats.length} cats in crawler data`);
    
    // アプリ形式に変換（最初の10件のみ）
    const appCats = convertCrawlerDataToApp(cats.slice(0, 10));
    
    // TypeScriptファイルとして出力
    const outputContent = `import { Cat } from '@/types/cat'
import { migrateAllCatData } from '@/utils/dataMigration'

// 🐱 実際のペットのおうちサイトから取得した猫データ
// 取得日時: ${crawlerData.metadata.crawledAt}
// ソース: ${crawlerData.metadata.source}
const rawRealCats: Cat[] = ${JSON.stringify(appCats, null, 2)}

// データマイグレーションを実行して最新の形式に変換
export const cats = migrateAllCatData(rawRealCats)
`;
    
    // アプリの猫データファイルに書き出し
    const outputFile = '/Users/nishikawa/projects/elchika/pawmatch/app/src/data/cat/cats.ts';
    writeFileSync(outputFile, outputContent, 'utf8');
    
    console.log('✅ Conversion completed!');
    console.log(`Output file: ${outputFile}`);
    console.log(`Converted ${appCats.length} cats to app format`);
    
    // サマリー表示
    console.log('\n📊 Converted cats:');
    appCats.forEach((cat, i) => {
      console.log(`${i + 1}. ${cat.name} (${cat.age}歳, ${cat.gender}) - ${cat.prefecture}`);
    });
    
  } catch (error) {
    console.error('Error converting data:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}