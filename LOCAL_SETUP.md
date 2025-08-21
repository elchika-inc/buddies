# PawMatch ローカル環境セットアップガイド

## セットアップ完了内容

### 1. データベース
- SQLiteデータベースを `data/pawmatch.db` に初期化済み
- 犬30件、猫30件の実データ風モックデータを生成済み
- Pet-Homeのデータ構造を模した詳細情報を含む

### 2. 画像ストレージ
- ローカルファイルシステムに画像を保存する構造を構築
- `data/images/` 配下に以下の構造で画像を保存:
  ```
  data/images/
  ├── dogs/
  │   ├── originals/  # オリジナル形式の画像
  │   └── webp/       # WebP形式の画像
  └── cats/
      ├── originals/  # オリジナル形式の画像
      └── webp/       # WebP形式の画像
  ```

### 3. Crawler機能
- Pet-Homeクローラーを更新し、画像を2種類の形式で保存:
  - オリジナル形式（JPEG/PNG）
  - WebP形式（最適化済み）
- `ImageProcessor` ユーティリティクラスを追加

### 4. API機能拡張
画像エンドポイントで形式を指定可能に:
```
GET /images/:type/:filename?format=<format>
```

形式オプション:
- `auto` (デフォルト): ブラウザのWebP対応を自動検出
- `webp`: WebP形式を強制
- `original`: オリジナル形式を強制

## クイックスタート

### 1. 初回セットアップ（完了済み）
```bash
# セットアップスクリプトを実行
./scripts/setup-local.sh

# モックデータを生成
node crawler/scripts/generate-mock-data.js
```

### 2. APIサーバーの起動
```bash
cd api
npm run dev
# または
npm run dev:local  # ローカルモードで起動
```

APIは http://localhost:8787 で起動します。

### 3. フロントエンドの起動
```bash
# DogMatchアプリ
npm run dev:dog

# CatMatchアプリ
npm run dev:cat
```

### 4. APIテスト
```bash
./scripts/test-api.sh
```

## 利用可能なAPIエンドポイント

### 基本エンドポイント
- `GET /` - ヘルスチェック
- `GET /stats` - 統計情報
- `GET /prefectures` - 都道府県一覧

### ペット情報
- `GET /pets` - 全ペット一覧
- `GET /pets/dog` - 犬一覧
- `GET /pets/cat` - 猫一覧
- `GET /pets/:type/:id` - 特定のペット詳細

### 画像配信
- `GET /images/:type/:filename` - ペット画像取得
  - クエリパラメータ:
    - `format=auto|webp|original` - 画像形式指定

## データ管理

### データベース確認
```bash
# ペット数を確認
sqlite3 data/pawmatch.db "SELECT COUNT(*) as count, type FROM pets GROUP BY type;"

# 最新のペットを確認
sqlite3 data/pawmatch.db "SELECT id, name, breed FROM pets ORDER BY created_at DESC LIMIT 5;"
```

### 画像確認
```bash
# 保存された画像を確認
ls -la data/images/dogs/originals/ | head -5
ls -la data/images/dogs/webp/ | head -5
```

### データ再生成
```bash
# データベースと画像を再生成
node crawler/scripts/generate-mock-data.js
```

## トラブルシューティング

### APIが起動しない場合
1. ポート8787が使用されていないか確認
2. `api/.dev.vars` ファイルが存在するか確認
3. データベースファイルが存在するか確認

### 画像が表示されない場合
1. 画像ファイルが `data/images/` に存在するか確認
2. APIサーバーのログでエラーを確認
3. ブラウザの開発者ツールでネットワークエラーを確認

### データベースエラーの場合
```bash
# データベースを再初期化
sqlite3 data/pawmatch.db < crawler/scripts/dev/schema-dev.sql

# モックデータを再生成
node crawler/scripts/generate-mock-data.js
```

## 開発時の注意事項

1. **画像形式**: 
   - Cloudflare Workers環境では画像変換に制限があるため、事前に両形式を保存
   - ローカルではプレースホルダー画像を使用

2. **データ同期**:
   - ローカルのSQLiteとCloudflare D1は別々のデータベース
   - 本番環境へのデプロイ時は別途データ移行が必要

3. **環境変数**:
   - `.dev.vars` ファイルは Git に含めない
   - 本番環境の設定は Wrangler で管理

## 次のステップ

1. 実際のPet-Homeからのデータ取得を実装する場合:
   - クローラーのHTML解析ロジックを改善
   - レート制限とエラーハンドリングを強化

2. 画像最適化の改善:
   - Sharp等のライブラリを使用した実際のWebP変換
   - 画像リサイズとクオリティ調整

3. キャッシュ戦略の実装:
   - CDNキャッシュの設定
   - ブラウザキャッシュの最適化