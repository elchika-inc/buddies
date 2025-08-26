# 本番環境でDrizzle Kitを使用する手順

## 1. 必要な情報を収集

### Account IDの取得
```bash
wrangler whoami
```
表示される Account ID をメモします。

### Database IDの取得
```bash
wrangler d1 list
```
`pawmatch-db`のUUID（`09bcc380-4c44-4e29-9a45-6ce6def62c7f`）をメモします。

## 2. Cloudflare APIトークンの作成

1. [Cloudflare Dashboard](https://dash.cloudflare.com)にログイン
2. 右上のアイコンから **My Profile** を選択
3. 左サイドバーの **API Tokens** をクリック
4. **Create Token** ボタンをクリック
5. **Create Custom Token** を選択
6. 以下の設定でトークンを作成:

### トークン名
`D1 Drizzle Kit Access`（任意の名前）

### 権限設定
- **Account** → **Cloudflare D1** → **Edit**
- **Account** → **Account Analytics** → **Read**（オプション）

### アカウントリソース
- **Include** → 自分のアカウントを選択

### 有効期限
- 必要に応じて設定（推奨：1年）

7. **Continue to summary** → **Create Token**
8. 表示されたトークンを安全にコピー（一度しか表示されません）

## 3. 環境変数の設定

`.env.local`ファイルを作成:

```bash
# .env.localファイルの作成
cp .env.local.example .env.local
```

`.env.local`を編集:
```env
CLOUDFLARE_ACCOUNT_ID=your-account-id-here
CLOUDFLARE_DATABASE_ID=09bcc380-4c44-4e29-9a45-6ce6def62c7f
CLOUDFLARE_D1_TOKEN=your-api-token-here
```

## 4. dotenvパッケージのインストール

```bash
cd api
npm install --save-dev dotenv
```

## 5. 本番環境でDrizzle Kitを実行

### Drizzle Studioを起動
```bash
bunx drizzle-kit studio --config drizzle.config.prod.ts
```

### マイグレーションを生成
```bash
bunx drizzle-kit generate:sqlite --config drizzle.config.prod.ts
```

### スキーマをプッシュ
```bash
bunx drizzle-kit push:sqlite --config drizzle.config.prod.ts
```

## 6. package.jsonにスクリプトを追加（オプション）

```json
{
  "scripts": {
    "db:studio:prod": "drizzle-kit studio --config drizzle.config.prod.ts",
    "db:generate:prod": "drizzle-kit generate:sqlite --config drizzle.config.prod.ts",
    "db:push:prod": "drizzle-kit push:sqlite --config drizzle.config.prod.ts"
  }
}
```

## セキュリティ上の注意事項

⚠️ **重要**: 以下のファイルをGitにコミットしないでください:
- `.env.local`
- APIトークンを含むファイル

`.gitignore`に以下が含まれていることを確認:
```
.env.local
.env*.local
```

## トラブルシューティング

### エラー: "Invalid token"
- APIトークンが正しくコピーされているか確認
- トークンの権限が正しいか確認（D1 Edit権限が必要）

### エラー: "Database not found"
- Database IDが正しいか確認
- `wrangler d1 list`で表示されるIDと一致しているか確認

### エラー: "Account ID not found"
- Account IDが正しいか確認
- `wrangler whoami`で表示されるIDと一致しているか確認