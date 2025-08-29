#!/usr/bin/env node

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// D1更新用のヘルパースクリプト
class LocalD1Updater {
  constructor() {
    this.apiDir = path.join(__dirname, '../../api');
    this.dbName = 'pawmatch-db';
  }

  // SQLコマンドを実行
  async execute(sql) {
    try {
      // SQLの改行とクォートをエスケープ
      const escapedSql = sql.replace(/\n/g, ' ').replace(/"/g, '\\"');
      
      const command = `npx wrangler d1 execute ${this.dbName} --local --command="${escapedSql}"`;
      
      const result = execSync(command, {
        cwd: this.apiDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // バッチでSQLを実行
  async executeBatch(sqlStatements) {
    const results = [];
    
    for (const sql of sqlStatements) {
      const result = await this.execute(sql);
      results.push(result);
      
      if (!result.success) {
        console.error(`❌ Failed to execute: ${sql.substring(0, 50)}...`);
        console.error(`   Error: ${result.error}`);
      }
    }
    
    return results;
  }

  // ペットの画像URLを更新
  async updatePetImages(pets) {
    const sqlStatements = pets.map(pet => `
      UPDATE pets 
      SET 
        imageUrl = '${pet.imageUrl}',
        thumbnailUrl = '${pet.thumbnailUrl}',
        updatedAt = datetime('now')
      WHERE id = '${pet.id}'
    `);
    
    console.log(`📝 Updating ${pets.length} pet records...`);
    const results = await this.executeBatch(sqlStatements);
    
    const successful = results.filter(r => r.success).length;
    console.log(`✅ Successfully updated ${successful}/${pets.length} records`);
    
    return results;
  }

  // 統計情報を取得
  async getStats() {
    const sql = `
      SELECT 
        type,
        COUNT(*) as total,
        COUNT(CASE WHEN imageUrl IS NOT NULL THEN 1 END) as with_images,
        COUNT(CASE WHEN imageUrl IS NULL THEN 1 END) as without_images
      FROM pets
      GROUP BY type
    `;
    
    const result = await this.execute(sql);
    
    if (result.success) {
      console.log('\n📊 Database Statistics:');
      console.log(result.result);
    }
    
    return result;
  }

  // 画像が不足しているペットを取得
  async getMissingImages(limit = 10, type = null) {
    let sql = `
      SELECT id, name, type, sourceUrl
      FROM pets
      WHERE imageUrl IS NULL OR imageUrl = ''
    `;
    
    if (type) {
      sql += ` AND type = '${type}'`;
    }
    
    sql += ` LIMIT ${limit}`;
    
    const result = await this.execute(sql);
    
    if (result.success) {
      // 結果をパース（wranglerの出力形式に依存）
      try {
        // wranglerの出力から実際のデータを抽出する処理
        // 実際の出力形式に応じて調整が必要
        return JSON.parse(result.result);
      } catch {
        return [];
      }
    }
    
    return [];
  }

  // テスト用データを挿入
  async insertTestData() {
    const testPets = [
      {
        id: 'test-dog-001',
        name: 'テスト犬1',
        type: 'dog',
        breed: 'ミックス',
        gender: 'オス',
        age: '2歳',
        location: '東京都',
        description: 'テスト用のデータです',
        sourceUrl: 'https://www.pet-home.jp/dogs/test'
      },
      {
        id: 'test-cat-001',
        name: 'テスト猫1',
        type: 'cat',
        breed: 'ミックス',
        gender: 'メス',
        age: '1歳',
        location: '大阪府',
        description: 'テスト用のデータです',
        sourceUrl: 'https://www.pet-home.jp/cats/test'
      }
    ];
    
    const sqlStatements = testPets.map(pet => `
      INSERT OR REPLACE INTO pets (
        id, name, type, breed, gender, age, location, 
        description, sourceUrl, createdAt, updatedAt
      ) VALUES (
        '${pet.id}', '${pet.name}', '${pet.type}', '${pet.breed}',
        '${pet.gender}', '${pet.age}', '${pet.location}',
        '${pet.description}', '${pet.sourceUrl}',
        datetime('now'), datetime('now')
      )
    `);
    
    console.log('📝 Inserting test data...');
    const results = await this.executeBatch(sqlStatements);
    
    const successful = results.filter(r => r.success).length;
    console.log(`✅ Inserted ${successful}/${testPets.length} test records`);
    
    return results;
  }

  // データベースをクリア（開発用）
  async clearDatabase() {
    console.log('⚠️  Clearing database...');
    
    const sql = `DELETE FROM pets WHERE id LIKE 'test-%'`;
    const result = await this.execute(sql);
    
    if (result.success) {
      console.log('✅ Test data cleared');
    } else {
      console.log('❌ Failed to clear test data');
    }
    
    return result;
  }
}

// CLIとして実行される場合
async function main() {
  const updater = new LocalD1Updater();
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'stats':
      await updater.getStats();
      break;
      
    case 'missing':
      const limit = parseInt(args[1]) || 10;
      const type = args[2] || null;
      const missing = await updater.getMissingImages(limit, type);
      console.log(`Found ${missing.length} pets with missing images`);
      break;
      
    case 'test-data':
      await updater.insertTestData();
      break;
      
    case 'clear-test':
      await updater.clearDatabase();
      break;
      
    case 'update':
      // JSONファイルから更新
      const jsonPath = args[1];
      if (!jsonPath) {
        console.error('❌ Please provide a JSON file path');
        process.exit(1);
      }
      
      const data = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
      await updater.updatePetImages(data);
      break;
      
    default:
      console.log(`
使用方法: node update-local-d1.js [コマンド] [オプション]

コマンド:
  stats              データベースの統計情報を表示
  missing [limit]    画像が不足しているペットを取得
  test-data          テスト用データを挿入
  clear-test         テストデータをクリア
  update <json>      JSONファイルからペット情報を更新

例:
  node update-local-d1.js stats
  node update-local-d1.js missing 20
  node update-local-d1.js update results.json
      `);
      break;
  }
}

// エクスポート（他のスクリプトから使用可能）
export default LocalD1Updater;

// 直接実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}