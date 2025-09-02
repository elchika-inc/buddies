# PawMatch API Key Management Service

APIキーの中央管理サービス。D1データベースとKVストアを使用した高速かつ安全なキー管理を提供。

## 特徴

- 🔐 3種類のキータイプ（public, internal, admin）
- 🚀 KVキャッシュによる高速検証
- 📊 レート制限機能
- 🔄 キーローテーション機能
- 📝 詳細な権限管理
- 🕐 有効期限管理

## セットアップ

```bash
# 依存関係のインストール
cd api-keys
npm install

# D1データベースの作成
wrangler d1 create pawmatch-api-keys

# KVネームスペースの作成
wrangler kv:namespace create api_keys_cache

# wrangler.tomlのIDを更新
# database_id と kv_namespace の id を設定

# マイグレーション実行（ローカル）
npm run db:init

# マイグレーション実行（本番）
npm run db:init:remote

# マスターシークレットの設定
wrangler secret put MASTER_SECRET
```

## API エンドポイント

### 公開エンドポイント

#### POST /validate
APIキーの検証

```json
{
  "key": "your-api-key",
  "resource": "pets",    // オプション
  "action": "read"       // オプション
}
```

レスポンス:
```json
{
  "success": true,
  "valid": true,
  "key_info": {
    "name": "Frontend App",
    "type": "public",
    "permissions": ["pets:read"],
    "rate_limit": 100,
    "rate_limit_remaining": 95
  }
}
```

### 管理エンドポイント（要マスターキー）

#### POST /admin/keys
新しいAPIキーの作成

```json
{
  "name": "Frontend App",
  "type": "public",
  "permissions": ["pets:read", "images:read"],
  "rate_limit": 100,
  "expires_in_days": 90,
  "metadata": {
    "app_version": "1.0.0"
  }
}
```

#### GET /admin/keys
すべてのAPIキーの一覧取得

#### DELETE /admin/keys/:id
APIキーの無効化

#### POST /admin/keys/:id/rotate
APIキーのローテーション

## キータイプ

- **public**: フロントエンドアプリケーション用（読み取り専用）
- **internal**: サービス間通信用（読み書き可能）
- **admin**: 管理機能用（全権限）

## 権限形式

権限は `resource:action` の形式で指定:
- `pets:read` - ペット情報の読み取り
- `pets:write` - ペット情報の書き込み
- `admin:*` - 管理機能の全権限
- `*` - すべての権限

## 使用例

### メインAPIからの検証

```typescript
// api/src/middleware/api-key-validator.ts
async function validateApiKey(key: string, resource?: string, action?: string) {
  const response = await fetch('https://pawmatch-api-keys.workers.dev/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ key, resource, action })
  });
  
  const result = await response.json();
  return result.valid;
}
```

### 新しいキーの作成

```bash
curl -X POST https://pawmatch-api-keys.workers.dev/admin/keys \
  -H "X-Master-Secret: YOUR_MASTER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Frontend",
    "type": "public",
    "permissions": ["pets:read", "images:read"],
    "rate_limit": 1000,
    "expires_in_days": 90
  }'
```

## デプロイ

```bash
# 開発環境
npm run dev

# 本番環境
npm run deploy:production
```

## セキュリティ

- マスターシークレットは環境変数で管理
- APIキーは64文字のランダム文字列
- KVキャッシュは1時間で自動期限切れ
- レート制限は1分単位でリセット
- すべての通信はHTTPS必須