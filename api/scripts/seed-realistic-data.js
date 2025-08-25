#!/usr/bin/env node

/**
 * リアルなペットデータを生成してD1に投入するスクリプト
 * 実際のペットホームサイトのようなデータを生成
 */

// 犬の実際の名前リスト
const dogNames = [
  'ポチ', 'タロウ', 'マロン', 'ココ', 'モカ', 'レオ', 'ソラ', 'ハナ', 'リン', 'ユキ',
  'クロ', 'シロ', 'チョコ', 'マル', 'コタロウ', 'ラッキー', 'ベル', 'ルル', 'モモ', 'サクラ',
  'ナナ', 'リキ', 'ゴン', 'ムギ', 'アズキ', 'コロ', 'ジョン', 'ハチ', 'ロン', 'メル',
  'プリン', 'ミルク', 'ショコラ', 'バニラ', 'キナコ', 'アンコ', 'ダイフク', 'モチ', 'クルミ', 'ツブ',
  'フク', 'ラン', 'レイ', 'カイ', 'ゲン', 'ケン', 'テツ', 'ジロウ', 'サブロウ', 'ゴロウ'
];

// 猫の実際の名前リスト
const catNames = [
  'ミー', 'チビ', 'クロ', 'シロ', 'トラ', 'ミケ', 'タマ', 'ネコ', 'ニャン', 'モモ',
  'ルナ', 'ソラ', 'マル', 'ココ', 'リン', 'メイ', 'ユキ', 'ハナ', 'サクラ', 'アン',
  'ベル', 'ノア', 'レオ', 'ルイ', 'ラム', 'ミント', 'チョコ', 'キナコ', 'アズキ', 'モカ',
  'ミルク', 'クリーム', 'プリン', 'マロン', 'クルミ', 'ゴマ', 'ムギ', 'コムギ', 'ツブ', 'マメ',
  'フク', 'ラッキー', 'ハッピー', 'ピース', 'ラブ', 'キティ', 'ミミ', 'チャチャ', 'ララ', 'ルル'
];

// 犬種リスト
const dogBreeds = [
  '柴犬', 'トイプードル', 'チワワ', 'ミニチュアダックスフンド', 'ポメラニアン',
  'ヨークシャーテリア', 'マルチーズ', 'シーズー', 'フレンチブルドッグ', 'パグ',
  'ゴールデンレトリーバー', 'ラブラドールレトリーバー', 'ビーグル', 'コーギー', 'ボーダーコリー',
  'ミックス犬', '雑種'
];

// 猫種リスト
const catBreeds = [
  'アメリカンショートヘア', 'スコティッシュフォールド', 'マンチカン', 'ロシアンブルー', 'ノルウェージャンフォレストキャット',
  'ブリティッシュショートヘア', 'ペルシャ', 'メインクーン', 'ラグドール', 'シャム',
  'アビシニアン', 'ベンガル', 'エキゾチックショートヘア', 'ソマリ', 'トンキニーズ',
  'ミックス', '雑種', '日本猫'
];

// 都道府県と市区町村のマッピング
const prefectures = {
  '東京都': ['渋谷区', '新宿区', '世田谷区', '杉並区', '練馬区', '板橋区', '足立区', '葛飾区', '江戸川区'],
  '神奈川県': ['横浜市', '川崎市', '相模原市', '藤沢市', '横須賀市', '平塚市', '鎌倉市', '茅ヶ崎市'],
  '千葉県': ['千葉市', '船橋市', '松戸市', '市川市', '柏市', '市原市', '流山市', '八千代市'],
  '埼玉県': ['さいたま市', '川口市', '川越市', '所沢市', '越谷市', '草加市', '春日部市', '上尾市'],
  '大阪府': ['大阪市', '堺市', '東大阪市', '吹田市', '豊中市', '枚方市', '高槻市', '八尾市'],
  '愛知県': ['名古屋市', '豊田市', '一宮市', '豊橋市', '岡崎市', '春日井市', '安城市', '豊川市'],
  '福岡県': ['福岡市', '北九州市', '久留米市', '飯塚市', '大牟田市', '春日市', '筑紫野市']
};

// 性格特性
const personalities = [
  '人懐っこい', '甘えん坊', '活発', 'おとなしい', '遊び好き',
  '穏やか', '好奇心旺盛', 'マイペース', '寂しがり屋', '忠実',
  '社交的', '警戒心が強い', '独立心がある', '賢い', '素直'
];

// ケア要件
const careRequirements = [
  '毎日の散歩必須', '定期的なブラッシング', '爪切り必要', '歯磨き推奨',
  '室内飼い推奨', '留守番少なめ希望', '静かな環境推奨', '運動量多め'
];

// 健康状態
const healthNotes = [
  'ワクチン接種済み', '健康診断済み', '去勢・避妊手術済み', 'マイクロチップ装着済み',
  'フィラリア予防済み', 'ノミ・ダニ予防済み', '血液検査済み'
];

// 相性
const goodWith = [
  '子供OK', '他の犬OK', '他の猫OK', '高齢者OK', '初心者OK', '一人暮らしOK', 'マンションOK'
];

// 保護団体名
const shelterNames = [
  'わんにゃん保護の会', 'ハッピーテール', 'アニマルレスキュー東京', 'ペット里親会',
  '動物愛護団体みらい', 'セカンドチャンス', 'いぬねこ家族', 'ペットの命を守る会',
  'アニマルフレンズ', 'ラブペット協会'
];

// ランダム選択ヘルパー
function randomFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomMultipleFrom(array, min = 1, max = 3) {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// 年齢を生成（0-15歳）
function generateAge() {
  const rand = Math.random();
  if (rand < 0.3) return Math.floor(Math.random() * 2); // 30%が子犬・子猫
  if (rand < 0.6) return Math.floor(Math.random() * 5) + 2; // 30%が若い
  if (rand < 0.85) return Math.floor(Math.random() * 5) + 5; // 25%が成犬・成猫
  return Math.floor(Math.random() * 5) + 10; // 15%が高齢
}

// 説明文を生成
function generateDescription(pet) {
  const ageText = pet.age < 1 ? '子犬' : pet.age < 3 ? '若い' : pet.age < 8 ? '成犬' : '高齢の';
  const typeText = pet.type === 'dog' ? '犬' : '猫';
  
  return `${pet.name}は${pet.age}歳の${ageText}${pet.breed}です。` +
    `${randomFrom(personalities)}な性格で、${randomFrom(personalities)}な一面もあります。` +
    `${pet.prefecture}${pet.city}で保護され、新しい家族を待っています。` +
    `${randomFrom(healthNotes)}で、健康状態は良好です。`;
}

// ペットデータを生成
function generatePet(type, index) {
  const names = type === 'dog' ? dogNames : catNames;
  const breeds = type === 'dog' ? dogBreeds : catBreeds;
  const prefecture = randomFrom(Object.keys(prefectures));
  const city = randomFrom(prefectures[prefecture]);
  const shelter = randomFrom(shelterNames);
  const timestamp = new Date().toISOString();
  
  const pet = {
    id: `${type}_${Date.now()}_${index}`,
    type: type,
    name: randomFrom(names),
    breed: randomFrom(breeds),
    age: generateAge(),
    gender: randomFrom(['male', 'female', 'unknown']),
    prefecture: prefecture,
    city: city,
    personality: JSON.stringify(randomMultipleFrom(personalities, 2, 4)),
    medical_info: randomFrom(['特になし', 'アレルギーあり', '投薬中', '療法食']),
    care_requirements: JSON.stringify(randomMultipleFrom(careRequirements, 1, 3)),
    good_with: JSON.stringify(randomMultipleFrom(goodWith, 2, 5)),
    health_notes: JSON.stringify(randomMultipleFrom(healthNotes, 2, 4)),
    image_url: null, // 後でスクリーンショットで取得
    shelter_name: shelter,
    shelter_contact: `contact@${shelter.replace(/[^a-zA-Z]/g, '').toLowerCase()}.org`,
    source_url: `https://pet-home.jp/${type === 'dog' ? 'dogs' : 'cats'}/${prefecture.replace('都府県', '')}/${type}_${index}/`,
    adoption_fee: Math.floor(Math.random() * 5) * 10000 + 30000, // 30000-70000円
    has_jpeg: 0,
    has_webp: 0,
    created_at: timestamp,
    updated_at: timestamp
  };
  
  pet.description = generateDescription(pet);
  
  return pet;
}

// SQLを生成
function generateSQL(dogs, cats) {
  const values = [];
  
  // 犬データ
  dogs.forEach(dog => {
    const fields = [
      `'${dog.id}'`,
      `'${dog.type}'`,
      `'${dog.name}'`,
      `'${dog.breed}'`,
      dog.age,
      `'${dog.gender}'`,
      `'${dog.prefecture}'`,
      `'${dog.city}'`,
      `'${dog.description.replace(/'/g, "''")}'`,
      `'${dog.personality}'`,
      `'${dog.medical_info}'`,
      `'${dog.care_requirements}'`,
      `'${dog.good_with}'`,
      `'${dog.health_notes}'`,
      'NULL', // image_url
      `'${dog.shelter_name}'`,
      `'${dog.shelter_contact}'`,
      `'${dog.source_url}'`,
      dog.adoption_fee,
      dog.has_jpeg,
      dog.has_webp,
      'NULL', // image_checked_at
      'NULL', // screenshot_requested_at
      'NULL', // screenshot_completed_at
      `'${dog.created_at}'`,
      `'${dog.updated_at}'`
    ];
    values.push(`(${fields.join(', ')})`);
  });
  
  // 猫データ
  cats.forEach(cat => {
    const fields = [
      `'${cat.id}'`,
      `'${cat.type}'`,
      `'${cat.name}'`,
      `'${cat.breed}'`,
      cat.age,
      `'${cat.gender}'`,
      `'${cat.prefecture}'`,
      `'${cat.city}'`,
      `'${cat.description.replace(/'/g, "''")}'`,
      `'${cat.personality}'`,
      `'${cat.medical_info}'`,
      `'${cat.care_requirements}'`,
      `'${cat.good_with}'`,
      `'${cat.health_notes}'`,
      'NULL', // image_url
      `'${cat.shelter_name}'`,
      `'${cat.shelter_contact}'`,
      `'${cat.source_url}'`,
      cat.adoption_fee,
      cat.has_jpeg,
      cat.has_webp,
      'NULL', // image_checked_at
      'NULL', // screenshot_requested_at
      'NULL', // screenshot_completed_at
      `'${cat.created_at}'`,
      `'${cat.updated_at}'`
    ];
    values.push(`(${fields.join(', ')})`);
  });
  
  const sql = `
-- リアルなペットデータの挿入
INSERT INTO pets (
  id, type, name, breed, age, gender, prefecture, city, description,
  personality, medical_info, care_requirements, good_with, health_notes,
  image_url, shelter_name, shelter_contact, source_url, adoption_fee,
  has_jpeg, has_webp, image_checked_at, screenshot_requested_at,
  screenshot_completed_at, created_at, updated_at
) VALUES
${values.join(',\n')};

-- 挿入後の確認
SELECT type, COUNT(*) as count FROM pets GROUP BY type;
`;
  
  return sql;
}

// メイン処理
function main() {
  const dogCount = 100;
  const catCount = 100;
  
  console.log(`🐕 ${dogCount}匹の犬データを生成中...`);
  const dogs = Array.from({ length: dogCount }, (_, i) => generatePet('dog', i));
  
  console.log(`🐈 ${catCount}匹の猫データを生成中...`);
  const cats = Array.from({ length: catCount }, (_, i) => generatePet('cat', i));
  
  const sql = generateSQL(dogs, cats);
  
  // SQLファイルを出力
  const fs = require('fs');
  const outputPath = 'scripts/seed-realistic-pets.sql';
  fs.writeFileSync(outputPath, sql);
  
  console.log(`✅ SQLファイルを生成しました: ${outputPath}`);
  console.log(`📊 合計 ${dogCount + catCount} 件のペットデータ`);
  
  // JSONファイルも出力（バックアップ用）
  const jsonPath = 'scripts/realistic-pets.json';
  fs.writeFileSync(jsonPath, JSON.stringify({ dogs, cats }, null, 2));
  console.log(`📄 JSONファイルも生成しました: ${jsonPath}`);
}

main();