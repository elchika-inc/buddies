import { DataCleaner } from '../src/utils/data-cleaner';

describe('DataCleaner', () => {
  describe('normalizeAge', () => {
    test('should normalize age from text', () => {
      expect(DataCleaner.normalizeAge('3歳')).toBe(3);
      expect(DataCleaner.normalizeAge('2年')).toBe(2);
      expect(DataCleaner.normalizeAge('6ヶ月')).toBe(0.5);
      expect(DataCleaner.normalizeAge('生後3ヶ月')).toBe(0.25);
      expect(DataCleaner.normalizeAge('子猫')).toBe(0.5);
      expect(DataCleaner.normalizeAge('')).toBe(0);
    });
  });

  describe('normalizeGender', () => {
    test('should normalize gender from various inputs', () => {
      expect(DataCleaner.normalizeGender('♂')).toBe('男の子');
      expect(DataCleaner.normalizeGender('♀')).toBe('女の子');
      expect(DataCleaner.normalizeGender('オス')).toBe('男の子');
      expect(DataCleaner.normalizeGender('メス')).toBe('女の子');
      expect(DataCleaner.normalizeGender('male')).toBe('男の子');
      expect(DataCleaner.normalizeGender('female')).toBe('女の子');
      expect(DataCleaner.normalizeGender('?')).toBe('不明');
      expect(DataCleaner.normalizeGender('')).toBe('不明');
    });
  });

  describe('normalizePrefecture', () => {
    test('should extract prefecture and city', () => {
      const result1 = DataCleaner.normalizePrefecture('東京都新宿区');
      expect(result1.prefecture).toBe('東京都');
      expect(result1.city).toBe('新宿区');

      const result2 = DataCleaner.normalizePrefecture('神奈川県横浜市港北区');
      expect(result2.prefecture).toBe('神奈川県');
      expect(result2.city).toBe('横浜市港北区');

      const result3 = DataCleaner.normalizePrefecture('大阪');
      expect(result3.prefecture).toBe('大阪府');
    });
  });

  describe('normalizeWeight', () => {
    test('should extract weight from text', () => {
      expect(DataCleaner.normalizeWeight('3.5kg')).toBe(3.5);
      expect(DataCleaner.normalizeWeight('5 kg')).toBe(5);
      expect(DataCleaner.normalizeWeight('体重: 2.8kg')).toBe(2.8);
      expect(DataCleaner.normalizeWeight('不明')).toBeUndefined();
      expect(DataCleaner.normalizeWeight('')).toBeUndefined();
    });
  });

  describe('estimateDogSize', () => {
    test('should estimate dog size by weight', () => {
      expect(DataCleaner.estimateDogSize('', 5)).toBe('小型犬');
      expect(DataCleaner.estimateDogSize('', 15)).toBe('中型犬');
      expect(DataCleaner.estimateDogSize('', 30)).toBe('大型犬');
      expect(DataCleaner.estimateDogSize('', 50)).toBe('超大型犬');
    });

    test('should estimate dog size by breed', () => {
      expect(DataCleaner.estimateDogSize('チワワ')).toBe('小型犬');
      expect(DataCleaner.estimateDogSize('ゴールデンレトリバー')).toBe('大型犬');
      expect(DataCleaner.estimateDogSize('グレートデーン')).toBe('超大型犬');
      expect(DataCleaner.estimateDogSize('不明')).toBe('中型犬');
    });
  });

  describe('estimateCoatLength', () => {
    test('should estimate coat length', () => {
      expect(DataCleaner.estimateCoatLength('ペルシャ', '')).toBe('長毛');
      expect(DataCleaner.estimateCoatLength('', 'ふわふわの毛')).toBe('長毛');
      expect(DataCleaner.estimateCoatLength('アメショー', '')).toBe('短毛');
      expect(DataCleaner.estimateCoatLength('雑種', '短い毛')).toBe('短毛');
    });
  });

  describe('validateImageUrl', () => {
    test('should validate image URLs', () => {
      expect(DataCleaner.validateImageUrl('https://example.com/cat.jpg')).toBe(true);
      expect(DataCleaner.validateImageUrl('https://example.com/dog.png')).toBe(true);
      expect(DataCleaner.validateImageUrl('https://example.com/pet.gif')).toBe(true);
      expect(DataCleaner.validateImageUrl('https://example.com/page.html')).toBe(false);
      expect(DataCleaner.validateImageUrl('invalid-url')).toBe(false);
      expect(DataCleaner.validateImageUrl('')).toBe(false);
    });
  });

  describe('normalizeBoolean', () => {
    test('should normalize boolean values', () => {
      expect(DataCleaner.normalizeBoolean('済')).toBe(true);
      expect(DataCleaner.normalizeBoolean('ワクチン接種済')).toBe(true);
      expect(DataCleaner.normalizeBoolean('yes')).toBe(true);
      expect(DataCleaner.normalizeBoolean('○')).toBe(true);
      
      expect(DataCleaner.normalizeBoolean('未')).toBe(false);
      expect(DataCleaner.normalizeBoolean('なし')).toBe(false);
      expect(DataCleaner.normalizeBoolean('no')).toBe(false);
      expect(DataCleaner.normalizeBoolean('×')).toBe(false);
      
      expect(DataCleaner.normalizeBoolean('不明')).toBeUndefined();
      expect(DataCleaner.normalizeBoolean('')).toBeUndefined();
    });
  });

  describe('normalizeArray', () => {
    test('should normalize comma-separated text to array', () => {
      expect(DataCleaner.normalizeArray('人懐っこい,活発,甘えん坊')).toEqual(['人懐っこい', '活発', '甘えん坊']);
      expect(DataCleaner.normalizeArray('おとなしい・穏やか・人見知り')).toEqual(['おとなしい', '穏やか', '人見知り']);
      expect(DataCleaner.normalizeArray('やんちゃ')).toEqual(['やんちゃ']);
      expect(DataCleaner.normalizeArray('')).toEqual([]);
    });
  });

  describe('cleanText', () => {
    test('should clean text properly', () => {
      expect(DataCleaner.cleanText('  多重  スペース  ')).toBe('多重 スペース');
      expect(DataCleaner.cleanText('改行\n\n\nあり\r\n文章')).toBe('改行\nあり\n文章');
      expect(DataCleaner.cleanText('  ')).toBe('');
    });
  });
});