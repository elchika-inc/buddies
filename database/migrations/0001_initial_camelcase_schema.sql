-- Initial schema with camelCase field names

-- Drop existing tables if they exist
DROP TABLE IF EXISTS `api_keys`;
DROP TABLE IF EXISTS `sync_metadata`;
DROP TABLE IF EXISTS `sync_status`;
DROP TABLE IF EXISTS `crawler_states`;
DROP TABLE IF EXISTS `pets`;

-- Create pets table with camelCase columns
CREATE TABLE `pets` (
  `id` text PRIMARY KEY NOT NULL,
  `type` text NOT NULL,
  `name` text NOT NULL,
  `breed` text,
  `age` text,
  `gender` text,
  
  -- Location fields
  `prefecture` text,
  `city` text,
  `location` text,
  
  -- Description fields
  `description` text,
  `personality` text,
  `medicalInfo` text,
  `careRequirements` text,
  `goodWith` text,
  `healthNotes` text,
  
  -- Physical characteristics
  `color` text,
  `weight` real,
  `size` text,
  `coatLength` text,
  
  -- Medical status
  `isNeutered` integer DEFAULT 0,
  `isVaccinated` integer DEFAULT 0,
  `vaccinationStatus` text,
  `isFivFelvTested` integer DEFAULT 0,
  
  -- Behavior and requirements
  `exerciseLevel` text,
  `trainingLevel` text,
  `socialLevel` text,
  `indoorOutdoor` text,
  `groomingRequirements` text,
  
  -- Compatibility flags
  `goodWithKids` integer DEFAULT 0,
  `goodWithDogs` integer DEFAULT 0,
  `goodWithCats` integer DEFAULT 0,
  `apartmentFriendly` integer DEFAULT 0,
  `needsYard` integer DEFAULT 0,
  
  -- Image status
  `imageUrl` text,
  `hasJpeg` integer DEFAULT 0,
  `hasWebp` integer DEFAULT 0,
  `imageCheckedAt` text,
  `screenshotRequestedAt` text,
  `screenshotCompletedAt` text,
  
  -- Shelter information
  `shelterName` text,
  `shelterContact` text,
  
  -- Source information
  `sourceUrl` text,
  `sourceId` text DEFAULT 'pet-home',
  `adoptionFee` integer DEFAULT 0,
  
  -- Timestamps
  `createdAt` text DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` text DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for pets table
CREATE INDEX `idx_pets_type` ON `pets` (`type`);
CREATE INDEX `idx_pets_prefecture` ON `pets` (`prefecture`);
CREATE INDEX `idx_pets_createdAt` ON `pets` (`createdAt`);
CREATE INDEX `idx_pets_hasJpeg` ON `pets` (`hasJpeg`);
CREATE INDEX `idx_pets_hasWebp` ON `pets` (`hasWebp`);
CREATE INDEX `idx_pets_type_created` ON `pets` (`type`, `createdAt`);

-- Create crawler_states table with camelCase columns
CREATE TABLE `crawler_states` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `sourceId` text NOT NULL,
  `petType` text NOT NULL,
  `checkpoint` text,
  `totalProcessed` integer DEFAULT 0,
  `lastCrawlAt` text,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` text DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX `idx_crawler_states_source_type` ON `crawler_states` (`sourceId`, `petType`);

-- Create sync_status table with camelCase columns
CREATE TABLE `sync_status` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `syncType` text NOT NULL,
  `status` text NOT NULL,
  `totalRecords` integer DEFAULT 0,
  `processedRecords` integer DEFAULT 0,
  `failedRecords` integer DEFAULT 0,
  `metadata` text,
  `startedAt` text,
  `completedAt` text,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX `idx_sync_status_type` ON `sync_status` (`syncType`);
CREATE INDEX `idx_sync_status_status` ON `sync_status` (`status`);
CREATE INDEX `idx_sync_status_created` ON `sync_status` (`createdAt`);

-- Create sync_metadata table with camelCase columns
CREATE TABLE `sync_metadata` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `key` text NOT NULL UNIQUE,
  `value` text,
  `valueType` text DEFAULT 'string',
  `description` text,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` text DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX `idx_sync_metadata_key` ON `sync_metadata` (`key`);

-- Create api_keys table with camelCase columns
CREATE TABLE `api_keys` (
  `id` text PRIMARY KEY NOT NULL,
  `key` text NOT NULL UNIQUE,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `permissions` text NOT NULL,
  `rateLimit` integer NOT NULL DEFAULT 100,
  `expiresAt` text,
  `createdAt` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lastUsedAt` text,
  `isActive` integer NOT NULL DEFAULT 1,
  `metadata` text
);

CREATE INDEX `idx_api_keys_key` ON `api_keys` (`key`);
CREATE INDEX `idx_api_keys_type` ON `api_keys` (`type`);
CREATE INDEX `idx_api_keys_isActive` ON `api_keys` (`isActive`);
CREATE INDEX `idx_api_keys_expiresAt` ON `api_keys` (`expiresAt`);