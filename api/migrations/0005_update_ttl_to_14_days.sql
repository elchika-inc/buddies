-- 既存データのTTLを14日に更新
UPDATE pets 
SET expires_at = datetime(created_at, '+14 days') 
WHERE expires_at IS NOT NULL;