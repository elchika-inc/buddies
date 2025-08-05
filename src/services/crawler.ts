/**
 * ペット保護団体データクローラー
 * 各種保護団体のWebサイトからペット情報を取得
 */

export interface PetData {
  id: string;
  name: string;
  species: '犬' | '猫';
  breed: string;
  age: number;
  gender: '男の子' | '女の子';
  size: '小型' | '中型' | '大型';
  imageUrl: string;
  description: string;
  personality: string[];
  location: string | { prefecture: string; city: string };
  shelterName: string;
  shelterContact?: string;
  adoptionFee?: number;
  createdAt: string;
  // 犬特有の属性
  exerciseLevel?: '高' | '中' | '低';
  walkFrequency?: string;
  trainingLevel?: string;
  goodWithKids?: boolean;
  goodWithOtherDogs?: boolean;
  apartmentFriendly?: boolean;
  needsYard?: boolean;
  // 猫特有の属性
  socialLevel?: '人懐っこい' | '普通' | '人見知り';
  indoorOutdoor?: '完全室内' | '室内外';
  goodWithMultipleCats?: boolean;
  vocalizationLevel?: '静か' | '普通' | 'よく鳴く';
}

export interface CrawlerResult {
  success: boolean;
  data: PetData[];
  errors: string[];
  source: string;
  timestamp: string;
}

/**
 * ペットのこころWebサイトからデータを取得
 */
export class PetHomesCrawler {
  private readonly baseUrl = 'https://www.pet-home.jp';
  
  async crawlDogs(limit: number = 50): Promise<CrawlerResult> {
    try {
      // 実際のAPIエンドポイントまたはスクレイピング実装
      // この例では模擬的な実装
      const mockDogData: PetData[] = [
        {
          id: `dog_${Date.now()}_1`,
          name: 'ポチ',
          species: '犬',
          breed: '柴犬',
          age: 3,
          gender: '男の子',
          size: '中型',
          imageUrl: 'https://example.com/dog1.jpg',
          description: '元気いっぱいで人懐っこい柴犬です。お散歩が大好きで、家族と一緒に過ごすのが幸せです。',
          personality: ['元気', '人懐っこい', '忠実'],
          location: { prefecture: '東京都', city: '世田谷区' },
          shelterName: '東京動物愛護センター',
          shelterContact: '03-1234-5678',
          adoptionFee: 30000,
          createdAt: new Date().toISOString(),
          exerciseLevel: '高',
          walkFrequency: '1日2回',
          trainingLevel: '基本済み',
          goodWithKids: true,
          goodWithOtherDogs: true,
          apartmentFriendly: false,
          needsYard: true
        },
        {
          id: `dog_${Date.now()}_2`,
          name: 'チョコ',
          species: '犬',
          breed: 'トイプードル',
          age: 2,
          gender: '女の子',
          size: '小型',
          imageUrl: 'https://example.com/dog2.jpg',
          description: '甘えん坊で人が大好きなトイプードルです。毛色はチョコレートブラウンで、とても美しい子です。',
          personality: ['甘えん坊', '人懐っこい', '賢い'],
          location: { prefecture: '神奈川県', city: '横浜市' },
          shelterName: 'わんわん保護の会',
          shelterContact: '045-1234-5678',
          adoptionFee: 25000,
          createdAt: new Date().toISOString(),
          exerciseLevel: '中',
          walkFrequency: '1日1-2回',
          trainingLevel: '基本済み',
          goodWithKids: true,
          goodWithOtherDogs: true,
          apartmentFriendly: true,
          needsYard: false
        }
      ];

      return {
        success: true,
        data: mockDogData.slice(0, limit),
        errors: [],
        source: this.baseUrl,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        source: this.baseUrl,
        timestamp: new Date().toISOString()
      };
    }
  }

  async crawlCats(limit: number = 50): Promise<CrawlerResult> {
    try {
      const mockCatData: PetData[] = [
        {
          id: `cat_${Date.now()}_1`,
          name: 'ミケ',
          species: '猫',
          breed: '三毛猫',
          age: 4,
          gender: '女の子',
          size: '中型',
          imageUrl: 'https://example.com/cat1.jpg',
          description: '美しい三毛模様の女の子です。穏やかな性格で、静かな環境を好みます。',
          personality: ['穏やか', '人見知り', '美しい'],
          location: { prefecture: '千葉県', city: '市川市' },
          shelterName: '千葉猫の会',
          shelterContact: '047-1234-5678',
          adoptionFee: 20000,
          createdAt: new Date().toISOString(),
          socialLevel: '人見知り',
          indoorOutdoor: '完全室内',
          goodWithMultipleCats: false,
          vocalizationLevel: '静か'
        },
        {
          id: `cat_${Date.now()}_2`,
          name: 'シロ',
          species: '猫',
          breed: '白猫',
          age: 1,
          gender: '男の子',
          size: '小型',
          imageUrl: 'https://example.com/cat2.jpg',
          description: '真っ白な毛色が美しい若い男の子です。とても人懐っこく、遊ぶのが大好きです。',
          personality: ['人懐っこい', '活発', '甘えん坊'],
          location: { prefecture: '埼玉県', city: 'さいたま市' },
          shelterName: '埼玉動物愛護センター',
          shelterContact: '048-1234-5678',
          adoptionFee: 15000,
          createdAt: new Date().toISOString(),
          socialLevel: '人懐っこい',
          indoorOutdoor: '完全室内',
          goodWithMultipleCats: true,
          vocalizationLevel: '普通'
        }
      ];

      return {
        success: true,
        data: mockCatData.slice(0, limit),
        errors: [],
        source: this.baseUrl,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        source: this.baseUrl,
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * 複数のソースからデータを統合するメインクローラー
 */
export class PetDataCrawler {
  private petHomesCrawler = new PetHomesCrawler();

  async crawlAllPets(dogLimit: number = 50, catLimit: number = 50): Promise<{
    dogs: CrawlerResult;
    cats: CrawlerResult;
  }> {
    const [dogs, cats] = await Promise.all([
      this.petHomesCrawler.crawlDogs(dogLimit),
      this.petHomesCrawler.crawlCats(catLimit)
    ]);

    return { dogs, cats };
  }

  async crawlDogs(limit: number = 50): Promise<CrawlerResult> {
    return await this.petHomesCrawler.crawlDogs(limit);
  }

  async crawlCats(limit: number = 50): Promise<CrawlerResult> {
    return await this.petHomesCrawler.crawlCats(limit);
  }
}

// エクスポートされたインスタンス
export const petDataCrawler = new PetDataCrawler();