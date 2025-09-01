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

export interface Pet {
  id: string;
  type: 'dog' | 'cat';
  name: string;
  breed: string;
  age: string;
  gender: string;
  prefecture: string;
  city: string;
  location: string;
  description: string;
  personality: string[];
  medicalInfo: string;
  careRequirements: string[];
  imageUrl: string;
  shelterName: string;
  shelterContact: string;
  sourceUrl: string;
  createdAt: string;
}

export interface CrawlResult {
  success: boolean;
  totalPets: number;
  newPets: number;
  updatedPets: number;
  errors: string[];
}