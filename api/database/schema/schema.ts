import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ペットテーブル
export const pets = sqliteTable('pets', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'dog' | 'cat'
  name: text('name').notNull(),
  breed: text('breed'),
  age: text('age'),
  gender: text('gender'),
  prefecture: text('prefecture'),
  city: text('city'),
  location: text('location'),
  description: text('description'),
  personality: text('personality'), // JSON array
  medicalInfo: text('medical_info'),
  careRequirements: text('care_requirements'), // JSON array
  imageUrl: text('image_url'),
  shelterName: text('shelter_name'),
  shelterContact: text('shelter_contact'),
  sourceUrl: text('source_url'),
  adoptionFee: integer('adoption_fee').default(0),
  metadata: text('metadata'), // JSON object
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  // 画像関連
  hasJpeg: integer('has_jpeg').default(0),
  hasWebp: integer('has_webp').default(0),
  imageCheckedAt: text('image_checked_at'),
  screenshotRequestedAt: text('screenshot_requested_at'),
  screenshotCompletedAt: text('screenshot_completed_at'),
  sourceId: text('source_id').default('pet-home'),
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