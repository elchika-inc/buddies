export const CONFIG = {
  CACHE_DURATION: {
    IMAGES_JPEG: 86400,    // 24時間
    IMAGES_WEBP: 604800,   // 7日間
    API_RESPONSE: 300,     // 5分間
    STATIC_ASSETS: 31536000 // 1年間
  },
  
  LIMITS: {
    MAX_PETS_PER_REQUEST: 100,
    DEFAULT_PETS_PER_REQUEST: 20,
    MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
    BATCH_SIZE: 50
  },
  
  DATABASE: {
    MIN_REQUIRED_DOGS: 30,
    MIN_REQUIRED_CATS: 30,
    MIN_IMAGE_COVERAGE: 0.8,
    READINESS_CHECK_INTERVAL: 60000 // 1分
  },

  IMAGE_PATHS: {
    original: (petType: string, petId: string) => `pets/${petType}s/${petId}/original.jpg`,
    optimized: (petType: string, petId: string) => `pets/${petType}s/${petId}/optimized.webp`
  },

  CACHE_NAME: 'pawmatch-cache',
  CACHE_CONTROL: 'public, max-age=86400'
};

export const PET_TYPES = ['dog', 'cat'] as const;
export type PetType = typeof PET_TYPES[number];

export const IMAGE_FORMATS = ['jpeg', 'jpg', 'webp', 'auto'] as const;
export type ImageFormat = typeof IMAGE_FORMATS[number];