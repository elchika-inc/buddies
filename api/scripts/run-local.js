#!/usr/bin/env node
/**
 * ローカル環境でAPIサーバーを実行するスクリプト
 */

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs').promises;
const { Hono } = require('hono');
const { serve } = require('@hono/node-server');

// 環境変数設定
const PORT = process.env.API_PORT || 8787;
const DB_PATH = path.resolve(__dirname, '../../data/pawmatch.db');
const IMAGES_PATH = path.resolve(__dirname, '../../data/images');

// モック環境を作成
async function createMockEnv() {
  // データベース接続
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
  
  // モックR2バケット
  const IMAGES_BUCKET = {
    get: async (key) => {
      const filePath = path.join(IMAGES_PATH, key);
      try {
        const data = await fs.readFile(filePath);
        return {
          body: data,
          httpMetadata: {
            contentType: key.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
          }
        };
      } catch (error) {
        return null;
      }
    },
    put: async (key, data) => {
      const filePath = path.join(IMAGES_PATH, key);
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, Buffer.from(data));
    }
  };
  
  // モックD1データベース
  const DB = {
    prepare: (query) => {
      return {
        bind: (...params) => {
          return {
            first: async () => {
              return await db.get(query, ...params);
            },
            all: async () => {
              const results = await db.all(query, ...params);
              return { results };
            },
            run: async () => {
              return await db.run(query, ...params);
            }
          };
        }
      };
    }
  };
  
  return {
    IMAGES_BUCKET,
    DB,
    ALLOWED_ORIGIN: 'http://localhost:3004'
  };
}

// メイン処理
async function main() {
  console.log('🚀 Starting PawMatch API Server (Local Mode)');
  console.log(`📁 Database: ${DB_PATH}`);
  console.log(`🖼️  Images: ${IMAGES_PATH}`);
  console.log(`🌐 Port: ${PORT}`);
  
  // 環境を作成
  const env = await createMockEnv();
  
  // APIをインポート（動的インポート）
  const { default: app } = await import('../dist/index.js');
  
  // サーバー起動
  serve({
    fetch: app.fetch,
    port: PORT,
    hostname: '0.0.0.0'
  }, (info) => {
    console.log(`\n✨ API Server is running at http://localhost:${info.port}`);
    console.log('\n📚 Available endpoints:');
    console.log('  GET  /                    - Health check');
    console.log('  GET  /pets                - List all pets');
    console.log('  GET  /pets/dog            - List dogs');
    console.log('  GET  /pets/cat            - List cats');
    console.log('  GET  /pets/:type/:id      - Get specific pet');
    console.log('  GET  /images/:type/:file  - Get pet image');
    console.log('  GET  /stats               - Get statistics');
    console.log('  GET  /prefectures         - List prefectures');
    console.log('\n🎯 Image format options:');
    console.log('  ?format=auto     - Auto-detect WebP support (default)');
    console.log('  ?format=webp     - Force WebP format');
    console.log('  ?format=original - Force original format');
    console.log('\nPress Ctrl+C to stop the server');
  });
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

// 実行
main().catch(console.error);