/**
 * HTMLパーサー（リファクタ済み）
 * 
 * 責任分離により以下のサービスに分割：
 * - HtmlExtractor: DOM要素からのデータ抽出
 * - UrlNormalizer: URL正規化処理  
 * - HtmlStructureParser: 構造化データの解析
 * - HtmlTextProcessor: テキスト変換処理
 * 
 * 既存コードとの互換性のためファサードパターンを使用
 */

import { HtmlParserFacade } from './HtmlParserFacade';

/**
 * 既存コードとの互換性を保つためのラッパークラス
 */
export class HtmlParser extends HtmlParserFacade {
  constructor(html: string) {
    super(html);
  }
}