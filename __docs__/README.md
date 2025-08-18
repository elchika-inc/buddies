# 📚 PawMatch ドキュメント

PawMatch Cloudflare Workers バックエンドシステムの包括的なドキュメントです。

## 📖 ドキュメント一覧

### 🚀 [本番環境デプロイガイド](./deployment-guide.md)
本番環境へのデプロイ手順、設定方法、運用・監視について詳しく説明しています。

**主な内容:**
- システム構成とアーキテクチャ
- 自動デプロイスクリプトの使用方法
- Cloudflare Workers、R2、D1の設定
- トラブルシューティング
- 料金・コスト最適化
- 継続的デプロイの設定

### 🛠️ [ローカル開発環境ガイド](./local-development.md)
ローカル開発環境のセットアップ、動作確認、デバッグ方法について説明しています。

**主な内容:**
- ローカル開発環境の構築
- 開発サーバーの起動方法
- ホットリロード・デバッグ
- 自動テストスクリプトの使用
- データベース・R2の操作
- 開発ワークフロー

### 📡 [API リファレンス](./api-reference.md)
PawMatch APIの詳細な仕様、エンドポイント、使用例を記載しています。

**主な内容:**
- 全APIエンドポイントの詳細
- リクエスト・レスポンス例
- エラーハンドリング
- セキュリティ設定
- 使用例（JavaScript、cURL、Python）
- パフォーマンス情報

## 🎯 クイックスタート

### 1. ローカル開発を始める
```bash
# ローカル開発環境セットアップ
./workers/local-dev.sh

# 開発サーバー起動（ターミナル1）
cd workers/crawler && wrangler dev --config wrangler.dev.toml

# API サーバー起動（ターミナル2）
cd workers/api && wrangler dev --config wrangler.dev.toml

# 動作確認
./workers/test-local.sh
```

### 2. 本番環境にデプロイする
```bash
# Cloudflareにログイン
wrangler login

# 自動デプロイ実行
./deploy.sh
```

### 3. APIを使用する
```javascript
// ペット一覧取得
const response = await fetch('https://your-api.workers.dev/pets/cat');
const data = await response.json();
console.log(data.pets);
```

## 🏗️ プロジェクト構成

```
pawmatch/
├── workers/                    # Cloudflare Workers
│   ├── crawler/               # クローラーWorker
│   │   ├── src/
│   │   │   ├── index.ts      # メインエントリーポイント
│   │   │   ├── crawler.ts    # クローリングロジック
│   │   │   └── types.ts      # 型定義
│   │   ├── schema.sql        # D1データベーススキーマ
│   │   └── wrangler.toml     # 設定ファイル
│   │
│   ├── api/                  # API Worker
│   │   ├── src/
│   │   │   └── index.ts     # API・画像配信
│   │   └── wrangler.toml    # 設定ファイル
│   │
│   ├── local-dev.sh         # ローカル開発環境セットアップ
│   ├── test-local.sh        # ローカルテストスクリプト
│   └── README.md            # Workers README
│
├── app/                      # Next.js フロントエンド
├── crawler/                  # 既存クローラー（移行済み）
├── deploy.sh                # 本番デプロイスクリプト
└── __docs__/                # ドキュメント
    ├── deployment-guide.md  # デプロイガイド
    ├── local-development.md # ローカル開発ガイド
    ├── api-reference.md     # API リファレンス
    └── README.md           # このファイル
```

## 🌐 システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Platform                     │
├─────────────────────────────────────────────────────────────┤
│  Workers                │  Storage & Database               │
│  ┌─────────────────────┐│  ┌─────────────────────────────┐  │
│  │ Crawler Worker      ││  │ R2 Storage                  │  │
│  │ - 6時間ごと自動実行  ││  │ - 画像ファイル保存           │  │
│  │ - ペットホームクロール││  │ - CORS・セキュリティ設定    │  │
│  └─────────────────────┘│  └─────────────────────────────┘  │
│  ┌─────────────────────┐│  ┌─────────────────────────────┐  │
│  │ API Worker          ││  │ D1 Database                 │  │
│  │ - ペットデータAPI    ││  │ - ペットメタデータ          │  │
│  │ - 画像配信API       ││  │ - クロールログ              │  │
│  └─────────────────────┘│  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 主な機能

### ✅ 実装済み機能
- **自動クローリング**: 6時間ごとのペットデータ収集
- **画像保存・配信**: R2を使用した高速画像配信
- **RESTful API**: ペット情報の取得・検索
- **セキュリティ**: CORS、リファラーチェック、レート制限
- **ローカル開発環境**: ホットリロード対応
- **自動テスト**: 包括的なAPIテスト
- **監視・ログ**: リアルタイムログとエラー追跡

### 🚀 技術スタック
- **Runtime**: Cloudflare Workers (V8 Edge Runtime)
- **Language**: TypeScript
- **Framework**: Hono.js
- **Storage**: Cloudflare R2 (画像)
- **Database**: Cloudflare D1 (SQLite)
- **CLI**: Wrangler
- **Security**: CORS, CSP, Rate Limiting

### 🎯 パフォーマンス特性
- **レスポンス時間**: 50-200ms (グローバルエッジ)
- **可用性**: 99.9%+ (Cloudflareのグローバルネットワーク)
- **スケーラビリティ**: 自動スケーリング
- **コスト効率**: 無料枠での小規模運用可能

## 📞 サポート・コントリビューション

### 問題・質問がある場合
1. 該当するドキュメントを確認
2. ローカルでの再現を試行
3. GitHub Issues で報告

### 開発に参加する場合
1. ローカル開発環境をセットアップ
2. feature ブランチで開発
3. テストを実行して動作確認
4. Pull Request を作成

### 関連リソース
- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)
- [Hono.js ドキュメント](https://hono.dev/)
- [TypeScript ドキュメント](https://www.typescriptlang.org/)

---

**🐾 Happy Coding with PawMatch!** 🐾