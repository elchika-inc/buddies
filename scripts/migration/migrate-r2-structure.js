#!/usr/bin/env node

/**
 * R2バケット構造移行スクリプト
 * 
 * 目的: 旧構造 (cats/originals/, dogs/originals/) から新構造 (pets/cats/, pets/dogs/) への移行
 * 
 * 変換内容:
 * - cats/originals/pet-home_pethome_123456.jpg → pets/cats/pet-home_pethome_123456/original.jpg
 * - dogs/originals/pet-home_pethome_789012.jpg → pets/dogs/pet-home_pethome_789012/original.jpg
 * 
 * 使用方法:
 *   export $(grep -v '^#' .env.local | grep -v '^\s*$' | xargs)
 *   node scripts/migration/migrate-r2-structure.js --dry-run  # プレビュー
 *   node scripts/migration/migrate-r2-structure.js           # 実行
 */

import { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { promises as fs } from 'fs';

const CONFIG = {
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || 'pawmatch-images',
  DRY_RUN: process.argv.includes('--dry-run'),
  BATCH_SIZE: 10 // 同時処理数制限
};

// R2クライアント初期化
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${CONFIG.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: CONFIG.R2_ACCESS_KEY_ID,
    secretAccessKey: CONFIG.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * ファイルパスを新構造に変換
 */
function convertPath(oldPath) {
  // cats/originals/pet-home_pethome_123456.jpg → pets/cats/pet-home_pethome_123456/original.jpg
  const match = oldPath.match(/^(cats|dogs)\/originals\/([^\/]+)\.(\w+)$/);
  if (!match) return null;
  
  const [, type, id, extension] = match;
  return `pets/${type}/${id}/original.${extension}`;
}

/**
 * 移行対象ファイルを収集
 */
async function collectMigrationFiles() {
  console.log('🔍 Collecting files to migrate...');
  
  const migrationList = [];
  let continuationToken;
  
  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: CONFIG.R2_BUCKET_NAME,
      ContinuationToken: continuationToken,
      MaxKeys: 1000
    });
    
    const response = await r2Client.send(listCommand);
    
    if (response.Contents) {
      for (const obj of response.Contents) {
        const oldPath = obj.Key;
        const newPath = convertPath(oldPath);
        
        if (newPath) {
          migrationList.push({
            oldPath,
            newPath,
            size: obj.Size,
            lastModified: obj.LastModified
          });
        }
      }
    }
    
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);
  
  console.log(`📊 Found ${migrationList.length} files to migrate`);
  
  // 統計情報を表示
  const stats = migrationList.reduce((acc, item) => {
    const type = item.newPath.split('/')[1]; // pets/cats/ → cats
    if (!acc[type]) acc[type] = 0;
    acc[type]++;
    return acc;
  }, {});
  
  Object.entries(stats).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} files`);
  });
  
  return migrationList;
}

/**
 * バッチでファイルを移行
 */
async function migrateInBatches(migrationList) {
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };
  
  console.log(`\n🚀 ${CONFIG.DRY_RUN ? 'DRY RUN: ' : ''}Starting migration...`);
  
  for (let i = 0; i < migrationList.length; i += CONFIG.BATCH_SIZE) {
    const batch = migrationList.slice(i, i + CONFIG.BATCH_SIZE);
    
    console.log(`\n📦 Processing batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}/${Math.ceil(migrationList.length / CONFIG.BATCH_SIZE)}`);
    
    const batchPromises = batch.map(async (item) => {
      try {
        console.log(`  ${item.oldPath} → ${item.newPath}`);
        
        if (!CONFIG.DRY_RUN) {
          // コピー作成
          await r2Client.send(new CopyObjectCommand({
            Bucket: CONFIG.R2_BUCKET_NAME,
            CopySource: `${CONFIG.R2_BUCKET_NAME}/${item.oldPath}`,
            Key: item.newPath
          }));
          
          // 元ファイル削除
          await r2Client.send(new DeleteObjectCommand({
            Bucket: CONFIG.R2_BUCKET_NAME,
            Key: item.oldPath
          }));
        }
        
        return { success: true, item };
      } catch (error) {
        console.error(`    ❌ Error: ${error.message}`);
        return { success: false, item, error: error.message };
      }
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(result.value);
        }
      } else {
        results.failed++;
        results.errors.push({ error: result.reason.message });
      }
    });
    
    // 進捗表示
    console.log(`  ✅ Batch completed: ${results.success + results.failed}/${migrationList.length}`);
    
    // API制限を避けるため少し待機
    if (i + CONFIG.BATCH_SIZE < migrationList.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * 移行後の検証
 */
async function validateMigration(migrationList) {
  console.log('\n🔍 Validating migration...');
  
  let validated = 0;
  let missing = 0;
  
  for (const item of migrationList.slice(0, 10)) { // 最初の10件をサンプル検証
    try {
      await r2Client.send(new ListObjectsV2Command({
        Bucket: CONFIG.R2_BUCKET_NAME,
        Prefix: item.newPath,
        MaxKeys: 1
      }));
      
      const response = await r2Client.send(new ListObjectsV2Command({
        Bucket: CONFIG.R2_BUCKET_NAME,
        Prefix: item.newPath,
        MaxKeys: 1
      }));
      
      if (response.Contents && response.Contents.length > 0) {
        validated++;
      } else {
        missing++;
        console.log(`  ⚠️ Missing: ${item.newPath}`);
      }
    } catch (error) {
      missing++;
      console.log(`  ❌ Error checking: ${item.newPath}`);
    }
  }
  
  console.log(`📊 Sample validation: ${validated} found, ${missing} missing`);
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('🎯 R2 Structure Migration Tool');
    console.log('================================');
    console.log(`Mode: ${CONFIG.DRY_RUN ? 'DRY RUN (no changes)' : 'EXECUTE (real migration)'}`);
    console.log(`Bucket: ${CONFIG.R2_BUCKET_NAME}`);
    console.log('');
    
    // 必要な環境変数をチェック
    if (!CONFIG.R2_ACCOUNT_ID || !CONFIG.R2_ACCESS_KEY_ID || !CONFIG.R2_SECRET_ACCESS_KEY) {
      throw new Error('Missing required environment variables. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
    }
    
    // 移行対象ファイル収集
    const migrationList = await collectMigrationFiles();
    
    if (migrationList.length === 0) {
      console.log('✨ No files to migrate. Structure is already up to date.');
      return;
    }
    
    // 確認プロンプト（本番実行時）
    if (!CONFIG.DRY_RUN) {
      console.log('\n⚠️  WARNING: This will modify your R2 bucket!');
      console.log('   Make sure you have a backup if needed.');
      console.log('   Press Ctrl+C to cancel, or any key to continue...');
      process.stdin.setRawMode(true);
      process.stdin.resume();
      await new Promise(resolve => process.stdin.once('data', resolve));
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }
    
    // 移行実行
    const results = await migrateInBatches(migrationList);
    
    // 結果レポート
    console.log('\n📋 Migration Summary:');
    console.log('===================');
    console.log(`✅ Successful: ${results.success}`);
    console.log(`❌ Failed: ${results.failed}`);
    
    if (results.errors.length > 0) {
      console.log('\n⚠️ Errors:');
      results.errors.slice(0, 10).forEach(error => {
        console.log(`  - ${error.item?.oldPath || 'Unknown'}: ${error.error}`);
      });
      if (results.errors.length > 10) {
        console.log(`  ... and ${results.errors.length - 10} more errors`);
      }
    }
    
    // 移行後の検証（実行時のみ）
    if (!CONFIG.DRY_RUN && results.success > 0) {
      await validateMigration(migrationList);
    }
    
    // レポートファイル生成
    const reportPath = `migration-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    await fs.writeFile(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      dryRun: CONFIG.DRY_RUN,
      totalFiles: migrationList.length,
      results,
      sample: migrationList.slice(0, 5)
    }, null, 2));
    
    console.log(`\n📄 Report saved to: ${reportPath}`);
    console.log('\n✨ Migration completed!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
