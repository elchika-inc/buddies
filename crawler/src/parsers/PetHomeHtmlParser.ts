/**
 * PetHomeのHTMLパース専用クラス
 * 
 * HTMLパース処理のみに特化
 */
import * as cheerio from 'cheerio';
import type { ParsedPetData, DetailedPetData } from '../types/pet';

export class PetHomeHtmlParser {
  /**
   * リストページのHTMLをパース
   */
  parseListPage(html: string, petType: 'dog' | 'cat'): ParsedPetData[] {
    const $ = cheerio.load(html);
    const pets: ParsedPetData[] = [];

    // ペットリストを取得 - Pet-homeの実際の構造
    const selector = 'li.contribute_result';

    $(selector).each((_, element) => {
      const petData = this.extractPetDataFromListItem($, element);
      if (petData) {
        pets.push(petData);
      }
    });

    return pets;
  }

  /**
   * 詳細ページのHTMLをパース
   */
  parseDetailPage(html: string): DetailedPetData {
    const $ = cheerio.load(html);
    
    return {
      breed: this.extractBreed($),
      age: this.extractAge($),
      gender: this.extractGender($),
      location: this.extractLocation($),
      imageUrl: this.extractImageUrl($),
      personality: this.extractPersonality($),
      healthNotes: [],  // 不要
      requirements: [],  // 不要
      goodWith: this.extractGoodWith($),
      medicalInfo: '',  // 不要
      adoptionFee: this.extractAdoptionFee($),
      shelterContact: this.extractShelterContact($)
    };
  }

  /**
   * リストアイテムからペットデータを抽出
   */
  private extractPetDataFromListItem($: cheerio.CheerioAPI, element: cheerio.Element): ParsedPetData | null {
    const $item = $(element);
    
    // Pet-homeの実際の構造に基づいて抽出
    const $inner = $item.find('.inner');
    const $link = $inner.find('h3.title a');
    const detailUrl = $link.attr('href');
    
    if (!detailUrl) {
      return null;
    }
    
    // URLからIDを抽出（例: /dogs/tokyo/pn12345/ -> pn12345）
    const idMatch = detailUrl.match(/\/pn(\d+)\//);
    const id = idMatch ? `pn${idMatch[1]}` : '';
    
    // タイトル（名前として使用）
    const name = $link.text().trim() || '名前なし';
    
    // 画像URL
    const thumbnailUrl = $inner.find('img').attr('src') || '';
    
    // その他の情報（テキストから抽出）
    const allText = $inner.text().replace(/\s+/g, ' ').trim();
    
    // 簡単な説明（テキストの一部）
    const description = allText.substring(0, 100);

    return {
      id,
      name,
      breed: '不明', // 後で詳細ページから取得
      age: '不明',
      gender: 'unknown',
      location: '',
      organization: '',
      description,
      thumbnailUrl,
      detailUrl: this.normalizeUrl(detailUrl)
    };
  }

  /**
   * 犬種・猫種を抽出
   */
  private extractBreed($: cheerio.CheerioAPI): string {
    // Pet-homeの実際の構造: <dt>種類</dt><dd><a href="/dogs/cg_1060/">柴犬</a></dd>
    let breed = '';
    
    // パターン1: dt:contains("種類") の次のdd要素
    const breedElement = $('dt:contains("種類")').next('dd');
    if (breedElement.length > 0) {
      breed = breedElement.text().trim();
    }
    
    // パターン2: バックアップ
    if (!breed) {
      // class="top_row inline"を持つdt/ddペアを探す
      $('dt.top_row.inline').each((_, el) => {
        const $dt = $(el);
        if ($dt.text().trim() === '種類') {
          breed = $dt.next('dd').text().trim();
          return false; // ループを終了
        }
      });
    }
    
    return breed || '不明';
  }

  /**
   * 年齢を抽出
   */
  private extractAge($: cheerio.CheerioAPI): string {
    // Pet-homeの実際の構造: <dt>年齢</dt><dd>成犬（1歳）</dd>
    let age = '';
    
    // パターン1: dt:contains("年齢") の次のdd要素
    const ageElement = $('dt:contains("年齢")').next('dd');
    if (ageElement.length > 0) {
      // テキスト全体を取得（リンクのテキストも含む）
      age = ageElement.text().replace(/\s+/g, ' ').trim();
    }
    
    // パターン2: バックアップ（class="inline"を持つdt/ddペア）
    if (!age) {
      $('dt.inline').each((_, el) => {
        const $dt = $(el);
        if ($dt.text().trim() === '年齢') {
          const $dd = $dt.next('dd');
          age = $dd.text().replace(/\s+/g, ' ').trim();
          return false; // ループを終了
        }
      });
    }
    
    // 整形（余分な空白を削除、括弧内を維持）
    if (age) {
      // 例: "成犬 （1歳）" -> "成犬 (1歳)"
      age = age.replace(/（/g, '(').replace(/）/g, ')');
      age = age.replace(/\s*\(\s*/g, ' (').replace(/\s*\)\s*/g, ')');
    }
    
    return age || '不明';
  }

  /**
   * 性別を抽出
   */
  private extractGender($: cheerio.CheerioAPI): 'male' | 'female' | 'unknown' {
    // Pet-homeの実際の構造: <dt>雄雌</dt><dd>♂ オス</dd>
    let genderText = '';
    
    // パターン1: dt:contains("雄雌") の次のdd要素
    const genderElement = $('dt:contains("雄雌")').next('dd');
    if (genderElement.length > 0) {
      genderText = genderElement.text().trim();
    }
    
    // パターン2: dt:contains("性別") の次のdd要素（別パターン）
    if (!genderText) {
      const altGenderElement = $('dt:contains("性別")').next('dd');
      if (altGenderElement.length > 0) {
        genderText = altGenderElement.text().trim();
      }
    }
    
    // パターン3: バックアップ（class="inline"を持つdt/ddペア）
    if (!genderText) {
      $('dt.inline').each((_, el) => {
        const $dt = $(el);
        const dtText = $dt.text().trim();
        if (dtText === '雄雌' || dtText === '性別') {
          genderText = $dt.next('dd').text().trim();
          return false; // ループを終了
        }
      });
    }
    
    // テキストから性別を判定
    if (genderText) {
      // オス、♂、male などを判定
      if (genderText.includes('オス') || 
          genderText.includes('♂') || 
          genderText.toLowerCase().includes('male') ||
          genderText.includes('男の子')) {
        return 'male';
      }
      // メス、♀、female などを判定
      if (genderText.includes('メス') || 
          genderText.includes('♀') || 
          genderText.toLowerCase().includes('female') ||
          genderText.includes('女の子')) {
        return 'female';
      }
    }
    
    return 'unknown';
  }

  /**
   * 現在所在地を抽出
   */
  private extractLocation($: cheerio.CheerioAPI): string {
    // Pet-homeの実際の構造: <dt>現在所在地</dt><dd><a href="/dogs/ibaraki/">茨城県</a> 常総市</dd>
    let location = '';
    
    // パターン1: dt:contains("現在所在地") の次のdd要素
    const locationElement = $('dt:contains("現在所在地")').next('dd');
    if (locationElement.length > 0) {
      // テキスト全体を取得（リンクのテキストも含む）
      location = locationElement.text().replace(/\s+/g, ' ').trim();
    }
    
    // パターン2: バックアップ（class="top_row inline"を持つdt/ddペア）
    if (!location) {
      $('dt.top_row.inline').each((_, el) => {
        const $dt = $(el);
        if ($dt.text().trim() === '現在所在地') {
          const $dd = $dt.next('dd');
          location = $dd.text().replace(/\s+/g, ' ').trim();
          return false; // ループを終了
        }
      });
    }
    
    // パターン3: バックアップ（一般的なdt/ddペア）
    if (!location) {
      $('dt').each((_, el) => {
        const $dt = $(el);
        const dtText = $dt.text().trim();
        if (dtText === '現在所在地' || dtText === '所在地') {
          location = $dt.next('dd').text().replace(/\s+/g, ' ').trim();
          return false; // ループを終了
        }
      });
    }
    
    return location || '';
  }

  /**
   * 画像URLを抽出
   */
  private extractImageUrl($: cheerio.CheerioAPI): string {
    // Pet-homeの実際の画像セレクタを試す
    let imageUrl = '';
    
    // パターン1: メインの画像
    const mainImage = $('.main_photo img, .photo_main img, #photo_main img').attr('src');
    if (mainImage) {
      imageUrl = mainImage;
    }
    
    // パターン2: 他の可能性
    if (!imageUrl) {
      const img = $('img[src*="/user_file/"]').first().attr('src');
      if (img) {
        imageUrl = img;
      }
    }
    
    // パターン3: さらに一般的なセレクタ
    if (!imageUrl) {
      imageUrl = $('.pet-main-image img, .detail-image img, #pet-image').attr('src') || '';
    }
    
    return imageUrl;
  }

  /**
   * 性格情報を抽出
   */
  private extractPersonality($: cheerio.CheerioAPI): string[] {
    const traits: string[] = [];
    
    // PetHomeの実際の構造から性格・特徴を取得
    // セレクタ1: 性格・特徴のタイトルの次の要素
    const personalityInfo = $('div.list_title:contains("性格・特徴")').next('p.info').text().trim();
    
    if (personalityInfo) {
      // 性格・特徴のテキスト全体を1つの要素として保存
      traits.push(personalityInfo);
      return traits;
    }
    
    // セレクタ2: contribute_content_wrapの構造から取得（バックアップ）
    $('.contribute_content_wrap').each((_, wrap) => {
      const $wrap = $(wrap);
      const title = $wrap.find('.list_title').text().trim();
      if (title === '性格・特徴') {
        const info = $wrap.find('.info').text().trim();
        if (info) {
          traits.push(info);
          return false; // eachループを終了
        }
      }
    });

    return traits;
  }



  /**
   * 相性情報を抽出
   */
  private extractGoodWith($: cheerio.CheerioAPI): string[] {
    const compatibility: string[] = [];
    
    $('.good-with-item, .compatibility').each((_, el) => {
      const item = $(el).text().trim();
      if (item) compatibility.push(item);
    });

    return compatibility;
  }


  /**
   * 譲渡費用を抽出
   */
  private extractAdoptionFee($: cheerio.CheerioAPI): number | null {
    const feeText = $('.adoption-fee, .fee').text();
    const match = feeText.match(/[\d,]+/);
    
    if (match) {
      return parseInt(match[0].replace(/,/g, ''), 10);
    }
    
    return null;
  }

  /**
   * シェルター連絡先を抽出
   */
  private extractShelterContact($: cheerio.CheerioAPI): string {
    return $('.shelter-contact, .contact-info').text().trim() || '';
  }


  /**
   * URLを正規化
   */
  private normalizeUrl(url: string): string {
    if (url.startsWith('http')) {
      return url;
    }
    return `https://www.pet-home.jp${url}`;
  }

}