# PawMatch API

PawMatchアプリケーション用のAPIサーバー。Cloudflare Workers上で動作します。

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. ローカルデータベースの初期化

```bash
npm run db:init
npm run db:migrate
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

APIサーバーは http://localhost:8787 で起動します。

## エンドポイント

### サンプルデータエンドポイント（開発用）

- `GET /api/sample/cats` - 猫のサンプルデータ一覧
  - クエリパラメータ:
    - `limit`: 取得件数（デフォルト: 20、最大: 100）
    - `offset`: オフセット（デフォルト: 0）
    - `prefecture`: 都道府県でフィルタリング

- `GET /api/sample/cats/:id` - 特定の猫のサンプルデータ

- `GET /api/sample/prefectures` - 都道府県一覧

- `GET /api/sample/stats` - 統計情報

### 本番用エンドポイント（D1データベース使用）

- `GET /pets/:type` - ペット一覧（type: dog or cat）
- `GET /pets/:type/:id` - 特定のペット情報
- `GET /prefectures` - 都道府県一覧
- `GET /stats` - 統計情報

## 開発

### モノレポでの同時起動

プロジェクトルートから:

```bash
# APIとフロントエンドを同時起動
npm run dev:all
```

または個別に:

```bash
# APIサーバー
npm run api:dev

# フロントエンド（別ターミナル）
npm run dev:cat
```

## デプロイ

```bash
npm run deploy
```

## 環境変数

### 開発環境（.dev.vars）

```
ALLOWED_ORIGIN=http://localhost:3004
```

### 本番環境

Cloudflare Dashboardで設定:
- `ALLOWED_ORIGIN`: 本番フロントエンドURL
- D1データベース接続
- R2バケット接続（画像配信用）