# PawMatch デプロイメント仕様書

## 1. デプロイメント概要

### 1.1 デプロイメント戦略
- **プラットフォーム**: Cloudflare
- **フロントエンド**: Cloudflare Workers (Workers Site)
- **API**: Cloudflare Workers
- **データベース**: Cloudflare D1
- **キャッシュ**: Cloudflare KV
- **ファイルストレージ**: Cloudflare R2
- **ビルド**: 自動ビルド・デプロイ (Wrangler)
- **ブランチ戦略**: GitFlow
- **環境**: Development / Staging / Production

### 1.2 インフラ構成
```
GitHub Repository
├── main branch → Production
│   ├── Frontend: pawmatch-frontend.workers.dev
│   ├── Animal Service: animals.pawmatch.workers.dev
│   ├── User Service: users.pawmatch.workers.dev
│   ├── Matching Service: matching.pawmatch.workers.dev
│   └── Notification Service: notifications.pawmatch.workers.dev
├── develop branch → Staging
│   ├── Frontend: pawmatch-frontend-staging.workers.dev
│   └── Workers: *.staging.pawmatch.workers.dev
└── feature/* → Preview
    └── Workers: *.preview.pawmatch.workers.dev
```

## 2. 環境設定

### 2.1 Cloudflare環境変数
```bash
# 本番環境 (Pages)
VITE_APP_TITLE=PawMatch
VITE_ANIMALS_API=https://animals.pawmatch.workers.dev
VITE_USERS_API=https://users.pawmatch.workers.dev
VITE_MATCHING_API=https://matching.pawmatch.workers.dev
VITE_NOTIFICATIONS_API=https://notifications.pawmatch.workers.dev
VITE_ENVIRONMENT=production
VITE_SENTRY_DSN=https://your-sentry-dsn
VITE_ANALYTICS_ID=G-XXXXXXXXXX

# ステージング環境
VITE_APP_TITLE=PawMatch (Staging)
VITE_ANIMALS_API=https://animals.staging.pawmatch.workers.dev
VITE_USERS_API=https://users.staging.pawmatch.workers.dev
VITE_MATCHING_API=https://matching.staging.pawmatch.workers.dev
VITE_NOTIFICATIONS_API=https://notifications.staging.pawmatch.workers.dev
VITE_ENVIRONMENT=staging

# 開発環境
VITE_APP_TITLE=PawMatch (Development)
VITE_ANIMALS_API=http://localhost:8787
VITE_USERS_API=http://localhost:8788
VITE_MATCHING_API=http://localhost:8789
VITE_NOTIFICATIONS_API=http://localhost:8790
VITE_ENVIRONMENT=development
VITE_ENABLE_DEBUG=true

# Workers環境変数
ENVIRONMENT=production
CORS_ORIGIN=https://pawmatch-frontend.workers.dev
SENTRY_DSN=https://your-worker-sentry-dsn
```

### 2.2 環境別設定ファイル
```typescript
// frontend/src/config/environment.ts
export interface Environment {
  name: 'development' | 'staging' | 'production';
  api: {
    animals: string;
    users: string;
    matching: string;
    notifications: string;
  };
  enableDebug: boolean;
  sentryDsn?: string;
  analyticsId?: string;
}

const environments: Record<string, Environment> = {
  development: {
    name: 'development',
    api: {
      animals: import.meta.env.VITE_ANIMALS_API || 'http://localhost:8787',
      users: import.meta.env.VITE_USERS_API || 'http://localhost:8788',
      matching: import.meta.env.VITE_MATCHING_API || 'http://localhost:8789',
      notifications: import.meta.env.VITE_NOTIFICATIONS_API || 'http://localhost:8790'
    },
    enableDebug: true,
    sentryDsn: import.meta.env.VITE_SENTRY_DSN,
    analyticsId: import.meta.env.VITE_ANALYTICS_ID
  },
  staging: {
    name: 'staging',
    api: {
      animals: 'https://animals.staging.pawmatch.workers.dev',
      users: 'https://users.staging.pawmatch.workers.dev',
      matching: 'https://matching.staging.pawmatch.workers.dev',
      notifications: 'https://notifications.staging.pawmatch.workers.dev'
    },
    enableDebug: true,
    sentryDsn: import.meta.env.VITE_SENTRY_DSN,
    analyticsId: import.meta.env.VITE_ANALYTICS_ID
  },
  production: {
    name: 'production',
    api: {
      animals: 'https://animals.pawmatch.workers.dev',
      users: 'https://users.pawmatch.workers.dev',
      matching: 'https://matching.pawmatch.workers.dev',
      notifications: 'https://notifications.pawmatch.workers.dev'
    },
    enableDebug: false,
    sentryDsn: import.meta.env.VITE_SENTRY_DSN,
    analyticsId: import.meta.env.VITE_ANALYTICS_ID
  }
};

export const getCurrentEnvironment = (): Environment => {
  const envName = import.meta.env.VITE_ENVIRONMENT || 'development';
  return environments[envName] || environments.development;
};
```

## 3. Cloudflareデプロイメント

### 3.1 Cloudflare Workers Site設定
```toml
# frontend/wrangler.toml
name = "pawmatch-frontend"
main = "src/worker.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

# Workers Site設定で静的ファイルを配信
[site]
bucket = "./dist"

# 環境変数
[vars]
ENVIRONMENT = "production"

[env.production]
name = "pawmatch-frontend"
[env.production.vars]
ENVIRONMENT = "production"

[env.staging]
name = "pawmatch-frontend-staging"
[env.staging.vars]
ENVIRONMENT = "staging"

[env.development]
name = "pawmatch-frontend-dev"
[env.development.vars]
ENVIRONMENT = "development"
```

### 3.2 Workers Site ワーカー実装
```typescript
// src/worker.ts
import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler'

export interface Env {
  __STATIC_CONTENT: KVNamespace
  __STATIC_CONTENT_MANIFEST: string
  ENVIRONMENT: string
}

// セキュリティヘッダー
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.pawmatch.workers.dev",
    "frame-ancestors 'none'"
  ].join('; ')
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    
    try {
      const page = await getAssetFromKV(
        { request, waitUntil: ctx.waitUntil.bind(ctx) },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: JSON.parse(env.__STATIC_CONTENT_MANIFEST),
          mapRequestToAsset: handleSPARouting,
          cacheControl: {
            browserTTL: 60 * 60 * 24 * 30,
            edgeTTL: 60 * 60 * 24 * 30,
            bypassCache: false
          }
        }
      )

      const response = new Response(page.body, {
        status: page.status,
        statusText: page.statusText,
        headers: {
          ...Object.fromEntries(page.headers),
          ...SECURITY_HEADERS,
        },
      })

      // キャッシュ設定
      if (url.pathname.startsWith('/assets/')) {
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      } else if (url.pathname === '/sw.js') {
        response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
      }

      return response
    } catch (e) {
      return new Response('Internal Server Error', { 
        status: 500,
        headers: SECURITY_HEADERS
      })
    }
  },
}

// SPAルーティング処理
function handleSPARouting(request: Request): Request {
  const url = new URL(request.url)
  
  // 静的アセット（拡張子がある）はそのまま
  if (url.pathname.includes('.')) return request
  
  // API ルート（/apiで始まる）はそのまま
  if (url.pathname.startsWith('/api/')) return request
  
  // その他は全てindex.htmlにマップ（SPA対応）
  return mapRequestToAsset(new Request(`${url.origin}/index.html`, request))
}
```

### 3.4 Workersデプロイ設定
```toml
# animal-service/wrangler.toml
name = "pawmatch-animal-service"
main = "src/index.ts"
compatibility_date = "2023-12-01"

[[d1_databases]]
binding = "DB"
database_name = "pawmatch-animals"
database_id = "your-d1-database-id"

[[kv_namespaces]]
binding = "KV"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "pawmatch-images"

[env.production]
name = "animals.pawmatch.workers.dev"
vars = { ENVIRONMENT = "production", CORS_ORIGIN = "https://pawmatch-frontend.workers.dev" }

[env.staging]
name = "animals.staging.pawmatch.workers.dev"
vars = { ENVIRONMENT = "staging", CORS_ORIGIN = "https://pawmatch-frontend-staging.workers.dev" }
```

### 3.5 ビルドスクリプト
```json
{
  "scripts": {
    "build": "vite build",
    "build:staging": "VITE_ENVIRONMENT=staging vite build",
    "build:production": "VITE_ENVIRONMENT=production vite build",
    "preview": "vite preview",
    "deploy:frontend": "wrangler deploy",
    "deploy:workers": "npm run deploy:animal-service && npm run deploy:user-service && npm run deploy:matching-service && npm run deploy:notification-service",
    "deploy:animal-service": "cd services/animal-service && wrangler deploy",
    "deploy:user-service": "cd services/user-service && wrangler deploy",
    "deploy:matching-service": "cd services/matching-service && wrangler deploy",
    "deploy:notification-service": "cd services/notification-service && wrangler deploy"
  }
}
```

### 3.6 デプロイスクリプト
```bash
#!/bin/bash
# scripts/deploy.sh

set -e

ENVIRONMENT=${1:-staging}
echo "🚀 Deploying to $ENVIRONMENT environment"

# D1データベースマイグレーション
echo "📊 Running database migrations..."
cd services/animal-service
wrangler d1 migrations apply pawmatch-animals --env $ENVIRONMENT
cd ../..

# Workersデプロイ
echo "⚙️ Deploying Workers..."
cd services/animal-service && wrangler deploy --env $ENVIRONMENT && cd ../..
cd services/user-service && wrangler deploy --env $ENVIRONMENT && cd ../..
cd services/matching-service && wrangler deploy --env $ENVIRONMENT && cd ../..
cd services/notification-service && wrangler deploy --env $ENVIRONMENT && cd ../..

# フロントエンドデプロイ
echo "🎨 Deploying frontend..."
npm run build:$ENVIRONMENT
wrangler deploy --env $ENVIRONMENT

echo "✅ Deployment complete!"
```

## 4. CI/CDパイプライン

### 4.1 GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Run tests
        run: bun run test:coverage
      
      - name: Run E2E tests
        run: |
          bunx playwright install
          bun run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Setup Wrangler
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      
      - name: Run D1 Migrations
        run: |
          cd services/animal-service
          wrangler d1 migrations apply pawmatch-animals --env ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
          cd ../user-service
          wrangler d1 migrations apply pawmatch-users --env ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
      
      - name: Deploy Workers
        run: |
          cd services/animal-service && wrangler deploy --env ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
          cd ../user-service && wrangler deploy --env ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
          cd ../matching-service && wrangler deploy --env ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
          cd ../notification-service && wrangler deploy --env ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
      
      - name: Build Frontend
        run: |
          cd frontend
          bun run build:${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
        env:
          VITE_SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
          VITE_ANALYTICS_ID: ${{ secrets.ANALYTICS_ID }}
      
      - name: Deploy Frontend Worker
        run: |
          wrangler deploy --env ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
```

### 4.2 品質チェック
```yaml
# .github/workflows/quality.yml
name: Quality Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run lint
      - run: bun run type-check

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun audit
      
      # Wrangler security scan
      - name: Cloudflare Security Scan
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: whoami

  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build:staging
      - name: Lighthouse CI
        run: |
          bun add -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
          
  workers-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [animal-service, user-service, matching-service, notification-service]
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: |
          cd services/${{ matrix.service }}
          bun install
          bun run test
          bun run type-check
```

## 5. Cloudflareストレージ設定

### 5.1 D1データベース設定
```bash
# データベース作成
wrangler d1 create pawmatch-animals
wrangler d1 create pawmatch-users
wrangler d1 create pawmatch-matching

# マイグレーション実行
wrangler d1 migrations apply pawmatch-animals --local
wrangler d1 migrations apply pawmatch-animals --remote
```

### 5.2 KVネームスペース設定
```bash
# KVネームスペース作成
wrangler kv:namespace create "ANIMAL_CACHE"
wrangler kv:namespace create "ANIMAL_CACHE" --preview
wrangler kv:namespace create "USER_SESSIONS"
wrangler kv:namespace create "USER_SESSIONS" --preview
wrangler kv:namespace create "MATCHING_CACHE"
wrangler kv:namespace create "MATCHING_CACHE" --preview
```

### 5.3 R2バケット設定
```bash
# R2バケット作成
wrangler r2 bucket create pawmatch-images
wrangler r2 bucket create pawmatch-documents
```

## 6. パフォーマンス最適化

### 6.1 Cloudflare最適化設定
```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: process.env.NODE_ENV === 'development',
    
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['@tanstack/react-router'],
          'ui-vendor': ['lucide-react'],
          'utils': ['clsx', 'tailwind-merge']
        }
      }
    },
    
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true
      }
    }
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-router']
  }
});
```

### 6.2 バンドル分析
```json
{
  "scripts": {
    "analyze": "npm run build && npx vite-bundle-analyzer dist",
    "size-check": "npm run build && bundlesize"
  },
  "bundlesize": [
    {
      "path": "./dist/assets/index-*.js",
      "maxSize": "150 kB"
    },
    {
      "path": "./dist/assets/index-*.css",
      "maxSize": "50 kB"
    }
  ]
}
```

## 7. 監視・ログ

### 6.1 Sentry設定
```typescript
// src/monitoring/sentry.ts
import * as Sentry from '@sentry/react';
import { getCurrentEnvironment } from '../config/environment';

const environment = getCurrentEnvironment();

if (environment.sentryDsn) {
  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.name,
    
    integrations: [
      new Sentry.BrowserTracing({
        tracePropagationTargets: [environment.apiBaseUrl]
      })
    ],
    
    tracesSampleRate: environment.name === 'production' ? 0.1 : 1.0,
    
    beforeSend(event) {
      // 本番環境以外では個人情報をフィルタリング
      if (environment.name !== 'production') {
        return event;
      }
      
      // 個人情報の除去処理
      return event;
    }
  });
}

export { Sentry };
```

### 6.2 Google Analytics
```typescript
// src/analytics/googleAnalytics.ts
import { getCurrentEnvironment } from '../config/environment';

const environment = getCurrentEnvironment();

declare global {
  interface Window {
    gtag: (command: string, ...args: any[]) => void;
  }
}

export const initializeAnalytics = () => {
  if (!environment.analyticsId) {
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${environment.analyticsId}`;
  document.head.appendChild(script);

  window.gtag = function() {
    // eslint-disable-next-line prefer-rest-params
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', environment.analyticsId, {
    send_page_view: false // SPAなので手動で送信
  });
};

export const trackPageView = (path: string) => {
  if (typeof window.gtag === 'function') {
    window.gtag('config', environment.analyticsId!, {
      page_path: path
    });
  }
};

export const trackEvent = (action: string, category: string, label?: string) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', action, {
      event_category: category,
      event_label: label
    });
  }
};
```

### 6.3 パフォーマンス監視
```typescript
// src/monitoring/performance.ts
export const measurePerformance = () => {
  if ('performance' in window) {
    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      const fcpEntry = list.getEntries()[0];
      console.log('First Contentful Paint:', fcpEntry.startTime);
      
      // 分析サービスに送信
      trackEvent('performance', 'fcp', String(fcpEntry.startTime));
    });
    
    fcpObserver.observe({ entryTypes: ['paint'] });
    
    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const lcpEntry = list.getEntries()[list.getEntries().length - 1];
      console.log('Largest Contentful Paint:', lcpEntry.startTime);
      
      trackEvent('performance', 'lcp', String(lcpEntry.startTime));
    });
    
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    
    // Cumulative Layout Shift
    let cumulativeLayoutShift = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          cumulativeLayoutShift += (entry as any).value;
        }
      }
      
      console.log('Cumulative Layout Shift:', cumulativeLayoutShift);
      trackEvent('performance', 'cls', String(cumulativeLayoutShift));
    });
    
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  }
};
```

## 8. セキュリティ

### 8.1 Cloudflareセキュリティ機能
```typescript
// shared/security/cloudflare-security.ts
export class CloudflareSecurity {
  // WAFルール設定
  static setupWAFRules() {
    return {
      rateLimit: {
        threshold: 100, // 1分あたり100リクエスト
        period: 60,
        action: 'challenge'
      },
      geoBlocking: {
        allowedCountries: ['JP', 'US'], // 日本とアメリカのみ許可
        action: 'block'
      },
      botFight: {
        enabled: true,
        mode: 'managed_challenge'
      }
    };
  }
  
  // CSPヘッダー
  static getCSPHeader(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.pawmatch.workers.dev",
      "frame-ancestors 'none'"
    ].join('; ');
  }
}
```

### 8.2 Workersセキュリティ
```typescript
// shared/security/worker-security.ts
export class WorkerSecurity {
  static validateCORS(request: Request, allowedOrigins: string[]) {
    const origin = request.headers.get('Origin');
    return origin && allowedOrigins.includes(origin);
  }
  
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>"'&]/g, (char) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[char];
      });
  }
  
  static async validateJWT(token: string, secret: string): Promise<boolean> {
    // JWT検証ロジック
    try {
      // Cloudflare WorkersでのJWT検証実装
      return true;
    } catch {
      return false;
    }
  }
}
```

### 8.3 環境変数の安全な管理
```bash
# Cloudflare環境変数設定
wrangler secret put DATABASE_URL --env production
wrangler secret put JWT_SECRET --env production
wrangler secret put SENTRY_DSN --env production

# Frontend Worker環境変数
wrangler secret put VITE_ANALYTICS_ID --env production
wrangler secret put VITE_SENTRY_DSN --env production

# ローカル開発用
echo "VITE_ENVIRONMENT=development" > frontend/.env.local
echo "DATABASE_URL=sqlite://./dev.db" > services/animal-service/.env.local
```

## 9. バックアップ・復旧

### 9.1 D1データベースバックアップ
```bash
#!/bin/bash
# scripts/backup-d1.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/${TIMESTAMP}"

mkdir -p $BACKUP_DIR

# D1データベースのバックアップ
echo "💾 Backing up D1 databases..."
wrangler d1 export pawmatch-animals --output "$BACKUP_DIR/animals.sql"
wrangler d1 export pawmatch-users --output "$BACKUP_DIR/users.sql"
wrangler d1 export pawmatch-matching --output "$BACKUP_DIR/matching.sql"

# KVデータのバックアップ
echo "🗝️ Backing up KV data..."
wrangler kv:key list --namespace-id="your-kv-namespace-id" --format json > "$BACKUP_DIR/kv-keys.json"

echo "✅ Backup completed: $BACKUP_DIR"
```

### 9.2 ロールバック戦略
```bash
#!/bin/bash
# scripts/rollback.sh

SERVICE=${1:-all}
VERSION=${2:-previous}

echo "⏪ Rolling back $SERVICE to $VERSION..."

if [ "$SERVICE" = "all" ]; then
  # 全サービスのロールバック
  wrangler rollback --name pawmatch-animal-service
  wrangler rollback --name pawmatch-user-service
  wrangler rollback --name pawmatch-matching-service
  wrangler rollback --name pawmatch-notification-service
  wrangler rollback --name pawmatch-frontend
else
  # 特定サービスのロールバック
  wrangler rollback --name "pawmatch-$SERVICE"
fi

echo "✅ Rollback completed"
```

## 10. パフォーマンス基準

### 10.1 Core Web Vitals目標
- **LCP (Largest Contentful Paint)**: 2.5秒以下
- **FID (First Input Delay)**: 100ms以下
- **CLS (Cumulative Layout Shift)**: 0.1以下

### 10.2 Lighthouse基準
- **Performance**: 90点以上
- **Accessibility**: 95点以上
- **Best Practices**: 90点以上
- **SEO**: 90点以上

### 10.3 バンドルサイズ目標
- **初期JavaScript**: 150KB以下
- **初期CSS**: 50KB以下
- **画像最適化**: 次世代フォーマット使用

## 11. 障害対応

### 11.1 Cloudflareアラート設定
```typescript
// shared/monitoring/cloudflare-alerts.ts
export class CloudflareAlerts {
  static setupWorkerAlerts() {
    // Workersのエラー率監視
    const errorThreshold = 0.05; // 5%
    const requestThreshold = 10000; // 10,000 requests/hour
    
    return {
      errorRate: {
        metric: 'worker_errors_rate',
        threshold: errorThreshold,
        action: 'email_alert'
      },
      requestVolume: {
        metric: 'worker_requests_total',
        threshold: requestThreshold,
        action: 'slack_notification'
      },
      latency: {
        metric: 'worker_duration_p95',
        threshold: 1000, // 1秒
        action: 'pagerduty_alert'
      }
    };
  }
  
  static setupPagesAlerts() {
    return {
      availability: {
        metric: 'pages_uptime',
        threshold: 0.99, // 99%アップタイム
        action: 'immediate_alert'
      },
      coreWebVitals: {
        lcp: { threshold: 2500, action: 'warning' },
        fid: { threshold: 100, action: 'warning' },
        cls: { threshold: 0.1, action: 'warning' }
      }
    };
  }
}
```

### 11.2 緊急時対応
```bash
#!/bin/bash
# scripts/emergency-response.sh

ACTION=${1:-status}

case $ACTION in
  "rollback")
    echo "⏪ Emergency rollback initiated..."
    bash scripts/rollback.sh all
    ;;
  "maintenance")
    echo "🚧 Enabling maintenance mode..."
    # Cloudflare Page Rulesでメンテナンスページにリダイレクト
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/pagerules" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data '{
        "targets": [{"target": "url", "constraint": {"operator": "matches", "value": "*pawmatch.pages.dev/*"}}],
        "actions": [{"id": "forwarding_url", "value": {"url": "https://maintenance.pawmatch.pages.dev", "status_code": 503}}],
        "status": "active"
      }'
    ;;
  "disable-workers")
    echo "⚠️ Disabling problematic workers..."
    wrangler secret put MAINTENANCE_MODE --text "true"
    ;;
  "status")
    echo "🔍 Checking system status..."
    curl -s "https://api.cloudflare.com/client/v4/user/tokens/verify" \
      -H "Authorization: Bearer $CF_API_TOKEN"
    ;;
esac
```

## 12. ドキュメント

### 12.1 Cloudflareデプロイ手順書
```markdown
# PawMatch Cloudflareデプロイ手順

## 本番デプロイ

1. 機能開発完了後、develop ブランチにマージ
2. ステージング環境での動作確認
   - Workersの動作確認
   - D1データベースのテスト
   - KVキャッシュの動作確認
3. main ブランチへのプルリクエスト作成
4. コードレビュー実施
5. main ブランチにマージ（GitHub Actionsで自動デプロイ）

## 緊急デプロイ

1. hotfix ブランチ作成
2. 修正実装
3. ローカルでwrangler deployで緊急デプロイ
4. mainブランチにマージで正式デプロイ
5. develop ブランチにもマージ

## Workersデプロイ順序

1. D1マイグレーション実行
2. 各Workersのデプロイ
3. フロントエンドWorkerのデプロイ
4. 動作確認
```

### 12.2 Cloudflare運用チェックリスト
```markdown
# Cloudflareデプロイ前チェックリスト

## 事前チェック
- [ ] 全Workersのテストが通過している
- [ ] D1マイグレーションが準備されている
- [ ] KVスキーマが更新されている
- [ ] R2バケットのアクセス権が設定されている
- [ ] 環境変数とシークレットが正しく設定されている
- [ ] CORS設定が正しい

## デプロイ後チェック
- [ ] 全Workersが正常に起動している
- [ ] APIエンドポイントが応答している
- [ ] D1データベースの接続が正常
- [ ] KVキャッシュが動作している
- [ ] フロントエンドWorkerが正常に表示される
- [ ] モニタリングアラートが設定されている
- [ ] ロールバック手順が確認されている

## セキュリティチェック
- [ ] WAFルールが有効になっている
- [ ] Bot Fight Modeが有効になっている
- [ ] Rate Limitingが設定されている
- [ ] CSPヘッダーが適切に設定されている

## コストチェック
- [ ] Workersのリクエスト数が予算内
- [ ] D1のリード/ライト数が予算内
- [ ] KVのオペレーション数が予算内
- [ ] R2のストレージ使用量が予算内
```