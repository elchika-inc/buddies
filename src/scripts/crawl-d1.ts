#!/usr/bin/env tsx

/**
 * D1データベース用ペットデータクローラー実行スクリプト
 * Cloudflare D1データベースにデータを保存します
 */

import { createCrawlerService } from '../services/crawlerService';

// D1Database型定義（Cloudflare Workers型の簡易版）
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first(): Promise<Record<string, unknown> | null>;
  run(): Promise<D1Result>;
  all(): Promise<D1Result>;
}

interface D1Result {
  success: boolean;
  results?: unknown[];
  meta?: {
    changes: number;
    last_row_id: number;
    duration: number;
  };
}

interface D1ExecResult {
  count: number;
  duration: number;
}

// D1データベースのモック（ローカル開発用）
// 実際のWorkersではenv.DBを使用
const mockD1Database = {
  prepare: (_query: string) => ({
    bind: (..._values: unknown[]) => ({
      first: async () => null,
      run: async () => ({ success: true, meta: { changes: 1, last_row_id: 1, duration: 0 } }),
      all: async () => ({ results: [], success: true })
    }),
    first: async () => null,
    run: async () => ({ success: true, meta: { changes: 1, last_row_id: 1, duration: 0 } }),
    all: async () => ({ results: [], success: true })
  }),
  batch: async (statements: D1PreparedStatement[]) => {
    console.log(`🗄️ D1 バッチ実行: ${statements.length} 個のステートメント`);
    return statements.map(() => ({ 
      success: true, 
      meta: { changes: 1, last_row_id: 1, duration: 0 } 
    }));
  },
  exec: async (_query: string) => ({ count: 0, duration: 0 })
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';

  try {
    // D1対応のクローラーサービスを作成
    const crawlerService = createCrawlerService(mockD1Database as D1Database);

    switch (command) {
      case 'all': {
        console.log('🚀 全ての動物データを取得してD1に保存しています...');
        const allResult = await crawlerService.crawlAndSave({
          dogLimit: 100,
          catLimit: 100
        });
        
        console.log('📊 取得結果:');
        console.log(`  成功: ${allResult.success ? 'はい' : 'いいえ'}`);
        console.log(`  犬: ${allResult.dogsResult.data.length} 匹`);
        console.log(`  猫: ${allResult.catsResult.data.length} 匹`);
        console.log(`  合計: ${allResult.totalAnimals} 匹`);
        
        if (allResult.errors.length > 0) {
          console.log('❌ エラー:');
          allResult.errors.forEach(error => console.log(`  - ${error}`));
        }
        break;
      }

      case 'dogs': {
        console.log('🐕 犬のデータを取得してD1に保存しています...');
        const dogsResult = await crawlerService.crawlDogsOnly(100);
        
        console.log('📊 取得結果:');
        console.log(`  成功: ${dogsResult.success ? 'はい' : 'いいえ'}`);
        console.log(`  犬: ${dogsResult.data.length} 匹`);
        
        if (dogsResult.errors.length > 0) {
          console.log('❌ エラー:');
          dogsResult.errors.forEach(error => console.log(`  - ${error}`));
        }
        break;
      }

      case 'cats': {
        console.log('🐱 猫のデータを取得してD1に保存しています...');
        const catsResult = await crawlerService.crawlCatsOnly(100);
        
        console.log('📊 取得結果:');
        console.log(`  成功: ${catsResult.success ? 'はい' : 'いいえ'}`);
        console.log(`  猫: ${catsResult.data.length} 匹`);
        
        if (catsResult.errors.length > 0) {
          console.log('❌ エラー:');
          catsResult.errors.forEach(error => console.log(`  - ${error}`));
        }
        break;
      }

      case 'status': {
        console.log('📊 D1クローラーの状態:');
        const status = crawlerService.getStatus();
        const stats = await crawlerService.getDataStats();
        
        console.log(`  実行中: ${status.isRunning ? 'はい' : 'いいえ'}`);
        console.log(`  前回実行: ${status.lastRun || '実行履歴なし'}`);
        console.log(`  保存済み動物: ${stats.totalAnimals} 匹 (犬: ${stats.dogs}, 猫: ${stats.cats})`);
        console.log(`  ストレージ: D1データベース`);
        break;
      }

      case 'help':
      case '--help':
      case '-h':
        console.log('🐕🐱 PawMatch D1データクローラー');
        console.log('');
        console.log('使用方法:');
        console.log('  npm run crawl:d1 [command]');
        console.log('');
        console.log('コマンド:');
        console.log('  all       全ての動物データをD1に保存 (デフォルト)');
        console.log('  dogs      犬のデータのみD1に保存');
        console.log('  cats      猫のデータのみD1に保存');
        console.log('  status    D1クローラーの状態を表示');
        console.log('  help      このヘルプを表示');
        console.log('');
        console.log('注意: これはD1データベース用のクローラーです。');
        console.log('実環境ではCloudflare Workersで実行されます。');
        break;

      default:
        console.error(`❌ 不明なコマンド: ${command}`);
        console.log('使用方法: npm run crawl:d1 [all|dogs|cats|status|help]');
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}