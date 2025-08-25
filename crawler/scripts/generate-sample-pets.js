#!/usr/bin/env node

const API_URL = 'https://pawmatch-api.naoto24kawa.workers.dev';

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

async function insertPet(pet) {
  try {
    const response = await fetch(`${API_URL}/api/pets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pet)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to insert ${pet.type} ${pet.id}:`, error);
      return false;
    }
    
    console.log(`✅ Inserted ${pet.type}: ${pet.name} (${pet.id})`);
    return true;
  } catch (error) {
    console.error(`Error inserting ${pet.type} ${pet.id}:`, error.message);
    return false;
  }
}

async function generateAndInsertPets() {
  console.log('🐕 Generating 100 dogs...');
  const dogs = Array.from({ length: 100 }, (_, i) => generateDog(i));
  
  console.log('🐈 Generating 100 cats...');
  const cats = Array.from({ length: 100 }, (_, i) => generateCat(i));
  
  console.log('\n📤 Inserting pets into database...\n');
  
  let dogSuccess = 0;
  let catSuccess = 0;
  
  // 犬を挿入
  for (const dog of dogs) {
    if (await insertPet(dog)) {
      dogSuccess++;
    }
    // レート制限を避けるため少し待つ
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 猫を挿入
  for (const cat of cats) {
    if (await insertPet(cat)) {
      catSuccess++;
    }
    // レート制限を避けるため少し待つ
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n✨ Complete!');
  console.log(`Dogs: ${dogSuccess}/100 inserted`);
  console.log(`Cats: ${catSuccess}/100 inserted`);
}

// 実行
generateAndInsertPets().catch(console.error);