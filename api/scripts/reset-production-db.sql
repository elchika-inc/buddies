-- 本番D1データベースのリセットスクリプト
-- 警告: このスクリプトはすべてのデータを削除します

-- 1. すべてのペットデータを削除
DELETE FROM pets WHERE 1=1;

-- 2. その他のテーブルがあれば削除（必要に応じて追加）
-- DELETE FROM users WHERE 1=1;
-- DELETE FROM favorites WHERE 1=1;

-- 3. 削除後の確認
SELECT 
  'pets' as table_name,
  COUNT(*) as remaining_count 
FROM pets;