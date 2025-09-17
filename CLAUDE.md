# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

PawMatchは保護犬・保護猫とユーザーをマッチングするTinder風Webアプリケーションです。マルチワークスペース構成で、Cloudflare環境上で動作します。

## 必須開発コマンド

### 基本コマンド

```bash
# 開発サーバー起動
npm run dev           # frontend(3004)とAPI(8787)を同時起動
npm run dev:all       # 全サービス同時起動

# ビルド・検証
npm run build         # frontendのビルド
npm run type-check    # 全ワークスペースの型チェック
npm run lint          # 全ワークスペースのlint実行
npm run lint:fix      # lint自動修正
npm run test          # 全ワークスペースのテスト実行

# 個別ワークスペースの操作
npm run type-check:app       # frontend
npm run type-check:api       # api
npm run type-check:crawler   # crawler
npm run type-check:dispatcher # dispatcher
npm run type-check:shared    # shared

# デプロイ
npm run deploy:dog    # DogMatchデプロイ (Cloudflare Pages)
npm run deploy:cat    # CatMatchデプロイ (Cloudflare Pages)
npm run deploy:api    # APIデプロイ (Cloudflare Workers)
npm run deploy:crawler # Crawlerデプロイ (Cloudflare Workers)
npm run deploy:dispatcher # Dispatcherデプロイ (Cloudflare Workers)

# データベース操作
npm run db:push       # ローカルDBへマイグレーション適用
npm run db:studio     # Drizzle Studio起動
npm run db:generate   # マイグレーションファイル生成
```

## アーキテクチャ構造

### ワークスペース構成

- **frontend** (`@pawmatch/frontend`) - Next.js 14ベースのフロントエンド、Cloudflare Pagesにデプロイ
- **api** (`@pawmatch/api`) - HonoベースのREST API、Cloudflare Workers上で動作
- **crawler** (`@pawmatch/crawler`) - ペット情報収集クローラー、Cloudflare Workers
- **dispatcher** (`@pawmatch/dispatcher`) - タスクディスパッチャー、Cloudflare Workers
- **shared** (`@pawmatch/shared`) - 共有型定義・ユーティリティ

### 技術スタック

- **Frontend**: Next.js 14, TypeScript, TailwindCSS, React Query
- **Backend**: Hono (Cloudflare Workers), Drizzle ORM, Zod
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **Queue**: Cloudflare Queues
- **Deployment**: Cloudflare Pages/Workers

### API通信パターン

- フロントエンドは`NEXT_PUBLIC_API_URL`環境変数で指定されたAPIエンドポイントと通信
- 認証はAPIキー（`x-api-key`ヘッダー）を使用
- CORSは`api/src/middleware/setup.ts`で設定

### データベース構造

- Drizzle ORMを使用し、スキーマは`api/src/db/schema/`に定義
- マイグレーションは`api/database/migrations/`に配置
- ローカル開発時はWranglerのD1エミュレータを使用

### 環境変数設定

開発時に必要な`.env`ファイル:

- `frontend/.env.local` - Next.js環境変数（PET_TYPE、API_URL等）
- `api/.dev.vars` - Wrangler開発用環境変数（API_KEY、DB設定等）

### サービス間連携

- APIはDispatcher/Crawlerサービスとサービスバインディングで連携
- Crawler QueueをProducerとして使用
- 画像はR2バケット（IMAGES_BUCKET）に保存

## 開発時の注意事項

1. **型チェック**: コード変更後は必ず`npm run type-check`を実行
2. **Lint**: コミット前に`npm run lint`でエラーがないことを確認
3. **環境変数**: `.env.example`を参考に必要な環境変数を設定
4. **Cloudflare互換性**: Node.js APIの使用時は`nodejs_compat`フラグが必要
5. **ワークスペース**: npm workspacesを使用しているため、依存関係の追加は適切なワークスペースで実行
