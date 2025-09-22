/**
 * プロジェクト全体の命名規則定義
 * 一貫性のあるコードベースを維持するための規約
 */

export const NAMING_CONVENTIONS = {
  /**
   * ファイル名規則
   */
  files: {
    // コンポーネント: PascalCase
    components: /^[A-Z][a-zA-Z0-9]+\.tsx?$/,
    // サービス: PascalCaseService
    services: /^[A-Z][a-zA-Z0-9]+Service\.ts$/,
    // リポジトリ: PascalCaseRepository
    repositories: /^[A-Z][a-zA-Z0-9]+Repository\.ts$/,
    // ユーティリティ: camelCase
    utilities: /^[a-z][a-zA-Z0-9]+\.ts$/,
    // 設定: camelCase or PascalCase
    configs: /^[a-zA-Z][a-zA-Z0-9]+\.ts$/,
    // テスト: *.test.ts or *.spec.ts
    tests: /\.(test|spec)\.tsx?$/,
  },

  /**
   * 変数名規則
   */
  variables: {
    // 定数: UPPER_SNAKE_CASE
    constants: /^[A-Z][A-Z0-9_]*$/,
    // ローカル変数: camelCase
    locals: /^[a-z][a-zA-Z0-9]*$/,
    // プライベートメンバー: _camelCase or camelCase
    privateMembers: /^_?[a-z][a-zA-Z0-9]*$/,
    // パブリックメンバー: camelCase
    publicMembers: /^[a-z][a-zA-Z0-9]*$/,
  },

  /**
   * 関数名規則
   */
  functions: {
    // 通常の関数: camelCase
    regular: /^[a-z][a-zA-Z0-9]*$/,
    // イベントハンドラー: handleXxx or onXxx
    eventHandlers: /^(handle|on)[A-Z][a-zA-Z0-9]*$/,
    // ゲッター: getXxx or isXxx or hasXxx
    getters: /^(get|is|has)[A-Z][a-zA-Z0-9]*$/,
    // セッター: setXxx
    setters: /^set[A-Z][a-zA-Z0-9]*$/,
    // バリデーター: validateXxx or isValidXxx
    validators: /^(validate|isValid)[A-Z][a-zA-Z0-9]*$/,
  },

  /**
   * クラス名規則
   */
  classes: {
    // サービスクラス: XxxService
    services: /^[A-Z][a-zA-Z0-9]+Service$/,
    // リポジトリクラス: XxxRepository
    repositories: /^[A-Z][a-zA-Z0-9]+Repository$/,
    // コントローラークラス: XxxController
    controllers: /^[A-Z][a-zA-Z0-9]+Controller$/,
    // モデルクラス: PascalCase
    models: /^[A-Z][a-zA-Z0-9]+$/,
    // 基底クラス: XxxBase or BaseXxx
    base: /^([A-Z][a-zA-Z0-9]+Base|Base[A-Z][a-zA-Z0-9]+)$/,
  },

  /**
   * インターフェース名規則
   */
  interfaces: {
    // 通常のインターフェース: IXxx or XxxInterface
    regular: /^(I[A-Z][a-zA-Z0-9]+|[A-Z][a-zA-Z0-9]+Interface)$/,
    // Propsインターフェース: XxxProps
    props: /^[A-Z][a-zA-Z0-9]+Props$/,
    // 設定インターフェース: XxxConfig
    configs: /^[A-Z][a-zA-Z0-9]+Config$/,
    // オプションインターフェース: XxxOptions
    options: /^[A-Z][a-zA-Z0-9]+Options$/,
  },

  /**
   * 型名規則
   */
  types: {
    // 通常の型: PascalCase
    regular: /^[A-Z][a-zA-Z0-9]+$/,
    // ユニオン型: XxxType
    unions: /^[A-Z][a-zA-Z0-9]+Type$/,
    // エイリアス型: PascalCase
    aliases: /^[A-Z][a-zA-Z0-9]+$/,
  },

  /**
   * APIエンドポイント規則
   */
  endpoints: {
    // RESTful: /resource/:id
    rest: /^\/[a-z][a-z0-9-]*(\/:[a-z]+)?$/,
    // アクション: /resource/action
    actions: /^\/[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/,
  },

  /**
   * データベース規則
   */
  database: {
    // テーブル名: snake_case（複数形）
    tables: /^[a-z][a-z0-9_]*s$/,
    // カラム名: snake_case
    columns: /^[a-z][a-z0-9_]*$/,
    // インデックス名: idx_table_column
    indexes: /^idx_[a-z][a-z0-9_]*$/,
  },
} as const

/**
 * 命名規則のバリデーター
 */
export class NamingValidator {
  /**
   * ファイル名の検証
   */
  static validateFileName(
    fileName: string,
    type: keyof typeof NAMING_CONVENTIONS.files
  ): boolean {
    return NAMING_CONVENTIONS.files[type].test(fileName)
  }

  /**
   * 変数名の検証
   */
  static validateVariableName(
    variableName: string,
    type: keyof typeof NAMING_CONVENTIONS.variables
  ): boolean {
    return NAMING_CONVENTIONS.variables[type].test(variableName)
  }

  /**
   * 関数名の検証
   */
  static validateFunctionName(
    functionName: string,
    type: keyof typeof NAMING_CONVENTIONS.functions
  ): boolean {
    return NAMING_CONVENTIONS.functions[type].test(functionName)
  }

  /**
   * クラス名の検証
   */
  static validateClassName(
    className: string,
    type: keyof typeof NAMING_CONVENTIONS.classes
  ): boolean {
    return NAMING_CONVENTIONS.classes[type].test(className)
  }

  /**
   * 推奨名を生成
   */
  static suggestName(input: string, targetCase: 'camel' | 'pascal' | 'snake' | 'kebab'): string {
    // スネークケース、ケバブケース、スペースで分割
    const words = input.split(/[-_\s]+/)

    switch (targetCase) {
      case 'camel':
        return words
          .map((word, index) =>
            index === 0
              ? word.toLowerCase()
              : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join('')

      case 'pascal':
        return words
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join('')

      case 'snake':
        return words.map(word => word.toLowerCase()).join('_')

      case 'kebab':
        return words.map(word => word.toLowerCase()).join('-')

      default:
        return input
    }
  }
}

/**
 * 命名規則の自動修正
 */
export class NamingFixer {
  /**
   * サービスクラス名を修正
   */
  static fixServiceName(name: string): string {
    const base = NamingValidator.suggestName(name, 'pascal')
    return base.endsWith('Service') ? base : `${base}Service`
  }

  /**
   * リポジトリクラス名を修正
   */
  static fixRepositoryName(name: string): string {
    const base = NamingValidator.suggestName(name, 'pascal')
    return base.endsWith('Repository') ? base : `${base}Repository`
  }

  /**
   * テーブル名を修正
   */
  static fixTableName(name: string): string {
    let snake = NamingValidator.suggestName(name, 'snake')
    // 複数形にする
    if (!snake.endsWith('s')) {
      snake += 's'
    }
    return snake
  }

  /**
   * カラム名を修正
   */
  static fixColumnName(name: string): string {
    return NamingValidator.suggestName(name, 'snake')
  }
}