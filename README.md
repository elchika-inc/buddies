# PawMatch - 犬・猫専門マッチングアプリ

TinderライクなUIUXを持つ、保護犬・保護猫とユーザーをマッチングする2つの専門クライアントアプリケーション

## 🐕🐱 アプリ構成

**PawMatch**は犬と猫に特化した2つの独立したアプリを提供します：

### DogMatch - 保護犬専門アプリ
- 🏃‍♂️ **運動量・しつけレベル別フィルター**
- 🏠 **住環境マッチング（庭の必要性、アパート適性）**
- 🎾 **散歩頻度・子供との相性**
- 🐕 **犬種特有の性格・ケア情報**

### CatMatch - 保護猫専門アプリ  
- 😸 **社会性・活動時間別フィルター**
- 🌙 **室内外適性・多頭飼い情報**
- ✂️ **毛の長さ・グルーミング要件**
- 🔇 **鳴き声レベル・性格マッチング**

## 🚀 クイックスタート

### 前提条件
- Node.js 18+ 
- npm または yarn

### ローカル開発

```bash
# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev

# ブラウザで http://localhost:3331 を開く
```

### ビルド

```bash
# TypeScript型チェック
npm run build:check

# プロダクション用ビルド
npm run build

# ビルド結果をプレビュー
npm run preview
```

## ✨ 主な機能

### アプリ選択画面
- **DogMatch・CatMatch選択**: 初回起動時に専門アプリを選択
- **特化機能の説明**: 各アプリの特徴・対象動物を明確表示
- **シームレス切り替え**: いつでも他のアプリに切り替え可能

### Tinderライクスワイプ機能（共通）
- **右スワイプ**: 気になる動物として保存
- **左スワイプ**: パス（興味なし）
- **上スワイプ**: 特に気になる動物として保存
- **タッチ・マウス両対応**: スマートフォンとPCの両方で快適に操作可能

### 犬専用機能（DogMatch）
- **運動量表示**: 低・中・高の3段階で運動要件を視覚化
- **住環境適性**: 庭の必要性・アパート適性をバッジ表示
- **しつけ情報**: 基本済み・要訓練・高度な訓練済みの段階表示
- **散歩頻度**: 1日の必要散歩回数を明記
- **相性情報**: 子供・他の犬との相性を表示

### 猫専用機能（CatMatch）
- **社会性レベル**: 人懐っこい・シャイ・警戒心強いなどの性格表示
- **活動時間**: 昼型・夜型・どちらでもの生活リズム表示
- **室内外適性**: 完全室内・室内外自由などの飼育環境
- **グルーミング要件**: 毛の長さに応じたお手入れレベル表示
- **多頭飼い適性**: 他の猫との同居可能性を表示
- **鳴き声レベル**: 静か・普通・よく鳴くの音量レベル

### インタラクティブUI（共通）
- **リアルタイムフィードバック**: スワイプ中に動物種別の色付きインジケーターを表示
- **スムーズアニメーション**: CSS Transformを活用した滑らかな動作
- **カード重ね表示**: 現在のカードと次のカードを重ねて表示
- **進行状況表示**: 残り件数とアクション結果を常時表示
- **専用カラーテーマ**: 犬（オレンジ系）・猫（パープル系）の専用配色

### 状態管理（独立）
- **スワイプ履歴**: 犬・猫それぞれの操作を独立して記録・管理
- **多層リスト管理**: 気になる・特に気になる・パスの3つのリストを分離
- **アプリ間分離**: DogMatchとCatMatchの状態は完全に独立

## 🏗️ アーキテクチャ

### 技術スタック
- **React 18**: 最新のReact Hooks使用
- **Apollo Client**: GraphQLクライアント・状態管理
- **GraphQL**: 型安全で効率的なデータ取得
- **TanStack Router**: 型安全なルーティング
- **TypeScript 5**: 型安全な開発
- **Vite**: 高速ビルド・開発サーバー
- **TailwindCSS**: ユーティリティファーストのCSS
- **Lucide React**: 軽量なアイコンライブラリ

### ディレクトリ構成
```
src/
├── routes/                  # TanStack Router ルート定義
│   ├── __root.tsx         # ルートレイアウト
│   ├── index.tsx          # ホームページ（アプリ選択）
│   ├── dogs.tsx           # 犬マッチング画面
│   └── cats.tsx           # 猫マッチング画面
├── graphql/                # GraphQL関連
│   ├── schema.ts          # GraphQLスキーマ定義
│   ├── resolvers.ts       # GraphQLリゾルバー
│   ├── client.ts          # Apollo Client設定
│   └── queries.ts         # クエリ・ミューテーション定義
├── components/              # UIコンポーネント
│   ├── ui/                 # 基本UIコンポーネント
│   ├── AppSelector.tsx     # アプリ選択画面
│   ├── DogMatchApp.tsx     # 犬専用アプリ
│   ├── CatMatchApp.tsx     # 猫専用アプリ
│   ├── DogCard.tsx         # 犬情報カード
│   ├── CatCard.tsx         # 猫情報カード
│   ├── DogSwipeCard.tsx    # 犬用スワイプカード
│   ├── CatSwipeCard.tsx    # 猫用スワイプカード
│   └── ActionButtons.tsx   # 共通アクションボタン
├── hooks/                  # カスタムフック
│   ├── useAnimals.ts       # 動物データ取得（GraphQL）
│   ├── useAnimalSwipe.ts   # スワイプ処理（GraphQL統合）
│   ├── useSwipeGesture.ts  # スワイプジェスチャー処理
│   ├── useDogSwipeState.ts # 犬用スワイプ状態管理
│   └── useCatSwipeState.ts # 猫用スワイプ状態管理
├── types/                  # TypeScript型定義
│   ├── dog.ts             # 犬関連の型定義
│   ├── cat.ts             # 猫関連の型定義
│   ├── animal.ts          # 動物共通型定義
│   ├── common.ts          # 共通型定義
│   └── graphql.ts         # GraphQL関連型定義
├── data/                   # モックデータ
│   ├── dogs.ts            # サンプル犬データ
│   ├── cats.ts            # サンプル猫データ
│   └── animals.ts         # 統合動物データ
├── config/                 # 設定ファイル
│   └── environment.ts      # 環境別設定
└── lib/                    # ユーティリティ
    └── utils.ts            # 共通ユーティリティ関数
```

## 🎨 デザインシステム

### カラーパレット

#### DogMatch（犬専用）
- **メインカラー**: オレンジ〜イエローのグラデーション
- **テーマカラー**: `bg-orange-500`、`from-orange-50 to-yellow-50`
- **アクションカラー**: 
  - 緑（Like）: `bg-green-500` 🐕
  - 赤（Pass）: `bg-red-500` ❌
  - 紫（Super Like）: `bg-purple-500` ⭐

#### CatMatch（猫専用）  
- **メインカラー**: パープル〜ピンクのグラデーション
- **テーマカラー**: `bg-purple-500`、`from-purple-50 to-pink-50`
- **アクションカラー**: 
  - 緑（Like）: `bg-green-500` 🐱
  - 赤（Pass）: `bg-red-500` ❌
  - 紫（Super Like）: `bg-purple-500` ⭐

#### 共通アクションカラー
- 緑（Like）: `bg-green-500`
- 赤（Pass）: `bg-red-500` 
- 紫（Super Like）: `bg-purple-500`

### レスポンシブデザイン
- **モバイルファースト**: 320px〜1920pxに対応
- **カードサイズ**: 最大幅384px、高さ650px
- **タッチターゲット**: 最小44pxを確保

## 🔧 カスタマイズ

### スワイプ感度の調整

```typescript
// hooks/useSwipeGesture.ts
const { 
  horizontalThreshold = 100,  // 水平スワイプの閾値（px）
  verticalThreshold = 120,    // 垂直スワイプの閾値（px）
} = props
```

### アニメーション設定

```typescript
// hooks/useSwipeGesture.ts
const rotation = dragOffset.x * 0.1        // 回転係数
const opacity = Math.max(0.7, 1 - Math.abs(dragOffset.x) / 300)  // 透明度
```

### 犬データの追加

```typescript
// data/dogs.ts
export const mockDogs: Dog[] = [
  {
    id: '6',
    name: '新しいワンちゃん',
    breed: '雑種',
    exerciseLevel: '中',
    needsYard: false,
    // ... その他のプロパティ
  }
]
```

### 猫データの追加

```typescript
// data/cats.ts
export const mockCats: Cat[] = [
  {
    id: '6',
    name: '新しいネコちゃん',
    breed: '雑種',
    socialLevel: '人懐っこい',
    indoorOutdoor: '完全室内',
    // ... その他のプロパティ
  }
]
```

## 📱 使用方法

### 基本操作
1. **アプリ選択**: 起動時にDogMatch（🐕）またはCatMatch（🐱）を選択
2. **動物カードをスワイプ**: 
   - 左にドラッグ/スワイプ → パス
   - 右にドラッグ/スワイプ → 気になる
   - 上にドラッグ/スワイプ → 特に気になる
3. **ボタン操作**: 画面下部のボタンからも同じ操作が可能
4. **リスト確認**: ヘッダーのボタンから保存済みリストを確認
5. **アプリ切り替え**: 左上の「戻る」ボタンで選択画面に戻る

### ナビゲーション

#### DogMatch（犬専用）
- **気になるワンちゃんリスト**: ❤️ボタンから
- **特に気になるワンちゃんリスト**: ⭐ボタンから  
- **リセット**: 全て確認後にリセットボタンから

#### CatMatch（猫専用）
- **気になるネコちゃんリスト**: ❤️ボタンから
- **特に気になるネコちゃんリスト**: ⭐ボタンから  
- **リセット**: 全て確認後にリセットボタンから

### 専用機能の確認

#### DogMatch特有の表示項目
- 🏃‍♂️ 運動量レベル（低・中・高）
- 🏠 住環境要件（庭必要/アパートOK）
- 🎾 散歩頻度（1日の回数）
- 👶 子供との相性

#### CatMatch特有の表示項目  
- 😸 社会性レベル（人懐っこい〜警戒心強い）
- 🌙 活動時間（昼型・夜型・どちらでも）
- 🏠 室内外適性（完全室内・室内外自由等）
- 🔇 鳴き声レベル（静か・普通・よく鳴く）

## 🚀 GraphQL データ設計

### スキーマ設計

```graphql
# 動物インターフェース
interface Animal {
  id: ID!
  name: String!
  species: Species!
  breed: String!
  age: Int!
  gender: Gender!
  # ... その他共通フィールド
}

# 犬型
type Dog implements Animal {
  # 共通フィールド + 犬固有フィールド
  dogInfo: DogInfo!
}

# 猫型  
type Cat implements Animal {
  # 共通フィールド + 猫固有フィールド
  catInfo: CatInfo!
}
```

### データ取得パターン

```typescript
// 犬データ取得
const { data, loading, error } = useQuery(GET_DOGS, {
  variables: { page: 1, limit: 50 }
});

// スワイプアクション記録
const [recordSwipe] = useMutation(RECORD_SWIPE);
await recordSwipe({
  variables: { animalId: '123', action: 'like' }
});
```

### Apollo Clientキャッシュ

- **ページネーション対応**: 無限スクロール・増分ロード
- **型安全性**: GraphQLスキーマから自動型生成
- **効率的なクエリ**: 必要なデータのみ取得

## 🚧 今後の拡張予定

### 機能拡張
- [ ] GraphQLサーバーの本格実装
- [ ] リアルタイムサブスクリプション機能
- [ ] 詳細フィルタリング機能（GraphQLクエリ拡張）
- [ ] お気に入り動物の詳細管理・メモ機能
- [ ] 保護団体との連絡機能
- [ ] データ分析・統計機能
- [ ] 通知機能

### 技術改善
- [ ] 本格的なGraphQLサーバー構築
- [ ] データベース連携（PostgreSQL/MySQL）
- [ ] GraphQL Code Generator導入
- [ ] PWA対応
- [ ] パフォーマンス最適化
- [ ] アクセシビリティ向上
- [ ] テスト環境の充実

## 📄 ライセンス

このプロジェクトはサンプル・学習目的で作成されています。

## 🤝 コントリビューション

プルリクエストやイシューの報告を歓迎します！

---

**参考プロジェクト**: [jobantenna-light](https://github.com/...) のTinderライクUI実装を参考に開発