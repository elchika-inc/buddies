#!/usr/bin/env node
/**
 * ローカル開発用のモックペットデータを生成
 */

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs').promises;

// 犬の品種リスト
const dogBreeds = [
  '柴犬', 'トイプードル', 'チワワ', 'ミニチュアダックスフンド', 'ポメラニアン',
  'ヨークシャーテリア', 'マルチーズ', 'シーズー', 'フレンチブルドッグ', 'ミニチュアシュナウザー',
  'パグ', 'ジャックラッセルテリア', 'ビーグル', 'ゴールデンレトリバー', 'ラブラドールレトリバー',
  '雑種'
];

// 猫の品種リスト
const catBreeds = [
  'アメリカンショートヘア', 'スコティッシュフォールド', 'マンチカン', 'ロシアンブルー',
  'ノルウェージャンフォレストキャット', 'ペルシャ', 'メインクーン', 'ラグドール',
  'ブリティッシュショートヘア', 'アビシニアン', 'シャム', 'ベンガル', '雑種'
];

// 都道府県と市区町村のサンプル
const locations = [
  { prefecture: '東京都', cities: ['新宿区', '渋谷区', '世田谷区', '港区', '千代田区'] },
  { prefecture: '大阪府', cities: ['大阪市', '堺市', '豊中市', '吹田市', '高槻市'] },
  { prefecture: '神奈川県', cities: ['横浜市', '川崎市', '相模原市', '藤沢市', '横須賀市'] },
  { prefecture: '愛知県', cities: ['名古屋市', '豊田市', '岡崎市', '一宮市', '春日井市'] },
  { prefecture: '福岡県', cities: ['福岡市', '北九州市', '久留米市', '飯塚市', '大牟田市'] }
];

// 性格トレイト
const personalities = [
  '人懐っこい', '甘えん坊', '活発', 'おとなしい', '遊び好き',
  'のんびり', '賢い', '忠実', '好奇心旺盛', '寂しがり屋'
];

// ペット名のサンプル
const dogNames = [
  'ポチ', 'マロン', 'モカ', 'ココ', 'レオ', 'ソラ', 'ハナ', 'リン',
  'ルナ', 'モモ', 'チョコ', 'クロ', 'シロ', 'タロウ', 'ジロウ'
];

const catNames = [
  'ミケ', 'タマ', 'クロ', 'シロ', 'トラ', 'ミミ', 'モモ', 'ナナ',
  'ルナ', 'ソラ', 'マル', 'ココ', 'リン', 'メイ', 'レオ'
];

// ランダム要素選択
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// ランダムな複数要素選択
function randomChoices(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// ペットデータ生成
function generatePet(type, index) {
  const isD = type === 'dog';
  const breeds = isD ? dogBreeds : catBreeds;
  const names = isD ? dogNames : catNames;
  const location = randomChoice(locations);
  const city = randomChoice(location.cities);
  const age = Math.floor(Math.random() * 10) + 1;
  
  return {
    id: `mock-pethome_${type}_${1000 + index}`,
    type: type,
    name: randomChoice(names),
    breed: randomChoice(breeds),
    age: age.toString(),
    gender: Math.random() > 0.5 ? 'オス' : 'メス',
    prefecture: location.prefecture,
    city: city,
    location: `${location.prefecture}${city}`,
    description: `${age}歳の${randomChoice(breeds)}です。とても${randomChoice(personalities)}な性格で、新しい家族を待っています。`,
    personality: JSON.stringify(randomChoices(personalities, 3)),
    medical_info: 'ワクチン接種済み、避妊・去勢手術済み、健康診断済み',
    care_requirements: JSON.stringify(['完全室内飼い', '定期健診', '愛情たっぷり']),
    image_url: `https://placedog.net/400/400?id=${index}`,
    shelter_name: `${location.prefecture}動物愛護センター`,
    shelter_contact: `contact-${type}@example.com`,
    source_url: `https://www.pet-home.jp/${type}s/${location.prefecture}/pn${1000 + index}/`,
    adoption_fee: 0,
    metadata: JSON.stringify({
      sourceId: 'mock-pethome',
      crawledAt: new Date().toISOString()
    }),
    created_at: new Date().toISOString()
  };
}

// 画像ダウンロード（モック）
async function downloadImage(pet) {
  const imageDir = path.resolve(__dirname, '../../data/images', `${pet.type}s`);
  
  // ディレクトリを作成
  await fs.mkdir(path.join(imageDir, 'originals'), { recursive: true });
  await fs.mkdir(path.join(imageDir, 'webp'), { recursive: true });
  
  // プレースホルダー画像のURLを使用
  const imageUrl = pet.type === 'dog' 
    ? `https://placedog.net/400/400?id=${pet.id}`
    : `https://placekitten.com/400/400?image=${Math.floor(Math.random() * 16)}`;
  
  try {
    const response = await fetch(imageUrl);
    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer());
      
      // オリジナル画像を保存
      const originalPath = path.join(imageDir, 'originals', `${pet.id}.jpg`);
      await fs.writeFile(originalPath, buffer);
      
      // WebP版も保存（実際には同じ画像）
      const webpPath = path.join(imageDir, 'webp', `${pet.id}.webp`);
      await fs.writeFile(webpPath, buffer);
      
      console.log(`  ✓ Downloaded image for ${pet.name}`);
    }
  } catch (error) {
    console.log(`  ⚠ Could not download image for ${pet.name}`);
  }
}

// メイン処理
async function main() {
  const dbPath = path.resolve(__dirname, '../../data/pawmatch.db');
  console.log(`Database path: ${dbPath}\n`);
  
  // データベース接続
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  // 既存データをクリア
  await db.run('DELETE FROM pets WHERE id LIKE "mock-pethome_%"');
  console.log('Cleared existing mock data\n');
  
  // 犬データ生成（30件）
  console.log('Generating 30 dog records...');
  for (let i = 0; i < 30; i++) {
    const dog = generatePet('dog', i);
    
    await db.run(
      `INSERT INTO pets (
        id, type, name, breed, age, gender, prefecture, city, location,
        description, personality, medical_info, care_requirements,
        image_url, shelter_name, shelter_contact, source_url, 
        adoption_fee, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dog.id, dog.type, dog.name, dog.breed, dog.age, dog.gender,
        dog.prefecture, dog.city, dog.location, dog.description,
        dog.personality, dog.medical_info, dog.care_requirements,
        dog.image_url, dog.shelter_name, dog.shelter_contact,
        dog.source_url, dog.adoption_fee, dog.metadata, dog.created_at
      ]
    );
    
    await downloadImage(dog);
  }
  console.log('✅ Generated 30 dog records\n');
  
  // 猫データ生成（30件）
  console.log('Generating 30 cat records...');
  for (let i = 0; i < 30; i++) {
    const cat = generatePet('cat', i);
    
    await db.run(
      `INSERT INTO pets (
        id, type, name, breed, age, gender, prefecture, city, location,
        description, personality, medical_info, care_requirements,
        image_url, shelter_name, shelter_contact, source_url, 
        adoption_fee, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cat.id, cat.type, cat.name, cat.breed, cat.age, cat.gender,
        cat.prefecture, cat.city, cat.location, cat.description,
        cat.personality, cat.medical_info, cat.care_requirements,
        cat.image_url, cat.shelter_name, cat.shelter_contact,
        cat.source_url, cat.adoption_fee, cat.metadata, cat.created_at
      ]
    );
    
    await downloadImage(cat);
  }
  console.log('✅ Generated 30 cat records\n');
  
  // 統計情報を表示
  const dogCount = await db.get('SELECT COUNT(*) as count FROM pets WHERE type = "dog"');
  const catCount = await db.get('SELECT COUNT(*) as count FROM pets WHERE type = "cat"');
  
  console.log('📊 Database Statistics:');
  console.log(`  Dogs: ${dogCount.count}`);
  console.log(`  Cats: ${catCount.count}`);
  console.log(`  Total: ${dogCount.count + catCount.count}`);
  
  await db.close();
  console.log('\n✨ Mock data generation completed!');
}

// 実行
main().catch(console.error);