#!/usr/bin/env node

// サンプルデータのテンプレート
const dogNames = ['ポチ', 'タロウ', 'マロン', 'ココ', 'モカ', 'レオ', 'ソラ', 'ハナ', 'リン', 'ユキ'];
const catNames = ['ミケ', 'クロ', 'シロ', 'タマ', 'モモ', 'ルナ', 'ミルク', 'ココア', 'マル', 'ナナ'];
const dogBreeds = ['柴犬', 'トイプードル', 'チワワ', 'ダックスフンド', 'ポメラニアン', 'ヨークシャーテリア', 'ミックス', 'フレンチブルドッグ', 'パグ', 'コーギー'];
const catBreeds = ['ミックス', 'アメリカンショートヘア', 'スコティッシュフォールド', 'マンチカン', 'ロシアンブルー', 'ペルシャ', 'メインクーン', 'ラグドール', 'ノルウェージャンフォレストキャット', 'ブリティッシュショートヘア'];
const prefectures = ['東京都', '神奈川県', '千葉県', '埼玉県', '大阪府', '愛知県', '福岡県', '北海道', '宮城県', '広島県'];
const cities = ['中央区', '港区', '新宿区', '渋谷区', '世田谷区', '杉並区', '練馬区', '板橋区', '足立区', '江戸川区'];
const personalities = ['人懐っこい', '遊び好き', '甘えん坊', 'おとなしい', '活発', '好奇心旺盛', '賢い', 'のんびり', '警戒心が強い', '食いしん坊'];

function generateDog(index) {
  const name = dogNames[index % dogNames.length] + (Math.floor(index / dogNames.length) || '');
  const prefecture = prefectures[index % prefectures.length];
  const city = cities[index % cities.length];
  
  return {
    id: `dog_${Date.now()}_${index}`,
    type: 'dog',
    name: name,
    breed: dogBreeds[Math.floor(Math.random() * dogBreeds.length)],
    age: Math.floor(Math.random() * 10) + 1,
    gender: Math.random() > 0.5 ? 'male' : 'female',
    prefecture: prefecture,
    city: city,
    location: `${prefecture}${city}`,
    description: `${name}は、とても${personalities[Math.floor(Math.random() * personalities.length)]}な性格の犬です。新しい家族を探しています。`,
    personality: JSON.stringify([
      personalities[Math.floor(Math.random() * personalities.length)],
      personalities[Math.floor(Math.random() * personalities.length)]
    ]),
    medical_info: '健康状態良好、ワクチン接種済み、避妊去勢手術済み',
    care_requirements: JSON.stringify(['定期的な散歩', '毎日のブラッシング', '月1回のトリミング']),
    image_url: `https://images.unsplash.com/photo-${1543248000 + index}-a7e8fc38eac9?w=600&h=600&fit=crop`,
    shelter_name: `保護団体${index % 10 + 1}`,
    shelter_contact: `shelter${index % 10 + 1}@example.com`,
    source_url: `https://example.com/dogs/${index}`,
    adoption_fee: Math.floor(Math.random() * 5) * 10000,
    metadata: JSON.stringify({
      size: 'medium',
      goodWithKids: true,
      goodWithDogs: true,
      exerciseLevel: 'moderate',
      trainingLevel: 'basic',
      walkFrequency: 'twice daily',
      needsYard: false,
      apartmentFriendly: true
    })
  };
}

function generateCat(index) {
  const name = catNames[index % catNames.length] + (Math.floor(index / catNames.length) || '');
  const prefecture = prefectures[index % prefectures.length];
  const city = cities[index % cities.length];
  
  return {
    id: `cat_${Date.now()}_${index}`,
    type: 'cat',
    name: name,
    breed: catBreeds[Math.floor(Math.random() * catBreeds.length)],
    age: Math.floor(Math.random() * 8) + 1,
    gender: Math.random() > 0.5 ? 'male' : 'female',
    prefecture: prefecture,
    city: city,
    location: `${prefecture}${city}`,
    description: `${name}は、とても${personalities[Math.floor(Math.random() * personalities.length)]}な性格の猫です。新しい家族を探しています。`,
    personality: JSON.stringify([
      personalities[Math.floor(Math.random() * personalities.length)],
      personalities[Math.floor(Math.random() * personalities.length)]
    ]),
    medical_info: '健康状態良好、ワクチン接種済み、避妊去勢手術済み、FIV/FeLV陰性',
    care_requirements: JSON.stringify(['定期的な爪切り', '毎日のブラッシング', '室内飼い必須']),
    image_url: `https://images.unsplash.com/photo-${1514888000 + index}-6c03e2ca1dba?w=600&h=600&fit=crop`,
    shelter_name: `保護団体${index % 10 + 1}`,
    shelter_contact: `shelter${index % 10 + 1}@example.com`,
    source_url: `https://example.com/cats/${index}`,
    adoption_fee: Math.floor(Math.random() * 3) * 10000,
    metadata: JSON.stringify({
      coatLength: 'short',
      isFIVFeLVTested: true,
      socialLevel: 'moderate',
      indoorOutdoor: 'indoor',
      goodWithMultipleCats: true,
      groomingRequirements: 'low',
      vocalizationLevel: 'low',
      activityTime: 'dawn/dusk',
      playfulness: 'moderate'
    })
  };
}

// SQLを生成
function generateSQL() {
  const dogs = Array.from({ length: 100 }, (_, i) => generateDog(i));
  const cats = Array.from({ length: 100 }, (_, i) => generateCat(i));
  
  const allPets = [...dogs, ...cats];
  
  console.log('-- Sample pet data for PawMatch');
  console.log('-- Generated:', new Date().toISOString());
  console.log('');
  
  for (const pet of allPets) {
    const columns = Object.keys(pet).join(', ');
    const values = Object.values(pet).map(v => {
      if (typeof v === 'string') {
        return `'${v.replace(/'/g, "''")}'`;
      }
      return v;
    }).join(', ');
    
    console.log(`INSERT INTO pets (${columns}) VALUES (${values});`);
  }
}

// 実行
generateSQL();