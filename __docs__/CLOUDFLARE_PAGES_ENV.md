# Cloudflare Pages 環境変数設定ガイド

## 設定が必要な環境変数

### 🐕 DogMatch (buddies-dogs)

Cloudflare Dashboard → Pages → buddies-dogs → Settings → Environment variables から以下を設定：

#### Production環境

```
NEXT_PUBLIC_API_URL=https://buddies-api.elchika.app
NEXT_PUBLIC_APP_URL=https://buddies-dogs.elchika.app
NEXT_PUBLIC_PET_TYPE=dog
NEXT_PUBLIC_USE_API=true
NEXT_PUBLIC_APP_NAME=DogMatch
NEXT_PUBLIC_API_KEY=b80f83e113c5463a811607a30afd133dbb0b3c39a0eb41ebac716e29eeda27fb
```

#### Preview環境

```
NEXT_PUBLIC_API_URL=https://buddies-api.elchika.app
NEXT_PUBLIC_APP_URL=https://dogmatch-16r.pages.dev
NEXT_PUBLIC_PET_TYPE=dog
NEXT_PUBLIC_USE_API=true
NEXT_PUBLIC_APP_NAME=DogMatch
NEXT_PUBLIC_API_KEY=b80f83e113c5463a811607a30afd133dbb0b3c39a0eb41ebac716e29eeda27fb
```

### 🐱 CatMatch (buddies-cats)

Cloudflare Dashboard → Pages → buddies-cats → Settings → Environment variables から以下を設定：

#### Production環境

```
NEXT_PUBLIC_API_URL=https://buddies-api.elchika.app
NEXT_PUBLIC_APP_URL=https://buddies-cats.elchika.app
NEXT_PUBLIC_PET_TYPE=cat
NEXT_PUBLIC_USE_API=true
NEXT_PUBLIC_APP_NAME=CatMatch
NEXT_PUBLIC_API_KEY=b80f83e113c5463a811607a30afd133dbb0b3c39a0eb41ebac716e29eeda27fb
```

#### Preview環境

```
NEXT_PUBLIC_API_URL=https://buddies-api.elchika.app
NEXT_PUBLIC_APP_URL=https://catmatch.pages.dev
NEXT_PUBLIC_PET_TYPE=cat
NEXT_PUBLIC_USE_API=true
NEXT_PUBLIC_APP_NAME=CatMatch
NEXT_PUBLIC_API_KEY=b80f83e113c5463a811607a30afd133dbb0b3c39a0eb41ebac716e29eeda27fb
```

## ✅ 設定済みのシークレット

以下のシークレットはすでにwranglerコマンドで設定済みです：

- `NEXT_PUBLIC_API_KEY` (両プロジェクトに設定済み)

## 📝 設定手順

1. [Cloudflare Dashboard](https://dash.cloudflare.com) にログイン
2. Pages セクションに移動
3. 対象プロジェクト（pawmatch-dogs または pawmatch-cats）を選択
4. Settings → Environment variables を開く
5. Production と Preview それぞれに上記の環境変数を追加
6. Save をクリック

## 🔄 再デプロイ

環境変数を設定した後、変更を反映させるために再デプロイが必要です：

```bash
# DogMatch
cd app
npm run deploy:dog

# CatMatch
npm run deploy:cat
```

## ⚠️ 注意事項

- `NEXT_PUBLIC_` プレフィックスが付いた環境変数はクライアントサイドでも利用可能になります
- APIキーは公開されても問題ない「パブリックキー」を使用しています（読み取り専用権限）
- より高い権限が必要な操作はサーバーサイド（API Workers）で処理します
