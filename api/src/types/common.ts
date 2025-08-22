/**
 * 共通型定義
 */

/**
 * JSONシリアライズ可能な値の型定義
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/**
 * オブジェクトのキー変換用の型
 */
export type CamelCase<S extends string> = S extends `${infer P}_${infer Q}`
  ? `${Lowercase<P>}${Capitalize<CamelCase<Q>>}`
  : S;

/**
 * オブジェクトのキーをCamelCaseに変換する型
 */
export type CamelCaseKeys<T> = T extends Array<infer U>
  ? Array<CamelCaseKeys<U>>
  : T extends Record<string, unknown>
  ? {
      [K in keyof T as CamelCase<string & K>]: CamelCaseKeys<T[K]>;
    }
  : T;

/**
 * 環境変数の追加プロパティ用の型
 */
export type EnvProperty = 
  | string 
  | undefined 
  | { fetch: (request: Request) => Promise<Response> }
  | unknown;