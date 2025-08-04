-- データベースに初期データを挿入

-- 犬データの挿入
INSERT INTO animals (id, name, species, breed, age, gender, size, color, location, description, personality, medical_info, care_requirements, image_url, shelter_name, shelter_contact, adoption_fee, is_neutered, is_vaccinated, good_with_kids, good_with_other_animals) VALUES
('1', 'ポチ', 'dog', '柴犬', 3, '男の子', '中型犬', '赤毛', '東京都', '元気いっぱいの柴犬のポチです。散歩が大好きで、人懐っこい性格です。基本的なしつけは済んでおり、お留守番も上手にできます。', '["元気", "人懐っこい", "散歩好き", "忠実"]', '健康状態良好、定期検診済み、股関節に軽微な異常あるが生活に支障なし', '["毎日の散歩", "定期的なブラッシング", "柴犬の毛の手入れ"]', 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&h=600&fit=crop', '東京動物愛護センター', '03-1234-5678', 30000, TRUE, TRUE, TRUE, TRUE),
('2', 'チョコ', 'dog', 'ラブラドール', 5, '女の子', '大型犬', 'チョコレート', '埼玉県', '落ち着いた性格のラブラドールです。子供たちとも仲良くでき、家族の一員として愛されます。泳ぐのも大好きです。', '["落ち着いている", "子供好き", "忠実", "水好き"]', '健康状態良好、関節に注意が必要（大型犬特有）', '["十分な運動", "大型犬用の環境", "関節サプリメント"]', 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=500&h=600&fit=crop', '埼玉動物愛護センター', '048-1234-5678', 35000, TRUE, TRUE, TRUE, TRUE),
('3', 'ハナ', 'dog', 'トイプードル', 4, '女の子', '小型犬', 'アプリコット', '東京都', '賢くて人懐っこいトイプードルのハナちゃん。アパート暮らしに最適で、他の犬とも仲良くできます。', '["賢い", "人懐っこい", "可愛らしい", "社交的"]', '健康状態良好、膝蓋骨脱臼の軽微な傾向', '["定期トリミング", "小型犬用の環境", "知的刺激"]', 'https://images.unsplash.com/photo-1616190737842-0d2e8d595c89?w=500&h=600&fit=crop', '東京動物愛護センター', '03-1234-5678', 40000, TRUE, TRUE, TRUE, TRUE),
('4', 'タロウ', 'dog', 'ゴールデンレトリバー', 2, '男の子', '大型犬', 'ゴールデン', '神奈川県', '若くて元気なゴールデンレトリバーです。まだ子犬の面影があり、遊ぶことが大好きです。しつけトレーニング中です。', '["元気", "フレンドリー", "遊び好き", "学習意欲旺盛"]', '健康状態良好、若齢のため特に注意点なし', '["十分な運動", "継続的なトレーニング", "社会化"]', 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=500&h=600&fit=crop', '神奈川県動物保護センター', '045-1234-5678', 38000, TRUE, TRUE, TRUE, TRUE),
('5', 'ムギ', 'dog', 'コーギー', 6, '女の子', '中型犬', 'レッド&ホワイト', '千葉県', '人懐っこいコーギーのムギちゃん。牧羊犬の血を引く活発な性格ですが、シニアに近づき落ち着きも出てきました。', '["人懐っこい", "活発", "頭が良い", "忠実"]', '健康状態良好、腰に注意が必要（コーギー特有）', '["適度な運動", "体重管理", "腰のケア"]', 'https://images.unsplash.com/photo-1551717743-49959800b1f6?w=500&h=600&fit=crop', '千葉県動物愛護センター', '043-1234-5678', 32000, TRUE, TRUE, TRUE, TRUE);

-- 犬の詳細情報を挿入
INSERT INTO dog_details (animal_id, exercise_level, training_level, walk_frequency, needs_yard, apartment_friendly) VALUES
('1', '高', '基本済み', '1日2回', FALSE, TRUE),
('2', '中', '高度な訓練済み', '1日2回', TRUE, FALSE),
('3', '中', '基本済み', '1日2回', FALSE, TRUE),
('4', '高', '要訓練', '1日3回以上', TRUE, FALSE),
('5', '中', '高度な訓練済み', '1日2回', FALSE, TRUE);

-- 猫データのサンプル（いくつか追加）
INSERT INTO animals (id, name, species, breed, age, gender, size, color, location, description, personality, medical_info, care_requirements, image_url, shelter_name, shelter_contact, adoption_fee, is_neutered, is_vaccinated, good_with_kids, good_with_other_animals) VALUES
('101', 'ミケ', 'cat', '三毛猫', 2, '女の子', '中型', '三毛', '東京都', '美しい三毛猫のミケちゃんです。とても人懐っこく、膝の上に乗るのが大好きです。', '["人懐っこい", "甘えん坊", "好奇心旺盛", "愛らしい"]', '健康状態良好、定期検診済み', '["定期的なブラッシング", "室内飼い推奨", "適度な遊び"]', 'https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=500&h=600&fit=crop', '東京動物愛護センター', '03-1234-5678', 25000, TRUE, TRUE, TRUE, TRUE),
('102', 'クロ', 'cat', '黒猫', 4, '男の子', '中型', '黒', '大阪府', '美しい黒猫のクロくんです。少しシャイですが、慣れるととても甘えん坊になります。', '["シャイ", "甘えん坊", "静か", "上品"]', '健康状態良好', '["静かな環境", "ゆっくりとした慣らし", "定期的なブラッシング"]', 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=500&h=600&fit=crop', '大阪府動物愛護センター', '06-1234-5678', 22000, TRUE, TRUE, TRUE, TRUE),
('103', 'ソラ', 'cat', 'ロシアンブルー', 3, '男の子', '中型', 'ブルーグレー', '神奈川県', '上品なロシアンブルーのソラくんです。とても賢く、静かな性格で一人暮らしの方にも最適です。', '["賢い", "静か", "上品", "独立心旺盛"]', '健康状態良好', '["静かな環境", "知的刺激", "適度な一人時間"]', 'https://images.unsplash.com/photo-1571566882372-1598d88abd90?w=500&h=600&fit=crop', '神奈川県動物保護センター', '045-1234-5678', 30000, TRUE, TRUE, TRUE, FALSE);

-- 猫の詳細情報を挿入
INSERT INTO cat_details (animal_id, coat_length, indoor_outdoor, social_level, multi_cat_compatible, vocalization, activity_time) VALUES
('101', '短毛', '完全室内', '人懐っこい', TRUE, '普通', 'どちらでも'),
('102', '短毛', '完全室内', 'シャイ', FALSE, '静か', '夜型'),
('103', '短毛', '完全室内', '警戒心強い', FALSE, '静か', '昼型');