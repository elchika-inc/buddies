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
- `lp/` - ランディングページ (Next.js 14 静的エクスポート + Cloudflare Pages)
- `shared/` - 共通の型定義とユーティリティ

### 技術スタック

- **Runtime**: Cloudflare Workers (V8 isolates)
- **Frontend**: Next.js 14 + React + TypeScript
- **API**: Hono + Drizzle ORM
- **Database**: Cloudflare D1 (SQLite)
- **Build**: TypeScript + Wrangler
- **Testing**: Vitest (API/Workers), Jest (Frontend)

### モノレポ構造

このプロジェクトはnpmワークスペースを使用したモノレポ構成です。

**重要なポイント:**

- `shared/`パッケージはTypeScriptソースを直接エクスポート（ビルド不要）
- 各ワークスペースは独自にTypeScriptをコンパイル
- ワークスペース間の依存関係は`package.json`で`"@buddies/shared": "*"`のように宣言
- `npm install`により自動的にワークスペース間がリンクされる

## 初回セットアップ

### 前提条件

- Node.js >= 18.0.0
- npm >= 10.0.0

### セットアップ手順

```bash
# 1. 全ワークスペースの依存関係をインストール＆データベース初期化
npm run setup:first-time

# または、段階的に実行する場合：

# 1-1. 依存関係のインストール
npm install

# 1-2. データベース＆サンプルデータの準備
npm run setup

# 2. 開発サーバー起動
npm run start
```

**`setup:first-time`の実行内容:**

1. `npm install` - 全ワークスペースの依存関係をインストール
2. `db:reset` - ローカルD1データベースをリセット
3. `db:generate-placeholders` - プレースホルダー画像を生成（犬5枚、猫5枚）
4. `db:seed` - サンプルデータを投入（犬10匹、猫10匹）

### データリフレッシュ（開発中）

```bash
# 既存データをクリアして再生成
npm run dev:refresh
```

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
npm run dev:lp       # ランディングページ (port 3005)
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

# サンプルデータ投入（JSON優先、不足分はfaker.jsで自動生成）
npm run db:seed

# JSONから指定数のペットデータを投入
npm run db:seed -- --dogs=10 --cats=10

# 全削除してシード
npm run db:seed -- --clear
```

#### JSONファイルでペットデータを管理

データベースseedは**JSON優先**で動作します。`database/fixtures/pets/`にJSONファイルがあれば優先的に使用し、不足している場合のみfaker.jsでランダムデータを生成します。

##### ディレクトリ構造

```
database/fixtures/
├── pets/
│   ├── dogs/
│   │   ├── dog-01.json
│   │   ├── dog-02.json
│   │   └── ...
│   ├── cats/
│   │   ├── cat-01.json
│   │   ├── cat-02.json
│   │   └── ...
│   └── README.md
└── images/
    ├── dogs/
    │   ├── dog-01.jpg  # JSONのidと対応
    │   └── ...
    └── cats/
        ├── cat-01.jpg
        └── ...
```

##### JSONスキーマ

**必須フィールド:**

- `id`: ペットID（画像ファイル名と対応）
- `name`: ペット名
- `type`: "dog" または "cat"

**オプションフィールド:**
その他のフィールドは全てオプション。未指定の場合はfaker.jsで自動生成されます。

##### 使用例

```bash
# 1. 画像ファイルを配置
# database/fixtures/images/dogs/dog-01.jpg など

# 2. 画像ファイル名からJSONファイルを自動生成
npm run db:sync-json-from-images

# 3. 生成されたJSONファイルを編集（必要に応じて）
# database/fixtures/pets/dogs/dog-01.json など
# 最小限のフィールド（id, name, type）のみ生成されます

# 4. データベースに投入
npm run db:seed

# JSONが3匹分だけで、10匹必要な場合は残り7匹をfaker.jsで生成
npm run db:seed -- --dogs=10 --cats=10
```

##### 画像からJSONを自動生成

`database/fixtures/images/` にある画像ファイルから、対応するJSONファイルを自動生成できます。

```bash
# 不足しているJSONファイルのみ生成
npm run db:sync-json-from-images

# 既存のJSONファイルも上書き
npm run db:sync-json-from-images -- --overwrite
```

詳細は `database/fixtures/pets/README.md` を参照してください。

### デプロイ

```bash
# フロントエンド個別デプロイ
npm run deploy:dog   # 犬用サイト
npm run deploy:cat   # 猫用サイト

# LPデプロイ
npm run deploy:lp    # ランディングページ (buddies.elchika.app)

# Workers全体デプロイ
npm run deploy:workers

# 全サービス一括デプロイ
npm run deploy:all
```

### ログ監視

```bash
npm run tail:api          # API ログ
npm run tail:crawler      # クローラーログ
npm run tail:dispatcher   # ディスパッチャーログ
npm run tail:admin        # 管理画面ログ
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

### 画像処理管理

```bash
# 対話型UI（推奨）
./scripts/manage-images.sh

# 画像ステータス確認
./scripts/check-image-status.sh

# スクリーンショット取得
./scripts/trigger-screenshot.sh 50

# 画像変換
./scripts/trigger-conversion.sh all 50
```

詳細は [**docs**/MANUAL_TRIGGER_GUIDE.md](__docs__/MANUAL_TRIGGER_GUIDE.md) を参照してください。

### ランディングページ（LP）

```bash
# LP開発サーバー起動
npm run dev:lp

# 本番環境からスクリーンショット取得（Playwright）
npm run lp:screenshots

# LPビルド（静的HTMLエクスポート）
npm run build:lp

# LPデプロイ（Cloudflare Pages）
npm run deploy:lp
```

#### スクリーンショット取得

本番環境（buddies-dogs.elchika.app / buddies-cats.elchika.app）から、Playwrightでスマホサイズのスクリーンショットを自動取得します。

取得されるスクリーンショット:

- `lp/public/screenshots/dog/` - 保護犬アプリの画面 (hero, swipe, detail, favorites, location)
- `lp/public/screenshots/cat/` - 保護猫アプリの画面 (hero, swipe, detail, favorites, location)

#### SEO対策

LPは完璧なSEO対策を実装しています:

- ✅ メタデータ（title, description, OGP, Twitter Card）
- ✅ 構造化データ（JSON-LD: Organization, WebApplication, FAQPage）
- ✅ sitemap.xml, robots.txt
- ✅ セマンティックHTML、アクセシビリティ対応
- ✅ 完全な静的HTML生成（JavaScriptなしでも表示可能）

詳細は [lp/README.md](lp/README.md) を参照してください。
