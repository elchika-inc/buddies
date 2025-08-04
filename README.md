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
- bun または npm
- Cloudflare Wrangler CLI (デプロイ用)

### ローカル開発

```bash
# 依存関係をインストール
npm install
# または
bun install

# 環境変数ファイルをコピー
cp .env.example .env.local

# 開発サーバーを起動
npm run dev
# または
bun dev

# ブラウザで http://localhost:3330 を開く
```

### D1データベースセットアップ

```bash
# D1データベースを作成・初期化
npm run db:setup

# マイグレーションを実行
npm run db:migrate:local

# サンプルデータを投入
npm run db:seed:local

# Workersサーバーを起動（D1データベース使用）
npm run dev:worker
```

### Cloudflare Workers デプロイ

```bash
# Wrangler CLI をインストール
npm install -g wrangler

# Cloudflare にログイン
wrangler login

# プロダクション用ビルド
npm run build:production

# Cloudflare Workers にデプロイ
npm run deploy
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
- **TanStack Router**: 型安全なルーティング
- **TypeScript 5**: 型安全な開発
- **Vite**: 高速ビルド・開発サーバー
- **TailwindCSS**: ユーティリティファーストのCSS
- **Lucide React**: 軽量なアイコンライブラリ
- **Cloudflare Workers**: 高速なサーバーレスプラットフォーム

### ディレクトリ構成
```
src/
├── routes/                  # TanStack Router ルート定義
│   ├── __root.tsx         # ルートレイアウト
│   ├── index.tsx          # ホームページ（アプリ選択）
│   ├── dogs.tsx           # 犬マッチング画面
│   └── cats.tsx           # 猫マッチング画面
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
│   ├── useSwipeGesture.ts  # スワイプジェスチャー処理（共通）
│   ├── useDogSwipeState.ts # 犬用スワイプ状態管理
│   └── useCatSwipeState.ts # 猫用スワイプ状態管理
├── config/                 # 設定ファイル
│   └── environment.ts      # 環境別設定
├── types/                  # TypeScript型定義
│   ├── dog.ts             # 犬関連の型定義
│   └── cat.ts             # 猫関連の型定義
├── data/                   # モックデータ
│   ├── dogs.ts            # サンプル犬データ
│   └── cats.ts            # サンプル猫データ
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

## 🌩️ Cloudflare 環境構築

### 必要な設定

1. **Cloudflare アカウント**: [Cloudflare](https://cloudflare.com) でアカウント作成
2. **API トークン**: Cloudflare ダッシュボードで API トークンを生成
3. **環境変数設定**: `.env.local` に設定

```bash
# Cloudflare設定
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
```

### デプロイ手順

```bash
# 1. プロジェクトビルド
npm run build:production

# 2. Workersデプロイ実行
npm run deploy

# 3. ステージング環境デプロイ
npm run deploy:staging

# 4. プロダクション環境デプロイ
npm run deploy:production
```

### 自動デプロイ設定

GitHub Actions を使用した自動デプロイも設定済みです：

- `main` ブランチ → 本番環境
- `develop` ブランチ → ステージング環境
- プルリクエスト → プレビュー環境

## 🚧 今後の拡張予定

### 機能拡張
- [ ] ローカルストレージでの状態永続化（アプリ別）
- [ ] 犬・猫の詳細画面実装（TanStack Router でページ追加）
- [ ] 犬専用フィルタリング機能（運動量、住環境等）
- [ ] 猫専用フィルタリング機能（社会性、活動時間等）
- [ ] お気に入り動物の詳細管理・メモ機能
- [ ] 保護団体との連絡機能
- [ ] アプリ間のデータ比較・統計機能
- [ ] Cloudflare Workers API との連携

### 技術改善
- [ ] Cloudflare Workers D1 データベース連携
- [ ] Cloudflare KV でキャッシュ機能
- [ ] PWA対応
- [ ] パフォーマンス最適化
- [ ] アクセシビリティ向上
- [ ] TypeScript 型安全性の向上

## 📄 ライセンス

このプロジェクトはサンプル・学習目的で作成されています。

## 🤝 コントリビューション

プルリクエストやイシューの報告を歓迎します！

---

**参考プロジェクト**: [jobantenna-light](https://github.com/...) のTinderライクUI実装を参考に開発