/**
 * アプリケーション設定の中央管理
 */
export const AppConfig = {
  // データベース設定
  database: {
    minRequiredPets: {
      dogs: 30,
      cats: 30
    },
    imageRequirements: {
      minCoverage: 0.8,
      checkInterval: 60000
    },
    batchSize: 50 // SQLiteの制限を考慮
  },
  
  // API設定
  api: {
    pagination: {
      defaultLimit: 20,
      maxLimit: 100,
      defaultPage: 1
    },
    cache: {
      images: 86400,  // 1日
      api: 300        // 5分
    }
  },
  
  // 認証設定
  auth: {
    publicPaths: [
      '/',
      '/health',
      '/health/ready'
    ]
  },
  
  // CORS設定
  cors: {
    allowedDomainPatterns: [
      /^https:\/\/pawmatch\.pages\.dev$/,
      /^https:\/\/[^.]+\.pawmatch\.pages\.dev$/,
      /^https:\/\/pawmatch-dogs\.elchika\.app$/,
      /^https:\/\/pawmatch-cats\.elchika\.app$/,
      /^https:\/\/[^.]+\.dogmatch-\w+\.pages\.dev$/,
      /^https:\/\/[^.]+\.catmatch\.pages\.dev$/,
      /^http:\/\/localhost:\d{4}$/
    ],
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
  },
  
  // キャッシュ設定
  cache: {
    name: 'pawmatch-cache',
    control: 'public, max-age=86400' // 1日
  },
  
  // 画像設定
  images: {
    formats: {
      jpeg: {
        quality: 85,
        extension: '.jpg'
      },
      webp: {
        quality: 85,
        extension: '.webp'
      }
    },
    storage: {
      basePath: 'pets',
      folders: {
        dogs: 'dogs',
        cats: 'cats'
      }
    }
  },
  
  // エラーメッセージ
  errors: {
    notFound: 'Resource not found',
    unauthorized: 'Unauthorized access',
    invalidRequest: 'Invalid request',
    serverError: 'Internal server error',
    serviceUnavailable: 'Service temporarily unavailable'
  }
} as const;

// 型エクスポート
export type AppConfigType = typeof AppConfig;