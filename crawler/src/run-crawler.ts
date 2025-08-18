#!/usr/bin/env node

import { ScheduledCatCrawler } from './scheduled-cat-crawler';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface RunOptions {
  limit?: number;
  forceUpdate?: boolean;
  skipExport?: boolean;
  resetState?: boolean;
  dryRun?: boolean;
}

// コマンドライン引数を解析
function parseArgs(): RunOptions {
  const args = process.argv.slice(2);
  const options: RunOptions = {
    limit: 20,
    forceUpdate: false,
    skipExport: false,
    resetState: false,
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--limit':
      case '-l':
        options.limit = parseInt(args[++i]) || 20;
        break;
      case '--force':
      case '-f':
        options.forceUpdate = true;
        break;
      case '--skip-export':
        options.skipExport = true;
        break;
      case '--reset':
        options.resetState = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
    }
  }

  return options;
}

// ヘルプメッセージを表示
function showHelp() {
  console.log(`
🐱 PawMatch クローラー実行スクリプト

使用方法:
  npm run crawl [オプション]

オプション:
  -l, --limit <数値>    取得する最大件数 (デフォルト: 20)
  -f, --force          既存データを無視して強制取得
  --skip-export        CatMatchへのエクスポートをスキップ
  --reset              クローラーの状態をリセット
  --dry-run            実際の取得を行わずに動作確認
  -h, --help           このヘルプを表示

例:
  npm run crawl                  # デフォルト設定で実行
  npm run crawl -l 10             # 10件のみ取得
  npm run crawl --force           # 重複チェックを無視して取得
  npm run crawl --reset -l 30    # 状態リセット後、30件取得
`);
}

// 状態ファイルをリセット
function resetCrawlerState() {
  const stateFile = join(process.cwd(), 'data', 'crawler-state.json');
  const backupFile = join(process.cwd(), 'data', `crawler-state-backup-${Date.now()}.json`);
  
  if (existsSync(stateFile)) {
    // バックアップを作成
    const content = readFileSync(stateFile, 'utf-8');
    writeFileSync(backupFile, content);
    console.log(`📁 状態ファイルをバックアップ: ${backupFile}`);
    
    // リセット
    const resetState = {
      lastCrawledAt: '',
      lastCrawledId: '',
      highestId: '',
      totalCrawled: 0,
      history: []
    };
    writeFileSync(stateFile, JSON.stringify(resetState, null, 2));
    console.log('🔄 状態をリセットしました');
  }
}

// 実行サマリーを表示
function showSummary(options: RunOptions, result: any) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 実行サマリー');
  console.log('='.repeat(60));
  
  console.log(`\n⚙️ 実行設定:`);
  console.log(`  - 取得上限: ${options.limit}件`);
  console.log(`  - 強制更新: ${options.forceUpdate ? 'ON' : 'OFF'}`);
  console.log(`  - エクスポート: ${options.skipExport ? 'スキップ' : '実行'}`);
  
  if (result.newCats) {
    console.log(`\n📦 取得結果:`);
    console.log(`  - 新規取得: ${result.newCats.length}件`);
    console.log(`  - スキップ: ${result.skipCount || 0}件`);
  }
  
  if (result.totalData) {
    console.log(`\n💾 データベース:`);
    console.log(`  - 総データ数: ${result.totalData}件`);
  }
  
  if (result.exported && !options.skipExport) {
    console.log(`\n📤 エクスポート:`);
    console.log(`  - CatMatch更新: ${result.exported}件`);
  }
  
  console.log('\n' + '='.repeat(60));
}

// メイン処理
async function main() {
  const options = parseArgs();
  
  console.log('🚀 PawMatch クローラーを起動します...\n');
  
  // オプションを表示
  console.log('⚙️ 実行オプション:');
  console.log(`  - 取得上限: ${options.limit}件`);
  console.log(`  - 強制更新: ${options.forceUpdate ? 'ON' : 'OFF'}`);
  console.log(`  - エクスポート: ${options.skipExport ? 'スキップ' : '実行'}`);
  if (options.resetState) console.log('  - 状態リセット: 実行');
  if (options.dryRun) console.log('  - ドライラン: ON');
  console.log('');
  
  // 状態リセット（必要な場合）
  if (options.resetState && !options.dryRun) {
    resetCrawlerState();
  }
  
  const crawler = new ScheduledCatCrawler();
  const result: any = {};
  
  try {
    // 初期統計を表示
    crawler.showStatistics();
    
    if (options.dryRun) {
      console.log('\n🔍 ドライランモード: 実際の取得は行いません');
      result.message = 'ドライラン完了';
    } else {
      // クローラーを初期化
      await crawler.init();
      console.log('\n🌐 ブラウザを起動しました');
      
      // 新規データを取得
      if (options.forceUpdate) {
        console.log('⚠️ 強制更新モード: 重複チェックを無視します');
        // 強制更新の場合は状態を一時的にリセット
        resetCrawlerState();
      }
      
      const newCats = await crawler.crawlNewCats(options.limit!);
      result.newCats = newCats;
      
      // 既存データとマージ
      await crawler.mergeWithExistingData(newCats);
      
      // データ総数を取得
      const dataFile = join(process.cwd(), 'data', 'accumulated-cats.json');
      if (existsSync(dataFile)) {
        const data = JSON.parse(readFileSync(dataFile, 'utf-8'));
        result.totalData = data.length;
      }
      
      // CatMatchアプリにエクスポート
      if (!options.skipExport && newCats.length > 0) {
        await crawler.exportToCatMatch();
        result.exported = Math.min(newCats.length, 20);
        console.log('\n✅ CatMatchアプリを更新しました');
      }
      
      // 最終統計を表示
      console.log('\n✅ 処理完了!');
      crawler.showStatistics();
    }
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await crawler.close();
  }
  
  // サマリーを表示
  showSummary(options, result);
}

// バッチ実行用の関数をエクスポート
export async function runCrawler(options: RunOptions = {}) {
  const defaultOptions: RunOptions = {
    limit: 20,
    forceUpdate: false,
    skipExport: false,
    resetState: false,
    dryRun: false,
    ...options
  };
  
  const crawler = new ScheduledCatCrawler();
  
  try {
    if (defaultOptions.resetState) {
      resetCrawlerState();
    }
    
    await crawler.init();
    const newCats = await crawler.crawlNewCats(defaultOptions.limit!);
    await crawler.mergeWithExistingData(newCats);
    
    if (!defaultOptions.skipExport && newCats.length > 0) {
      await crawler.exportToCatMatch();
    }
    
    await crawler.close();
    
    return {
      success: true,
      newCount: newCats.length,
      totalCount: newCats.length
    };
  } catch (error) {
    await crawler.close();
    throw error;
  }
}

// スクリプトとして実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}