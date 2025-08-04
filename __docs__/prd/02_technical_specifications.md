# PawMatch 技術仕様書

## 1. 技術スタック概要

### 1.1 フロントエンド
- **フレームワーク**: React 18.2.0
- **ルーティング**: TanStack Router
- **言語**: TypeScript 5.0.2
- **ビルドツール**: Vite 4.4.5
- **スタイリング**: TailwindCSS 3.3.0
- **UIライブラリ**: shadcn/ui（カスタムコンポーネント）
- **アイコン**: Lucide React 0.263.1
- **ユーティリティ**: clsx, tailwind-merge

### 1.2 バックエンド（マイクロサービス）
- **プラットフォーム**: Cloudflare Workers
- **アーキテクチャ**: Domain Driven Design (DDD)
- **ランタイム**: V8 JavaScript エンジン
- **言語**: TypeScript
- **フレームワーク**: Hono.js

### 1.3 ストレージ
- **データベース**: Cloudflare D1 (SQLite)
- **キャッシュ**: Cloudflare KV
- **ファイルストレージ**: Cloudflare R2
- **検索**: Cloudflare Vectorize（将来的）

### 1.4 開発環境
- **パッケージマネージャー**: bun
- **リンター**: ESLint 8.45.0
- **型チェック**: TypeScript compiler
- **CSS処理**: PostCSS 8.4.27 + Autoprefixer
- **開発サーバー**: Wrangler CLI

### 1.5 デプロイメント
- **プラットフォーム**: Cloudflare
- **フロントエンド**: Cloudflare Workers (Workers Site)
- **API**: Cloudflare Workers
- **CI/CD**: GitHub Actions + Wrangler
- **CDN**: Cloudflare CDN

## 2. アーキテクチャ設計

### 2.1 マイクロサービス構成
```
services/
├── frontend/           # フロントエンドアプリケーション
│   ├── src/
│   │   ├── components/ # UIコンポーネント
│   │   ├── routes/     # TanStack Router ルート
│   │   ├── hooks/      # カスタムフック
│   │   ├── types/      # 型定義
│   │   └── lib/        # ユーティリティ
│   └── wrangler.toml   # Cloudflare Workers Site設定
├── animal-service/     # 動物管理サービス
│   ├── src/
│   │   ├── domain/     # ドメインロジック
│   │   ├── infrastructure/ # インフラ層
│   │   ├── application/    # アプリケーション層
│   │   └── interfaces/     # インターフェース層
│   ├── migrations/     # D1マイグレーション
│   └── wrangler.toml   # Worker設定
├── user-service/       # ユーザー管理サービス
├── matching-service/   # マッチング処理サービス
└── notification-service/ # 通知サービス
```

### 2.2 フロントエンド構成
```
frontend/src/
├── components/          # UIコンポーネント
│   ├── ui/             # 基本UIコンポーネント
│   ├── AnimalCard.tsx  # 動物カード
│   ├── SwipeCard.tsx   # スワイプカード
│   └── ...
├── routes/             # TanStack Routerルート
│   ├── index.tsx       # ホームページ
│   ├── animals/        # 動物関連ルート
│   └── profile/        # プロフィールルート
├── hooks/              # カスタムフック
├── types/              # TypeScript型定義
├── lib/                # ユーティリティ
└── main.tsx            # エントリーポイント
```

### 2.3 状態管理パターン
```typescript
// カスタムフック例
const useSwipeState = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedAnimals, setLikedAnimals] = useState<Animal[]>([]);
  const [passedAnimals, setPassedAnimals] = useState<Animal[]>([]);
  
  return {
    currentIndex,
    likedAnimals,
    passedAnimals,
    handleLike,
    handlePass,
    reset
  };
};
```

### 2.4 マイクロサービス間通信
```typescript
// API Gateway パターン
interface ServiceEndpoints {
  animals: 'https://animals.pawmatch.workers.dev';
  users: 'https://users.pawmatch.workers.dev';
  matching: 'https://matching.pawmatch.workers.dev';
  notifications: 'https://notifications.pawmatch.workers.dev';
}
```

### 2.5 データフロー
1. **フロントエンド**: TanStack Routerによるクライアントサイドルーティング
2. **API通信**: Cloudflare Workersとの通信
3. **データ永続化**: D1データベースとKVストレージ
4. **キャッシング**: Cloudflare CDNとKVによる多層キャッシュ
5. **リアルタイム通信**: Cloudflare Durable Objects（将来的）

## 3. DDDドメイン設計

### 3.1 境界づけられたコンテキスト
```typescript
// Animal Domain
export interface AnimalAggregate {
  id: AnimalId;
  profile: AnimalProfile;
  images: AnimalImages;
  status: AdoptionStatus;
  location: Location;
}

// User Domain
export interface UserAggregate {
  id: UserId;
  profile: UserProfile;
  preferences: AdoptionPreferences;
  interactions: UserInteractions;
}

// Matching Domain
export interface MatchingAggregate {
  id: MatchingId;
  userId: UserId;
  animalId: AnimalId;
  status: MatchingStatus;
  score: MatchingScore;
}
```

### 3.2 ドメインサービス
```typescript
// animal-service/src/domain/services/
export class AnimalDomainService {
  constructor(
    private animalRepository: AnimalRepository,
    private imageService: ImageService
  ) {}

  async registerAnimal(command: RegisterAnimalCommand): Promise<Animal> {
    // ドメインロジック実装
  }
}
```

### 3.3 Workers構成
```typescript
// animal-service/src/index.ts
import { Hono } from 'hono';
import { AnimalController } from './interfaces/controllers/AnimalController';
import { D1AnimalRepository } from './infrastructure/repositories/D1AnimalRepository';

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/animals', async (c) => {
  const animalRepository = new D1AnimalRepository(c.env.DB);
  const controller = new AnimalController(animalRepository);
  return controller.getAnimals(c);
});

export default app;
```

### 3.4 D1データベース設計
```sql
-- animal-service/migrations/001_create_animals.sql
CREATE TABLE animals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('cat', 'dog')),
  breed TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  size TEXT NOT NULL CHECK (size IN ('small', 'medium', 'large')),
  description TEXT,
  location TEXT NOT NULL,
  organization TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE animal_images (
  id TEXT PRIMARY KEY,
  animal_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_order INTEGER NOT NULL,
  FOREIGN KEY (animal_id) REFERENCES animals(id)
);
```

## 4. スワイプ機能実装

### 4.1 フロントエンド実装
```typescript
// frontend/src/components/SwipeCard.tsx
const SwipeCard: React.FC<SwipeCardProps> = ({ animal, onSwipe }) => {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const handleSwipe = async (direction: SwipeDirection) => {
    // マッチングサービスに送信
    await fetch('https://matching.pawmatch.workers.dev/swipe', {
      method: 'POST',
      body: JSON.stringify({
        animalId: animal.id,
        direction,
        userId: getCurrentUser().id
      })
    });
    
    onSwipe(direction);
  };
};
```

## 5. 型定義

### 5.1 基本型定義
```typescript
// shared/types/animal.ts
export interface Animal {
  id: AnimalId;
  name: string;
  species: 'dog' | 'cat';
  breed: string;
  age: number;
  gender: 'male' | 'female';
  size: 'small' | 'medium' | 'large';
  images: AnimalImage[];
  description: string;
  location: string;
  organization: string;
  specialNeeds: string[];
  personality: string[];
  healthStatus: HealthStatus;
  status: AdoptionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type AnimalId = string & { __brand: 'AnimalId' };
export type AdoptionStatus = 'available' | 'pending' | 'adopted' | 'unavailable';

// types/cat.ts
export interface Cat extends Animal {
  species: 'cat';
  coatLength: 'short' | 'long';
  indoorOutdoor: 'indoor' | 'outdoor' | 'both';
  socialLevel: 'shy' | 'friendly' | 'very_friendly';
  multiCatCompatible: boolean;
  vocalization: 'quiet' | 'moderate' | 'vocal';
}

// types/dog.ts
export interface Dog extends Animal {
  species: 'dog';
  exerciseNeeds: 'low' | 'moderate' | 'high';
  trainingLevel: 'basic' | 'intermediate' | 'advanced';
  goodWithKids: boolean;
  goodWithDogs: boolean;
  yardRequired: boolean;
  walkFrequency: number; // 1日あたりの散歩回数
}
```

### 4.2 スワイプ関連型定義
```typescript
export type SwipeDirection = 'left' | 'right' | 'up';
export type SwipeResult = 'like' | 'pass' | 'superlike';

export interface SwipeAction {
  animalId: string;
  direction: SwipeDirection;
  result: SwipeResult;
  timestamp: Date;
}

export interface SwipeState {
  currentIndex: number;
  likedAnimals: Animal[];
  superLikedAnimals: Animal[];
  passedAnimals: Animal[];
  history: SwipeAction[];
}
```

## 6. KVストレージ設計

### 6.1 キー設計
```typescript
// shared/infrastructure/kv/keys.ts
export const KVKeys = {
  // ユーザーセッション
  userSession: (userId: string) => `session:${userId}`,
  
  // 動物検索キャッシュ
  animalSearch: (filters: string) => `animals:search:${filters}`,
  
  // マッチング結果キャッシュ
  userMatches: (userId: string) => `matches:user:${userId}`,
  
  // API レスポンスキャッシュ
  animalDetail: (animalId: string) => `animal:${animalId}`,
} as const;
```

### 6.2 キャッシュ戦略
```typescript
// shared/infrastructure/cache/CacheService.ts
export class CloudflareKVCache implements CacheService {
  constructor(private kv: KVNamespace) {}
  
  async get<T>(key: string): Promise<T | null> {
    const value = await this.kv.get(key, 'json');
    return value as T | null;
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.kv.put(key, JSON.stringify(value), {
      expirationTtl: ttl || 3600, // 1時間デフォルト
    });
  }
}
```

## 7. パフォーマンス最適化

### 5.1 画像最適化
```typescript
const OptimizedImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  return (
    <div className="relative">
      {loading && <ImageSkeleton />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
        className={`transition-opacity duration-300 ${
          loading ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  );
};
```

### 5.2 仮想化
```typescript
// 大量データ処理用
const VirtualizedAnimalList: React.FC = () => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  const animals = useAnimals();
  
  const visibleAnimals = animals.slice(
    visibleRange.start, 
    visibleRange.end
  );
  
  return (
    <div className="animal-list">
      {visibleAnimals.map(animal => (
        <AnimalCard key={animal.id} animal={animal} />
      ))}
    </div>
  );
};
```

### 5.3 メモ化
```typescript
const AnimalCard = React.memo<AnimalCardProps>(({ animal, onSwipe }) => {
  const handleSwipe = useCallback((result: SwipeResult) => {
    onSwipe(animal.id, result);
  }, [animal.id, onSwipe]);
  
  return (
    <SwipeCard
      animal={animal}
      onSwipe={handleSwipe}
    />
  );
});
```

## 8. 状態管理

### 6.1 カスタムフック設計
```typescript
// hooks/useSwipeState.ts
export const useSwipeState = () => {
  const [state, setState] = useState<SwipeState>({
    currentIndex: 0,
    likedAnimals: [],
    superLikedAnimals: [],
    passedAnimals: [],
    history: []
  });
  
  const handleSwipe = useCallback((animalId: string, result: SwipeResult) => {
    setState(prev => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
      [getResultArrayKey(result)]: [
        ...prev[getResultArrayKey(result)],
        findAnimalById(animalId)
      ],
      history: [
        ...prev.history,
        {
          animalId,
          direction: getDirectionFromResult(result),
          result,
          timestamp: new Date()
        }
      ]
    }));
  }, []);
  
  const reset = useCallback(() => {
    setState({
      currentIndex: 0,
      likedAnimals: [],
      superLikedAnimals: [],
      passedAnimals: [],
      history: []
    });
  }, []);
  
  return {
    ...state,
    handleSwipe,
    reset,
    canUndo: state.history.length > 0
  };
};
```

### 6.2 永続化
```typescript
// hooks/usePersistentState.ts
export const usePersistentState = <T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] => {
  const [state, setState] = useState<T>(() => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  });
  
  const setValue = useCallback((value: T) => {
    setState(value);
    localStorage.setItem(key, JSON.stringify(value));
  }, [key]);
  
  return [state, setValue];
};
```

## 9. エラーハンドリング

### 7.1 エラーバウンダリ
```typescript
class SwipeErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('スワイプエラー:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>問題が発生しました</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            再試行
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

### 7.2 非同期エラー処理
```typescript
const useAsyncError = () => {
  const [error, setError] = useState<Error | null>(null);
  
  const handleAsync = useCallback(async (asyncFn: () => Promise<void>) => {
    try {
      setError(null);
      await asyncFn();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  }, []);
  
  return { error, handleAsync };
};
```

## 10. テスト戦略

### 8.1 単体テスト
```typescript
// __tests__/useSwipeState.test.ts
describe('useSwipeState', () => {
  it('should handle like action correctly', () => {
    const { result } = renderHook(() => useSwipeState());
    
    act(() => {
      result.current.handleSwipe('dog-1', 'like');
    });
    
    expect(result.current.likedAnimals).toHaveLength(1);
    expect(result.current.currentIndex).toBe(1);
  });
});
```

### 8.2 統合テスト
```typescript
// __tests__/SwipeScreen.test.tsx
describe('SwipeScreen', () => {
  it('should complete swipe gesture', async () => {
    render(<SwipeScreen />);
    
    const card = screen.getByTestId('swipe-card');
    
    fireEvent.mouseDown(card, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(card, { clientX: 200, clientY: 100 });
    fireEvent.mouseUp(card);
    
    await waitFor(() => {
      expect(screen.getByText('次の動物')).toBeInTheDocument();
    });
  });
});
```

## 11. Workers設定

### 11.1 wrangler.toml設定
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
name = "pawmatch-animal-service"
vars = { ENVIRONMENT = "production" }

[env.staging]
name = "pawmatch-animal-service-staging"
vars = { ENVIRONMENT = "staging" }
```

## 12. ビルド設定

### 9.1 Vite設定
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
```

### 9.2 TypeScript設定
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## 13. セキュリティ

### 10.1 XSS対策
```typescript
const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};
```

### 10.2 CSP設定
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
">
```