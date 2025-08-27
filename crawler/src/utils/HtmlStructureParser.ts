/**
 * HTML構造化データ（テーブル・リスト）の解析専門クラス
 */

export class HtmlStructureParser {
  constructor(private readonly document: Document) {}

  /**
   * テーブルデータを構造化して取得
   */
  getTableData(tableSelector: string): Array<Record<string, string>> {
    try {
      const table = this.document.querySelector(tableSelector);
      if (!table) return [];

      const rows = table.querySelectorAll('tr');
      if (rows.length < 2) return []; // ヘッダー行がない

      // ヘッダー行を取得
      const headerRow = rows[0];
      if (!headerRow) return [];
      
      const headers = Array.from(headerRow.querySelectorAll('th, td'))
        .map(cell => (cell as HTMLElement).textContent?.trim() || '');

      // データ行を処理
      const data: Array<Record<string, string>> = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        
        const rowData = this.parseTableRow(row, headers);
        if (Object.keys(rowData).length > 0) {
          data.push(rowData);
        }
      }

      return data;
    } catch (error) {
      console.warn(`Failed to get table data for selector "${tableSelector}":`, error);
      return [];
    }
  }

  /**
   * テーブルの行をパース
   */
  private parseTableRow(row: Element, headers: string[]): Record<string, string> {
    const cells = Array.from(row.querySelectorAll('td'));
    const rowData: Record<string, string> = {};

    cells.forEach((cell, index) => {
      const header = headers[index];
      if (header) {
        rowData[header] = (cell as HTMLElement).textContent?.trim() || '';
      }
    });

    return rowData;
  }

  /**
   * リストアイテムを配列で取得
   */
  getListItems(listSelector: string): string[] {
    try {
      const list = this.document.querySelector(listSelector);
      if (!list) return [];

      const items = list.querySelectorAll('li');
      return Array.from(items)
        .map(item => (item as HTMLElement).textContent?.trim())
        .filter((text): text is string => Boolean(text && text.length > 0));
    } catch (error) {
      console.warn(`Failed to get list items for selector "${listSelector}":`, error);
      return [];
    }
  }

  /**
   * 定義リスト（dl/dt/dd）を構造化して取得
   */
  getDefinitionList(listSelector: string): Record<string, string> {
    try {
      const definitionList = this.document.querySelector(listSelector);
      if (!definitionList) return {};

      const result: Record<string, string> = {};
      const items = definitionList.querySelectorAll('dt, dd');
      
      let currentTerm = '';
      for (const item of Array.from(items)) {
        const tagName = item.tagName.toLowerCase();
        const text = (item as HTMLElement).textContent?.trim() || '';

        if (tagName === 'dt') {
          currentTerm = text;
        } else if (tagName === 'dd' && currentTerm) {
          result[currentTerm] = text;
          currentTerm = ''; // リセット
        }
      }

      return result;
    } catch (error) {
      console.warn(`Failed to get definition list for selector "${listSelector}":`, error);
      return {};
    }
  }

  /**
   * フォームフィールドを構造化して取得
   */
  getFormData(formSelector: string): Record<string, string> {
    try {
      const form = this.document.querySelector(formSelector);
      if (!form) return {};

      const result: Record<string, string> = {};
      const inputs = form.querySelectorAll('input, select, textarea');

      for (const input of Array.from(inputs)) {
        const element = input as HTMLInputElement;
        const name = element.getAttribute('name');
        const value = element.getAttribute('value') || element.textContent || '';

        if (name) {
          result[name] = value.trim();
        }
      }

      return result;
    } catch (error) {
      console.warn(`Failed to get form data for selector "${formSelector}":`, error);
      return {};
    }
  }

  /**
   * メタデータを取得（metaタグから）
   */
  getMetadata(): Record<string, string> {
    try {
      const result: Record<string, string> = {};
      const metaTags = this.document.querySelectorAll('meta[name], meta[property]');

      for (const meta of Array.from(metaTags)) {
        const name = meta.getAttribute('name') || meta.getAttribute('property');
        const content = meta.getAttribute('content');

        if (name && content) {
          result[name] = content.trim();
        }
      }

      return result;
    } catch (error) {
      console.warn('Failed to get metadata:', error);
      return {};
    }
  }

  /**
   * ページタイトルを取得
   */
  getTitle(): string | null {
    try {
      const titleElement = this.document.querySelector('title');
      return titleElement?.textContent?.trim() || null;
    } catch (error) {
      console.warn('Failed to get title:', error);
      return null;
    }
  }
}