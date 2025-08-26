-- 既存データのTTLを7日に更新
UPDATE pets 
SET expires_at = datetime(created_at, '+7 days') 
WHERE expires_at > datetime(created_at, '+7 days');