#!/usr/bin/env tsx

/**
 * ペットデータクローラー実行スクリプト
 * 使用方法:
 *   npm run crawl        # 全ての動物データを取得
 *   npm run crawl dogs   # 犬のデータのみ取得
 *   npm run crawl cats   # 猫のデータのみ取得
 */

import { crawlerService } from '../services/crawlerService';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';

  try {
    switch (command) {
      case 'all': {
        console.log('🚀 全ての動物データを取得しています...');
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
        console.log('🐕 犬のデータを取得しています...');
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
        console.log('🐱 猫のデータを取得しています...');
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
        console.log('📊 クローラーの状態:');
        const status = crawlerService.getStatus();
        const stats = await crawlerService.getDataStats();
        
        console.log(`  実行中: ${status.isRunning ? 'はい' : 'いいえ'}`);
        console.log(`  前回実行: ${status.lastRun || '実行履歴なし'}`);
        console.log(`  保存済み動物: ${stats.totalAnimals} 匹 (犬: ${stats.dogs}, 猫: ${stats.cats})`);
        break;
      }

      case 'scheduled': {
        console.log('⏰ スケジュール実行を開始します...');
        const scheduledResult = await crawlerService.scheduledRun();
        
        console.log('📊 取得結果:');
        console.log(`  成功: ${scheduledResult.success ? 'はい' : 'いいえ'}`);
        console.log(`  合計: ${scheduledResult.totalAnimals} 匹`);
        break;
      }

      case 'help':
      case '--help':
      case '-h':
        console.log('🐕🐱 PawMatch データクローラー');
        console.log('');
        console.log('使用方法:');
        console.log('  npm run crawl [command]');
        console.log('');
        console.log('コマンド:');
        console.log('  all       全ての動物データを取得 (デフォルト)');
        console.log('  dogs      犬のデータのみ取得');
        console.log('  cats      猫のデータのみ取得');
        console.log('  status    クローラーの状態を表示');
        console.log('  scheduled スケジュール実行（定期実行用）');
        console.log('  help      このヘルプを表示');
        break;

      default:
        console.error(`❌ 不明なコマンド: ${command}`);
        console.log('使用方法: npm run crawl [all|dogs|cats|status|scheduled|help]');
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