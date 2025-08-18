# PawMatch Cloudflare Workers デプロイガイド

## 📋 システム構成

### アーキテクチャ概要
```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Platform                     │
├─────────────────────────────────────────────────────────────┤
│  Workers                │  Storage & Database               │
│  ┌─────────────────────┐│  ┌─────────────────────────────┐  │
│  │ Crawler Worker      ││  │ R2 Storage (Images)         │  │
│  │ - 6時間ごと自動実行  ││  │ - pawmatch-images           │  │
│  │ - ペットホームクロール││  │ - CORS設定                  │  │
│  │ - 画像・データ保存   ││  │ - セキュリティヘッダー       │  │
│  └─────────────────────┘│  └─────────────────────────────┘  │
│  ┌─────────────────────┐│  ┌─────────────────────────────┐  │
│  │ API Worker          ││  │ D1 Database (Metadata)      │  │
│  │ - ペットデータAPI    ││  │ - pawmatch-db               │  │
│  │ - 画像配信API       ││  │ - pets テーブル              │  │
│  │ - CORS・認証制御     ││  │ - crawl_logs テーブル       │  │
│  └─────────────────────┘│  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### セキュリティ機能
- **CORS設定**: 許可されたドメインからのみアクセス可能
- **リファラーチェック**: 画像直リンクを防止
- **レート制限**: Cloudflare標準のDDoS保護
- **セキュリティヘッダー**: XSS・CSRF対策

## 🚀 本番環境デプロイ手順

### 前提条件
- Cloudflareアカウント
- ドメイン（オプション）
- Node.js 18以上
- Git

### ステップ1: 環境準備

```bash
# Wrangler CLI インストール
npm install -g wrangler

# Cloudflare認証
wrangler login

# プロジェクトクローン（該当する場合）
git clone https://github.com/your-org/pawmatch.git
cd pawmatch
```

### ステップ2: 自動デプロイ実行

```bash
# プロジェクトルートで実行
./deploy.sh
```

デプロイスクリプトが自動で実行すること：
- ✅ R2バケット作成 (`pawmatch-images`)
- ✅ D1データベース作成 (`pawmatch-db`)
- ✅ データベーススキーマ適用
- ✅ 依存関係インストール
- ✅ Workers デプロイ
- ✅ 設定ファイル更新

### ステップ3: 手動設定（必要に応じて）

#### カスタムドメイン設定
```bash
# Cloudflareダッシュボードで設定
# または CLI で設定
wrangler publish --compatibility-date 2024-01-01 --route "api.pawmatch.app/*"
```

#### 環境変数の更新
```toml
# workers/crawler/wrangler.toml
[vars]
ALLOWED_ORIGIN = "https://yourdomain.com"
PET_HOME_BASE_URL = "https://www.pet-home.jp"
```

### ステップ4: 動作確認

```bash
# デプロイされたWorkerのURL確認
wrangler list

# 動作テスト
curl -X POST https://pawmatch-crawler.YOUR_SUBDOMAIN.workers.dev/crawl/cat
curl https://pawmatch-api.YOUR_SUBDOMAIN.workers.dev/pets/cat

# ログ確認
wrangler tail pawmatch-crawler
wrangler tail pawmatch-api
```

## 🛠️ 設定ファイル詳細

### Crawler Worker (workers/crawler/wrangler.toml)
```toml
name = "pawmatch-crawler"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ALLOWED_ORIGIN = "https://pawmatch.app"
PET_HOME_BASE_URL = "https://www.pet-home.jp"

[[r2_buckets]]
binding = "IMAGES_BUCKET"
bucket_name = "pawmatch-images"

[[d1_databases]]
binding = "DB"
database_name = "pawmatch-db"
database_id = "YOUR_DATABASE_ID"

[triggers]
crons = ["0 */6 * * *"]  # 6時間ごと実行
```

### API Worker (workers/api/wrangler.toml)
```toml
name = "pawmatch-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ALLOWED_ORIGIN = "https://pawmatch.app"

[[r2_buckets]]
binding = "IMAGES_BUCKET"
bucket_name = "pawmatch-images"

[[d1_databases]]
binding = "DB"
database_name = "pawmatch-db"
database_id = "YOUR_DATABASE_ID"

# カスタムドメイン設定（オプション）
[env.production]
route = { pattern = "api.pawmatch.app/*", zone_name = "pawmatch.app" }
```

## 📊 運用・監視

### ログ確認
```bash
# リアルタイムログ
wrangler tail pawmatch-crawler
wrangler tail pawmatch-api

# 特定の時間範囲のログ
wrangler tail pawmatch-crawler --since="2024-01-01T00:00:00Z"
```

### データベース管理
```bash
# テーブル一覧確認
wrangler d1 execute pawmatch-db --command "SELECT name FROM sqlite_master WHERE type='table'"

# ペット数確認
wrangler d1 execute pawmatch-db --command "SELECT type, COUNT(*) FROM pets GROUP BY type"

# 最新のクロール結果確認
wrangler d1 execute pawmatch-db --command "SELECT * FROM crawl_logs ORDER BY started_at DESC LIMIT 5"
```

### R2ストレージ管理
```bash
# バケット一覧
wrangler r2 bucket list

# バケット内のオブジェクト一覧
wrangler r2 object list pawmatch-images --limit 10

# ストレージ使用量確認（ダッシュボードで確認推奨）
```

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. デプロイエラー
```bash
# 認証エラー
wrangler login

# バインディングエラー
wrangler d1 list  # データベースIDを確認
# wrangler.toml の database_id を更新

# 権限エラー
# Cloudflareダッシュボードで適切な権限を確認
```

#### 2. クローラーが動作しない
```bash
# 手動実行でテスト
curl -X POST https://pawmatch-crawler.YOUR_SUBDOMAIN.workers.dev/crawl/cat

# ログ確認
wrangler tail pawmatch-crawler

# Cron設定確認
wrangler cron trigger pawmatch-crawler
```

#### 3. 画像が表示されない
```bash
# R2バケットの確認
wrangler r2 object list pawmatch-images

# CORS設定確認
# ブラウザのDevToolsでネットワークタブを確認

# 直接アクセステスト
curl -I https://pawmatch-api.YOUR_SUBDOMAIN.workers.dev/images/cats/cat-123.jpg
```

#### 4. APIが応答しない
```bash
# Worker状態確認
wrangler list

# ヘルスチェック
curl https://pawmatch-api.YOUR_SUBDOMAIN.workers.dev/

# データベース接続確認
curl https://pawmatch-api.YOUR_SUBDOMAIN.workers.dev/stats
```

## 💰 料金について

### 無料枠での運用
- **Workers**: 100,000リクエスト/日
- **R2**: 10GB保存、100万リクエスト/月
- **D1**: 5GB保存、500万読み取り/月
- 小規模運用なら完全無料で運用可能

### 有料プラン
- **Workers Paid**: $5/月〜
  - 1000万リクエスト/月
  - より高い同時実行数
- **R2**: $0.015/GB/月（ストレージ）
  - エグレス料金は無料
- **D1**: 使用量に応じた従量課金

### コスト最適化のヒント
1. **画像サイズの最適化**: 圧縮・リサイズでR2使用量を削減
2. **キャッシュの活用**: CDNキャッシュで API呼び出しを削減
3. **クロール頻度の調整**: 必要に応じてCron設定を変更
4. **データ保持期間**: 古いデータの定期削除

## 🔄 継続的デプロイ

### GitHub Actions 設定例
```yaml
name: Deploy to Cloudflare Workers
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Wrangler
        run: npm install -g wrangler
        
      - name: Deploy Crawler
        run: |
          cd workers/crawler
          npm install
          wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          
      - name: Deploy API
        run: |
          cd workers/api  
          npm install
          wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## 📞 サポート

### 公式リソース
- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)
- [Wrangler CLI ドキュメント](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare コミュニティ](https://community.cloudflare.com/)

### プロジェクト固有の問題
- GitHub Issues で報告
- ローカルでの再現手順を含めて報告してください