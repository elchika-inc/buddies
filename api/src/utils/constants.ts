export const CONFIG = {
  CACHE_DURATION: {
    IMAGES_JPEG: 86400, // 24時間
    IMAGES_WEBP: 604800, // 7日間
    API_RESPONSE: 300, // 5分間
    STATIC_ASSETS: 31536000, // 1年間
  },

  LIMITS: {
    MAX_PETS_PER_REQUEST: 100,
    DEFAULT_PETS_PER_REQUEST: 20,
    DEFAULT_PAGE: 1,
    MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
    BATCH_SIZE: 50,
    MAX_RANDOM_PETS: 20,
    DEFAULT_RANDOM_PETS: 5,
  },

  DATABASE: {
    MIN_REQUIRED_DOGS: 30,
    MIN_REQUIRED_CATS: 30,
    MIN_IMAGE_COVERAGE: 0.8,
    READINESS_CHECK_INTERVAL: 60000, // 1分
  },

  STORAGE: {
    AVG_JPEG_SIZE: 150 * 1024, // 150KB - 一般的なペット写真のJPEGサイズ
    AVG_WEBP_SIZE: 100 * 1024, // 100KB - WebP圧縮後のサイズ
    STORAGE_MARGIN: 1.2, // 20%のマージン
  },

  PERFORMANCE: {
    DEFAULT_SUCCESS_RATE: 99.5,
    DEFAULT_AVG_RESPONSE_TIME: 50, // ms
    DB_HEALTH_CHECK_TIMEOUT: 1000, // ms
    R2_HEALTH_CHECK_TIMEOUT: 2000, // ms
  },

  STATISTICS: {
    TOP_PREFECTURES_LIMIT: 10,
    RECENT_PETS_LIMIT: 10,
    COVERAGE_TREND_DAYS: 7,
  },

  IMAGE_PATHS: {
    original: (petType: string, petId: string) => `pets/${petType}s/${petId}/original.jpg`,
    optimized: (petType: string, petId: string) => `pets/${petType}s/${petId}/optimized.webp`,
  },

  CACHE_NAME: 'pawmatch-cache',
  CACHE_CONTROL: 'public, max-age=86400',
}

export const PET_TYPES = ['dog', 'cat'] as const
export type PetType = (typeof PET_TYPES)[number]

export const IMAGE_FORMATS = ['jpeg', 'jpg', 'webp', 'auto'] as const
export type ImageFormat = (typeof IMAGE_FORMATS)[number]
