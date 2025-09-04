/**
 * Shared type definitions for PawMatch
 * These types are derived from the Drizzle ORM schema defined in api/database/schema/schema.ts
 */

// ============== Pet Related Types ==============

export interface Pet {
  // Core fields
  id: string
  type: 'dog' | 'cat'
  name: string
  breed?: string | null
  age?: string | null
  gender?: 'male' | 'female' | 'unknown' | null

  // Location fields
  prefecture?: string | null
  city?: string | null
  location?: string | null

  // Description fields
  description?: string | null
  personality?: string[] | string | null // JSON array or string
  medicalInfo?: string | null
  careRequirements?: string[] | string | null // JSON array or string

  // Extended pet information
  goodWith?: string[] | string | null // JSON array or string
  healthNotes?: string[] | string | null // JSON array or string

  // Physical characteristics
  color?: string | null
  weight?: number | null
  size?: string | null
  coatLength?: string | null

  // Health status
  isNeutered?: boolean | number | null
  isVaccinated?: boolean | number | null
  vaccinationStatus?: string | null
  isFivFelvTested?: boolean | number | null

  // Behavior characteristics
  exerciseLevel?: string | null
  trainingLevel?: string | null
  socialLevel?: string | null
  indoorOutdoor?: string | null
  groomingRequirements?: string | null

  // Compatibility flags
  goodWithKids?: boolean | number | null
  goodWithDogs?: boolean | number | null
  goodWithCats?: boolean | number | null
  apartmentFriendly?: boolean | number | null
  needsYard?: boolean | number | null

  // Image management
  imageUrl?: string | null
  hasJpeg?: boolean | number | null
  hasWebp?: boolean | number | null
  imageCheckedAt?: string | null
  screenshotRequestedAt?: string | null
  screenshotCompletedAt?: string | null

  // Shelter information
  shelterName?: string | null
  shelterContact?: string | null
  sourceUrl?: string | null
  sourceId?: string | null
  adoptionFee?: number | null

  // Timestamps
  createdAt?: string | null
  updatedAt?: string | null
}

// Database record types (snake_case for DB compatibility)
export interface PetRecord {
  id: string
  type: 'dog' | 'cat'
  name: string
  breed?: string | null
  age?: string | null
  gender?: string | null
  prefecture?: string | null
  city?: string | null
  location?: string | null
  description?: string | null
  personality?: string | null
  medical_info?: string | null
  care_requirements?: string | null
  good_with?: string | null
  health_notes?: string | null
  color?: string | null
  weight?: number | null
  size?: string | null
  coat_length?: string | null
  is_neutered?: number | null
  is_vaccinated?: number | null
  vaccination_status?: string | null
  is_fiv_felv_tested?: number | null
  exercise_level?: string | null
  training_level?: string | null
  social_level?: string | null
  indoor_outdoor?: string | null
  grooming_requirements?: string | null
  good_with_kids?: number | null
  good_with_dogs?: number | null
  good_with_cats?: number | null
  apartment_friendly?: number | null
  needs_yard?: number | null
  image_url?: string | null
  has_jpeg?: number | null
  has_webp?: number | null
  image_checked_at?: string | null
  screenshot_requested_at?: string | null
  screenshot_completed_at?: string | null
  shelter_name?: string | null
  shelter_contact?: string | null
  source_url?: string | null
  source_id?: string | null
  adoption_fee?: number | null
  created_at?: string | null
  updated_at?: string | null
}

// ============== Crawler Related Types ==============

export interface CrawlerState {
  id?: number
  sourceId: string
  petType: 'dog' | 'cat'
  checkpoint?: string | null // JSON string
  totalProcessed?: number | null
  lastCrawlAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface CrawlerStateRecord {
  id?: number
  source_id: string
  pet_type: string
  checkpoint?: string | null
  total_processed?: number | null
  last_crawl_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

// ============== Sync Related Types ==============

export interface SyncStatus {
  id?: number
  syncType: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  totalRecords?: number | null
  processedRecords?: number | null
  failedRecords?: number | null
  metadata?: string | null // JSON string
  startedAt?: string | null
  completedAt?: string | null
  createdAt?: string | null
}

export interface SyncStatusRecord {
  id?: number
  sync_type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  total_records?: number | null
  processed_records?: number | null
  failed_records?: number | null
  metadata?: string | null
  started_at?: string | null
  completed_at?: string | null
  created_at?: string | null
}

export interface SyncMetadata {
  id?: number
  key: string
  value?: string | null
  valueType?: string | null
  description?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface SyncMetadataRecord {
  id?: number
  key: string
  value?: string | null
  value_type?: string | null
  description?: string | null
  created_at?: string | null
  updated_at?: string | null
}

// ============== Utility Types ==============

export interface CrawlResult {
  success: boolean
  totalPets: number
  newPets: number
  updatedPets: number
  errors: string[]
}

export interface CrawlCheckpoint {
  page?: number
  lastId?: string
  timestamp?: string
  [key: string]: any
}

// Type guards
export const isPet = (obj: any): obj is Pet => {
  return obj && typeof obj.id === 'string' && (obj.type === 'dog' || obj.type === 'cat')
}

export const isPetRecord = (obj: any): obj is PetRecord => {
  return obj && typeof obj.id === 'string' && (obj.type === 'dog' || obj.type === 'cat')
}

// Conversion helpers
export const petToRecord = (pet: Pet): PetRecord => {
  return {
    id: pet.id,
    type: pet.type,
    name: pet.name,
    breed: pet.breed ?? null,
    age: pet.age ?? null,
    gender: pet.gender ?? null,
    prefecture: pet.prefecture ?? null,
    city: pet.city ?? null,
    location: pet.location ?? null,
    description: pet.description ?? null,
    personality: typeof pet.personality === 'string' 
      ? pet.personality 
      : pet.personality ? JSON.stringify(pet.personality) : null,
    medical_info: pet.medicalInfo ?? null,
    care_requirements: typeof pet.careRequirements === 'string'
      ? pet.careRequirements
      : pet.careRequirements ? JSON.stringify(pet.careRequirements) : null,
    good_with: typeof pet.goodWith === 'string'
      ? pet.goodWith
      : pet.goodWith ? JSON.stringify(pet.goodWith) : null,
    health_notes: typeof pet.healthNotes === 'string'
      ? pet.healthNotes
      : pet.healthNotes ? JSON.stringify(pet.healthNotes) : null,
    color: pet.color ?? null,
    weight: pet.weight ?? null,
    size: pet.size ?? null,
    coat_length: pet.coatLength ?? null,
    is_neutered: typeof pet.isNeutered === 'boolean' ? (pet.isNeutered ? 1 : 0) : pet.isNeutered ?? null,
    is_vaccinated: typeof pet.isVaccinated === 'boolean' ? (pet.isVaccinated ? 1 : 0) : pet.isVaccinated ?? null,
    vaccination_status: pet.vaccinationStatus ?? null,
    is_fiv_felv_tested: typeof pet.isFivFelvTested === 'boolean' ? (pet.isFivFelvTested ? 1 : 0) : pet.isFivFelvTested ?? null,
    exercise_level: pet.exerciseLevel ?? null,
    training_level: pet.trainingLevel ?? null,
    social_level: pet.socialLevel ?? null,
    indoor_outdoor: pet.indoorOutdoor ?? null,
    grooming_requirements: pet.groomingRequirements ?? null,
    good_with_kids: typeof pet.goodWithKids === 'boolean' ? (pet.goodWithKids ? 1 : 0) : pet.goodWithKids ?? null,
    good_with_dogs: typeof pet.goodWithDogs === 'boolean' ? (pet.goodWithDogs ? 1 : 0) : pet.goodWithDogs ?? null,
    good_with_cats: typeof pet.goodWithCats === 'boolean' ? (pet.goodWithCats ? 1 : 0) : pet.goodWithCats ?? null,
    apartment_friendly: typeof pet.apartmentFriendly === 'boolean' ? (pet.apartmentFriendly ? 1 : 0) : pet.apartmentFriendly ?? null,
    needs_yard: typeof pet.needsYard === 'boolean' ? (pet.needsYard ? 1 : 0) : pet.needsYard ?? null,
    image_url: pet.imageUrl ?? null,
    has_jpeg: typeof pet.hasJpeg === 'boolean' ? (pet.hasJpeg ? 1 : 0) : pet.hasJpeg ?? null,
    has_webp: typeof pet.hasWebp === 'boolean' ? (pet.hasWebp ? 1 : 0) : pet.hasWebp ?? null,
    image_checked_at: pet.imageCheckedAt ?? null,
    screenshot_requested_at: pet.screenshotRequestedAt ?? null,
    screenshot_completed_at: pet.screenshotCompletedAt ?? null,
    shelter_name: pet.shelterName ?? null,
    shelter_contact: pet.shelterContact ?? null,
    source_url: pet.sourceUrl ?? null,
    source_id: pet.sourceId ?? null,
    adoption_fee: pet.adoptionFee ?? null,
    created_at: pet.createdAt ?? null,
    updated_at: pet.updatedAt ?? null,
  }
}

export const recordToPet = (record: PetRecord): Pet => {
  return {
    id: record.id,
    type: record.type,
    name: record.name,
    breed: record.breed,
    age: record.age,
    gender: record.gender as Pet['gender'],
    prefecture: record.prefecture,
    city: record.city,
    location: record.location,
    description: record.description,
    personality: record.personality ? JSON.parse(record.personality) : null,
    medicalInfo: record.medical_info,
    careRequirements: record.care_requirements ? JSON.parse(record.care_requirements) : null,
    goodWith: record.good_with ? JSON.parse(record.good_with) : null,
    healthNotes: record.health_notes ? JSON.parse(record.health_notes) : null,
    color: record.color,
    weight: record.weight,
    size: record.size,
    coatLength: record.coat_length,
    isNeutered: record.is_neutered === 1,
    isVaccinated: record.is_vaccinated === 1,
    vaccinationStatus: record.vaccination_status,
    isFivFelvTested: record.is_fiv_felv_tested === 1,
    exerciseLevel: record.exercise_level,
    trainingLevel: record.training_level,
    socialLevel: record.social_level,
    indoorOutdoor: record.indoor_outdoor,
    groomingRequirements: record.grooming_requirements,
    goodWithKids: record.good_with_kids === 1,
    goodWithDogs: record.good_with_dogs === 1,
    goodWithCats: record.good_with_cats === 1,
    apartmentFriendly: record.apartment_friendly === 1,
    needsYard: record.needs_yard === 1,
    imageUrl: record.image_url,
    hasJpeg: record.has_jpeg === 1,
    hasWebp: record.has_webp === 1,
    imageCheckedAt: record.image_checked_at,
    screenshotRequestedAt: record.screenshot_requested_at,
    screenshotCompletedAt: record.screenshot_completed_at,
    shelterName: record.shelter_name,
    shelterContact: record.shelter_contact,
    sourceUrl: record.source_url,
    sourceId: record.source_id,
    adoptionFee: record.adoption_fee,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}