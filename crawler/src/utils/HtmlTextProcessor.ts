/**
 * HTMLテキストの正規化・変換処理専門クラス
 */

export class HtmlTextProcessor {
  /**
   * 安全な数値変換
   */
  static parseNumber(value: string | null): number | null {
    if (!value) return null;
    
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * 安全な整数変換
   */
  static parseInteger(value: string | null): number | null {
    if (!value) return null;
    
    const cleaned = value.replace(/[^\d-]/g, '');
    const parsed = parseInt(cleaned, 10);
    
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * 日付文字列の正規化
   */
  static parseDate(dateString: string | null): string | null {
    if (!dateString) return null;

    try {
      // 様々な日本語の日付形式に対応
      const cleanedDate = dateString
        .replace(/年|月|日/g, '-')
        .replace(/--+/g, '-')
        .replace(/-$/, '')
        .trim();

      const date = new Date(cleanedDate);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch {
      return null;
    }
  }

  /**
   * HTMLエンティティのデコード
   */
  static decodeHtmlEntities(text: string): string {
    if (!text) return text;
    
    const entityMap: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
      '&copy;': '©',
      '&reg;': '®',
      '&trade;': '™',
    };

    return text.replace(/&[a-zA-Z0-9#]+;/g, (match) => {
      return entityMap[match] || match;
    });
  }

  /**
   * テキストのクリーンアップ
   */
  static cleanText(text: string | null): string {
    if (!text) return '';
    
    return this.decodeHtmlEntities(text)
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 改行を正規化
   */
  static normalizeLineBreaks(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n+/g, '\n')
      .trim();
  }

  /**
   * 価格文字列を数値に変換
   */
  static parsePrice(priceString: string | null): number | null {
    if (!priceString) return null;

    // 価格に関する文字を除去して数値のみを抽出
    const cleaned = priceString
      .replace(/[円¥$,\s]/g, '')
      .replace(/[^\d.]/g, '');

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * 年齢文字列を数値に変換
   */
  static parseAge(ageString: string | null): number | null {
    if (!ageString) return null;

    // 年齢に関する文字を除去
    const cleaned = ageString
      .replace(/[歳才年月日週]/g, '')
      .replace(/[^\d.]/g, '');

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * カテゴリやタグの正規化
   */
  static normalizeCategory(category: string | null): string | null {
    if (!category) return null;

    return category
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
  }

  /**
   * 電話番号の正規化
   */
  static normalizePhoneNumber(phone: string | null): string | null {
    if (!phone) return null;

    // 数字とハイフンのみを残す
    const cleaned = phone.replace(/[^\d-]/g, '');
    
    // 基本的な電話番号のパターンをチェック
    if (cleaned.match(/^\d{2,4}-\d{2,4}-\d{4}$/)) {
      return cleaned;
    }

    // ハイフンなしの場合は自動挿入を試行
    if (cleaned.match(/^\d{10,11}$/)) {
      if (cleaned.length === 10) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
      } else if (cleaned.length === 11) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
      }
    }

    return cleaned || null;
  }

  /**
   * メールアドレスの抽出
   */
  static extractEmail(text: string | null): string | null {
    if (!text) return null;

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex);
    
    return matches && matches.length > 0 ? matches[0] : null;
  }

  /**
   * ブール値の解析
   */
  static parseBoolean(value: string | null): boolean | null {
    if (!value) return null;

    const normalized = value.toLowerCase().trim();
    const truthyValues = ['true', '1', 'yes', 'on', 'はい', '有り', '○', '✓'];
    const falsyValues = ['false', '0', 'no', 'off', 'いいえ', '無し', '×', ''];

    if (truthyValues.includes(normalized)) return true;
    if (falsyValues.includes(normalized)) return false;

    return null;
  }
}