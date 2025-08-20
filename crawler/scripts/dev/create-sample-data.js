#!/usr/bin/env node

/**
 * サンプルペットデータ作成スクリプト
 * テスト用のペットデータを作成してAPIサーバーに投入する
 */

// カラー定義
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m', 
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createSamplePets() {
  const cats = [];
  const dogs = [];
  
  // サンプル猫データ
  for (let i = 1; i <= 3; i++) {
    cats.push({
      id: `sample-cat-${i}`,
      type: 'cat',
      name: `サンプル猫${i}`,
      breed: i === 1 ? 'ミックス' : i === 2 ? 'アメリカンショートヘア' : 'ペルシャ',
      age: `${i}歳`,
      gender: i % 2 === 1 ? 'オス' : 'メス',
      prefecture: i === 1 ? '東京都' : i === 2 ? '大阪府' : '神奈川県',
      city: i === 1 ? '渋谷区' : i === 2 ? '大阪市' : '横浜市',
      location: `${i === 1 ? '東京都渋谷区' : i === 2 ? '大阪府大阪市' : '神奈川県横浜市'}`,
      description: `とても人懐っこい${i}歳の猫です。室内飼いで大切に育ててくださる方を募集中です。`,
      personality: ['人懐っこい', '穏やか', '遊び好き'],
      medical_info: '健康状態良好、ワクチン接種済み',
      care_requirements: ['室内飼い必須', '定期的な健康診断'],
      image_url: `https://example.com/cat-${i}.jpg`,
      shelter_name: `サンプル保護団体${i}`,
      shelter_contact: `sample-shelter-${i}@example.com`,
      source_url: `https://example.com/pets/cat-${i}`,
      adoption_fee: i * 10000,
      metadata: {
        source: 'sample-data',
        created_by: 'create-sample-data.js'
      }
    });
  }
  
  // サンプル犬データ  
  for (let i = 1; i <= 2; i++) {
    dogs.push({
      id: `sample-dog-${i}`,
      type: 'dog',
      name: `サンプル犬${i}`,
      breed: i === 1 ? '柴犬' : 'ゴールデンレトリバー',
      age: `${i + 1}歳`,
      gender: i % 2 === 1 ? 'メス' : 'オス',
      prefecture: i === 1 ? '千葉県' : '愛知県',
      city: i === 1 ? '千葉市' : '名古屋市',
      location: `${i === 1 ? '千葉県千葉市' : '愛知県名古屋市'}`,
      description: `元気いっぱいの${i + 1}歳の犬です。散歩が大好きで、家族と一緒に過ごすことを楽しみにしています。`,
      personality: ['活発', '忠実', 'フレンドリー'],
      medical_info: '健康状態良好、去勢/避妊手術済み',
      care_requirements: ['毎日の散歩', '定期的なブラッシング'],
      image_url: `https://example.com/dog-${i}.jpg`,
      shelter_name: `サンプル動物愛護センター${i}`,
      shelter_contact: `sample-center-${i}@example.com`,
      source_url: `https://example.com/pets/dog-${i}`,
      adoption_fee: i * 15000,
      metadata: {
        source: 'sample-data',
        created_by: 'create-sample-data.js'
      }
    });
  }
  
  return [...cats, ...dogs];
}

async function seedSampleData() {
  const API_ENDPOINT = 'http://localhost:8788';
  const samplePets = createSamplePets();
  
  log('blue', `🌱 サンプルデータ(${samplePets.length}件)をAPIサーバーに投入中...`);
  
  try {
    // APIサーバー接続確認
    const healthResponse = await fetch(`${API_ENDPOINT}/`);
    if (!healthResponse.ok) {
      throw new Error('APIサーバーに接続できません');
    }
    
    const health = await healthResponse.json();
    log('green', `✅ APIサーバー接続OK (${health.service})`);
    
    // データベース初期化
    const initResponse = await fetch(`${API_ENDPOINT}/dev/init-db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    const initResult = await initResponse.json();
    if (initResponse.ok && initResult.success) {
      log('green', '✅ データベース初期化完了');
    }
    
    // データ投入
    const seedResponse = await fetch(`${API_ENDPOINT}/dev/seed-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pets: samplePets }),
    });
    
    const seedResult = await seedResponse.json();
    
    if (seedResponse.ok && seedResult.success) {
      log('green', '🎉 サンプルデータ投入完了！');
      log('blue', `   新規追加: ${seedResult.inserted}件`);
      log('blue', `   更新: ${seedResult.updated}件`);
      log('blue', `   合計処理: ${seedResult.total}件`);
      
      // 確認
      const statsResponse = await fetch(`${API_ENDPOINT}/stats`);
      const stats = await statsResponse.json();
      
      if (statsResponse.ok) {
        log('green', '📊 現在の統計:');
        log('blue', `   合計: ${stats.total}件`);
        log('blue', `   猫: ${stats.cats}件`);  
        log('blue', `   犬: ${stats.dogs}件`);
        
        // 実際のデータ確認
        const petsResponse = await fetch(`${API_ENDPOINT}/pets?limit=10`);
        const petsData = await petsResponse.json();
        
        if (petsResponse.ok && petsData.pets) {
          log('green', '🔍 投入されたデータ例:');
          petsData.pets.slice(0, 3).forEach(pet => {
            log('yellow', `   - ${pet.name} (${pet.type}, ${pet.prefecture})`);
          });
        }
      }
    } else {
      throw new Error(seedResult.error || 'データ投入に失敗');
    }
    
  } catch (error) {
    log('red', `❌ エラー: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  log('blue', '🌱 サンプルデータ作成・投入スクリプト開始');
  await seedSampleData();
  log('green', '✨ 完了！');
}

main().catch(error => {
  log('red', `❌ 予期しないエラー: ${error.message}`);
  process.exit(1);
});