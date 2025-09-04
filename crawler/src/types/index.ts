import type { R2Bucket, D1Database, Queue } from '@cloudflare/workers-types';

// Re-export shared types from root types.d.ts
export type { 
  Pet, 
  PetRecord, 
  CrawlResult,
  CrawlerState,
  CrawlerStateRecord,
} from '../../../types'

export {
  petToRecord,
  recordToPet,
  isPet,
  isPetRecord
} from '../../../types'

export interface Env {
  IMAGES_BUCKET: R2Bucket;
  DB: D1Database;
  ALLOWED_ORIGIN: string;
  PET_HOME_BASE_URL: string;
  GITHUB_ACTIONS?: string;
  PAWMATCH_CAT_PETHOME_QUEUE?: Queue;
  PAWMATCH_DOG_PETHOME_QUEUE?: Queue;
  PAWMATCH_CAT_PETHOME_DLQ?: Queue;
  PAWMATCH_DOG_PETHOME_DLQ?: Queue;
}