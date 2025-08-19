// Helper functions to generate sample pet data

const catBreeds = ['三毛猫', '黒猫', '白猫', 'キジトラ', '茶トラ', 'ハチワレ', 'サビ猫', 'スコティッシュフォールド', 'メインクーン', 'ロシアンブルー', 'アメリカンショートヘア', 'ノルウェージャンフォレストキャット', 'ペルシャ', 'シャム', 'ラグドール', '雑種'];
const dogBreeds = ['柴犬', '秋田犬', 'トイプードル', 'チワワ', 'ダックスフンド', 'ポメラニアン', 'ヨークシャーテリア', 'マルチーズ', 'シーズー', 'パグ', 'フレンチブルドッグ', 'ゴールデンレトリバー', 'ラブラドールレトリバー', 'ビーグル', 'コーギー', '雑種'];

const catColors = ['三毛', '黒', '白', 'キジトラ', '茶トラ', '黒白', 'サビ', 'クリーム', 'ブラウンタビー', 'ブルーグレー', 'グレー', 'オレンジ', '白黒', '茶白'];
const dogColors = ['茶', '黒', '白', '黒茶', '白茶', 'クリーム', 'ゴールド', 'ブラウン', 'グレー', 'ブリンドル', 'レッド', '白黒', 'トライカラー'];

const prefectures = ['東京都', '神奈川県', '大阪府', '愛知県', '福岡県', '北海道', '宮城県', '京都府', '兵庫県', '千葉県', '埼玉県', '静岡県', '広島県', '新潟県', '岡山県'];
const cities = {
  '東京都': ['渋谷区', '新宿区', '世田谷区', '港区', '品川区', '目黒区', '杉並区', '練馬区', '豊島区', '中野区'],
  '神奈川県': ['横浜市', '川崎市', '相模原市', '藤沢市', '横須賀市', '平塚市', '鎌倉市', '茅ヶ崎市', '大和市', '厚木市'],
  '大阪府': ['大阪市', '堺市', '東大阪市', '枚方市', '豊中市', '吹田市', '高槻市', '茨木市', '寝屋川市', '岸和田市'],
  '愛知県': ['名古屋市', '豊田市', '一宮市', '豊橋市', '岡崎市', '春日井市', '安城市', '豊川市', '刈谷市', '小牧市'],
  '福岡県': ['福岡市', '北九州市', '久留米市', '飯塚市', '大牟田市', '春日市', '筑紫野市', '糸島市', '宗像市', '太宰府市']
};

const catPersonalities = ['人懐っこい', '甘えん坊', '遊び好き', 'おとなしい', '活発', '好奇心旺盛', 'マイペース', '優しい', '賢い', '独立心が強い', 'のんびり', '社交的', 'シャイ', '忠実', '穏やか'];
const dogPersonalities = ['忠実', '活発', '友好的', '賢い', '遊び好き', '穏やか', '勇敢', '優しい', '社交的', '従順', '警戒心が強い', '陽気', 'のんびり', '愛情深い', '好奇心旺盛'];

const shelterNames = [
  'アニマルレスキュー',
  'ペット保護センター',
  'ハッピーアニマル',
  'ワンニャンハウス',
  'どうぶつ愛護団体',
  'ペットシェルター',
  'アニマルフレンズ',
  'ペットの家',
  '動物保護施設',
  'レスキューセンター'
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getRandomAge(): number {
  return Math.floor(Math.random() * 10) + 1;
}

function getRandomWeight(type: 'cat' | 'dog'): number {
  if (type === 'cat') {
    return Math.round((Math.random() * 4 + 2.5) * 10) / 10; // 2.5-6.5kg
  } else {
    return Math.round((Math.random() * 25 + 5) * 10) / 10; // 5-30kg
  }
}

// ローカルR2またはUnsplash画像URLを生成
function getRandomImageUrl(type: 'cat' | 'dog', index: number, useLocalImages = true): string {
  // ローカルR2画像を使用する場合
  if (useLocalImages) {
    const petType = type === 'cat' ? 'cats' : 'dogs';
    const filename = `${type}-${String(index).padStart(3, '0')}.jpg`;
    return `http://localhost:8787/images/${petType}/${filename}`;
  }
  
  // フォールバック: Unsplash画像
  const catImages = [
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba',
    'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8',
    'https://images.unsplash.com/photo-1495360010541-f48722b34f7d',
    'https://images.unsplash.com/photo-1501820488136-72669149e0d4',
    'https://images.unsplash.com/photo-1478098711619-5ab0b478d6e6',
    'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13',
    'https://images.unsplash.com/photo-1548802673-380ab8ebc7b7',
    'https://images.unsplash.com/photo-1569591159212-b02ea8a9f239',
    'https://images.unsplash.com/photo-1606214174585-fe31582dc6ee',
    'https://images.unsplash.com/photo-1548681528-6a5c45b66b42'
  ];
  
  const dogImages = [
    'https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48',
    'https://images.unsplash.com/photo-1561037404-61cd46aa615b',
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1',
    'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e',
    'https://images.unsplash.com/photo-1587300003388-59208cc962cb',
    'https://images.unsplash.com/photo-1517849845537-4d257902454a',
    'https://images.unsplash.com/photo-1529429617124-95b109e86bb8',
    'https://images.unsplash.com/photo-1558788353-f76d92427f16',
    'https://images.unsplash.com/photo-1537151625747-768eb6cf92b3',
    'https://images.unsplash.com/photo-1552053831-71594a27632d'
  ];
  
  const images = type === 'cat' ? catImages : dogImages;
  const imageUrl = images[index % images.length];
  return `${imageUrl}?w=400&h=400&fit=crop&q=80`;
}

export function generateCats(count: number) {
  const cats = [];
  
  for (let i = 1; i <= count; i++) {
    const prefecture = getRandomElement(prefectures);
    const city = getRandomElement(cities[prefecture] || ['市内']);
    const breed = getRandomElement(catBreeds);
    const gender = Math.random() > 0.5 ? '男の子' : '女の子';
    const age = getRandomAge();
    
    cats.push({
      id: `cat-${String(i).padStart(3, '0')}`,
      type: 'cat',
      name: `ネコちゃん${i}号`,
      breed,
      age,
      gender,
      coatLength: Math.random() > 0.7 ? '長毛' : '短毛',
      color: getRandomElement(catColors),
      weight: getRandomWeight('cat'),
      prefecture,
      city,
      location: `${prefecture}${city}`,
      description: `${breed}の${gender}です。${age}歳で、とても可愛い性格をしています。新しい家族を探しています。`,
      personality: getRandomElements(catPersonalities, 3),
      medicalInfo: 'ワクチン接種済み、健康チェック済み',
      careRequirements: ['完全室内飼い', '定期健診', '愛情たっぷり'],
      imageUrl: getRandomImageUrl('cat', i, true),
      shelterName: `${prefecture.replace('都府県', '')}${getRandomElement(shelterNames)}`,
      shelterContact: `shelter${i}@example.com`,
      adoptionFee: 0,
      isNeutered: Math.random() > 0.3,
      isVaccinated: true,
      isFIVFeLVTested: Math.random() > 0.2,
      socialLevel: getRandomElement(['低', '普通', '高', '非常に高']),
      indoorOutdoor: '完全室内',
      goodWithMultipleCats: Math.random() > 0.4,
      groomingRequirements: getRandomElement(['低', '中', '高']),
      vocalizationLevel: getRandomElement(['低', '普通', '高']),
      activityTime: getRandomElement(['昼', '夜', 'どちらでも']),
      playfulness: getRandomElement(['低', '中', '高', '非常に高']),
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  
  return cats;
}

export function generateDogs(count: number) {
  const dogs = [];
  
  for (let i = 1; i <= count; i++) {
    const prefecture = getRandomElement(prefectures);
    const city = getRandomElement(cities[prefecture] || ['市内']);
    const breed = getRandomElement(dogBreeds);
    const gender = Math.random() > 0.5 ? '男の子' : '女の子';
    const age = getRandomAge();
    
    dogs.push({
      id: `dog-${String(i).padStart(3, '0')}`,
      type: 'dog',
      name: `ワンちゃん${i}号`,
      breed,
      age,
      gender,
      size: getRandomElement(['小型', '中型', '大型']),
      coatLength: Math.random() > 0.6 ? '長毛' : '短毛',
      color: getRandomElement(dogColors),
      weight: getRandomWeight('dog'),
      prefecture,
      city,
      location: `${prefecture}${city}`,
      description: `${breed}の${gender}です。${age}歳で、とても友好的な性格をしています。新しい家族を探しています。`,
      personality: getRandomElements(dogPersonalities, 3),
      medicalInfo: 'ワクチン接種済み、健康チェック済み',
      careRequirements: ['毎日の散歩', '定期健診', '愛情たっぷり'],
      imageUrl: getRandomImageUrl('dog', i, true),
      shelterName: `${prefecture.replace('都府県', '')}${getRandomElement(shelterNames)}`,
      shelterContact: `shelter${i}@example.com`,
      adoptionFee: 0,
      isNeutered: Math.random() > 0.3,
      isVaccinated: true,
      isHouseTrained: Math.random() > 0.4,
      goodWithKids: Math.random() > 0.5,
      goodWithOtherDogs: Math.random() > 0.6,
      goodWithCats: Math.random() > 0.3,
      energyLevel: getRandomElement(['低', '中', '高', '非常に高']),
      exerciseNeeds: getRandomElement(['少ない', '普通', '多い']),
      groomingNeeds: getRandomElement(['低', '中', '高']),
      sheddingLevel: getRandomElement(['少ない', '普通', '多い']),
      barkingLevel: getRandomElement(['静か', '普通', 'よく吠える']),
      trainability: getRandomElement(['易しい', '普通', '難しい']),
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  
  return dogs;
}