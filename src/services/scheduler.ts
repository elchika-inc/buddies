/**
 * データ取得スケジューラー
 * 定期的にクローラーを実行してデータを更新
 */

import { crawlerService } from './crawlerService';

export interface SchedulerConfig {
  enabled: boolean;
  intervalHours: number;
  maxRetries: number;
  retryDelayMinutes: number;
}

export class DataScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private config: SchedulerConfig = {
    enabled: false,
    intervalHours: 6, // 6時間ごと
    maxRetries: 3,
    retryDelayMinutes: 30
  };

  constructor(config?: Partial<SchedulerConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * スケジューラーを開始
   */
  start(): void {
    if (this.intervalId) {
      console.log('⏰ スケジューラーは既に実行中です');
      return;
    }

    if (!this.config.enabled) {
      console.log('⏰ スケジューラーは無効になっています');
      return;
    }

    console.log(`⏰ データ取得スケジューラーを開始します (${this.config.intervalHours}時間間隔)`);

    // 即座に1回実行
    this.executeWithRetry();

    // 定期実行を設定
    const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.executeWithRetry();
    }, intervalMs);
  }

  /**
   * スケジューラーを停止
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏰ データ取得スケジューラーを停止しました');
    }
  }

  /**
   * リトライ機能付きでクローラーを実行
   */
  private async executeWithRetry(attempt: number = 1): Promise<void> {
    try {
      console.log(`🚀 データ取得を実行中... (試行 ${attempt}/${this.config.maxRetries})`);
      
      const result = await crawlerService.scheduledRun();
      
      if (result.success) {
        console.log(`✅ データ取得成功: ${result.totalAnimals} 匹の動物データを更新`);
      } else {
        throw new Error(`データ取得に失敗しました: ${result.errors.join(', ')}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ データ取得エラー (試行 ${attempt}):`, errorMessage);

      // リトライ条件をチェック
      if (attempt < this.config.maxRetries) {
        const delayMs = this.config.retryDelayMinutes * 60 * 1000;
        console.log(`⏳ ${this.config.retryDelayMinutes}分後にリトライします...`);
        
        setTimeout(() => {
          this.executeWithRetry(attempt + 1);
        }, delayMs);
      } else {
        console.error('❌ 最大リトライ回数に達しました。次回のスケジュール実行まで待機します。');
      }
    }
  }

  /**
   * スケジューラーの状態を取得
   */
  getStatus() {
    return {
      isRunning: this.intervalId !== null,
      config: this.config,
      nextRun: this.intervalId 
        ? new Date(Date.now() + this.config.intervalHours * 60 * 60 * 1000).toISOString()
        : null
    };
  }

  /**
   * 設定を更新
   */
  updateConfig(newConfig: Partial<SchedulerConfig>): void {
    const wasRunning = this.intervalId !== null;
    
    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...newConfig };

    if (wasRunning && this.config.enabled) {
      this.start();
    }
  }

  /**
   * 手動実行（スケジュールに関係なく即座に実行）
   */
  async executeNow(): Promise<void> {
    console.log('🚀 手動でデータ取得を実行します...');
    await this.executeWithRetry();
  }
}

/**
 * 環境変数ベースのスケジューラー設定
 */
export function createSchedulerFromEnv(): DataScheduler {
  const config: Partial<SchedulerConfig> = {
    enabled: process.env.CRAWLER_ENABLED === 'true',
    intervalHours: parseInt(process.env.CRAWLER_INTERVAL_HOURS || '6'),
    maxRetries: parseInt(process.env.CRAWLER_MAX_RETRIES || '3'),
    retryDelayMinutes: parseInt(process.env.CRAWLER_RETRY_DELAY_MINUTES || '30')
  };

  return new DataScheduler(config);
}

// エクスポートされたインスタンス（開発環境用のデフォルト設定）
export const dataScheduler = new DataScheduler({
  enabled: true,
  intervalHours: 2, // 開発環境では2時間間隔
  maxRetries: 2,
  retryDelayMinutes: 10
});