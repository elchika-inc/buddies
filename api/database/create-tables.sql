-- ペットテーブルの作成
CREATE TABLE IF NOT EXISTS `pets` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`breed` text,
	`age` text,
	`gender` text,
	`prefecture` text,
	`city` text,
	`location` text,
	`description` text,
	`personality` text,
	`medical_info` text,
	`care_requirements` text,
	`image_url` text,
	`shelter_name` text,
	`shelter_contact` text,
	`source_url` text,
	`adoption_fee` integer DEFAULT 0,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`has_jpeg` integer DEFAULT 0,
	`has_webp` integer DEFAULT 0,
	`image_checked_at` text,
	`screenshot_requested_at` text,
	`screenshot_completed_at` text,
	`source_id` text DEFAULT 'pet-home'
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS `idx_pets_type` ON `pets` (`type`);
CREATE INDEX IF NOT EXISTS `idx_pets_prefecture` ON `pets` (`prefecture`);
CREATE INDEX IF NOT EXISTS `idx_pets_created_at` ON `pets` (`created_at`);
CREATE INDEX IF NOT EXISTS `idx_pets_has_jpeg` ON `pets` (`has_jpeg`);
CREATE INDEX IF NOT EXISTS `idx_pets_has_webp` ON `pets` (`has_webp`);
CREATE INDEX IF NOT EXISTS `idx_pets_type_created` ON `pets` (`type`,`created_at`);

-- クローラー状態テーブルの作成
CREATE TABLE IF NOT EXISTS `crawler_states` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` text NOT NULL,
	`pet_type` text NOT NULL,
	`checkpoint` text,
	`total_processed` integer DEFAULT 0,
	`last_crawl_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS `idx_crawler_states_source_type` ON `crawler_states` (`source_id`,`pet_type`);

-- 同期メタデータテーブルの作成
CREATE TABLE IF NOT EXISTS `sync_metadata` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`value_type` text DEFAULT 'string',
	`description` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS `sync_metadata_key_unique` ON `sync_metadata` (`key`);
CREATE INDEX IF NOT EXISTS `idx_sync_metadata_key` ON `sync_metadata` (`key`);

-- 同期ステータステーブルの作成
CREATE TABLE IF NOT EXISTS `sync_status` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sync_type` text NOT NULL,
	`status` text NOT NULL,
	`total_records` integer DEFAULT 0,
	`processed_records` integer DEFAULT 0,
	`failed_records` integer DEFAULT 0,
	`metadata` text,
	`started_at` text,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS `idx_sync_status_type` ON `sync_status` (`sync_type`);
CREATE INDEX IF NOT EXISTS `idx_sync_status_status` ON `sync_status` (`status`);
CREATE INDEX IF NOT EXISTS `idx_sync_status_created` ON `sync_status` (`created_at`);