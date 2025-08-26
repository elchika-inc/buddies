/**
 * 型ガードのテスト
 */

import {
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isNullOrUndefined,
  isDefined,
  isPetType,
  isGender,
  isRawPetRecord,
  isCountResult,
  isPetStatistics,
  isServiceHealth,
  ensureArray,
  safeGet,
  safeCast
} from '../type-guards';

describe('基本型ガード', () => {
  describe('isString', () => {
    it('文字列の場合trueを返す', () => {
      expect(isString('test')).toBe(true);
      expect(isString('')).toBe(true);
    });

    it('文字列以外の場合falseを返す', () => {
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString({})).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('数値の場合trueを返す', () => {
      expect(isNumber(123)).toBe(true);
      expect(isNumber(0)).toBe(true);
      expect(isNumber(-1)).toBe(true);
      expect(isNumber(1.5)).toBe(true);
    });

    it('数値以外の場合falseを返す', () => {
      expect(isNumber('123')).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
      expect(isNumber(NaN)).toBe(false);
    });
  });

  describe('isObject', () => {
    it('オブジェクトの場合trueを返す', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
    });

    it('オブジェクト以外の場合falseを返す', () => {
      expect(isObject(null)).toBe(false);
      expect(isObject([])).toBe(false);
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
    });
  });

  describe('isArray', () => {
    it('配列の場合trueを返す', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
    });

    it('配列以外の場合falseを返す', () => {
      expect(isArray({})).toBe(false);
      expect(isArray('string')).toBe(false);
      expect(isArray(null)).toBe(false);
    });
  });
});

describe('特定型ガード', () => {
  describe('isPetType', () => {
    it('有効なペットタイプの場合trueを返す', () => {
      expect(isPetType('dog')).toBe(true);
      expect(isPetType('cat')).toBe(true);
    });

    it('無効なペットタイプの場合falseを返す', () => {
      expect(isPetType('bird')).toBe(false);
      expect(isPetType('Dog')).toBe(false);
      expect(isPetType(null)).toBe(false);
    });
  });

  describe('isGender', () => {
    it('有効な性別の場合trueを返す', () => {
      expect(isGender('male')).toBe(true);
      expect(isGender('female')).toBe(true);
      expect(isGender('unknown')).toBe(true);
    });

    it('無効な性別の場合falseを返す', () => {
      expect(isGender('other')).toBe(false);
      expect(isGender('Male')).toBe(false);
      expect(isGender(null)).toBe(false);
    });
  });
});

describe('モデル型ガード', () => {
  describe('isRawPetRecord', () => {
    const validPet = {
      id: 'pet123',
      type: 'dog',
      name: 'Max',
      prefecture: 'Tokyo',
      source_url: 'https://example.com',
      has_jpeg: 1,
      has_webp: 0,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    };

    it('有効なペットレコードの場合trueを返す', () => {
      expect(isRawPetRecord(validPet)).toBe(true);
    });

    it('必須フィールドが欠けている場合falseを返す', () => {
      const invalidPet = { ...validPet };
      delete (invalidPet as Record<string, unknown>).id;
      expect(isRawPetRecord(invalidPet)).toBe(false);
    });

    it('型が間違っている場合falseを返す', () => {
      expect(isRawPetRecord({ ...validPet, type: 'bird' })).toBe(false);
      expect(isRawPetRecord({ ...validPet, has_jpeg: '1' })).toBe(false);
    });

    it('オプショナルフィールドがあっても動作する', () => {
      const petWithOptional = {
        ...validPet,
        breed: 'Shiba Inu',
        age: 3,
        gender: 'male' as const,
        city: 'Shibuya'
      };
      expect(isRawPetRecord(petWithOptional)).toBe(true);
    });
  });

  describe('isCountResult', () => {
    it('有効なカウント結果の場合trueを返す', () => {
      expect(isCountResult({ total: 10 })).toBe(true);
      expect(isCountResult({ total: 0 })).toBe(true);
    });

    it('無効なカウント結果の場合falseを返す', () => {
      expect(isCountResult({ total: '10' })).toBe(false);
      expect(isCountResult({ count: 10 })).toBe(false);
      expect(isCountResult(null)).toBe(false);
    });
  });

  describe('isPetStatistics', () => {
    const validStats = {
      totalPets: 100,
      totalDogs: 60,
      totalCats: 40,
      petsWithJpeg: 80,
      petsWithWebp: 70,
      dogsWithJpeg: 50,
      dogsWithWebp: 45,
      catsWithJpeg: 30,
      catsWithWebp: 25
    };

    it('有効な統計の場合trueを返す', () => {
      expect(isPetStatistics(validStats)).toBe(true);
    });

    it('フィールドが欠けている場合falseを返す', () => {
      const invalidStats = { ...validStats };
      delete (invalidStats as Record<string, unknown>).totalPets;
      expect(isPetStatistics(invalidStats)).toBe(false);
    });
  });

  describe('isServiceHealth', () => {
    const validHealth = {
      service: 'Database',
      status: 'healthy' as const,
      message: 'Database is accessible',
      lastCheck: '2024-01-01T00:00:00Z'
    };

    it('有効なヘルス状態の場合trueを返す', () => {
      expect(isServiceHealth(validHealth)).toBe(true);
    });

    it('metricsがあっても動作する', () => {
      const healthWithMetrics = {
        ...validHealth,
        metrics: { responseTime: 50 }
      };
      expect(isServiceHealth(healthWithMetrics)).toBe(true);
    });

    it('無効なステータスの場合falseを返す', () => {
      expect(isServiceHealth({ ...validHealth, status: 'unknown' })).toBe(false);
    });
  });
});

describe('ユーティリティ関数', () => {
  describe('ensureArray', () => {
    it('型ガードを満たす要素のみを返す', () => {
      const mixed = ['dog', 'cat', 'bird', null, 123];
      const result = ensureArray(mixed, isPetType);
      expect(result).toEqual(['dog', 'cat']);
    });

    it('配列でない場合空配列を返す', () => {
      expect(ensureArray(null, isString)).toEqual([]);
      expect(ensureArray('string', isString)).toEqual([]);
    });
  });

  describe('safeGet', () => {
    it('型ガードを満たす値を返す', () => {
      const obj = { name: 'Max', age: 3 };
      expect(safeGet(obj, 'name', isString, 'default')).toBe('Max');
      expect(safeGet(obj, 'age', isNumber, 0)).toBe(3);
    });

    it('型ガードを満たさない場合デフォルト値を返す', () => {
      const obj = { name: 123 };
      expect(safeGet(obj, 'name', isString, 'default')).toBe('default');
      expect(safeGet(obj, 'missing', isString, 'default')).toBe('default');
    });
  });

  describe('safeCast', () => {
    it('型ガードを満たす場合その値を返す', () => {
      expect(safeCast('test', isString, 'default')).toBe('test');
      expect(safeCast(123, isNumber, 0)).toBe(123);
    });

    it('型ガードを満たさない場合デフォルト値を返す', () => {
      expect(safeCast(123, isString, 'default')).toBe('default');
      expect(safeCast(null, isNumber, 0)).toBe(0);
    });
  });
});