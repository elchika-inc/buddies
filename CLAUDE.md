# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

PawMatch - 保護犬・保護猫と里親をマッチングするTinder風Webアプリケーション。Cloudflare インフラストラクチャ上で動作するフルスタックアプリケーション。

## アーキテクチャ

### マイクロサービス構成

- **Frontend** (`/frontend`): Next.js 14 + TypeScript、Cloudflare Pages上で動作
- **API** (`/api`): Hono + Cloudflare Workers、D1データベースとR2ストレージを使用
- **Crawler** (`/crawler`): ペット情報収集サービス、Cloudflare Workers上で動作
- **Dispatcher** (`/dispatcher`): タスクスケジューリングサービス、Cloudflare Workers上で動作

### データフロー

1. Crawler → Dispatcher経由でタスクをキューイング → APIへデータ送信
2. Frontend → API経由でペットデータ取得 → ユーザーへ表示
3. 画像はCloudflare R2に保存、D1データベースでメタデータ管理

## 開発コマンド

### 初期セットアップ

```bash
npm install
cp frontend/.env.local.example frontend/.env.local
cp api/.env.local.example api/.env.local
npm run db:init     # D1データベース初期化
npm run db:migrate  # マイグレーション実行
```

### 開発サーバー

```bash
npm run dev:all     # 全サービス同時起動（推奨）
npm run dev:app     # Frontend のみ (port 3004)
npm run dev:api     # API のみ (port 9789)
```

### ビルド・検証

```bash
npm run build       # Frontend ビルド
npm run type-check  # 全ワークスペースの型チェック
npm run lint        # ESLint実行
npm run lint:fix    # ESLint自動修正
```

### テスト実行

```bash
npm run test        # 全ワークスペースのテスト実行
npm run test:app    # Frontend のテストのみ
```

### データベース操作

```bash
npm run db:migrate       # ローカルマイグレーション
npm run db:migrate:prod  # 本番マイグレーション
npm run db:studio        # Drizzle Studio起動（DBビューア）
npm run db:reset         # ローカルDB完全リセット
```

### デプロイ

```bash
npm run deploy:dog   # DogMatchアプリデプロイ
npm run deploy:cat   # CatMatchアプリデプロイ
npm run deploy:api   # APIデプロイ
npm run deploy:all   # 全サービスデプロイ
```

## 技術スタック詳細

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Styling**: TailwindCSS + Radix UI
- **State**: React Hooks + localStorage
- **Icons**: Lucide React + FontAwesome
- **Animation**: Framer Motion
- **PWA**: next-pwa

### API

- **Framework**: Hono
- **Database**: Cloudflare D1 (SQLite) + Drizzle ORM
- **Storage**: Cloudflare R2
- **Cache**: Cloudflare KV
- **Validation**: Zod
- **認証**: APIキーベース（ヘッダー認証）

### 共通

- **TypeScript**: 厳格モード有効
- **パッケージマネージャ**: npm workspaces
- **モノレポ管理**: ルートpackage.jsonでworkspace管理

## 重要な環境変数

### Frontend (.env.local)

- `NEXT_PUBLIC_ENVIRONMENT`: development/production
- `NEXT_PUBLIC_ANIMALS_API`: APIエンドポイントURL
- `NEXT_PUBLIC_API_KEY`: API認証キー
- `NEXT_PUBLIC_PET_TYPE`: dog/cat (アプリケーションタイプ)

### API (.dev.vars)

- `ALLOWED_ORIGIN`: CORS許可オリジン
- `USE_LOCAL_IMAGES`: ローカル画像使用フラグ

### Cloudflare設定 (wrangler.toml)

- D1データベース: pawmatch-db
- R2バケット: pawmatch-images
- KVネームスペース: API_KEYS_CACHE

## ディレクトリ構造とルーティング

### API エンドポイント

- `/api/pets` - ペット情報CRUD
- `/api/images` - 画像管理
- `/api/stats` - 統計情報
- `/api/admin` - 管理機能
- `/api/keys` - APIキー管理
- `/crawler` - 内部クローラー用エンドポイント

### Frontend ルーティング

- App RouterによるNext.js 14標準構成
- `/` - メインのマッチングアプリ
- 動的ルーティングなし（SPAとして動作）

## 開発時の注意事項

### Cloudflare Workers環境

- Node.js互換性フラグ有効（`nodejs_compat`）
- Web API標準準拠
- グローバル変数の使用制限あり

### 型安全性

- TypeScript strictモード使用
- Zodによるランタイム検証
- Drizzle ORMの型推論活用

### エラーハンドリング

- Resultパターン使用（`Result<T, E>`型）
- 構造化エラーレスポンス
- 適切なHTTPステータスコード返却
