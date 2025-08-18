# PawMatch - 開発者ドキュメント 🛠️

## 📋 目次

- [アーキテクチャ概要](#アーキテクチャ概要)
- [はじめに](#はじめに)
- [開発環境のセットアップ](#開発環境のセットアップ)
- [プロジェクト構成](#プロジェクト構成)
- [技術スタック](#技術スタック)
- [開発ワークフロー](#開発ワークフロー)
- [APIドキュメント](#apiドキュメント)
- [テスト](#テスト)
- [デプロイ](#デプロイ)
- [コントリビューション](#コントリビューション)

## 🏗️ アーキテクチャ概要

PawMatchは、最新のWeb技術で構築された特化型ペット譲渡アプリケーションを含むモノレポです。

### 設計原則
- **型安全性** - TypeScriptによる完全な型カバレッジ
- **コンポーネントベース** - 再利用可能なReactコンポーネント
- **モバイルファースト** - レスポンシブデザインパターン
- **パフォーマンス** - バンドルサイズの最適化と遅延読み込み
- **アクセシビリティ** - WCAG 2.1準拠

## 🚀 はじめに

### 前提条件

- Node.js >= 18.0.0 または Bun >= 1.0.0
- Git
- npm/yarn/bunパッケージマネージャー

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/your-org/pawmatch.git
cd pawmatch

# 依存関係のインストール
bun install
# または
npm install
```

## 💻 開発環境のセットアップ

### 開発サーバーの起動

```bash
# 両方のアプリを実行（デフォルト）
npm run dev

# DogMatchアプリのみ実行
npm run dev:dog

# CatMatchアプリのみ実行  
npm run dev:cat
```

アプリケーションは以下のURLでアクセス可能：
- DogMatch: http://localhost:3000 (NEXT_PUBLIC_PET_TYPE=dog)
- CatMatch: http://localhost:3000 (NEXT_PUBLIC_PET_TYPE=cat)

### 環境変数

packagesディレクトリに`.env.local`ファイルを作成：

```env
# ペットタイプ設定
NEXT_PUBLIC_PET_TYPE=dog # または 'cat'

# APIエンドポイント（将来実装）
NEXT_PUBLIC_API_URL=https://api.pawmatch.jp

# アナリティクス（オプション）
NEXT_PUBLIC_GA_ID=GA_MEASUREMENT_ID
```

## 📁 プロジェクト構成

```
pawmatch/
├── packages/                 # メインアプリケーションディレクトリ
│   ├── src/
│   │   ├── app/             # Next.js appディレクトリ
│   │   │   ├── layout.tsx   # ルートレイアウト
│   │   │   └── page.tsx     # ホームページ
│   │   ├── components/      # Reactコンポーネント
│   │   │   ├── PetCard.tsx
│   │   │   ├── PetSwipeCard.tsx
│   │   │   ├── PetDetailModal.tsx
│   │   │   ├── LocationModal.tsx
│   │   │   └── ...
│   │   ├── hooks/           # カスタムReactフック
│   │   │   ├── useLocalStorage.ts
│   │   │   └── usePetSwipeState.ts
│   │   ├── types/           # TypeScript型定義
│   │   │   ├── pet.ts       # ベースペットインターフェース
│   │   │   ├── dog.ts       # 犬専用の型
│   │   │   └── cat.ts       # 猫専用の型
│   │   ├── data/            # モックデータとローダー
│   │   │   ├── dog/         # 犬専用データ
│   │   │   ├── cat/         # 猫専用データ
│   │   │   └── petDataLoader.ts
│   │   └── config/          # アプリ設定
│   │       └── petConfig.ts
│   ├── public/              # 静的アセット
│   │   ├── sw.js           # Service Worker
│   │   └── manifest.json   # PWAマニフェスト
│   └── package.json
├── functions/               # サーバーレス関数
│   └── api/
│       ├── matches.ts
│       └── swipe.ts
├── __docs__/               # ドキュメント
│   └── prd/               # 製品要件定義
└── package.json           # ルートpackage.json
```

## 🛠️ 技術スタック

### フロントエンド
- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript 5.0
- **スタイリング**: TailwindCSS 3.3
- **状態管理**: React Hooks + Local Storage
- **ビルドツール**: Next.js内蔵バンドラー

### 主要依存関係
```json
{
  "react": "^18.2.0",
  "next": "^14.0.0",
  "typescript": "^5.0.2",
  "tailwindcss": "^3.3.0",
  "@radix-ui/react-*": "UIプリミティブ",
  "framer-motion": "アニメーションライブラリ"
}
```

### 開発ツール
- **リンティング**: ESLint（Next.js設定）
- **フォーマット**: Prettier
- **型チェック**: TypeScript strictモード
- **Gitフック**: Lefthook（オプション）

## 🔄 開発ワークフロー

### コンポーネント開発

1. `src/components/`に新しいコンポーネントを作成
2. `src/types/`に型を定義
3. `src/hooks/`の既存フックを使用、または新規作成
4. 既存のコンポーネントパターンに従う

コンポーネント構造の例：
```typescript
// src/components/NewComponent.tsx
import React from 'react'
import { Pet } from '../types/pet'

interface NewComponentProps {
  pet: Pet
  onAction: (id: string) => void
}

export const NewComponent: React.FC<NewComponentProps> = ({ pet, onAction }) => {
  // コンポーネントロジック
  return <div>{/* JSX */}</div>
}
```

### 新しいペット属性の追加

1. `src/types/dog.ts`または`src/types/cat.ts`の型定義を更新
2. `src/data/`のモックデータを更新
3. 新しい属性を表示するようコンポーネントを修正
4. 検索可能な場合はフィルターを更新

### コーディング規約

- TypeScriptを使用した関数コンポーネントを使用
- 適切なエラーバウンダリを実装
- Reactベストプラクティスに従う（memo、useCallback、useMemo）
- コンポーネントは小さく、単一責任に保つ
- セマンティックHTMLエレメントを使用
- キーボードナビゲーションのサポートを確保

## 📡 APIドキュメント

### 現在の実装
現在、アプリは`src/data/`のモックデータを使用。将来のAPI統合ポイント：

### 計画中のエンドポイント

```typescript
// GET /api/pets
interface GetPetsParams {
  type: 'dog' | 'cat'
  location?: string
  limit?: number
  offset?: number
}

// POST /api/swipe
interface SwipeAction {
  petId: string
  action: 'like' | 'pass'
  userId: string
}

// GET /api/matches
interface GetMatches {
  userId: string
}
```

## 🧪 テスト

### テストの実行

```bash
# すべてのテストを実行
npm run test

# ウォッチモードでテストを実行
npm run test:watch

# E2Eテストを実行
npm run test:e2e
```

### テスト戦略

- **ユニットテスト**: コンポーネントロジックとユーティリティ
- **統合テスト**: コンポーネント間の相互作用
- **E2Eテスト**: クリティカルなユーザーフロー

### テストの記述

```typescript
// テストファイルの例
import { render, screen } from '@testing-library/react'
import { PetCard } from '../PetCard'

describe('PetCard', () => {
  it('ペット情報を表示する', () => {
    const pet = { /* モックデータ */ }
    render(<PetCard pet={pet} />)
    expect(screen.getByText(pet.name)).toBeInTheDocument()
  })
})
```

## 🚢 デプロイ

### ビルドプロセス

```bash
# プロダクション用ビルド
npm run build

# バンドルサイズの分析
npm run analyze
```

### デプロイプラットフォーム

#### Vercel（推奨）
```bash
# Vercelへデプロイ
npm run deploy
```

#### セルフホスティング
```bash
# ビルドしてプロダクションサーバーを起動
npm run build
npm run start
```

### プロダクションチェックリスト

- [ ] 環境変数の設定
- [ ] エラーなしでビルド完了
- [ ] すべてのテストがパス
- [ ] バンドルサイズの最適化
- [ ] SEOメタタグの更新
- [ ] PWAマニフェストの設定
- [ ] SSL証明書の有効化
- [ ] モニタリングのセットアップ

## 🤝 コントリビューション

### 開発プロセス

1. **フォーク＆クローン** - リポジトリをフォークしてローカルにクローン
2. **ブランチ作成** - フィーチャーブランチを作成（`feature/amazing-feature`）
3. **開発** - 変更を実装
4. **テスト** - テストが通ることを確認
5. **コミット** - conventional commitsを使用
6. **プッシュ** - フォークにプッシュ
7. **PR作成** - プルリクエストを開く

### コミット規約

```
feat: 新機能の追加
fix: バグ修正
docs: ドキュメント更新
style: コードフォーマット
refactor: コードのリファクタリング
test: テストの追加
chore: 依存関係の更新
```

### コードレビュープロセス

- すべてのコードはレビューが必要
- テストが通ること
- TypeScriptベストプラクティスに従う
- 一貫したコードスタイルを維持

## 📚 追加リソース

### ドキュメント
- [Next.jsドキュメント](https://nextjs.org/docs)
- [Reactドキュメント](https://ja.react.dev)
- [TypeScriptハンドブック](https://www.typescriptlang.org/ja/docs/)
- [TailwindCSSドキュメント](https://tailwindcss.com/docs)

### ツール＆拡張機能

推奨VS Code拡張機能：
- ESLint
- Prettier
- TypeScript Vue Plugin
- Tailwind CSS IntelliSense
- GitLens

### トラブルシューティング

よくある問題と解決方法：

**問題**: 型エラーでビルドが失敗する
```bash
# キャッシュをクリアして再ビルド
rm -rf .next node_modules
npm install
npm run build
```

**問題**: 開発サーバーが起動しない
```bash
# ポートの利用状況を確認
lsof -i :3000
# 必要に応じてプロセスを終了
kill -9 <PID>
```

**問題**: スタイルが更新されない
```bash
# TailwindCSSキャッシュをクリア
npm run clean
npm run dev
```

## 📞 サポート

開発に関する質問：
- GitHubでissueを作成
- 開発チームに連絡
- ドキュメントを確認

---

*Happy coding! 🚀*