-- PawMatch サンプルデータ挿入スクリプト

-- 犬のデータ
INSERT INTO animals (
  id, name, species, breed, age, gender, size, description,
  adoption_fee, prefecture, city, shelter_name, shelter_contact,
  source_url, is_active, created_at, updated_at, last_crawled_at
) VALUES 
(
  'dog_001', 'ポチ', 'dog', '柴犬', 3, 'male', 'medium',
  '元気いっぱいで人懐っこい柴犬です。お散歩が大好きで、家族と一緒に過ごすのが幸せです。',
  30000, '東京都', '世田谷区', '東京動物愛護センター', '03-1234-5678',
  'https://example.com/dog1', true, datetime('now'), datetime('now'), datetime('now')
),
(
  'dog_002', 'チョコ', 'dog', 'トイプードル', 2, 'female', 'small',
  '甘えん坊で人が大好きなトイプードルです。毛色はチョコレートブラウンで、とても美しい子です。',
  25000, '神奈川県', '横浜市', 'わんわん保護の会', '045-1234-5678',
  'https://example.com/dog2', true, datetime('now'), datetime('now'), datetime('now')
);

-- 猫のデータ
INSERT INTO animals (
  id, name, species, breed, age, gender, size, description,
  adoption_fee, prefecture, city, shelter_name, shelter_contact,
  source_url, is_active, created_at, updated_at, last_crawled_at
) VALUES 
(
  'cat_001', 'ミケ', 'cat', '三毛猫', 4, 'female', 'medium',
  '美しい三毛模様の女の子です。穏やかな性格で、静かな環境を好みます。',
  20000, '千葉県', '市川市', '千葉猫の会', '047-1234-5678',
  'https://example.com/cat1', true, datetime('now'), datetime('now'), datetime('now')
),
(
  'cat_002', 'シロ', 'cat', '白猫', 1, 'male', 'small',
  '真っ白な毛色が美しい若い男の子です。とても人懐っこく、遊ぶのが大好きです。',
  15000, '埼玉県', 'さいたま市', '埼玉動物愛護センター', '048-1234-5678',
  'https://example.com/cat2', true, datetime('now'), datetime('now'), datetime('now')
);

-- 動物の画像データ
INSERT INTO animal_images (id, animal_id, url, alt_text, is_primary) VALUES
('img_dog_001', 'dog_001', 'https://example.com/images/dog1.jpg', 'ポチの写真', true),
('img_dog_002', 'dog_002', 'https://example.com/images/dog2.jpg', 'チョコの写真', true),
('img_cat_001', 'cat_001', 'https://example.com/images/cat1.jpg', 'ミケの写真', true),
('img_cat_002', 'cat_002', 'https://example.com/images/cat2.jpg', 'シロの写真', true);

-- 動物の性格データ
INSERT INTO animal_personalities (id, animal_id, trait) VALUES
('trait_dog_001_1', 'dog_001', '元気'),
('trait_dog_001_2', 'dog_001', '人懐っこい'),
('trait_dog_001_3', 'dog_001', '忠実'),
('trait_dog_002_1', 'dog_002', '甘えん坊'),
('trait_dog_002_2', 'dog_002', '人懐っこい'),
('trait_dog_002_3', 'dog_002', '賢い'),
('trait_cat_001_1', 'cat_001', '穏やか'),
('trait_cat_001_2', 'cat_001', '人見知り'),
('trait_cat_001_3', 'cat_001', '美しい'),
('trait_cat_002_1', 'cat_002', '人懐っこい'),
('trait_cat_002_2', 'cat_002', '活発'),
('trait_cat_002_3', 'cat_002', '甘えん坊');

-- 犬専用データ
INSERT INTO dog_info (
  animal_id, exercise_needs, walk_frequency, training_level,
  good_with_children, good_with_dogs, apartment_suitable, yard_required
) VALUES
('dog_001', 'high', 2, 'basic', true, true, false, true),
('dog_002', 'moderate', 1, 'basic', true, true, true, false);

-- 猫専用データ
INSERT INTO cat_info (
  animal_id, social_level, indoor_outdoor, good_with_cats, vocalization
) VALUES
('cat_001', 'shy', 'indoor_only', false, 'quiet'),
('cat_002', 'friendly', 'indoor_only', true, 'moderate');

-- クローラーログ
INSERT INTO crawler_logs (
  id, source, species, success, animals_count, started_at, completed_at, duration_seconds
) VALUES
(
  'log_001', 'https://example.com', 'all', true, 4,
  datetime('now', '-1 hour'), datetime('now'), 60
);