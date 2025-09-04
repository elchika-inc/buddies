import { sqliteTable, text, integer, index, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ペットテーブル
export const pets = sqliteTable('pets', {
  // Core fields
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'dog' | 'cat'
  name: text('name').notNull(),
  breed: text('breed'),
  age: text('age'),
  gender: text('gender'),
  
  // Location fields
  prefecture: text('prefecture'),
  city: text('city'),
  location: text('location'),
  
  // Description fields
  description: text('description'),
  personality: text('personality'), // JSON array
  medicalInfo: text('medical_info'),
  careRequirements: text('care_requirements'), // JSON array
  
  // Extended pet information
  goodWith: text('good_with'), // JSON array
  healthNotes: text('health_notes'), // JSON array
  
  // Physical characteristics
  color: text('color'),
  weight: real('weight'),
  size: text('size'),
  coatLength: text('coat_length'),
  
  // Health status
  isNeutered: integer('is_neutered').default(0),
  isVaccinated: integer('is_vaccinated').default(0),
  vaccinationStatus: text('vaccination_status'),
  isFivFelvTested: integer('is_fiv_felv_tested').default(0),
  
  // Behavior characteristics
  exerciseLevel: text('exercise_level'),
  trainingLevel: text('training_level'),
  socialLevel: text('social_level'),
  indoorOutdoor: text('indoor_outdoor'),
  groomingRequirements: text('grooming_requirements'),
  
  // Compatibility flags
  goodWithKids: integer('good_with_kids').default(0),
  goodWithDogs: integer('good_with_dogs').default(0),
  goodWithCats: integer('good_with_cats').default(0),
  apartmentFriendly: integer('apartment_friendly').default(0),
  needsYard: integer('needs_yard').default(0),
  
  // Image management
  imageUrl: text('image_url'),
  hasJpeg: integer('has_jpeg').default(0),
  hasWebp: integer('has_webp').default(0),
  imageCheckedAt: text('image_checked_at'),
  screenshotRequestedAt: text('screenshot_requested_at'),
  screenshotCompletedAt: text('screenshot_completed_at'),
  
  // Shelter information
  shelterName: text('shelter_name'),
  shelterContact: text('shelter_contact'),
  sourceUrl: text('source_url'),
  sourceId: text('source_id').default('pet-home'),
  adoptionFee: integer('adoption_fee').default(0),
  
  // Timestamps
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  typeIdx: index('idx_pets_type').on(table.type),
  prefectureIdx: index('idx_pets_prefecture').on(table.prefecture),
  createdAtIdx: index('idx_pets_created_at').on(table.createdAt),
  hasJpegIdx: index('idx_pets_has_jpeg').on(table.hasJpeg),
  hasWebpIdx: index('idx_pets_has_webp').on(table.hasWebp),
  typeCreatedIdx: index('idx_pets_type_created').on(table.type, table.createdAt),
}));

// クローラー状態テーブル
export const crawlerStates = sqliteTable('crawler_states', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceId: text('source_id').notNull(),
  petType: text('pet_type').notNull(),
  checkpoint: text('checkpoint'), // JSON
  totalProcessed: integer('total_processed').default(0),
  lastCrawlAt: text('last_crawl_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  sourceTypeIdx: index('idx_crawler_states_source_type').on(table.sourceId, table.petType),
}));

// 同期ステータステーブル
export const syncStatus = sqliteTable('sync_status', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  syncType: text('sync_type').notNull(),
  status: text('status').notNull(), // 'pending' | 'running' | 'completed' | 'failed'
  totalRecords: integer('total_records').default(0),
  processedRecords: integer('processed_records').default(0),
  failedRecords: integer('failed_records').default(0),
  metadata: text('metadata'), // JSON
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  syncTypeIdx: index('idx_sync_status_type').on(table.syncType),
  statusIdx: index('idx_sync_status_status').on(table.status),
  createdAtIdx: index('idx_sync_status_created').on(table.createdAt),
}));

// 同期メタデータテーブル
export const syncMetadata = sqliteTable('sync_metadata', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value'),
  valueType: text('value_type').default('string'),
  description: text('description'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  keyIdx: index('idx_sync_metadata_key').on(table.key),
}));

// APIキーテーブル
export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'public' | 'internal' | 'admin'
  permissions: text('permissions').notNull(), // JSON配列形式
  rateLimit: integer('rate_limit').notNull().default(100),
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  lastUsedAt: text('last_used_at'),
  isActive: integer('is_active').notNull().default(1),
  metadata: text('metadata'), // JSON形式の追加メタデータ
}, (table) => ({
  keyIdx: index('idx_api_keys_key').on(table.key),
  typeIdx: index('idx_api_keys_type').on(table.type),
  isActiveIdx: index('idx_api_keys_is_active').on(table.isActive),
  expiresAtIdx: index('idx_api_keys_expires_at').on(table.expiresAt),
}));