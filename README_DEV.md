# Buddies 🐕🐈

保護犬・保護猫とユーザーをマッチングするWebアプリケーション

## 概要

Buddiesは、保護動物と新しい家族をつなぐプラットフォームです。Cloudflare Workers、Next.js、TypeScriptで構築されたマイクロサービスアーキテクチャを採用し、高いパフォーマンスとスケーラビリティを実現しています。

## 特徴

- 🐕 犬用サイト・🐈 猫用サイトの個別運営
- 📱 レスポンシブデザイン対応
- ⚡ Cloudflare Workersによる高速配信
- 🔍 自動クローリングによるペット情報収集
- 📊 管理画面でのデータ管理

## 技術スタック

- **Runtime**: Cloudflare Workers (V8 isolates)
- **Frontend**: Next.js 14 + React 18 + TypeScript 5
- **Backend API**: Hono + Drizzle ORM
- **Database**: Cloudflare D1 (SQLite)
- **Styling**: Tailwind CSS
- **Build Tools**: Wrangler, Turbo

## プロジェクト構成

```
buddies/
├── frontend/          # Next.js フロントエンド (犬用・猫用)
├── api/              # REST API (Cloudflare Workers)
├── crawler/          # ペット情報収集クローラー
├── dispatcher/       # タスク分散処理サービス
├── admin/            # 管理画面 (React SPA)
├── shared/           # 共通型定義・ユーティリティ
└── packages/         # 共有パッケージ
```

## 必要要件

- Node.js 18.x以上
- npm 9.x以上
- Cloudflare アカウント
- Wrangler CLI

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/[your-org]/buddies.git
cd buddies
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

各ワークスペースに `.dev.vars` ファイルを作成:

```bash
# api/.dev.vars
DATABASE_URL=your_d1_database_url
API_KEY=your_api_key

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_PET_TYPE=dog  # or cat
```

### 4. データベースのセットアップ

```bash
# D1データベースの作成
wrangler d1 create buddies-db

# スキーマのプッシュ
npm run db:push

# サンプルデータの投入
npm run db:seed
```

## 開発

### ローカル開発サーバーの起動

```bash
# フロントエンド + API の同時起動
npm run dev

# 全サービスの同時起動
npm run dev:all
```

### 個別サービスの起動

```bash
npm run dev:app        # フロントエンド (http://localhost:3004)
npm run dev:api        # API (http://localhost:8787)
npm run dev:admin      # 管理画面 (http://localhost:8788)
npm run dev:crawler    # クローラー
npm run dev:dispatcher # ディスパッチャー
```

### ビルド

```bash
# 全ワークスペースのビルド
npm run build

# 個別ビルド
npm run build --workspace=frontend
npm run build --workspace=api
```

### テスト

```bash
# 全テストの実行
npm run test

# 監視モードでのテスト
npm run test:watch

# カバレッジ付きテスト
npm run test:coverage
```

### コード品質

```bash
# リント
npm run lint
npm run lint:fix

# 型チェック
npm run type-check

# フォーマット
npm run format
```

## データベース管理

```bash
# Drizzle Studio の起動（データベース GUI）
npm run db:studio

# マイグレーションの生成
npm run db:generate

# マイグレーションの適用
npm run db:push

# データベースのリセット
npm run db:reset
```

## デプロイ

### 個別デプロイ

```bash
# フロントエンド
npm run deploy:dog  # 犬用サイト
npm run deploy:cat  # 猫用サイト

# Workers
npm run deploy:api
npm run deploy:crawler
npm run deploy:dispatcher
npm run deploy:admin
```

### 一括デプロイ

```bash
# 全サービスのデプロイ
npm run deploy:all

# Workers のみデプロイ
npm run deploy:workers
```

## ログ監視

```bash
npm run tail              # API のログ
npm run tail:crawler      # クローラーのログ
npm run tail:dispatcher   # ディスパッチャーのログ
```

## トラブルシューティング

### ポート競合エラー

```bash
# 使用中のポートを確認
lsof -i :3004
lsof -i :8787

# プロセスを終了
kill -9 [PID]
```

### Wrangler キャッシュクリア

```bash
# Wrangler の一時ファイル削除
npm run clean:wrangler

# 全ビルドアーティファクトの削除
npm run clean:all
```

### データベース接続エラー

```bash
# D1 データベースの確認
wrangler d1 list

# バインディングの確認
wrangler d1 execute buddies-db --command "SELECT name FROM sqlite_master WHERE type='table';"
```

## プロジェクト構造

### ワークスペース詳細

#### `frontend/`

Next.js ベースのフロントエンドアプリケーション。犬用と猫用で異なるビルドを生成。

#### `api/`

Hono フレームワークを使用した RESTful API。認証、ペット情報管理、マッチングロジックを提供。

#### `crawler/`

外部サイトからペット情報を収集する定期実行ワーカー。

#### `dispatcher/`

非同期タスクの分散処理とスケジューリングを管理。

#### `admin/`

React SPA の管理画面。データベース管理とシステム監視機能を提供。

#### `shared/`

全ワークスペースで共有される型定義とユーティリティ関数。

## API エンドポイント

主要なエンドポイント:

- `GET /api/pets` - ペット一覧取得
- `GET /api/pets/:id` - ペット詳細取得
- `POST /api/pets` - ペット登録
- `PUT /api/pets/:id` - ペット情報更新
- `DELETE /api/pets/:id` - ペット削除
- `POST /api/auth/login` - ログイン
- `POST /api/auth/logout` - ログアウト
- `GET /api/matches` - マッチング候補取得

## 環境変数

### Frontend

- `NEXT_PUBLIC_API_URL` - API エンドポイント URL
- `NEXT_PUBLIC_PET_TYPE` - ペットタイプ (dog/cat)
- `NEXT_PUBLIC_SITE_URL` - サイト URL

### API/Workers

- `DATABASE_URL` - D1 データベース接続文字列
- `JWT_SECRET` - JWT トークン署名キー
- `API_KEY` - API アクセスキー
- `CRAWLER_SCHEDULE` - クローラー実行スケジュール

## コントリビューション

1. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
2. 変更をコミット (`git commit -m 'Add amazing feature'`)
3. ブランチにプッシュ (`git push origin feature/amazing-feature`)
4. プルリクエストを作成

## ライセンス

[MIT License](LICENSE)

## サポート

問題が発生した場合は、[Issues](https://github.com/[your-org]/buddies/issues) で報告してください。

## 開発チーム

- プロジェクトリード: [@username](https://github.com/username)
- 開発者: Buddies Development Team

---

Built with ❤️ for animal welfare
