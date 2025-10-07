# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Buddiesは保護犬・保護猫とユーザーをマッチングするWebアプリケーションです。Cloudflare Workers、Next.js、TypeScriptで構築されたマイクロサービスアーキテクチャを採用しています。

## アーキテクチャ

### ワークスペース構成

- `frontend/` - Next.js フロントエンドアプリケーション（犬用・猫用の両方）
- `api/` - Cloudflare Workers API (Hono + Drizzle ORM)
- `crawler/` - ペット情報収集用クローラー (Cloudflare Workers)
- `dispatcher/` - タスク分散処理サービス (Cloudflare Workers)
- `admin/` - データベース管理画面 (Cloudflare Workers + React)
- `shared/` - 共通の型定義とユーティリティ

### 技術スタック

- **Runtime**: Cloudflare Workers (V8 isolates)
- **Frontend**: Next.js 14 + React + TypeScript
- **API**: Hono + Drizzle ORM
- **Database**: Cloudflare D1 (SQLite)
- **Build**: TypeScript + Wrangler
- **Testing**: Vitest (API/Workers), Jest (Frontend)

## 開発コマンド

### 基本開発コマンド

```bash
# フロントエンド + API のローカル開発
npm run dev

# 全サービス同時起動
npm run dev:all

# 個別サービス起動
npm run dev:app      # フロントエンド (port 3004)
npm run dev:api      # API (Wrangler dev --local)
npm run dev:crawler  # クローラー
npm run dev:dispatcher
npm run dev:admin    # 管理画面 (port 8788)
```

### ビルド・テスト・リント

```bash
# 全ワークスペースでビルド
npm run build

# 全ワークスペースでテスト実行
npm run test

# 全ワークスペースでリント
npm run lint
npm run lint:fix

# 全ワークスペースで型チェック
npm run type-check
```

### データベース操作

```bash
# スキーマをD1にプッシュ
npm run db:push

# Drizzle Studio起動
npm run db:studio

# ローカルD1データベースリセット
npm run db:reset

# サンプルデータ投入
npm run db:seed
```

### デプロイ

```bash
# フロントエンド個別デプロイ
npm run deploy:dog   # 犬用サイト
npm run deploy:cat   # 猫用サイト

# Workers全体デプロイ
npm run deploy:workers

# 全サービス一括デプロイ
npm run deploy:all
```

### ログ監視

```bash
npm run tail              # API ログ
npm run tail:crawler      # クローラーログ
npm run tail:dispatcher   # ディスパッチャーログ
```

## 重要な設定ファイル

### TypeScript設定

- `tsconfig.json` - ベース設定（厳格な型チェック有効）
- `tsconfig.frontend.json` - フロントエンド用設定
- `tsconfig.workers.json` - Workers用設定

### Wrangler設定

- `wrangler.base.toml` - 全Workersで共有する基本設定
- 各ワークスペースの `wrangler.toml` でbase設定を継承

## 開発時の注意点

### ワークスペース間の依存関係

- `shared/` パッケージは他の全ワークスペースから参照される
- 型定義変更時は関連ワークスペースの型チェックを実行

### フロントエンドの二重構成

- 犬用 (buddies-dogs) と猫用 (buddies-cats) で異なるドメイン
- `NEXT_PUBLIC_PET_TYPE` 環境変数で動作を切り替え

### Cloudflare Workers制約

- CPU時間: 50ms制限 (wrangler.base.tomlで設定)
- Node.js互換性フラグ有効
- 各Workerは独立したデプロイ単位

### データベース

- 開発環境: ローカルD1 (.wrangler/state/)
- 本番環境: Cloudflare D1
- Drizzle ORMでスキーマ管理

### クリーンアップ

```bash
# Wrangler一時ファイル削除
npm run clean:wrangler

# 全ビルド成果物削除
npm run clean:dist

# 完全クリーンアップ
npm run clean:all
```
