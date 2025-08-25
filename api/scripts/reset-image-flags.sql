-- テスト用に5件だけ画像フラグをリセット
UPDATE pets 
SET has_jpeg = 0, has_webp = 0 
WHERE id IN (
  SELECT id FROM pets 
  WHERE type = 'dog' 
  LIMIT 3
);