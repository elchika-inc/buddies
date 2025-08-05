#!/usr/bin/env tsx

/**
 * GraphQLリゾルバーのテストスクリプト
 * ブラウザでのGraphQLクエリ実行をシミュレート
 */

import { resolvers } from '../graphql/resolvers';

async function testGraphQLResolvers() {
  console.log('🧪 GraphQLリゾルバーのテストを開始します...');
  console.log('');

  try {
    // 犬一覧クエリのテスト
    console.log('=== 犬一覧クエリのテスト ===');
    const dogsResult = await resolvers.Query.dogs(null, { page: 1, limit: 20 });
    console.log('✅ 犬一覧クエリ完了');
    console.log('📊 取得データ:', {
      animals: dogsResult.animals.length,
      pagination: dogsResult.pagination
    });
    
    if (dogsResult.animals.length > 0) {
      console.log('🐕 最初の犬のデータ:', dogsResult.animals[0]);
    }
    
    console.log('');
    
    // 猫一覧クエリのテスト
    console.log('=== 猫一覧クエリのテスト ===');
    const catsResult = await resolvers.Query.cats(null, { page: 1, limit: 20 });
    console.log('✅ 猫一覧クエリ完了');
    console.log('📊 取得データ:', {
      animals: catsResult.animals.length,
      pagination: catsResult.pagination
    });
    
    if (catsResult.animals.length > 0) {
      console.log('🐱 最初の猫のデータ:', catsResult.animals[0]);
    }

    console.log('');
    console.log('🎉 全てのテストが完了しました！');

  } catch (error) {
    console.error('❌ テスト中にエラーが発生しました:', error);
  }
}

// スクリプトが直接実行された場合のみ実行
if (import.meta.url === `file://${process.argv[1]}`) {
  testGraphQLResolvers();
}