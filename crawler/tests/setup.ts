// テスト用のグローバル設定

// タイムアウトを延長（ネットワークテスト用）
jest.setTimeout(30000);

// 環境変数の設定
process.env.NODE_ENV = 'test';