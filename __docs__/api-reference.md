# PawMatch API リファレンス

## 📡 API エンドポイント一覧

### ベースURL
- **本番環境**: `https://pawmatch-api.YOUR_SUBDOMAIN.workers.dev`
- **ローカル開発**: `http://localhost:8788`

## 🐾 ペット関連API

### ペット一覧取得
すべてのペット情報を取得します。

```http
GET /pets
```

#### パラメータ
| パラメータ | 型 | 必須 | 説明 | デフォルト |
|------------|-----|------|------|------------|
| `limit` | integer | ❌ | 取得件数（最大100） | 20 |
| `offset` | integer | ❌ | スキップ件数 | 0 |
| `prefecture` | string | ❌ | 都道府県フィルタ | - |

#### レスポンス例
```json
{
  "pets": [
    {
      "id": "523509",
      "type": "cat",
      "name": "シャイな女の子生後8ヶ月東京都",
      "breed": "雑種",
      "age": 2,
      "gender": "女の子",
      "prefecture": "東京都",
      "city": "新宿区",
      "location": "東京都新宿区",
      "description": "素敵な猫ちゃんです...",
      "personality": ["人懐っこい", "甘えん坊"],
      "medical_info": "ワクチン接種済み、健康チェック済み",
      "care_requirements": ["完全室内飼い", "定期健診"],
      "image_url": "/images/cat-523509.jpg",
      "shelter_name": "東京都動物保護センター",
      "created_at": "2025-08-18T09:00:53.271Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 1
  }
}
```

### 猫一覧取得
猫のペット情報のみを取得します。

```http
GET /pets/cat
```

#### パラメータ
ペット一覧取得と同じパラメータが使用可能です。

### 犬一覧取得  
犬のペット情報のみを取得します。

```http
GET /pets/dog
```

#### パラメータ
ペット一覧取得と同じパラメータが使用可能です。

### 特定ペット詳細取得
指定されたペットの詳細情報を取得します。

```http
GET /pets/{type}/{id}
```

#### パスパラメータ
| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `type` | string | ✅ | ペット種別（`cat` または `dog`） |
| `id` | string | ✅ | ペットID |

#### レスポンス例
```json
{
  "pet": {
    "id": "523509",
    "type": "cat",
    "name": "シャイな女の子生後8ヶ月東京都",
    "breed": "雑種",
    "age": 2,
    "gender": "女の子",
    "prefecture": "東京都",
    "city": "新宿区",
    "location": "東京都新宿区",
    "description": "素敵な猫ちゃんです...",
    "personality": ["人懐っこい", "甘えん坊"],
    "medical_info": "ワクチン接種済み、健康チェック済み",
    "care_requirements": ["完全室内飼い", "定期健診"],
    "image_url": "/images/cat-523509.jpg",
    "shelter_name": "東京都動物保護センター",
    "shelter_contact": "pethome@example.com",
    "source_url": "https://www.pet-home.jp/cats/tokyo/pn523509/",
    "created_at": "2025-08-18T09:00:53.271Z",
    "metadata": {
      "socialLevel": "普通",
      "indoorOutdoor": "完全室内",
      "groomingRequirements": "中",
      "vocalizationLevel": "普通",
      "activityTime": "どちらでも",
      "playfulness": "中"
    }
  }
}
```

## 🖼️ 画像配信API

### ペット画像取得
ペットの画像を取得します。

```http
GET /images/{type}/{filename}
```

#### パスパラメータ
| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `type` | string | ✅ | ペット種別（`cats` または `dogs`） |
| `filename` | string | ✅ | ファイル名（例: `cat-523509.jpg`） |

#### セキュリティ
- **リファラーチェック**: 許可されたドメインからのみアクセス可能
- **CORS制限**: 設定されたドメインのみ
- **キャッシュ**: 24時間ブラウザキャッシュ、1年CDNキャッシュ

#### レスポンス
- **Content-Type**: `image/jpeg`
- **Cache-Control**: `public, max-age=31536000`
- **Body**: バイナリ画像データ

## 📊 統計・メタデータAPI

### システム統計取得
システム全体の統計情報を取得します。

```http
GET /stats
```

#### レスポンス例
```json
{
  "total": 150,
  "dogs": 75,
  "cats": 75,
  "last_updated": "2025-08-18T12:00:00.000Z"
}
```

### 都道府県一覧取得
登録されているペットの都道府県一覧を取得します。

```http
GET /prefectures
```

#### レスポンス例
```json
{
  "prefectures": [
    "北海道",
    "青森県",
    "岩手県",
    "宮城県",
    "東京都",
    "大阪府",
    "福岡県"
  ]
}
```

### ヘルスチェック
APIの動作状況を確認します。

```http
GET /
```

#### レスポンス例
```json
{
  "service": "PawMatch API",
  "status": "healthy",
  "timestamp": "2025-08-18T12:00:00.000Z"
}
```

## 🕷️ クローラーAPI

### ベースURL
- **本番環境**: `https://pawmatch-crawler.YOUR_SUBDOMAIN.workers.dev`
- **ローカル開発**: `http://localhost:8787`

### 手動クロール実行
指定された種別のペットデータを手動でクロールします。

```http
POST /crawl/{type}
```

#### パスパラメータ
| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `type` | string | ❌ | ペット種別（`cat` または `dog`）デフォルト: `cat` |

#### レスポンス例
```json
{
  "message": "cat crawling completed",
  "result": {
    "success": true,
    "totalPets": 15,
    "newPets": 5,
    "updatedPets": 10,
    "errors": []
  },
  "timestamp": "2025-08-18T12:00:00.000Z"
}
```

### クローラーステータス
クローラーの動作状況を確認します。

```http
GET /
```

#### レスポンス例
```json
{
  "service": "PawMatch Crawler",
  "status": "healthy",
  "timestamp": "2025-08-18T12:00:00.000Z"
}
```

## 🚫 エラーレスポンス

### エラー形式
すべてのエラーは以下の形式で返されます：

```json
{
  "error": "エラーメッセージ"
}
```

### HTTPステータスコード
| コード | 説明 | 主な発生場面 |
|--------|------|--------------|
| 200 | 成功 | 正常なレスポンス |
| 400 | リクエストエラー | 無効なパラメータ、無効なペット種別 |
| 403 | アクセス拒否 | CORS違反、リファラーチェック失敗 |
| 404 | 見つからない | 存在しないペット、存在しない画像 |
| 500 | サーバーエラー | データベースエラー、内部エラー |

### エラー例

#### 無効なペット種別
```http
GET /pets/bird
```
```json
{
  "error": "Invalid pet type"
}
```

#### ペットが見つからない
```http
GET /pets/cat/nonexistent
```
```json
{
  "error": "Pet not found"
}
```

#### 画像が見つからない
```http
GET /images/cats/nonexistent.jpg
```
```json
{
  "error": "Image not found"
}
```

## 📝 使用例

### JavaScript (Fetch API)
```javascript
// ペット一覧取得
const response = await fetch('https://pawmatch-api.example.workers.dev/pets/cat?limit=10');
const data = await response.json();
console.log(data.pets);

// 特定ペット取得
const pet = await fetch('https://pawmatch-api.example.workers.dev/pets/cat/523509');
const petData = await pet.json();
console.log(petData.pet);

// 統計情報取得
const stats = await fetch('https://pawmatch-api.example.workers.dev/stats');
const statsData = await stats.json();
console.log(`Total pets: ${statsData.total}`);
```

### cURL
```bash
# ペット一覧取得
curl "https://pawmatch-api.example.workers.dev/pets?limit=5" | jq '.'

# 猫一覧取得
curl "https://pawmatch-api.example.workers.dev/pets/cat" | jq '.'

# 手動クロール実行
curl -X POST "https://pawmatch-crawler.example.workers.dev/crawl/cat" | jq '.'

# 画像取得
curl -o cat.jpg "https://pawmatch-api.example.workers.dev/images/cats/cat-523509.jpg"
```

### Python (requests)
```python
import requests

# ベースURL
api_base = "https://pawmatch-api.example.workers.dev"

# ペット一覧取得
response = requests.get(f"{api_base}/pets/cat", params={"limit": 10})
pets = response.json()["pets"]

# 特定ペット取得
pet_response = requests.get(f"{api_base}/pets/cat/523509")
pet_data = pet_response.json()["pet"]

print(f"Pet name: {pet_data['name']}")
print(f"Breed: {pet_data['breed']}")
```

## 🔒 セキュリティとレート制限

### CORS設定
- 許可されたオリジンからのみアクセス可能
- 開発環境: `http://localhost:3004`、`http://localhost:8787`、`http://localhost:8788`
- 本番環境: 設定されたドメインのみ

### レート制限
- Cloudflareの標準DDoS保護が適用
- 通常利用では制限にかかることはありません
- 異常なトラフィックは自動的にブロック

### 画像アクセス制御
- リファラーヘッダーによるアクセス制限
- 直リンクの防止
- セキュリティヘッダーの付与

## 📈 パフォーマンス

### キャッシュ戦略
- **API レスポンス**: キャッシュなし（リアルタイムデータ）
- **画像配信**: 24時間ブラウザキャッシュ、1年CDNキャッシュ
- **静的コンテンツ**: エッジでキャッシュ

### レスポンス時間
- **API**: ~50-200ms（グローバルエッジ経由）
- **画像配信**: ~10-50ms（CDNキャッシュ時）
- **クロール**: 数秒〜数分（データ量による）

## 🔧 開発者向け情報

### API バージョニング
現在はv1のみ。将来的にバージョニングを導入予定。

### 変更ログ
- **2025-08**: 初期リリース
- セキュリティ強化、CORS設定追加
- 画像最適化、キャッシュ戦略改善

### サポートされるブラウザ
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+