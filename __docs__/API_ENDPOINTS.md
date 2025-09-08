# PawMatch API エンドポイント仕様書

## 基本情報

- **ベースURL**:
  - 本番環境: `https://pawmatch-api.elchika.app`
  - 開発環境: `http://localhost:9789`
- **認証**: APIキー認証（有効化済み）
- **レスポンス形式**: JSON
- **実装ファイル**: `/api/src/index.ts` （メインルーティング）

## 共通レスポンス形式

### 成功時

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-09-04T12:00:00Z"
}
```

### エラー時

```json
{
  "success": false,
  "error": {
    "message": "エラーメッセージ",
    "code": "ERROR_CODE",
    "details": { ... }
  },
  "timestamp": "2024-09-04T12:00:00Z"
}
```

---

## 📋 エンドポイント一覧

### 認証要件の概要

| 認証レベル   | 説明                 | 必要なヘッダー                             |
| ------------ | -------------------- | ------------------------------------------ |
| **不要**     | パブリックアクセス   | なし                                       |
| **APIキー**  | 通常のAPIアクセス    | `X-API-Key` または `Authorization: Bearer` |
| **管理者**   | 管理機能へのアクセス | `Authorization: Bearer` （管理者キー）     |
| **マスター** | システム管理         | `X-Master-Secret`                          |

## 1. ヘルスチェック

### GET `/`

ルートパスでのヘルスチェック

- **認証**: 不要（パブリック）
- **実装**: `/api/src/index.ts` (HealthController使用)

**レスポンス**

```json
{
  "success": true,
  "status": "healthy",
  "services": {
    "database": "connected",
    "storage": "connected"
  },
  "timestamp": "2024-09-04T12:00:00Z"
}
```

### GET `/health`

詳細なヘルスチェック

- **認証**: 不要（パブリック）
- **実装**: `/api/src/routes/health.ts`

**レスポンス**

```json
{
  "success": true,
  "status": "healthy",
  "services": {
    "database": "connected",
    "storage": "connected"
  },
  "timestamp": "2024-09-04T12:00:00Z"
}
```

### GET `/health/ready`

レディネスチェック（準備状態の確認）

- **認証**: 不要（パブリック）
- **実装**: `/api/src/routes/health.ts`

**レスポンス**

```json
{
  "success": true,
  "ready": true,
  "checks": {
    "database": true,
    "storage": true,
    "dataAvailable": true
  },
  "timestamp": "2024-09-04T12:00:00Z"
}
```

---

## 2. ペットAPI

### GET `/api/pets`

全ペット一覧取得

- **認証**: APIキー必須
- **実装**: `/api/src/routes/pets.ts` (PetController使用)

**クエリパラメータ**

- `limit`: 取得件数（デフォルト: 20、最大: 100）
- `offset`: オフセット（ページネーション用）
- `prefecture`: 都道府県フィルタ
- `hasImage`: 画像ありフィルタ（true/false）

**レスポンス**

```json
{
  "success": true,
  "data": {
    "pets": [
      {
        "id": "dog-12345",
        "type": "dog",
        "name": "ポチ",
        "breed": "柴犬",
        "age": "3歳",
        "gender": "male",
        "prefecture": "東京都",
        "city": "渋谷区",
        "description": "とても人懐っこい子です",
        "imageUrl": "/api/images/dog-12345.jpg",
        "hasJpeg": true,
        "hasWebp": true
      }
    ],
    "total": 150,
    "hasMore": true
  },
  "timestamp": "2024-09-04T12:00:00Z"
}
```

### GET `/api/pets/:type`

タイプ別ペット一覧取得

- **認証**: APIキー必須
- **実装**: `/api/src/routes/pets.ts` (PetController使用)

**パラメータ**

- `type`: `dog` または `cat`

**クエリパラメータ**

- 上記と同じ

### GET `/api/pets/:type/random`

ランダムペット取得

- **認証**: APIキー必須
- **実装**: `/api/src/routes/pets.ts` (PetController使用)

**パラメータ**

- `type`: `dog` または `cat`

**クエリパラメータ**

- `count`: 取得件数（デフォルト: 10、最大: 50）
- `exclude`: 除外するID（カンマ区切り）
- `prefecture`: 都道府県フィルタ

**レスポンス**

```json
{
  "success": true,
  "data": {
    "pets": [...],
    "count": 10
  },
  "timestamp": "2024-09-04T12:00:00Z"
}
```

### GET `/api/pets/:type/:id`

特定ペット詳細取得

- **認証**: APIキー必須
- **実装**: `/api/src/routes/pets.ts` (PetController使用)

**パラメータ**

- `type`: `dog` または `cat`
- `id`: ペットID

**レスポンス**

```json
{
  "success": true,
  "data": {
    "id": "dog-12345",
    "type": "dog",
    "name": "ポチ",
    "breed": "柴犬",
    "age": "3歳",
    "gender": "male",
    "prefecture": "東京都",
    "city": "渋谷区",
    "description": "とても人懐っこい子です",
    "personality": ["人懐っこい", "活発"],
    "careRequirements": ["毎日の散歩必須", "定期的なトリミング"],
    "goodWith": ["children", "dogs"],
    "healthNotes": ["予防接種済み", "去勢済み"],
    "shelterName": "〇〇保護施設",
    "shelterContact": "03-1234-5678",
    "sourceUrl": "https://example.com/pets/12345",
    "imageUrl": "/api/images/dog-12345.jpg",
    "hasJpeg": true,
    "hasWebp": true,
    "createdAt": "2024-08-01T10:00:00Z",
    "updatedAt": "2024-09-01T15:00:00Z"
  },
  "timestamp": "2024-09-04T12:00:00Z"
}
```

---

## 3. 画像API

### GET `/api/images/:filename`

画像取得（ファイル名のみ）

- **認証**: APIキー必須
- **実装**: `/api/src/routes/images.ts` (ImageController使用)
- **キャッシュ**: Cloudflare Cacheで自動キャッシュ

**パラメータ**

- `filename`: 画像ファイル名（例: `dog-12345.jpg`）

**レスポンス**

- 画像バイナリデータ
- Content-Type: `image/jpeg` または `image/webp`
- キャッシュヘッダー付き

### GET `/api/images/:type/:filename`

画像取得（タイプ指定）

- **認証**: APIキー必須
- **実装**: `/api/src/routes/images.ts` (ImageController使用)
- **キャッシュ**: Cloudflare Cacheで自動キャッシュ

**パラメータ**

- `type`: `dogs` または `cats`
- `filename`: 画像ファイル名

---

## 4. 統計API

### GET `/api/stats`

統計情報取得

- **認証**: APIキー必須
- **実装**: `/api/src/routes/stats.ts` (HealthController使用)

**レスポンス**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalPets": 300,
      "dogs": 150,
      "cats": 150,
      "withImages": 280,
      "lastUpdated": "2024-09-04T10:00:00Z"
    },
    "byPrefecture": {
      "東京都": 50,
      "大阪府": 40,
      "神奈川県": 30
    },
    "byAge": {
      "子犬・子猫": 50,
      "成犬・成猫": 200,
      "シニア": 50
    },
    "recentAdditions": 10,
    "imageStats": {
      "total": 280,
      "jpeg": 280,
      "webp": 250
    }
  },
  "timestamp": "2024-09-04T12:00:00Z"
}
```

---

## 5. 管理API（認証必須）

### POST `/api/admin/pets/update-flags`

ペットフラグ一括更新

**ヘッダー**

- `Authorization`: Bearer token または API管理キー

**リクエスト**

```json
{
  "petIds": ["dog-12345", "cat-67890"],
  "flags": {
    "hasJpeg": true,
    "hasWebp": true,
    "imageCheckedAt": "2024-09-04T12:00:00Z"
  }
}
```

**レスポンス**

```json
{
  "success": true,
  "message": "フラグを更新しました",
  "updatedCount": 2
}
```

### POST `/api/admin/update-images`

画像処理結果の反映（レガシー、互換性のため残す）

**ヘッダー**

- `Authorization`: Bearer token または API管理キー

**リクエスト**

```json
{
  "results": [
    {
      "petId": "dog-12345",
      "hasJpeg": true,
      "hasWebp": true,
      "processedAt": "2024-09-04T12:00:00Z"
    }
  ]
}
```

**レスポンス**

```json
{
  "success": true,
  "message": "画像情報を更新しました",
  "updatedCount": 1,
  "errors": []
}
```

### POST `/api/admin/upload-screenshot`

画像のスクリーンショットアップロード（GitHub Actions用）

**ヘッダー**

- `Authorization`: Bearer token または API管理キー

**リクエスト**

```json
{
  "petId": "dog-12345",
  "petType": "dog",
  "imageData": "base64-encoded-image-data",
  "captureMethod": "puppeteer",
  "sourceUrl": "https://example.com/pets/12345"
}
```

**レスポンス**

```json
{
  "success": true,
  "petId": "dog-12345",
  "urls": {
    "screenshot": "/pets/dogs/dog-12345/screenshot.png"
  },
  "message": "スクリーンショットをアップロードしました"
}
```

### POST `/api/admin/convert-image`

画像変換とアップロード（GitHub Actions用）

**ヘッダー**

- `Authorization`: Bearer token または API管理キー

**リクエスト**

```json
{
  "petId": "dog-12345",
  "petType": "dog",
  "sourceFormat": "png",
  "targetFormats": ["jpeg", "webp"],
  "sourceKey": "pets/dogs/dog-12345/screenshot.png",
  "imageData": "base64-encoded-image-data"
}
```

**レスポンス**

```json
{
  "success": true,
  "petId": "dog-12345",
  "urls": {
    "jpeg": "/pets/dogs/dog-12345/image.jpg",
    "webp": "/pets/dogs/dog-12345/image.webp"
  },
  "message": "画像を変換してアップロードしました"
}
```

### POST `/api/admin/batch-upload`

複数画像の一括アップロード（GitHub Actions用）

**ヘッダー**

- `Authorization`: Bearer token または API管理キー

**リクエスト**

```json
{
  "results": [
    {
      "petId": "dog-12345",
      "petType": "dog",
      "screenshot": {
        "data": "base64-encoded-png-data",
        "captureMethod": "puppeteer"
      },
      "jpeg": {
        "data": "base64-encoded-jpeg-data"
      },
      "webp": {
        "data": "base64-encoded-webp-data"
      }
    }
  ],
  "batchId": "batch-20240904-001"
}
```

**レスポンス**

```json
{
  "success": true,
  "batchId": "batch-20240904-001",
  "processed": 1,
  "successful": 1,
  "failed": 0,
  "results": [
    {
      "petId": "dog-12345",
      "success": true
    }
  ]
}
```

---

## 6. APIキー管理

### POST `/api/keys/validate`

APIキーの検証

**リクエスト**

```json
{
  "key": "your-api-key-here",
  "resource": "pets",
  "action": "read"
}
```

**レスポンス（成功時）**

```json
{
  "success": true,
  "valid": true,
  "key_info": {
    "name": "Frontend API Key",
    "type": "public",
    "permissions": ["pets:read", "images:read"],
    "rate_limit": 1000,
    "rate_limit_remaining": 950,
    "expires_at": "2025-09-04T12:00:00Z"
  }
}
```

**レスポンス（失敗時）**

```json
{
  "success": false,
  "valid": false,
  "error": "APIキーが無効です",
  "details": "期限切れまたは無効なキー"
}
```

### POST `/api/keys/admin/keys`

APIキーの作成（マスターキー必須）

**ヘッダー**

- `X-Master-Secret`: マスターシークレット

**リクエスト**

```json
{
  "name": "新しいAPIキー",
  "type": "public",
  "permissions": ["pets:read", "images:read"],
  "rate_limit": 1000,
  "expires_in_days": 365,
  "metadata": {
    "description": "フロントエンド用"
  }
}
```

**レスポンス**

```json
{
  "success": true,
  "api_key": {
    "id": "key-uuid-here",
    "key": "generated-api-key-string",
    "name": "新しいAPIキー",
    "type": "public",
    "permissions": ["pets:read", "images:read"],
    "rate_limit": 1000,
    "expires_at": "2025-09-04T12:00:00Z",
    "created_at": "2024-09-04T12:00:00Z"
  }
}
```

### GET `/api/keys/admin/keys`

APIキー一覧取得（マスターキー必須）

**ヘッダー**

- `X-Master-Secret`: マスターシークレット

**レスポンス**

```json
{
  "success": true,
  "keys": [
    {
      "id": "key-uuid-here",
      "name": "Frontend API Key",
      "type": "public",
      "permissions": ["pets:read", "images:read"],
      "rate_limit": 1000,
      "expires_at": "2025-09-04T12:00:00Z",
      "created_at": "2024-09-04T12:00:00Z",
      "last_used_at": "2024-09-04T11:00:00Z",
      "is_active": true
    }
  ],
  "total": 5
}
```

### DELETE `/api/keys/admin/keys/:id`

APIキーの無効化（マスターキー必須）

**ヘッダー**

- `X-Master-Secret`: マスターシークレット

**パラメータ**

- `id`: APIキーID

**レスポンス**

```json
{
  "success": true,
  "message": "APIキーを無効化しました",
  "key_id": "key-uuid-here"
}
```

### POST `/api/keys/admin/keys/:id/rotate`

APIキーのローテーション（マスターキー必須）

**ヘッダー**

- `X-Master-Secret`: マスターシークレット

**パラメータ**

- `id`: APIキーID

**レスポンス**

```json
{
  "success": true,
  "new_key": "new-generated-api-key-string",
  "message": "APIキーをローテーションしました",
  "key_id": "key-uuid-here"
}
```

### GET `/api/keys/admin/rate-limits`

レート制限状態確認（マスターキー必須）

**ヘッダー**

- `X-Master-Secret`: マスターシークレット

**レスポンス**

```json
{
  "success": true,
  "rate_limits": [
    {
      "name": "Frontend API Key",
      "type": "public",
      "limit": 1000,
      "current_usage": 50,
      "remaining": 950
    }
  ],
  "window_seconds": 60
}
```

---

## 7. 内部API（クローラー用）

### POST `/crawler/pets/bulk`

ペットデータ一括登録

**リクエスト**

```json
{
  "pets": [
    {
      "id": "dog-12345",
      "type": "dog",
      "name": "ポチ",
      "breed": "柴犬",
      "age": "3歳",
      "gender": "male",
      "prefecture": "東京都",
      "city": "渋谷区",
      "description": "とても人懐っこい子です",
      "personality": ["人懐っこい", "活発"],
      "care_requirements": ["毎日の散歩必須"],
      "good_with": "children,dogs",
      "health_notes": "予防接種済み",
      "source_url": "https://example.com/pets/12345",
      "images": ["https://example.com/images/12345.jpg"]
    }
  ]
}
```

**レスポンス**

```json
{
  "success": 1,
  "failed": 0,
  "errors": []
}
```

### POST `/crawler/state`

クローラー状態の保存・更新

**リクエスト**

```json
{
  "source_id": "pet-home",
  "pet_type": "dog",
  "checkpoint": {
    "lastPage": 10,
    "lastPetId": "dog-12345"
  },
  "total_processed": 150
}
```

**レスポンス**

```json
{
  "success": true
}
```

### GET `/crawler/state/:source/:type?`

クローラー状態の取得

**パラメータ**

- `source`: データソースID（例: `pet-home`）
- `type`: ペットタイプ（オプション、`dog` または `cat`）

**レスポンス**

```json
{
  "source_id": "pet-home",
  "pet_type": "dog",
  "checkpoint": {
    "lastPage": 10,
    "lastPetId": "dog-12345"
  },
  "total_processed": 150,
  "updated_at": "2024-09-04T12:00:00Z"
}
```

---

## エラーコード一覧

| コード                     | 説明                         |
| -------------------------- | ---------------------------- |
| `ROUTE_NOT_FOUND`          | エンドポイントが見つからない |
| `INTERNAL_ERROR`           | サーバー内部エラー           |
| `VALIDATION_ERROR`         | リクエストパラメータが無効   |
| `UNAUTHORIZED`             | 認証エラー                   |
| `FORBIDDEN`                | 権限不足                     |
| `RATE_LIMIT_EXCEEDED`      | レート制限超過               |
| `INVALID_KEY`              | APIキーが無効                |
| `EXPIRED_KEY`              | APIキーが期限切れ            |
| `INSUFFICIENT_PERMISSIONS` | 必要な権限がない             |
| `DATABASE_ERROR`           | データベースエラー           |
| `STORAGE_ERROR`            | ストレージエラー             |

---

## 認証について

現在、APIキー認証は**有効化されています**。以下の認証方式をサポート：

1. **APIキー認証**
   - ヘッダー: `X-API-Key: your-api-key` または `Authorization: Bearer your-api-key`
   - 権限ベースのアクセス制御
   - レート制限付き
   - 外部APIキー検証サービス経由で検証（`pawmatch-api-keys.naoto24kawa.workers.dev`）
   - フォールバック: 環境変数キー（`API_KEY`, `PUBLIC_API_KEY`, `API_SECRET_KEY`）

2. **マスターキー認証**
   - ヘッダー: `X-Master-Secret: master-secret`
   - 管理機能へのフルアクセス
   - APIキー管理エンドポイントで必須

3. **認証不要（パブリック）エンドポイント**
   - `/` - ルートヘルスチェック
   - `/health` - ヘルスチェック
   - `/health/ready` - レディネスチェック
   - `/api/keys/validate` - APIキー検証（キー自体の検証用）

---

## レート制限

各APIキーには以下のレート制限が適用されます：

- **Public キー**: 1000リクエスト/分
- **Internal キー**: 5000リクエスト/分
- **Admin キー**: 100リクエスト/分

制限を超えた場合、`429 Too Many Requests`が返されます。

---

## CORS設定

以下のオリジンからのリクエストを許可：

- 本番環境: `https://pawmatch-dogs.elchika.app`, `https://pawmatch-cats.elchika.app`
- 開発環境: `http://localhost:3004`

---

## 変更履歴

- **2025-09-04**: 実装との整合性を確認し、新規エンドポイントを追加
  - GitHub Actions用画像管理エンドポイント追加（upload-screenshot, convert-image, batch-upload）
  - クローラー状態管理エンドポイント追加（state保存・取得）
  - APIキー認証の有効化状態を反映
- **2024-09-04**: APIキー管理機能を追加
- **2024-09-01**: 初版作成
