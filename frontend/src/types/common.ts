// 共通の型定義とユーティリティ型

// 配列の安全なアクセスのための型
export type SafeArray<T> = readonly T[];

// オプショナルプロパティの厳密な型定義
export type StrictOptional<T, K extends keyof T> = T & {
  [P in K]?: T[P] | undefined;
};

// null/undefined安全なアクセサー
export type NonNullable<T> = T extends null | undefined ? never : T;

// 配列から要素の型を安全に抽出
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

// レコード型の安全なキーアクセス
export type SafeRecord<K extends string | number | symbol, V> = {
  [P in K]: V;
} & Record<string, V | undefined>;

// 未知のオブジェクトに対する型ガード
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// 文字列かどうかの型ガード
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// 数値かどうかの型ガード
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

// 配列かどうかの型ガード
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

// プロパティの存在をチェックする型ガード
export function hasProperty<K extends PropertyKey>(
  obj: object,
  key: K
): obj is object & Record<K, unknown> {
  return key in obj;
}

// 配列の安全なアクセスヘルパー
export function safeArrayAccess<T>(
  array: T[], 
  index: number
): T | undefined {
  return array[index];
}

// オブジェクトプロパティの安全なアクセス
export function safePropertyAccess<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  key: K
): T[K] | undefined {
  return obj[key];
}