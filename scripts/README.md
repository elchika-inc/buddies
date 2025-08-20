# 開発環境セットアップスクリプト

このディレクトリには、PawMatchの開発環境を構築するためのスクリプトが含まれています。

## スクリプト一覧

### setup-dev.sh
新規開発者向けの環境構築スクリプトです。以下の処理を自動化します：
- 依存関係のインストール
- 環境変数ファイルの作成
- D1データベースの初期化とマイグレーション
- サンプルデータの投入
- R2画像のアップロード

実行方法：
```bash
./scripts/setup-dev.sh
```

### seed-database.js
D1データベースにサンプルデータ（猫100件、犬100件）を投入します。

実行方法：
```bash
cd api
node ../scripts/seed-database.js
```

### upload-sample-images.js
R2ストレージにサンプル画像をアップロードします。

実行方法：
```bash
cd api
node ../scripts/upload-sample-images.js
```

## データベース構造

SQLマイグレーションファイルは `/api/migrations/` にあります：
- `0001_initial_schema.sql` - 初期スキーマ定義
- `0002_add_shelter_url.sql` - shelter_urlカラムの追加