import { Hono } from 'hono'
import type { Env } from '../types/env'

/**
 * UIルート
 */
export const uiRoute = new Hono<{ Bindings: Env }>()

// ダッシュボード - シンプルなHTML版
uiRoute.get('/', async (c) => {
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PawMatch Admin Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div class="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center p-6">
    <div class="bg-white rounded-xl shadow-2xl p-8 w-full max-w-5xl">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 flex items-center">
          <span class="mr-3">🐾</span>
          PawMatch Admin Dashboard
        </h1>
        <div class="flex gap-2">
          <button
            id="refreshBtn"
            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-200"
          >
            データ更新
          </button>
          <button
            id="logoutBtn"
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-200"
          >
            ログアウト
          </button>
        </div>
      </div>

      <div>
        <h2 class="text-xl font-semibold text-gray-800 mb-6">データベーステーブル</h2>
        <div id="loadingDiv" class="text-center py-12">
          <div class="inline-flex items-center">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            読み込み中...
          </div>
        </div>
        <div id="tablesDiv" class="hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- テーブル一覧がここに表示される -->
        </div>
        <div id="errorDiv" class="hidden text-center py-12">
          <div class="text-red-600">
            <p class="text-lg font-semibold mb-2">エラーが発生しました</p>
            <p id="errorMessage" class="text-sm"></p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    // データ取得関数
    async function fetchTables() {
      const loadingDiv = document.getElementById('loadingDiv');
      const tablesDiv = document.getElementById('tablesDiv');
      const errorDiv = document.getElementById('errorDiv');
      const refreshBtn = document.getElementById('refreshBtn');

      // ローディング表示
      loadingDiv.classList.remove('hidden');
      tablesDiv.classList.add('hidden');
      errorDiv.classList.add('hidden');
      refreshBtn.textContent = '更新中...';
      refreshBtn.disabled = true;

      try {
        const response = await fetch('/api/tables');
        if (!response.ok) {
          throw new Error('テーブル情報の取得に失敗しました');
        }

        const data = await response.json();
        const tables = data.tables || [];

        // テーブル一覧を表示
        tablesDiv.innerHTML = '';
        if (tables.length === 0) {
          tablesDiv.innerHTML = '<div class="col-span-full text-center text-gray-500">テーブルが見つかりません</div>';
        } else {
          tables.forEach(table => {
            const card = document.createElement('div');
            card.className = 'bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition duration-200 cursor-pointer';
            card.innerHTML = \`
              <h3 class="font-semibold text-gray-900 mb-2">\${table.name}</h3>
              <p class="text-sm text-gray-600">\${table.count}件のレコード</p>
            \`;
            card.onclick = () => window.location.href = \`/table/\${table.name}\`;
            tablesDiv.appendChild(card);
          });
        }

        loadingDiv.classList.add('hidden');
        tablesDiv.classList.remove('hidden');

      } catch (error) {
        console.error('Error:', error);
        document.getElementById('errorMessage').textContent = error.message;
        loadingDiv.classList.add('hidden');
        errorDiv.classList.remove('hidden');
      } finally {
        refreshBtn.textContent = 'データ更新';
        refreshBtn.disabled = false;
      }
    }

    // 初回データ読み込み
    fetchTables();

    // リフレッシュボタン
    document.getElementById('refreshBtn').onclick = fetchTables;

    // ログアウトボタン
    document.getElementById('logoutBtn').onclick = () => {
      alert('ログアウトするにはブラウザを閉じてください');
    };
  </script>
</body>
</html>`

  return c.html(html)
})

// テーブル詳細ページ
uiRoute.get('/table/:tableName', (c) => {
  const tableName = c.req.param('tableName')
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tableName} - PawMatch Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div class="min-h-screen bg-gray-100 p-6">
    <div class="max-w-7xl mx-auto">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold text-gray-900">テーブル: ${tableName}</h1>
          <a href="/" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            ダッシュボードに戻る
          </a>
        </div>
        <div class="text-center py-12">
          <p class="text-gray-500">テーブル詳細機能は開発中です</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`

  return c.html(html)
})