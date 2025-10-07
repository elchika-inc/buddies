#!/usr/bin/env node

/**
 * 移行テスト用スクリプト - 最初の5件のみ実行
 */

import {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'

const CONFIG = {
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || 'buddies-images',
  TEST_COUNT: 5,
}

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${CONFIG.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: CONFIG.R2_ACCESS_KEY_ID,
    secretAccessKey: CONFIG.R2_SECRET_ACCESS_KEY,
  },
})

function convertPath(oldPath) {
  const match = oldPath.match(/^(cats|dogs)\/originals\/([^\/]+)\.(\w+)$/)
  if (!match) return null

  const [, type, id, extension] = match
  return `pets/${type}/${id}/original.${extension}`
}

async function testMigration() {
  console.log('🧪 Testing migration with 5 files...\n')

  // 最初の5件を取得
  const listCommand = new ListObjectsV2Command({
    Bucket: CONFIG.R2_BUCKET_NAME,
    MaxKeys: CONFIG.TEST_COUNT,
  })

  const response = await r2Client.send(listCommand)

  if (!response.Contents) {
    console.log('No files found')
    return
  }

  const testFiles = response.Contents.map((obj) => ({
    oldPath: obj.Key,
    newPath: convertPath(obj.Key),
    size: obj.Size,
  })).filter((item) => item.newPath)

  console.log(`📋 Test files:`)
  testFiles.forEach((file, i) => {
    console.log(`${i + 1}. ${file.oldPath} (${file.size} bytes)`)
    console.log(`   → ${file.newPath}`)
  })

  console.log(`\n🚀 Starting test migration...`)

  for (const file of testFiles) {
    try {
      console.log(`\n📂 Processing: ${file.oldPath}`)

      // コピー作成
      console.log('  📋 Copying to new location...')
      await r2Client.send(
        new CopyObjectCommand({
          Bucket: CONFIG.R2_BUCKET_NAME,
          CopySource: `${CONFIG.R2_BUCKET_NAME}/${file.oldPath}`,
          Key: file.newPath,
        })
      )
      console.log('  ✅ Copy successful')

      // 確認
      console.log('  🔍 Verifying new file...')
      const verifyCommand = new ListObjectsV2Command({
        Bucket: CONFIG.R2_BUCKET_NAME,
        Prefix: file.newPath,
        MaxKeys: 1,
      })

      const verifyResponse = await r2Client.send(verifyCommand)
      if (verifyResponse.Contents && verifyResponse.Contents.length > 0) {
        console.log('  ✅ New file verified')

        // 元ファイル削除
        console.log('  🗑️  Deleting original file...')
        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: CONFIG.R2_BUCKET_NAME,
            Key: file.oldPath,
          })
        )
        console.log('  ✅ Original file deleted')
      } else {
        throw new Error('New file not found after copy')
      }
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`)
    }
  }

  console.log(`\n📊 Test migration completed!`)
  console.log('Please verify the results before running full migration.')
}

testMigration().catch(console.error)
