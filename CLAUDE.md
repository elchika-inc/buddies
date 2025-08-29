# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

PawMatchは保護犬・保護猫の里親マッチングWebアプリケーションです。Tinder形式のスワイプUIで、ペットと里親候補者をマッチングします。

## アーキテクチャ

### モノレポ構造
```
pawmatch/
├── app/          # Next.js フロントエンド (Cloudflare Pages)
├── api/          # Cloudflare Workers API (Hono)
├── crawler/      # データクローラー (Cloudflare Workers)
├── dispatcher/   # タスクディスパッチャー (Cloudflare Workers)
└── scripts/      # スクリーンショット・画像変換スクリプト (GitHub Actionsで実行)
```

### 技術スタック
- **Frontend**: Next.js 14, TypeScript (厳格モード), TailwindCSS, Framer Motion
- **Backend**: Cloudflare Workers, Hono, D1 Database
- **Storage**: Cloudflare R2
- **Package Manager**: Bun/npm

### ドメイン構成
- **API**: `pawmatch-api.elchika.app` - メインAPI（カスタムドメイン）
- **App (Dogs)**: `pawmatch-dogs.elchika.app` - 犬専用フロントエンド
- **App (Cats)**: `pawmatch-cats.elchika.app` - 猫専用フロントエンド
- **Workers**: デフォルトの `.workers.dev` ドメインを使用
  - `pawmatch-crawler.*.workers.dev`
  - `pawmatch-dispatcher.*.workers.dev`

## 開発コマンド

### 基本コマンド（ルートディレクトリから実行）
```bash
# 開発サーバー起動
npm run dev:all      # API + App + Crawler + Dispatcher 同時起動
npm run dev          # App のみ (port 3004)
npm run api:dev      # API のみ (port 8787)

# ビルド・型チェック
npm run build        # App ビルド
npm run type-check   # TypeScript 型チェック
npm run lint         # ESLint
npm run lint:fix     # ESLint 自動修正

# デプロイ
npm run deploy       # Cloudflare Pages デプロイ
npm run deploy:dog   # DogMatch デプロイ
npm run deploy:cat   # CatMatch デプロイ

# データベース
npm run api:db:init     # DB初期化
npm run api:db:migrate  # マイグレーション実行

# クローラー
npm run crawler:dogs    # 犬データクロール
npm run crawler:cats    # 猫データクロール
```

### 個別モジュールでの作業
```bash
# app/ ディレクトリ内
cd app && npm run dev
cd app && npm test

# api/ ディレクトリ内  
cd api && npm run dev
cd api && wrangler tail  # ログ監視

# crawler/ ディレクトリ内
cd crawler && npm run test
```

## コーディング規約

### TypeScript設定
- **厳格モード有効** (`strict: true`)
- `noUncheckedIndexedAccess: true` - 配列アクセス時のundefinedチェック必須
- `exactOptionalPropertyTypes: true` - オプショナルプロパティの厳密な型定義
- `noImplicitReturns: true` - 暗黙的なreturn禁止

### エラーハンドリング
- Result型パターンを使用（`Result<T, E>`）
- API応答は必ず型ガード関数で検証
- 非同期処理は必ずtry-catchでラップ

### ファイル構成パターン
```typescript
// services/ - ビジネスロジック
// controllers/ - APIエンドポイント
// types/ - 型定義（*.ts）
// utils/ - ユーティリティ関数
// hooks/ - Reactカスタムフック
// components/ - UIコンポーネント
```

### データ変換
- APIレスポンスは`ResponseTransformer`で正規化
- 住所解析は`addressParser`を使用
- 都道府県名は`prefectureNormalizer`で統一

## 重要な実装詳細

### ペットデータ管理
- DogとCatで別々のデータ型（`Dog`、`Cat`型）
- 環境変数`NEXT_PUBLIC_PET_TYPE`で犬/猫モード切り替え
- データはCloudflare D1から取得、R2に画像保存

### 状態管理
- LocalStorageでスワイプ履歴・お気に入り管理
- `useLocalStorage`フックでエラーハンドリング込みの永続化
- マイグレーション処理でデータ構造の更新対応

### パフォーマンス最適化
- 画像は事前にR2で最適化済み
- PWA対応でオフライン動作サポート
- React.memoとuseMemoで再レンダリング最適化

## デバッグ・トラブルシューティング

### ログ確認
```bash
# Cloudflare Workers ログ
cd api && wrangler tail

# ブラウザコンソールでデバッグ情報
localStorage.debug = 'pawmatch:*'
```

### よくある問題
- **CORS エラー**: API側の`Access-Control-Allow-Origin`設定確認
- **型エラー**: `npm run type-check`で事前チェック
- **D1接続エラー**: wrangler.tomlのbinding設定確認

## GitHub Actions

### automated-image-pipeline.yml  
Dispatcher経由で起動される画像処理パイプライン。ペットのスクリーンショットを取得し、JPEG/WebP形式に変換してR2にアップロード。