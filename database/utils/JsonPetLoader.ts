import * as fs from 'fs'
import * as path from 'path'
import type { PetType, GeneratedPetData } from '../generators/PetDataGenerator'
import { PetDataGenerator } from '../generators/PetDataGenerator'
import { validatePetJson, type PetJson } from '../schemas/pet-json-schema'

/**
 * JSONファイルからペットデータを読み込むローダー
 */
export class JsonPetLoader {
  private readonly baseDir: string
  private readonly generator: PetDataGenerator

  constructor(baseDir: string = 'database/fixtures/pets') {
    this.baseDir = baseDir
    this.generator = new PetDataGenerator()
  }

  /**
   * 指定されたタイプのペットJSONファイルを全て読み込む
   */
  async loadPets(type: PetType): Promise<GeneratedPetData[]> {
    const dirPath = path.join(this.baseDir, type === 'dog' ? 'dogs' : 'cats')

    // ディレクトリが存在しない場合は空配列を返す
    if (!fs.existsSync(dirPath)) {
      console.log(`  ℹ️  JSONディレクトリが見つかりません: ${dirPath}`)
      return []
    }

    // JSONファイルを読み込み
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'))

    if (files.length === 0) {
      console.log(`  ℹ️  ${type === 'dog' ? '犬' : '猫'}のJSONファイルが見つかりません`)
      return []
    }

    console.log(`  📄 ${files.length}個の${type === 'dog' ? '犬' : '猫'}のJSONファイルを発見`)

    const pets: GeneratedPetData[] = []
    const errors: string[] = []

    for (const file of files) {
      const filePath = path.join(dirPath, file)
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const jsonData = JSON.parse(content)

        // バリデーション
        const validation = validatePetJson(jsonData)

        if (!validation.success) {
          errors.push(`${file}: ${validation.error}`)
          continue
        }

        if (!validation.data) {
          errors.push(`${file}: データの検証に失敗しました`)
          continue
        }

        // タイプの整合性チェック
        if (validation.data.type !== type) {
          errors.push(`${file}: タイプが一致しません（期待: ${type}, 実際: ${validation.data.type}）`)
          continue
        }

        // 不足フィールドを補完
        const completedPet = this.generator.completePartialData(validation.data)
        pets.push(completedPet)

        console.log(`    ✓ ${file} を読み込みました (${completedPet.name})`)
      } catch (error) {
        if (error instanceof SyntaxError) {
          errors.push(`${file}: JSON解析エラー - ${error.message}`)
        } else {
          errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
    }

    // エラーがあれば表示
    if (errors.length > 0) {
      console.error(`\n  ⚠️  ${errors.length}個のファイルでエラーが発生しました:`)
      errors.forEach(err => console.error(`    - ${err}`))
      console.log('')
    }

    return pets
  }

  /**
   * 指定されたタイプのJSONファイル数を取得
   */
  countJsonFiles(type: PetType): number {
    const dirPath = path.join(this.baseDir, type === 'dog' ? 'dogs' : 'cats')

    if (!fs.existsSync(dirPath)) {
      return 0
    }

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'))
    return files.length
  }

  /**
   * JSONファイルが存在するかチェック
   */
  hasJsonFiles(type?: PetType): boolean {
    if (type) {
      return this.countJsonFiles(type) > 0
    }

    // 両方チェック
    return this.countJsonFiles('dog') > 0 || this.countJsonFiles('cat') > 0
  }

  /**
   * ディレクトリ情報を表示
   */
  printStats(): void {
    const dogCount = this.countJsonFiles('dog')
    const catCount = this.countJsonFiles('cat')

    console.log('📊 JSON統計:')
    console.log(`  - 犬: ${dogCount}ファイル`)
    console.log(`  - 猫: ${catCount}ファイル`)
    console.log(`  - ベースディレクトリ: ${this.baseDir}`)
    console.log('')
  }
}
