# PawMatch 開発ガイドライン

## 1. 開発環境構築

### 1.1 必要な環境
```bash
# Node.js (推奨バージョン)
Node.js >= 18.0.0
npm >= 8.0.0

# または
bun >= 1.0.0

# 開発ツール
Git >= 2.30.0
VS Code (推奨)
```

### 1.2 セットアップ手順
```bash
# リポジトリクローン
git clone https://github.com/your-org/pawmatch.git
cd pawmatch

# 依存関係インストール
npm install
# または
bun install

# 開発サーバー起動
npm run dev
# または
bun run dev
```

### 1.3 VS Code推奨設定
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}

// .vscode/extensions.json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json"
  ]
}
```

## 2. コーディング規約

### 2.1 TypeScript規約
```typescript
// ファイル名: PascalCase (コンポーネント), camelCase (その他)
// 例: AnimalCard.tsx, useSwipeState.ts

// インターface命名
interface Animal {
  id: string;
  name: string;
}

// Type命名
type SwipeDirection = 'left' | 'right' | 'up';

// 関数命名: camelCase
const handleSwipeAction = (direction: SwipeDirection) => {
  // 実装
};

// 定数命名: UPPER_SNAKE_CASE
const MAX_SWIPE_DISTANCE = 150;

// Enum命名: PascalCase
enum Species {
  Dog = 'dog',
  Cat = 'cat'
}
```

### 2.2 React規約
```tsx
// コンポーネント名: PascalCase
const AnimalCard: React.FC<AnimalCardProps> = ({ animal, onSwipe }) => {
  // State: camelCase
  const [isLoading, setIsLoading] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Handler: handle + 動詞
  const handleSwipeStart = useCallback((e: React.MouseEvent) => {
    // 実装
  }, []);
  
  const handleSwipeEnd = useCallback(() => {
    // 実装
  }, []);
  
  // Effect: 用途を明確に
  useEffect(() => {
    // 初期化処理
  }, []);
  
  // 早期リターン
  if (!animal) {
    return <div>動物情報が見つかりません</div>;
  }
  
  return (
    <div 
      className="animal-card"
      data-testid="animal-card"
    >
      {/* JSX */}
    </div>
  );
};

// Props型定義
interface AnimalCardProps {
  animal: Animal;
  onSwipe: (direction: SwipeDirection) => void;
  className?: string;
}
```

### 2.3 CSS/Tailwind規約
```tsx
// クラス名順序: Tailwind CSS公式順序
<div className="
  // レイアウト
  flex items-center justify-center
  // サイズ
  w-full h-64
  // スペーシング
  p-4 m-2
  // 色
  bg-white text-gray-800
  // ボーダー
  border border-gray-200 rounded-lg
  // シャドウ
  shadow-lg
  // トランジション
  transition-all duration-300
  // 疑似クラス
  hover:shadow-xl hover:scale-105
">
  {/* コンテンツ */}
</div>

// カスタムクラス使用時
<div className={cn(
  "base-classes",
  "conditional-classes",
  className
)}>
  {/* コンテンツ */}
</div>
```

## 3. ディレクトリ構造

### 3.1 推奨ディレクトリ構造
```
src/
├── components/           # UIコンポーネント
│   ├── ui/              # 基本UIコンポーネント
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── badge.tsx
│   ├── AnimalCard.tsx   # 動物カード
│   ├── SwipeCard.tsx    # スワイプカード
│   └── AppSelector.tsx  # アプリ選択
├── hooks/               # カスタムフック
│   ├── useSwipeState.ts
│   ├── useSwipeGesture.ts
│   └── usePersistentState.ts
├── types/               # TypeScript型定義
│   ├── animal.ts
│   ├── cat.ts
│   └── dog.ts
├── data/                # データ定義
│   ├── animals.ts
│   ├── cats.ts
│   └── dogs.ts
├── lib/                 # ユーティリティ
│   ├── utils.ts
│   └── constants.ts
├── assets/              # 静的リソース
│   ├── images/
│   └── icons/
├── styles/              # グローバルスタイル
│   └── globals.css
├── __tests__/           # テストファイル
│   ├── components/
│   └── hooks/
├── App.tsx              # メインアプリ
└── main.tsx             # エントリーポイント
```

### 3.2 コンポーネント分割指針
```typescript
// 1. 単一責任の原則
// 悪い例
const AnimalCardWithSwipe = () => {
  // カード表示とスワイプ処理を一つのコンポーネントで
};

// 良い例
const AnimalCard = () => {
  // カード表示のみ
};

const SwipeCard = () => {
  // スワイプ処理のみ
};

// 2. 再利用可能性
// 悪い例
const DogCardSpecific = () => {
  // 犬専用で再利用不可
};

// 良い例
const AnimalCard = ({ animal }: { animal: Animal }) => {
  // 動物種別に関係なく再利用可能
};

// 3. 適切な抽象化レベル
// 悪い例
const AnimalCardWithButtonsAndModalAndTooltip = () => {
  // 抽象化レベルが混在
};

// 良い例
const AnimalCard = () => {
  return (
    <Card>
      <AnimalImage />
      <AnimalInfo />
      <ActionButtons />
    </Card>
  );
};
```

## 4. 状態管理

### 4.1 React Hooks使用指針
```typescript
// useState: 単純な状態管理
const [count, setCount] = useState(0);

// useEffect: 副作用処理
useEffect(() => {
  // 初期化処理
  return () => {
    // クリーンアップ処理
  };
}, [dependencies]);

// useCallback: 関数のメモ化
const handleClick = useCallback(() => {
  // 処理
}, [dependencies]);

// useMemo: 計算結果のメモ化
const expensiveValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);

// カスタムフック: ロジックの再利用
const useSwipeState = () => {
  const [state, setState] = useState(initialState);
  
  const actions = useMemo(() => ({
    handleSwipe: (direction: SwipeDirection) => {
      // 処理
    },
    reset: () => {
      // リセット処理
    }
  }), []);
  
  return { state, ...actions };
};
```

### 4.2 状態設計パターン
```typescript
// 1. 状態の正規化
interface AppState {
  animals: {
    byId: Record<string, Animal>;
    allIds: string[];
  };
  swipe: {
    currentIndex: number;
    likedIds: string[];
    passedIds: string[];
  };
  filters: FilterSettings;
}

// 2. 状態の分離
const useAnimalData = () => {
  // 動物データ関連の状態
};

const useSwipeState = () => {
  // スワイプ関連の状態
};

const useFilterState = () => {
  // フィルター関連の状態
};

// 3. 状態の永続化
const usePersistentState = <T>(key: string, initialValue: T) => {
  const [state, setState] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });
  
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);
  
  return [state, setState] as const;
};
```

## 5. パフォーマンス最適化

### 5.1 React最適化
```typescript
// React.memo: 不要な再レンダリング防止
const AnimalCard = React.memo<AnimalCardProps>(({ animal, onSwipe }) => {
  // コンポーネント実装
}, (prevProps, nextProps) => {
  // カスタム比較関数（必要に応じて）
  return prevProps.animal.id === nextProps.animal.id;
});

// useCallback: 関数の再作成防止
const handleSwipe = useCallback((direction: SwipeDirection) => {
  onSwipe(animal.id, direction);
}, [animal.id, onSwipe]);

// useMemo: 計算結果のキャッシュ
const filteredAnimals = useMemo(() => {
  return animals.filter(animal => 
    filterFunction(animal, filters)
  );
}, [animals, filters]);

// 遅延読み込み
const LazyAnimalList = React.lazy(() => import('./AnimalList'));

// 使用例
<Suspense fallback={<div>読み込み中...</div>}>
  <LazyAnimalList />
</Suspense>
```

### 5.2 画像最適化
```typescript
// 画像の遅延読み込み
const LazyImage: React.FC<ImageProps> = ({ src, alt, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <div ref={imgRef} {...props}>
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          style={{ 
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s'
          }}
        />
      )}
    </div>
  );
};
```

## 6. テスト

### 6.1 テスト戦略
```typescript
// 単体テスト: Jest + React Testing Library
describe('AnimalCard', () => {
  const mockAnimal: Animal = {
    id: '1',
    name: 'テスト犬',
    species: 'dog',
    // ... その他のプロパティ
  };
  
  it('動物の名前が表示される', () => {
    render(<AnimalCard animal={mockAnimal} onSwipe={jest.fn()} />);
    expect(screen.getByText('テスト犬')).toBeInTheDocument();
  });
  
  it('スワイプ時にコールバックが呼ばれる', () => {
    const mockOnSwipe = jest.fn();
    render(<AnimalCard animal={mockAnimal} onSwipe={mockOnSwipe} />);
    
    const likeButton = screen.getByLabelText('お気に入り');
    fireEvent.click(likeButton);
    
    expect(mockOnSwipe).toHaveBeenCalledWith('right');
  });
});

// カスタムフックテスト
describe('useSwipeState', () => {
  it('初期状態が正しく設定される', () => {
    const { result } = renderHook(() => useSwipeState());
    
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.likedAnimals).toEqual([]);
    expect(result.current.passedAnimals).toEqual([]);
  });
  
  it('スワイプ処理が正しく動作する', () => {
    const { result } = renderHook(() => useSwipeState());
    
    act(() => {
      result.current.handleSwipe('right');
    });
    
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.likedAnimals).toHaveLength(1);
  });
});
```

### 6.2 E2Eテスト
```typescript
// Playwright使用例
import { test, expect } from '@playwright/test';

test('スワイプ機能のテスト', async ({ page }) => {
  await page.goto('/');
  
  // DogMatchを選択
  await page.click('[data-testid="dog-match-button"]');
  
  // 動物カードが表示されることを確認
  await expect(page.locator('[data-testid="animal-card"]')).toBeVisible();
  
  // Likeボタンをクリック
  await page.click('[data-testid="like-button"]');
  
  // 次の動物カードが表示されることを確認
  await expect(page.locator('[data-testid="animal-card"]')).toBeVisible();
});
```

## 7. エラーハンドリング

### 7.1 エラーバウンダリ
```typescript
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // エラーレポートサービスに送信
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>申し訳ございません。エラーが発生しました。</h2>
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
  const [isLoading, setIsLoading] = useState(false);
  
  const executeAsync = useCallback(async <T>(
    asyncFn: () => Promise<T>
  ): Promise<T | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await asyncFn();
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return { error, isLoading, executeAsync };
};
```

## 8. デバッグ

### 8.1 開発ツール
```typescript
// React Developer Tools
// - コンポーネントの状態確認
// - Props の流れを追跡
// - パフォーマンス分析

// Redux DevTools Extension (将来的に必要な場合)
// - 状態の変更履歴確認
// - タイムトラベルデバッグ

// デバッグ用フック
const useDebugValue = (value: any, formatter?: (value: any) => string) => {
  React.useDebugValue(value, formatter);
};

// 開発環境でのみ動作するログ
const developmentLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PawMatch] ${message}`, data);
  }
};
```

### 8.2 デバッグパネル
```typescript
// 開発環境用デバッグパネル
const DebugPanel: React.FC = () => {
  const swipeState = useSwipeState();
  const [isVisible, setIsVisible] = useState(false);
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="debug-panel">
      <button onClick={() => setIsVisible(!isVisible)}>
        Debug Panel
      </button>
      
      {isVisible && (
        <div className="debug-content">
          <h3>Swipe State</h3>
          <pre>{JSON.stringify(swipeState, null, 2)}</pre>
          
          <h3>Actions</h3>
          <button onClick={() => swipeState.reset()}>
            Reset State
          </button>
        </div>
      )}
    </div>
  );
};
```

## 9. 品質保証

### 9.1 リンター設定
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  rules: {
    // カスタムルール
    'prefer-const': 'error',
    'no-var': 'error',
    'no-unused-vars': 'error',
    'react/prop-types': 'off', // TypeScriptを使用するため
    'react/react-in-jsx-scope': 'off', // React 17+では不要
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn'
  }
};
```

### 9.2 プリコミットフック
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,md}": [
      "prettier --write"
    ]
  }
}
```

## 10. ドキュメント

### 10.1 コードドキュメント
```typescript
/**
 * 動物のスワイプ状態を管理するカスタムフック
 * 
 * @returns {Object} スワイプ状態とアクション
 * @returns {number} returns.currentIndex - 現在のインデックス
 * @returns {Animal[]} returns.likedAnimals - お気に入り動物リスト
 * @returns {Function} returns.handleSwipe - スワイプ処理関数
 * 
 * @example
 * const { currentIndex, likedAnimals, handleSwipe } = useSwipeState();
 * 
 * // 右スワイプ（お気に入り）
 * handleSwipe('right');
 */
export const useSwipeState = () => {
  // 実装
};
```

### 10.2 README更新
```markdown
# PawMatch

## 開発開始方法

1. 依存関係をインストール
   ```bash
   npm install
   ```

2. 開発サーバーを起動
   ```bash
   npm run dev
   ```

3. ブラウザで http://localhost:5173 を開く

## テスト実行

```bash
# 単体テスト
npm run test

# E2Eテスト
npm run test:e2e

# カバレッジ確認
npm run test:coverage
```

## ビルド

```bash
# 本番ビルド
npm run build

# プレビュー
npm run preview
```
```