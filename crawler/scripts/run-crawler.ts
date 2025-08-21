#!/usr/bin/env node
/**
 * ローカル環境でクローラーを実行するスクリプト
 */
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs/promises';
import { PetHomeCrawler } from '../src/crawlers/PetHomeCrawler';
import { Env, Pet } from '../src/types';
import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config({ path: '.dev.vars' });

// コマンドライン引数の処理
const args = process.argv.slice(2);
const petType = args[0] as 'dog' | 'cat';
const limit = parseInt(args[1] || '30', 10);

if (!petType || !['dog', 'cat'].includes(petType)) {
  console.error('Usage: npm run crawl <dog|cat> [limit]');
  console.error('Example: npm run crawl dog 30');
  process.exit(1);
}

// ローカル環境用のモックEnv
class LocalEnv implements Env {
  PET_HOME_BASE_URL = process.env.PET_HOME_BASE_URL || 'https://www.pet-home.jp';
  DATABASE_PATH = process.env.DATABASE_PATH || '../data/pawmatch.db';
  IMAGES_PATH = process.env.IMAGES_PATH || '../data/images';
  
  DB: any;
  IMAGES_BUCKET: any;
  
  constructor() {
    this.initDatabase();
    this.initImageStorage();
  }
  
  async initDatabase() {
    const dbPath = path.resolve(__dirname, '../../', this.DATABASE_PATH);
    console.log(`Database path: ${dbPath}`);
    
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    
    // D1 API互換のラッパー
    this.DB = {
      prepare: (query: string) => {
        return {
          bind: (...params: any[]) => {
            return {
              first: async () => {
                return await db.get(query, ...params);
              },
              all: async () => {
                const result = await db.all(query, ...params);
                return { results: result };
              },
              run: async () => {
                return await db.run(query, ...params);
              }
            };
          }
        };
      }
    };
  }
  
  initImageStorage() {
    const imagesPath = path.resolve(__dirname, '../../', this.IMAGES_PATH);
    
    // R2 API互換のラッパー（ローカルファイルシステム）
    this.IMAGES_BUCKET = {
      put: async (key: string, data: ArrayBuffer | Blob, options?: any) => {
        const filePath = path.join(imagesPath, key);
        const dir = path.dirname(filePath);
        
        // ディレクトリを作成
        await fs.mkdir(dir, { recursive: true });
        
        // Blobをバッファーに変換
        let buffer: Buffer;
        if (data instanceof Blob) {
          const arrayBuffer = await data.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        } else {
          buffer = Buffer.from(data);
        }
        
        // ファイルに保存
        await fs.writeFile(filePath, buffer);
        
        // メタデータを保存（オプション）
        if (options?.customMetadata) {
          const metaPath = `${filePath}.meta.json`;
          await fs.writeFile(metaPath, JSON.stringify({
            ...options.customMetadata,
            httpMetadata: options.httpMetadata,
          }, null, 2));
        }
        
        console.log(`Saved image: ${filePath}`);
      },
      
      get: async (key: string) => {
        const filePath = path.join(imagesPath, key);
        try {
          const data = await fs.readFile(filePath);
          return {
            body: data,
            customMetadata: {},
          };
        } catch (error) {
          return null;
        }
      }
    };
  }
}

// クローラーの実行
async function runCrawler() {
  console.log(`\n🐾 PawMatch Crawler - Fetching ${limit} ${petType}s from Pet-Home\n`);
  
  try {
    // 環境をセットアップ
    const env = new LocalEnv();
    await env.initDatabase();
    
    // クローラーを初期化
    const crawler = new PetHomeCrawler(env);
    
    // クロール実行
    const result = await crawler.crawl(petType, {
      limit,
      useDifferential: false, // 初回は全件取得
      forceFullScan: true,
    });
    
    // 結果を表示
    console.log('\n📊 Crawl Results:');
    console.log(`✅ Total pets fetched: ${result.totalPets}`);
    console.log(`🆕 New pets added: ${result.newPets}`);
    console.log(`🔄 Updated pets: ${result.updatedPets}`);
    
    if (result.errors.length > 0) {
      console.log(`❌ Errors: ${result.errors.length}`);
      result.errors.forEach(error => console.error(`  - ${error}`));
    }
    
    console.log('\n✨ Crawling completed successfully!');
    
  } catch (error) {
    console.error('❌ Crawler failed:', error);
    process.exit(1);
  }
}

// 実行
runCrawler();