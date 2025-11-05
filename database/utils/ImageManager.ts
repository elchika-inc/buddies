import * as fs from 'fs'
import * as path from 'path'

export type PetType = 'dog' | 'cat'

export interface ImageFile {
  path: string
  filename: string
  buffer: Buffer
}

/**
 * 画像管理クラス
 * fixturesディレクトリから画像をロードし、管理する
 */
export class ImageManager {
  private readonly fixturesDir: string

  constructor(fixturesDir = './database/fixtures/images') {
    this.fixturesDir = fixturesDir
  }

  /**
   * 指定されたタイプの画像を全て取得
   */
  getImages(type: PetType): ImageFile[] {
    const typeDir = path.join(this.fixturesDir, `${type}s`)

    if (!fs.existsSync(typeDir)) {
      console.warn(`⚠️  ディレクトリが見つかりません: ${typeDir}`)
      return []
    }

    const files = fs.readdirSync(typeDir)
    const imageFiles: ImageFile[] = []

    for (const filename of files) {
      // 画像ファイルのみを対象（jpg, jpeg, png）
      if (!this.isImageFile(filename)) {
        continue
      }

      const filepath = path.join(typeDir, filename)
      try {
        const buffer = fs.readFileSync(filepath)
        imageFiles.push({
          path: filepath,
          filename,
          buffer,
        })
      } catch (error) {
        console.error(`❌ 画像の読み込みに失敗: ${filepath}`, error)
      }
    }

    return imageFiles
  }

  /**
   * ランダムに画像を取得
   */
  getRandomImage(type: PetType): ImageFile | null {
    const images = this.getImages(type)
    if (images.length === 0) {
      return null
    }
    return images[Math.floor(Math.random() * images.length)]
  }

  /**
   * 指定されたインデックスの画像を取得（循環利用）
   */
  getImageByIndex(type: PetType, index: number): ImageFile | null {
    const images = this.getImages(type)
    if (images.length === 0) {
      return null
    }
    // 循環利用: インデックスが画像数を超えた場合は最初に戻る
    const actualIndex = index % images.length
    return images[actualIndex]
  }

  /**
   * IDに基づいて画像を取得（JSONデータと画像ファイルを対応させる）
   * @param type ペットのタイプ
   * @param id ペットのID（例: "dog-01"）
   * @returns 対応する画像ファイル、見つからない場合はランダムな画像
   */
  getImageById(type: PetType, id: string): ImageFile | null {
    const images = this.getImages(type)
    if (images.length === 0) {
      return null
    }

    // idから拡張子を除いたベース名を取得（例: "dog-01" → "dog-01"）
    const idBase = id.replace(/\.(jpg|jpeg|png)$/i, '')

    // 完全一致を探す
    const exactMatch = images.find(img => {
      const imgBase = path.basename(img.filename, path.extname(img.filename))
      return imgBase === idBase
    })

    if (exactMatch) {
      return exactMatch
    }

    // 見つからない場合はランダムな画像を返す（フォールバック）
    console.warn(`⚠️  ID "${id}" に対応する画像が見つかりません。ランダムな画像を使用します。`)
    return this.getRandomImage(type)
  }

  /**
   * 画像が存在するかチェック
   */
  hasImages(type: PetType): boolean {
    return this.getImages(type).length > 0
  }

  /**
   * 画像の総数を取得
   */
  getImageCount(type: PetType): number {
    return this.getImages(type).length
  }

  /**
   * ファイルが画像ファイルかどうかチェック
   */
  private isImageFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase()
    return ['.jpg', '.jpeg', '.png'].includes(ext)
  }

  /**
   * 統計情報を表示
   */
  printStats(): void {
    const dogCount = this.getImageCount('dog')
    const catCount = this.getImageCount('cat')

    console.log('📊 画像統計:')
    console.log(`  - 犬の画像: ${dogCount}枚`)
    console.log(`  - 猫の画像: ${catCount}枚`)
    console.log(`  - 合計: ${dogCount + catCount}枚`)
  }
}
