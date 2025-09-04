CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`permissions` text NOT NULL,
	`rate_limit` integer DEFAULT 100 NOT NULL,
	`expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_used_at` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_unique` ON `api_keys` (`key`);--> statement-breakpoint
CREATE INDEX `idx_api_keys_key` ON `api_keys` (`key`);--> statement-breakpoint
CREATE INDEX `idx_api_keys_type` ON `api_keys` (`type`);--> statement-breakpoint
CREATE INDEX `idx_api_keys_is_active` ON `api_keys` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_api_keys_expires_at` ON `api_keys` (`expires_at`);--> statement-breakpoint
CREATE TABLE `crawler_states` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` text NOT NULL,
	`pet_type` text NOT NULL,
	`checkpoint` text,
	`total_processed` integer DEFAULT 0,
	`last_crawl_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_crawler_states_source_type` ON `crawler_states` (`source_id`,`pet_type`);--> statement-breakpoint
CREATE TABLE `pets` (
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
	`good_with` text,
	`health_notes` text,
	`color` text,
	`weight` real,
	`size` text,
	`coat_length` text,
	`is_neutered` integer DEFAULT 0,
	`is_vaccinated` integer DEFAULT 0,
	`vaccination_status` text,
	`is_fiv_felv_tested` integer DEFAULT 0,
	`exercise_level` text,
	`training_level` text,
	`social_level` text,
	`indoor_outdoor` text,
	`grooming_requirements` text,
	`good_with_kids` integer DEFAULT 0,
	`good_with_dogs` integer DEFAULT 0,
	`good_with_cats` integer DEFAULT 0,
	`apartment_friendly` integer DEFAULT 0,
	`needs_yard` integer DEFAULT 0,
	`image_url` text,
	`has_jpeg` integer DEFAULT 0,
	`has_webp` integer DEFAULT 0,
	`image_checked_at` text,
	`screenshot_requested_at` text,
	`screenshot_completed_at` text,
	`shelter_name` text,
	`shelter_contact` text,
	`source_url` text,
	`source_id` text DEFAULT 'pet-home',
	`adoption_fee` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_pets_type` ON `pets` (`type`);--> statement-breakpoint
CREATE INDEX `idx_pets_prefecture` ON `pets` (`prefecture`);--> statement-breakpoint
CREATE INDEX `idx_pets_created_at` ON `pets` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_pets_has_jpeg` ON `pets` (`has_jpeg`);--> statement-breakpoint
CREATE INDEX `idx_pets_has_webp` ON `pets` (`has_webp`);--> statement-breakpoint
CREATE INDEX `idx_pets_type_created` ON `pets` (`type`,`created_at`);--> statement-breakpoint
CREATE TABLE `sync_metadata` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`value_type` text DEFAULT 'string',
	`description` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sync_metadata_key_unique` ON `sync_metadata` (`key`);--> statement-breakpoint
CREATE INDEX `idx_sync_metadata_key` ON `sync_metadata` (`key`);--> statement-breakpoint
CREATE TABLE `sync_status` (
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
--> statement-breakpoint
CREATE INDEX `idx_sync_status_type` ON `sync_status` (`sync_type`);--> statement-breakpoint
CREATE INDEX `idx_sync_status_status` ON `sync_status` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sync_status_created` ON `sync_status` (`created_at`);