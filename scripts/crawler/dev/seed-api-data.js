#!/usr/bin/env node

/**
 * クローラーからAPIサーバーへの初期データ投入スクリプト
 * クローラーのデータベースからデータを取得し、APIサーバーに送信する
 */

import { execSync } from 'child_process';

const CONFIG_FILE = '../../../crawler/wrangler.dev.toml';
const API_ENDPOINT = 'http://localhost:8788';

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

async function fetchCrawlerData() {
  log('blue', '📦 クローラーAPIからデータを取得中...');
  
  const CRAWLER_ENDPOINT = 'http://localhost:8787';
  
  try {
    const response = await fetch(`${CRAWLER_ENDPOINT}/pets?limit=100`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from crawler API: ${response.statusText}`);
    }
    
    const data = await response.json();
    const pets = data.pets || [];
    
    log('green', `✅ ${pets.length}件のペットデータを取得しました`);
    
    // データ形式を統一
    return pets.map(pet => ({
      ...pet,
      personality: typeof pet.personality === 'string' ? JSON.parse(pet.personality) : pet.personality || [],
      care_requirements: typeof pet.care_requirements === 'string' ? JSON.parse(pet.care_requirements) : pet.care_requirements || [],
      metadata: typeof pet.metadata === 'string' ? JSON.parse(pet.metadata) : pet.metadata || {},
    }));
    
  } catch (error) {
    throw new Error(`Failed to fetch crawler data: ${error.message}`);
  }
}

async function initializeApiDatabase() {
  log('yellow', '🔧 APIサーバーデータベースを初期化中...');
  
  try {
    const response = await fetch(`${API_ENDPOINT}/dev/init-db`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      log('green', '✅ APIサーバーデータベース初期化完了');
    } else {
      throw new Error(result.error || 'Database initialization failed');
    }
  } catch (error) {
    throw new Error(`Failed to initialize API database: ${error.message}`);
  }
}

async function seedDataToApi(pets) {
  if (pets.length === 0) {
    log('yellow', '⚠️  投入するデータがありません');
    return;
  }
  
  log('yellow', `📡 APIサーバーに${pets.length}件のデータを投入中...`);
  
  try {
    const response = await fetch(`${API_ENDPOINT}/dev/seed-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pets }),
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      log('green', `✅ データ投入完了！`);
      log('blue', `   新規追加: ${result.inserted}件`);
      log('blue', `   更新: ${result.updated}件`);
      log('blue', `   合計: ${result.total}件`);
    } else {
      throw new Error(result.error || 'Data seeding failed');
    }
    
  } catch (error) {
    throw new Error(`Failed to seed data to API: ${error.message}`);
  }
}

async function verifyApiData() {
  log('yellow', '🔍 APIサーバーのデータを確認中...');
  
  try {
    const response = await fetch(`${API_ENDPOINT}/stats`);
    const stats = await response.json();
    
    if (response.ok) {
      log('green', '📊 APIサーバー統計:');
      log('blue', `   合計: ${stats.total}件`);
      log('blue', `   猫: ${stats.cats}件`);
      log('blue', `   犬: ${stats.dogs}件`);
      log('blue', `   最終更新: ${stats.last_updated}`);
    } else {
      log('red', '❌ APIサーバーの統計取得に失敗');
    }
    
  } catch (error) {
    log('red', `❌ APIサーバー確認エラー: ${error.message}`);
  }
}

async function main() {
  log('blue', '🚀 クローラーからAPIサーバーへの初期データ投入を開始...');
  
  try {
    // 1. APIサーバー接続確認
    log('yellow', '🔍 APIサーバー接続確認中...');
    const healthResponse = await fetch(`${API_ENDPOINT}/`);
    
    if (!healthResponse.ok) {
      throw new Error('APIサーバーに接続できません。サーバーが起動しているか確認してください。');
    }
    
    const health = await healthResponse.json();
    log('green', `✅ APIサーバー接続OK (${health.service})`);
    
    // 2. APIデータベース初期化
    await initializeApiDatabase();
    
    // 3. クローラーデータ取得
    const pets = await fetchCrawlerData();
    
    // 4. データ投入
    await seedDataToApi(pets);
    
    // 5. 確認
    await verifyApiData();
    
    log('green', '🎉 初期データ投入完了！');
    
  } catch (error) {
    log('red', `❌ エラーが発生しました: ${error.message}`);
    process.exit(1);
  }
}

main().catch(error => {
  log('red', `❌ 予期しないエラー: ${error.message}`);
  process.exit(1);
});