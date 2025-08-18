# PawMatch Crawler

PawMatchの猫データを自動収集するクローラーシステムです。

## 機能

- ✅ **自動重複検出**: 募集番号を記録し、新規データのみを取得
- ✅ **データ蓄積**: 取得したデータを累積保存
- ✅ **自動エクスポート**: CatMatchアプリへ自動反映
- ✅ **画像ダウンロード**: 猫の画像を自動保存
- ✅ **スケジュール実行**: 6時間ごとの自動実行に対応

## インストール

```bash
cd crawler
npm install
npx playwright install chromium
```

## 使い方

### 基本的な実行方法

```bash
# 通常実行（新規データのみ取得）
npm run crawl

# ヘルプを表示
npm run crawl:help

# 10件のみ取得
npm run crawl -- -l 10

# 強制実行（重複チェックを無視）
npm run crawl:force

# 状態をリセットして実行
npm run crawl:reset

# ドライラン（動作確認のみ）
npm run crawl:dry
```

### シェルスクリプトを使用

```bash
# 実行権限を付与（初回のみ）
chmod +x crawl.sh

# 通常実行
./crawl.sh

# 状態確認
./crawl.sh status

# 強制実行
./crawl.sh force

# ヘルプ表示
./crawl.sh help
```

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `npm run crawl` | 通常実行（デフォルト設定） |
| `npm run crawl:help` | ヘルプを表示 |
| `npm run crawl:force` | 強制実行（重複無視） |
| `npm run crawl:reset` | 状態リセット後に実行 |
| `npm run crawl:dry` | ドライラン |
| `npm run crawl:scheduled` | 旧バージョンのクローラー |
| `npm run scheduler` | 6時間ごとのスケジューラー起動 |

## オプション

| オプション | 短縮形 | 説明 | デフォルト |
|-----------|-------|------|-----------|
| `--limit` | `-l` | 取得する最大件数 | 20 |
| `--force` | `-f` | 既存データを無視して強制取得 | false |
| `--skip-export` | - | CatMatchへのエクスポートをスキップ | false |
| `--reset` | - | クローラーの状態をリセット | false |
| `--dry-run` | - | 実際の取得を行わずに動作確認 | false |
| `--help` | `-h` | ヘルプを表示 | - |

## データ構造

```
crawler/
├── data/
│   ├── crawler-state.json      # クローラーの状態（最終取得ID等）
│   ├── accumulated-cats.json   # 蓄積された全猫データ
│   └── images/                 # ダウンロードした画像
│       ├── cat-523509.jpg
│       ├── cat-523507.jpg
│       └── ...
└── output/                      # 一時出力ディレクトリ
```

## 状態管理

### crawler-state.json

クローラーの実行状態を記録：

```json
{
  "lastCrawledAt": "2025-08-18T09:36:47.828Z",
  "lastCrawledId": "523509",
  "highestId": "523509",
  "totalCrawled": 1,
  "history": [
    {
      "timestamp": "2025-08-18T09:36:47.828Z",
      "crawledIds": ["523509"],
      "newCount": 1
    }
  ]
}
```

### accumulated-cats.json

取得した全猫データを蓄積（重複なし）

## 自動実行（スケジューラー）

6時間ごとに自動実行する場合：

```bash
# スケジューラーを起動
npm run scheduler

# 即座に1回実行してからスケジュール開始
npm run scheduler:now
```

## トラブルシューティング

### データをリセットしたい場合

```bash
# 状態をリセットして新規取得
npm run crawl:reset -- -l 20

# または手動でクリーンアップ
./crawl.sh clean
```

### 特定のIDより新しいデータのみ取得したい場合

`data/crawler-state.json`の`highestId`を手動で編集：

```json
{
  "highestId": "523000"  // この値より大きいIDのみ取得
}
```

### エラーが発生する場合

1. Playwrightのブラウザをインストール：
   ```bash
   npx playwright install chromium
   ```

2. 依存関係を再インストール：
   ```bash
   rm -rf node_modules
   npm install
   ```

## 開発

### ファイル構成

- `src/run-crawler.ts` - メインの実行スクリプト
- `src/scheduled-cat-crawler.ts` - クローラー本体
- `src/scheduler.ts` - スケジューラー
- `crawl.sh` - シェルスクリプトラッパー

### テスト実行

```bash
# ドライランで動作確認
npm run crawl:dry

# 少数のデータで確認
npm run crawl -- -l 3
```

## ライセンス

MIT