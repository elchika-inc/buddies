# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

PawMatchは、保護犬・保護猫とユーザーをマッチングするTinderライクなUIのWebアプリケーションです。Turboを使用したモノレポ構成で、犬用（DogMatch）と猫用（CatMatch）の2つの独立したNext.jsアプリケーションを提供します。

## アーキテクチャ

### モノレポ構成
- **packages/dog**: 保護犬専門アプリ（ポート3002）
- **packages/cat**: 保護猫専門アプリ（ポート3003）
- **functions/api**: 共通APIエンドポイント（Vercel Functions）

### 技術スタック
- **フレームワーク**: Next.js 14（App Router）
- **パッケージマネージャー**: Bun
- **ビルドツール**: Turbo
- **スタイリング**: TailwindCSS
- **デプロイ**: Vercel
- **型安全性**: TypeScript 5

## 開発コマンド

### 基本コマンド
```bash
# 全アプリ同時起動（推奨）
npm run dev

# 個別アプリ起動
cd packages/dog && npm run dev  # DogMatch（ポート3002）
cd packages/cat && npm run dev  # CatMatch（ポート3003）

# ビルド
npm run build

# 型チェック
npm run type-check

# リンター実行
npm run lint
npm run lint:fix

# クリーンアップ
npm run clean

# デプロイ
npm run deploy:dog  # DogMatchのみ
npm run deploy:cat  # CatMatchのみ
npm run deploy:all  # 両方デプロイ
```

## ディレクトリ構造と責務

### packages/dog・packages/cat共通構成
```
src/
├── app/                     # Next.js App Router
│   ├── api/                # APIルート
│   ├── layout.tsx          # ルートレイアウト
│   └── page.tsx            # メインページ
├── components/
│   ├── {Dog|Cat}Card.tsx       # 動物情報カード表示
│   ├── {Dog|Cat}SwipeCard.tsx  # スワイプ可能カード
│   ├── {Dog|Cat}MatchApp.tsx   # アプリメインコンポーネント
│   ├── {Dog|Cat}DetailModal.tsx # 詳細モーダル
│   ├── LocationSelector.tsx     # 地域選択
│   ├── LocationModal.tsx        # 地域選択モーダル
│   ├── MatchHeader.tsx          # ヘッダー
│   └── SwipeFooter.tsx          # フッター
├── hooks/
│   ├── use{Dog|Cat}SwipeState.ts # スワイプ状態管理
│   └── useLocalStorage.ts        # ローカルストレージ
├── data/
│   ├── {dogs|cats}.ts      # モックデータ
│   └── locations.ts        # 地域データ
└── types/
    └── {dog|cat}.ts        # 型定義
```

## 重要な実装パターン

### スワイプ機能の実装
- **swipable-tinder-card**ライブラリを使用
- 右スワイプ: 気になる
- 左スワイプ: パス
- 上スワイプ: 特に気になる
- ローカルストレージでスワイプ履歴を永続化

### 状態管理
- カスタムフック（`use{Dog|Cat}SwipeState`）で独立管理
- ローカルストレージと同期（`useLocalStorage`フック）
- 犬と猫のデータは完全に分離

### コンポーネント設計
- 動物種別ごとに専用コンポーネント（DogCard/CatCard等）
- 共通UIコンポーネント（MatchHeader、SwipeFooter）は両アプリで共有
- 各アプリは独自のカラーテーマ（犬: オレンジ系、猫: パープル系）

## コーディング規約

### TypeScript
- 厳密な型定義を使用
- `any`型の使用禁止
- インターフェースは`types/`ディレクトリに集約

### React/Next.js
- 関数コンポーネントとHooksを使用
- Server ComponentsとClient Componentsを適切に使い分け
- `"use client"`ディレクティブは必要最小限に

### スタイリング
- TailwindCSSのユーティリティクラスを使用
- カスタムCSSは避ける
- レスポンシブデザインを考慮（mobile-first）

## デプロイ設定

### Vercel設定
- **packages/dog/vercel.json**: DogMatchのデプロイ設定
- **packages/cat/vercel.json**: CatMatchのデプロイ設定
- ビルドコマンド: `npm run build`
- 出力ディレクトリ: `.next`

### ビルド無視設定
- `scripts/ignore-build-{dog|cat}.sh`: 変更検出スクリプト
- 該当パッケージに変更がない場合はビルドをスキップ

## 注意事項

### パフォーマンス
- 画像は適切なサイズに最適化
- スワイプアニメーションは60fps維持
- 初回ロード時のデータは最小限に

### アクセシビリティ
- タッチターゲットは44px以上
- キーボードナビゲーション対応
- スクリーンリーダー対応のaria-label

### セキュリティ
- APIキーや認証情報をコードに含めない
- ユーザー入力は適切にサニタイズ
- CSRFトークンの実装（本番環境）