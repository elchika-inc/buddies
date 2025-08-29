#!/usr/bin/env node

/**
 * データベース初期化スクリプト
 * Wranglerの一時的なデータベースインスタンスに対してテーブルを作成する
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CONFIG_FILE = '../../../crawler/wrangler.dev.toml';
const SCHEMA_FILE = './schema-dev.sql';

// カラー定義
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m', 
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function executeWranglerCommand(command) {
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout };
  }
}

async function main() {
  log('blue', '🔧 PawMatch Crawler データベース初期化を開始...');
  
  // 1. 設定ファイル確認
  if (!fs.existsSync(CONFIG_FILE)) {
    log('red', `❌ ${CONFIG_FILE} が見つかりません`);
    process.exit(1);
  }
  
  if (!fs.existsSync(SCHEMA_FILE)) {
    log('red', `❌ ${SCHEMA_FILE} が見つかりません`);
    process.exit(1);
  }

  log('green', '✅ 設定ファイル確認完了');
  
  // 2. 現在のデータベース状態確認
  log('yellow', '📊 データベース状態を確認中...');
  
  const checkCmd = `wrangler d1 execute pawmatch-db --local --config ${CONFIG_FILE} --command="SELECT name FROM sqlite_master WHERE type='table';"`;
  const checkResult = executeWranglerCommand(checkCmd);
  
  let needsInitialization = false;
  
  if (checkResult.success) {
    const output = checkResult.output;
    const hasPetsTable = output.includes('"name": "pets"');
    const hasCrawlerStatesTable = output.includes('"name": "crawler_states"');
    
    if (hasPetsTable && hasCrawlerStatesTable) {
      log('green', '✅ 必要なテーブルが既に存在します');
      log('yellow', '現在のテーブル:');
      console.log(output);
      return;
    } else {
      needsInitialization = true;
      log('yellow', '⚠️  不足しているテーブルがあります');
    }
  } else {
    needsInitialization = true;
    log('yellow', '⚠️  データベースが初期化されていません');
  }
  
  // 3. スキーマ適用
  if (needsInitialization) {
    log('yellow', '📋 スキーマを適用中...');
    
    const initCmd = `wrangler d1 execute pawmatch-db --local --config ${CONFIG_FILE} --file=${SCHEMA_FILE}`;
    const initResult = executeWranglerCommand(initCmd);
    
    if (initResult.success) {
      log('green', '✅ スキーマ適用完了');
    } else {
      log('red', '❌ スキーマ適用に失敗しました');
      console.error(initResult.error);
      process.exit(1);
    }
  }
  
  // 4. 最終確認
  log('yellow', '🔍 最終確認中...');
  
  const finalCheckCmd = `wrangler d1 execute pawmatch-db --local --config ${CONFIG_FILE} --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"`;
  const finalResult = executeWranglerCommand(finalCheckCmd);
  
  if (finalResult.success) {
    log('green', '🎉 データベース初期化完了！');
    log('blue', '📋 作成されたテーブル:');
    console.log(finalResult.output);
    
    // テーブル数確認
    const tables = (finalResult.output.match(/"name":/g) || []).length;
    log('blue', `合計 ${tables} 個のテーブルが作成されました`);
    
  } else {
    log('red', '❌ 最終確認に失敗しました');
    console.error(finalResult.error);
    process.exit(1);
  }
  
  log('green', '✨ 初期化スクリプト完了 - クローラーを起動できます');
}

main().catch(error => {
  log('red', `❌ エラーが発生しました: ${error.message}`);
  process.exit(1);
});