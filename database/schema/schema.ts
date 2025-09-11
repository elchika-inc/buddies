import { sqliteTable, text, integer, index, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ペットテーブル（camelCase版）
export const pets = sqliteTable(
  'pets',
  {
    // Core fields
    id: text('id').primaryKey(),
    type: text('type').notNull(), // 'dog' | 'cat'
    name: text('name').notNull(),
    breed: text('breed'),
    age: text('age'), // DBはtext型
    gender: text('gender'),

    // Location fields
    prefecture: text('prefecture'),
    city: text('city'),
    location: text('location'),

    // Description fields
    description: text('description'),
    personality: text('personality'),
    medicalInfo: text('medicalInfo'),
    careRequirements: text('careRequirements'),
    goodWith: text('goodWith'),
    healthNotes: text('healthNotes'),

    // Physical characteristics
    color: text('color'),
    weight: real('weight'),
    size: text('size'),
    coatLength: text('coatLength'),

    // Medical status
    isNeutered: integer('isNeutered').default(0),
    isVaccinated: integer('isVaccinated').default(0),
    vaccinationStatus: text('vaccinationStatus'),
    isFivFelvTested: integer('isFivFelvTested').default(0),

    // Behavior and requirements
    exerciseLevel: text('exerciseLevel'),
    trainingLevel: text('trainingLevel'),
    socialLevel: text('socialLevel'),
    indoorOutdoor: text('indoorOutdoor'),
    groomingRequirements: text('groomingRequirements'),

    // Compatibility flags
    goodWithKids: integer('goodWithKids').default(0),
    goodWithDogs: integer('goodWithDogs').default(0),
    goodWithCats: integer('goodWithCats').default(0),
    apartmentFriendly: integer('apartmentFriendly').default(0),
    needsYard: integer('needsYard').default(0),

    // Image status
    imageUrl: text('imageUrl'),
    hasJpeg: integer('hasJpeg').default(0),
    hasWebp: integer('hasWebp').default(0),
    imageCheckedAt: text('imageCheckedAt'),
    screenshotRequestedAt: text('screenshotRequestedAt'),
    screenshotCompletedAt: text('screenshotCompletedAt'),

    // Shelter information
    shelterName: text('shelterName'),
    shelterContact: text('shelterContact'),

    // Source information
    sourceUrl: text('sourceUrl'),
    sourceId: text('sourceId').default('pet-home'),
    adoptionFee: integer('adoptionFee').default(0),

    // Timestamps
    createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    typeIdx: index('idx_pets_type').on(table.type),
    prefectureIdx: index('idx_pets_prefecture').on(table.prefecture),
    createdAtIdx: index('idx_pets_createdAt').on(table.createdAt),
    hasJpegIdx: index('idx_pets_hasJpeg').on(table.hasJpeg),
    hasWebpIdx: index('idx_pets_hasWebp').on(table.hasWebp),
    typeCreatedIdx: index('idx_pets_type_created').on(table.type, table.createdAt),
  })
)

// クローラー状態テーブル
export const crawlerStates = sqliteTable(
  'crawler_states',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sourceId: text('sourceId').notNull(),
    petType: text('petType').notNull(),
    checkpoint: text('checkpoint'),
    totalProcessed: integer('totalProcessed').default(0),
    lastCrawlAt: text('lastCrawlAt'),
    createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
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
    syncType: text('syncType').notNull(),
    status: text('status').notNull(), // 'pending' | 'running' | 'completed' | 'failed'
    totalRecords: integer('totalRecords').default(0),
    processedRecords: integer('processedRecords').default(0),
    failedRecords: integer('failedRecords').default(0),
    metadata: text('metadata'), // JSON
    startedAt: text('startedAt'),
    completedAt: text('completedAt'),
    createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
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
    valueType: text('valueType').default('string'),
    description: text('description'),
    createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    keyIdx: index('idx_sync_metadata_key').on(table.key),
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
    rateLimit: integer('rateLimit').notNull().default(100),
    expiresAt: text('expiresAt'),
    createdAt: text('createdAt')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updatedAt')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastUsedAt: text('lastUsedAt'),
    isActive: integer('isActive').notNull().default(1),
    metadata: text('metadata'), // JSON形式の追加メタデータ
  },
  (table) => ({
    keyIdx: index('idx_api_keys_key').on(table.key),
    typeIdx: index('idx_api_keys_type').on(table.type),
    isActiveIdx: index('idx_api_keys_isActive').on(table.isActive),
    expiresAtIdx: index('idx_api_keys_expiresAt').on(table.expiresAt),
  })
)
