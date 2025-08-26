-- TTLカラムの追加（created_atは既に存在）
ALTER TABLE pets ADD COLUMN expires_at DATETIME;
ALTER TABLE pets ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE pets ADD COLUMN deleted_at DATETIME;

-- 期限切れデータ検索用インデックス（存在しない場合のみ作成）
CREATE INDEX IF NOT EXISTS idx_pets_expires ON pets(expires_at);
CREATE INDEX IF NOT EXISTS idx_pets_is_deleted ON pets(is_deleted);
CREATE INDEX IF NOT EXISTS idx_pets_created_at ON pets(created_at);

-- デフォルトで7日後に期限切れ
UPDATE pets SET expires_at = datetime(CURRENT_TIMESTAMP, '+7 days') WHERE expires_at IS NULL;