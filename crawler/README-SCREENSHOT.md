# Pet-Home スクリーンショット取得システム

Pet-Homeのペット画像をGitHub Actionsで取得し、Cloudflare R2に保存するシステムです。

## 🏗️ アーキテクチャ

```
Cloudflare Workers (定期実行)
    ↓
Pet-Homeからペット情報取得
    ↓
GitHub Actions APIをトリガー
    ↓
GitHub Actions (Playwright実行)
    ↓
スクリーンショット取得・画像変換
    ↓
Cloudflare R2に画像アップロード
```

## 📋 セットアップ手順

### 1. GitHub Secrets の設定

リポジトリの Settings → Secrets and variables → Actions で以下を追加：

```
R2_ACCOUNT_ID       # CloudflareアカウントID
R2_ACCESS_KEY_ID    # R2のAccess Key ID
R2_SECRET_ACCESS_KEY # R2のSecret Access Key
R2_BUCKET_NAME      # R2バケット名（例: pawmatch-images）
```

### 2. Cloudflare R2 の設定

1. Cloudflareダッシュボードで R2 バケットを作成
2. R2 API トークンを作成（Admin権限）
3. バケットのCORS設定を追加：

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### 3. Cloudflare Workers の環境変数

`wrangler.toml` に追加：

```toml
[vars]
GITHUB_OWNER = "your-github-username"
GITHUB_REPO = "pawmatch"
GITHUB_BRANCH = "main"

# Secrets（wrangler secret put で設定）
# GITHUB_TOKEN - GitHub Personal Access Token (repo, workflow権限)
# API_TOKEN - Workers API認証用トークン
```

### 4. GitHub Personal Access Token の作成

1. GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. 必要な権限：
   - `repo` - フルアクセス
   - `workflow` - ワークフロー更新権限

### 5. Workers のデプロイ

```bash
# D1データベースの作成（任意）
wrangler d1 create pawmatch-screenshot-logs

# Workers のデプロイ
cd crawler
wrangler publish src/workers/screenshot-coordinator.js

# Secretsの設定
wrangler secret put GITHUB_TOKEN
wrangler secret put API_TOKEN

# Cron設定（wrangler.toml）
# triggers = { crons = ["0 */6 * * *"] } # 6時間ごと
```

## 🚀 使用方法

### 自動実行（Cron）
6時間ごとに自動実行されます（設定変更可能）

### 手動実行

#### 1. GitHub Actions から直接実行
```bash
# GitHub Actions ページから手動実行
# Actions → Pet Screenshot Capture → Run workflow
```

#### 2. Workers API経由で実行
```bash
curl -X GET https://your-worker.workers.dev/trigger \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

#### 3. ローカルテスト
```bash
# 単一ペットのテスト
node crawler/scripts/github-actions-screenshot.js \
  --batch='[{"id":"pethome_523724","type":"dog","name":"チワワ","sourceUrl":"https://www.pet-home.jp/dogs/pn523724/"}]' \
  --batch-id="test-001"
```

## 📊 処理能力

- **バッチサイズ**: 10件/バッチ
- **並列実行**: 最大6バッチ
- **処理時間**: 約1分/バッチ
- **合計処理時間**: 約3-5分（60件）

## 🔍 モニタリング

### ステータス確認
```bash
curl https://your-worker.workers.dev/status \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### ログ確認
- GitHub Actions: Actions タブでワークフロー実行履歴
- Cloudflare Workers: ダッシュボードのLogs
- R2: ダッシュボードでアップロードされた画像を確認

## 📁 ファイル構成

```
.github/workflows/
  └── pet-screenshot.yml        # GitHub Actions ワークフロー

crawler/
  ├── scripts/
  │   └── github-actions-screenshot.js  # スクリーンショット取得スクリプト
  └── src/workers/
      └── screenshot-coordinator.js     # Cloudflare Worker

data/images/
  ├── dogs/
  │   ├── originals/  # JPEG画像
  │   └── webp/       # WebP画像
  └── cats/
      ├── originals/  # JPEG画像
      └── webp/       # WebP画像
```

## 🔧 トラブルシューティング

### GitHub Actions が失敗する場合
1. Secrets が正しく設定されているか確認
2. Playwright のキャッシュをクリア
3. ワークフローのログを確認

### R2 アップロードが失敗する場合
1. R2 の認証情報を確認
2. バケット名が正しいか確認
3. CORS設定を確認

### Workers からトリガーできない場合
1. GitHub Token の権限を確認
2. API レート制限を確認（5000回/時間）
3. Workers のログを確認

## 🔄 定期メンテナンス

- GitHub Actions のキャッシュは定期的にクリア
- R2 の古い画像は必要に応じて削除
- ログファイルは7日後に自動削除

## 📝 注意事項

- Pet-Home の利用規約を遵守してください
- 過度なアクセスは避けてください（6時間ごとを推奨）
- 画像の著作権はPet-Homeおよび投稿者に帰属します