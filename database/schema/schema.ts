import { sqliteTable, text, integer, index, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ペットテーブル
export const pets = sqliteTable(
  'pets',
  {
    // Core fields
    id: text('id').primaryKey(),
    type: text('type').notNull(), // 'dog' | 'cat'
    name: text('name').notNull(),
    breed: text('breed'),
    age: real('age'),
    age_group: text('age_group'),
    gender: text('gender'),

    // Location fields
    prefecture: text('prefecture'),
    city: text('city'),
    location: text('location'),

    // Description fields
    description: text('description'),
    personality_traits: text('personality_traits'), // JSON array
    medical_info: text('medical_info'),
    care_requirements: text('care_requirements'), // JSON array
    special_needs: text('special_needs'),

    // Extended pet information
    status: text('status').notNull().default('available'), // 'available' | 'adopted' | 'pending' | 'unavailable'
    vaccination_status: text('vaccination_status'),
    spayed_neutered: integer('spayed_neutered'),

    // Physical characteristics
    color: text('color'),
    weight: real('weight'),
    size: text('size'),
    coatLength: text('coat_length'),

    // Compatibility flags
    good_with_kids: integer('good_with_kids'),
    good_with_pets: integer('good_with_pets'),

    // Organization information
    organization_id: text('organization_id'),
    organization_name: text('organization_name'),
    contact_email: text('contact_email'),
    contact_phone: text('contact_phone'),
    adoption_fee: real('adoption_fee'),

    // Media
    images: text('images'), // JSON array of image URLs
    video_url: text('video_url'),

    // Metadata
    source_url: text('source_url'),
    external_id: text('external_id'),
    posted_date: text('posted_date'),
    updated_date: text('updated_date'),
    tags: text('tags'), // JSON array
    featured: integer('featured').default(0),
    views: integer('views').default(0),
    likes: integer('likes').default(0),

    // Timestamps
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    typeIdx: index('idx_pets_type').on(table.type),
    statusIdx: index('idx_pets_status').on(table.status),
    prefectureIdx: index('idx_pets_prefecture').on(table.prefecture),
    createdAtIdx: index('idx_pets_created_at').on(table.created_at),
    typeCreatedIdx: index('idx_pets_type_created').on(table.type, table.created_at),
    featuredIdx: index('idx_pets_featured').on(table.featured),
  })
)

// クローラー状態テーブル
export const crawlerStates = sqliteTable(
  'crawler_states',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sourceId: text('source_id').notNull(),
    petType: text('pet_type').notNull(),
    checkpoint: text('checkpoint'), // JSON
    totalProcessed: integer('total_processed').default(0),
    lastCrawlAt: text('last_crawl_at'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    sourceTypeIdx: index('idx_crawler_states_source_type').on(table.sourceId, table.petType),
  })
)

// 同期ステータステーブル
export const syncStatus = sqliteTable(
  'sync_status',
  {
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
  },
  (table) => ({
    syncTypeIdx: index('idx_sync_status_type').on(table.syncType),
    statusIdx: index('idx_sync_status_status').on(table.status),
    createdAtIdx: index('idx_sync_status_created').on(table.createdAt),
  })
)

// 同期メタデータテーブル
export const syncMetadata = sqliteTable(
  'sync_metadata',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    key: text('key').notNull().unique(),
    value: text('value'),
    valueType: text('value_type').default('string'),
    description: text('description'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    keyIdx: index('idx_sync_metadata_key').on(table.key),
  })
)

// 画像テーブル
export const images = sqliteTable(
  'images',
  {
    id: text('id').primaryKey(),
    pet_id: text('pet_id').notNull(),
    url: text('url').notNull(),
    thumbnail_url: text('thumbnail_url'),
    alt_text: text('alt_text'),
    is_primary: integer('is_primary').default(0),
    display_order: integer('display_order').default(0),
    width: integer('width'),
    height: integer('height'),
    size: integer('size'),
    mime_type: text('mime_type'),
    status: text('status').default('pending'), // 'pending' | 'processed' | 'failed' | 'deleted'
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    petIdIdx: index('idx_images_pet_id').on(table.pet_id),
    statusIdx: index('idx_images_status').on(table.status),
    isPrimaryIdx: index('idx_images_is_primary').on(table.is_primary),
  })
)

// APIキーテーブル
export const apiKeys = sqliteTable(
  'api_keys',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull().unique(),
    name: text('name').notNull(),
    type: text('type').notNull(), // 'public' | 'internal' | 'admin'
    permissions: text('permissions').notNull(), // JSON配列形式
    rateLimit: integer('rate_limit').notNull().default(100),
    expiresAt: text('expires_at'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastUsedAt: text('last_used_at'),
    isActive: integer('is_active').notNull().default(1),
    metadata: text('metadata'), // JSON形式の追加メタデータ
  },
  (table) => ({
    keyIdx: index('idx_api_keys_key').on(table.key),
    typeIdx: index('idx_api_keys_type').on(table.type),
    isActiveIdx: index('idx_api_keys_is_active').on(table.isActive),
    expiresAtIdx: index('idx_api_keys_expires_at').on(table.expiresAt),
  })
)
