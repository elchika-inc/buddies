/**
 * 統計情報の型定義
 */

/**
 * 都道府県別統計
 */
export interface PrefectureStats {
  prefecture: string;
  count: number;
  dogs: number;
  cats: number;
}

/**
 * 年齢分布統計
 */
export interface AgeStats {
  age: number;
  count: number;
}

/**
 * 最近のペット情報
 */
export interface RecentPet {
  id: string;
  type: 'dog' | 'cat';
  name: string;
  created_at: string;
}

/**
 * カバレッジトレンド
 */
export interface CoverageTrend {
  date: string;
  checked: number;
  with_images: number;
}

/**
 * 詳細統計情報
 * 
 * @description 地域別、年齢別、最近のペット、カバレッジトレンドなどの詳細統計
 */
export interface DetailedStatistics {
  prefectureDistribution: PrefectureStats[];
  ageDistribution: AgeStats[];
  recentPets: RecentPet[];
  coverageTrend: CoverageTrend[];
  timestamp: string;
}

/**
 * サービスヘルス状態
 */
export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  message: string;
  lastCheck: string;
  metrics?: Record<string, number | string>;
}

/**
 * システムメトリクス
 */
export interface SystemMetrics {
  pets: {
    totalPets: number;
    totalDogs: number;
    totalCats: number;
    petsWithJpeg: number;
    petsWithWebp: number;
  };
  readiness: {
    isReady: boolean;
    imageCoverage: number;
    message: string;
  };
  health: ServiceHealth[];
  storage: {
    used: number;
    estimated: number;
  };
  performance: {
    avgResponseTime: number;
    successRate: number;
  };
}