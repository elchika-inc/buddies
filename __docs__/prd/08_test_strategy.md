# PawMatch テスト戦略書

## 1. テスト概要

### 1.1 テストピラミッド
```
     /\
    /  \   E2E Tests (少数)
   /____\
  /      \  Integration Tests (中程度)
 /________\
/__________\ Unit Tests (多数)
```

### 1.2 テスト方針
- **品質保証**: バグの早期発見・修正
- **リグレッション防止**: 既存機能の破綻防止
- **ドキュメント化**: テストがコードの仕様書となる
- **リファクタリング支援**: 安全な改修を可能にする

### 1.3 テスト種別と責任範囲
- **単体テスト**: 個別コンポーネント・関数の動作検証
- **統合テスト**: コンポーネント間の連携検証
- **E2Eテスト**: ユーザーシナリオの検証
- **視覚回帰テスト**: UI の視覚的変更検出

## 2. 単体テスト（Unit Tests）

### 2.1 テストツール
```json
{
  "testFramework": "Jest",
  "testingLibrary": "React Testing Library",
  "coverage": "Jest built-in",
  "mocking": "Jest mocks",
  "assertions": "Jest matchers + Custom matchers"
}
```

### 2.2 コンポーネントテスト
```typescript
// AnimalCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AnimalCard } from '../AnimalCard';
import { mockDog, mockCat } from '../__mocks__/animals';

describe('AnimalCard', () => {
  const defaultProps = {
    animal: mockDog,
    onSwipe: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('表示テスト', () => {
    it('動物の基本情報が表示される', () => {
      render(<AnimalCard {...defaultProps} />);
      
      expect(screen.getByText(mockDog.name)).toBeInTheDocument();
      expect(screen.getByText(`${mockDog.age}ヶ月`)).toBeInTheDocument();
      expect(screen.getByText(mockDog.breed)).toBeInTheDocument();
      expect(screen.getByText(mockDog.location.prefecture)).toBeInTheDocument();
    });

    it('犬の場合、犬特有の情報が表示される', () => {
      render(<AnimalCard {...defaultProps} />);
      
      expect(screen.getByText('運動量')).toBeInTheDocument();
      expect(screen.getByText('しつけレベル')).toBeInTheDocument();
    });

    it('猫の場合、猫特有の情報が表示される', () => {
      const catProps = { ...defaultProps, animal: mockCat };
      render(<AnimalCard {...catProps} />);
      
      expect(screen.getByText('社会性')).toBeInTheDocument();
      expect(screen.getByText('毛の長さ')).toBeInTheDocument();
    });

    it('画像が正しく表示される', () => {
      render(<AnimalCard {...defaultProps} />);
      
      const image = screen.getByAltText(mockDog.name);
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', mockDog.images[0].url);
    });
  });

  describe('操作テスト', () => {
    it('Likeボタンクリックで正しいコールバックが呼ばれる', () => {
      const mockOnSwipe = jest.fn();
      render(<AnimalCard {...defaultProps} onSwipe={mockOnSwipe} />);
      
      const likeButton = screen.getByLabelText('お気に入り');
      fireEvent.click(likeButton);
      
      expect(mockOnSwipe).toHaveBeenCalledWith('right');
      expect(mockOnSwipe).toHaveBeenCalledTimes(1);
    });

    it('Passボタンクリックで正しいコールバックが呼ばれる', () => {
      const mockOnSwipe = jest.fn();
      render(<AnimalCard {...defaultProps} onSwipe={mockOnSwipe} />);
      
      const passButton = screen.getByLabelText('パス');
      fireEvent.click(passButton);
      
      expect(mockOnSwipe).toHaveBeenCalledWith('left');
    });

    it('SuperLikeボタンクリックで正しいコールバックが呼ばれる', () => {
      const mockOnSwipe = jest.fn();
      render(<AnimalCard {...defaultProps} onSwipe={mockOnSwipe} />);
      
      const superLikeButton = screen.getByLabelText('特にお気に入り');
      fireEvent.click(superLikeButton);
      
      expect(mockOnSwipe).toHaveBeenCalledWith('up');
    });
  });

  describe('エラーハンドリング', () => {
    it('動物データが無い場合、エラーメッセージが表示される', () => {
      const props = { ...defaultProps, animal: null };
      render(<AnimalCard {...props} />);
      
      expect(screen.getByText('動物情報が見つかりません')).toBeInTheDocument();
    });

    it('画像読み込みエラー時、フォールバック画像が表示される', () => {
      const animalWithBrokenImage = {
        ...mockDog,
        images: [{ ...mockDog.images[0], url: 'broken-url' }]
      };
      
      render(<AnimalCard {...defaultProps} animal={animalWithBrokenImage} />);
      
      const image = screen.getByAltText(mockDog.name);
      fireEvent.error(image);
      
      expect(image).toHaveAttribute('src', '/fallback-animal.jpg');
    });
  });
});
```

### 2.3 カスタムフックテスト
```typescript
// useSwipeState.test.ts
import { renderHook, act } from '@testing-library/react';
import { useSwipeState } from '../useSwipeState';
import { mockDogs } from '../__mocks__/animals';

describe('useSwipeState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('初期化', () => {
    it('初期状態が正しく設定される', () => {
      const { result } = renderHook(() => useSwipeState());
      
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.likedAnimals).toEqual([]);
      expect(result.current.passedAnimals).toEqual([]);
      expect(result.current.superLikedAnimals).toEqual([]);
      expect(result.current.history).toEqual([]);
    });

    it('LocalStorageから状態を復元する', () => {
      const savedState = {
        currentIndex: 5,
        likedAnimals: [mockDogs[0]],
        passedAnimals: [mockDogs[1]],
        superLikedAnimals: [],
        history: []
      };
      
      localStorage.setItem('pawmatch:swipe_state', JSON.stringify(savedState));
      
      const { result } = renderHook(() => useSwipeState());
      
      expect(result.current.currentIndex).toBe(5);
      expect(result.current.likedAnimals).toHaveLength(1);
      expect(result.current.passedAnimals).toHaveLength(1);
    });
  });

  describe('スワイプ操作', () => {
    it('右スワイプでLikeに追加される', () => {
      const { result } = renderHook(() => useSwipeState());
      
      act(() => {
        result.current.handleSwipe(mockDogs[0].id, 'right');
      });
      
      expect(result.current.currentIndex).toBe(1);
      expect(result.current.likedAnimals).toContain(mockDogs[0]);
      expect(result.current.history).toHaveLength(1);
    });

    it('左スワイプでPassに追加される', () => {
      const { result } = renderHook(() => useSwipeState());
      
      act(() => {
        result.current.handleSwipe(mockDogs[0].id, 'left');
      });
      
      expect(result.current.currentIndex).toBe(1);
      expect(result.current.passedAnimals).toContain(mockDogs[0]);
    });

    it('上スワイプでSuperLikeに追加される', () => {
      const { result } = renderHook(() => useSwipeState());
      
      act(() => {
        result.current.handleSwipe(mockDogs[0].id, 'up');
      });
      
      expect(result.current.currentIndex).toBe(1);
      expect(result.current.superLikedAnimals).toContain(mockDogs[0]);
    });
  });

  describe('状態管理', () => {
    it('リセット機能が正しく動作する', () => {
      const { result } = renderHook(() => useSwipeState());
      
      // 何かしらの状態に変更
      act(() => {
        result.current.handleSwipe(mockDogs[0].id, 'right');
        result.current.handleSwipe(mockDogs[1].id, 'left');
      });
      
      // リセット
      act(() => {
        result.current.reset();
      });
      
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.likedAnimals).toEqual([]);
      expect(result.current.passedAnimals).toEqual([]);
      expect(result.current.history).toEqual([]);
    });

    it('undo機能が正しく動作する', () => {
      const { result } = renderHook(() => useSwipeState());
      
      // スワイプ実行
      act(() => {
        result.current.handleSwipe(mockDogs[0].id, 'right');
      });
      
      const beforeUndo = {
        currentIndex: result.current.currentIndex,
        likedAnimals: [...result.current.likedAnimals]
      };
      
      // undo実行
      act(() => {
        result.current.undo();
      });
      
      expect(result.current.currentIndex).toBe(beforeUndo.currentIndex - 1);
      expect(result.current.likedAnimals).toHaveLength(beforeUndo.likedAnimals.length - 1);
    });
  });
});
```

### 2.4 ユーティリティ関数テスト
```typescript
// utils.test.ts
import { filterAnimals, calculateDistance, validateAnimal } from '../utils';
import { mockDogs, mockCats } from '../__mocks__/animals';

describe('filterAnimals', () => {
  it('犬種フィルターが正しく動作する', () => {
    const filter = {
      breeds: ['柴犬', 'ゴールデンレトリバー']
    };
    
    const filtered = filterAnimals(mockDogs, filter);
    
    expect(filtered.every(dog => 
      filter.breeds.includes(dog.breed)
    )).toBe(true);
  });

  it('年齢フィルターが正しく動作する', () => {
    const filter = {
      age: { min: 12, max: 36 } // 1歳〜3歳
    };
    
    const filtered = filterAnimals(mockDogs, filter);
    
    expect(filtered.every(dog => 
      dog.age >= filter.age.min && dog.age <= filter.age.max
    )).toBe(true);
  });

  it('複数フィルターが正しく組み合わせられる', () => {
    const filter = {
      breeds: ['柴犬'],
      gender: ['male'],
      size: ['medium']
    };
    
    const filtered = filterAnimals(mockDogs, filter);
    
    expect(filtered.every(dog => 
      dog.breed === '柴犬' &&
      dog.gender === 'male' &&
      dog.size === 'medium'
    )).toBe(true);
  });
});

describe('calculateDistance', () => {
  it('正しい距離が計算される', () => {
    const point1 = { latitude: 35.6762, longitude: 139.6503 }; // 東京
    const point2 = { latitude: 34.6937, longitude: 135.5023 }; // 大阪
    
    const distance = calculateDistance(point1, point2);
    
    expect(distance).toBeCloseTo(400, 0); // 約400km
  });

  it('同じ地点の場合0kmが返される', () => {
    const point = { latitude: 35.6762, longitude: 139.6503 };
    
    const distance = calculateDistance(point, point);
    
    expect(distance).toBe(0);
  });
});

describe('validateAnimal', () => {
  it('正しい動物データでtrueが返される', () => {
    expect(validateAnimal(mockDogs[0])).toBe(true);
  });

  it('必須フィールドが欠けている場合falseが返される', () => {
    const invalidAnimal = { ...mockDogs[0], name: undefined };
    
    expect(validateAnimal(invalidAnimal)).toBe(false);
  });

  it('不正な型の場合falseが返される', () => {
    const invalidAnimal = { ...mockDogs[0], age: 'invalid' };
    
    expect(validateAnimal(invalidAnimal)).toBe(false);
  });
});
```

## 3. 統合テスト（Integration Tests）

### 3.1 コンポーネント統合テスト
```typescript
// SwipeScreen.integration.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SwipeScreen } from '../SwipeScreen';
import { mockDogs } from '../__mocks__/animals';

// モックの設定
jest.mock('../hooks/useAnimalData', () => ({
  useAnimalData: () => ({
    animals: mockDogs,
    isLoading: false,
    error: null
  })
}));

describe('SwipeScreen統合テスト', () => {
  it('スワイプ操作が完全に動作する', async () => {
    render(<SwipeScreen species="dog" />);
    
    // 最初の動物が表示されることを確認
    expect(screen.getByText(mockDogs[0].name)).toBeInTheDocument();
    
    // Likeボタンをクリック
    const likeButton = screen.getByLabelText('お気に入り');
    fireEvent.click(likeButton);
    
    // 次の動物が表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(mockDogs[1].name)).toBeInTheDocument();
    });
    
    // お気に入りリストに追加されることを確認
    const favoritesButton = screen.getByLabelText('お気に入り一覧');
    fireEvent.click(favoritesButton);
    
    expect(screen.getByText(mockDogs[0].name)).toBeInTheDocument();
  });

  it('フィルター機能が正しく動作する', async () => {
    render(<SwipeScreen species="dog" />);
    
    // フィルターボタンをクリック
    const filterButton = screen.getByLabelText('フィルター');
    fireEvent.click(filterButton);
    
    // 犬種フィルターを設定
    const breedSelect = screen.getByLabelText('犬種');
    fireEvent.change(breedSelect, { target: { value: '柴犬' } });
    
    // フィルター適用
    const applyButton = screen.getByText('適用');
    fireEvent.click(applyButton);
    
    // フィルターされた結果が表示されることを確認
    await waitFor(() => {
      const displayedAnimals = screen.getAllByTestId('animal-card');
      displayedAnimals.forEach(card => {
        expect(card).toHaveTextContent('柴犬');
      });
    });
  });
});
```

### 3.2 データフロー統合テスト
```typescript
// dataFlow.integration.test.ts
import { renderHook, act } from '@testing-library/react';
import { useSwipeState } from '../hooks/useSwipeState';
import { useAnimalData } from '../hooks/useAnimalData';
import { mockDogs } from '../__mocks__/animals';

describe('データフロー統合テスト', () => {
  it('スワイプ状態と動物データの連携が正しく動作する', () => {
    const { result: swipeResult } = renderHook(() => useSwipeState());
    const { result: animalResult } = renderHook(() => useAnimalData('dog'));
    
    // 初期状態確認
    expect(swipeResult.current.currentIndex).toBe(0);
    expect(animalResult.current.animals).toEqual(mockDogs);
    
    // スワイプ実行
    act(() => {
      swipeResult.current.handleSwipe(mockDogs[0].id, 'right');
    });
    
    // 状態更新確認
    expect(swipeResult.current.currentIndex).toBe(1);
    expect(swipeResult.current.likedAnimals).toContain(mockDogs[0]);
    
    // LocalStorage永続化確認
    const savedState = JSON.parse(
      localStorage.getItem('pawmatch:swipe_state') || '{}'
    );
    expect(savedState.currentIndex).toBe(1);
    expect(savedState.likedAnimals).toHaveLength(1);
  });
});
```

## 4. E2Eテスト（End-to-End Tests）

### 4.1 Playwright設定
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 4.2 ユーザーシナリオテスト
```typescript
// e2e/user-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('ユーザージャーニー', () => {
  test('新規ユーザーが犬を検索してお気に入り登録する', async ({ page }) => {
    // ホームページアクセス
    await page.goto('/');
    
    // アプリ選択画面の確認
    await expect(page.locator('h1')).toContainText('PawMatch');
    
    // DogMatchを選択
    await page.click('[data-testid="dog-match-button"]');
    
    // スワイプ画面の表示確認
    await expect(page.locator('[data-testid="swipe-screen"]')).toBeVisible();
    
    // 最初の動物カードの確認
    const firstCard = page.locator('[data-testid="animal-card"]').first();
    await expect(firstCard).toBeVisible();
    
    // 動物の名前を記録
    const animalName = await firstCard.locator('h2').textContent();
    
    // Likeボタンをクリック
    await page.click('[data-testid="like-button"]');
    
    // 次の動物カードが表示されることを確認
    await expect(firstCard.locator('h2')).not.toContainText(animalName);
    
    // お気に入り一覧を開く
    await page.click('[data-testid="favorites-button"]');
    
    // お気に入りに追加されていることを確認
    await expect(page.locator('[data-testid="favorites-list"]')).toContainText(animalName);
  });

  test('フィルター機能を使用して犬を検索する', async ({ page }) => {
    await page.goto('/dog');
    
    // フィルターボタンをクリック
    await page.click('[data-testid="filter-button"]');
    
    // フィルターモーダルの表示確認
    await expect(page.locator('[data-testid="filter-modal"]')).toBeVisible();
    
    // 犬種フィルターを設定
    await page.selectOption('[data-testid="breed-select"]', '柴犬');
    
    // サイズフィルターを設定
    await page.check('[data-testid="size-medium"]');
    
    // フィルター適用
    await page.click('[data-testid="apply-filter"]');
    
    // フィルターモーダルが閉じることを確認
    await expect(page.locator('[data-testid="filter-modal"]')).not.toBeVisible();
    
    // フィルター結果の確認（複数の動物を確認）
    const animalCards = page.locator('[data-testid="animal-card"]');
    const count = await animalCards.count();
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      await expect(animalCards.nth(i)).toContainText('柴犬');
    }
  });

  test('スワイプジェスチャーが正しく動作する', async ({ page }) => {
    await page.goto('/dog');
    
    const animalCard = page.locator('[data-testid="animal-card"]').first();
    const cardBox = await animalCard.boundingBox();
    
    if (cardBox) {
      const centerX = cardBox.x + cardBox.width / 2;
      const centerY = cardBox.y + cardBox.height / 2;
      
      // 右スワイプ（Like）
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX + 150, centerY, { steps: 10 });
      await page.mouse.up();
      
      // 次のカードが表示されることを確認
      await expect(animalCard).not.toBeVisible();
    }
  });
});
```

### 4.3 パフォーマンステスト
```typescript
// e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('パフォーマンス', () => {
  test('ページ読み込み速度が基準内である', async ({ page }) => {
    const start = Date.now();
    
    await page.goto('/');
    
    // 主要コンテンツの表示待ち
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - start;
    
    // 3秒以内での読み込み
    expect(loadTime).toBeLessThan(3000);
  });

  test('大量スワイプ時のパフォーマンス', async ({ page }) => {
    await page.goto('/dog');
    
    const start = Date.now();
    
    // 連続50回スワイプ
    for (let i = 0; i < 50; i++) {
      await page.click('[data-testid="like-button"]');
      // 次のカードの読み込み待ち
      await page.waitForTimeout(100);
    }
    
    const swipeTime = Date.now() - start;
    
    // 1回あたり平均200ms以内
    const averageTime = swipeTime / 50;
    expect(averageTime).toBeLessThan(200);
  });
});
```

## 5. 視覚回帰テスト

### 5.1 スクリーンショットテスト
```typescript
// e2e/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('視覚回帰テスト', () => {
  test('アプリ選択画面のスクリーンショット', async ({ page }) => {
    await page.goto('/');
    
    // スクリーンショット比較
    await expect(page).toHaveScreenshot('app-selector.png');
  });

  test('犬スワイプ画面のスクリーンショット', async ({ page }) => {
    await page.goto('/dog');
    
    // 動物カードの読み込み待ち
    await page.waitForSelector('[data-testid="animal-card"]');
    
    await expect(page).toHaveScreenshot('dog-swipe-screen.png');
  });

  test('猫スワイプ画面のスクリーンショット', async ({ page }) => {
    await page.goto('/cat');
    
    await page.waitForSelector('[data-testid="animal-card"]');
    
    await expect(page).toHaveScreenshot('cat-swipe-screen.png');
  });

  test('お気に入り一覧のスクリーンショット', async ({ page }) => {
    await page.goto('/dog');
    
    // いくつかの動物をお気に入りに追加
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid="like-button"]');
      await page.waitForTimeout(500);
    }
    
    // お気に入り一覧を開く
    await page.click('[data-testid="favorites-button"]');
    
    await expect(page).toHaveScreenshot('favorites-list.png');
  });
});
```

## 6. アクセシビリティテスト

### 6.1 axe-coreテスト
```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('アクセシビリティテスト', () => {
  test('アプリ選択画面のアクセシビリティ', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('スワイプ画面のアクセシビリティ', async ({ page }) => {
    await page.goto('/dog');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('キーボードナビゲーション', async ({ page }) => {
    await page.goto('/dog');
    
    // タブキーでの移動確認
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // スペースキーでの操作確認
    await page.keyboard.press('Space');
    
    // Enterキーでの操作確認
    await page.keyboard.press('Enter');
  });
});
```

## 7. モックとスタブ

### 7.1 データモック
```typescript
// __mocks__/animals.ts
import { Dog, Cat } from '../types';

export const mockDog: Dog = {
  id: 'dog-001',
  name: 'ポチ',
  species: 'dog',
  breed: '柴犬',
  age: 24, // 2歳
  gender: 'male',
  size: 'medium',
  images: [
    {
      id: 'img-001',
      url: '/test-images/dog-001.jpg',
      alt: 'ポチの写真',
      width: 400,
      height: 300
    }
  ],
  description: 'フレンドリーな柴犬です',
  personality: ['フレンドリー', '活発'],
  specialNeeds: [],
  healthStatus: 'healthy',
  location: {
    prefecture: '東京都',
    city: '渋谷区'
  },
  organization: {
    id: 'org-001',
    name: 'テスト保護団体',
    type: 'shelter',
    contact: { email: 'test@example.com' },
    location: { prefecture: '東京都', city: '渋谷区' },
    verified: true,
    createdAt: new Date('2023-01-01')
  },
  dogInfo: {
    breed: '柴犬',
    isMixed: false,
    exerciseNeeds: 'moderate',
    walkFrequency: 2,
    walkDuration: 30,
    playfulness: 4,
    energyLevel: 4,
    trainingLevel: 'basic',
    housebroken: true,
    leashTrained: true,
    commands: ['sit', 'stay'],
    behaviorIssues: [],
    goodWithChildren: true,
    goodWithDogs: true,
    goodWithCats: false,
    goodWithStrangers: true,
    apartmentSuitable: true,
    yardRequired: false,
    climatePreference: ['temperate'],
    guardDog: false,
    huntingInstinct: false,
    swimmingAbility: false,
    noiseLevel: 'moderate'
  },
  isActive: true,
  featured: false,
  viewCount: 0,
  likeCount: 0,
  adoptionStatus: 'available',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01')
};

export const mockCat: Cat = {
  // 猫のモックデータ...
};

export const mockDogs: Dog[] = [
  mockDog,
  // 追加の犬データ...
];

export const mockCats: Cat[] = [
  mockCat,
  // 追加の猫データ...
];
```

### 7.2 APIモック
```typescript
// __mocks__/api.ts
import { rest } from 'msw';
import { mockDogs, mockCats } from './animals';

export const handlers = [
  rest.get('/api/animals/dogs', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockDogs,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: mockDogs.length,
          itemsPerPage: 20,
          hasNext: false,
          hasPrevious: false
        }
      })
    );
  }),

  rest.get('/api/animals/cats', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockCats,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: mockCats.length,
          itemsPerPage: 20,
          hasNext: false,
          hasPrevious: false
        }
      })
    );
  }),

  rest.get('/api/animals/:id', (req, res, ctx) => {
    const { id } = req.params;
    const animal = [...mockDogs, ...mockCats].find(a => a.id === id);
    
    if (!animal) {
      return res(
        ctx.status(404),
        ctx.json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '動物が見つかりません'
          }
        })
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: animal
      })
    );
  })
];
```

## 8. テスト実行と継続的インテグレーション

### 8.1 NPMスクリプト
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:visual": "playwright test --grep='視覚回帰'",
    "test:accessibility": "playwright test --grep='アクセシビリティ'",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

### 8.2 GitHub Actions
```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx playwright install
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## 9. テストカバレッジ

### 9.1 カバレッジ目標
- **ライン カバレッジ**: 80%以上
- **ブランチ カバレッジ**: 75%以上
- **関数 カバレッジ**: 85%以上
- **ステートメント カバレッジ**: 80%以上

### 9.2 カバレッジ設定
```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/**/*.stories.tsx',
    '!src/**/__mocks__/**'
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 75,
      functions: 85,
      statements: 80
    }
  },
  coverageReporters: ['text', 'lcov', 'html']
};
```