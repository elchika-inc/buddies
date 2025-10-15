# ペット画像の用意方法

このディレクトリには、ローカル開発環境で使用するペット画像を配置します。

## ディレクトリ構造

```
database/fixtures/images/
├── dogs/          # 犬の画像を配置
│   ├── sample-1.jpg
│   ├── sample-2.jpg
│   └── ...
└── cats/          # 猫の画像を配置
    ├── sample-1.jpg
    ├── sample-2.jpg
    └── ...
```

## 画像の準備方法

### 方法1: 手動で画像を配置（推奨）

1. フリー素材サイトから犬・猫の画像をダウンロード
2. `database/fixtures/images/dogs/` に犬の画像を配置
3. `database/fixtures/images/cats/` に猫の画像を配置

**推奨サイズと形式:**

- サイズ: 800x600px 以上
- 形式: JPEG, PNG
- ファイルサイズ: 5MB以下
- ファイル名: 任意（例: my-dog-1.jpg, cute-cat.png）

**フリー素材サイト:**

- [Unsplash (犬)](https://unsplash.com/s/photos/dog)
- [Unsplash (猫)](https://unsplash.com/s/photos/cat)
- [Pexels](https://www.pexels.com/)
- [Pixabay](https://pixabay.com/)

### 方法2: プレースホルダー画像を自動生成

プレースホルダー画像を自動生成するスクリプトを使用できます：

```bash
# 犬5匹、猫5匹のプレースホルダー画像を生成
npm run db:generate-placeholders -- --dogs=5 --cats=5
```

このコマンドは外部サービス（placedog.net、placekitten.com）から画像を取得して、
このディレクトリに保存します。

## シード実行

画像を配置したら、シードスクリプトを実行します：

```bash
# 基本（犬5匹、猫5匹）
npm run db:seed

# 件数指定
npm run db:seed -- --dogs=20 --cats=30

# プレースホルダー自動生成してシード
npm run db:seed -- --generate-placeholders --dogs=10 --cats=10
```

シード実行時に、これらの画像はローカルR2バケットにアップロードされ、
ペットデータと関連付けられます。

## 注意事項

- 画像が少ない場合は、循環利用されます（例: 3枚の画像で10匹のペットデータを作成）
- 画像がない場合でも、シード実行は可能です（画像なしでペットデータのみ作成）
- ローカル開発環境のみで使用されます（本番環境には影響しません）
