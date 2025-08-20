#!/usr/bin/env node

// D1データベースにサンプルデータを投入するスクリプト
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

// データ生成用の関数をインライン定義
const catBreeds = ['三毛猫', '黒猫', '白猫', 'キジトラ', '茶トラ', 'ハチワレ', 'サビ猫', 'スコティッシュフォールド', 'メインクーン', 'ロシアンブルー'];
const dogBreeds = ['柴犬', '秋田犬', 'トイプードル', 'チワワ', 'ダックスフンド', 'ポメラニアン', 'ヨークシャーテリア', 'マルチーズ', 'シーズー', 'パグ'];
const prefectures = ['東京都', '神奈川県', '大阪府', '愛知県', '福岡県', '北海道', '宮城県', '京都府', '兵庫県', '千葉県'];
const cities = {
  '東京都': ['渋谷区', '新宿区', '世田谷区', '港区', '品川区'],
  '神奈川県': ['横浜市', '川崎市', '相模原市', '藤沢市', '横須賀市'],
  '大阪府': ['大阪市', '堺市', '東大阪市', '枚方市', '豊中市'],
  '愛知県': ['名古屋市', '豊田市', '一宮市', '豊橋市', '岡崎市'],
  '福岡県': ['福岡市', '北九州市', '久留米市', '飯塚市', '大牟田市']
};
const shelterNames = ['アニマルレスキュー', 'ペット保護センター', 'ハッピーアニマル', 'ワンニャンハウス', 'どうぶつ愛護団体'];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateCats(count) {
  const cats = [];
  for (let i = 1; i <= count; i++) {
    const prefecture = getRandomElement(prefectures);
    const city = getRandomElement(cities[prefecture] || ['市内']);
    cats.push({
      id: `cat-${String(i).padStart(3, '0')}`,
      name: `ネコちゃん${i}号`,
      breed: getRandomElement(catBreeds),
      age: Math.floor(Math.random() * 10) + 1,
      gender: Math.random() > 0.5 ? '男の子' : '女の子',
      prefecture,
      city,
      location: `${prefecture}${city}`,
      description: '可愛い性格をしています。新しい家族を探しています。',
      personality: ['人懐っこい', '甘えん坊', '遊び好き'],
      medicalInfo: 'ワクチン接種済み、健康チェック済み',
      careRequirements: ['完全室内飼い', '定期健診', '愛情たっぷり'],
      imageUrl: `http://localhost:8787/images/cats/cat-${String(i).padStart(3, '0')}.jpg`,
      shelterName: `${prefecture.replace('都府県', '')}${getRandomElement(shelterNames)}`,
      shelterContact: `shelter${i}@example.com`,
      sourceUrl: `https://pet-home.jp/cats/listing/${i}`,
      adoptionFee: 0,
      isNeutered: Math.random() > 0.3,
      isVaccinated: true,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  return cats;
}

function generateDogs(count) {
  const dogs = [];
  for (let i = 1; i <= count; i++) {
    const prefecture = getRandomElement(prefectures);
    const city = getRandomElement(cities[prefecture] || ['市内']);
    dogs.push({
      id: `dog-${String(i).padStart(3, '0')}`,
      name: `ワンちゃん${i}号`,
      breed: getRandomElement(dogBreeds),
      age: Math.floor(Math.random() * 10) + 1,
      gender: Math.random() > 0.5 ? '男の子' : '女の子',
      prefecture,
      city,
      location: `${prefecture}${city}`,
      description: '友好的な性格をしています。新しい家族を探しています。',
      personality: ['忠実', '活発', '友好的'],
      medicalInfo: 'ワクチン接種済み、健康チェック済み',
      careRequirements: ['毎日の散歩', '定期健診', '愛情たっぷり'],
      imageUrl: `http://localhost:8787/images/dogs/dog-${String(i).padStart(3, '0')}.jpg`,
      shelterName: `${prefecture.replace('都府県', '')}${getRandomElement(shelterNames)}`,
      shelterContact: `shelter${i}@example.com`,
      sourceUrl: `https://pet-home.jp/dogs/listing/${i}`,
      adoptionFee: 0,
      isNeutered: Math.random() > 0.3,
      isVaccinated: true,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  return dogs;
}

async function seedDatabase() {
  console.log('🗄️ D1データベースへのサンプルデータ投入開始...');

  // 既存データをクリア
  console.log('🧹 既存データをクリア中...');
  try {
    await execAsync('npx wrangler d1 execute pawmatch-db --local --command="DELETE FROM pets;"');
    console.log('✅ 既存データをクリアしました');
  } catch (error) {
    console.log('ℹ️ データベースは空でした');
  }

  // サンプルデータを生成
  console.log('📝 サンプルデータを生成中...');
  const cats = generateCats(100);
  const dogs = generateDogs(100);
  
  // SQL文を生成
  const insertStatements = [];
  
  // 猫データのSQL生成
  for (const cat of cats) {
    const sql = `
      INSERT INTO pets (
        id, type, name, breed, age, gender, prefecture, city, location,
        description, personality, medical_info, care_requirements,
        image_url, shelter_name, shelter_contact, source_url, adoption_fee,
        metadata, created_at
      ) VALUES (
        '${cat.id}',
        'cat',
        '${cat.name.replace(/'/g, "''")}',
        '${cat.breed.replace(/'/g, "''")}',
        ${cat.age},
        '${cat.gender}',
        '${cat.prefecture}',
        '${cat.city}',
        '${cat.location}',
        '${cat.description.replace(/'/g, "''")}',
        '${JSON.stringify(cat.personality).replace(/'/g, "''")}',
        '${cat.medicalInfo.replace(/'/g, "''")}',
        '${JSON.stringify(cat.careRequirements).replace(/'/g, "''")}',
        '${cat.imageUrl}',
        '${cat.shelterName.replace(/'/g, "''")}',
        '${cat.shelterContact}',
        '${cat.sourceUrl}',
        ${cat.adoptionFee},
        '${JSON.stringify({
          isNeutered: cat.isNeutered,
          isVaccinated: cat.isVaccinated,
          isFIVFeLVTested: cat.isFIVFeLVTested,
          socialLevel: cat.socialLevel,
          indoorOutdoor: cat.indoorOutdoor,
          goodWithMultipleCats: cat.goodWithMultipleCats,
          groomingRequirements: cat.groomingRequirements,
          vocalizationLevel: cat.vocalizationLevel,
          activityTime: cat.activityTime,
          playfulness: cat.playfulness,
          coatLength: cat.coatLength,
          color: cat.color,
          weight: cat.weight
        }).replace(/'/g, "''")}',
        '${cat.createdAt}'
      );
    `.trim();
    insertStatements.push(sql);
  }
  
  // 犬データのSQL生成
  for (const dog of dogs) {
    const sql = `
      INSERT INTO pets (
        id, type, name, breed, age, gender, prefecture, city, location,
        description, personality, medical_info, care_requirements,
        image_url, shelter_name, shelter_contact, source_url, adoption_fee,
        metadata, created_at
      ) VALUES (
        '${dog.id}',
        'dog',
        '${dog.name.replace(/'/g, "''")}',
        '${dog.breed.replace(/'/g, "''")}',
        ${dog.age},
        '${dog.gender}',
        '${dog.prefecture}',
        '${dog.city}',
        '${dog.location}',
        '${dog.description.replace(/'/g, "''")}',
        '${JSON.stringify(dog.personality).replace(/'/g, "''")}',
        '${dog.medicalInfo.replace(/'/g, "''")}',
        '${JSON.stringify(dog.careRequirements).replace(/'/g, "''")}',
        '${dog.imageUrl}',
        '${dog.shelterName.replace(/'/g, "''")}',
        '${dog.shelterContact}',
        '${dog.sourceUrl}',
        ${dog.adoptionFee},
        '${JSON.stringify({
          isNeutered: dog.isNeutered,
          isVaccinated: dog.isVaccinated,
          isHouseTrained: dog.isHouseTrained,
          goodWithKids: dog.goodWithKids,
          goodWithOtherDogs: dog.goodWithOtherDogs,
          goodWithCats: dog.goodWithCats,
          energyLevel: dog.energyLevel,
          exerciseNeeds: dog.exerciseNeeds,
          groomingNeeds: dog.groomingNeeds,
          sheddingLevel: dog.sheddingLevel,
          barkingLevel: dog.barkingLevel,
          trainability: dog.trainability,
          size: dog.size,
          coatLength: dog.coatLength,
          color: dog.color,
          weight: dog.weight
        }).replace(/'/g, "''")}',
        '${dog.createdAt}'
      );
    `.trim();
    insertStatements.push(sql);
  }

  // SQLファイルを作成
  const sqlContent = insertStatements.join('\n');
  await fs.writeFile('/tmp/seed-data.sql', sqlContent);

  // D1に投入
  console.log('🐱 猫データ100件と🐶 犬データ100件をD1に投入中...');
  try {
    const { stdout, stderr } = await execAsync('npx wrangler d1 execute pawmatch-db --local --file=/tmp/seed-data.sql');
    if (stderr && !stderr.includes('WARNING')) {
      console.error('⚠️ エラー:', stderr);
    }
    console.log('✅ データ投入完了！');
  } catch (error) {
    console.error('❌ データ投入エラー:', error.message);
    throw error;
  }

  // 投入結果を確認
  console.log('\n📊 投入結果を確認中...');
  try {
    const { stdout } = await execAsync('npx wrangler d1 execute pawmatch-db --local --command="SELECT type, COUNT(*) as count FROM pets GROUP BY type;"');
    console.log('データ件数:');
    // stdoutをパースして結果を表示
    const result = JSON.parse(stdout);
    if (result[0] && result[0].results) {
      result[0].results.forEach(row => {
        console.log(`  ${row.type === 'cat' ? '🐱' : '🐶'} ${row.type}: ${row.count}件`);
      });
    }
  } catch (error) {
    console.log('結果確認をスキップ');
  }

  // 一時ファイルを削除
  await fs.unlink('/tmp/seed-data.sql');

  console.log('\n✅ D1データベースへのサンプルデータ投入が完了しました！');
  console.log('🔍 確認コマンド:');
  console.log('  npx wrangler d1 execute pawmatch-db --local --command="SELECT * FROM pets LIMIT 5;"');
}

// 実行
seedDatabase().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});