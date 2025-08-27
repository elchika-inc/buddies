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

    // ペットリストを取得
    const selector = petType === 'dog' 
      ? '.dog-list-item, .pet-item' 
      : '.cat-list-item, .pet-item';

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
      imageUrl: this.extractImageUrl($),
      personality: this.extractPersonality($),
      healthNotes: this.extractHealthNotes($),
      requirements: this.extractRequirements($),
      goodWith: this.extractGoodWith($),
      medicalInfo: this.extractMedicalInfo($),
      adoptionFee: this.extractAdoptionFee($),
      shelterContact: this.extractShelterContact($)
    };
  }

  /**
   * リストアイテムからペットデータを抽出
   */
  private extractPetDataFromListItem($: cheerio.CheerioAPI, element: cheerio.Element): ParsedPetData | null {
    const $item = $(element);
    
    // 基本情報の抽出
    const id = $item.attr('data-pet-id') || $item.find('.pet-id').text().trim();
    const name = $item.find('.pet-name, .name').text().trim();
    const detailUrl = $item.find('a').attr('href');

    if (!id || !name || !detailUrl) {
      return null;
    }

    return {
      id,
      name,
      breed: $item.find('.breed, .pet-breed').text().trim() || '不明',
      age: this.parseAge($item.find('.age, .pet-age').text().trim()),
      gender: this.parseGender($item.find('.gender, .pet-gender').text().trim()),
      location: $item.find('.location, .pet-location').text().trim() || '',
      organization: $item.find('.shelter, .organization').text().trim() || '',
      description: $item.find('.description, .pet-description').text().trim() || '',
      thumbnailUrl: $item.find('img').attr('src') || '',
      detailUrl: this.normalizeUrl(detailUrl)
    };
  }

  /**
   * 画像URLを抽出
   */
  private extractImageUrl($: cheerio.CheerioAPI): string {
    return $('.pet-main-image img, .detail-image img, #pet-image').attr('src') || '';
  }

  /**
   * 性格情報を抽出
   */
  private extractPersonality($: cheerio.CheerioAPI): string[] {
    const traits: string[] = [];
    
    $('.personality-trait, .trait-tag, .pet-trait').each((_, el) => {
      const trait = $(el).text().trim();
      if (trait) traits.push(trait);
    });

    // テキストからも抽出
    const personalityText = $('.personality-section, .pet-personality').text();
    if (personalityText) {
      const additionalTraits = this.extractTraitsFromText(personalityText);
      traits.push(...additionalTraits);
    }

    return [...new Set(traits)]; // 重複除去
  }

  /**
   * 健康情報を抽出
   */
  private extractHealthNotes($: cheerio.CheerioAPI): string[] {
    const notes: string[] = [];
    
    $('.health-note, .medical-note').each((_, el) => {
      const note = $(el).text().trim();
      if (note) notes.push(note);
    });

    return notes;
  }

  /**
   * 譲渡条件を抽出
   */
  private extractRequirements($: cheerio.CheerioAPI): string[] {
    const requirements: string[] = [];
    
    $('.requirement-item, .adoption-requirement').each((_, el) => {
      const req = $(el).text().trim();
      if (req) requirements.push(req);
    });

    return requirements;
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
   * 医療情報を抽出
   */
  private extractMedicalInfo($: cheerio.CheerioAPI): string {
    return $('.medical-info, .health-status').text().trim() || '';
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
   * 年齢をパース
   */
  private parseAge(ageText: string): string {
    // "2歳", "子犬", "シニア"などを正規化
    if (ageText.includes('歳')) {
      return ageText;
    } else if (ageText.includes('子犬') || ageText.includes('子猫')) {
      return '0-1歳';
    } else if (ageText.includes('シニア')) {
      return '7歳以上';
    }
    return ageText || '不明';
  }

  /**
   * 性別をパース
   */
  private parseGender(genderText: string): 'male' | 'female' | 'unknown' {
    if (genderText.includes('オス') || genderText.toLowerCase().includes('male')) {
      return 'male';
    } else if (genderText.includes('メス') || genderText.toLowerCase().includes('female')) {
      return 'female';
    }
    return 'unknown';
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

  /**
   * テキストから特性を抽出
   */
  private extractTraitsFromText(text: string): string[] {
    const traits: string[] = [];
    const patterns = [
      /人懐っこい/g,
      /おとなしい/g,
      /活発/g,
      /甘えん坊/g,
      /遊び好き/g,
      /賢い/g,
      /優しい/g
    ];

    patterns.forEach(pattern => {
      if (pattern.test(text)) {
        traits.push(pattern.source);
      }
    });

    return traits;
  }
}