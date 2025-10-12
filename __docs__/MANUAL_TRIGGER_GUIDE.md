# 手動トリガー実行ガイド

このドキュメントでは、画像処理パイプライン（スクリーンショット取得・画像変換）を手動で実行する方法を説明します。

## 目次

- [概要](#概要)
- [前提条件](#前提条件)
- [クイックスタート（スクリプト使用）](#クイックスタートスクリプト使用)
- [1. APIから実行（推奨）](#1-apiから実行推奨)
- [2. GitHub Actionsから実行](#2-github-actionsから実行)
- [3. トラブルシューティング](#3-トラブルシューティング)

---

## 概要

画像処理パイプラインは以下の2つのステージで構成されています:

1. **スクリーンショット取得** - ペットの画像をWebサイトからキャプチャ
2. **画像変換** - PNG/JPEGをWebPに変換して最適化

通常はCronで自動実行されますが、以下の場合は手動実行が必要です:

- 画像がないペットが大量に存在する場合
- 緊急で画像を取得・変換したい場合
- テスト・デバッグ目的

---

## 前提条件

### 必要な認証情報

#### API実行の場合

- **API Key**: `admin_sk_super_secure_admin_key_2024`
- **Admin Secret**: `admin_sk_super_secure_admin_key_2024`

#### GitHub Actions実行の場合

GitHub Secretsに以下が設定されている必要があります:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `BUDDIES_API_KEY`
- `API_URL`

### R2 APIキーの確認方法

ローカルからR2アクセスをテストする場合:

```bash
# 環境変数を設定
export R2_ACCOUNT_ID="4c6f1bd50e566f5ba6c78865b89fb158"
export R2_ACCESS_KEY_ID="cd66dbf8cdd3cbf8b2ac50503aabc52a"
export R2_SECRET_ACCESS_KEY="cce2bb59896ba1f5306ef38af97db00de99b00c2c5e312e0dda69e26bd299244"
export R2_BUCKET_NAME="buddies-images"

# アクセステスト
node -e "
import('@aws-sdk/client-s3').then(async ({ S3Client, ListObjectsV2Command }) => {
  const client = new S3Client({
    region: 'auto',
    endpoint: 'https://4c6f1bd50e566f5ba6c78865b89fb158.r2.cloudflarestorage.com',
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
  });

  try {
    const result = await client.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      MaxKeys: 5
    }));
    console.log('✅ R2アクセス成功!');
    console.log('オブジェクト数:', result.KeyCount);
  } catch (err) {
    console.error('❌ エラー:', err.message);
  }
});
"
```

---

## クイックスタート（スクリプト使用）

最も簡単な方法は、用意されたスクリプトを使用することです。

### 対話型UI（推奨）

統合スクリプトを実行すると、対話型メニューが表示されます:

```bash
# npmコマンド（推奨）
npm run images

# または直接実行
./scripts/manage-images.sh
```

メニューから以下の操作を選択できます:

1. 画像ステータスを確認
2. スクリーンショットを取得
3. 画像を変換（WebP）
4. GitHub Actions の状況を確認
5. 一括処理（スクリーンショット → 変換）
6. ヘルプ・ドキュメント

### 個別スクリプト

#### 画像ステータスを確認

```bash
# npmコマンド（推奨）
npm run images:status

# または直接実行
./scripts/check-image-status.sh
```

現在のペット画像の統計情報を表示し、推奨アクションを提示します。

**出力例:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  全体統計
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                            犬        猫     合計
────────────────────────────────────────────
ペット総数                  3        97       100

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  スクリーンショット
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
取得済み                    3        77        80
未取得                      0        20        20
完了率                                        80%
```

#### スクリーンショットを取得

```bash
# npmコマンド（推奨）
npm run images:screenshot         # デフォルト（50件）
npm run images:screenshot 30      # 件数を指定

# または直接実行
./scripts/trigger-screenshot.sh 30
```

#### 画像を変換

```bash
# npmコマンド（推奨）
npm run images:convert all 50              # 全ての画像を変換
npm run images:convert missing-webp 30     # WebPがない画像のみ
npm run images:convert missing-jpeg 20     # JPEGがない画像のみ

# または直接実行
./scripts/trigger-conversion.sh all 50
```

---

## 1. APIから実行（推奨）

APIから実行する方法が最も簡単で推奨されます。

### 1.1 スクリーンショット取得をトリガー

画像がないペットのスクリーンショットを取得します。

```bash
curl -X POST "https://buddies-api.elchika.app/api/admin/trigger-screenshot" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: admin_sk_super_secure_admin_key_2024" \
  -H "X-Admin-Secret: admin_sk_super_secure_admin_key_2024" \
  -d '{"limit": 50}' | jq
```

**パラメータ:**

- `limit`: 処理するペット数（デフォルト: 30、最大: 100推奨）

**レスポンス例:**

```json
{
  "success": true,
  "message": "Screenshot processing triggered for 50 pets",
  "data": {
    "batchId": "dispatch-2025-10-10-5866876",
    "strategy": "mixed",
    "petCount": 50
  }
}
```

### 1.2 画像変換をトリガー

既にスクリーンショットがあるペットの画像をWebPに変換します。

```bash
curl -X POST "https://buddies-api.elchika.app/api/conversion/screenshot" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: admin_sk_super_secure_admin_key_2024" \
  -d '{
    "pets": [
      {"id": "pn527087", "type": "cat"},
      {"id": "pn527085", "type": "cat"}
    ]
  }' | jq
```

**レスポンス例:**

```json
{
  "success": true,
  "batchId": "convert-123456",
  "count": 2,
  "message": "Image conversion triggered successfully"
}
```

### 1.3 処理状況の確認

GitHub Actionsでワークフローの実行状況を確認:

```bash
# 最新のスクリーンショットワークフロー
gh run list --workflow=screenshot-capture.yml --limit 5

# 最新の画像変換ワークフロー
gh run list --workflow=image-conversion.yml --limit 5

# リアルタイムでログを監視（RUN_IDは上記コマンドで取得）
gh run watch <RUN_ID>
```

---

## 2. GitHub Actionsから実行

GitHub Actionsのワークフローを直接トリガーする方法です。

### 2.1 スクリーンショット取得ワークフロー

```bash
# バッチデータを指定して実行
gh workflow run screenshot-capture.yml \
  -f batch_data='{"pets":[{"id":"pn527087","type":"cat"},{"id":"pn527085","type":"cat"}],"limit":20}' \
  -f batch_id="manual-$(date +%s)" \
  -f limit=20
```

**入力パラメータ:**

- `batch_data`: ペット情報のJSON配列
- `batch_id`: バッチID（任意、自動生成可）
- `limit`: 処理件数

### 2.2 画像変換ワークフロー

```bash
# 全ての未変換画像を変換
gh workflow run image-conversion.yml \
  -f conversion_mode=all \
  -f limit=50 \
  -f source=manual

# WebP画像のみ変換
gh workflow run image-conversion.yml \
  -f conversion_mode=missing-webp \
  -f limit=50 \
  -f source=manual

# JPEG画像のみ変換
gh workflow run image-conversion.yml \
  -f conversion_mode=missing-jpeg \
  -f limit=50 \
  -f source=manual
```

**変換モード:**

- `all`: 全ての画像を変換（デフォルト）
- `missing-webp`: WebPがない画像のみ
- `missing-jpeg`: JPEGがない画像のみ

---

## 3. トラブルシューティング

### 3.1 APIキーエラー

**エラー:**

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```

**原因:**

- APIキーが間違っている
- APIキーがデータベースに登録されていない

**確認方法:**

```bash
# データベースに登録されているAPIキーを確認
npx --prefix api wrangler d1 execute buddies-db --remote \
  --command "SELECT key, name, isActive FROM api_keys LIMIT 5"
```

### 3.2 R2アクセスエラー

**エラー:**

```
AccessDenied: Access Denied
```

**原因:**

- R2 APIトークンの権限が不足している
- GitHub Secretsが正しく設定されていない

**対処方法:**

1. Cloudflareダッシュボードで新しいR2 APIトークンを作成:
   - R2 → Manage R2 API Tokens
   - Permissions: "Object Read & Write"
   - Apply to specific buckets: "buddies-images"

2. GitHub Secretsを更新:

   ```bash
   gh secret set R2_ACCESS_KEY_ID
   gh secret set R2_SECRET_ACCESS_KEY
   ```

3. シークレット一覧を確認:
   ```bash
   gh secret list | grep R2
   ```

### 3.3 ワークフローが開始されない

**原因:**

- Dispatcherサービスが正しく設定されていない
- GitHub Actionsのワークフロー定義が間違っている

**確認方法:**

1. Dispatcherのログを確認:

   ```bash
   npx wrangler tail buddies-dispatcher --format pretty
   ```

2. 最近のワークフロー実行を確認:

   ```bash
   gh run list --limit 10
   ```

3. ワークフローファイルの入力パラメータを確認:
   ```bash
   cat .github/workflows/screenshot-capture.yml | grep -A 20 "inputs:"
   ```

### 3.4 画像がないペットを確認

スクリーンショットが完了していないペットを確認:

```bash
curl -s "https://buddies-api.elchika.app/api/pets?limit=100" \
  -H "X-API-Key: admin_sk_super_secure_admin_key_2024" | \
  jq '[.data.dogs[], .data.cats[]] | map(select(.screenshotCompletedAt == null)) | length'
```

特定のペットIDを取得:

```bash
curl -s "https://buddies-api.elchika.app/api/pets?limit=100" \
  -H "X-API-Key: admin_sk_super_secure_admin_key_2024" | \
  jq -c '[.data.dogs[], .data.cats[]] | map(select(.screenshotCompletedAt == null)) | map({id, type})'
```

---

## よくある操作

### 画像がない全てのペットを一括処理

```bash
# ステップ1: 画像がないペットの数を確認
PETS_WITHOUT_IMAGE=$(curl -s "https://buddies-api.elchika.app/api/pets?limit=200" \
  -H "X-API-Key: admin_sk_super_secure_admin_key_2024" | \
  jq '[.data.dogs[], .data.cats[]] | map(select(.screenshotCompletedAt == null)) | length')

echo "画像がないペット数: $PETS_WITHOUT_IMAGE"

# ステップ2: スクリーンショットをトリガー（50件ずつ推奨）
curl -X POST "https://buddies-api.elchika.app/api/admin/trigger-screenshot" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: admin_sk_super_secure_admin_key_2024" \
  -H "X-Admin-Secret: admin_sk_super_secure_admin_key_2024" \
  -d '{"limit": 50}' | jq

# ステップ3: 進行状況を監視
gh run list --workflow=screenshot-capture.yml --limit 1
```

### 定期的な監視とメンテナンス

```bash
# 1. 画像のない犬を確認
curl -s "https://buddies-api.elchika.app/api/pets?type=dog&limit=100" \
  -H "X-API-Key: admin_sk_super_secure_admin_key_2024" | \
  jq '[.data.dogs[]] | map(select(.screenshotCompletedAt == null)) | length'

# 2. 画像のない猫を確認
curl -s "https://buddies-api.elchika.app/api/pets?type=cat&limit=100" \
  -H "X-API-Key: admin_sk_super_secure_admin_key_2024" | \
  jq '[.data.cats[]] | map(select(.screenshotCompletedAt == null)) | length'

# 3. 最近のワークフロー実行履歴
gh run list --limit 10 --json status,conclusion,workflowName,createdAt \
  --jq '.[] | "\(.createdAt | fromdateiso8601 | strftime("%Y-%m-%d %H:%M")) - \(.workflowName): \(.conclusion)"'
```

---

## 参考リンク

- [API エンドポイント一覧](__docs__/API_ENDPOINTS.md)
- [デプロイ手順](__docs__/DEPLOY_INSTRUCTIONS.md)
- [GitHub Actions ワークフロー](../.github/workflows/)
- [Cloudflare R2 ドキュメント](https://developers.cloudflare.com/r2/)

---

## 更新履歴

- 2025-10-10: 初版作成
